import { createFileRoute } from "@tanstack/react-router";
import { Plus, Repeat, CalendarCheck, Wallet, Star, MoreVertical } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { EMPTY_STATES } from "@/lib/empty-states";
import { useEmptyMode } from "@/hooks/use-empty-mode";
import { CAMPAIGNS, type CampaignType } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/campanhas")({
  head: () => ({ meta: [{ title: "Campanhas · DentalFlux" }] }),
  component: Campanhas,
});

const TYPES: Record<CampaignType, { label: string; icon: typeof Repeat; tone: string }> = {
  reativacao: { label: "Reativação", icon: Repeat, tone: "bg-info/10 text-info" },
  confirmacao: { label: "Confirmação", icon: CalendarCheck, tone: "bg-primary/10 text-primary" },
  cobranca: { label: "Cobrança", icon: Wallet, tone: "bg-warning/15 text-warning-foreground" },
  avaliacao: { label: "Avaliação", icon: Star, tone: "bg-success/10 text-success" },
};

function Campanhas() {
  const __empty = useEmptyMode();
  if (__empty) {
    return (
      <AppShell title="Campanhas" subtitle="Campanhas e disparos manuais">
        <EmptyState {...EMPTY_STATES.campanhas} />
      </AppShell>
    );
  }
  const totalSent = CAMPAIGNS.reduce((s, c) => s + c.sent, 0);
  const totalRev = CAMPAIGNS.reduce((s, c) => s + c.revenue, 0);

  return (
    <AppShell
      title="Campanhas"
      subtitle="Campanhas únicas e disparos manuais"
      actions={
        <button className="inline-flex shadow-lg md:shadow-none items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs-plus font-medium hover:opacity-90">
          <Plus className="size-3.5" /> Nova campanha
        </button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {(Object.keys(TYPES) as CampaignType[]).map((k) => {
          const t = TYPES[k];
          const Icon = t.icon;
          const total = CAMPAIGNS.filter((c) => c.type === k).length;
          return (
            <div key={k} className="rounded-xl border border-border bg-surface p-4">
              <div
                className={cn("size-9 rounded-md flex items-center justify-center mb-3", t.tone)}
              >
                <Icon className="size-4.5" />
              </div>
              <div className="text-2xs text-muted-foreground">{t.label}</div>
              <div className="font-display text-2xl font-semibold tabular-nums">{total}</div>
              <div className="text-2xs text-muted-foreground mt-0.5">campanhas ativas</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <Highlight label="Mensagens enviadas" value={totalSent.toLocaleString("pt-BR")} />
        <Highlight label="Receita gerada" value={`R$ ${totalRev.toLocaleString("pt-BR")}`} />
        <Highlight
          label="Conversão média"
          value={`${Math.round((CAMPAIGNS.reduce((s, c) => s + c.converted, 0) / totalSent) * 100)}%`}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-4 h-12 border-b border-border flex items-center justify-between">
          <div className="text-sm-minus font-semibold tracking-tight">Todas as campanhas</div>
          <div className="text-2xs text-muted-foreground tabular-nums">
            {CAMPAIGNS.length} resultados
          </div>
        </div>
        <table className="w-full text-sm-minus">
          <thead className="text-2xs uppercase tracking-wider text-muted-foreground bg-surface-muted/40">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Campanha</th>
              <th className="text-left font-medium px-4 py-2.5">Tipo</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
              <th className="text-right font-medium px-4 py-2.5">Enviadas</th>
              <th className="text-right font-medium px-4 py-2.5">Abertura</th>
              <th className="text-right font-medium px-4 py-2.5">Resposta</th>
              <th className="text-right font-medium px-4 py-2.5">Conversão</th>
              <th className="text-right font-medium px-4 py-2.5">Receita</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {CAMPAIGNS.map((c) => {
              const t = TYPES[c.type];
              const open = ((c.opened / c.sent) * 100).toFixed(0);
              const resp = ((c.responded / c.sent) * 100).toFixed(0);
              const conv = ((c.converted / c.sent) * 100).toFixed(0);
              return (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-2xs font-medium",
                        t.tone,
                      )}
                    >
                      {t.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium",
                        c.status === "ativa"
                          ? "bg-success/10 text-success"
                          : c.status === "pausada"
                            ? "bg-warning/15 text-warning-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current" /> {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.sent}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {open}%
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {resp}%
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-primary">
                    {conv}%
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {c.revenue ? `R$ ${c.revenue.toLocaleString("pt-BR")}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <MoreVertical className="size-4 text-muted-foreground" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Highlight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-surface to-accent/20 p-5">
      <div className="text-2xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
