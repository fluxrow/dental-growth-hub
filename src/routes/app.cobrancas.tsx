import { createFileRoute } from "@tanstack/react-router";
import { Plus, Send } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { EMPTY_STATES } from "@/lib/empty-states";
import { useEmptyMode } from "@/hooks/use-empty-mode";
import { KpiCard } from "@/components/app/kpi-card";
import { CHARGES, CHARGE_KPIS, type ChargeStatus } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/cobrancas")({
  head: () => ({ meta: [{ title: "Cobranças · DentalFlux" }] }),
  component: Cobrancas,
});

const STATUS: Record<ChargeStatus, { label: string; tone: string }> = {
  pendente:   { label: "Pendente",   tone: "bg-muted text-muted-foreground" },
  vencendo:   { label: "Vencendo",   tone: "bg-warning/15 text-warning-foreground" },
  atrasada:   { label: "Atrasada",   tone: "bg-destructive/10 text-destructive" },
  recuperada: { label: "Recuperada", tone: "bg-info/10 text-info" },
  paga:       { label: "Paga",       tone: "bg-success/10 text-success" },
};

const TABS: { id: ChargeStatus | "all"; label: string }[] = [
  { id: "all",        label: "Todas" },
  { id: "pendente",   label: "Pendentes" },
  { id: "vencendo",   label: "Vencendo" },
  { id: "atrasada",   label: "Atrasadas" },
  { id: "recuperada", label: "Recuperadas" },
];

function Cobrancas() {
  const __empty = useEmptyMode();
  if (__empty) {
    return (
      <AppShell title="Cobranças" subtitle="Recuperação financeira">
        <EmptyState {...EMPTY_STATES.cobrancas} />
      </AppShell>
    );
  }
  const counts = TABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.id] = t.id === "all" ? CHARGES.length : CHARGES.filter((c) => c.status === t.id).length;
    return acc;
  }, {});

  return (
    <AppShell
      title="Cobranças"
      subtitle="Reduza inadimplência com lembretes automáticos · foco em recuperação de receita"
      actions={
        <button className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-90">
          <Plus className="size-3.5"/> Nova cobrança
        </button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {CHARGE_KPIS.map((k) => <KpiCard key={k.key} k={k}/>)}
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center gap-1 px-3 h-12 border-b border-border overflow-x-auto">
          {TABS.map((t, i) => (
            <button key={t.id} className={cn(
              "px-2.5 h-7 rounded-md text-[12px] inline-flex items-center gap-1.5",
              i === 0 ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted",
            )}>
              {t.label}
              <span className="text-[10.5px] tabular-nums text-muted-foreground/80">{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <table className="w-full text-[13px]">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-muted/40">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Paciente</th>
              <th className="text-left font-medium px-4 py-2.5">Descrição</th>
              <th className="text-right font-medium px-4 py-2.5">Valor</th>
              <th className="text-left font-medium px-4 py-2.5">Vencimento</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
              <th className="text-right font-medium px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {CHARGES.map((c) => {
              const s = STATUS[c.status];
              return (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.patient}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">R$ {c.value.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {c.dueDate}
                    {c.daysOverdue && <span className="ml-2 text-[11px] text-destructive">+{c.daysOverdue}d</span>}
                  </td>
                  <td className="px-4 py-3"><span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", s.tone)}>{s.label}</span></td>
                  <td className="px-4 py-3 text-right">
                    {["atrasada","vencendo","pendente"].includes(c.status) && (
                      <button className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-input bg-background text-[11.5px] hover:bg-muted">
                        <Send className="size-3"/> Enviar cobrança
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-surface p-5">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Automações de cobrança ativas</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { t: "Lembrete preventivo D-3", desc: "3 dias antes do vencimento" },
            { t: "Lembrete de vencimento",  desc: "No dia do vencimento" },
            { t: "Cobrança amigável D+3",   desc: "3 dias após vencimento" },
            { t: "Cobrança reforçada D+10", desc: "10 dias após vencimento" },
          ].map((a) => (
            <div key={a.t} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="size-1.5 rounded-full bg-success" />
                <span className="text-[10.5px] uppercase tracking-wider text-success font-semibold">Ativa</span>
              </div>
              <div className="text-[13px] font-medium">{a.t}</div>
              <div className="text-[11.5px] text-muted-foreground">{a.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
