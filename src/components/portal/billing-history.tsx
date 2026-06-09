import { MessageSquare, Mail, Smartphone } from "lucide-react";
import type { PortalChargeChannel, PortalChargeHistory, PortalChargeStatus } from "@/lib/mock";
import { cn } from "@/lib/utils";

const CHANNEL_ICON: Record<PortalChargeChannel, typeof MessageSquare> = {
  WhatsApp: MessageSquare,
  Email: Mail,
  SMS: Smartphone,
};

const STATUS_META: Record<PortalChargeStatus, { label: string; cls: string }> = {
  enviada: { label: "Enviada", cls: "bg-muted text-foreground/70" },
  lida: { label: "Lida", cls: "bg-info/10 text-info" },
  respondida: { label: "Respondida", cls: "bg-primary/10 text-primary" },
  paga: { label: "Paga", cls: "bg-success/10 text-success" },
  falhou: { label: "Falhou", cls: "bg-warning/15 text-warning-foreground" },
};

export function BillingHistory({ items }: { items: PortalChargeHistory[] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface">
      <header className="px-5 h-12 flex items-center justify-between border-b border-border">
        <h2 className="text-[14px] font-semibold tracking-tight">Histórico de cobranças</h2>
        <span className="text-[11px] text-muted-foreground">{items.length} registros</span>
      </header>
      <ul className="divide-y divide-border">
        {items.map((h) => {
          const Icon = CHANNEL_ICON[h.channel];
          const meta = STATUS_META[h.status];
          return (
            <li key={h.id} className="px-5 py-3 flex items-start gap-3">
              <div className="size-8 rounded-md bg-muted text-foreground/70 flex items-center justify-center shrink-0">
                <Icon className="size-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12.5px] font-medium truncate">{h.message}</div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                      meta.cls,
                    )}
                  >
                    {meta.label}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{h.date}</span>
                  <span>·</span>
                  <span>{h.channel}</span>
                  {h.value > 0 && (
                    <>
                      <span>·</span>
                      <span className="tabular-nums">
                        R$ {h.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
