import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { CLINIC, INTEGRATIONS, PLANS, TEAM } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · DentalFlux" }] }),
  component: Configuracoes,
});

const TABS = ["Clínica", "Usuários", "WhatsApp", "Integrações", "Planos"] as const;

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
                "px-3 h-7 rounded-md text-[12.5px]",
                tab === t ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === "Clínica" && <ClinicTab/>}
          {tab === "Usuários" && <UsersTab/>}
          {tab === "WhatsApp" && <WhatsTab/>}
          {tab === "Integrações" && <IntegrationsTab/>}
          {tab === "Planos" && <PlansTab/>}
        </div>
      </div>
    </AppShell>
  );
}

function ClinicTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
      <Field label="Nome da clínica" value={CLINIC.name}/>
      <Field label="Slug (subdomínio)" value={`${CLINIC.slug}.dentalflux.app`}/>
      <Field label="Cidade" value={CLINIC.city}/>
      <Field label="Telefone principal" value="(11) 3333-4444"/>
      <Field label="Horário de atendimento" value="Seg–Sex 08:00–19:00 · Sáb 08:00–13:00" full/>
      <div className="md:col-span-2">
        <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground mb-2">Logo</div>
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-primary-foreground font-display text-xl font-semibold">SP</div>
          <button className="h-8 px-3 rounded-md border border-input bg-background text-[12px]">Trocar logo</button>
        </div>
      </div>
      <div className="md:col-span-2 flex justify-end pt-4">
        <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-90">Salvar alterações</button>
      </div>
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={cn(full && "md:col-span-2")}>
      <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      <input defaultValue={value} className="w-full h-9 rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"/>
    </div>
  );
}

function UsersTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] text-muted-foreground">{TEAM.length} usuários no time</div>
        <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-90"><Plus className="size-3.5"/> Convidar usuário</button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-muted/40">
            <tr><th className="text-left font-medium px-4 py-2.5">Usuário</th><th className="text-left font-medium px-4 py-2.5">Email</th><th className="text-left font-medium px-4 py-2.5">Função</th><th className="text-left font-medium px-4 py-2.5">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {TEAM.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3"><span className="inline-flex rounded-md bg-accent text-accent-foreground px-2 py-0.5 text-[11.5px] font-medium">{u.role}</span></td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-[11.5px] text-success"><span className="size-1.5 rounded-full bg-success"/> Ativo</span></td>
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
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-5"><path d="M20 4a16 16 0 0 0-13.6 24.4L4 36l7.8-2.4A16 16 0 1 0 20 4Z"/></svg>
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold">WhatsApp Business via Z-API</div>
            <div className="text-[12px] text-muted-foreground">Conecte sua linha do WhatsApp em poucos minutos.</div>
          </div>
        </div>
        <ol className="space-y-2 text-[13px] text-foreground/80 mb-4 list-decimal pl-4">
          <li>Crie uma conta gratuita na Z-API</li>
          <li>Copie o token e o ID da instância</li>
          <li>Cole nos campos abaixo e ative</li>
        </ol>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Instance ID" value=""/>
          <Field label="Token" value=""/>
        </div>
        <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-90">Conectar WhatsApp</button>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {INTEGRATIONS.map((i) => (
        <div key={i.id} className="rounded-lg border border-border bg-background p-4 flex flex-col">
          <div className="text-[13.5px] font-semibold">{i.name}</div>
          <div className="text-[12px] text-muted-foreground mt-1 flex-1">{i.desc}</div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{i.connected ? "Conectada" : "Em breve"}</span>
            <button className={cn("h-8 px-3 rounded-md text-[12px] font-medium", i.connected ? "bg-success/10 text-success" : "border border-input bg-background hover:bg-muted")}>
              {i.connected ? "Configurar" : "Conectar"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlansTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {PLANS.map((p) => (
        <div key={p.id} className={cn(
          "rounded-xl border p-5 flex flex-col",
          p.highlighted ? "border-primary/40 bg-gradient-to-br from-primary/5 to-chart-2/5 shadow-[0_8px_24px_-12px_oklch(0.55_0.2_275/0.3)]" : "border-border bg-background",
        )}>
          {p.highlighted && <div className="inline-block self-start text-[10.5px] font-semibold uppercase tracking-wider text-primary mb-2">Mais escolhido</div>}
          <div className="font-display text-xl font-semibold">{p.name}</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-display text-3xl font-semibold tabular-nums">{p.price}</span>
            <span className="text-[12px] text-muted-foreground">{p.per}</span>
          </div>
          <ul className="mt-4 space-y-2 flex-1">
            {p.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[13px]">
                <Check className="size-3.5 text-success mt-0.5 shrink-0"/> {f}
              </li>
            ))}
          </ul>
          <button className={cn(
            "mt-5 h-9 rounded-md text-[12.5px] font-medium",
            p.highlighted ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-input bg-background hover:bg-muted",
          )}>
            {p.highlighted ? "Plano atual" : "Trocar plano"}
          </button>
        </div>
      ))}
    </div>
  );
}
