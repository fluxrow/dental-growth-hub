/**
 * ChargeTimeline — Linha do tempo visual da régua D-3 a D+10
 *
 * Exibe cada stage com status: enviado / entregue / lido / pendente / falhou
 * Mostra preview da mensagem enviada em cada stage
 */

import { useQuery } from "@tanstack/react-query";
import { getChargeTimeline } from "@/lib/cobrancas.functions";
import { Check, Eye, AlertCircle, Clock, Send, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tentativa {
  id: string;
  stage_day: number;
  channel: string;
  status: "enviado" | "entregue" | "lido" | "clicado" | "falhou";
  sent_at: string;
  message_preview?: string;
  wa_message_id?: string;
}

interface ChargeTimelineProps {
  cobrancaId: string;
  dueDate: string;
  className?: string;
}

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES = [
  {
    day: -3,
    label: "D-3",
    description: "Aviso preventivo",
    color: "text-blue-600",
    ring: "ring-blue-300",
    bg: "bg-blue-50",
  },
  {
    day: 0,
    label: "D+0",
    description: "Vencimento",
    color: "text-yellow-600",
    ring: "ring-yellow-300",
    bg: "bg-yellow-50",
  },
  {
    day: 3,
    label: "D+3",
    description: "1ª cobrança",
    color: "text-orange-500",
    ring: "ring-orange-300",
    bg: "bg-orange-50",
  },
  {
    day: 7,
    label: "D+7",
    description: "2ª cobrança",
    color: "text-red-500",
    ring: "ring-red-300",
    bg: "bg-red-50",
  },
  {
    day: 10,
    label: "D+10",
    description: "Última tentativa",
    color: "text-red-700",
    ring: "ring-red-400",
    bg: "bg-red-100",
  },
];

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "lido":
    case "clicado":
      return <Eye className="size-3.5 text-emerald-500" />;
    case "entregue":
      return <Check className="size-3.5 text-blue-500" />;
    case "enviado":
      return <Send className="size-3.5 text-zinc-500" />;
    case "falhou":
      return <AlertCircle className="size-3.5 text-red-500" />;
    default:
      return <Clock className="size-3.5 text-zinc-300" />;
  }
}

function statusLabel(status: string) {
  return (
    {
      lido: "Lido",
      clicado: "Clicado",
      entregue: "Entregue",
      enviado: "Enviado",
      falhou: "Falhou",
    }[status] ?? status
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChargeTimeline({ cobrancaId, dueDate, className }: ChargeTimelineProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: tentativas = [], isLoading } = useQuery({
    queryKey: ["charge-timeline", cobrancaId],
    queryFn: () => getChargeTimeline({ data: { cobrancaId } }),
    staleTime: 30_000,
  });

  const tentativaByStage = new Map<number, Tentativa>(
    tentativas.map((t: Tentativa) => [t.stage_day, t]),
  );

  // Calcular daysLate com base no due_date
  const daysLate = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);

  if (isLoading) {
    return (
      <div className={cn("flex gap-3 overflow-x-auto pb-2", className)}>
        {STAGES.map((s) => (
          <div key={s.day} className="h-24 w-28 shrink-0 rounded-xl bg-zinc-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Timeline rail */}
      <div className="flex items-start gap-0">
        {STAGES.map((stage, idx) => {
          const tentativa = tentativaByStage.get(stage.day);
          const isPast = daysLate >= stage.day;
          const isCurrent =
            !tentativa &&
            isPast &&
            (idx === STAGES.length - 1 ||
              (daysLate >= stage.day && daysLate < STAGES[idx + 1].day));
          const isExpanded = expanded === stage.day;

          return (
            <div key={stage.day} className="flex-1 min-w-0">
              {/* Connector line */}
              <div className="flex items-center">
                <div
                  className={cn(
                    "h-0.5 w-full transition-colors",
                    idx === 0
                      ? "opacity-0"
                      : tentativa
                        ? "bg-zinc-400"
                        : isPast
                          ? "bg-zinc-200"
                          : "bg-zinc-100",
                  )}
                />
                {/* Node */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : stage.day)}
                  className={cn(
                    "shrink-0 size-8 rounded-full border-2 flex items-center justify-center transition-all ring-2",
                    tentativa
                      ? cn("border-zinc-400 bg-white", stage.ring)
                      : isCurrent
                        ? cn("border-orange-400 bg-orange-50 ring-orange-200 animate-pulse")
                        : isPast
                          ? "border-zinc-200 bg-zinc-50 ring-transparent"
                          : "border-zinc-100 bg-white ring-transparent",
                  )}
                >
                  {tentativa ? (
                    <StatusIcon status={tentativa.status} />
                  ) : isCurrent ? (
                    <Clock className="size-3.5 text-orange-500" />
                  ) : (
                    <div
                      className={cn("size-2 rounded-full", isPast ? "bg-zinc-300" : "bg-zinc-100")}
                    />
                  )}
                </button>
                <div
                  className={cn(
                    "h-0.5 w-full transition-colors",
                    idx === STAGES.length - 1
                      ? "opacity-0"
                      : tentativa
                        ? "bg-zinc-400"
                        : "bg-zinc-100",
                  )}
                />
              </div>

              {/* Label */}
              <div className="flex flex-col items-center mt-1.5 px-1">
                <span
                  className={cn("text-xs font-bold", tentativa ? stage.color : "text-zinc-400")}
                >
                  {stage.label}
                </span>
                <span className="text-3xs text-zinc-400 text-center leading-tight">
                  {stage.description}
                </span>
                {tentativa && (
                  <span className="text-3xs text-zinc-500 mt-0.5 flex items-center gap-0.5">
                    <StatusIcon status={tentativa.status} />
                    {statusLabel(tentativa.status)}
                  </span>
                )}
              </div>

              {/* Expanded preview */}
              {isExpanded && tentativa?.message_preview && (
                <div className={cn("mt-2 rounded-lg border p-2 text-xs text-zinc-600", stage.bg)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Mensagem enviada</span>
                    <button onClick={() => setExpanded(null)}>
                      <ChevronDown className="size-3 rotate-180" />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap line-clamp-4">{tentativa.message_preview}</p>
                  <p className="text-zinc-400 mt-1">
                    {new Date(tentativa.sent_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
