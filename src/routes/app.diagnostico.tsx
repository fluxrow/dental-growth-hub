import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Target,
  Star,
  ArrowRight,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { runClinicDiagnostic } from "@/lib/diagnostics.functions";
import type { DiagnosticSnapshot } from "@/lib/types/migration";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/diagnostico")({
  head: () => ({ meta: [{ title: "Diagnóstico · DentalFlux" }] }),
  component: DiagnosticoPage,
});

function fmt(n: number) {
  return Number(n ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function DiagnosticoPage() {
  const { user } = useAuth();
  const { data: profileData } = useProfile(user?.id);
  const clinicId = profileData?.clinic?.id ?? null;
  const [running, setRunning] = useState(false);

  const diagQuery = useQuery({
    queryKey: ["clinic_diagnostics", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_diagnostics")
        .select("*")
        .order("snapshot_at", { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as DiagnosticSnapshot | null;
    },
  });

  const runDiagnostic = async () => {
    if (!clinicId) return;
    setRunning(true);
    try {
      await runClinicDiagnostic({ data: { clinicId } });
      toast.success("Diagnóstico atualizado");
      diagQuery.refetch();
    } catch (e) {
      toast.error("Erro ao executar diagnóstico", { description: (e as Error).message });
    } finally {
      setRunning(false);
    }
  };

  const diag = diagQuery.data;
  const actions = Array.isArray(diag?.recommended_actions) ? diag.recommended_actions : [];
  const urgentes = actions.filter((a) => a.priority === "urgente");
  const semana = actions.filter((a) => a.priority === "esta_semana");
  const mes = actions.filter((a) => a.priority === "este_mes");

  return (
    <AppShell
      title="Diagnóstico da clínica"
      subtitle="Potencial recuperável e saúde operacional"
      actions={
        <Button onClick={runDiagnostic} disabled={running} variant="outline" size="sm">
          {running ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="size-4 mr-2" />
          )}
          Recalcular
        </Button>
      }
    >
      {diagQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : !diag ? (
        <NoDiagnostic onRun={runDiagnostic} running={running} />
      ) : (
        <div className="space-y-6">
          {/* Hero: health score + recoverable */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HealthScoreCard score={diag.health_score} />
            <RecoverableCard total={diag.total_recoverable} />
          </div>

          {/* Breakdown: 3 fontes principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BreakdownCard
              icon={Users}
              color="bg-destructive/10 text-destructive"
              label="Pacientes inativos"
              count={diag.inactive_patients}
              value={diag.inactive_recovery_est}
              desc="20% de taxa de reativação estimada"
            />
            <BreakdownCard
              icon={Wallet}
              color="bg-amber-500/10 text-amber-600"
              label="Cobranças pendentes"
              count={diag.pending_charges_count}
              value={diag.pending_charges_value}
              desc="Valor total em aberto"
            />
            <BreakdownCard
              icon={Target}
              color="bg-primary/10 text-primary"
              label="Oportunidades paradas"
              count={diag.stalled_opps_count}
              value={diag.stalled_opps_value}
              desc={
                diag.avg_days_stalled
                  ? `Média de ${Math.round(diag.avg_days_stalled)} dias paradas`
                  : "Leads sem movimento"
              }
            />
          </div>

          {/* Score components */}
          <ScoreBreakdown diag={diag} />

          {/* Avaliações Google */}
          {diag.review_eligible_count > 0 && (
            <div className="rounded-xl border border-border bg-surface p-5 flex items-center gap-4">
              <div className="size-10 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                <Star className="size-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {diag.review_eligible_count} pacientes elegíveis para avaliação Google
                </p>
                <p className="text-xs text-muted-foreground">
                  {diag.current_avg_rating != null
                    ? `Nota atual: ${diag.current_avg_rating}★ · `
                    : ""}
                  {diag.reviews_last_30d} avaliações recebidas nos últimos 30 dias
                </p>
              </div>
              <Link to="/app/avaliacoes">
                <Button size="sm" variant="outline">
                  Solicitar avaliações <ArrowRight className="size-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          )}

          {/* Ações recomendadas */}
          {actions.length > 0 && (
            <div className="rounded-xl border border-border bg-surface">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Ações recomendadas</h3>
                <span className="ml-auto text-2xs text-muted-foreground">
                  {actions.length} ações · potencial{" "}
                  {fmt(actions.reduce((s, a) => s + a.estimated_value, 0))}
                </span>
              </div>
              <div className="divide-y divide-border">
                {urgentes.length > 0 && (
                  <ActionGroup
                    label="Urgente — hoje"
                    icon={AlertTriangle}
                    cls="text-destructive"
                    items={urgentes}
                  />
                )}
                {semana.length > 0 && (
                  <ActionGroup
                    label="Esta semana"
                    icon={Clock}
                    cls="text-amber-600"
                    items={semana}
                  />
                )}
                {mes.length > 0 && (
                  <ActionGroup label="Este mês" icon={TrendingUp} cls="text-primary" items={mes} />
                )}
              </div>
            </div>
          )}

          <div className="text-2xs text-muted-foreground text-right">
            Diagnóstico gerado em {new Date(diag.snapshot_at).toLocaleString("pt-BR")}
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ---- sub-components ----

function NoDiagnostic({ onRun, running }: { onRun: () => void; running: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-16 text-center max-w-lg mx-auto mt-8">
      <div className="size-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
        <Sparkles className="size-7" />
      </div>
      <h3 className="mt-5 text-[17px] font-semibold">Nenhum diagnóstico ainda</h3>
      <p className="mt-2 text-sm-minus text-muted-foreground">
        Importe sua base de pacientes ou clique abaixo para gerar o primeiro diagnóstico.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/app/importar">
          <Button variant="outline">Importar pacientes</Button>
        </Link>
        <Button onClick={onRun} disabled={running}>
          {running ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="size-4 mr-2" />
          )}
          Gerar diagnóstico
        </Button>
      </div>
    </div>
  );
}

function HealthScoreCard({ score }: { score: number }) {
  const color =
    score >= 80
      ? {
          ring: "stroke-success",
          label: "Saudável",
          badge: "bg-success/15 text-success border-success/30",
        }
      : score >= 60
        ? {
            ring: "stroke-amber-500",
            label: "Atenção",
            badge: "bg-amber-500/15 text-amber-600 border-amber-500/30",
          }
        : score >= 40
          ? {
              ring: "stroke-orange-500",
              label: "Risco",
              badge: "bg-orange-500/15 text-orange-600 border-orange-500/30",
            }
          : {
              ring: "stroke-destructive",
              label: "Crítico",
              badge: "bg-destructive/15 text-destructive border-destructive/30",
            };

  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 flex flex-col items-center justify-center gap-0">
      <h3 className="text-sm-minus font-semibold text-muted-foreground mb-4">
        Clinic Health Score
      </h3>
      <div className="relative size-36">
        <svg className="size-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-muted/30"
          />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={color.ring}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[36px] font-bold tabular-nums leading-none">{score}</span>
          <span className="text-2xs text-muted-foreground mt-0.5">/ 100</span>
        </div>
      </div>
      <Badge variant="outline" className={cn("mt-4 border", color.badge)}>
        {color.label}
      </Badge>
    </div>
  );
}

function RecoverableCard({ total }: { total: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 flex flex-col items-center justify-center">
      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        <TrendingUp className="size-5" />
      </div>
      <h3 className="mt-4 text-sm-minus font-semibold text-muted-foreground">
        Potencial total recuperável
      </h3>
      <div className="mt-2 text-[42px] font-bold tabular-nums tracking-tight text-primary leading-none">
        {fmt(Number(total ?? 0))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground text-center max-w-xs">
        Estimativa conservadora baseada em inativos, cobranças e oportunidades paradas
      </p>
      <Link to="/app/pacientes" className="mt-4">
        <Button size="sm">
          Ver pacientes inativos <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </Link>
    </div>
  );
}

function BreakdownCard({
  icon: Icon,
  color,
  label,
  count,
  value,
  desc,
}: {
  icon: typeof Users;
  color: string;
  label: string;
  count: number;
  value: number;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className={cn("size-9 rounded-lg flex items-center justify-center", color)}>
        <Icon className="size-5" />
      </div>
      <div className="mt-4 text-[28px] font-bold tabular-nums leading-none">
        {count.toLocaleString("pt-BR")}
      </div>
      <div className="mt-1 text-sm-minus font-semibold">{label}</div>
      <div className="mt-1 text-[22px] font-semibold tabular-nums text-primary">{fmt(value)}</div>
      <div className="mt-1 text-2xs text-muted-foreground">{desc}</div>
    </div>
  );
}

function ScoreBreakdown({ diag }: { diag: DiagnosticSnapshot }) {
  const components: { label: string; value: number | null; weight: string }[] = [
    { label: "Retenção de pacientes", value: diag.score_retention, weight: "30%" },
    { label: "Adimplência", value: diag.score_adimplencia, weight: "25%" },
    { label: "Velocidade do funil", value: diag.score_funnel, weight: "20%" },
    { label: "Reputação Google", value: diag.score_reputation, weight: "15%" },
    { label: "Engajamento", value: diag.score_engagement, weight: "10%" },
  ];

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm-minus font-semibold">Componentes do score</h3>
      </div>
      <div className="divide-y divide-border">
        {components.map((c) => {
          const pct = c.value ?? 0;
          const barColor =
            pct >= 80
              ? "bg-success"
              : pct >= 60
                ? "bg-amber-500"
                : pct >= 40
                  ? "bg-orange-500"
                  : "bg-destructive";
          return (
            <div key={c.label} className="px-5 py-3 flex items-center gap-4">
              <div className="w-40 shrink-0">
                <div className="text-xs font-medium">{c.label}</div>
                <div className="text-3xs text-muted-foreground">Peso {c.weight}</div>
              </div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", barColor)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="w-10 text-right text-xs font-semibold tabular-nums">
                {c.value != null ? Math.round(c.value) : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionGroup({
  label,
  icon: Icon,
  cls,
  items,
}: {
  label: string;
  icon: typeof AlertTriangle;
  cls: string;
  items: DiagnosticSnapshot["recommended_actions"];
}) {
  return (
    <div className="px-5 py-4">
      <div
        className={cn(
          "flex items-center gap-1.5 mb-3 text-xs font-semibold uppercase tracking-wide",
          cls,
        )}
      >
        <Icon className="size-3.5" />
        {label}
      </div>
      <ul className="space-y-2.5">
        {items.map((a, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-muted-foreground/40 shrink-0" />
              <div>
                <div className="text-sm-minus font-medium">{a.title}</div>
                <div className="text-2xs text-muted-foreground">{a.category}</div>
              </div>
            </div>
            {a.estimated_value > 0 && (
              <span className="text-xs font-semibold tabular-nums text-primary shrink-0">
                {fmt(a.estimated_value)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
