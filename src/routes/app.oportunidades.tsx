import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Filter, LayoutGrid, Rows3, Loader2 } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { EMPTY_STATES } from "@/lib/empty-states";
import { useEmptyMode } from "@/hooks/use-empty-mode";
import { OpportunityCardActions } from "@/components/app/opportunity-card-actions";
import { OPP_STAGES, OPPORTUNITIES, type Opportunity, type OppStage } from "@/lib/mock";
import { supabase } from "@/integrations/supabase/client";
import { advanceOportunidade, loseOportunidade } from "@/lib/oportunidades.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/oportunidades")({
  head: () => ({ meta: [{ title: "Oportunidades · DentalFlux" }] }),
  component: Oportunidades,
});

function Oportunidades() {
  const live = useEmptyMode();

  const { data: liveData, isLoading } = useQuery({
    queryKey: ["oportunidades"],
    enabled: live,
    queryFn: async (): Promise<Opportunity[]> => {
      const { data, error } = await supabase
        .from("oportunidades")
        .select("id, name, stage, source, value, next_action, stage_changed_at, phone")
        .neq("stage", "perdida")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((o) => ({
        id: o.id,
        name: o.name,
        stage: o.stage as OppStage,
        source: (o.source ?? "Site") as Opportunity["source"],
        value: Number(o.value ?? 0),
        owner: "Você",
        nextAction: o.next_action ?? "—",
        daysInStage: o.stage_changed_at
          ? Math.max(
              0,
              Math.floor((Date.now() - new Date(o.stage_changed_at).getTime()) / 86400000),
            )
          : 0,
        phone: o.phone ?? "",
      }));
    },
  });

  const queryClient = useQueryClient();

  const [items, setItems] = useState<Opportunity[]>([]);
  useEffect(() => {
    setItems(live ? (liveData ?? []) : OPPORTUNITIES);
  }, [live, liveData]);

  // Drag-and-drop entre colunas (HTML5 DnD — desktop/tablet com mouse ou trackpad)
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<OppStage | null>(null);

  const moveTo = (id: string, target: OppStage): void => {
    const opp = items.find((o) => o.id === id);
    if (!opp || opp.stage === target) return;
    const prevStage = opp.stage;
    const prevDays = opp.daysInStage;

    // Optimistic local update
    setItems((curr) =>
      curr.map((o) => (o.id === id ? { ...o, stage: target, daysInStage: 0 } : o)),
    );

    if (!live) return;

    advanceOportunidade({ data: { id, nextStage: target } })
      .then(() => queryClient.invalidateQueries({ queryKey: ["oportunidades"] }))
      .catch((err: unknown) => {
        // Reverte o optimistic update — o card não pode ficar na coluna errada
        setItems((curr) =>
          curr.map((o) => (o.id === id ? { ...o, stage: prevStage, daysInStage: prevDays } : o)),
        );
        toast.error(err instanceof Error ? err.message : "Erro ao mover oportunidade");
      });
  };

  const advance = (id: string): void => {
    // Find next stage before optimistic update (reads current items state)
    const opp = items.find((o) => o.id === id);
    const idx = opp ? OPP_STAGES.findIndex((s) => s.id === opp.stage) : -1;
    const next = idx >= 0 ? OPP_STAGES[idx + 1] : undefined;

    // Optimistic local update
    setItems((curr) =>
      curr.map((o) => {
        if (o.id !== id) return o;
        const i = OPP_STAGES.findIndex((s) => s.id === o.stage);
        const n = OPP_STAGES[i + 1];
        return n ? { ...o, stage: n.id as OppStage, daysInStage: 0 } : o;
      }),
    );

    if (!live || !next) return;

    // Persist to Supabase and confirm with a refetch
    advanceOportunidade({ data: { id, nextStage: next.id } })
      .then(() => queryClient.invalidateQueries({ queryKey: ["oportunidades"] }))
      .catch((err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Erro ao avançar etapa"),
      );
  };

  const lose = (id: string): void => {
    // Optimistic local update
    setItems((curr) => curr.filter((o) => o.id !== id));

    if (!live) return;

    // Persist to Supabase and confirm with a refetch
    loseOportunidade({ data: { id } })
      .then(() => queryClient.invalidateQueries({ queryKey: ["oportunidades"] }))
      .catch((err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Erro ao marcar como perdida"),
      );
  };

  const byStage = useMemo(() => {
    const m = new Map<OppStage, Opportunity[]>();
    OPP_STAGES.forEach((s) => m.set(s.id, []));
    items.forEach((o) => m.get(o.stage)?.push(o));
    return m;
  }, [items]);

  if (live && isLoading) {
    return (
      <AppShell title="Oportunidades">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (items.length === 0) {
    return (
      <AppShell title="Oportunidades" subtitle="Funil de pacientes em potencial">
        <EmptyState {...EMPTY_STATES.oportunidades} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Oportunidades"
      subtitle="Pipeline completo · jornada Lead → Paciente Ativo"
      actions={
        <button className="inline-flex shadow-lg md:shadow-none items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs-plus font-medium hover:opacity-90">
          <Plus className="size-3.5" /> Nova oportunidade
        </button>
      }
      flush
    >
      <div className="flex items-center justify-between border-b border-border bg-background px-4 lg:px-6 h-12 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <button className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-input bg-surface text-xs">
            <Filter className="size-3.5" /> Filtros
          </button>
          <button className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:bg-muted">
            Origem: todas
          </button>
          <button className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:bg-muted">
            Responsável: todos
          </button>
        </div>
        <div className="flex h-7 rounded-md border border-input bg-surface overflow-hidden">
          <button className="px-2 bg-primary/10 text-primary inline-flex items-center gap-1 text-2xs">
            <LayoutGrid className="size-3.5" /> Kanban
          </button>
          <button className="px-2 text-muted-foreground inline-flex items-center gap-1 text-2xs border-l border-input">
            <Rows3 className="size-3.5" /> Tabela
          </button>
        </div>
      </div>

      <div className="overflow-x-auto snap-x snap-mandatory md:snap-none">
        {/* Colunas fixas com scroll horizontal (snap por coluna no mobile); em 2xl esticam */}
        <div className="flex gap-3 p-4 lg:p-6 min-w-max 2xl:min-w-0">
          {OPP_STAGES.map((stage) => {
            const stageItems = byStage.get(stage.id) ?? [];
            const total = stageItems.reduce((s, o) => s + o.value, 0);
            return (
              <div
                key={stage.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverStage(stage.id);
                }}
                onDragLeave={(e) => {
                  // Só limpa quando sai da coluna de fato (não ao passar por filhos)
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStage(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || dragId;
                  if (id) moveTo(id, stage.id);
                  setDragId(null);
                  setDragOverStage(null);
                }}
                className={cn(
                  "w-[280px] shrink-0 snap-start 2xl:w-auto 2xl:flex-1 2xl:min-w-[260px] rounded-lg transition-colors",
                  dragOverStage === stage.id && dragId && "bg-primary/5 ring-2 ring-primary/30",
                )}
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-medium",
                        stage.tone,
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {stage.label}
                    </span>
                    <span className="text-2xs text-muted-foreground tabular-nums">
                      {stageItems.length}
                    </span>
                  </div>
                </div>
                <div className="text-3xs text-muted-foreground mb-2 px-1 tabular-nums">
                  R$ {total.toLocaleString("pt-BR")}
                </div>
                <div className="space-y-2">
                  {stageItems.map((o) => {
                    // Heat map: border color scales with staleness
                    const urgencyBorder =
                      o.daysInStage >= 10
                        ? "border-destructive/60"
                        : o.daysInStage >= 6
                          ? "border-orange-400/60"
                          : o.daysInStage >= 3
                            ? "border-amber-400/40"
                            : "border-border";
                    const urgencyLabel =
                      o.daysInStage >= 10 ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 text-destructive px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide">
                          ● Frio
                        </span>
                      ) : o.daysInStage >= 6 ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/10 text-orange-600 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide">
                          Atrasado
                        </span>
                      ) : null;
                    return (
                      <div
                        key={o.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", o.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDragId(o.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setDragOverStage(null);
                        }}
                        className={cn(
                          "group rounded-lg border bg-surface p-3 hover:shadow-[0_4px_12px_-6px_oklch(0.55_0.2_275/0.15)] transition-shadow cursor-grab active:cursor-grabbing",
                          dragId === o.id && "opacity-50",
                          urgencyBorder,
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="text-sm-minus font-medium truncate">{o.name}</div>
                          <div className="flex items-center gap-1">
                            <div className="text-2xs font-semibold tabular-nums text-foreground/80">
                              R$ {o.value.toLocaleString("pt-BR")}
                            </div>
                            <OpportunityCardActions opp={o} onAdvance={advance} onLose={lose} />
                          </div>
                        </div>
                        <div className="text-2xs text-muted-foreground truncate mb-2">
                          {o.nextAction}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-3xs inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-foreground/70">
                              {o.source}
                            </span>
                            {urgencyLabel}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-3xs text-muted-foreground tabular-nums">
                              {o.daysInStage}d
                            </span>
                            <div className="size-5 rounded-full bg-gradient-to-br from-primary to-chart-2 text-primary-foreground text-[9px] font-semibold flex items-center justify-center">
                              {o.owner
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 1)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <button className="w-full rounded-lg border border-dashed border-border text-xs text-muted-foreground py-2 hover:border-primary/40 hover:text-primary">
                    + Adicionar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
