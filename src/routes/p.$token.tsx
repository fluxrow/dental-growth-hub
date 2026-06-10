import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Star,
  MessageSquareText,
  CalendarCheck,
  Receipt,
  CircleDot,
} from "lucide-react";
import { getPortalData, OPP_STAGES, type PortalData, type PortalTimelineEvent } from "@/lib/mock";

import { BillingCard } from "@/components/portal/billing-card";
import { BillingHistory } from "@/components/portal/billing-history";
import { Logo } from "@/components/app/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/p/$token")({
  head: () => ({ meta: [{ title: "Portal do Paciente · DentalFlux" }] }),
  loader: ({ params }) => {
    const data = getPortalData(params.token);
    if (!data) throw notFound();
    return data;
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Portal não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Verifique o link enviado pela clínica.</p>
      </div>
    </div>
  ),
  component: PatientPortal,
});

const ICON_MAP: Record<PortalTimelineEvent["type"], typeof MessageSquareText> = {
  mensagem: MessageSquareText,
  confirmacao: CalendarCheck,
  consulta: CheckCircle2,
  documento: FileText,
  cobranca: Receipt,
};

function PatientPortal() {
  const data = Route.useLoaderData() as PortalData;
  const currentStageIdx = OPP_STAGES.findIndex((s) => s.id === data.treatment.stage);
  const currentStage = OPP_STAGES[currentStageIdx];

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 to-background">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Logo />
          <div className="flex-1 min-w-0">
            <div className="text-sm-minus font-semibold truncate">{data.clinic.name}</div>
            <div className="text-2xs text-muted-foreground truncate">{data.clinic.city}</div>
          </div>
          <span className="text-2xs rounded-full bg-primary/10 text-primary px-2.5 py-1 font-medium">
            Portal do paciente
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5 pb-16">
        {/* Greeting */}
        <div>
          <div className="text-xs text-muted-foreground">Olá,</div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            {data.patient.name}
          </h1>
          <p className="mt-1 text-sm-minus text-muted-foreground">
            Acompanhe seu tratamento, próximas consultas e pagamentos em um só lugar.
          </p>
        </div>

        {/* Treatment status */}
        <section className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-2xs uppercase tracking-wider text-muted-foreground font-medium">
                  Etapa atual
                </div>
                <div className="mt-1 text-[15px] font-semibold">{currentStage?.label}</div>
              </div>
              <div className="text-right">
                <div className="text-2xs uppercase tracking-wider text-muted-foreground font-medium">
                  Progresso
                </div>
                <div className="mt-1 text-[15px] font-semibold tabular-nums">
                  {data.treatment.progress}%
                </div>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-chart-2"
                style={{ width: `${data.treatment.progress}%` }}
              />
            </div>
            <ol className="mt-4 grid grid-cols-7 gap-1">
              {OPP_STAGES.map((s, i) => (
                <li key={s.id} className="flex flex-col items-center gap-1">
                  <CircleDot
                    className={cn(
                      "size-3",
                      i <= currentStageIdx ? "text-primary" : "text-muted-foreground/40",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[9px] text-center leading-tight",
                      i === currentStageIdx
                        ? "text-primary font-medium"
                        : "text-muted-foreground/70",
                    )}
                  >
                    {s.label.split(" ")[0]}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {data.treatment.nextAppointment && (
            <div className="border-t border-border bg-accent/50 px-5 py-4">
              <div className="text-2xs uppercase tracking-wider text-muted-foreground font-medium">
                Próxima consulta
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm-minus">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  {data.treatment.nextAppointment.date}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" />
                  {data.treatment.nextAppointment.time}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" />
                  {data.treatment.nextAppointment.room}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                com {data.treatment.nextAppointment.dentist}
              </div>
            </div>
          )}
        </section>

        {/* Billing */}
        <BillingCard billing={data.billing} firstName={data.patient.firstName} />

        {/* Billing history */}
        <BillingHistory items={data.billingHistory} />

        {/* Timeline */}
        <section className="rounded-2xl border border-border bg-surface">
          <header className="px-5 h-12 flex items-center border-b border-border">
            <h2 className="text-sm font-semibold tracking-tight">Linha do tempo</h2>
          </header>
          <ol className="p-5 space-y-4">
            {data.timeline.map((e) => {
              const Icon = ICON_MAP[e.type];
              return (
                <li key={e.id} className="flex gap-3">
                  <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm-minus font-medium">{e.title}</div>
                    {e.description && (
                      <div className="text-xs text-muted-foreground">{e.description}</div>
                    )}
                    <div className="text-2xs text-muted-foreground mt-0.5">{e.date}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Review */}
        <ReviewCard />

        {/* Documents */}
        <section className="rounded-2xl border border-border bg-surface">
          <header className="px-5 h-12 flex items-center justify-between border-b border-border">
            <h2 className="text-sm font-semibold tracking-tight">Documentos & orçamentos</h2>
          </header>
          <ul className="divide-y divide-border">
            {data.documents.map((d) => (
              <li key={d.id} className="px-5 py-3 flex items-center gap-3">
                <div className="size-9 rounded-md bg-muted text-foreground/70 flex items-center justify-center">
                  <FileText className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm-minus font-medium truncate">{d.name}</div>
                  <div className="text-2xs text-muted-foreground">
                    {d.type} · {d.date}
                  </div>
                </div>
                <button className="text-xs font-medium text-primary hover:underline">
                  Baixar
                </button>
              </li>
            ))}
          </ul>
        </section>

        <footer className="pt-4 text-center text-2xs text-muted-foreground">
          <p>
            Este portal segue a LGPD. Seus dados são tratados com sigilo pela {data.clinic.name}.
          </p>
          <p className="mt-1">Powered by DentalFlux</p>
        </footer>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

function ReviewCard() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [sent, setSent] = useState(false);
  const [text, setText] = useState("");

  if (sent) {
    return (
      <section className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center">
        <CheckCircle2 className="size-8 text-success mx-auto" />
        <h3 className="mt-2 text-[15px] font-semibold">Obrigada pelo seu feedback! 💜</h3>
        <p className="mt-1 text-xs-plus text-muted-foreground">
          Seu apoio ajuda outras pessoas a encontrarem nossa clínica.
        </p>
        <a
          href="#"
          className="mt-4 inline-flex h-9 px-4 items-center rounded-md bg-primary text-primary-foreground text-xs-plus font-medium"
        >
          Avaliar no Google
        </a>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <Star className="size-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-tight">Como foi sua experiência?</h2>
      </div>
      <p className="mt-1 text-xs-plus text-muted-foreground">
        Sua opinião nos ajuda a melhorar continuamente.
      </p>

      <div className="mt-3 flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = (hover || rating) >= n;
          return (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              className="p-0.5"
              aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "size-7 transition-colors",
                  active ? "fill-warning text-warning" : "text-muted-foreground/40",
                )}
              />
            </button>
          );
        })}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Conte um pouco sobre o atendimento (opcional)"
        className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm-minus placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />

      <button
        disabled={rating === 0}
        onClick={() => setSent(true)}
        className="mt-3 w-full h-10 rounded-md bg-primary text-primary-foreground text-sm-minus font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Enviar avaliação
      </button>
    </section>
  );
}
