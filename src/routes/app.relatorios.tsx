import { createFileRoute } from "@tanstack/react-router";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AppShell } from "@/components/app/app-shell";
import { FunnelChart } from "@/components/app/funnel";
import { ATTENDANCE_RATE, MONTHLY_EVOLUTION, SOURCE_BREAKDOWN } from "@/lib/mock";

export const Route = createFileRoute("/app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · DentalFlux" }] }),
  component: Relatorios,
});

function Relatorios() {
  return (
    <AppShell title="Relatórios" subtitle="Painel executivo · visão consolidada da operação">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2"><FunnelChart/></div>
        <Card title="Origem dos pacientes" subtitle="Últimos 30 dias">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={SOURCE_BREAKDOWN} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {SOURCE_BREAKDOWN.map((s, i) => <Cell key={i} fill={s.color}/>)}
                </Pie>
                <Tooltip wrapperStyle={{ fontSize: 12 }} contentStyle={tooltipStyle}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5">
            {SOURCE_BREAKDOWN.map((s) => (
              <li key={s.name} className="flex items-center justify-between text-[12px]">
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: s.color }}/>
                  {s.name}
                </span>
                <span className="tabular-nums text-muted-foreground">{s.value}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="Taxa de comparecimento" subtitle="% de pacientes confirmados que compareceram">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ATTENDANCE_RATE}>
                <defs>
                  <linearGradient id="att" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" tick={axisTick} axisLine={false} tickLine={false}/>
                <YAxis stroke="var(--muted-foreground)" tick={axisTick} axisLine={false} tickLine={false} domain={[70, 100]}/>
                <Tooltip contentStyle={tooltipStyle} wrapperStyle={{ fontSize: 12 }}/>
                <Area type="monotone" dataKey="taxa" stroke="var(--success)" strokeWidth={2} fill="url(#att)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Pacientes recuperados por mês" subtitle="Resultado das campanhas de reativação">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_EVOLUTION}>
                <CartesianGrid stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" tick={axisTick} axisLine={false} tickLine={false}/>
                <YAxis stroke="var(--muted-foreground)" tick={axisTick} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={tooltipStyle} wrapperStyle={{ fontSize: 12 }}/>
                <Bar dataKey="recuperados" fill="var(--chart-1)" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Evolução mensal" subtitle="Leads → agendados → atendidos → recuperados">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MONTHLY_EVOLUTION}>
              <CartesianGrid stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" tick={axisTick} axisLine={false} tickLine={false}/>
              <YAxis stroke="var(--muted-foreground)" tick={axisTick} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={tooltipStyle} wrapperStyle={{ fontSize: 12 }}/>
              <Legend wrapperStyle={{ fontSize: 12 }}/>
              <Line type="monotone" dataKey="leads"       stroke="var(--chart-1)" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="agendados"   stroke="var(--chart-2)" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="atendidos"   stroke="var(--chart-3)" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="recuperados" stroke="var(--chart-5)" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </AppShell>
  );
}

const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" } as const;
const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3">
        <h3 className="text-[14px] font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-[12px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
