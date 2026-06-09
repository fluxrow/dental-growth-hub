import { CreditCard, QrCode, FileText, CalendarRange, X, Check } from "lucide-react";
import { useState } from "react";

const METHODS = [
  { id: "pix",      icon: QrCode,        title: "PIX",                desc: "Pagamento instantâneo, sem taxa", highlight: "5% de desconto" },
  { id: "cartao",   icon: CreditCard,    title: "Cartão de crédito",  desc: "Visa, Master, Elo, Amex", highlight: "Até 12x" },
  { id: "boleto",   icon: FileText,      title: "Boleto bancário",    desc: "Compensação em até 2 dias úteis" },
  { id: "parcelar", icon: CalendarRange, title: "Reparcelar",         desc: "Fale com a clínica para ajustar", highlight: "Sem juros" },
];

export function PaymentMethodsDialog({ open, onClose, amount }: { open: boolean; onClose: () => void; amount: number }) {
  const [selected, setSelected] = useState<string | null>(null);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl border border-border shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-border">
          <div>
            <div className="text-[14px] font-semibold">Formas de pagamento</div>
            <div className="text-[11.5px] text-muted-foreground">
              Total: <span className="font-medium text-foreground">R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-md hover:bg-muted flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = selected === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                  active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
                }`}
              >
                <div className={`size-10 rounded-lg flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70"}`}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium">{m.title}</div>
                  <div className="text-[11.5px] text-muted-foreground truncate">{m.desc}</div>
                </div>
                {m.highlight && (
                  <span className="text-[10.5px] font-medium rounded-full bg-success/10 text-success px-2 py-0.5">{m.highlight}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-4 pb-4">
          <button
            disabled={!selected}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
          >
            <Check className="size-3.5" /> Continuar
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Esta é uma demonstração. Nenhum pagamento real é processado.
          </p>
        </div>
      </div>
    </div>
  );
}
