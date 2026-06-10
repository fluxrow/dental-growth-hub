/**
 * POST /api/webhooks/stripe
 *
 * Recebe e processa eventos do Stripe Billing.
 *
 * Eventos tratados:
 *  CRÍTICOS (provisão/revogação de acesso):
 *   - checkout.session.completed       → ativa assinatura + seed CS régua
 *   - invoice.paid                     → renovação confirmada
 *   - invoice.payment_failed           → iniciar dunning próprio
 *   - customer.subscription.deleted    → revogar acesso
 *   - customer.subscription.updated    → sincronizar status
 *
 *  RECOMENDADOS:
 *   - customer.subscription.trial_will_end → aviso 3 dias antes
 *   - invoice.upcoming                     → aviso de cobrança próxima
 *   - invoice.payment_action_required      → notificar autenticação 3DS
 *
 * Segurança:
 *  - Valida Stripe-Signature via stripe.webhooks.constructEvent()
 *  - Idempotência via payment_events.stripe_event_id UNIQUE
 *
 * Requer env:
 *  STRIPE_SECRET_KEY
 *  STRIPE_WEBHOOK_SECRET
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type Stripe from "stripe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAdmin = any;
const db = () => supabaseAdmin as AnyAdmin;

// Dias futuros de CS touchpoints a partir da data de ativação
const CS_SCHEDULE_DAYS: Record<string, number> = {
  d0_kickoff:  0,
  d7_checkin:  7,
  d30_qbr:     30,
  d90_renewal: 90,
};

async function seedCSTouchpoints(clinicId: string, activatedAt: Date) {
  const rows = Object.entries(CS_SCHEDULE_DAYS).map(([touchpoint, days]) => {
    const scheduled = new Date(activatedAt);
    scheduled.setDate(scheduled.getDate() + days);
    return {
      clinic_id:    clinicId,
      touchpoint,
      scheduled_at: scheduled.toISOString(),
      status:       "pending",
      channel:      "whatsapp",
    };
  });

  const { error } = await db()
    .from("cs_touchpoints")
    .upsert(rows, { onConflict: "clinic_id,touchpoint", ignoreDuplicates: true });

  if (error) console.error("[stripe] cs_touchpoints seed error", error);
  else console.log(`[stripe] seeded ${rows.length} CS touchpoints for clinic ${clinicId}`);
}

async function resolveClinicId(stripeCustomerId: string): Promise<string | null> {
  const { data } = await db()
    .from("clinic_subscriptions")
    .select("clinic_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  return data?.clinic_id ?? null;
}

export const Route = createFileRoute("/api/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: "2025-02-24.acacia",
        });

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
          console.error("[stripe] STRIPE_WEBHOOK_SECRET not configured");
          return new Response("Not configured", { status: 500 });
        }

        const rawBody  = await request.text();
        const sig      = request.headers.get("stripe-signature") ?? "";

        let event: ReturnType<typeof stripe.webhooks.constructEvent> extends Promise<infer T> ? T : ReturnType<typeof stripe.webhooks.constructEvent>;
        try {
          event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        } catch (err) {
          console.warn("[stripe] webhook signature verification failed", err);
          return new Response("Invalid signature", { status: 400 });
        }

        // Responder ao Stripe imediatamente — processar assincronamente
        processStripeEvent(event as Stripe.Event).catch((err) =>
          console.error("[stripe] background processing error", err),
        );

        return new Response("OK", { status: 200 });
      },
    },
  },
});

async function processStripeEvent(event: Stripe.Event) {
  // 1. Idempotência — ignorar evento já processado
  const { error: dupErr } = await db()
    .from("payment_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event.data.object,
    });

  if (dupErr?.code === "23505") {
    // UNIQUE violation — evento duplicado, ignorar silenciosamente
    console.log(`[stripe] duplicate event ignored: ${event.id}`);
    return;
  }

  const obj = event.data.object as unknown as Record<string, unknown>;

  switch (event.type) {
    // ── Checkout completo → ativar assinatura ──────────────────────────────
    case "checkout.session.completed": {
      const customerId = obj["customer"] as string;
      const subscriptionId = obj["subscription"] as string | null;
      const clinicId = await resolveClinicId(customerId);

      if (!clinicId) {
        console.warn("[stripe] checkout.completed: clinic not found for customer", customerId);
        return;
      }

      await db()
        .from("clinic_subscriptions")
        .update({
          stripe_subscription_id: subscriptionId,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);

      // Seed CS touchpoints D+0 a D+90
      await seedCSTouchpoints(clinicId, new Date());

      // Atualizar payment_events com clinic_id agora que temos
      await db()
        .from("payment_events")
        .update({ clinic_id: clinicId, amount_cents: obj["amount_total"] as number })
        .eq("stripe_event_id", event.id);

      console.log(`[stripe] subscription activated for clinic ${clinicId}`);
      break;
    }

    // ── Fatura paga → renovação confirmada ────────────────────────────────
    case "invoice.paid": {
      const customerId = (obj["customer"] as string) ?? "";
      const subscriptionId = (obj["subscription"] as string) ?? "";
      const clinicId = await resolveClinicId(customerId);

      if (!clinicId) break;

      // Buscar period_end da subscription
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
      const sub = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;

      await db()
        .from("clinic_subscriptions")
        .update({
          status: "active",
          current_period_start: sub ? new Date(sub.current_period_start * 1000).toISOString() : undefined,
          current_period_end:   sub ? new Date(sub.current_period_end   * 1000).toISOString() : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);

      await db()
        .from("payment_events")
        .update({
          clinic_id: clinicId,
          amount_cents: obj["amount_paid"] as number,
          invoice_id: obj["id"] as string,
          subscription_id: subscriptionId,
          status: "paid",
        })
        .eq("stripe_event_id", event.id);

      console.log(`[stripe] invoice.paid for clinic ${clinicId}`);
      break;
    }

    // ── Falha de pagamento → dunning ───────────────────────────────────────
    case "invoice.payment_failed": {
      const customerId = (obj["customer"] as string) ?? "";
      const clinicId = await resolveClinicId(customerId);

      if (!clinicId) break;

      await db()
        .from("clinic_subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("stripe_customer_id", customerId);

      await db()
        .from("payment_events")
        .update({
          clinic_id: clinicId,
          amount_cents: obj["amount_due"] as number,
          invoice_id: obj["id"] as string,
          status: "failed",
        })
        .eq("stripe_event_id", event.id);

      // TODO Sprint 5: disparar email de dunning próprio D+0
      console.warn(`[stripe] invoice.payment_failed for clinic ${clinicId} — dunning D+0 needed`);
      break;
    }

    // ── Assinatura cancelada → revogar acesso ─────────────────────────────
    case "customer.subscription.deleted": {
      const customerId = (obj["customer"] as string) ?? "";
      const clinicId = await resolveClinicId(customerId);

      if (!clinicId) break;

      await db()
        .from("clinic_subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);

      await db()
        .from("payment_events")
        .update({ clinic_id: clinicId, status: "canceled" })
        .eq("stripe_event_id", event.id);

      console.log(`[stripe] subscription deleted for clinic ${clinicId}`);
      break;
    }

    // ── Atualização de status ─────────────────────────────────────────────
    case "customer.subscription.updated": {
      const customerId = (obj["customer"] as string) ?? "";
      const clinicId = await resolveClinicId(customerId);

      if (!clinicId) break;

      const stripeStatus = obj["status"] as string;
      const statusMap: Record<string, string> = {
        active: "active",
        past_due: "past_due",
        canceled: "canceled",
        paused: "paused",
        trialing: "trialing",
        incomplete: "incomplete",
        incomplete_expired: "canceled",
        unpaid: "past_due",
      };

      await db()
        .from("clinic_subscriptions")
        .update({
          status: statusMap[stripeStatus] ?? stripeStatus,
          cancel_at_period_end: obj["cancel_at_period_end"] as boolean,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);

      break;
    }

    // ── Trial terminando em 3 dias ────────────────────────────────────────
    case "customer.subscription.trial_will_end": {
      const customerId = (obj["customer"] as string) ?? "";
      const clinicId = await resolveClinicId(customerId);
      if (clinicId) {
        // TODO: enviar aviso via Z-API para clínica confirmar pagamento
        console.log(`[stripe] trial_will_end for clinic ${clinicId} — notify needed`);
      }
      break;
    }

    default:
      console.log(`[stripe] unhandled event type: ${event.type}`);
  }
}
