import { useMemo, useState } from "react";
import { Calendar, CreditCard, HelpCircle, Sparkles, MessageSquareHeart } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  billingMessage,
  CLINIC_TONES,
  type ClinicTone,
  type PortalBilling,
  type PortalBillingStatus,
} from "@/lib/mock";
import { PaymentMethodsDialog } from "./payment-methods-dialog";

const STATUS_META: Record<PortalBillingStatus, { label: string; cls: string }> = {
  "em-dia": { label: "Em dia", cls: "bg-success/10 text-success border-success/20" },
  "a-vencer": { label: "A vencer", cls: "bg-info/10 text-info border-info/20" },
  vencido: { label: "Vencido", cls: "bg-warning/15 text-warning-foreground border-warning/30" },
  pago: { label: "Pago", cls: "bg-success/10 text-success border-success/20" },
};

export function BillingCard({
  billing: initialBilling,
  firstName,
  defaultTone = "acolhedora",
}: {
  billing: PortalBilling;
  firstName: string;
  defaultTone?: ClinicTone;
}) {
  const [open, setOpen] = useState(false);
  const [billing, setBilling] = useState<PortalBilling>(initialBilling);
  const [tone, setTone] = useState<ClinicTone>(defaultTone);

  const meta = STATUS_META[billing.status];

  const message = useMemo(
    () => billingMessage(billing.status, tone, firstName, billing.dueDate),
    [billing.status, tone, firstName, billing.dueDate],
  );

  const handleConfirmed = () => {
    setBilling((b) => ({ ...b, status: "pago", pending: 0 }));
  };

  return (
    <section className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-primary" />
          <h2 className="text-[14px] font-semibold tracking-tight">Pagamentos & cobranças</h2>
        </div>
        <div className="flex items-center gap-2">
          <ToneSelect tone={tone} onChange={setTone} />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
              meta.cls,
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {meta.label}
          </span>
        </div>
      </div>

      <div className="px-5">
        <div className="rounded-xl bg-gradient-to-br from-primary/8 via-accent to-background border border-border p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            {billing.status === "pago" ? "Valor pago" : "Valor pendente"}
          </div>
          <div className="mt-1 font-display text-3xl font-semibold tabular-nums">
            R${" "}
            {(billing.pending || initialBilling.pending).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
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

        <div className="mt-4 rounded-lg bg-muted/60 border border-border px-4 py-3 text-[13px] leading-relaxed text-foreground/85 flex gap-2">
          <MessageSquareHeart className="size-4 text-primary mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      </div>

      <div className="p-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          disabled={billing.status === "pago"}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CreditCard className="size-3.5" />
          {billing.status === "pago" ? "Pagamento concluído" : "Ver formas de pagamento"}
        </button>
        <a
          href="#"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-[12.5px] hover:bg-muted"
        >
          <HelpCircle className="size-3.5" /> Falar com a clínica
        </a>
        <span className="ml-auto text-[11.5px] text-muted-foreground">Olá, {firstName} 💜</span>
      </div>

      <PaymentMethodsDialog
        open={open}
        onClose={() => setOpen(false)}
        amount={initialBilling.pending}
        onConfirmed={handleConfirmed}
      />
    </section>
  );
}

function ToneSelect({ tone, onChange }: { tone: ClinicTone; onChange: (t: ClinicTone) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="hidden sm:inline">Tom da clínica:</span>
      <select
        value={tone}
        onChange={(e) => onChange(e.target.value as ClinicTone)}
        className="h-7 rounded-md border border-input bg-background px-2 text-[11.5px] font-medium focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {CLINIC_TONES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </label>
  );
}
