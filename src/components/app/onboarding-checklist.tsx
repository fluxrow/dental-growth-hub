import { useState, useCallback, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Step definitions ─────────────────────────────────────────────────────────

type Step = {
  id: string;
  label: string;
  desc: string;
  emoji: string;
  href?: string;
};

const STEPS: Step[] = [
  {
    id: "account",
    label: "Conta criada",
    desc: "Bem-vindo ao DentalFlux!",
    emoji: "🎉",
  },
  {
    id: "profile",
    label: "Perfil da clínica",
    desc: "Nome, cidade e informações básicas",
    emoji: "🏥",
    href: "/app/configuracoes",
  },
  {
    id: "patient",
    label: "Primeiro paciente",
    desc: "Cadastre um paciente para começar",
    emoji: "👤",
    href: "/app/pacientes",
  },
  {
    id: "opportunity",
    label: "Primeira oportunidade",
    desc: "Adicione um lead ao funil de vendas",
    emoji: "🎯",
    href: "/app/oportunidades",
  },
  {
    id: "automation",
    label: "Automação ativa",
    desc: "Ative pelo menos uma automação",
    emoji: "⚡",
    href: "/app/automacoes",
  },
  {
    id: "whatsapp",
    label: "WhatsApp conectado",
    desc: "Conecte seu número de negócios",
    emoji: "💬",
    href: "/app/configuracoes",
  },
  {
    id: "team",
    label: "Equipe convidada",
    desc: "Convide recepcionista ou dentista",
    emoji: "👥",
    href: "/app/configuracoes",
  },
  {
    id: "diagnosis",
    label: "Diagnóstico realizado",
    desc: "Veja a saúde completa da clínica",
    emoji: "📊",
    href: "/app/diagnostico",
  },
];

// ─── localStorage helpers (userId-namespaced, SSR-safe) ──────────────────────

function lsKey(userId: string) { return `df_onboarding_v1_${userId}`; }
function lsDismiss(userId: string) { return `df_onboarding_dismissed_${userId}`; }

function loadDone(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set(["account"]); // SSR
  try {
    const raw = localStorage.getItem(lsKey(userId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : ["account"]);
  } catch {
    return new Set(["account"]);
  }
}

function saveDone(userId: string, done: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(lsKey(userId), JSON.stringify([...done]));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingChecklist() {
  const { user } = useAuth();
  const userId = user?.id ?? "anonymous";

  // Deferred load from localStorage (client-only, userId-namespaced)
  const [done, setDone] = useState<Set<string>>(() => new Set(["account"]));
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDone(loadDone(userId));
    setDismissed(localStorage.getItem(lsDismiss(userId)) === "1");
  }, [userId]);

  const completedCount = done.size;
  const total = STEPS.length;
  const pct = Math.round((completedCount / total) * 100);
  const allDone = completedCount >= total;

  const toggle = useCallback(
    (id: string) => {
      setDone((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          if (id === "account") return prev; // can't unmark first step
          next.delete(id);
        } else {
          next.add(id);
        }
        saveDone(userId, next);
        return next;
      });
    },
    [userId],
  );

  const dismiss = () => {
    if (typeof window !== "undefined") localStorage.setItem(lsDismiss(userId), "1");
    setDismissed(true);
  };

  if (dismissed || allDone) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-surface to-chart-2/5 mb-5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Rocket className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold tracking-tight">
              Configure sua clínica
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {completedCount}/{total}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="size-7 rounded-md hover:bg-muted text-muted-foreground flex items-center justify-center"
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
          <button
            onClick={dismiss}
            title="Dispensar — posso retomar depois"
            className="size-7 rounded-md hover:bg-muted text-muted-foreground flex items-center justify-center"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Steps list */}
      {expanded && (
        <div className="border-t border-border/50 divide-y divide-border/50">
          {STEPS.map((step) => {
            const isDone = done.has(step.id);
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 transition-colors",
                  isDone ? "opacity-60" : "hover:bg-muted/30",
                )}
              >
                <button
                  onClick={() => toggle(step.id)}
                  className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                >
                  {isDone ? (
                    <CheckCircle2 className="size-4.5 text-success" />
                  ) : (
                    <Circle className="size-4.5" />
                  )}
                </button>
                <span className="text-base leading-none">{step.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-[13px] font-medium",
                      isDone && "line-through text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{step.desc}</div>
                </div>
                {step.href && !isDone && (
                  <Link
                    to={step.href as never}
                    className="shrink-0 inline-flex items-center gap-1 text-[11.5px] text-primary font-medium hover:underline"
                  >
                    Ir <ExternalLink className="size-3" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
