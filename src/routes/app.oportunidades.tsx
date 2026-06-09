import { createFileRoute } from "@tanstack/react-router";
import { Plus, Filter, LayoutGrid, Rows3 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { OPP_STAGES, OPPORTUNITIES } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/oportunidades")({
  head: () => ({ meta: [{ title: "Oportunidades · DentalFlux" }] }),
  component: Oportunidades,
});

function Oportunidades() {
  return (
    <AppShell
      title="Oportunidades"
      subtitle="Pipeline completo · jornada Lead → Paciente Ativo"
      actions={
        <button className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-90">
          <Plus className="size-3.5" /> Nova oportunidade
        </button>
      }
      flush
    >
      <div className="flex items-center justify-between border-b border-border bg-background px-4 lg:px-6 h-12">
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-input bg-surface text-[12px]">
            <Filter className="size-3.5" /> Filtros
          </button>
          <button className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] text-muted-foreground hover:bg-muted">Origem: todas</button>
          <button className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] text-muted-foreground hover:bg-muted">Responsável: todos</button>
        </div>
        <div className="flex h-7 rounded-md border border-input bg-surface overflow-hidden">
          <button className="px-2 bg-primary/10 text-primary inline-flex items-center gap-1 text-[11.5px]"><LayoutGrid className="size-3.5"/> Kanban</button>
          <button className="px-2 text-muted-foreground inline-flex items-center gap-1 text-[11.5px] border-l border-input"><Rows3 className="size-3.5"/> Tabela</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-3 p-4 lg:p-6 min-w-max">
          {OPP_STAGES.map((stage) => {
            const items = OPPORTUNITIES.filter((o) => o.stage === stage.id);
            const total = items.reduce((s, o) => s + o.value, 0);
            return (
              <div key={stage.id} className="w-[280px] shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", stage.tone)}>
                      <span className="size-1.5 rounded-full bg-current" />
                      {stage.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{items.length}</span>
                  </div>
                </div>
                <div className="text-[10.5px] text-muted-foreground mb-2 px-1 tabular-nums">
                  R$ {total.toLocaleString("pt-BR")}
                </div>
                <div className="space-y-2">
                  {items.map((o) => (
                    <div key={o.id} className="rounded-lg border border-border bg-surface p-3 hover:shadow-[0_4px_12px_-6px_oklch(0.55_0.2_275/0.15)] transition-shadow cursor-pointer">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="text-[13px] font-medium truncate">{o.name}</div>
                        <div className="text-[11px] font-semibold tabular-nums text-foreground/80">
                          R$ {o.value.toLocaleString("pt-BR")}
                        </div>
                      </div>
                      <div className="text-[11.5px] text-muted-foreground truncate mb-2">{o.nextAction}</div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10.5px] inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-foreground/70">
                          {o.source}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10.5px] text-muted-foreground tabular-nums">{o.daysInStage}d</span>
                          <div className="size-5 rounded-full bg-gradient-to-br from-primary to-chart-2 text-primary-foreground text-[9px] font-semibold flex items-center justify-center">
                            {o.owner.split(" ").map(n => n[0]).slice(0,1)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button className="w-full rounded-lg border border-dashed border-border text-[12px] text-muted-foreground py-2 hover:border-primary/40 hover:text-primary">
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
