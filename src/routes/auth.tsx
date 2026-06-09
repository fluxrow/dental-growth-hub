import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/app/app-shell";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar · DentalFlux" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Vamos configurar sua clínica.");
        navigate({ to: "/onboarding", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/app", replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao autenticar";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-primary/10 via-accent to-background border-r border-border">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-display font-semibold tracking-tight">DentalFlux</span>
        </Link>
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight leading-tight">
            Pare de perder<br />
            <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">os pacientes que já chegam.</span>
          </h2>
          <p className="mt-4 text-[14px] text-muted-foreground max-w-sm">
            Centralize WhatsApp, follow-up, confirmações, cobranças e avaliações em um único lugar.
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground">© DentalFlux · LGPD compliant</p>
      </div>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-6 flex items-center gap-2 justify-center">
            <Logo />
            <span className="font-display font-semibold">DentalFlux</span>
          </div>

          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 mb-6">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={
                  "px-3 h-8 rounded-md text-[12.5px] font-medium transition-colors " +
                  (mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {mode === "login" ? "Entre para acessar sua clínica" : "14 dias grátis · sem cartão"}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <Field label="Seu nome">
                <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Dra. Marina Lopes" />
              </Field>
            )}
            <Field label="E-mail">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="voce@clinica.com" />
            </Field>
            <Field label="Senha">
              <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Mínimo 6 caracteres" />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : (
                <>{mode === "login" ? "Entrar" : "Criar conta"} <ArrowRight className="size-3.5" /></>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[12px] text-muted-foreground">
            {mode === "login" ? "Novo no DentalFlux? " : "Já tem conta? "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-primary hover:underline font-medium">
              {mode === "login" ? "Criar conta grátis" : "Entrar"}
            </button>
          </p>
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

const inputCls = "w-full h-10 rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-foreground/80 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
