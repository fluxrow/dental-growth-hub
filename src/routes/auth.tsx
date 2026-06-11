import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/app/app-shell";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar · Dr. Flux" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message || "Falha ao entrar com Google");
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return; // browser is redirecting
      // Tokens set; redirect to onboarding/app — root listener will route.
      navigate({ to: "/onboarding", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro com Google");
      setGoogleLoading(false);
    }
  };

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
          <span className="font-display font-semibold tracking-tight">Dr. Flux</span>
        </Link>
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight leading-tight">
            Pare de perder
            <br />
            <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              os pacientes que já chegam.
            </span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-sm">
            Centralize WhatsApp, follow-up, confirmações, cobranças e avaliações em um único lugar.
          </p>
        </div>
        <p className="text-2xs text-muted-foreground">© Dr. Flux · LGPD compliant</p>
      </div>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-6 flex items-center gap-2 justify-center">
            <Logo />
            <span className="font-display font-semibold">Dr. Flux</span>
          </div>

          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 mb-6">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={
                  "px-3 h-8 rounded-md text-xs-plus font-medium transition-colors " +
                  (mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </h1>
          <p className="mt-1 text-sm-minus text-muted-foreground">
            {mode === "login" ? "Entre para acessar sua clínica" : "14 dias grátis · sem cartão"}
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={googleLoading || loading}
            className="mt-6 w-full h-10 rounded-md border border-input bg-background text-sm-minus font-medium hover:bg-muted inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <GoogleIcon />
                Continuar com Google
              </>
            )}
          </button>

          <div className="my-4 flex items-center gap-3 text-2xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            ou
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <Field label="Seu nome">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder="Dra. Marina Lopes"
                />
              </Field>
            )}
            <Field label="E-mail">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="voce@clinica.com"
              />
            </Field>
            <Field label="Senha">
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="Mínimo 6 caracteres"
              />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm-minus font-medium hover:opacity-90 inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Entrar" : "Criar conta"} <ArrowRight className="size-3.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            {mode === "login" ? "Novo no Dr. Flux? " : "Já tem conta? "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-primary hover:underline font-medium"
            >
              {mode === "login" ? "Criar conta grátis" : "Entrar"}
            </button>
          </p>
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

const inputCls =
  "w-full h-10 rounded-md border border-input bg-background px-3 text-sm-minus focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-foreground/80 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.67-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
