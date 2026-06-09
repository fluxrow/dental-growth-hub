import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Filter, Plus, X, ShieldCheck, ShieldAlert, Clock, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { PATIENTS, type Patient } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/pacientes")({
  head: () => ({ meta: [{ title: "Pacientes · DentalFlux" }] }),
  component: Pacientes,
});

const STATUS: Record<Patient["status"], { label: string; tone: string }> = {
  ativo:       { label: "Ativo",       tone: "bg-success/10 text-success" },
  tratamento:  { label: "Em tratamento", tone: "bg-primary/10 text-primary" },
  inativo:     { label: "Inativo",     tone: "bg-muted text-muted-foreground" },
  recuperado:  { label: "Recuperado",  tone: "bg-info/10 text-info" },
};

function Pacientes() {
  const [open, setOpen] = useState<Patient | null>(null);

  return (
    <AppShell
      title="Pacientes"
      subtitle={`${PATIENTS.length} pacientes · base completa da clínica`}
      actions={
        <button className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-90">
          <Plus className="size-3.5"/> Novo paciente
        </button>
      }
    >
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center gap-2 px-4 h-12 border-b border-border">
          <div className="relative flex-1 max-w-xs">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Buscar paciente…" className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-input bg-background text-[12px]">
            <Filter className="size-3.5"/> Filtros
          </button>
          <div className="ml-auto text-[11.5px] text-muted-foreground tabular-nums">{PATIENTS.length} resultados</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-muted/40">
              <tr>
                <Th>Paciente</Th>
                <Th>Status</Th>
                <Th>Origem</Th>
                <Th>Última visita</Th>
                <Th>Próxima ação</Th>
                <Th className="text-right">LTV</Th>
                <Th>Tags</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PATIENTS.map((p) => {
                const s = STATUS[p.status];
                return (
                  <tr key={p.id} onClick={() => setOpen(p)} className="hover:bg-muted/40 cursor-pointer">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-full bg-gradient-to-br from-muted to-accent flex items-center justify-center text-[10.5px] font-semibold">
                          {p.name.split(" ").map(n => n[0]).slice(0,2).join("")}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-[11px] text-muted-foreground tabular-nums">{p.phone}</div>
                        </div>
                      </div>
                    </Td>
                    <Td><span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", s.tone)}>{s.label}</span></Td>
                    <Td className="text-muted-foreground">{p.source}</Td>
                    <Td className="text-muted-foreground tabular-nums">{p.lastVisit}</Td>
                    <Td className="text-foreground/80">{p.nextAction}</Td>
                    <Td className="text-right tabular-nums font-medium">R$ {p.ltv.toLocaleString("pt-BR")}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {p.tags.slice(0,2).map((t) => (
                          <span key={t} className="inline-flex rounded-md bg-accent text-accent-foreground px-1.5 py-0.5 text-[10.5px]">{t}</span>
                        ))}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open && <PatientDrawer patient={open} onClose={() => setOpen(null)} />}
    </AppShell>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("text-left font-medium px-4 py-2.5 first:pl-4 last:pr-4", className)}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

function PatientDrawer({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const s = STATUS[patient.status];
  const timeline = [
    { t: "Avaliação agendada para 20/06", date: "Hoje, 10:32", icon: Clock },
    { t: "Mensagem WhatsApp enviada (lembrete)", date: "Ontem, 18:00", icon: MessageCircle },
    { t: "Consulta realizada — limpeza + flúor", date: patient.lastVisit, icon: ShieldCheck },
    { t: "Cadastro do paciente", date: "08/01/2026", icon: ShieldCheck },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-foreground/10 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border-l border-border flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="h-16 border-b border-border flex items-center justify-between px-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-full bg-gradient-to-br from-primary to-chart-2 text-primary-foreground flex items-center justify-center text-[12px] font-semibold">
              {patient.name.split(" ").map(n => n[0]).slice(0,2).join("")}
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold truncate">{patient.name}</div>
              <div className="text-[11.5px] text-muted-foreground truncate">{patient.phone}</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-md hover:bg-muted flex items-center justify-center"><X className="size-4"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Status" value={<span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", s.tone)}>{s.label}</span>} />
            <Stat label="Origem" value={patient.source} />
            <Stat label="LTV" value={<span className="tabular-nums">R$ {patient.ltv.toLocaleString("pt-BR")}</span>} />
            <Stat label="Última visita" value={patient.lastVisit} />
          </div>

          <div className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {patient.consent ? (
                  <ShieldCheck className="size-4 text-success"/>
                ) : (
                  <ShieldAlert className="size-4 text-warning-foreground"/>
                )}
                <div>
                  <div className="text-[12.5px] font-medium">Consentimento LGPD</div>
                  <div className="text-[11px] text-muted-foreground">{patient.consent ? "Autorizado para contato e marketing" : "Pendente — não enviar campanhas"}</div>
                </div>
              </div>
              <button className="text-[11.5px] text-primary hover:underline">Exportar dados</button>
            </div>
          </div>

          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Timeline</h4>
            <ol className="relative border-l border-border ml-2 space-y-4">
              {timeline.map((e, i) => {
                const Icon = e.icon;
                return (
                  <li key={i} className="ml-4">
                    <div className="absolute -left-[7px] mt-1 size-3.5 rounded-full bg-surface border-2 border-primary"></div>
                    <div className="text-[12.5px] font-medium flex items-center gap-1.5"><Icon className="size-3.5 text-muted-foreground"/> {e.t}</div>
                    <div className="text-[11px] text-muted-foreground">{e.date}</div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Campanhas recebidas</h4>
            <div className="text-[12.5px] text-muted-foreground">Confirmação 24h antes · Pedido de avaliação Google</div>
          </div>
        </div>
        <div className="border-t border-border p-4 flex gap-2">
          <button className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-90 inline-flex items-center justify-center gap-1.5">
            <MessageCircle className="size-4"/> Abrir conversa
          </button>
          <button className="h-9 px-3 rounded-md border border-input bg-background text-[12.5px] hover:bg-muted">Anonimizar</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-[13px] font-medium">{value}</div>
    </div>
  );
}
