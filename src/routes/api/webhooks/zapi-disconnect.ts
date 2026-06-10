/**
 * POST /api/webhooks/zapi-disconnect
 *
 * Recebe evento de desconexão do WhatsApp via Z-API.
 * Evento: on-whatsapp-disconnected
 *
 * Ação:
 *  1. Atualizar clinic_integrations.status = 'error'
 *  2. Registrar em webhook_events
 *
 * O dentista verá a integração como "Desconectada" no painel
 * e precisará reconectar o QR Code.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabaseAdmin as any;

interface ZAPIDisconnectPayload {
  instanceId: string;
  connected: false;
  momment: number;
  reason?: string; // "logout" | "phone_offline" | etc.
}

async function resolveClinicByInstance(instanceId: string): Promise<string | null> {
  const { data } = await db()
    .from("clinic_integrations")
    .select("clinic_id")
    .eq("provider", "zapi")
    .contains("credentials", { instance_id: instanceId })
    .maybeSingle(); // busca mesmo se já estiver em erro
  return data?.clinic_id ?? null;
}

export const Route = createFileRoute("/api/webhooks/zapi-disconnect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const clientToken = request.headers.get("client-token");
        const expectedToken = process.env.ZAPI_CLIENT_TOKEN;
        if (expectedToken && clientToken !== expectedToken) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: ZAPIDisconnectPayload;
        try {
          payload = (await request.json()) as ZAPIDisconnectPayload;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        processDisconnect(payload).catch((err) =>
          console.error("[zapi-disconnect] processing error", err),
        );

        return new Response("OK", { status: 200 });
      },
    },
  },
});

async function processDisconnect(payload: ZAPIDisconnectPayload) {
  const clinicId = await resolveClinicByInstance(payload.instanceId);
  if (!clinicId) {
    console.warn(`[zapi-disconnect] unknown instanceId: ${payload.instanceId}`);
    return;
  }

  const now = new Date().toISOString();

  // 1. Marcar integração como erro
  await db()
    .from("clinic_integrations")
    .update({
      status:    "error",
      error_at:  now,
      error_msg: payload.reason ?? "WhatsApp desconectado",
      updated_at: now,
    })
    .eq("clinic_id", clinicId)
    .eq("provider", "zapi");

  // 2. Registrar evento
  await db().from("webhook_events").insert({
    clinic_id:   clinicId,
    source:      "zapi_disconnect",
    event_type:  "whatsapp_disconnected",
    payload:     payload,
    entity_type: "clinic_integration",
  });

  // TODO: Notificar clínica por email ou SMS que o WhatsApp foi desconectado
  console.warn(`[zapi-disconnect] clinic ${clinicId} WhatsApp desconectado. Reason: ${payload.reason ?? "unknown"}`);
}
