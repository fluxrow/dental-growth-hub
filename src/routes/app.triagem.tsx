import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import {
  Loader2,
  Zap,
  CheckCircle2,
  ChevronRight,
  Phone,
  Clock,
  AlertTriangle,
  Flame,
  ThumbsDown,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { useEmptyMode } from "@/hooks/use-empty-mode";
import { OPPORTUNITIES, OPP_STAGES, type Opportunity, type OppStage } from "@/lib/mock";
import { supabase } from "@/integrations/supabase/client";
import { advanceOportunidade, loseOportunidade } from "@/lib/oportunidades.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/triagem")({
  head: () => ({ meta: [{ title: "Triagem · Dr. Flux" }] }),
  component: Triagem,
});

const ACTIVE_STAGES = [
  "novo",
  "contato",
  "agendada",
  "confirmada",
  "compareceu",
  "tratamento",
] as const;
type ActiveStage = (typeof ACTIVE_STAGES)[number];

function Triagem() {
  const live = useEmptyMode();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profileData } = useProfile(user?.id);
  const clinicId = profileData?.clinic?.id ?? null;

  const { data: liveData, isLoading } = useQuery({
    queryKey: ["triagem_live", clinicId],
    enabled: live && !!clinicId,
    queryFn: async (): Promise<Opportunity[]> => {
      const { data, error } = await supabase
        .from("oportunidades")
        .select("id, name, stage, source, value, next_action, stage_changed_at, phone")
        .in("stage", ACTIVE_STAGES as unknown as ActiveStage[])
        .order("stage_changed_at", { ascending: true })
        .limit(10);
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

  const rawItems: Opportunity[] = live
    ? (liveData ?? [])
    : OPPORTUNITIES.filter((o) => (ACTIVE_STAGES as readonly string[]).includes(o.stage));

  // Sort by urgency (most days stuck first) and take top 5
  const urgent = [...rawItems].sort((a, b) => b.daysInStage - a.daysInStage).slice(0, 5);

  const advance = async (id: string) => {
    const opp = urgent.find((o) => o.id === id);
    const idx = opp ? OPP_STAGES.findIndex((s) => s.id === opp.stage) : -1;
    const next = idx >= 0 ? OPP_STAGES[idx + 1] : undefined;
    if (!next) return;

    if (!live) {
      toast.success("Etapa avançada (demo)");
      return;
    }
    try {
      await advanceOportunidade({ data: { id, nextStage: next.id } });
      toast.success(`Avançado para ${next.label}`);
      queryClient.invalidateQueries({ queryKey: ["triagem_live"] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao avançar");
    }
  };

  const lose = async (id: string) => {
    if (!live) {
      toast("Marcado como perdido (demo)");
      return;
    }
    try {
      await loseOportunidade({ data: { id } });
      toast("Oportunidade removida do funil");
      queryClient.invalidateQueries({ queryKey: ["triagem_live"] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    }
  };

  if (live && isLoading) {
    return (
      <AppShell title="Triagem do dia" subtitle="Ações mais urgentes agora">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Triagem do dia" subtitle="Foco total — as oportunidades que não podem esperar">
      {urgent.length === 0 ? (
        // Zero urgency — celebrate!
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="size-16 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <div>
            <h2 className="text-[18px] font-semibold mb-1">Tudo em dia! 🎉</h2>
            <p className="text-sm-minus text-muted-foreground max-w-xs">
              Nenhuma oportunidade parada. Ótimo trabalho.
            </p>
          </div>
          <Link
            to="/app/oportunidades"
            className="mt-2 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm-minus font-medium hover:opacity-90"
          >
            Ver pipeline completo <ChevronRight className="size-4" />
          </Link>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Header bar */}
          <div className="flex items-center gap-2.5 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 mb-5">
            <Zap className="size-4 text-warning-foreground shrink-0" />
            <p className="text-xs-plus text-warning-foreground font-medium">
              {urgent.length} oportunidade{urgent.length !== 1 ? "s" : ""} precisam de ação agora —
              ordena das mais paradas às mais recentes
            </p>
          </div>

          {urgent.map((o, rank) => {
            const stageObj = OPP_STAGES.find((s) => s.id === o.stage);
            const nextStage = OPP_STAGES[OPP_STAGES.findIndex((s) => s.id === o.stage) + 1];
            const { urgencyIcon, urgencyLabel, urgencyColor } = getUrgency(o.daysInStage);

            return (
              <div
                key={o.id}
                className={cn(
                  "rounded-xl border bg-surface p-4 transition-shadow hover:shadow-sm",
                  o.daysInStage >= 10
                    ? "border-destructive/50"
                    : o.daysInStage >= 6
                      ? "border-orange-400/50"
                      : o.daysInStage >= 3
                        ? "border-amber-400/40"
                        : "border-border",
                )}
              >
                {/* Row 1: rank + name + value */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="size-6 rounded-full bg-muted text-muted-foreground text-2xs font-bold flex items-center justify-center shrink-0">
                      {rank + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{o.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-3xs font-medium",
                            stageObj?.tone ?? "bg-muted text-muted-foreground",
                          )}
                        >
                          {stageObj?.label ?? o.stage}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-2xs font-medium",
                            urgencyColor,
                          )}
                        >
                          {urgencyIcon}
                          {urgencyLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tabular-nums">
                      R$ {o.value.toLocaleString("pt-BR")}
                    </div>
                    <div className="flex items-center gap-1 text-2xs text-muted-foreground mt-0.5 justify-end">
                      <Clock className="size-3" />
                      {o.daysInStage}d parado
                    </div>
                  </div>
                </div>

                {/* Row 2: next action */}
                <p className="text-xs text-muted-foreground mb-3 pl-8">📌 {o.nextAction}</p>

                {/* Row 3: action buttons */}
                <div className="flex items-center gap-2 pl-8">
                  {nextStage && (
                    <button
                      onClick={() => advance(o.id)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      <ChevronRight className="size-3.5" />
                      {nextStage.label}
                    </button>
                  )}
                  {o.phone && (
                    <a
                      href={`tel:${o.phone.replace(/\D/g, "")}`}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-input bg-background text-xs font-medium hover:bg-muted transition-colors"
                    >
                      <Phone className="size-3.5" />
                      Ligar
                    </a>
                  )}
                  <button
                    onClick={() => lose(o.id)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-input bg-background text-xs text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors ml-auto"
                  >
                    <ThumbsDown className="size-3.5" />
                    Perdido
                  </button>
                </div>
              </div>
            );
          })}

          <div className="pt-2 text-center">
            <Link
              to="/app/oportunidades"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Ver pipeline completo <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function getUrgency(days: number): {
  urgencyIcon: React.ReactNode;
  urgencyLabel: string;
  urgencyColor: string;
} {
  if (days >= 10)
    return {
      urgencyIcon: <Flame className="size-3" />,
      urgencyLabel: "Frio — urgente",
      urgencyColor: "text-destructive",
    };
  if (days >= 6)
    return {
      urgencyIcon: <AlertTriangle className="size-3" />,
      urgencyLabel: "Atrasado",
      urgencyColor: "text-orange-500",
    };
  if (days >= 3)
    return {
      urgencyIcon: <Clock className="size-3" />,
      urgencyLabel: "Atenção",
      urgencyColor: "text-amber-500",
    };
  return {
    urgencyIcon: null,
    urgencyLabel: "Normal",
    urgencyColor: "text-muted-foreground",
  };
}
