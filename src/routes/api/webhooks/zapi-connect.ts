/**
 * POST /api/webhooks/zapi-connect
 *
 * Recebe evento de reconexão do WhatsApp via Z-API.
 * Evento: on-webhook-connected
 *
 * Ação:
 *  1. Atualizar clinic_integrations.status = 'connected'
 *  2. Salvar phone_number nos metadata se disponível
 *  3. Registrar em webhook_events
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabaseAdmin as any;

interface ZAPIConnectPayload {
  instanceId: string;
  connected: true;
  smartphoneConnected: boolean;
  session: string;
  phone?: string;
  momment: number;
}

async function resolveClinicByInstance(instanceId: string): Promise<string | null> {
  const { data } = await db()
    .from("clinic_integrations")
    .select("clinic_id")
    .eq("provider", "zapi")
    .contains("credentials", { instance_id: instanceId })
    .maybeSingle();
  return data?.clinic_id ?? null;
}

export const Route = createFileRoute("/api/webhooks/zapi-connect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const clientToken = request.headers.get("client-token");
        const expectedToken = process.env.ZAPI_CLIENT_TOKEN;
        if (expectedToken && clientToken !== expectedToken) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: ZAPIConnectPayload;
        try {
          payload = (await request.json()) as ZAPIConnectPayload;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        processConnect(payload).catch((err) =>
          console.error("[zapi-connect] processing error", err),
        );

        return new Response("OK", { status: 200 });
      },
    },
  },
});

async function processConnect(payload: ZAPIConnectPayload) {
  const clinicId = await resolveClinicByInstance(payload.instanceId);
  if (!clinicId) {
    console.warn(`[zapi-connect] unknown instanceId: ${payload.instanceId}`);
    return;
  }

  const now = new Date().toISOString();

  // 1. Marcar como conectado + limpar erros anteriores
  await db()
    .from("clinic_integrations")
    .update({
      status:       "connected",
      connected_at: now,
      error_at:     null,
      error_msg:    null,
      updated_at:   now,
      // Salvar phone number nos metadata se disponível
      ...(payload.phone
        ? {
            metadata: db().rpc("jsonb_set_deep", {
              phone_number: payload.phone,
            }),
          }
        : {}),
    })
    .eq("clinic_id", clinicId)
    .eq("provider", "zapi");

  // Atualizar metadata separadamente para segurança
  if (payload.phone) {
    const { data: current } = await db()
      .from("clinic_integrations")
      .select("metadata")
      .eq("clinic_id", clinicId)
      .eq("provider", "zapi")
      .maybeSingle();

    await db()
      .from("clinic_integrations")
      .update({
        metadata: { ...(current?.metadata ?? {}), phone_number: payload.phone },
      })
      .eq("clinic_id", clinicId)
      .eq("provider", "zapi");
  }

  // 2. Registrar evento
  await db().from("webhook_events").insert({
    clinic_id:   clinicId,
    source:      "zapi_connect",
    event_type:  "whatsapp_connected",
    payload:     payload,
    entity_type: "clinic_integration",
  });

  console.log(`[zapi-connect] clinic ${clinicId} WhatsApp reconectado. Phone: ${payload.phone ?? "unknown"}`);
}
