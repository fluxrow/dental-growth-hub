/**
 * GET /api/cron/af-07-avaliacao
 *
 * AF-07 — Solicitação de avaliação Google (D+7 pós-consulta)
 * Roda diariamente às 15h. Busca oportunidades no stage "compareceu"
 * que receberam AF-06 há 7 dias e ainda não enviaram pedido de avaliação.
 *
 * Objetivo: aumentar avaliações Google da clínica, melhorar reputação online.
 *
 * Vercel Cron: "0 18 * * *" (15h BRT = 18h UTC)
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

export const Route = createFileRoute("/api/cron/af-07-avaliacao")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const auth = request.headers.get("authorization") ?? "";
        if (!secret) return new Response("Service unavailable", { status: 503 });
        if (auth !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        // D+7: af06_sent_at entre 7 e 8 dias atrás
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

        const { data: opps, error } = await db()
          .from("oportunidades")
          .select(
            `
            id, name, phone, clinic_id, af06_sent_at, af07_sent_at,
            clinicas ( name, google_review_url )
          `,
          )
          .eq("stage", "compareceu")
          .gte("af06_sent_at", eightDaysAgo)
          .lte("af06_sent_at", sevenDaysAgo)
          .is("af07_sent_at", null) // ainda não enviou
          .not("phone", "is", null);

        if (error) {
          console.error("[af-07] query error", error);
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
          // google_review_url pode estar em clinicas ou clinic_integrations
          const reviewUrl =
            opp.clinicas?.google_review_url ??
            `https://search.google.com/local/writereview?placeid=CONFIGURE_NO_PAINEL`;

          const message =
            `Olá, ${opp.name}! 🦷\n\n` +
            `Como você está se sentindo após sua consulta na *${clinicName}*?\n\n` +
            `Sua opinião é muito importante para nós e ajuda outras pessoas a encontrarem nosso consultório!\n\n` +
            `⭐ Se você ficou satisfeito(a), deixe uma avaliação no Google:\n` +
            `${reviewUrl}\n\n` +
            `Obrigado pela confiança! 💙`;

          try {
            await sendWhatsApp(instance_id, token, opp.phone, message);

            await db()
              .from("oportunidades")
              .update({ af07_sent_at: new Date().toISOString() })
              .eq("id", opp.id);

            results.sent++;
          } catch (e) {
            results.failed++;
            console.error(`[af-07] WA failed opp=${opp.id}`, e);
          }

          await new Promise((r) => setTimeout(r, 4000 + Math.random() * 4000));
        }

        console.log("[af-07] done", results);
        return Response.json({ ok: true, ...results });
      },
    },
  },
});
