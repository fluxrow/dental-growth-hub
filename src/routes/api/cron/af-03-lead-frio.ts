/**
 * GET /api/cron/af-03-lead-frio
 *
 * AF-03 — Reaquecimento de lead frio
 * Roda diariamente às 10h. Busca leads que estão parados por mais de
 * X dias (threshold por stage) sem contato e envia WA de reengajamento.
 *
 * Thresholds por stage:
 *  novo        → sem contato em 2 dias
 *  contatado   → sem resposta em 5 dias
 *  interessado → sem avanço em 7 dias
 *  negociando  → sem avanço em 10 dias
 *
 * Vercel Cron: "0 13 * * *" (10h BRT = 13h UTC)
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabaseAdmin as any;

const STAGE_THRESHOLD_DAYS: Record<string, number> = {
  novo: 2,
  contatado: 5,
  interessado: 7,
  negociando: 10,
};

const REENGAGEMENT_MESSAGES: Record<string, (name: string, clinicName: string) => string> = {
  novo: (name, clinic) =>
    `Oi, ${name}! 👋 Vi que você demonstrou interesse em *${clinic}*.\n\n` +
    `Ainda posso te ajudar? Qual é o melhor horário para conversarmos? 😊`,

  contatado: (name, clinic) =>
    `Olá, ${name}! Tentamos falar com você sobre a *${clinic}*.\n\n` +
    `Tudo bem? Podemos ainda marcar uma avaliação? Temos horários disponíveis esta semana! 📅`,

  interessado: (name, _clinic) =>
    `Oi, ${name}! Você ficou interessado(a) no nosso tratamento.\n\n` +
    `Alguma dúvida que ficou sem resposta? Estou aqui para ajudar! 🦷`,

  negociando: (name, _clinic) =>
    `Olá, ${name}! Vi que ficamos sem finalizar nossa conversa.\n\n` +
    `Ainda está pensando no tratamento? Posso te ajudar com algum ponto específico? 💬`,
};

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

export const Route = createFileRoute("/api/cron/af-03-lead-frio")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const auth = request.headers.get("authorization") ?? "";
        if (secret && auth !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const results = { sent: 0, failed: 0, skipped: 0 };

        for (const [stage, thresholdDays] of Object.entries(STAGE_THRESHOLD_DAYS)) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - thresholdDays);

          const { data: coldLeads, error } = await db()
            .from("oportunidades")
            .select(
              `
              id, name, phone, clinic_id, stage, last_contacted_at, created_at,
              clinicas ( name )
            `,
            )
            .eq("stage", stage)
            .not("phone", "is", null)
            // Usa last_contacted_at se preenchido, senão created_at
            .or(
              `last_contacted_at.lte.${cutoff.toISOString()},` +
                `and(last_contacted_at.is.null,created_at.lte.${cutoff.toISOString()})`,
            )
            .limit(50); // processar em lotes para evitar timeout

          if (error) {
            console.error(`[af-03] query error stage=${stage}`, error);
            continue;
          }

          for (const lead of coldLeads ?? []) {
            const { data: integration } = await db()
              .from("clinic_integrations")
              .select("credentials")
              .eq("clinic_id", lead.clinic_id)
              .eq("provider", "zapi")
              .eq("status", "connected")
              .maybeSingle();

            if (!integration?.credentials?.instance_id) {
              results.skipped++;
              continue;
            }

            const { instance_id, token } = integration.credentials;
            const clinicName = lead.clinicas?.name ?? "nossa clínica";
            const msgFn = REENGAGEMENT_MESSAGES[stage];
            const message = msgFn ? msgFn(lead.name, clinicName) : "";

            try {
              await sendWhatsApp(instance_id, token, lead.phone, message);

              // Atualizar last_contacted_at
              await db()
                .from("oportunidades")
                .update({ last_contacted_at: new Date().toISOString() })
                .eq("id", lead.id);

              results.sent++;
            } catch (e) {
              results.failed++;
              console.error(`[af-03] WA failed lead=${lead.id}`, e);
            }

            await new Promise((r) => setTimeout(r, 4000 + Math.random() * 4000));
          }
        }

        console.log("[af-03] done", results);
        return Response.json({ ok: true, ...results });
      },
    },
  },
});
