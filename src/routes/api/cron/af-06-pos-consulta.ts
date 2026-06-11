/**
 * GET /api/cron/af-06-pos-consulta
 *
 * AF-06 — Pós-consulta: mensagem de acompanhamento
 * Roda diariamente às 14h. Busca oportunidades que mudaram para stage
 * "compareceu" nas últimas 24h e envia mensagem de acompanhamento/cuidados.
 *
 * Objetivo: fortalecer vínculo clínica↔paciente, preparar terreno para AF-07.
 *
 * Vercel Cron: "0 17 * * *" (14h BRT = 17h UTC)
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
  const res = await fetch(`${baseUrl}/instances/${instanceId}/token/${token}/send-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": process.env.ZAPI_CLIENT_TOKEN ?? "",
    },
    body: JSON.stringify({ phone, message }),
  });
  if (!res.ok) throw new Error(`Z-API ${res.status}`);
}

export const Route = createFileRoute("/api/cron/af-06-pos-consulta")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const auth = request.headers.get("authorization") ?? "";
        if (!secret) return new Response("Service unavailable", { status: 503 });
        if (auth !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        // Janela: oportunidades que mudaram para "compareceu" nas últimas 24h
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: opps, error } = await db()
          .from("oportunidades")
          .select(
            `
            id, name, phone, clinic_id, stage_changed_at,
            clinicas ( name )
          `,
          )
          .eq("stage", "compareceu")
          .gte("stage_changed_at", since)
          .not("phone", "is", null);

        if (error) {
          console.error("[af-06] query error", error);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const results = { sent: 0, failed: 0, skipped: 0 };

        for (const opp of opps ?? []) {
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

          const message =
            `Olá, ${opp.name}! 😊\n\n` +
            `Foi um prazer receber você hoje na *${clinicName}*!\n\n` +
            `Esperamos que tenha gostado do atendimento. Qualquer dúvida sobre os cuidados pós-consulta, é só nos chamar aqui.\n\n` +
            `💙 Obrigado pela confiança!`;

          try {
            await sendWhatsApp(instance_id, token, opp.phone, message);

            // Marcar que AF-06 foi enviado (para AF-07 saber quando disparar)
            await db()
              .from("oportunidades")
              .update({ af06_sent_at: new Date().toISOString() })
              .eq("id", opp.id);

            results.sent++;
          } catch (e) {
            results.failed++;
            console.error(`[af-06] WA failed opp=${opp.id}`, e);
          }

          await new Promise((r) => setTimeout(r, 3000 + Math.random() * 3000));
        }

        console.log("[af-06] done", results);
        return Response.json({ ok: true, ...results });
      },
    },
  },
});
