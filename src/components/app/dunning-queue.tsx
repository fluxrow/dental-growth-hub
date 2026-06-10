/**
 * DunningQueue — Fila priorizada de cobranças que precisam de ação
 *
 * Exibe em ordem de urgência:
 *  🔴 Atrasada D+7 / D+10 — escalação
 *  🟠 Atrasada D+3
 *  🟡 Vence hoje D+0
 *  🔵 Vence em 3 dias D-3
 *
 * Props: onSend(cobrancaId, stageDay) → abre ChargePreviewModal
 */

import { useQuery }   from "@tanstack/react-query";
import { getDunningQueue } from "@/lib/cobrancas.functions";
import { useEmptyMode }    from "@/hooks/use-empty-mode";
import { AlertTriangle, Clock, CheckCircle2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DunningItem {
  id: string;
  description: string;
  value: number;
  due_date: string;
  status: string;
  channel: string;
  daysLate: number;
  nextStage: number | null;
  sentStages: number[];
  paciente?: { id: string; name: string; phone: string } | null;
}

interface DunningQueueProps {
  onSend: (item: DunningItem) => void;
  className?: string;
}

// ─── Urgency config ───────────────────────────────────────────────────────────

function getUrgency(item: DunningItem) {
  if (item.daysLate >= 7)  return { label: "Crítico",   color: "text-red-600",    bg: "bg-red-50 border-red-200",    icon: "🔴" };
  if (item.daysLate >= 3)  return { label: "Atrasado",  color: "text-orange-600", bg: "bg-orange-50 border-orange-200", icon: "🟠" };
  if (item.daysLate >= 0)  return { label: "Vence hoje",color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", icon: "🟡" };
  return                          { label: "Preventivo",color: "text-blue-600",   bg: "bg-blue-50 border-blue-200",   icon: "🔵" };
}

function stageDayLabel(day: number | null): string {
  if (day === null) return "—";
  if (day === -3)   return "D-3 (Preventivo)";
  if (day === 0)    return "D+0 (Vencimento)";
  return `D+${day}`;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_QUEUE: DunningItem[] = [
  {
    id: "1", description: "Consulta + Clareamento",   value: 1800, due_date: "2026-06-03",
    status: "atrasada", channel: "whatsapp", daysLate: 7,  nextStage: 7,  sentStages: [-3, 0, 3],
    paciente: { id: "p1", name: "Ana Beatriz Silva",   phone: "11991234567" },
  },
  {
    id: "2", description: "Tratamento Ortodôntico",   value: 3200, due_date: "2026-06-07",
    status: "atrasada", channel: "whatsapp", daysLate: 3,  nextStage: 3,  sentStages: [-3, 0],
    paciente: { id: "p2", name: "Carlos Eduardo Lima", phone: "11987654321" },
  },
  {
    id: "3", description: "Prótese Dentária 2/3",     value: 950,  due_date: "2026-06-10",
    status: "vencendo", channel: "whatsapp", daysLate: 0,  nextStage: 0,  sentStages: [-3],
    paciente: { id: "p3", name: "Mariana Ferreira",    phone: "11999887766" },
  },
  {
    id: "4", description: "Implante Dentário",         value: 4500, due_date: "2026-06-13",
    status: "pendente", channel: "whatsapp", daysLate: -3, nextStage: -3, sentStages: [],
    paciente: { id: "p4", name: "Roberto Nascimento",  phone: "11955443322" },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function DunningQueue({ onSend, className }: DunningQueueProps) {
  const live = useEmptyMode();

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["dunning-queue"],
    queryFn:  () => getDunningQueue(),
    enabled:  live,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const items: DunningItem[] = live ? queue : DEMO_QUEUE;

  const totalAtRisk = items.reduce((sum, i) => sum + i.value, 0);
  const pendingActions = items.filter((i) => i.nextStage !== null).length;

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-zinc-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <CheckCircle2 className="size-12 text-emerald-400 mb-3" />
        <p className="font-medium text-zinc-700">Nenhuma cobrança pendente</p>
        <p className="text-sm text-zinc-400 mt-1">Todas as cobranças estão em dia 🎉</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <AlertTriangle className="size-4 text-orange-500" />
          <span><strong className="text-zinc-900">{pendingActions}</strong> ações necessárias</span>
        </div>
        <div className="text-sm font-semibold text-red-600">
          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalAtRisk)} em risco
        </div>
      </div>

      {/* Queue items */}
      {items.map((item) => {
        const urgency = getUrgency(item);
        const hasNextAction = item.nextStage !== null;
        const valueFormatted = new Intl.NumberFormat("pt-BR", {
          style: "currency", currency: "BRL",
        }).format(item.value);

        return (
          <div
            key={item.id}
            className={cn(
              "rounded-xl border p-4 transition-all",
              urgency.bg,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg leading-none">{urgency.icon}</span>
                  <span className={cn("text-xs font-semibold uppercase tracking-wide", urgency.color)}>
                    {urgency.label}
                  </span>
                  {item.daysLate > 0 && (
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="size-3" /> {item.daysLate}d atraso
                    </span>
                  )}
                </div>

                <p className="font-semibold text-zinc-900 text-sm truncate">
                  {item.paciente?.name ?? "Paciente desconhecido"}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">{item.description}</p>

                {/* Stage progress */}
                <div className="flex items-center gap-1 mt-2">
                  {[-3, 0, 3, 7, 10].map((stage) => (
                    <div
                      key={stage}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        item.sentStages.includes(stage)
                          ? "bg-zinc-400"
                          : stage === item.nextStage
                            ? "bg-orange-400 animate-pulse"
                            : "bg-zinc-200",
                      )}
                      title={stageDayLabel(stage)}
                    />
                  ))}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Próximo: <span className="text-zinc-600 font-medium">{stageDayLabel(item.nextStage)}</span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="font-bold text-zinc-900">{valueFormatted}</span>
                {hasNextAction && (
                  <button
                    onClick={() => onSend(item)}
                    className="flex items-center gap-1.5 rounded-lg bg-white border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-all shadow-sm active:scale-95"
                  >
                    <Send className="size-3" />
                    Enviar
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
