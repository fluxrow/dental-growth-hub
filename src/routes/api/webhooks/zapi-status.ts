/**
 * POST /api/webhooks/zapi-status
 *
 * Recebe atualizações de status de mensagens enviadas via Z-API.
 * Evento: on-whatsapp-message-status-changes
 *
 * Usos:
 *  1. Atualizar mensagens.status (enviado → entregue → lido)
 *  2. Atualizar cobranca_tentativas.status quando mensagem de cobrança é lida
 *
 * Payload Z-API:
 *  { instanceId, messageId, phone, status, momment }
 *  status: "PENDING" | "SENT" | "RECEIVED" | "READ" | "PLAYED"
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabaseAdmin as any;

interface ZAPIStatusPayload {
  instanceId: string;
  messageId: string;
  phone: string;
  status: "PENDING" | "SENT" | "RECEIVED" | "READ" | "PLAYED";
  momment: number;
  fromMe: boolean;
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

export const Route = createFileRoute("/api/webhooks/zapi-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const clientToken = request.headers.get("client-token");
        const expectedToken = process.env.ZAPI_CLIENT_TOKEN;
        if (!expectedToken) return new Response("Service unavailable", { status: 503 });
        if (clientToken !== expectedToken) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: ZAPIStatusPayload;
        try {
          payload = (await request.json()) as ZAPIStatusPayload;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        processStatus(payload).catch((err) =>
          console.error("[zapi-status] processing error", err),
        );

        return new Response("OK", { status: 200 });
      },
    },
  },
});

const STATUS_MAP: Record<string, string> = {
  PENDING:  "enviado",
  SENT:     "enviado",
  RECEIVED: "entregue",
  READ:     "lido",
  PLAYED:   "lido",
};

async function processStatus(payload: ZAPIStatusPayload) {
  const clinicId = await resolveClinicByInstance(payload.instanceId);
  if (!clinicId) {
    console.warn(`[zapi-status] unknown instanceId: ${payload.instanceId}`);
    return;
  }

  const normalized = STATUS_MAP[payload.status] ?? payload.status.toLowerCase();

  // 1. Atualizar mensagem na tabela mensagens
  const { error: msgErr } = await db()
    .from("mensagens")
    .update({ status: normalized })
    .eq("wa_message_id", payload.messageId)
    .eq("clinic_id", clinicId);

  if (msgErr) {
    console.warn(`[zapi-status] mensagens update error for ${payload.messageId}`, msgErr);
  }

  // 2. Se "lido" → atualizar cobranca_tentativas (rastrear leitura da cobrança)
  if (normalized === "lido") {
    const { data: tentativa } = await db()
      .from("cobranca_tentativas")
      .select("id, cobranca_id")
      .eq("wa_message_id", payload.messageId)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (tentativa) {
      await db()
        .from("cobranca_tentativas")
        .update({ status: "lido" })
        .eq("id", tentativa.id);

      console.log(`[zapi-status] cobranca_tentativa ${tentativa.id} marcada como lida`);
    }
  }

  console.log(`[zapi-status] messageId=${payload.messageId} → ${normalized}`);
}
