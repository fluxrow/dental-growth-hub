import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  MessageCircle,
  Repeat,
  CalendarCheck,
  Star,
  TrendingUp,
  ShieldCheck,
  Zap,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { Logo } from "@/components/app/app-shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DentalFlux — Pare de perder pacientes" },
      {
        name: "description",
        content:
          "Plataforma de crescimento e relacionamento para clínicas odontológicas. Centralize WhatsApp, follow-up, confirmações, reativações, cobranças e avaliações.",
      },
      { property: "og:title", content: "DentalFlux — Pare de perder pacientes" },
      {
        property: "og:description",
        content:
          "Sua clínica não precisa de mais pacientes. Precisa parar de perder os que já chegam.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <SocialProof />
      <Problem />
      <HowItWorks />
      <FunnelSection />
      <Benefits />
      <Results />
      <Testimonials />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-background/75 border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-display font-semibold tracking-tight text-[15px]">DentalFlux</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm-minus text-muted-foreground">
          <a href="#problema" className="hover:text-foreground">
            Problema
          </a>
          <a href="#funil" className="hover:text-foreground">
            Funil
          </a>
          <a href="#beneficios" className="hover:text-foreground">
            Benefícios
          </a>
          <a href="#resultados" className="hover:text-foreground">
            Resultados
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden sm:inline text-sm-minus text-muted-foreground hover:text-foreground px-3 py-1.5"
          >
            Entrar
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-primary-foreground text-sm-minus font-medium hover:opacity-90"
          >
            Começar grátis <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-br from-primary/10 via-chart-2/5 to-transparent blur-3xl rounded-full" />
      </div>
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 lg:pt-28 lg:pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground mb-6">
            <Sparkles className="size-3 text-primary" />
            Plataforma de crescimento para clínicas odontológicas
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
            Sua clínica não precisa de
            <br />
            <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              mais pacientes.
            </span>{" "}
            Precisa parar de perder
            <br />
            os que já chegam.
          </h1>
          <p className="mt-6 text-[16px] lg:text-[17px] text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Centralize atendimento, follow-up, confirmações, reativações, cobranças e avaliações em
            um único lugar. Sem ERP. Sem agenda complicada. Foco no que importa: converter mais e
            reter melhor.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 shadow-[0_8px_24px_-8px_oklch(0.55_0.2_275/0.4)]"
            >
              Começar gratuitamente <ArrowRight className="size-4" />
            </Link>
            <a
              href="#funil"
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-md border border-input bg-surface text-sm font-medium hover:bg-muted"
            >
              Ver como funciona
            </a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            14 dias grátis · sem cartão de crédito · setup em 10 minutos
          </p>
        </div>

        <DashboardMockup />
      </div>
    </section>
  );
}

function DashboardMockup() {
  return (
    <div className="mt-14 relative">
      <div className="rounded-2xl border border-border bg-surface shadow-[0_30px_80px_-30px_oklch(0.55_0.2_275/0.35)] overflow-hidden">
        <div className="h-9 bg-muted/60 border-b border-border flex items-center px-3 gap-1.5">
          <span className="size-2.5 rounded-full bg-destructive/60" />
          <span className="size-2.5 rounded-full bg-warning/60" />
          <span className="size-2.5 rounded-full bg-success/60" />
          <span className="ml-3 text-2xs text-muted-foreground">
            sorrisopleno.dentalflux.app
          </span>
        </div>
        <div className="grid grid-cols-12 min-h-[420px]">
          <div className="col-span-3 border-r border-border bg-sidebar p-4 hidden md:block">
            <div className="flex items-center gap-2 mb-5">
              <Logo />
              <span className="font-display font-semibold text-sm-minus">DentalFlux</span>
            </div>
            {[
              "Dashboard",
              "Oportunidades",
              "Conversas",
              "Pacientes",
              "Campanhas",
              "Automações",
              "Cobranças",
              "Avaliações",
              "Relatórios",
            ].map((label, i) => (
              <div
                key={label}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs mb-0.5 ${
                  i === 0 ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                <span className="size-3.5 rounded-sm bg-current opacity-60" />
                {label}
              </div>
            ))}
          </div>
          <div className="col-span-12 md:col-span-9 p-5 bg-background">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm-minus font-semibold">Visão geral</div>
                <div className="text-2xs text-muted-foreground">Últimos 30 dias</div>
              </div>
              <div className="flex gap-1">
                {["7d", "30d", "90d"].map((p, i) => (
                  <span
                    key={p}
                    className={`px-2 py-1 rounded text-3xs ${i === 1 ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {[
                { l: "Leads", v: "248", d: "+12%", c: "text-success" },
                { l: "Agendados", v: "164", d: "+9%", c: "text-success" },
                { l: "Recuperados", v: "37", d: "+41%", c: "text-success" },
                { l: "Conversão", v: "21.4%", d: "+3.6%", c: "text-success" },
              ].map((k) => (
                <div key={k.l} className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-3xs text-muted-foreground">{k.l}</div>
                  <div className="font-display font-semibold text-xl tabular-nums">{k.v}</div>
                  <div className={`text-3xs tabular-nums ${k.c}`}>{k.d}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="text-xs font-semibold mb-3">Funil DentalFlux</div>
              {[
                ["Lead", 248, 100],
                ["Primeiro Contato", 231, 93],
                ["Agendamento", 164, 71],
                ["Comparecimento", 141, 86],
                ["Tratamento", 98, 69],
                ["Avaliação", 53, 54],
              ].map(([s, n, p]) => (
                <div key={s as string} className="flex items-center gap-2 mb-1.5">
                  <div className="w-28 text-2xs text-foreground/80">{s}</div>
                  <div className="flex-1 h-5 bg-muted/60 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-chart-2 flex items-center px-1.5 text-3xs font-semibold text-primary-foreground"
                      style={{ width: `${(Number(n) / 248) * 100}%` }}
                    >
                      {n}
                    </div>
                  </div>
                  <div className="w-10 text-right text-3xs text-muted-foreground tabular-nums">
                    {p}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialProof() {
  return (
    <section className="border-y border-border bg-surface-muted">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-muted-foreground text-xs">
        <span className="text-foreground/60 font-medium">Clínicas que usam DentalFlux:</span>
        <span className="font-display tracking-tight text-[15px]">Sorriso Pleno</span>
        <span className="font-display tracking-tight text-[15px]">OdontoVita</span>
        <span className="font-display tracking-tight text-[15px]">Clínica Ipanema</span>
        <span className="font-display tracking-tight text-[15px]">Espaço Oral</span>
        <span className="font-display tracking-tight text-[15px]">Dental Premium</span>
        <span className="font-display tracking-tight text-[15px]">Clínica Boa Vista</span>
      </div>
    </section>
  );
}

function Problem() {
  const dores = [
    "Demora horas para responder o WhatsApp",
    "Não faz follow-up de quem pediu orçamento",
    "Não confirma consultas e leva faltas",
    "Não reativa pacientes antigos",
    "Não acompanha de onde vêm os leads",
    "Não pede avaliação no Google",
  ];
  return (
    <section id="problema" className="py-20 lg:py-28">
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-block text-xs font-medium text-primary mb-3">O problema</div>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold tracking-tight leading-tight">
            Você gasta em Ads.
            <br />E perde no WhatsApp.
          </h2>
          <p className="mt-5 text-[15px] text-muted-foreground leading-relaxed">
            A maior parte das clínicas que conhecemos investe pesado em Google Ads, Instagram, Meta
            Ads e indicações. O lead chega. E morre em uma conversa esquecida, uma confirmação não
            enviada, um orçamento sem follow-up.
          </p>
          <p className="mt-4 text-[15px] font-medium">
            O problema não é gerar demanda. É converter o que já chega.
          </p>
        </div>
        <div className="space-y-2.5">
          {dores.map((d) => (
            <div
              key={d}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <div className="size-7 rounded-md bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </div>
              <div className="text-sm text-foreground/85">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Conecte seus canais",
      desc: "WhatsApp, Google, Instagram, indicações. Tudo entrando num funil único.",
      icon: Zap,
    },
    {
      n: "02",
      title: "Acompanhe a jornada",
      desc: "Veja onde cada paciente está, quem precisa de follow-up e qual a próxima ação.",
      icon: BarChart3,
    },
    {
      n: "03",
      title: "Recupere receita",
      desc: "Automações de confirmação, reativação, cobrança e avaliação trabalhando 24/7.",
      icon: TrendingUp,
    },
  ];
  return (
    <section className="py-20 lg:py-24 bg-surface-muted/50 border-y border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs font-medium text-primary mb-3">Como funciona</div>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold tracking-tight">
            Três passos para transformar sua operação
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="rounded-xl border border-border bg-surface p-6">
                <div className="text-2xs font-mono text-muted-foreground">{s.n}</div>
                <div className="mt-3 size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FunnelSection() {
  const stages = [
    "Lead",
    "Primeiro Contato",
    "Agendamento",
    "Comparecimento",
    "Tratamento",
    "Retorno",
    "Avaliação",
    "Indicação",
  ];
  return (
    <section id="funil" className="py-20 lg:py-28">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs font-medium text-primary mb-3">O Funil DentalFlux</div>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold tracking-tight">
            Da primeira mensagem à indicação
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground">
            Cada etapa com automações, alertas e indicadores. Nada cai por esquecimento.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 lg:p-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stages.map((s, i) => (
              <div key={s} className="relative rounded-lg border border-border bg-background p-4">
                <div className="text-3xs font-mono text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mt-1 font-display text-sm font-semibold tracking-tight">
                  {s}
                </div>
                <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-chart-2"
                    style={{ width: `${100 - i * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const benefits = [
    {
      icon: MessageCircle,
      title: "Resposta rápida no WhatsApp",
      desc: "Inbox unificado com contexto do paciente. Templates prontos. Ninguém fica sem resposta.",
    },
    {
      icon: Repeat,
      title: "Follow-up automático",
      desc: "Quem pediu orçamento e sumiu volta para o funil. Sequências configuráveis.",
    },
    {
      icon: Repeat,
      title: "Reativação de inativos",
      desc: "Pacientes sem visita há 6+ meses entram em campanhas automáticas.",
    },
    {
      icon: CalendarCheck,
      title: "Confirmação inteligente",
      desc: "Mensagens 24h e 2h antes. Reagendamento em 1 clique. Menos faltas.",
    },
    {
      icon: Star,
      title: "Avaliações no Google",
      desc: "Pedido automático após o atendimento. Sua reputação cresce no piloto automático.",
    },
    {
      icon: BarChart3,
      title: "Indicadores claros",
      desc: "Conversão por etapa, origem dos leads, receita recuperada, taxa de comparecimento.",
    },
  ];
  return (
    <section id="beneficios" className="py-20 lg:py-28 bg-surface-muted/50 border-y border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs font-medium text-primary mb-3">Benefícios</div>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold tracking-tight">
            O que sua clínica passa a fazer no automático
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="rounded-xl border border-border bg-surface p-5">
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="size-4.5" />
                </div>
                <h3 className="mt-3 font-display font-semibold text-[15px] tracking-tight">
                  {b.title}
                </h3>
                <p className="mt-1.5 text-sm-minus text-muted-foreground leading-relaxed">
                  {b.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Results() {
  const stats = [
    { v: "+38%", l: "Pacientes recuperados em 60 dias" },
    { v: "−42%", l: "Faltas em consultas confirmadas" },
    { v: "R$ 86k", l: "Receita média recuperada/mês" },
    { v: "4.8★", l: "Nota média Google após automação" },
  ];
  return (
    <section id="resultados" className="py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-accent/30 p-8 lg:p-12">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-xs font-medium text-primary mb-3">Resultados</div>
            <h2 className="font-display text-3xl lg:text-4xl font-semibold tracking-tight">
              Números reais de clínicas que pararam de perder pacientes
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-display text-3xl lg:text-4xl font-semibold tracking-tight bg-gradient-to-br from-primary to-chart-2 bg-clip-text text-transparent tabular-nums">
                  {s.v}
                </div>
                <div className="mt-2 text-xs-plus text-muted-foreground leading-snug">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      quote:
        "Antes eu perdia uma média de 15 pacientes por mês só por não responder rápido. Hoje converto quase tudo.",
      name: "Dra. Marina Lopes",
      role: "Sorriso Pleno · São Paulo",
    },
    {
      quote:
        "A reativação de inativos pagou o sistema em duas semanas. Pacientes que eu tinha esquecido voltaram.",
      name: "Dr. Caio Fernandes",
      role: "OdontoVita · Belo Horizonte",
    },
    {
      quote: "Saímos de 4.2 para 4.8 no Google em três meses. As avaliações vêm sozinhas agora.",
      name: "Camila Reis",
      role: "Clínica Ipanema · Rio de Janeiro",
    },
  ];
  return (
    <section className="py-20 lg:py-24 bg-surface-muted/50 border-y border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-medium text-primary mb-3">Depoimentos</div>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold tracking-tight">
            Donos de clínica que respiram melhor
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {items.map((t) => (
            <figure key={t.name} className="rounded-xl border border-border bg-surface p-6">
              <div className="flex gap-0.5 mb-3 text-warning">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-current" />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed text-foreground/85">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-5 pt-4 border-t border-border">
                <div className="text-sm-minus font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="py-24 lg:py-32">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="font-display text-3xl lg:text-5xl font-semibold tracking-tight leading-tight">
          Pare de perder pacientes hoje.
        </h2>
        <p className="mt-5 text-[15px] lg:text-[16px] text-muted-foreground">
          Em 10 minutos sua clínica está conectada. Em 7 dias você já vê o primeiro paciente
          recuperado.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 h-12 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 shadow-[0_8px_24px_-8px_oklch(0.55_0.2_275/0.4)]"
          >
            Começar gratuitamente <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-success" /> 14 dias grátis
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-success" /> Sem cartão
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-success" /> LGPD
          </span>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-muted/40">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-wrap justify-between gap-6">
        <div className="max-w-xs">
          <div className="flex items-center gap-2 mb-3">
            <Logo />
            <span className="font-display font-semibold tracking-tight">DentalFlux</span>
          </div>
          <p className="text-xs-plus text-muted-foreground leading-relaxed">
            Plataforma de crescimento, relacionamento e recuperação de pacientes para clínicas
            odontológicas.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-2 text-sm-minus">
          <div className="space-y-2">
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Produto
            </div>
            <a href="#funil" className="block text-foreground/80 hover:text-foreground">
              Funil
            </a>
            <a href="#beneficios" className="block text-foreground/80 hover:text-foreground">
              Benefícios
            </a>
            <Link to="/auth" className="block text-foreground/80 hover:text-foreground">
              Demonstração
            </Link>
          </div>
          <div className="space-y-2">
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Empresa
            </div>
            <a className="block text-foreground/80 hover:text-foreground" href="#">
              Sobre
            </a>
            <a className="block text-foreground/80 hover:text-foreground" href="#">
              Contato
            </a>
            <a className="block text-foreground/80 hover:text-foreground" href="#">
              Blog
            </a>
          </div>
          <div className="space-y-2">
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Legal
            </div>
            <a className="block text-foreground/80 hover:text-foreground" href="#">
              Termos
            </a>
            <a className="block text-foreground/80 hover:text-foreground" href="#">
              Privacidade
            </a>
            <a className="block text-foreground/80 hover:text-foreground" href="#">
              LGPD
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-5 text-xs text-muted-foreground flex flex-wrap justify-between gap-3">
          <div>© 2026 DentalFlux. Todos os direitos reservados.</div>
          <div>Feito no Brasil 🇧🇷</div>
        </div>
      </div>
    </footer>
  );
}
