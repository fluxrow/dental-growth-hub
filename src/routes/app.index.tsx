import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, MessageCircle, AlertCircle, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { KpiCard } from "@/components/app/kpi-card";
import { FunnelChart } from "@/components/app/funnel";
import { RevenueLeakBanner } from "@/components/app/revenue-leak-banner";
import { useEmptyMode } from "@/hooks/use-empty-mode";
import { KPIS, FINANCIAL_KPIS, CONVERSATIONS, OPPORTUNITIES } from "@/lib/mock";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingChecklist } from "@/components/app/onboarding-checklist";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard · DentalFlux" }] }),
  component: Dashboard,
});

function Dashboard() {
  const live = useEmptyMode();

  if (!live) {
    // Demo mode: existing mock dashboard
    const needReply = CONVERSATIONS.filter((c) => c.unread > 0 || c.status === "novo").slice(0, 4);
    const nextActions = OPPORTUNITIES.filter((o) =>
      ["agendada", "confirmada", "compareceu"].includes(o.stage),
    ).slice(0, 5);

    return (
      <AppShell title="Visão geral" subtitle="Saúde da operação · últimos 30 dias">
        <OnboardingChecklist />
        <RevenueLeakBanner />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {FINANCIAL_KPIS.map((k) => (
            <KpiCard key={k.key} k={k} large />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {KPIS.map((k) => (
            <KpiCard key={k.key} k={k} />
          ))}
        </div>
        <div className="mb-6">
          <FunnelChart />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel
            title="Precisa de resposta agora"
            subtitle={`${needReply.length} conversas paradas`}
            accent="warning"
            href="/app/conversas"
            cta="Abrir conversas"
          >
            <ul className="divide-y divide-border">
              {needReply.map((c) => (
                <li key={c.id} className="py-2.5 flex items-center gap-3">
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold">
                    {c.patientName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] font-medium truncate">{c.patientName}</span>
                      <span className="text-[10.5px] text-muted-foreground tabular-nums">
                        {c.lastTime}
                      </span>
                    </div>
                    <div className="text-[12px] text-muted-foreground truncate">
                      {c.lastMessage}
                    </div>
                  </div>
                  {c.unread > 0 && (
                    <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10.5px] font-semibold flex items-center justify-center tabular-nums">
                      {c.unread}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel
            title="Próximas ações"
            subtitle={`${nextActions.length} oportunidades aguardando`}
            accent="primary"
            href="/app/oportunidades"
            cta="Abrir pipeline"
          >
            <ul className="divide-y divide-border">
              {nextActions.map((o) => (
                <li key={o.id} className="py-2.5 flex items-center gap-3">
                  <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Clock className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] font-medium truncate">{o.name}</span>
                      <span className="text-[11px] text-foreground/70 tabular-nums">
                        R$ {o.value.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="text-[12px] text-muted-foreground truncate">
                      {o.nextAction} · {o.owner}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </AppShell>
    );
  }

  // Live mode: real data from Supabase
  return <LiveDashboard />;
}

// ─── Live Dashboard ───────────────────────────────────────────────────────────

function LiveDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard_live"],
    queryFn: async () => {
      const [oppsRes, patientsRes] = await Promise.all([
        supabase
          .from("oportunidades")
          .select("stage, value, name, next_action")
          .neq("stage", "perdida"),
        supabase.from("pacientes").select("status"),
      ]);
      const opps = oppsRes.data ?? [];
      const pts = patientsRes.data ?? [];

      const leadsCount = opps.filter((o) => ["novo", "contato"].includes(o.stage)).length;
      const scheduledCount = opps.filter((o) =>
        ["agendada", "confirmada"].includes(o.stage),
      ).length;
      const inTreatment = opps.filter((o) => ["compareceu", "ativo"].includes(o.stage)).length;
      const pipelineValue = opps.reduce((s, o) => s + Number(o.value ?? 0), 0);
      const activePatients = pts.filter((p) => ["ativo", "tratamento"].includes(p.status)).length;
      const inactiveCount = pts.filter((p) => p.status === "inativo").length;
      const nextActions = opps
        .filter((o) => ["agendada", "confirmada", "compareceu"].includes(o.stage))
        .slice(0, 5);

      return {
        leadsCount,
        scheduledCount,
        inTreatment,
        pipelineValue,
        activePatients,
        inactiveCount,
        nextActions,
        totalOpps: opps.length,
      };
    },
  });

  if (isLoading) {
    return (
      <AppShell title="Visão geral" subtitle="Carregando dados da clínica…">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  const d = data ?? {
    leadsCount: 0,
    scheduledCount: 0,
    inTreatment: 0,
    pipelineValue: 0,
    activePatients: 0,
    inactiveCount: 0,
    nextActions: [] as {
      name: string;
      value: string | number | null;
      next_action: string | null;
      stage: string;
    }[],
    totalOpps: 0,
  };

  const liveFinancial = [
    {
      key: "pipeline",
      label: "Pipeline total",
      value: `R$ ${d.pipelineValue.toLocaleString("pt-BR")}`,
      delta: 0,
      spark: [0, 0, 0, 0, 0] as number[],
      tone: "primary" as const,
    },
    {
      key: "ativos",
      label: "Pacientes ativos",
      value: String(d.activePatients),
      delta: 0,
      spark: [0, 0, 0, 0, 0] as number[],
      tone: "success" as const,
    },
    {
      key: "inativos",
      label: "Inativos — potencial",
      value: String(d.inactiveCount),
      delta: 0,
      spark: [0, 0, 0, 0, 0] as number[],
      tone: "warning" as const,
    },
  ];

  const liveKpis = [
    {
      key: "leads",
      label: "Novos leads",
      value: String(d.leadsCount),
      delta: 0,
      spark: [0, 0, 0, 0, 0] as number[],
    },
    {
      key: "agendados",
      label: "Agendamentos",
      value: String(d.scheduledCount),
      delta: 0,
      spark: [0, 0, 0, 0, 0] as number[],
    },
    {
      key: "tratamento",
      label: "Em tratamento",
      value: String(d.inTreatment),
      delta: 0,
      spark: [0, 0, 0, 0, 0] as number[],
      tone: "success" as const,
    },
    {
      key: "total",
      label: "Total no funil",
      value: String(d.totalOpps),
      delta: 0,
      spark: [0, 0, 0, 0, 0] as number[],
    },
  ];

  return (
    <AppShell title="Visão geral" subtitle="Saúde da operação · tempo real">
      <OnboardingChecklist />
      <RevenueLeakBanner />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {liveFinancial.map((k) => (
          <KpiCard key={k.key} k={k} large />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {liveKpis.map((k) => (
          <KpiCard key={k.key} k={k} />
        ))}
      </div>
      <div className="mb-6">
        <FunnelChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          title="Próximas ações"
          subtitle={`${d.nextActions.length} oportunidades com consultas`}
          accent="primary"
          href="/app/oportunidades"
          cta="Abrir pipeline"
        >
          {d.nextActions.length > 0 ? (
            <ul className="divide-y divide-border">
              {d.nextActions.map((o, i) => (
                <li key={i} className="py-2.5 flex items-center gap-3">
                  <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Clock className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] font-medium truncate">{o.name}</span>
                      <span className="text-[11px] text-foreground/70 tabular-nums">
                        R$ {Number(o.value ?? 0).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="text-[12px] text-muted-foreground truncate">
                      {o.next_action ?? "—"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-muted-foreground py-4 text-center">
              Nenhuma consulta agendada hoje
            </p>
          )}
        </Panel>

        <Panel
          title="Pacientes para reativar"
          subtitle={`${d.inactiveCount} pacientes inativos`}
          accent="warning"
          href="/app/pacientes"
          cta="Ver pacientes"
        >
          <div className="py-4 text-center text-[12px] text-muted-foreground">
            {d.inactiveCount === 0 ? (
              "Nenhum paciente inativo 🎉"
            ) : (
              <>
                <span className="text-[28px] font-display font-semibold text-warning-foreground block mb-1">
                  {d.inactiveCount}
                </span>
                paciente{d.inactiveCount !== 1 ? "s" : ""} sem visita recente —{" "}
                <Link to="/app/campanhas" className="text-primary hover:underline">
                  acione uma campanha de reativação
                </Link>
              </>
            )}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

// ─── Shared Panel ─────────────────────────────────────────────────────────────

function Panel({
  title,
  subtitle,
  children,
  href,
  cta,
  accent,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  href: string;
  cta: string;
  accent: "warning" | "primary";
}) {
  const Icon = accent === "warning" ? AlertCircle : MessageCircle;
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`size-8 rounded-md flex items-center justify-center ${
              accent === "warning"
                ? "bg-warning/15 text-warning-foreground"
                : "bg-primary/10 text-primary"
            }`}
          >
            <Icon className="size-4" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight">{title}</h3>
            {subtitle && <p className="text-[12px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <Link
          to={href as never}
          className="text-[12px] text-primary font-medium inline-flex items-center gap-0.5 hover:underline"
        >
          {cta} <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}
