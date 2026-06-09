import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Users,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Upload,
  Loader2,
  Database,
  MessageCircle,
  Star,
  Mail,
  Info,
} from "lucide-react";
import { Logo } from "@/components/app/app-shell";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { seedDemoData } from "@/lib/seed-demo";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Configurar clínica · DentalFlux" }] }),
  component: OnboardingWizard,
});

type StepKey = "clinica" | "responsaveis" | "agenda" | "pronto";

const STEPS: { key: StepKey; label: string; icon: typeof Building2 }[] = [
  { key: "clinica", label: "Clínica", icon: Building2 },
  { key: "responsaveis", label: "Responsáveis", icon: Users },
  { key: "agenda", label: "Agenda", icon: Calendar },
  { key: "pronto", label: "Pronto", icon: Sparkles },
];

type TeamMember = { name: string; email: string; role: string };
type OnboardingState = {
  clinic: {
    name: string;
    cnpj: string;
    address: string;
    specialties: string[];
    logoPath: string | null;
    logoPreview: string | null;
  };
  team: TeamMember[];
  calendar: { skipped: boolean; connected: boolean; accountEmail: string | null };
};

const INITIAL: OnboardingState = {
  clinic: {
    name: "",
    cnpj: "",
    address: "",
    specialties: [],
    logoPath: null,
    logoPreview: null,
  },
  team: [{ name: "", email: "", role: "Admin" }],
  calendar: { skipped: false, connected: false, accountEmail: null },
};

const SPECIALTY_OPTIONS = [
  "Clínica geral",
  "Ortodontia",
  "Implantodontia",
  "Estética",
  "Endodontia",
  "Periodontia",
  "Odontopediatria",
  "Próteses",
];

function OnboardingWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [stepIdx, setStepIdx] = useState(0);
  const [state, setState] = useState<OnboardingState>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [createdClinicId, setCreatedClinicId] = useState<string | null>(null);
  const step = STEPS[stepIdx];

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth", replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user?.email && state.team[0] && !state.team[0].email) {
      setState((p) => ({
        ...p,
        team: [{ name: user.user_metadata?.name || "", email: user.email!, role: "Admin" }],
      }));
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = async (): Promise<string | null> => {
    if (!user) return null;
    if (createdClinicId) return createdClinicId;
    setSaving(true);
    try {
      const slug =
        state.clinic.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || `clinica-${Date.now()}`;
      const { data: clinic, error: cErr } = await supabase
        .from("clinicas")
        .insert({
          name: state.clinic.name || "Minha Clínica",
          slug: `${slug}-${user.id.slice(0, 6)}`,
          cnpj: state.clinic.cnpj || null,
          address: state.clinic.address || null,
          specialties: state.clinic.specialties,
          logo_url: null,
          onboarded: true,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (cErr) throw cErr;

      await supabase
        .from("profiles")
        .update({
          clinic_id: clinic.id,
          name: state.team[0]?.name || user.user_metadata?.name || null,
        })
        .eq("id", user.id);

      await supabase.from("user_roles").insert({
        user_id: user.id,
        clinic_id: clinic.id,
        role: "admin",
      });

      // Upload da logo (se selecionada) — agora o RLS do bucket aceita pois clinic_id existe
      const pendingFile = (window as unknown as { __pendingLogo?: File }).__pendingLogo;
      if (pendingFile) {
        const ext = pendingFile.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${clinic.id}/logo.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("clinic-logos")
          .upload(path, pendingFile, { upsert: true, contentType: pendingFile.type });
        if (!upErr) {
          await supabase.from("clinicas").update({ logo_url: path }).eq("id", clinic.id);
        } else {
          toast.error("Logo não pôde ser salva: " + upErr.message);
        }
        delete (window as unknown as { __pendingLogo?: File }).__pendingLogo;
      }

      setCreatedClinicId(clinic.id);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Clínica configurada!");
      return clinic.id;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    // Persist clinic before agenda step so we can save the calendar connection.
    if (stepIdx === 1 || stepIdx === STEPS.length - 2) {
      const id = await persist();
      if (!id) return;
    }
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };

  const loadDemo = async () => {
    if (!user || !createdClinicId) return;
    setSeeding(true);
    try {
      const res = await seedDemoData(createdClinicId, user.id);
      toast.success(
        res.inserted
          ? "Dados demo carregados — 20 pacientes, 15 oportunidades, atividades."
          : "Dados demo já existiam.",
      );
      queryClient.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar demo");
    } finally {
      setSeeding(false);
    }
  };

  const finish = () => navigate({ to: "/app", replace: true });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[420px_1fr] bg-background">
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
            Em 4 passos rápidos seu time começa a parar de perder pacientes.
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
                    !active && !done && "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center text-[11px] font-semibold border",
                      active && "bg-primary text-primary-foreground border-primary",
                      done && "bg-success text-success-foreground border-success",
                      !active && !done && "border-border bg-surface",
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                  </span>
                  <span className="font-medium">{s.label}</span>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="text-[11px] text-muted-foreground">
          WhatsApp, avaliações no Google e e-mail transacional são configurados pela nossa equipe
          durante a implementação — fazem parte do plano de suporte e manutenção.
        </p>
      </aside>

      <main className="flex flex-col">
        <div className="flex-1 flex items-start justify-center p-6 lg:p-12">
          <div className="w-full max-w-xl">
            <div className="hidden lg:block text-[12px] text-muted-foreground mb-2">
              Passo {stepIdx + 1} de {STEPS.length}
            </div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {step.key === "clinica" && "Dados da sua clínica"}
              {step.key === "responsaveis" && "Quem vai usar o DentalFlux?"}
              {step.key === "agenda" && "Conecte a agenda da clínica"}
              {step.key === "pronto" && "Tudo pronto! 💜"}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {step.key === "clinica" && "Essas informações aparecem para seus pacientes."}
              {step.key === "responsaveis" &&
                "Você é o admin. Convites por e-mail vêm em uma próxima etapa."}
              {step.key === "agenda" &&
                "É a partir da agenda que o sistema dispara lembretes, confirma presença e detecta inativos."}
              {step.key === "pronto" &&
                "Sua clínica está salva. Carregue dados demo para explorar."}
            </p>

            <div className="mt-6">
              {step.key === "clinica" && (
                <StepClinic state={state} setState={setState} userId={user.id} />
              )}
              {step.key === "responsaveis" && <StepTeam state={state} setState={setState} />}
              {step.key === "agenda" && (
                <StepAgenda
                  state={state}
                  setState={setState}
                  clinicId={createdClinicId}
                  onEnsureClinic={persist}
                  loginEmail={user.email ?? null}
                  loginProvider={(user.app_metadata?.provider as string) ?? null}
                />
              )}
              {step.key === "pronto" && (
                <StepDone
                  state={state}
                  seeding={seeding}
                  onLoadDemo={loadDemo}
                  demoLoaded={!!createdClinicId}
                />
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-background/80 backdrop-blur px-6 lg:px-12 py-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            disabled={stepIdx === 0 || saving}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ArrowLeft className="size-3.5" /> Voltar
          </button>
          <div className="flex items-center gap-2">
            {stepIdx < STEPS.length - 1 && (
              <button
                onClick={next}
                disabled={saving}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <>
                    Continuar <ArrowRight className="size-3.5" />
                  </>
                )}
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
      <Toaster position="top-right" />
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-foreground/80 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full h-10 rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring";

function StepClinic({
  state,
  setState,
  userId,
}: {
  state: OnboardingState;
  setState: React.Dispatch<React.SetStateAction<OnboardingState>>;
  userId: string;
}) {
  const c = state.clinic;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const toggle = (s: string) =>
    setState((p) => ({
      ...p,
      clinic: {
        ...p.clinic,
        specialties: p.clinic.specialties.includes(s)
          ? p.clinic.specialties.filter((x) => x !== s)
          : [...p.clinic.specialties, s],
      },
    }));

  const onPickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo deve ter no máximo 2MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (PNG, JPG ou SVG).");
      return;
    }
    setUploading(true);
    try {
      // Pasta temporária pelo userId até a clínica existir; após persist movemos? Para Marco A: usamos userId como folder e gravamos path.
      // Storage policies exigem (foldername)[1] = current_clinic_id; ainda não existe.
      // Solução: usamos um path estável com userId, mas a policy não permitiria. Para isso preview é local; subida real ocorre após criação da clínica.
      // Aqui apenas geramos preview local — upload real é feito quando a clínica é persistida (próxima sprint refinar).
      const reader = new FileReader();
      reader.onload = () => {
        setState((p) => ({
          ...p,
          clinic: {
            ...p.clinic,
            logoPreview: reader.result as string,
            // Guardamos o dataURL temporariamente; será enviado ao bucket após persist.
            logoPath: `pending:${file.name}`,
          },
        }));
        // Persistimos o arquivo bruto em window para usar depois (sem ref global pesado).
        (window as unknown as { __pendingLogo?: File }).__pendingLogo = file;
        toast.success("Logo selecionada. Será enviada ao finalizar.");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao ler arquivo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
    // userId reservado para uso futuro
    void userId;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="size-16 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground overflow-hidden">
          {c.logoPreview ? (
            <img src={c.logoPreview} alt="Logo" className="size-full object-cover" />
          ) : (
            <Upload className="size-5" />
          )}
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={onPickLogo}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="h-8 px-3 rounded-md border border-input bg-surface text-[12.5px] font-medium hover:bg-muted disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {uploading && <Loader2 className="size-3 animate-spin" />}
            {c.logoPreview ? "Trocar logo" : "Enviar logo"}
          </button>
          <p className="mt-1 text-[11px] text-muted-foreground">PNG, JPG ou SVG · até 2MB</p>
        </div>
      </div>
      <Field label="Nome da clínica *">
        <input
          className={inputCls}
          placeholder="Clínica Sorriso Pleno"
          value={c.name}
          onChange={(e) =>
            setState((p) => ({ ...p, clinic: { ...p.clinic, name: e.target.value } }))
          }
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CNPJ">
          <input
            className={inputCls}
            placeholder="00.000.000/0000-00"
            value={c.cnpj}
            onChange={(e) =>
              setState((p) => ({ ...p, clinic: { ...p.clinic, cnpj: e.target.value } }))
            }
          />
        </Field>
        <Field label="Endereço">
          <input
            className={inputCls}
            placeholder="Av. Paulista, 1500"
            value={c.address}
            onChange={(e) =>
              setState((p) => ({ ...p, clinic: { ...p.clinic, address: e.target.value } }))
            }
          />
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
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-surface text-foreground/70 hover:bg-muted",
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

function StepTeam({
  state,
  setState,
}: {
  state: OnboardingState;
  setState: React.Dispatch<React.SetStateAction<OnboardingState>>;
}) {
  const add = () =>
    state.team.length < 5 &&
    setState((p) => ({ ...p, team: [...p.team, { name: "", email: "", role: "Recepção" }] }));
  const remove = (i: number) =>
    setState((p) => ({ ...p, team: p.team.filter((_, idx) => idx !== i) }));
  const update = (i: number, patch: Partial<TeamMember>) =>
    setState((p) => ({ ...p, team: p.team.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }));
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground rounded-md border border-dashed border-border bg-surface-muted/40 p-3">
        Você é o admin desta clínica. Convidar outros usuários por e-mail virá em breve — por
        enquanto, registre apenas seu papel.
      </p>
      {state.team.map((m, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-surface p-3 grid grid-cols-[1fr_1fr_140px_32px] gap-2 items-end"
        >
          <Field label={i === 0 ? "Nome" : ""}>
            <input
              className={inputCls}
              value={m.name}
              placeholder="Nome completo"
              onChange={(e) => update(i, { name: e.target.value })}
            />
          </Field>
          <Field label={i === 0 ? "E-mail" : ""}>
            <input
              className={inputCls}
              value={m.email}
              placeholder="email@clinica.com"
              onChange={(e) => update(i, { email: e.target.value })}
              disabled={i === 0}
            />
          </Field>
          <Field label={i === 0 ? "Papel" : ""}>
            <select
              className={inputCls}
              value={m.role}
              onChange={(e) => update(i, { role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={state.team.length === 1 || i === 0}
            className="size-10 rounded-md hover:bg-muted text-muted-foreground flex items-center justify-center disabled:opacity-30"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={state.team.length >= 5}
        className="w-full h-10 rounded-md border border-dashed border-border text-[12.5px] text-muted-foreground hover:border-primary/40 hover:text-primary inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
      >
        <Plus className="size-3.5" /> Adicionar pessoa ({state.team.length}/5)
      </button>
    </div>
  );
}

function StepAgenda({
  state,
  setState,
  clinicId,
  onEnsureClinic,
  loginEmail,
  loginProvider,
}: {
  state: OnboardingState;
  setState: React.Dispatch<React.SetStateAction<OnboardingState>>;
  clinicId: string | null;
  onEnsureClinic: () => Promise<string | null>;
  loginEmail: string | null;
  loginProvider: string | null;
}) {
  const isGoogleLogin = loginProvider === "google" && !!loginEmail;
  const [useLoginAccount, setUseLoginAccount] = useState(true);
  const benefits = [
    "Lembretes automáticos de consulta (24h e 2h antes) via WhatsApp.",
    "Confirmação de presença com resposta caindo direto no CRM.",
    "Detecção de no-show e reagendamento sugerido.",
    "Identificação de pacientes inativos (sem retorno há X meses).",
    "Sugestão de horários livres ao recepcionista durante o atendimento.",
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Calendar className="size-5" />
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold">Google Calendar da clínica</div>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Sem a agenda conectada, as funcionalidades abaixo ficam pausadas. É o coração da
              automação do DentalFlux.
            </p>
            <ul className="mt-3 space-y-1.5">
              {benefits.map((b) => (
                <li key={b} className="flex gap-2 text-[12.5px] text-foreground/80">
                  <Check className="size-3.5 mt-0.5 text-primary shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            {isGoogleLogin && !state.calendar.connected && (
              <div className="mt-4 rounded-lg border border-border bg-background p-3">
                <div className="text-[12.5px] font-medium">
                  Você entrou com <span className="text-primary">{loginEmail}</span>
                </div>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Usar essa mesma conta como agenda da clínica? (1 clique pra autorizar o Calendar)
                </p>
                <div className="mt-2 inline-flex rounded-md border border-border bg-surface p-0.5">
                  <button
                    type="button"
                    onClick={() => setUseLoginAccount(true)}
                    className={cn(
                      "px-3 h-7 rounded text-[11.5px] font-medium transition-colors",
                      useLoginAccount
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Usar esta conta
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseLoginAccount(false)}
                    className={cn(
                      "px-3 h-7 rounded text-[11.5px] font-medium transition-colors",
                      !useLoginAccount
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Escolher outra
                  </button>
                </div>
              </div>
            )}

            <CalendarConnectButton
              clinicId={clinicId}
              onEnsureClinic={onEnsureClinic}
              connected={state.calendar.connected}
              accountEmail={state.calendar.accountEmail}
              loginHint={isGoogleLogin && useLoginAccount ? loginEmail : null}
              expectedEmail={isGoogleLogin && useLoginAccount ? loginEmail : null}
              onConnected={(email) =>
                setState((p) => ({
                  ...p,
                  calendar: { skipped: false, connected: true, accountEmail: email },
                }))
              }
              onDisconnected={() =>
                setState((p) => ({
                  ...p,
                  calendar: { ...p.calendar, connected: false, accountEmail: null },
                }))
              }
            />

          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          setState((p) => ({ ...p, calendar: { ...p.calendar, skipped: !p.calendar.skipped } }))
        }
        className={cn(
          "w-full text-left rounded-lg border p-3 text-[12px] transition-colors",
          state.calendar.skipped
            ? "border-warning/40 bg-warning/5 text-foreground"
            : "border-dashed border-border bg-surface text-muted-foreground hover:bg-muted/40",
        )}
      >
        <div className="flex items-center gap-2">
          <Info className="size-3.5" />
          <span className="font-medium">
            {state.calendar.skipped
              ? "Você optou por pular — as funções acima ficarão bloqueadas até conectar."
              : "Pular por agora (não recomendado)"}
          </span>
        </div>
      </button>
    </div>
  );
}

function StepDone({
  state,
  seeding,
  onLoadDemo,
  demoLoaded,
}: {
  state: OnboardingState;
  seeding: boolean;
  onLoadDemo: () => void;
  demoLoaded: boolean;
}) {
  const channels: { key: string; label: string; icon: typeof Calendar; status: "pending" | "skipped" }[] = [
    { key: "calendar", label: "Agenda Google", icon: Calendar, status: state.calendar.skipped ? "skipped" : "pending" },
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, status: "pending" },
    { key: "reviews", label: "Avaliações Google", icon: Star, status: "pending" },
    { key: "email", label: "E-mail transacional", icon: Mail, status: "pending" },
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Resumo
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-y-2 text-[13px]">
          <dt className="text-muted-foreground">Clínica</dt>
          <dd className="font-medium text-right">{state.clinic.name || "—"}</dd>
          <dt className="text-muted-foreground">Especialidades</dt>
          <dd className="font-medium text-right">{state.clinic.specialties.length}</dd>
          <dt className="text-muted-foreground">Logo</dt>
          <dd className="font-medium text-right">{state.clinic.logoPreview ? "Selecionada" : "—"}</dd>
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Canais de integração
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {channels.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.key}
                className="rounded-lg border border-border bg-background p-3 flex items-start gap-2"
              >
                <Icon className="size-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="text-[12.5px] font-medium">{c.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {c.status === "skipped"
                      ? "Pulado · conectar depois"
                      : "Pendente · ativaremos na implementação"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Nossa equipe configura WhatsApp, avaliações do Google e e-mail transacional durante a
          implementação. Você não precisa contratar APIs separadas.
        </p>
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Database className="size-4.5" />
          </div>
          <div className="flex-1">
            <div className="text-[13.5px] font-semibold">Carregar dados demo?</div>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              Adiciona 20 pacientes, 15 oportunidades, atividades e notificações para explorar a
              plataforma. Você pode apagar depois.
            </p>
            <button
              type="button"
              onClick={onLoadDemo}
              disabled={seeding || !demoLoaded}
              className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 disabled:opacity-60"
            >
              {seeding ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Database className="size-3.5" />
              )}
              {seeding ? "Carregando…" : "Carregar dados demo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarConnectButton({
  clinicId,
  onEnsureClinic,
  connected,
  accountEmail,
  loginHint,
  expectedEmail,
  onConnected,
  onDisconnected,
}: {
  clinicId: string | null;
  onEnsureClinic: () => Promise<string | null>;
  connected: boolean;
  accountEmail: string | null;
  loginHint?: string | null;
  expectedEmail?: string | null;
  onConnected: (email: string | null) => void;
  onDisconnected: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const id = clinicId ?? (await onEnsureClinic());
      if (!id) {
        toast.error("Salve os dados da clínica antes de conectar a agenda.");
        return;
      }
      const { startGoogleCalendarConnect } = await import("@/lib/googleCalendar.functions");
      const { authorizationUrl } = await startGoogleCalendarConnect({
        data: { clinicId: id, loginHint: loginHint ?? undefined },
      });

      const w = 520;
      const h = 640;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      const popup = window.open(
        authorizationUrl,
        "google-oauth",
        `width=${w},height=${h},left=${left},top=${top}`,
      );
      if (!popup) {
        toast.error("Popup bloqueado. Permita popups e tente novamente.");
        return;
      }

      const result = await new Promise<{ ok: boolean; email?: string | null; error?: string }>(
        (resolve) => {
          const onMsg = (ev: MessageEvent) => {
            if (ev.origin !== window.location.origin) return;
            const d = ev.data as { type?: string; payload?: typeof result };
            if (d?.type === "google-oauth-result" && d.payload) {
              window.removeEventListener("message", onMsg);
              clearInterval(poll);
              resolve(d.payload);
            }
          };
          window.addEventListener("message", onMsg);
          const poll = setInterval(() => {
            if (popup.closed) {
              clearInterval(poll);
              window.removeEventListener("message", onMsg);
              resolve({ ok: false, error: "popup_closed" });
            }
          }, 500);
        },
      );

      if (!result.ok) {
        toast.error("Não foi possível conectar" + (result.error ? `: ${result.error}` : ""));
        return;
      }
      onConnected(result.email ?? null);
      toast.success("Google Calendar conectado!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conectar");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!clinicId) return;
    setBusy(true);
    try {
      const { disconnectGoogleCalendar } = await import("@/lib/googleCalendar.functions");
      await disconnectGoogleCalendar({ data: { clinicId } });
      onDisconnected();
      toast.success("Conexão removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desconectar");
    } finally {
      setBusy(false);
    }
  };

  if (connected) {
    return (
      <div className="mt-4">
        <div className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-success/10 text-success border border-success/30 text-[13px] font-medium">
          <Check className="size-4" />
          Conectado{accountEmail ? ` · ${accountEmail}` : ""}
        </div>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={busy}
          className="ml-2 inline-flex items-center gap-1.5 h-10 px-3 rounded-md text-[12.5px] text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Desconectar"}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleConnect}
        disabled={busy}
        className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Calendar className="size-4" />}
        Conectar com Google
      </button>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Abre um popup do Google para você autorizar acesso à agenda da clínica.
      </p>
    </>
  );
}
