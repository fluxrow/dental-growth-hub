/**
 * billing.functions.ts — Server fns para Stripe Billing
 *
 * Fluxo de assinatura:
 *  1. Dentista clica "Assinar" → createCheckoutSession → redireciona para Stripe
 *  2. Após pagamento → checkout.session.completed webhook → provisiona acesso
 *  3. Renovações automáticas → invoice.paid webhook → atualiza period_end
 *  4. Falhas → invoice.payment_failed → dunning D+0 inicia
 *  5. Cancelamento → customer.subscription.deleted → revoga acesso
 *
 * Variáveis de ambiente necessárias:
 *  STRIPE_SECRET_KEY
 *  STRIPE_PRICE_ID_MONTHLY
 *  STRIPE_PRICE_ID_ANNUAL
 *  STRIPE_PRICE_ID_IMPL
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

// ---------------------------------------------------------------------------
// createCheckoutSession
// ---------------------------------------------------------------------------

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { planInterval: "month" | "year"; successUrl: string; cancelUrl: string }) => {
      if (!input?.planInterval) throw new Error("planInterval obrigatório");
      if (!input?.successUrl) throw new Error("successUrl obrigatório");
      if (!input?.cancelUrl) throw new Error("cancelUrl obrigatório");
      return input;
    },
  )
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

    const supabase = context.supabase as AnySupabase;

    // 1. Buscar ou criar Stripe Customer
    const { data: existing } = await supabase
      .from("clinic_subscriptions")
      .select("stripe_customer_id")
      .eq("clinic_id", context.userId) // context.userId é o clinic_id via profile
      .maybeSingle();

    let customerId = existing?.stripe_customer_id;

    if (!customerId) {
      // Buscar email e nome da clínica
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, clinic_id, clinic:clinicas(id, name)")
        .eq("id", context.userId)
        .single();

      const customer = await stripe.customers.create({
        name:
          (profile?.clinic as { name?: string } | null)?.name ?? profile?.full_name ?? "Clínica",
        email: profile?.email ?? "",
        metadata: {
          clinic_id: profile?.clinic_id ?? "",
          user_id: context.userId,
        },
      });
      customerId = customer.id;

      // Salvar customer_id
      await supabase.from("clinic_subscriptions").upsert(
        {
          clinic_id: profile?.clinic_id,
          stripe_customer_id: customerId,
          status: "trialing",
        },
        { onConflict: "clinic_id" },
      );
    }

    // 2. Montar line_items: implementação (one_time) + recorrente
    const monthlyPriceId = process.env.STRIPE_PRICE_ID_MONTHLY ?? "";
    const annualPriceId = process.env.STRIPE_PRICE_ID_ANNUAL ?? "";
    const implPriceId = process.env.STRIPE_PRICE_ID_IMPL ?? "";

    const recurringPriceId = data.planInterval === "year" ? annualPriceId : monthlyPriceId;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        // Taxa de implementação (one_time) — cobrada junto na primeira sessão
        // Nota: Stripe não suporta mixed mode (one_time + subscription).
        // Solução: cobrar impl como add_invoice_item antes do checkout
        {
          price: recurringPriceId,
          quantity: 1,
        },
      ],
      // add_invoice_items é top-level (não dentro de subscription_data)
      ...(implPriceId ? { add_invoice_items: [{ price: implPriceId }] } : {}),
      subscription_data: {
        metadata: {
          clinic_id: customerId, // para resolver no webhook
          plan_interval: data.planInterval,
        },
      },
      success_url: data.successUrl + "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: data.cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      locale: "pt-BR",
    });

    if (!session.url) throw new Error("Stripe não retornou URL de checkout");
    return { url: session.url };
  });

// ---------------------------------------------------------------------------
// createPortalSession — para atualizar cartão ou cancelar
// ---------------------------------------------------------------------------

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { returnUrl: string }) => {
    if (!input?.returnUrl) throw new Error("returnUrl obrigatório");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

    const supabase = context.supabase as AnySupabase;

    const { data: sub } = await supabase
      .from("clinic_subscriptions")
      .select("stripe_customer_id")
      .eq("clinic_id", context.userId)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      throw new Error("Nenhuma assinatura encontrada para esta clínica");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: data.returnUrl,
      locale: "pt-BR",
    });

    return { url: session.url };
  });

// ---------------------------------------------------------------------------
// getSubscriptionStatus
// ---------------------------------------------------------------------------

export const getSubscriptionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as AnySupabase;

    const { data } = await supabase
      .from("clinic_subscriptions")
      .select(
        `
        status,
        current_period_end,
        cancel_at_period_end,
        trial_end,
        plan:plans(name, interval, amount_cents)
      `,
      )
      .maybeSingle();

    return data ?? null;
  });
