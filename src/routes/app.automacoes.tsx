import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Zap,
  CalendarCheck,
  Repeat,
  Wallet,
  Star,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { useEmptyMode } from "@/hooks/use-empty-mode";
import { AUTOMATIONS, type AutomationCategory } from "@/lib/mock";
import { listAutomacoes, toggleAutomacao, type AutomacaoRow } from "@/lib/automacoes.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/automacoes")({
  head: () => ({ meta: [{ title: "Automações · Dr. Flux" }] }),
  component: Automacoes,
});

const CATS: Record<AutomationCategory, { label: string; icon: typeof Zap; tone: string }> = {
  confirmacao: { label: "Confirmações", icon: CalendarCheck, tone: "bg-primary/10 text-primary" },
  reativacao: { label: "Reativações", icon: Repeat, tone: "bg-info/10 text-info" },
  cobranca: { label: "Cobranças", icon: Wallet, tone: "bg-warning/15 text-warning-foreground" },
  avaliacao: { label: "Avaliações", icon: Star, tone: "bg-success/10 text-success" },
  "follow-up": {
    label: "Follow-up",
    icon: MessageCircle,
    tone: "bg-chart-2/10 text-chart-2",
  },
};

// Normalised shape used by both mock and live paths
type AutomacaoDisplay = {
  id: string;
  name: string;
  category: AutomationCategory;
  triggerLabel: string;
  enabled: boolean;
  sent: number;
  revenue: number;
  isLive: boolean;
};

function fromMock(): AutomacaoDisplay[] {
  return AUTOMATIONS.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category,
    triggerLabel: a.trigger,
    enabled: a.status === "ativa",
    sent: a.sent,
    revenue: a.revenue,
    isLive: false,
  }));
}

function fromDB(rows: AutomacaoRow[]): AutomacaoDisplay[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: ((r.config.category as string) ?? "follow-up") as AutomationCategory,
    triggerLabel: (r.config.trigger_description as string | undefined) ?? r.name,
    enabled: r.enabled,
    sent: r.run_count,
    revenue: 0,
    isLive: true,
  }));
}

function Automacoes() {
  const live = useEmptyMode();
  const queryClient = useQueryClient();

  const { data: liveRows, isLoading } = useQuery({
    queryKey: ["automacoes"],
    enabled: live,
    queryFn: () => listAutomacoes(),
  });

  // Optimistic local toggle state (live mode)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const handleToggle = (id: string, nextEnabled: boolean): void => {
    if (!live) return;
    // Optimistic: flip in cache immediately
    queryClient.setQueryData<AutomacaoRow[]>(["automacoes"], (prev) =>
      (prev ?? []).map((r) => (r.id === id ? { ...r, enabled: nextEnabled } : r)),
    );
    setPendingIds((s) => new Set(s).add(id));
    toggleAutomacao({ data: { id, enabled: nextEnabled } })
      .then(() => {
        toast.success(nextEnabled ? "Automação ativada" : "Automação pausada");
        queryClient.invalidateQueries({ queryKey: ["automacoes"] });
      })
      .catch((err: unknown) => {
        // Revert on error
        queryClient.setQueryData<AutomacaoRow[]>(["automacoes"], (prev) =>
          prev?.map((r) => (r.id === id ? { ...r, enabled: !nextEnabled } : r)),
        );
        toast.error(err instanceof Error ? err.message : "Erro ao alterar automação");
      })
      .finally(() =>
        setPendingIds((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        }),
      );
  };

  if (live && isLoading) {
    return (
      <AppShell title="Automações" subtitle="Fluxos automáticos da clínica">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  const items: AutomacaoDisplay[] = live ? fromDB(liveRows ?? []) : fromMock();
  const totalSent = items.reduce((s, a) => s + a.sent, 0);
  const totalRevenue = items.reduce((s, a) => s + a.revenue, 0);
  const activeCount = items.filter((a) => a.enabled).length;

  return (
    <AppShell
      title="Automações"
      subtitle="Fluxos automáticos da clínica · impacto financeiro em tempo real"
      actions={
        <button className="inline-flex shadow-lg md:shadow-none items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs-plus font-medium hover:opacity-90">
          <Plus className="size-3.5" /> Nova automação
        </button>
      }
    >
      {/* Impact strip */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-surface to-chart-2/5 p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="size-4 text-primary" />
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            {live ? "Automações configuradas" : "Impacto das automações · últimos 30 dias"}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Impact label="Fluxos ativos" value={`${activeCount} / ${items.length}`} />
          <Impact
            label={live ? "Execuções totais" : "Mensagens disparadas"}
            value={totalSent.toLocaleString("pt-BR")}
          />
          <Impact
            label="Receita gerada"
            value={live ? "—" : `R$ ${totalRevenue.toLocaleString("pt-BR")}`}
            highlight={!live && totalRevenue > 0}
          />
          <Impact label="Horas economizadas" value={live ? "—" : "~84h"} />
        </div>
      </div>

      {/* Category groups */}
      <div className="space-y-5">
        {(Object.keys(CATS) as AutomationCategory[]).map((catId) => {
          const cat = CATS[catId];
          const catItems = items.filter((a) => a.category === catId);
          if (catItems.length === 0) return null;
          const Icon = cat.icon;
          const catActive = catItems.filter((a) => a.enabled).length;
          return (
            <section
              key={catId}
              className="rounded-xl border border-border bg-surface overflow-hidden"
            >
              <div className="px-4 lg:px-5 h-14 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn("size-9 rounded-md flex items-center justify-center", cat.tone)}
                  >
                    <Icon className="size-4.5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold tracking-tight">{cat.label}</div>
                    <div className="text-2xs text-muted-foreground">
                      {catItems.length} fluxos · {catActive} ativo{catActive !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-border">
                {catItems.map((a) => (
                  <div
                    key={a.id}
                    className="px-4 lg:px-5 py-3.5 grid grid-cols-12 gap-3 items-center hover:bg-muted/30"
                  >
                    {/* Name + trigger */}
                    <div className="col-span-12 md:col-span-6">
                      <div className="flex items-center gap-2.5">
                        {a.isLive ? (
                          <ToggleSwitch
                            enabled={a.enabled}
                            pending={pendingIds.has(a.id)}
                            onToggle={() => handleToggle(a.id, !a.enabled)}
                          />
                        ) : (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-3xs font-medium",
                              a.enabled
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <span className="size-1.5 rounded-full bg-current" />
                            {a.enabled ? "ativa" : "pausada"}
                          </span>
                        )}
                        <div className="text-sm-minus font-medium">{a.name}</div>
                      </div>
                      <div className="mt-1 text-2xs text-muted-foreground pl-1">
                        Gatilho: {a.triggerLabel}
                      </div>
                    </div>

                    {/* Metrics */}
                    <Metric
                      label={a.isLive ? "Execuções" : "Enviadas"}
                      value={a.sent.toLocaleString("pt-BR")}
                    />
                    <Metric
                      label="Receita"
                      value={a.revenue ? `R$ ${a.revenue.toLocaleString("pt-BR")}` : "—"}
                      accent={a.revenue > 0}
                    />
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ToggleSwitch({
  enabled,
  pending,
  onToggle,
}: {
  enabled: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-label={enabled ? "Desativar automação" : "Ativar automação"}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        enabled ? "bg-success" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
          enabled ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

function Impact({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 font-display text-2xl lg:text-3xl font-semibold tabular-nums tracking-tight",
          highlight && "text-success",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="col-span-3 md:col-span-2 lg:col-span-2 text-right md:text-left">
      <div className="text-3xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-sm-minus tabular-nums font-medium", accent && "text-success")}>
        {value}
      </div>
    </div>
  );
}
