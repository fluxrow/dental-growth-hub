import { createFileRoute } from "@tanstack/react-router";
import { Send, Star } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { EMPTY_STATES } from "@/lib/empty-states";
import { useEmptyMode } from "@/hooks/use-empty-mode";
import { KpiCard } from "@/components/app/kpi-card";
import { ELIGIBLE_FOR_REVIEW, REVIEWS, REVIEW_KPIS } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/avaliacoes")({
  head: () => ({ meta: [{ title: "Avaliações · Dr. Flux" }] }),
  component: Avaliacoes,
});

function Avaliacoes() {
  const __empty = useEmptyMode();
  if (__empty) {
    return (
      <AppShell title="Avaliações" subtitle="Reputação no Google">
        <EmptyState {...EMPTY_STATES.avaliacoes} />
      </AppShell>
    );
  }
  return (
    <AppShell
      title="Avaliações"
      subtitle="Reputação no Google · pedidos automáticos pós-atendimento"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {REVIEW_KPIS.map((k) => (
          <KpiCard key={k.key} k={k} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <section className="md:col-span-2 rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-4 h-12 border-b border-border flex items-center justify-between">
            <div>
              <div className="text-sm-minus font-semibold tracking-tight">Pacientes elegíveis</div>
              <div className="text-2xs text-muted-foreground">
                Atendidos nos últimos 7 dias sem pedido enviado
              </div>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {ELIGIBLE_FOR_REVIEW.map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-center gap-3">
                <div className="size-9 rounded-full bg-gradient-to-br from-muted to-accent flex items-center justify-center text-2xs font-semibold">
                  {p.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm-minus font-medium truncate">{p.name}</div>
                  <div className="text-2xs text-muted-foreground">
                    Última visita: {p.lastVisit}
                  </div>
                </div>
                <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                  <Send className="size-3.5" /> Enviar pedido
                </button>
              </li>
            ))}
            {ELIGIBLE_FOR_REVIEW.length === 0 && (
              <li className="px-4 py-6 text-center text-xs-plus text-muted-foreground">
                Nenhum paciente elegível no momento.
              </li>
            )}
          </ul>
        </section>

        <section className="md:col-span-3 rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-4 h-12 border-b border-border flex items-center justify-between">
            <div>
              <div className="text-sm-minus font-semibold tracking-tight">
                Avaliações recentes no Google
              </div>
              <div className="text-2xs text-muted-foreground">
                Importadas automaticamente · análise de sentimento por IA
              </div>
            </div>
            <div className="inline-flex items-center gap-1 text-warning">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-current" />
              ))}
              <span className="ml-1.5 text-xs font-semibold text-foreground tabular-nums">
                4.8
              </span>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {REVIEWS.map((r) => (
              <li key={r.id} className="px-4 py-4">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm-minus font-medium">{r.patient}</span>
                    <span
                      className={cn(
                        "text-3xs font-medium rounded-full px-1.5 py-0.5",
                        r.sentiment === "positive"
                          ? "bg-success/10 text-success"
                          : r.sentiment === "neutral"
                            ? "bg-warning/15 text-warning-foreground"
                            : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {r.sentiment === "positive"
                        ? "positiva"
                        : r.sentiment === "neutral"
                          ? "neutra"
                          : "negativa"}
                    </span>
                  </div>
                  <span className="text-2xs text-muted-foreground tabular-nums">{r.date}</span>
                </div>
                <div className="flex items-center gap-0.5 text-warning mb-1.5">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="size-3 fill-current" />
                  ))}
                  {Array.from({ length: 5 - r.rating }).map((_, i) => (
                    <Star key={i} className="size-3 text-muted" />
                  ))}
                </div>
                <p className="text-sm-minus text-foreground/85 leading-relaxed">"{r.text}"</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
