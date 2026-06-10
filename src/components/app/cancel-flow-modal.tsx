/**
 * CancelFlowModal
 *
 * Sprint 3 — Churn Prevention
 * Fluxo: Survey → Save Offer → Confirmation
 *
 * Integração Stripe:
 *  - Desconto: applyCancelSaveOffer({ couponId })
 *  - Pausa:    pauseSubscription({ months })
 *  - Portal:   openStripePortal() → Stripe Customer Portal
 *  - Cancelar: cancelSubscription()
 */

import { useState } from "react";
import { X, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

const getStripe = () =>
  new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

/** Aplica cupom de desconto à subscription ativa do clinic */
export const applyCancelSaveOffer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { clinicId: string; couponId: string; reason: string })
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sub } = await (supabaseAdmin as any)
      .from("clinic_subscriptions")
      .select("stripe_subscription_id")
      .eq("clinic_id", data.clinicId)
      .eq("status", "active")
      .maybeSingle();

    if (!sub?.stripe_subscription_id) throw new Error("No active subscription");

    const stripe = getStripe();
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      coupon: data.couponId,
    });

    // Log decision
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("churn_attempts").insert({
      clinic_id: data.clinicId,
      reason: data.reason,
      action: "offer_accepted",
      coupon_id: data.couponId,
    });

    return { ok: true };
  });

/** Pausa a subscription por N meses */
export const pauseSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { clinicId: string; months: number; reason: string })
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sub } = await (supabaseAdmin as any)
      .from("clinic_subscriptions")
      .select("stripe_subscription_id")
      .eq("clinic_id", data.clinicId)
      .eq("status", "active")
      .maybeSingle();

    if (!sub?.stripe_subscription_id) throw new Error("No active subscription");

    const stripe = getStripe();
    const resumeAt = Math.floor(
      new Date(Date.now() + data.months * 30 * 24 * 60 * 60 * 1000).getTime() / 1000,
    );

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      pause_collection: {
        behavior: "void",
        resumes_at: resumeAt,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("churn_attempts").insert({
      clinic_id: data.clinicId,
      reason: data.reason,
      action: "paused",
      paused_months: data.months,
    });

    return { ok: true, resumeAt };
  });

/** Cancela subscription ao final do período */
export const cancelSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { clinicId: string; reason: string })
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sub } = await (supabaseAdmin as any)
      .from("clinic_subscriptions")
      .select("stripe_subscription_id")
      .eq("clinic_id", data.clinicId)
      .eq("status", "active")
      .maybeSingle();

    if (!sub?.stripe_subscription_id) throw new Error("No active subscription");

    const stripe = getStripe();
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("churn_attempts").insert({
      clinic_id: data.clinicId,
      reason: data.reason,
      action: "cancelled",
    });

    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Types & Config
// ---------------------------------------------------------------------------

type Step = "survey" | "offer" | "confirm" | "done";

interface CancelReason {
  id: string;
  label: string;
  offer: OfferConfig;
}

interface OfferConfig {
  type: "discount" | "pause" | "feature" | "support" | "none";
  title: string;
  description: string;
  cta: string;
  ctaSecondary?: string;
  /** Stripe coupon ID para descontos */
  couponId?: string;
  /** Meses para pausa */
  pauseMonths?: number;
}

const CANCEL_REASONS: CancelReason[] = [
  {
    id: "expensive",
    label: "Está muito caro para meu orçamento",
    offer: {
      type: "discount",
      title: "Que tal 30% de desconto por 3 meses?",
      description:
        "Sabemos que cada centavo importa. Por isso queremos oferecer R$300 de desconto nos próximos 3 meses — sem compromisso adicional.",
      cta: "Aceitar desconto",
      ctaSecondary: "Ou pausar por 1 mês grátis",
      couponId: "SAVE30_3M",
      pauseMonths: 1,
    },
  },
  {
    id: "not_using",
    label: "Não estou usando o suficiente",
    offer: {
      type: "pause",
      title: "Pause por 1 mês — sem cobrança",
      description:
        "Não precisa cancelar agora. Pause sua conta por até 1 mês: seus dados ficam preservados e você volta quando quiser.",
      cta: "Pausar por 1 mês",
      ctaSecondary: "Prefiro sessão de onboarding gratuita",
      pauseMonths: 1,
    },
  },
  {
    id: "missing_feature",
    label: "Falta uma funcionalidade que preciso",
    offer: {
      type: "feature",
      title: "Conte o que falta — pode já estar no roadmap",
      description:
        "Nossa equipe está em contato direto com clínicas. Se a feature que você precisa ainda não existe, provavelmente já está em desenvolvimento.",
      cta: "Falar com suporte",
      ctaSecondary: "Ver roadmap →",
    },
  },
  {
    id: "switching",
    label: "Vou usar outra ferramenta",
    offer: {
      type: "discount",
      title: "Antes de ir — compare com segurança",
      description:
        "Oferecemos 25% de desconto por 2 meses para você testar a concorrência sem pressa. Se voltar, estamos aqui.",
      cta: "Aceitar 25% por 2 meses",
      couponId: "SAVE25_2M",
    },
  },
  {
    id: "technical",
    label: "Problemas técnicos ou bugs",
    offer: {
      type: "support",
      title: "Nosso time resolve em 24h",
      description:
        "Bugs são inaceitáveis. Vamos escalar o seu caso para prioridade máxima e resolver em até 24 horas — com crédito de R$100 pela inconveniência.",
      cta: "Escalar para suporte prioritário",
    },
  },
  {
    id: "temporary",
    label: "É temporário / sazonalidade",
    offer: {
      type: "pause",
      title: "Pause por até 2 meses",
      description:
        "Para necessidades sazonais, a pausa faz mais sentido do que cancelar. Seus dados, configurações e histórico ficam intactos.",
      cta: "Pausar por 2 meses",
      pauseMonths: 2,
    },
  },
  {
    id: "closing",
    label: "A clínica está encerrando as atividades",
    offer: {
      type: "none",
      title: "Lamentamos muito",
      description:
        "Desejamos tudo de bom nessa nova fase. Seus dados ficam preservados por 90 dias caso precise acessá-los.",
      cta: "Confirmar cancelamento",
    },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CancelFlowModalProps {
  clinicId: string;
  onClose: () => void;
}

export function CancelFlowModal({ clinicId, onClose }: CancelFlowModalProps) {
  const [step, setStep] = useState<Step>("survey");
  const [selectedReason, setSelectedReason] = useState<CancelReason | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offer = selectedReason?.offer;

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleAcceptOffer() {
    if (!selectedReason || !offer) return;
    setLoading(true);
    setError(null);
    try {
      if (offer.type === "discount" && offer.couponId) {
        await applyCancelSaveOffer({
          data: { clinicId, couponId: offer.couponId, reason: selectedReason.id },
        });
      } else if ((offer.type === "pause" || offer.type === "none") && offer.pauseMonths) {
        await pauseSubscription({
          data: { clinicId, months: offer.pauseMonths, reason: selectedReason.id },
        });
      } else {
        // support / feature → abrir chat/email
        window.open("mailto:suporte@dentalflux.com.br?subject=Suporte+prioritário", "_blank");
        onClose();
        return;
      }
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao aplicar oferta");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmCancel() {
    if (!selectedReason) return;
    setLoading(true);
    setError(null);
    try {
      await cancelSubscription({
        data: { clinicId, reason: selectedReason.id },
      });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao cancelar assinatura");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-background rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h2 className="text-[15px] font-semibold">
            {step === "survey" && "Por que você quer cancelar?"}
            {step === "offer" && "Antes de ir…"}
            {step === "confirm" && "Confirmar cancelamento"}
            {step === "done" && "Pronto!"}
          </h2>
          <button
            onClick={onClose}
            className="size-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* ── Step 1: Survey ── */}
          {step === "survey" && (
            <>
              <p className="text-[13px] text-muted-foreground">
                Sua resposta nos ajuda a melhorar. Selecione o principal motivo:
              </p>
              <ul className="space-y-2">
                {CANCEL_REASONS.map((reason) => (
                  <li key={reason.id}>
                    <button
                      onClick={() => setSelectedReason(reason)}
                      className={cn(
                        "w-full text-left px-3.5 py-2.5 rounded-lg border text-[13px] transition-colors",
                        selectedReason?.id === reason.id
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border hover:border-primary/40 hover:bg-muted",
                      )}
                    >
                      {reason.label}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 h-9 rounded-lg border border-input text-[13px] font-medium hover:bg-muted"
                >
                  Manter assinatura
                </button>
                <button
                  disabled={!selectedReason}
                  onClick={() =>
                    setStep(selectedReason?.offer.type === "none" ? "confirm" : "offer")
                  }
                  className="flex-1 h-9 rounded-lg bg-destructive/10 text-destructive text-[13px] font-medium hover:bg-destructive/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Save Offer ── */}
          {step === "offer" && offer && offer.type !== "none" && (
            <>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                <p className="text-[14px] font-semibold">{offer.title}</p>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {offer.description}
                </p>
                <button
                  disabled={loading}
                  onClick={handleAcceptOffer}
                  className="w-full mt-2 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="size-3.5 animate-spin" />}
                  {offer.cta}
                </button>
                {offer.ctaSecondary && (
                  <button
                    disabled={loading}
                    onClick={async () => {
                      if (offer.type === "discount" && offer.pauseMonths) {
                        setLoading(true);
                        try {
                          await pauseSubscription({
                            data: {
                              clinicId,
                              months: offer.pauseMonths,
                              reason: selectedReason!.id,
                            },
                          });
                          setStep("done");
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Erro");
                        } finally {
                          setLoading(false);
                        }
                      } else {
                        window.open("https://dentalflux.com.br/roadmap", "_blank");
                      }
                    }}
                    className="w-full h-8 rounded-lg border border-input text-[12.5px] text-muted-foreground hover:bg-muted disabled:opacity-50"
                  >
                    {offer.ctaSecondary}
                  </button>
                )}
              </div>

              {error && (
                <p className="text-[12px] text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <button
                onClick={() => setStep("confirm")}
                className="w-full text-[12px] text-muted-foreground hover:text-destructive underline-offset-2 hover:underline"
              >
                Não, quero cancelar mesmo assim
              </button>
            </>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === "confirm" && (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <AlertTriangle className="size-4 text-destructive mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-destructive">
                    Tem certeza que quer cancelar?
                  </p>
                  <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                    Seu acesso ficará ativo até o final do período atual. Após isso, todos os dados,
                    automações e histórico serão desativados.
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-[12px] text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("survey")}
                  className="flex-1 h-9 rounded-lg border border-input text-[13px] font-medium hover:bg-muted"
                >
                  Voltar
                </button>
                <button
                  disabled={loading}
                  onClick={handleConfirmCancel}
                  className="flex-1 h-9 rounded-lg bg-destructive text-destructive-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="size-3.5 animate-spin" />}
                  Confirmar cancelamento
                </button>
              </div>
            </>
          )}

          {/* ── Step 4: Done ── */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="size-10 text-success" />
              <p className="text-[14px] font-semibold">
                {selectedReason?.offer.type === "discount" || selectedReason?.offer.type === "pause"
                  ? "Oferta aplicada com sucesso!"
                  : "Cancelamento registrado"}
              </p>
              <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs">
                {selectedReason?.offer.type === "discount"
                  ? "O desconto já está ativo na sua próxima fatura. Obrigado por continuar com o DrFlux!"
                  : selectedReason?.offer.type === "pause"
                    ? "Sua conta foi pausada. Você receberá um e-mail antes da reativação automática."
                    : "Seu acesso continua ativo até o final do período atual. Obrigado por ter usado o DrFlux!"}
              </p>
              <button
                onClick={onClose}
                className="mt-2 h-9 px-5 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
