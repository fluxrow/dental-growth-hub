import { createFileRoute } from "@tanstack/react-router";
import { Plus, Zap, CalendarCheck, Repeat, Wallet, Star, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { EMPTY_STATES } from "@/lib/empty-states";
import { useEmptyMode } from "@/hooks/use-empty-mode";
import { AUTOMATIONS, type AutomationCategory } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/automacoes")({
  head: () => ({ meta: [{ title: "Automações · DentalFlux" }] }),
  component: Automacoes,
});

const CATS: Record<AutomationCategory, { label: string; icon: typeof Zap; tone: string }> = {
  confirmacao: { label: "Confirmações",      icon: CalendarCheck, tone: "bg-primary/10 text-primary" },
  reativacao:  { label: "Reativações",       icon: Repeat,        tone: "bg-info/10 text-info" },
  cobranca:    { label: "Cobranças",         icon: Wallet,        tone: "bg-warning/15 text-warning-foreground" },
  avaliacao:   { label: "Avaliações",        icon: Star,          tone: "bg-success/10 text-success" },
  "follow-up": { label: "Follow-up orçamento", icon: MessageCircle, tone: "bg-chart-2/10 text-chart-2" },
};

function Automacoes() {
  const __empty = useEmptyMode();
  if (__empty) {
    return (
      <AppShell title="Automações" subtitle="Fluxos automáticos da clínica">
        <EmptyState {...EMPTY_STATES.automacoes} />
      </AppShell>
    );
  }
  const totalRevenue = AUTOMATIONS.reduce((s, a) => s + a.revenue, 0);
  const totalSent = AUTOMATIONS.reduce((s, a) => s + a.sent, 0);
  const totalConv = AUTOMATIONS.reduce((s, a) => s + a.conversion, 0);

  return (
    <AppShell
      title="Automações"
      subtitle="Fluxos automáticos da clínica · impacto financeiro em tempo real"
      actions={
        <button className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-90">
          <Plus className="size-3.5"/> Nova automação
        </button>
      }
    >
      {/* Impact strip */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-surface to-chart-2/5 p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="size-4 text-primary"/>
          <div className="text-[12px] font-semibold uppercase tracking-wider text-primary">Impacto das automações · últimos 30 dias</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Impact label="Mensagens disparadas" value={totalSent.toLocaleString("pt-BR")} />
          <Impact label="Conversões geradas" value={totalConv.toLocaleString("pt-BR")} />
          <Impact label="Receita gerada" value={`R$ ${totalRevenue.toLocaleString("pt-BR")}`} highlight />
          <Impact label="Horas economizadas" value="~84h" />
        </div>
      </div>

      {/* Category groups */}
      <div className="space-y-5">
        {(Object.keys(CATS) as AutomationCategory[]).map((catId) => {
          const cat = CATS[catId];
          const items = AUTOMATIONS.filter((a) => a.category === catId);
          if (items.length === 0) return null;
          const Icon = cat.icon;
          const catRevenue = items.reduce((s, a) => s + a.revenue, 0);
          return (
            <section key={catId} className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="px-4 lg:px-5 h-14 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("size-9 rounded-md flex items-center justify-center", cat.tone)}>
                    <Icon className="size-4.5"/>
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold tracking-tight">{cat.label}</div>
                    <div className="text-[11.5px] text-muted-foreground">{items.length} automações · receita gerada R$ {catRevenue.toLocaleString("pt-BR")}</div>
                  </div>
                </div>
                <button className="text-[12px] text-primary hover:underline">+ Adicionar</button>
              </div>
              <div className="divide-y divide-border">
                {items.map((a) => (
                  <div key={a.id} className="px-4 lg:px-5 py-3.5 grid grid-cols-12 gap-3 items-center hover:bg-muted/30">
                    <div className="col-span-12 md:col-span-5">
                      <div className="flex items-center gap-2.5">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-medium",
                          a.status === "ativa" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                        )}>
                          <span className="size-1.5 rounded-full bg-current"/> {a.status}
                        </span>
                        <div className="text-[13px] font-medium">{a.name}</div>
                      </div>
                      <div className="mt-1 text-[11.5px] text-muted-foreground pl-1">Gatilho: {a.trigger}</div>
                    </div>
                    <Metric label="Enviadas"     value={a.sent.toLocaleString("pt-BR")} />
                    <Metric label="Resposta"     value={`${a.responseRate}%`} />
                    <Metric label="Conversão"    value={a.conversion.toLocaleString("pt-BR")} />
                    <Metric label="Receita"      value={a.revenue ? `R$ ${a.revenue.toLocaleString("pt-BR")}` : "—"} accent={!!a.revenue}/>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}

function Impact({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-display text-2xl lg:text-3xl font-semibold tabular-nums tracking-tight", highlight && "text-success")}>{value}</div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="col-span-3 md:col-span-1 lg:col-span-1 xl:col-span-1 text-right md:text-left">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-[13px] tabular-nums font-medium", accent && "text-success")}>{value}</div>
    </div>
  );
}
