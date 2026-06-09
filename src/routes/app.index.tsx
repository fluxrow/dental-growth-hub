import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, MessageCircle, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { KpiCard } from "@/components/app/kpi-card";
import { FunnelChart } from "@/components/app/funnel";
import { KPIS, FINANCIAL_KPIS, CONVERSATIONS, OPPORTUNITIES } from "@/lib/mock";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard · DentalFlux" }] }),
  component: Dashboard,
});

function Dashboard() {
  const needReply = CONVERSATIONS.filter((c) => c.unread > 0 || c.status === "novo").slice(0, 4);
  const nextActions = OPPORTUNITIES.filter((o) => ["agendada","confirmada","compareceu"].includes(o.stage)).slice(0, 5);

  return (
    <AppShell title="Visão geral" subtitle="Saúde da operação · últimos 30 dias">
      {/* Financial highlight row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {FINANCIAL_KPIS.map((k) => <KpiCard key={k.key} k={k} large />)}
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {KPIS.map((k) => <KpiCard key={k.key} k={k} />)}
      </div>

      {/* Funnel */}
      <div className="mb-6">
        <FunnelChart />
      </div>

      {/* Two-column action panels */}
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
                  {c.patientName.split(" ").map(n => n[0]).slice(0,2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-medium truncate">{c.patientName}</span>
                    <span className="text-[10.5px] text-muted-foreground tabular-nums">{c.lastTime}</span>
                  </div>
                  <div className="text-[12px] text-muted-foreground truncate">{c.lastMessage}</div>
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
                    <span className="text-[11px] text-foreground/70 tabular-nums">R$ {o.value.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="text-[12px] text-muted-foreground truncate">{o.nextAction} · {o.owner}</div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}

function Panel({
  title, subtitle, children, href, cta, accent,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
  href: string; cta: string; accent: "warning" | "primary";
}) {
  const Icon = accent === "warning" ? AlertCircle : MessageCircle;
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`size-8 rounded-md flex items-center justify-center ${accent === "warning" ? "bg-warning/15 text-warning-foreground" : "bg-primary/10 text-primary"}`}>
            <Icon className="size-4" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight">{title}</h3>
            {subtitle && <p className="text-[12px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <Link to={href} className="text-[12px] text-primary font-medium inline-flex items-center gap-0.5 hover:underline">
          {cta} <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}
