import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Plus,
  X,
  ShieldCheck,
  ShieldAlert,
  Clock,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { EMPTY_STATES } from "@/lib/empty-states";
import { useEmptyMode } from "@/hooks/use-empty-mode";
import { PATIENTS, type Patient } from "@/lib/mock";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPaciente } from "@/lib/pacientes.functions";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/app/pacientes")({
  head: () => ({ meta: [{ title: "Pacientes · Dr. Flux" }] }),
  component: Pacientes,
});

type PatientRow = Patient;
const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  ativo: { label: "Ativo", tone: "bg-success/10 text-success" },
  tratamento: { label: "Em tratamento", tone: "bg-primary/10 text-primary" },
  inativo: { label: "Inativo", tone: "bg-muted text-muted-foreground" },
  recuperado: { label: "Recuperado", tone: "bg-info/10 text-info" },
  lead: { label: "Lead", tone: "bg-chart-2/10 text-chart-2" },
};

function Pacientes() {
  const live = useEmptyMode();
  const { user } = useAuth();
  const { data: profileData } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<PatientRow | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [q, setQ] = useState("");

  const { data: liveData, isLoading } = useQuery({
    queryKey: ["pacientes"],
    enabled: live,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id, name, phone, status, source, last_visit_at, next_action, ltv, tags")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (p): PatientRow => ({
          id: p.id,
          name: p.name,
          phone: p.phone ?? "",
          status: (p.status === "lead" ? "ativo" : p.status) as Patient["status"],
          source: (p.source ?? "—") as Patient["source"],
          lastVisit: p.last_visit_at ? new Date(p.last_visit_at).toLocaleDateString("pt-BR") : "—",
          nextAction: p.next_action ?? "—",
          ltv: Number(p.ltv ?? 0),
          tags: (p.tags ?? []) as string[],
          consent: true,
        }),
      );
    },
  });

  const rows: PatientRow[] = live ? (liveData ?? []) : PATIENTS;
  const filtered = q.trim()
    ? rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "")),
      )
    : rows;

  if (live && isLoading) {
    return (
      <AppShell title="Pacientes">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (rows.length === 0) {
    return (
      <AppShell title="Pacientes" subtitle="Base completa da clínica">
        <EmptyState {...EMPTY_STATES.pacientes} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Pacientes"
      subtitle={`${rows.length} pacientes · base completa da clínica${q ? ` · ${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}` : ""}`}
      actions={
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex shadow-lg md:shadow-none items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs-plus font-medium hover:opacity-90"
        >
          <Plus className="size-3.5" /> Novo paciente
        </button>
      }
    >
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center gap-2 px-4 h-12 border-b border-border">
          <div className="relative flex-1 max-w-xs">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou telefone…"
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-input bg-background text-xs">
            <Filter className="size-3.5" /> Filtros
          </button>
          <div className="ml-auto text-2xs text-muted-foreground tabular-nums">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
        {/* Mobile: lista em cards */}
        <div className="md:hidden divide-y divide-border">
          {filtered.map((p) => {
            const s = STATUS_LABEL[p.status];
            return (
              <button
                key={p.id}
                onClick={() => setOpen(p)}
                className="w-full text-left px-4 py-3 hover:bg-muted/40 active:bg-muted/60"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-9 shrink-0 rounded-full bg-gradient-to-br from-muted to-accent flex items-center justify-center text-3xs font-semibold">
                    {p.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm-minus font-medium truncate">{p.name}</span>
                      <span className="text-sm-minus font-medium tabular-nums shrink-0">
                        R$ {p.ltv.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-2xs text-muted-foreground tabular-nums truncate">
                        {p.phone} · {p.lastVisit}
                      </span>
                      <span
                        className={cn(
                          "inline-flex shrink-0 rounded-full px-2 py-0.5 text-2xs font-medium",
                          s.tone,
                        )}
                      >
                        {s.label}
                      </span>
                    </div>
                    {p.nextAction && (
                      <div className="text-2xs text-foreground/70 truncate mt-0.5">
                        {p.nextAction}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Desktop: tabela completa */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm-minus">
            <thead className="text-2xs uppercase tracking-wider text-muted-foreground bg-surface-muted/40">
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
              {filtered.map((p) => {
                const s = STATUS_LABEL[p.status];
                return (
                  <tr
                    key={p.id}
                    onClick={() => setOpen(p)}
                    className="hover:bg-muted/40 cursor-pointer"
                  >
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-full bg-gradient-to-br from-muted to-accent flex items-center justify-center text-3xs font-semibold">
                          {p.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-2xs text-muted-foreground tabular-nums">
                            {p.phone}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-2xs font-medium",
                          s.tone,
                        )}
                      >
                        {s.label}
                      </span>
                    </Td>
                    <Td className="text-muted-foreground">{p.source}</Td>
                    <Td className="text-muted-foreground tabular-nums">{p.lastVisit}</Td>
                    <Td className="text-foreground/80">{p.nextAction}</Td>
                    <Td className="text-right tabular-nums font-medium">
                      R$ {p.ltv.toLocaleString("pt-BR")}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {p.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="inline-flex rounded-md bg-accent text-accent-foreground px-1.5 py-0.5 text-3xs"
                          >
                            {t}
                          </span>
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
      {showNew && (
        <NewPatientModal
          clinicId={profileData?.clinic?.id ?? ""}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["pacientes"] });
            setShowNew(false);
          }}
        />
      )}
    </AppShell>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("text-left font-medium px-4 py-2.5 first:pl-4 last:pr-4", className)}>
      {children}
    </th>
  );
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

function PatientDrawer({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const s = STATUS_LABEL[patient.status];
  const timeline = [
    { t: "Avaliação agendada para 20/06", date: "Hoje, 10:32", icon: Clock },
    { t: "Mensagem WhatsApp enviada (lembrete)", date: "Ontem, 18:00", icon: MessageCircle },
    { t: "Consulta realizada — limpeza + flúor", date: patient.lastVisit, icon: ShieldCheck },
    { t: "Cadastro do paciente", date: "08/01/2026", icon: ShieldCheck },
  ];
  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/10 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface border-l border-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-16 border-b border-border flex items-center justify-between px-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-full bg-gradient-to-br from-primary to-chart-2 text-primary-foreground flex items-center justify-center text-xs font-semibold">
              {patient.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{patient.name}</div>
              <div className="text-2xs text-muted-foreground truncate">{patient.phone}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-md hover:bg-muted flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Status"
              value={
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-2xs font-medium",
                    s.tone,
                  )}
                >
                  {s.label}
                </span>
              }
            />
            <Stat label="Origem" value={patient.source} />
            <Stat
              label="LTV"
              value={<span className="tabular-nums">R$ {patient.ltv.toLocaleString("pt-BR")}</span>}
            />
            <Stat label="Última visita" value={patient.lastVisit} />
          </div>

          <div className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {patient.consent ? (
                  <ShieldCheck className="size-4 text-success" />
                ) : (
                  <ShieldAlert className="size-4 text-warning-foreground" />
                )}
                <div>
                  <div className="text-xs-plus font-medium">Consentimento LGPD</div>
                  <div className="text-2xs text-muted-foreground">
                    {patient.consent
                      ? "Autorizado para contato e marketing"
                      : "Pendente — não enviar campanhas"}
                  </div>
                </div>
              </div>
              <button className="text-2xs text-primary hover:underline">Exportar dados</button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Timeline
            </h4>
            <ol className="relative border-l border-border ml-2 space-y-4">
              {timeline.map((e, i) => {
                const Icon = e.icon;
                return (
                  <li key={i} className="ml-4">
                    <div className="absolute -left-[7px] mt-1 size-3.5 rounded-full bg-surface border-2 border-primary"></div>
                    <div className="text-xs-plus font-medium flex items-center gap-1.5">
                      <Icon className="size-3.5 text-muted-foreground" /> {e.t}
                    </div>
                    <div className="text-2xs text-muted-foreground">{e.date}</div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Campanhas recebidas
            </h4>
            <div className="text-xs-plus text-muted-foreground">
              Confirmação 24h antes · Pedido de avaliação Google
            </div>
          </div>
        </div>
        <div className="border-t border-border p-4 flex gap-2">
          <button className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-xs-plus font-medium hover:opacity-90 inline-flex items-center justify-center gap-1.5">
            <MessageCircle className="size-4" /> Abrir conversa
          </button>
          <button className="h-9 px-3 rounded-md border border-input bg-background text-xs-plus hover:bg-muted">
            Anonimizar
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-3xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm-minus font-medium">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewPatientModal — P1-3
// ---------------------------------------------------------------------------

type NewStatus = "lead" | "ativo" | "tratamento" | "inativo";

function NewPatientModal({
  clinicId,
  onClose,
  onCreated,
}: {
  clinicId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<NewStatus>("lead");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!clinicId) {
      toast.error("Clínica não encontrada — aguarde o carregamento e tente novamente");
      return;
    }
    setSaving(true);
    try {
      await createPaciente({
        data: {
          clinicId,
          name: name.trim(),
          phone: phone.trim() || undefined,
          status,
          source: source.trim() || undefined,
        },
      });
      toast.success("Paciente criado com sucesso");
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar paciente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/10 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface border border-border rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-14 border-b border-border flex items-center justify-between px-5">
          <div className="text-sm font-semibold">Novo paciente</div>
          <button
            onClick={onClose}
            className="size-8 rounded-md hover:bg-muted flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <label className="block">
            <span className="text-2xs font-medium text-foreground/70 uppercase tracking-wider">
              Nome *
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Nome completo"
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm-minus focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="text-2xs font-medium text-foreground/70 uppercase tracking-wider">
              Telefone
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm-minus focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-2xs font-medium text-foreground/70 uppercase tracking-wider">
                Status
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as NewStatus)}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm-minus focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="lead">Lead</option>
                <option value="ativo">Ativo</option>
                <option value="tratamento">Em tratamento</option>
                <option value="inativo">Inativo</option>
              </select>
            </label>
            <label className="block">
              <span className="text-2xs font-medium text-foreground/70 uppercase tracking-wider">
                Origem
              </span>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Instagram, Google…"
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm-minus focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-md border border-input bg-background text-xs-plus hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs-plus font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Criar paciente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
