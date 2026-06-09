import { useState } from "react";
import { Calendar, CreditCard, HelpCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortalBilling, PortalBillingStatus } from "@/lib/mock";
import { PaymentMethodsDialog } from "./payment-methods-dialog";

const STATUS_META: Record<PortalBillingStatus, { label: string; cls: string }> = {
  "em-dia":   { label: "Em dia",   cls: "bg-success/10 text-success border-success/20" },
  "a-vencer": { label: "A vencer", cls: "bg-info/10 text-info border-info/20" },
  vencido:    { label: "Vencido",  cls: "bg-warning/15 text-warning-foreground border-warning/30" },
  pago:       { label: "Pago",     cls: "bg-success/10 text-success border-success/20" },
};

export function BillingCard({ billing, firstName }: { billing: PortalBilling; firstName: string }) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[billing.status];

  return (
    <section className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-primary" />
          <h2 className="text-[14px] font-semibold tracking-tight">Pagamentos & cobranças</h2>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.cls)}>
          <span className="size-1.5 rounded-full bg-current" />
          {meta.label}
        </span>
      </div>

      <div className="px-5">
        <div className="rounded-xl bg-gradient-to-br from-primary/8 via-accent to-background border border-border p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Valor pendente</div>
          <div className="mt-1 font-display text-3xl font-semibold tabular-nums">
            R$ {billing.pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[12.5px] text-muted-foreground">{billing.description}</div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="size-3.5" />
              <span>Vencimento</span>
              <span className="text-foreground font-medium">{billing.dueDate}</span>
            </div>
            {billing.installmentInfo && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Sparkles className="size-3.5" />
                <span className="text-foreground font-medium">{billing.installmentInfo}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-muted/60 border border-border px-4 py-3 text-[13px] leading-relaxed text-foreground/85">
          {billing.humanMessage}
        </div>
      </div>

      <div className="p-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90"
        >
          <CreditCard className="size-3.5" /> Ver formas de pagamento
        </button>
        <a
          href="#"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-[12.5px] hover:bg-muted"
        >
          <HelpCircle className="size-3.5" /> Falar com a clínica
        </a>
        <span className="ml-auto text-[11.5px] text-muted-foreground">Olá, {firstName} 💜</span>
      </div>

      <PaymentMethodsDialog open={open} onClose={() => setOpen(false)} amount={billing.pending} />
    </section>
  );
}
