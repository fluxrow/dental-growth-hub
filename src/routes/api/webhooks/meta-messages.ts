/**
 * GET|POST /api/webhooks/meta-messages
 *
 * Recebe mensagens do Instagram DM e Facebook Messenger.
 *
 * Permissões Meta App necessárias:
 *  - instagram_manage_messages
 *  - pages_messaging
 *
 * GET:  Verificação do hub (challenge)
 * POST: Processamento de mensagens inbound
 *
 * Campos subscritos:
 *  - "messages" (Instagram DM + Facebook Messenger)
 *
 * Fluxo:
 *  1. Validar assinatura HMAC-SHA256 (x-hub-signature-256)
 *  2. Resolver clinic_id pelo page_id/ig_account_id
 *  3. Buscar/criar conversa
 *  4. Inserir mensagem
 *  5. Criar oportunidade se lead novo
 *
 * Requer env:
 *  META_APP_SECRET
 *  META_VERIFY_TOKEN
 */

import { createFileRoute }   from "@tanstack/react-router";
import { createHmac }        from "crypto";
import { supabaseAdmin }     from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabaseAdmin as any;

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetaMessageEntry {
  id: string;         // page_id or ig_user_id
  messaging: Array<{
    sender:    { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
      mid:          string;
      text?:        string;
      attachments?: Array<{ type: string; payload: { url?: string; title?: string } }>;
    };
    postback?: { title: string; payload: string };
  }>;
}

interface MetaWebhookBody {
  object: "instagram" | "page";
  entry:  MetaMessageEntry[];
}

// ─── HMAC Validation ──────────────────────────────────────────────────────────

function validateMetaSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return false;
  if (!signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return `sha256=${expected}` === signature;
}

// ─── Clinic resolver ──────────────────────────────────────────────────────────

async function resolveClinicByPageId(pageId: string): Promise<string | null> {
  // Tenta meta_ig primeiro (Instagram), depois meta_fb (Facebook)
  for (const provider of ["meta_ig", "meta_fb"] as const) {
    const { data } = await db()
      .from("clinic_integrations")
      .select("clinic_id")
      .eq("provider", provider)
      .contains("credentials", { page_id: pageId })
      .eq("status", "connected")
      .maybeSingle();
    if (data?.clinic_id) return data.clinic_id;
  }
  return null;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/webhooks/meta-messages")({
  server: {
    handlers: {
      // Hub challenge verification
      GET: async ({ request }) => {
        const url     = new URL(request.url);
        const mode    = url.searchParams.get("hub.mode");
        const token   = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
          return new Response(challenge ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },

      // Webhook events
      POST: async ({ request }) => {
        const rawBody  = await request.text();
        const signature = request.headers.get("x-hub-signature-256");

        if (!validateMetaSignature(rawBody, signature)) {
          console.warn("[meta-messages] invalid signature");
          return new Response("Invalid signature", { status: 401 });
        }

        let body: MetaWebhookBody;
        try {
          body = JSON.parse(rawBody) as MetaWebhookBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        processMetaMessages(body).catch((err) =>
          console.error("[meta-messages] processing error", err),
        );

        return new Response("OK", { status: 200 });
      },
    },
  },
});

async function processMetaMessages(body: MetaWebhookBody) {
  const channel: "instagram" | "messenger" =
    body.object === "instagram" ? "instagram" : "messenger";

  for (const entry of body.entry) {
    const pageId = entry.id;
    const clinicId = await resolveClinicByPageId(pageId);

    if (!clinicId) {
      console.warn(`[meta-messages] unknown page_id: ${pageId}`);
      continue;
    }

    for (const event of entry.messaging ?? []) {
      if (!event.message) continue; // postbacks/etc

      const senderId = event.sender.id;
      const msgId    = event.message.mid;
      const sentAt   = new Date(event.timestamp * 1000).toISOString();
      const isFromPage = event.recipient.id === pageId;

      // Conteúdo
      let content = event.message.text ?? "";
      if (!content && event.message.attachments?.length) {
        const att = event.message.attachments[0];
        content = `[${att.type}] ${att.payload?.title ?? att.payload?.url ?? ""}`.trim();
      }

      // Auditoria
      await db().from("webhook_events").insert({
        clinic_id:   clinicId,
        source:      `meta_${channel}`,
        event_type:  "message_received",
        payload:     event,
        entity_type: "conversa",
      });

      // Idempotência por mid
      const { data: existing } = await db()
        .from("mensagens")
        .select("id")
        .eq("wa_message_id", msgId)
        .eq("clinic_id", clinicId)
        .maybeSingle();

      if (existing) continue;

      // Buscar ou criar conversa
      let { data: conversa } = await db()
        .from("conversas")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("channel", channel)
        .eq("phone", senderId)    // para DMs usamos o sender_id como identificador
        .maybeSingle();

      if (!conversa) {
        const { data: nova } = await db()
          .from("conversas")
          .insert({
            clinic_id:   clinicId,
            phone:       senderId,
            channel,
            status:      "novo",
            last_message: content,
            last_msg_at:  sentAt,
            unread:      isFromPage ? 0 : 1,
          })
          .select("id")
          .single();
        conversa = nova;
      } else {
        await db()
          .from("conversas")
          .update({ last_message: content, last_msg_at: sentAt })
          .eq("id", conversa.id);
      }

      if (!conversa) continue;

      // Inserir mensagem
      await db().from("mensagens").insert({
        conversa_id:   conversa.id,
        clinic_id:     clinicId,
        direction:     isFromPage ? "outbound" : "inbound",
        channel,
        content,
        wa_message_id: msgId,
        status:        "enviado",
        sent_at:       sentAt,
      });

      // Auto-criar oportunidade se inbound + sem opp existente
      if (!isFromPage) {
        const { data: existingOpp } = await db()
          .from("oportunidades")
          .select("id")
          .eq("clinic_id", clinicId)
          .eq("phone", senderId)
          .not("stage", "eq", "perdida")
          .maybeSingle();

        if (!existingOpp) {
          await db().from("oportunidades").insert({
            clinic_id:        clinicId,
            name:             `${channel === "instagram" ? "Instagram" : "Messenger"} ${senderId.slice(-6)}`,
            phone:            senderId,
            source:           channel === "instagram" ? "Instagram DM" : "Facebook Messenger",
            stage:            "contato",
            stage_changed_at: sentAt,
          });
          console.log(`[meta-messages] created oportunidade from ${channel} DM senderId=${senderId}`);
        }
      }
    }
  }
}
