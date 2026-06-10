import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, LayoutList, Zap, TrendingUp, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { EMPTY_STATES } from "@/lib/empty-states";
import { useEmptyMode } from "@/hooks/use-empty-mode";
import { KpiCard } from "@/components/app/kpi-card";
import { DunningQueue } from "@/components/app/dunning-queue";
import { ChargeTimeline } from "@/components/app/charge-timeline";
import { ChargePreviewModal } from "@/components/app/charge-preview-modal";
import { listCobrancas } from "@/lib/cobrancas.functions";
import { CHARGE_KPIS, type ChargeStatus } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/cobrancas")({
  head: () => ({ meta: [{ title: "Cobranças · DrFlux" }] }),
  component: Cobrancas,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface DunningItem {
  id: string;
  description: string;
  value: number;
  due_date: string;
  daysLate: number;
  nextStage: number | null;
  sentStages: number[];
  paciente?: { id: string; name: string; phone: string } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; tone: string }> = {
  pendente: { label: "Pendente", tone: "bg-zinc-100 text-zinc-600" },
  vencendo: { label: "Vencendo", tone: "bg-yellow-100 text-yellow-700" },
  atrasada: { label: "Atrasada", tone: "bg-red-100 text-red-700" },
  recuperada: { label: "Recuperada", tone: "bg-blue-100 text-blue-700" },
  paga: { label: "Paga", tone: "bg-emerald-100 text-emerald-700" },
  cancelada: { label: "Cancelada", tone: "bg-zinc-100 text-zinc-400" },
};

type ViewTab = "fila" | "lista" | "automacoes";

const VIEW_TABS: { id: ViewTab; label: string; icon: typeof Zap }[] = [
  { id: "fila", label: "Fila de Ação", icon: Zap },
  { id: "lista", label: "Todas", icon: LayoutList },
  { id: "automacoes", label: "Automações", icon: TrendingUp },
];

// ─── Component ────────────────────────────────────────────────────────────────

function Cobrancas() {
  const live = useEmptyMode();
  const [view, setView] = useState<ViewTab>("fila");
  const [filterStatus, setFilterStatus] = useState<ChargeStatus | "all">("all");
  const [selectedItem, setSelectedItem] = useState<DunningItem | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Lista completa de cobranças (tab "Todas")
  const { data: cobrancasData } = useQuery({
    queryKey: ["cobrancas", filterStatus],
    queryFn: () =>
      listCobrancas({ data: { status: filterStatus === "all" ? undefined : filterStatus } }),
    enabled: live && view === "lista",
    staleTime: 30_000,
  });

  const cobrancas = cobrancasData?.rows ?? [];

  // Empty state para demo mode
  if (!live) {
    return (
      <AppShell title="Cobranças" subtitle="Recuperação financeira">
        <EmptyState {...EMPTY_STATES.cobrancas} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Cobranças"
      subtitle="Régua D-3 → D+10 · cobrança automática por WhatsApp"
      actions={
        <button className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-90 transition-opacity">
          <Plus className="size-3.5" /> Nova cobrança
        </button>
      }
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {CHARGE_KPIS.map((k) => (
          <KpiCard key={k.key} k={k} />
        ))}
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1 mb-4 bg-zinc-100 p-1 rounded-xl w-fit">
        {VIEW_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              view === id
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Fila de Ação ── */}
      {view === "fila" && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-zinc-900 text-sm">Fila de Ação</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Cobranças priorizadas que precisam de ação agora
              </p>
            </div>
          </div>
          <div className="p-4">
            <DunningQueue onSend={(item) => setSelectedItem(item as DunningItem)} />
          </div>
        </div>
      )}

      {/* ── Lista completa ── */}
      {view === "lista" && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1 px-3 h-12 border-b border-border overflow-x-auto">
            {(["all", "pendente", "vencendo", "atrasada", "recuperada", "paga"] as const).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "px-2.5 h-7 rounded-md text-[12px] whitespace-nowrap",
                    filterStatus === s
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {s === "all" ? "Todas" : (STATUS_CONFIG[s]?.label ?? s)}
                </button>
              ),
            )}
          </div>

          {cobrancas.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-zinc-400">
              <CheckCircle2 className="size-10 mb-2 text-emerald-400" />
              <p className="text-sm font-medium">Nenhuma cobrança encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cobrancas.map(
                (c: {
                  id: string;
                  description: string;
                  value: number;
                  due_date: string;
                  status: string;
                  paciente?: { id: string; name: string; phone: string } | null;
                  tentativas?: Array<{ stage_day: number; status: string }>;
                }) => {
                  const sc = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pendente;
                  const isExpanded = expandedRow === c.id;
                  const daysLate = Math.max(
                    0,
                    Math.floor(
                      (Date.now() - new Date(c.due_date + "T12:00:00").getTime()) / 86400000,
                    ),
                  );

                  return (
                    <div key={c.id}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer"
                        onClick={() => setExpandedRow(isExpanded ? null : c.id)}
                      >
                        <div className="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center text-sm">
                          <div className="col-span-3 font-medium text-zinc-900 truncate">
                            {c.paciente?.name ?? "—"}
                          </div>
                          <div className="col-span-4 text-zinc-500 truncate text-xs">
                            {c.description}
                          </div>
                          <div className="col-span-2 text-right font-semibold tabular-nums">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(c.value)}
                          </div>
                          <div className="col-span-2 text-xs text-zinc-400 text-center">
                            {new Date(c.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                            {daysLate > 0 && (
                              <span className="ml-1 text-red-500">+{daysLate}d</span>
                            )}
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                sc.tone,
                              )}
                            >
                              {sc.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded timeline */}
                      {isExpanded && (
                        <div className="px-4 pb-4 bg-zinc-50 border-t border-zinc-100">
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide py-3">
                            Histórico da régua
                          </p>
                          <ChargeTimeline cobrancaId={c.id} dueDate={c.due_date} />
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Automações ── */}
      {view === "automacoes" && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold text-zinc-900 mb-1">Régua de Cobrança Automática</h2>
          <p className="text-xs text-zinc-500 mb-5">
            Todas as cobranças ativas seguem automaticamente esta sequência via WhatsApp
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                day: -3,
                label: "D-3 — Aviso preventivo",
                desc: "3 dias antes do vencimento",
                color: "border-blue-200 bg-blue-50",
                badge: "text-blue-700 bg-blue-100",
              },
              {
                day: 0,
                label: "D+0 — Lembrete urgente",
                desc: "No dia do vencimento",
                color: "border-yellow-200 bg-yellow-50",
                badge: "text-yellow-700 bg-yellow-100",
              },
              {
                day: 3,
                label: "D+3 — 1ª cobrança",
                desc: "3 dias de atraso",
                color: "border-orange-200 bg-orange-50",
                badge: "text-orange-700 bg-orange-100",
              },
              {
                day: 7,
                label: "D+7 — 2ª cobrança",
                desc: "7 dias de atraso (urgente)",
                color: "border-red-200 bg-red-50",
                badge: "text-red-700 bg-red-100",
              },
              {
                day: 10,
                label: "D+10 — Última tentativa",
                desc: "10 dias — antes de escalar",
                color: "border-red-300 bg-red-100",
                badge: "text-red-800 bg-red-200",
              },
            ].map((stage) => (
              <div key={stage.day} className={cn("rounded-xl border p-4", stage.color)}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", stage.badge)}>
                    D{stage.day >= 0 ? `+${stage.day}` : stage.day}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> Ativa
                  </span>
                </div>
                <p className="font-semibold text-zinc-900 text-sm">{stage.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{stage.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            <strong>💡 Taxa média de recuperação:</strong> clínicas com régua completa recuperam
            entre <strong>40–65%</strong> das cobranças em atraso nos primeiros 10 dias.
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <ChargePreviewModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </AppShell>
  );
}
