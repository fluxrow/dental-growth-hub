/**
 * POST /api/webhooks/zapi-receive
 *
 * Recebe mensagens do WhatsApp via Z-API.
 * Trata tanto mensagens inbound (fromMe=false) quanto
 * confirmações de envio do próprio número (fromMe=true).
 *
 * Fluxo:
 *  1. Validar instanceId → resolver clinic_id
 *  2. Registrar em webhook_events
 *  3. Normalizar phone → buscar/criar conversa
 *  4. Inserir mensagem
 *  5. Realtime automático via Supabase
 *  6. Se lead novo → pode criar oportunidade
 *
 * Requer env:
 *  ZAPI_CLIENT_TOKEN — validação básica de origem
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabaseAdmin as any;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZAPIMessagePayload {
  instanceId: string;
  messageId: string;
  phone: string;        // "5511999999999@c.us"
  fromMe: boolean;
  momment: number;      // Unix timestamp (ms)
  status: "PENDING" | "SENT" | "RECEIVED" | "READ" | "PLAYED";
  senderName: string;
  connectedPhone: string;
  broadcast?: boolean;
  type: "text" | "image" | "audio" | "video" | "document" | "sticker" | "location" | "contact";
  text?: { message: string; description?: string; url?: string };
  image?: { imageUrl: string; caption?: string; mimeType: string; thumbnailUrl?: string };
  audio?: { audioUrl: string; ptt: boolean; seconds: number; mimeType: string };
  video?: { videoUrl: string; caption?: string; mimeType: string };
  document?: { documentUrl: string; fileName: string; mimeType: string; pageCount?: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  // Remove @c.us, @s.whatsapp.net
  const cleaned = raw.replace(/@[^@]+$/, "").replace(/\D/g, "");
  if (!cleaned.startsWith("55") && cleaned.length <= 11) return `55${cleaned}`;
  return cleaned;
}

function extractTextContent(payload: ZAPIMessagePayload): string {
  if (payload.text?.message)       return payload.text.message;
  if (payload.image?.caption)      return `[Imagem] ${payload.image.caption ?? ""}`.trim();
  if (payload.audio?.ptt)          return "[Mensagem de voz]";
  if (payload.audio)               return "[Áudio]";
  if (payload.video?.caption)      return `[Vídeo] ${payload.video.caption ?? ""}`.trim();
  if (payload.document?.fileName)  return `[Documento] ${payload.document.fileName}`;
  return `[${payload.type}]`;
}

async function resolveClinicByInstance(instanceId: string): Promise<string | null> {
  const { data } = await db()
    .from("clinic_integrations")
    .select("clinic_id")
    .eq("provider", "zapi")
    .contains("credentials", { instance_id: instanceId })
    .eq("status", "connected")
    .maybeSingle();
  return data?.clinic_id ?? null;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/webhooks/zapi-receive")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Z-API não assina payloads, mas podemos validar o Client-Token no header
        const clientToken = request.headers.get("client-token");
        const expectedToken = process.env.ZAPI_CLIENT_TOKEN;
        if (!expectedToken) return new Response("Service unavailable", { status: 503 });
        if (clientToken !== expectedToken) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: ZAPIMessagePayload;
        try {
          payload = (await request.json()) as ZAPIMessagePayload;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Responder imediatamente — Z-API espera 200 rápido
        processMessage(payload).catch((err) =>
          console.error("[zapi-receive] processing error", err),
        );

        return new Response("OK", { status: 200 });
      },
    },
  },
});

async function processMessage(payload: ZAPIMessagePayload) {
  const clinicId = await resolveClinicByInstance(payload.instanceId);
  if (!clinicId) {
    console.warn(`[zapi-receive] unknown instanceId: ${payload.instanceId}`);
    return;
  }

  const phone = normalizePhone(payload.phone);
  const content = extractTextContent(payload);
  const sentAt = new Date(payload.momment).toISOString();

  // 1. Registrar evento bruto para auditoria
  await db().from("webhook_events").insert({
    clinic_id:   clinicId,
    source:      "zapi_receive",
    event_type:  payload.fromMe ? "message_sent_by_me" : "message_received",
    payload:     payload,
    entity_type: "conversa",
  });

  // 2. Buscar ou criar conversa
  let { data: conversa } = await db()
    .from("conversas")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("phone", phone)
    .maybeSingle();

  if (!conversa) {
    const { data: nova } = await db()
      .from("conversas")
      .insert({
        clinic_id:    clinicId,
        phone,
        contact_name: payload.senderName || null,
        channel:      "whatsapp",
        status:       "novo",
        last_message: content,
        last_msg_at:  sentAt,
        unread:       payload.fromMe ? 0 : 1,
      })
      .select("id")
      .single();
    conversa = nova;
  } else {
    // Atualizar last_message e unread (apenas para inbound)
    await db()
      .from("conversas")
      .update({
        last_message: content,
        last_msg_at:  sentAt,
        ...(payload.fromMe ? {} : { unread: db().rpc("increment", { x: 1 }) }),
      })
      .eq("id", conversa.id);
  }

  if (!conversa) {
    console.error("[zapi-receive] failed to create conversa for phone", phone);
    return;
  }

  // 3. Inserir mensagem
  const msgData: Record<string, unknown> = {
    conversa_id:  conversa.id,
    clinic_id:    clinicId,
    direction:    payload.fromMe ? "outbound" : "inbound",
    channel:      "whatsapp",
    content,
    media_type:   payload.type === "text" ? null : payload.type,
    media_url:    payload.image?.imageUrl ?? payload.audio?.audioUrl ?? payload.video?.videoUrl ?? payload.document?.documentUrl ?? null,
    wa_message_id: payload.messageId,
    status:       payload.status.toLowerCase(),
    sent_at:      sentAt,
  };

  await db().from("mensagens").insert(msgData);

  // 4. Se inbound + não existe oportunidade para este phone → criar lead
  if (!payload.fromMe) {
    const { data: existingOpp } = await db()
      .from("oportunidades")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("phone", phone)
      .not("stage", "eq", "perdida")
      .maybeSingle();

    if (!existingOpp) {
      await db().from("oportunidades").insert({
        clinic_id:        clinicId,
        name:             payload.senderName || `WhatsApp ${phone}`,
        phone,
        source:           "WhatsApp · Inbound",
        stage:            "contato",
        stage_changed_at: sentAt,
      });
      console.log(`[zapi-receive] created oportunidade for inbound phone ${phone}`);
    }
  }

  console.log(`[zapi-receive] processed ${payload.fromMe ? "outbound" : "inbound"} message from ${phone}`);
}
