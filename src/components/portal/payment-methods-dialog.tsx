import { CreditCard, QrCode, FileText, CalendarRange, X, Check, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const METHODS = [
  { id: "pix",      icon: QrCode,        title: "PIX",                desc: "Pagamento instantâneo, sem taxa", highlight: "5% de desconto" },
  { id: "cartao",   icon: CreditCard,    title: "Cartão de crédito",  desc: "Visa, Master, Elo, Amex", highlight: "Até 12x" },
  { id: "boleto",   icon: FileText,      title: "Boleto bancário",    desc: "Compensação em até 2 dias úteis" },
  { id: "parcelar", icon: CalendarRange, title: "Reparcelar",         desc: "Fale com a clínica para ajustar", highlight: "Sem juros" },
];

type Stage = "select" | "processing" | "done";

export function PaymentMethodsDialog({
  open,
  onClose,
  amount,
  onConfirmed,
}: {
  open: boolean;
  onClose: () => void;
  amount: number;
  onConfirmed?: (methodId: string, methodLabel: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("select");

  if (!open) return null;

  const reset = () => {
    setSelected(null);
    setStage("select");
  };

  const close = () => {
    onClose();
    setTimeout(reset, 250);
  };

  const handleConfirm = () => {
    if (!selected) return;
    const method = METHODS.find((m) => m.id === selected)!;
    setStage("processing");
    // Simulação realista do gateway
    setTimeout(() => {
      setStage("done");
      onConfirmed?.(method.id, method.title);
      toast.success("Pagamento confirmado", {
        description: `R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} via ${method.title}`,
      });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/40 backdrop-blur-sm" onClick={close}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl border border-border shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-border">
          <div>
            <div className="text-[14px] font-semibold">
              {stage === "done" ? "Tudo certo!" : "Formas de pagamento"}
            </div>
            <div className="text-[11.5px] text-muted-foreground">
              Total: <span className="font-medium text-foreground">R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <button onClick={close} className="size-8 rounded-md hover:bg-muted flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>

        {stage === "select" && (
          <>
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
                onClick={handleConfirm}
                className="w-full h-10 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
              >
                <Check className="size-3.5" /> Confirmar pagamento
              </button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Demonstração — nenhum pagamento real é processado.
              </p>
            </div>
          </>
        )}

        {stage === "processing" && (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <Loader2 className="size-8 text-primary animate-spin" />
            <div className="mt-4 text-[14px] font-semibold">Processando seu pagamento</div>
            <p className="mt-1 text-[12px] text-muted-foreground max-w-xs">
              Estamos confirmando com sua operadora. Isso leva só alguns segundos…
            </p>
          </div>
        )}

        {stage === "done" && (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="size-14 rounded-full bg-success/15 text-success flex items-center justify-center">
              <CheckCircle2 className="size-7" />
            </div>
            <div className="mt-4 text-[15px] font-semibold">Pagamento confirmado</div>
            <p className="mt-1 text-[12.5px] text-muted-foreground max-w-xs">
              Obrigada pelo pagamento de R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. O comprovante foi enviado pelo WhatsApp.
            </p>
            <button
              onClick={close}
              className="mt-5 w-full h-10 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90"
            >
              Concluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
