import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Check, Loader2, Plus } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { INTEGRATIONS, PLANS, TEAM } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { GoogleCalendarConnector } from "@/components/app/google-calendar-connector";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { updateClinic } from "@/lib/clinicas.functions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { CancelFlowModal } from "@/components/app/cancel-flow-modal";

export const Route = createFileRoute("/app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · DentalFlux" }] }),
  component: Configuracoes,
});

const TABS = ["Clínica", "Agenda", "Usuários", "WhatsApp", "Integrações", "Planos"] as const;

function Configuracoes() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Clínica");

  return (
    <AppShell title="Configurações" subtitle="Conta · time · integrações · plano">
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center gap-1 px-3 h-12 border-b border-border overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 h-7 rounded-md text-xs-plus",
                tab === t
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === "Clínica" && <ClinicTab />}
          {tab === "Agenda" && <AgendaTab />}
          {tab === "Usuários" && <UsersTab />}
          {tab === "WhatsApp" && <WhatsTab />}
          {tab === "Integrações" && <IntegrationsTab />}
          {tab === "Planos" && <PlansTab />}
        </div>
      </div>
      <Toaster position="top-right" />
    </AppShell>
  );
}

function AgendaTab() {
  const { user } = useAuth();
  const { data } = useProfile(user?.id);
  const clinicId = data?.profile?.clinic_id ?? null;

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Calendar className="size-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Google Calendar da clínica</div>
            <p className="mt-1 text-xs-plus text-muted-foreground">
              Esta é a agenda usada para lembretes, confirmações e detecção de no-show. Você pode
              trocar a conta Google ou desconectar a qualquer momento — basta refazer a autorização.
            </p>
            <div className="mt-4">
              {clinicId ? (
                <GoogleCalendarConnector clinicId={clinicId} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Termine o onboarding da clínica antes de conectar a agenda.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-md border border-dashed border-border bg-surface p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Negou alguma permissão?</strong> Clique em{" "}
        <em>Conectar com Google</em> novamente e marque <strong>todas</strong> as caixas — ler e
        criar eventos. Sem isso, lembretes automáticos ficam desativados.
      </div>
    </div>
  );
}

const TONE_LABELS: Record<string, string> = {
  acolhedora: "Acolhedora",
  institucional: "Institucional",
  descontraida: "Descontraída",
};

function ClinicTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useProfile(user?.id);
  const clinic = data?.clinic ?? null;

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tone, setTone] = useState<"acolhedora" | "institucional" | "descontraida" | "">("");
  const [saving, setSaving] = useState(false);

  // Seed form when clinic data loads
  useEffect(() => {
    if (!clinic) return;
    setName(clinic.name ?? "");
    setCity(clinic.city ?? "");
    setPhone(clinic.phone ?? "");
    setAddress(clinic.address ?? "");
    setTone(clinic.tone ?? "");
  }, [clinic]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id) return;
    setSaving(true);
    try {
      await updateClinic({
        data: {
          clinicId: clinic.id,
          name,
          city: city || null,
          phone: phone || null,
          address: address || null,
          tone: (tone as "acolhedora" | "institucional" | "descontraida") || null,
        },
      });
      // Invalidate profile cache so nav/sidebar reflect new name instantly
      await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Alterações salvas com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const slugDisplay = clinic?.slug ? `${clinic.slug}.dentalflux.app` : "—";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
      <Field label="Nome da clínica" value={name} onChange={setName} required />
      <Field label="Slug (subdomínio)" value={slugDisplay} readOnly hint="Definido no cadastro" />
      <Field label="Cidade" value={city} onChange={setCity} />
      <Field
        label="Telefone principal"
        value={phone}
        onChange={setPhone}
        placeholder="(11) 9 9999-9999"
      />
      <Field
        label="Endereço"
        value={address}
        onChange={setAddress}
        full
        placeholder="Rua, número, bairro"
      />

      {/* Tom de comunicação */}
      <div className="md:col-span-2">
        <div className="text-2xs uppercase tracking-wider text-muted-foreground mb-1.5">
          Tom de comunicação
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["acolhedora", "institucional", "descontraida"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={cn(
                "h-8 px-3 rounded-md text-xs-plus font-medium border transition-colors",
                tone === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {TONE_LABELS[t]}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-2xs text-muted-foreground">
          Define como as mensagens automáticas são enviadas aos seus pacientes.
        </p>
      </div>

      {/* Logo placeholder */}
      <div className="md:col-span-2">
        <div className="text-2xs uppercase tracking-wider text-muted-foreground mb-2">
          Logo
        </div>
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-primary-foreground font-display text-xl font-semibold">
            {initials || "—"}
          </div>
          <button
            type="button"
            disabled
            className="h-8 px-3 rounded-md border border-input bg-background text-xs opacity-40 cursor-not-allowed"
            title="Upload de logo em breve"
          >
            Trocar logo
          </button>
          <span className="text-2xs text-muted-foreground">Upload em breve</span>
        </div>
      </div>

      <div className="md:col-span-2 flex justify-end pt-4 border-t border-border">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs-plus font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  full,
  required,
  readOnly,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  full?: boolean;
  required?: boolean;
  readOnly?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div className={cn(full && "md:col-span-2")}>
      <div className="text-2xs uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </div>
      <input
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        required={required}
        placeholder={placeholder}
        className={cn(
          "w-full h-9 rounded-md border border-input bg-background px-3 text-sm-minus focus:outline-none focus:ring-2 focus:ring-ring",
          readOnly && "opacity-50 cursor-not-allowed bg-muted",
        )}
      />
      {hint && <p className="mt-1 text-2xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function UsersTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm-minus text-muted-foreground">{TEAM.length} usuários no time</div>
        <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs-plus font-medium hover:opacity-90">
          <Plus className="size-3.5" /> Convidar usuário
        </button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm-minus">
          <thead className="text-2xs uppercase tracking-wider text-muted-foreground bg-surface-muted/40">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Usuário</th>
              <th className="text-left font-medium px-4 py-2.5">Email</th>
              <th className="text-left font-medium px-4 py-2.5">Função</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {TEAM.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-md bg-accent text-accent-foreground px-2 py-0.5 text-2xs font-medium">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-2xs text-success">
                    <span className="size-1.5 rounded-full bg-success" /> Ativo
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WhatsTab() {
  return (
    <div className="max-w-xl">
      <div className="rounded-lg border border-border bg-background p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-10 rounded-md bg-success/10 text-success flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path d="M20 4a16 16 0 0 0-13.6 24.4L4 36l7.8-2.4A16 16 0 1 0 20 4Z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">WhatsApp Business via Z-API</div>
            <div className="text-xs text-muted-foreground">
              Conecte sua linha do WhatsApp em poucos minutos.
            </div>
          </div>
        </div>
        <ol className="space-y-2 text-sm-minus text-foreground/80 mb-4 list-decimal pl-4">
          <li>Crie uma conta gratuita na Z-API</li>
          <li>Copie o token e o ID da instância</li>
          <li>Cole nos campos abaixo e ative</li>
        </ol>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Instance ID" value="" />
          <Field label="Token" value="" />
        </div>
        <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs-plus font-medium hover:opacity-90">
          Conectar WhatsApp
        </button>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {INTEGRATIONS.map((i) => (
        <div key={i.id} className="rounded-lg border border-border bg-background p-4 flex flex-col">
          <div className="text-sm-minus font-semibold">{i.name}</div>
          <div className="text-xs text-muted-foreground mt-1 flex-1">{i.desc}</div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-2xs text-muted-foreground">
              {i.connected ? "Conectada" : "Em breve"}
            </span>
            <button
              className={cn(
                "h-8 px-3 rounded-md text-xs font-medium",
                i.connected
                  ? "bg-success/10 text-success"
                  : "border border-input bg-background hover:bg-muted",
              )}
            >
              {i.connected ? "Configurar" : "Conectar"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlansTab() {
  const { user } = useAuth();
  const { data } = useProfile(user?.id);
  const clinicId = data?.profile?.clinic_id ?? "";
  const [showCancelModal, setShowCancelModal] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={cn(
              "rounded-xl border p-5 flex flex-col",
              p.highlighted
                ? "border-primary/40 bg-gradient-to-br from-primary/5 to-chart-2/5 shadow-[0_8px_24px_-12px_oklch(0.55_0.2_275/0.3)]"
                : "border-border bg-background",
            )}
          >
            {p.highlighted && (
              <div className="inline-block self-start text-3xs font-semibold uppercase tracking-wider text-primary mb-2">
                Mais escolhido
              </div>
            )}
            <div className="font-display text-xl font-semibold">{p.name}</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-3xl font-semibold tabular-nums">{p.price}</span>
              <span className="text-xs text-muted-foreground">{p.per}</span>
            </div>
            <ul className="mt-4 space-y-2 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm-minus">
                  <Check className="size-3.5 text-success mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button
              className={cn(
                "mt-5 h-9 rounded-md text-xs-plus font-medium",
                p.highlighted
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "border border-input bg-background hover:bg-muted",
              )}
            >
              {p.highlighted ? "Plano atual" : "Trocar plano"}
            </button>
          </div>
        ))}
      </div>

      {/* Cancel subscription link — only visible when there's a clinic (active subscriber) */}
      {clinicId && (
        <div className="mt-6 pt-5 border-t border-border flex items-center justify-between">
          <div>
            <p className="text-sm-minus font-medium">Cancelar assinatura</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Seu acesso ficará ativo até o final do período pago.
            </p>
          </div>
          <button
            onClick={() => setShowCancelModal(true)}
            className="h-8 px-3.5 rounded-md border border-destructive/40 text-destructive text-xs-plus font-medium hover:bg-destructive/5 transition-colors"
          >
            Cancelar plano
          </button>
        </div>
      )}

      {showCancelModal && clinicId && (
        <CancelFlowModal clinicId={clinicId} onClose={() => setShowCancelModal(false)} />
      )}
    </>
  );
}
