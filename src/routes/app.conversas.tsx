import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  Phone,
  MoreVertical,
  Sparkles,
  Tag,
  ArrowLeft,
  Info,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { EMPTY_STATES } from "@/lib/empty-states";
import { useEmptyMode } from "@/hooks/use-empty-mode";
import { CONVERSATIONS, OPP_STAGES } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/conversas")({
  head: () => ({ meta: [{ title: "Conversas · Dr. Flux" }] }),
  component: Conversas,
});

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  novo: { label: "Novo", tone: "bg-chart-2/10 text-chart-2" },
  aguardando: { label: "Aguardando", tone: "bg-warning/15 text-warning-foreground" },
  agendado: { label: "Agendado", tone: "bg-primary/10 text-primary" },
  ativo: { label: "Ativo", tone: "bg-success/10 text-success" },
};

function Conversas() {
  const __empty = useEmptyMode();
  const [activeId, setActiveId] = useState(CONVERSATIONS[0].id);
  // Mobile: toggle between list and thread panels
  const [showThread, setShowThread] = useState(false);
  // Mobile/tablet: context panel as slide-over (static column only at lg+)
  const [showContext, setShowContext] = useState(false);
  if (__empty) {
    return (
      <AppShell title="Conversas" subtitle="Inbox unificado">
        <EmptyState {...EMPTY_STATES.conversas} />
      </AppShell>
    );
  }
  const active = CONVERSATIONS.find((c) => c.id === activeId)!;
  const stageLabel = OPP_STAGES.find((s) => s.id === active.stage)?.label ?? active.stage;

  return (
    <AppShell title="Conversas" subtitle="Inbox unificado · WhatsApp + canais conectados" flush>
      {/* h: subtract header(4rem) + mobile bottom nav(4rem). md+: only header (sidebar takes over) */}
      <div className="grid grid-cols-12 h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
        {/* List */}
        <aside
          className={cn(
            "border-r border-border bg-surface flex-col min-w-0",
            // Desktop: always 4-col flex sidebar
            "md:flex md:col-span-4 lg:col-span-3",
            // Mobile: full-width list, hidden when thread is open
            showThread ? "hidden" : "flex col-span-12",
          )}
        >
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Buscar conversa…"
                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-1 mt-2 text-2xs">
              {["Todas", "Não lidas", "Aguardando"].map((f, i) => (
                <button
                  key={f}
                  className={cn(
                    "px-2 py-0.5 rounded-md",
                    i === 0
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {CONVERSATIONS.map((c) => {
              const s = STATUS_LABEL[c.status];
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveId(c.id);
                    setShowThread(true);
                  }}
                  className={cn(
                    "w-full text-left flex items-start gap-3 px-3 py-3 border-b border-border/60 hover:bg-muted/40",
                    activeId === c.id && "bg-primary/5",
                  )}
                >
                  <div className="size-9 rounded-full bg-gradient-to-br from-muted to-accent flex items-center justify-center text-2xs font-semibold shrink-0">
                    {c.patientName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm-minus font-medium truncate">{c.patientName}</span>
                      <span className="text-3xs text-muted-foreground shrink-0 tabular-nums">
                        {c.lastTime}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.lastMessage}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-1.5 py-0.5 text-2xs font-medium",
                          s.tone,
                        )}
                      >
                        {s.label}
                      </span>
                      {c.unread > 0 && (
                        <span className="ml-auto size-5 rounded-full bg-primary text-primary-foreground text-3xs font-semibold flex items-center justify-center tabular-nums">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Thread */}
        <section
          className={cn(
            "flex-col bg-background min-w-0",
            // Desktop: always visible as 8-col (lg: 6-col)
            "md:flex md:col-span-8 lg:col-span-6",
            // Mobile: full-width when thread selected, hidden otherwise
            showThread ? "flex col-span-12" : "hidden",
          )}
        >
          <div className="h-14 border-b border-border flex items-center gap-2 px-4">
            {/* Back to list — mobile only */}
            <button
              className="md:hidden size-8 rounded-md hover:bg-muted flex items-center justify-center shrink-0"
              onClick={() => setShowThread(false)}
            >
              <ArrowLeft className="size-4 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="size-9 rounded-full bg-gradient-to-br from-muted to-accent flex items-center justify-center text-2xs font-semibold">
                {active.patientName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="min-w-0">
                <div className="text-sm-minus font-semibold truncate">{active.patientName}</div>
                <div className="text-2xs text-muted-foreground truncate">
                  {active.phone} · {active.source}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="size-8 rounded-md hover:bg-muted flex items-center justify-center">
                <Phone className="size-4 text-muted-foreground" />
              </button>
              {/* Context panel toggle — mobile/tablet only (lg+ shows static column) */}
              <button
                className="lg:hidden size-8 rounded-md hover:bg-muted flex items-center justify-center"
                onClick={() => setShowContext(true)}
                title="Contexto do paciente"
              >
                <Info className="size-4 text-muted-foreground" />
              </button>
              <button className="size-8 rounded-md hover:bg-muted flex items-center justify-center">
                <MoreVertical className="size-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
            <div className="text-center text-3xs text-muted-foreground py-1">Hoje</div>
            {active.messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.from === "patient" ? "justify-start" : "justify-end")}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm-minus leading-snug",
                    m.from === "patient"
                      ? "bg-surface border border-border rounded-tl-sm"
                      : "bg-primary text-primary-foreground rounded-tr-sm",
                  )}
                >
                  {m.text}
                  <div
                    className={cn(
                      "text-3xs mt-0.5 text-right tabular-nums",
                      m.from === "patient" ? "text-muted-foreground" : "text-primary-foreground/70",
                    )}
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border bg-surface p-3">
            <div className="flex items-center gap-1 mb-2">
              {["Olá! 😊", "Confirmar consulta", "Enviar orçamento", "Reagendar"].map((t) => (
                <button
                  key={t}
                  className="text-2xs px-2 py-1 rounded-md border border-input bg-background hover:bg-muted"
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <button className="size-9 rounded-md hover:bg-muted flex items-center justify-center">
                <Paperclip className="size-4 text-muted-foreground" />
              </button>
              <div className="flex-1 rounded-lg border border-input bg-background px-3 py-2">
                <textarea
                  rows={1}
                  placeholder="Escreva uma mensagem…"
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                  }}
                  className="w-full resize-none bg-transparent text-sm-minus focus:outline-none max-h-[120px]"
                />
              </div>
              <button className="size-9 rounded-md hover:bg-muted flex items-center justify-center">
                <Smile className="size-4 text-muted-foreground" />
              </button>
              <button className="h-9 px-3 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5 text-xs-plus font-medium hover:opacity-90">
                <Send className="size-3.5" /> Enviar
              </button>
            </div>
          </div>
        </section>

        {/* Context — static column at lg+, slide-over below */}
        {showContext && (
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowContext(false)}
          />
        )}
        <aside
          className={cn(
            "flex-col border-l border-border bg-surface min-w-0",
            "lg:flex lg:static lg:col-span-3 lg:z-auto lg:w-auto lg:max-w-none lg:shadow-none",
            showContext
              ? "flex fixed inset-y-0 right-0 z-40 w-[320px] max-w-[85vw] shadow-xl"
              : "hidden",
          )}
        >
          <div className="h-14 border-b border-border flex items-center justify-between px-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contexto do paciente
            </span>
            <button
              className="lg:hidden size-7 rounded-md hover:bg-muted flex items-center justify-center"
              onClick={() => setShowContext(false)}
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <div className="text-2xs text-muted-foreground mb-1">Etapa do funil</div>
              <div className="text-sm-minus font-medium">{stageLabel}</div>
            </div>
            <div>
              <div className="text-2xs text-muted-foreground mb-1">Oportunidade vinculada</div>
              <div className="text-sm-minus font-medium tabular-nums">
                R$ {active.estValue.toLocaleString("pt-BR")}
              </div>
            </div>
            <div>
              <div className="text-2xs text-muted-foreground mb-1.5">Tags</div>
              <div className="flex flex-wrap gap-1">
                {active.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-md bg-accent text-accent-foreground px-1.5 py-0.5 text-3xs"
                  >
                    <Tag className="size-2.5" /> {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-2xs text-muted-foreground mb-1">Origem</div>
              <div className="text-sm-minus">{active.source}</div>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-1.5 text-2xs font-semibold text-primary mb-1">
                <Sparkles className="size-3.5" /> Próxima ação sugerida
              </div>
              <div className="text-sm-minus text-foreground/85">{active.nextAction}</div>
              <button className="mt-2.5 w-full h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                Aplicar agora
              </button>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
