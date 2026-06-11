/**
 * GET /api/cron/af-04-reativacao
 *
 * AF-04 — Reativação de pacientes inativos
 * Roda semanalmente às segundas 8h. Busca pacientes sem visita há > 90 dias
 * e envia WA de reativação com oferta de agendamento.
 *
 * Lógica:
 *  SELECT pacientes WHERE clinic_id = X
 *    AND last_visit_at < now() - interval '90 days'
 *    AND NOT EXISTS (SELECT 1 FROM oportunidades WHERE paciente_id = p.id
 *                    AND stage NOT IN ('perdido','cancelado')
 *                    AND created_at > now() - interval '30 days')
 *
 * Vercel Cron: "0 11 * * 1" (8h BRT segunda = 11h UTC)
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

export const Route = createFileRoute("/api/cron/af-04-reativacao")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const auth = request.headers.get("authorization") ?? "";
        if (!secret) return new Response("Service unavailable", { status: 503 });
        if (auth !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        // Cutoff: pacientes sem visita há > 90 dias
        const cutoff90 = new Date();
        cutoff90.setDate(cutoff90.getDate() - 90);

        // Janela de 30 dias para verificar oportunidade recente
        const cutoff30 = new Date();
        cutoff30.setDate(cutoff30.getDate() - 30);

        // Buscar clínicas com Z-API conectado
        const { data: integrations } = await db()
          .from("clinic_integrations")
          .select("clinic_id, credentials")
          .eq("provider", "zapi")
          .eq("status", "connected");

        const results = { sent: 0, failed: 0, skipped: 0, clinics: 0 };

        for (const integ of integrations ?? []) {
          const { clinic_id, credentials } = integ;
          if (!credentials?.instance_id) continue;

          results.clinics++;

          // Nome da clínica
          const { data: clinic } = await db()
            .from("clinicas")
            .select("name")
            .eq("id", clinic_id)
            .maybeSingle();

          const clinicName = clinic?.name ?? "nossa clínica";

          // Pacientes inativos sem oportunidade recente
          const { data: patients } = await db()
            .from("pacientes")
            .select("id, name, phone, last_visit_at")
            .eq("clinic_id", clinic_id)
            .not("phone", "is", null)
            .lte("last_visit_at", cutoff90.toISOString())
            .limit(30); // 30 por clínica por semana

          for (const patient of patients ?? []) {
            // Verificar se já tem oportunidade ativa recente
            const { data: recentOpp } = await db()
              .from("oportunidades")
              .select("id")
              .eq("clinic_id", clinic_id)
              .eq("paciente_id", patient.id)
              .not("stage", "in", '("perdido","cancelado")')
              .gte("created_at", cutoff30.toISOString())
              .maybeSingle();

            if (recentOpp) {
              results.skipped++;
              continue;
            }

            const monthsAgo = Math.floor(
              (Date.now() - new Date(patient.last_visit_at).getTime()) / (1000 * 60 * 60 * 24 * 30),
            );

            const message =
              `Oi, ${patient.name}! 🦷 Saudades!\n\n` +
              `Faz ${monthsAgo} ${monthsAgo === 1 ? "mês" : "meses"} desde a sua última visita à *${clinicName}*.\n\n` +
              `Sua saúde bucal agradece uma avaliação periódica! Que tal marcarmos uma consulta de revisão?\n\n` +
              `Temos horários disponíveis esta semana. Responda *SIM* para agendarmos! 📅`;

            try {
              await sendWhatsApp(
                credentials.instance_id,
                credentials.token,
                patient.phone,
                message,
              );

              // Criar oportunidade de reativação
              await db().from("oportunidades").insert({
                clinic_id,
                paciente_id: patient.id,
                name: patient.name,
                phone: patient.phone,
                source: "Reativação automática (AF-04)",
                stage: "contatado",
                stage_changed_at: new Date().toISOString(),
                last_contacted_at: new Date().toISOString(),
              });

              results.sent++;
            } catch (e) {
              results.failed++;
              console.error(`[af-04] WA failed patient=${patient.id}`, e);
            }

            await new Promise((r) => setTimeout(r, 5000 + Math.random() * 5000));
          }
        }

        console.log("[af-04] done", results);
        return Response.json({ ok: true, ...results });
      },
    },
  },
});
