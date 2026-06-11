/**
 * GET /api/cron/af-02-confirmacao
 *
 * AF-02 — Confirmação D-1
 * Roda diariamente às 9h. Busca oportunidades com consulta agendada para AMANHÃ
 * e envia mensagem de confirmação via WhatsApp (Z-API).
 *
 * Lógica:
 *  SELECT oportunidades WHERE stage = 'agendado'
 *    AND scheduled_at::date = (now() + interval '1 day')::date
 *  Para cada → envia WA com link de confirmação/reagendamento
 *
 * Vercel Cron: "0 12 * * *" (9h BRT = 12h UTC)
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabaseAdmin as any;

async function sendWhatsApp(
  instanceId: string,
  token: string,
  phone: string,
  message: string,
): Promise<void> {
  const baseUrl = process.env.ZAPI_BASE_URL ?? "https://api.z-api.io";
  const url = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": process.env.ZAPI_CLIENT_TOKEN ?? "",
    },
    body: JSON.stringify({ phone, message }),
  });
  if (!res.ok) throw new Error(`Z-API error: ${res.status}`);
}

export const Route = createFileRoute("/api/cron/af-02-confirmacao")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const authHeader = request.headers.get("authorization") ?? "";
        if (!secret) return new Response("Service unavailable", { status: 503 });
        if (authHeader !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];

        // Buscar oportunidades agendadas para amanhã
        const { data: opps, error } = await db()
          .from("oportunidades")
          .select(
            `
            id, name, phone, clinic_id, scheduled_at,
            clinicas ( id, name )
          `,
          )
          .eq("stage", "agendado")
          .gte("scheduled_at", `${tomorrowStr}T00:00:00`)
          .lt("scheduled_at", `${tomorrowStr}T23:59:59`)
          .not("phone", "is", null);

        if (error) {
          console.error("[af-02] query error", error);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const results = { sent: 0, failed: 0, skipped: 0 };

        for (const opp of opps ?? []) {
          // Buscar credenciais Z-API da clínica
          const { data: integration } = await db()
            .from("clinic_integrations")
            .select("credentials")
            .eq("clinic_id", opp.clinic_id)
            .eq("provider", "zapi")
            .eq("status", "connected")
            .maybeSingle();

          if (!integration?.credentials?.instance_id) {
            results.skipped++;
            continue;
          }

          const { instance_id, token } = integration.credentials;
          const clinicName = opp.clinicas?.name ?? "nossa clínica";
          const scheduledTime = new Date(opp.scheduled_at).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo",
          });

          const message =
            `Olá, ${opp.name}! 👋\n\n` +
            `Lembramos que você tem uma consulta marcada na *${clinicName}* amanhã às *${scheduledTime}*.\n\n` +
            `✅ Para confirmar, responda *SIM*\n` +
            `📅 Para reagendar, responda *REAGENDAR*\n\n` +
            `Aguardamos sua confirmação! 😊`;

          try {
            await sendWhatsApp(instance_id, token, opp.phone, message);
            results.sent++;

            // Log no webhook_events
            await db()
              .from("webhook_events")
              .insert({
                clinic_id: opp.clinic_id,
                source: "cron_af02",
                event_type: "confirmacao_sent",
                payload: { oportunidade_id: opp.id, phone: opp.phone },
                entity_type: "oportunidade",
              });
          } catch (e) {
            results.failed++;
            console.error(`[af-02] WA failed for ${opp.id}`, e);
          }

          // Anti-ban delay (3-6s entre mensagens)
          await new Promise((r) => setTimeout(r, 3000 + Math.random() * 3000));
        }

        console.log("[af-02] done", results);
        return Response.json({ ok: true, ...results, date: tomorrowStr });
      },
    },
  },
});
