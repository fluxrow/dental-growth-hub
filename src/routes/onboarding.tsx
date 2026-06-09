import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Users, MessageCircle, Sparkles, ArrowRight, ArrowLeft, Check, Plus, Trash2, Upload } from "lucide-react";
import { Logo } from "@/components/app/app-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Configurar clínica · DentalFlux" }] }),
  component: OnboardingWizard,
});

type StepKey = "clinica" | "responsaveis" | "whatsapp" | "pronto";

const STEPS: { key: StepKey; label: string; icon: typeof Building2 }[] = [
  { key: "clinica",      label: "Clínica",       icon: Building2 },
  { key: "responsaveis", label: "Responsáveis",  icon: Users },
  { key: "whatsapp",     label: "WhatsApp",      icon: MessageCircle },
  { key: "pronto",       label: "Pronto",        icon: Sparkles },
];

type TeamMember = { name: string; email: string; role: string };
type OnboardingState = {
  clinic: { name: string; cnpj: string; address: string; specialties: string[]; logo?: string };
  team: TeamMember[];
  whatsapp: { provider: "z-api" | "meta"; instance: string; phone: string; connected: boolean };
};

const INITIAL: OnboardingState = {
  clinic: { name: "Clínica Sorriso Pleno", cnpj: "12.345.678/0001-90", address: "Av. Paulista, 1500 · São Paulo, SP", specialties: ["Clínica geral", "Ortodontia"] },
  team: [
    { name: "Dra. Marina Lopes", email: "marina@sorrisopleno.com.br", role: "Admin" },
    { name: "Bia Oliveira", email: "bia@sorrisopleno.com.br", role: "Recepção" },
  ],
  whatsapp: { provider: "z-api", instance: "", phone: "+55 11 ", connected: false },
};

const SPECIALTY_OPTIONS = ["Clínica geral", "Ortodontia", "Implantodontia", "Estética", "Endodontia", "Periodontia", "Odontopediatria", "Próteses"];

function OnboardingWizard() {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [state, setState] = useState<OnboardingState>(INITIAL);
  const step = STEPS[stepIdx];

  const finish = () => {
    try {
      localStorage.setItem("dentalflux:onboarded", "1");
      localStorage.setItem("dentalflux:onboarding", JSON.stringify(state));
    } catch {}
    navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[420px_1fr] bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col justify-between border-r border-border bg-gradient-to-br from-primary/5 via-accent to-background p-8">
        <div>
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-display font-semibold tracking-tight">DentalFlux</span>
          </div>
          <h1 className="mt-10 font-display text-3xl font-semibold tracking-tight">
            Vamos configurar sua clínica.
          </h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground max-w-sm">
            Em 4 passos rápidos seu time começa a parar de perder pacientes — sem instalar nada.
          </p>

          <ol className="mt-10 space-y-1.5">
            {STEPS.map((s, i) => {
              const active = i === stepIdx;
              const done = i < stepIdx;
              const Icon = s.icon;
              return (
                <li
                  key={s.key}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors",
                    active && "bg-primary/10 text-primary",
                    !active && done && "text-foreground/80",
                    !active && !done && "text-muted-foreground"
                  )}
                >
                  <span className={cn(
                    "size-7 rounded-full flex items-center justify-center text-[11px] font-semibold border",
                    active && "bg-primary text-primary-foreground border-primary",
                    done && "bg-success text-success-foreground border-success",
                    !active && !done && "border-border bg-surface"
                  )}>
                    {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                  </span>
                  <span className="font-medium">{s.label}</span>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="text-[11px] text-muted-foreground">Você pode ajustar tudo depois em Configurações.</p>
      </aside>

      {/* Content */}
      <main className="flex flex-col">
        <div className="flex-1 flex items-start justify-center p-6 lg:p-12">
          <div className="w-full max-w-xl">
            <div className="lg:hidden mb-6 flex items-center gap-2">
              <Logo />
              <span className="font-display font-semibold">DentalFlux</span>
              <span className="ml-auto text-[12px] text-muted-foreground">Passo {stepIdx + 1} de {STEPS.length}</span>
            </div>

            <div className="hidden lg:block text-[12px] text-muted-foreground mb-2">Passo {stepIdx + 1} de {STEPS.length}</div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {step.key === "clinica"      && "Dados da sua clínica"}
              {step.key === "responsaveis" && "Quem vai usar o DentalFlux?"}
              {step.key === "whatsapp"     && "Conecte seu WhatsApp"}
              {step.key === "pronto"       && "Tudo pronto! 💜"}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {step.key === "clinica"      && "Essas informações aparecem para seus pacientes nas mensagens e no portal."}
              {step.key === "responsaveis" && "Convide até 5 pessoas agora. Você pode adicionar mais depois."}
              {step.key === "whatsapp"     && "Sem WhatsApp, sem funil. Vamos conectar via Z-API ou Meta Cloud."}
              {step.key === "pronto"       && "Sua operação está pronta para começar a parar de perder pacientes."}
            </p>

            <div className="mt-6">
              {step.key === "clinica"      && <StepClinic state={state} setState={setState} />}
              {step.key === "responsaveis" && <StepTeam state={state} setState={setState} />}
              {step.key === "whatsapp"     && <StepWhatsApp state={state} setState={setState} />}
              {step.key === "pronto"       && <StepDone state={state} />}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-background/80 backdrop-blur px-6 lg:px-12 py-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            disabled={stepIdx === 0}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ArrowLeft className="size-3.5" /> Voltar
          </button>
          <div className="flex items-center gap-2">
            {stepIdx < STEPS.length - 1 && (
              <button
                onClick={() => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90"
              >
                Continuar <ArrowRight className="size-3.5" />
              </button>
            )}
            {stepIdx === STEPS.length - 1 && (
              <button
                onClick={finish}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90"
              >
                Entrar no Dashboard <ArrowRight className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-foreground/80 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputCls = "w-full h-10 rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring";

function StepClinic({ state, setState }: { state: OnboardingState; setState: React.Dispatch<React.SetStateAction<OnboardingState>> }) {
  const c = state.clinic;
  const toggle = (s: string) =>
    setState((p) => ({ ...p, clinic: { ...p.clinic, specialties: p.clinic.specialties.includes(s) ? p.clinic.specialties.filter((x) => x !== s) : [...p.clinic.specialties, s] } }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="size-16 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground">
          <Upload className="size-5" />
        </div>
        <div>
          <button className="h-8 px-3 rounded-md border border-input bg-surface text-[12.5px] font-medium hover:bg-muted">Enviar logo</button>
          <p className="mt-1 text-[11px] text-muted-foreground">PNG ou SVG · até 2 MB</p>
        </div>
      </div>
      <Field label="Nome da clínica">
        <input className={inputCls} value={c.name} onChange={(e) => setState((p) => ({ ...p, clinic: { ...p.clinic, name: e.target.value } }))} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CNPJ">
          <input className={inputCls} value={c.cnpj} onChange={(e) => setState((p) => ({ ...p, clinic: { ...p.clinic, cnpj: e.target.value } }))} />
        </Field>
        <Field label="Endereço">
          <input className={inputCls} value={c.address} onChange={(e) => setState((p) => ({ ...p, clinic: { ...p.clinic, address: e.target.value } }))} />
        </Field>
      </div>
      <Field label="Especialidades" hint="Selecione todas as que se aplicam">
        <div className="flex flex-wrap gap-1.5">
          {SPECIALTY_OPTIONS.map((s) => {
            const active = c.specialties.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className={cn(
                  "h-7 px-2.5 rounded-full text-[11.5px] font-medium border transition-colors",
                  active ? "bg-primary text-primary-foreground border-primary" : "border-border bg-surface text-foreground/70 hover:bg-muted"
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

const ROLES = ["Admin", "Recepção", "Dentista", "Marketing"];

function StepTeam({ state, setState }: { state: OnboardingState; setState: React.Dispatch<React.SetStateAction<OnboardingState>> }) {
  const add = () =>
    state.team.length < 5 &&
    setState((p) => ({ ...p, team: [...p.team, { name: "", email: "", role: "Recepção" }] }));
  const remove = (i: number) => setState((p) => ({ ...p, team: p.team.filter((_, idx) => idx !== i) }));
  const update = (i: number, patch: Partial<TeamMember>) =>
    setState((p) => ({ ...p, team: p.team.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }));

  return (
    <div className="space-y-3">
      {state.team.map((m, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-3 grid grid-cols-[1fr_1fr_140px_32px] gap-2 items-end">
          <Field label={i === 0 ? "Nome" : ""}>
            <input className={inputCls} value={m.name} placeholder="Nome completo" onChange={(e) => update(i, { name: e.target.value })} />
          </Field>
          <Field label={i === 0 ? "E-mail" : ""}>
            <input className={inputCls} value={m.email} placeholder="email@clinica.com" onChange={(e) => update(i, { email: e.target.value })} />
          </Field>
          <Field label={i === 0 ? "Papel" : ""}>
            <select className={inputCls} value={m.role} onChange={(e) => update(i, { role: e.target.value })}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <button
            onClick={() => remove(i)}
            disabled={state.team.length === 1}
            className="size-10 rounded-md hover:bg-muted text-muted-foreground flex items-center justify-center disabled:opacity-30"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        disabled={state.team.length >= 5}
        className="w-full h-10 rounded-md border border-dashed border-border text-[12.5px] text-muted-foreground hover:border-primary/40 hover:text-primary inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
      >
        <Plus className="size-3.5" /> Adicionar pessoa ({state.team.length}/5)
      </button>
    </div>
  );
}

function StepWhatsApp({ state, setState }: { state: OnboardingState; setState: React.Dispatch<React.SetStateAction<OnboardingState>> }) {
  const w = state.whatsapp;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(["z-api", "meta"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setState((s) => ({ ...s, whatsapp: { ...s.whatsapp, provider: p } }))}
            className={cn(
              "rounded-lg border p-4 text-left transition-colors",
              w.provider === p ? "border-primary bg-primary/5" : "border-border bg-surface hover:bg-muted/50"
            )}
          >
            <div className="text-[13px] font-semibold">{p === "z-api" ? "Z-API" : "Meta Cloud API"}</div>
            <div className="text-[11.5px] text-muted-foreground mt-1">
              {p === "z-api" ? "Mais rápido para começar — usa seu número existente." : "Oficial Meta — para volumes altos."}
            </div>
          </button>
        ))}
      </div>
      <Field label="Instância / Token" hint="Você encontra no painel do seu provedor.">
        <input className={inputCls} placeholder="ex: 3D9A0…F2" value={w.instance} onChange={(e) => setState((s) => ({ ...s, whatsapp: { ...s.whatsapp, instance: e.target.value } }))} />
      </Field>
      <Field label="Número do WhatsApp">
        <input className={inputCls} value={w.phone} onChange={(e) => setState((s) => ({ ...s, whatsapp: { ...s.whatsapp, phone: e.target.value } }))} />
      </Field>
      <button
        onClick={() => setState((s) => ({ ...s, whatsapp: { ...s.whatsapp, connected: true } }))}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md border border-input bg-surface text-[12.5px] font-medium hover:bg-muted"
      >
        {w.connected ? <><Check className="size-3.5 text-success" /> Conectado</> : "Conectar"}
      </button>
    </div>
  );
}

function StepDone({ state }: { state: OnboardingState }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Resumo</div>
        <dl className="mt-2 grid grid-cols-2 gap-y-2 text-[13px]">
          <dt className="text-muted-foreground">Clínica</dt><dd className="font-medium text-right">{state.clinic.name}</dd>
          <dt className="text-muted-foreground">Especialidades</dt><dd className="font-medium text-right">{state.clinic.specialties.length}</dd>
          <dt className="text-muted-foreground">Pessoas no time</dt><dd className="font-medium text-right">{state.team.length}</dd>
          <dt className="text-muted-foreground">WhatsApp</dt><dd className="font-medium text-right">{state.whatsapp.connected ? "Conectado" : "Pendente"}</dd>
        </dl>
      </div>
      <ul className="grid sm:grid-cols-3 gap-2">
        {[
          { t: "Funil pronto", d: "8 etapas configuradas" },
          { t: "Automações", d: "10 fluxos sugeridos" },
          { t: "Portal do paciente", d: "Link único por paciente" },
        ].map((x) => (
          <li key={x.t} className="rounded-lg border border-border bg-surface p-3">
            <div className="size-7 rounded-md bg-success/10 text-success flex items-center justify-center"><Check className="size-3.5" /></div>
            <div className="mt-2 text-[12.5px] font-medium">{x.t}</div>
            <div className="text-[11px] text-muted-foreground">{x.d}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Mount-safe noop to ensure useEffect import isn't pruned (kept minimal)
export function _ensureDeps() { useEffect(() => {}, []); }
