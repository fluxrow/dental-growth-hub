/**
 * POST /api/cron/cs-touchpoints
 *
 * Cron horário — executa a régua de Customer Success do DrFlux.
 *
 * Régua:
 *  D+0  Kick-off    — importar dados, conectar WhatsApp, boas-vindas
 *  D+7  Check-in    — Revenue Leak Engine rodando, primeiras cobranças
 *  D+30 QBR lite    — mostrar recuperação de receita vs. custo do DrFlux
 *  D+90 Renovação   — "você já recuperou R$X, vamos travar 12 meses"
 *
 * Configuração (Vercel Cron):
 *  vercel.json → crons: [{ path: "/api/cron/cs-touchpoints", schedule: "0 * * * *" }]
 *
 * Segurança:
 *  Header: Authorization: Bearer CRON_SECRET
 *
 * Requer env:
 *  CRON_SECRET
 *  ZAPI_BASE_URL / ZAPI_CLIENT_TOKEN
 *  APP_BASE_URL
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin }   from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabaseAdmin as any;

// ─── Templates de mensagem por touchpoint ─────────────────────────────────────

interface TouchpointContext {
  clinicName:      string;
  ownerName:       string;
  recoveredValue?: number; // R$ recuperado (para D+30 e D+90)
  leakValue?:      number; // Revenue Leak atual
  drFluxCost?:     number; // Custo mensal do DrFlux (para ROI)
}

function buildTouchpointMessage(
  touchpoint: string,
  ctx: TouchpointContext,
): string {
  const formatBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  switch (touchpoint) {
    case "d0_kickoff":
      return (
        `🦷 Olá, ${ctx.ownerName}! Seja bem-vindo(a) ao *DrFlux*!\n\n` +
        `Sou seu assistente de Customer Success e estou aqui para garantir que a *${ctx.clinicName}* extraia o máximo da plataforma.\n\n` +
        `*Próximos passos:*\n` +
        `1️⃣ Importar seus dados de pacientes\n` +
        `2️⃣ Conectar seu WhatsApp\n` +
        `3️⃣ Configurar seu primeiro funil de captação\n\n` +
        `Posso te ajudar agora com algum desses passos? 😊`
      );

    case "d7_checkin":
      return (
        `Oi, ${ctx.ownerName}! 👋 Passaram 7 dias desde que você começou com o DrFlux.\n\n` +
        `*Como está sendo a experiência?*\n\n` +
        (ctx.leakValue && ctx.leakValue > 0
          ? `📊 Identificamos que sua clínica tem em torno de *${formatBRL(ctx.leakValue)}* em receita potencial que pode ser recuperada.\n\n`
          : "") +
        `Já conseguiu enviar as primeiras cobranças automatizadas? Posso te mostrar como configurar a régua completa em menos de 5 minutos. 🚀`
      );

    case "d30_qbr":
      return (
        `${ctx.ownerName}, chegou a hora do seu *QBR mensal* no DrFlux! 📈\n\n` +
        (ctx.recoveredValue && ctx.recoveredValue > 0
          ? `💰 *Em 30 dias sua clínica recuperou ${formatBRL(ctx.recoveredValue)}* em cobranças que teriam sido perdidas.\n\n` +
            (ctx.drFluxCost
              ? `O DrFlux custa *${formatBRL(ctx.drFluxCost)}/mês* — seu ROI neste período já é de *${((ctx.recoveredValue / ctx.drFluxCost) * 100 - 100).toFixed(0)}%*. 🎯\n\n`
              : "")
          : `Vamos revisar juntos o que foi feito nos últimos 30 dias e identificar novas oportunidades.\n\n`) +
        `Posso te enviar um relatório detalhado? Responda com *SIM* que preparo agora! 📊`
      );

    case "d90_renewal":
      return (
        `${ctx.ownerName}, chegamos aos *90 dias* juntos! 🎉\n\n` +
        (ctx.recoveredValue && ctx.recoveredValue > 0
          ? `💸 *Valor total recuperado com DrFlux: ${formatBRL(ctx.recoveredValue)}*\n\n`
          : "") +
        `Sua clínica está madura para travar os resultados por 12 meses com *desconto de 25%* no plano anual.\n\n` +
        `Posso preparar uma proposta de renovação? A oferta especial é válida por 7 dias. ⏰`
      );

    default:
      return `Olá, ${ctx.ownerName}! Tudo bem com o DrFlux na ${ctx.clinicName}? Estamos aqui se precisar! 😊`;
  }
}

// ─── Z-API send helper ────────────────────────────────────────────────────────

async function sendZAPIMessage(clinicId: string, phone: string, message: string): Promise<string | null> {
  const { data: integration } = await db()
    .from("clinic_integrations")
    .select("credentials, status")
    .eq("clinic_id", clinicId)
    .eq("provider", "zapi")
    .maybeSingle();

  if (!integration || integration.status !== "connected") {
    console.warn(`[cs-cron] clinic ${clinicId} Z-API not connected, skipping WA send`);
    return null;
  }

  const { instance_id, token } = integration.credentials as { instance_id: string; token: string };
  const url = `${process.env.ZAPI_BASE_URL}/instances/${instance_id}/token/${token}/send-text`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": process.env.ZAPI_CLIENT_TOKEN ?? "",
      },
      body: JSON.stringify({ phone: phone.replace(/\D/g, ""), message }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[cs-cron] Z-API error ${res.status}: ${text}`);
      return null;
    }

    const data = (await res.json()) as { messageId?: string; zaapId?: string };
    return data.messageId ?? data.zaapId ?? null;
  } catch (err) {
    console.error("[cs-cron] Z-API fetch error", err);
    return null;
  }
}

// ─── Métricas para contexto das mensagens ─────────────────────────────────────

async function fetchClinicMetrics(clinicId: string) {
  // Valor recuperado: cobranças pagas nos últimos 90 dias
  const { data: recovered } = await db()
    .from("cobrancas")
    .select("value")
    .eq("clinic_id", clinicId)
    .eq("status", "paga")
    .gte("paid_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  const recoveredValue = (recovered ?? []).reduce(
    (sum: number, r: { value: number }) => sum + Number(r.value),
    0,
  );

  // Revenue Leak atual: cobranças atrasadas
  const { data: overdue } = await db()
    .from("cobrancas")
    .select("value")
    .eq("clinic_id", clinicId)
    .in("status", ["atrasada", "vencendo"]);

  const leakValue = (overdue ?? []).reduce(
    (sum: number, r: { value: number }) => sum + Number(r.value),
    0,
  );

  // Plano atual da clínica
  const { data: sub } = await db()
    .from("clinic_subscriptions")
    .select("plan:plans(amount_cents)")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  const drFluxCost = sub?.plan?.amount_cents ? sub.plan.amount_cents / 100 : 997;

  return { recoveredValue, leakValue, drFluxCost };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/cron/cs-touchpoints")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Verificar segredo do cron
        const authHeader = request.headers.get("authorization");
        const expected   = `Bearer ${process.env.CRON_SECRET}`;
        if (process.env.CRON_SECRET && authHeader !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const result = await executeCSTouchpoints();
        return Response.json(result, { status: 200 });
      },
    },
  },
});

async function executeCSTouchpoints() {
  const now = new Date();
  const stats = { processed: 0, sent: 0, skipped: 0, failed: 0 };

  // Buscar todos os touchpoints pendentes que já passaram do scheduled_at
  const { data: pending, error } = await db()
    .from("cs_touchpoints")
    .select(`
      id,
      clinic_id,
      touchpoint,
      scheduled_at,
      channel,
      clinic:clinicas (
        id,
        name,
        owner:profiles (
          id,
          full_name,
          phone
        )
      )
    `)
    .eq("status", "pending")
    .lte("scheduled_at", now.toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(50); // processar em lotes

  if (error) {
    console.error("[cs-cron] query error", error);
    return { ...stats, error: error.message };
  }

  if (!pending?.length) {
    console.log("[cs-cron] no pending touchpoints");
    return stats;
  }

  console.log(`[cs-cron] processing ${pending.length} touchpoints`);

  for (const tp of pending) {
    stats.processed++;

    try {
      const clinicId   = tp.clinic_id;
      const clinicName = tp.clinic?.name ?? "Clínica";
      const owner      = tp.clinic?.owner;
      const ownerName  = owner?.full_name?.split(" ")[0] ?? "Dr(a)";
      const ownerPhone = owner?.phone;

      if (!ownerPhone) {
        console.warn(`[cs-cron] touchpoint ${tp.id}: owner phone missing, skipping`);
        await db().from("cs_touchpoints").update({
          status:     "skipped",
          notes:      "Telefone do responsável não cadastrado",
          updated_at: now.toISOString(),
        }).eq("id", tp.id);
        stats.skipped++;
        continue;
      }

      // Buscar métricas para contextualizar a mensagem
      const metrics = await fetchClinicMetrics(clinicId);

      const message = buildTouchpointMessage(tp.touchpoint, {
        clinicName,
        ownerName,
        ...metrics,
      });

      // Enviar via WhatsApp (canal padrão) ou email como fallback
      let sent = false;
      let messageSent = message;

      if (tp.channel === "whatsapp") {
        const messageId = await sendZAPIMessage(clinicId, ownerPhone, message);
        sent = messageId !== null;
      } else {
        // TODO: fallback por email via Resend/SendGrid
        console.log(`[cs-cron] touchpoint ${tp.id}: channel=${tp.channel} not yet implemented`);
        sent = false;
      }

      // Atualizar status do touchpoint
      await db().from("cs_touchpoints").update({
        status:       sent ? "sent" : "failed",
        executed_at:  now.toISOString(),
        message_sent: messageSent.substring(0, 500),
        updated_at:   now.toISOString(),
      }).eq("id", tp.id);

      if (sent) {
        stats.sent++;
        console.log(`[cs-cron] ✅ ${tp.touchpoint} sent to clinic ${clinicId}`);
      } else {
        stats.failed++;
        console.warn(`[cs-cron] ❌ ${tp.touchpoint} failed for clinic ${clinicId}`);
      }
    } catch (err) {
      stats.failed++;
      console.error(`[cs-cron] error processing touchpoint ${tp.id}`, err);

      await db().from("cs_touchpoints").update({
        status:     "failed",
        notes:      String(err).substring(0, 500),
        updated_at: now.toISOString(),
      }).eq("id", tp.id).catch(() => null);
    }
  }

  console.log(`[cs-cron] done:`, stats);
  return stats;
}
