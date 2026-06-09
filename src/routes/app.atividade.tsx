import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCheck, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { NotificationRow } from "@/components/app/notifications-popover";
import { ACTIVITY_CATEGORIES, ACTIVITY_FEED, type Activity, type ActivityCategory, type ActivityKind } from "@/lib/mock";
import { EmptyState } from "@/components/app/empty-state";
import { markAllRead, useReadIds, useUnreadCount } from "@/hooks/use-notifications";
import { useEmptyMode } from "@/hooks/use-empty-mode";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/atividade")({
  head: () => ({ meta: [{ title: "Atividade · DentalFlux" }] }),
  component: AtividadePage,
});

const DB_TO_KIND: Record<string, ActivityKind> = {
  resposta: "resposta",
  confirmacao: "confirmacao",
  falha: "falha",
  avaliacao: "avaliacao",
  cobranca_enviada: "cobranca-enviada",
  cobranca_respondida: "cobranca-respondida",
  pagamento_confirmado: "pagamento-confirmado",
  pagamento_atrasado: "pagamento-atrasado",
  cobranca_falhou: "cobranca-falhou",
  sistema: "sistema",
};

const KIND_TO_CATEGORY: Record<ActivityKind, ActivityCategory> = {
  resposta: "respostas", confirmacao: "confirmacoes", falha: "falhas", avaliacao: "avaliacoes",
  "cobranca-enviada": "financeiro", "cobranca-respondida": "financeiro", "pagamento-confirmado": "financeiro",
  "pagamento-atrasado": "financeiro", "cobranca-falhou": "financeiro", sistema: "sistema",
};

function dayLabel(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return "Esta semana";
}
function relTime(d: Date): string {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)}d`;
}

function AtividadePage() {
  const live = useEmptyMode();
  const [filter, setFilter] = useState<ActivityCategory | "todas">("todas");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const readIds = useReadIds();
  const unread = useUnreadCount();

  const { data: liveFeed, isLoading } = useQuery({
    queryKey: ["atividades"],
    enabled: live,
    queryFn: async (): Promise<Activity[]> => {
      const { data, error } = await supabase
        .from("atividades")
        .select("id, kind, title, detail, value, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((a): Activity => {
        const k = DB_TO_KIND[a.kind] ?? "sistema";
        const created = new Date(a.created_at!);
        return {
          id: a.id,
          kind: k,
          category: KIND_TO_CATEGORY[k],
          title: a.title,
          detail: a.detail ?? "",
          value: a.value ? Number(a.value) : undefined,
          time: relTime(created),
          dayLabel: dayLabel(created),
          unread: false,
        };
      });
    },
  });

  const source: Activity[] = live ? (liveFeed ?? []) : ACTIVITY_FEED;

  const filtered = useMemo(() => {
    let arr = filter === "todas" ? source : source.filter((a) => a.category === filter);
    if (onlyUnread) arr = arr.filter((a) => a.unread && !readIds.has(a.id));
    return arr;
  }, [filter, onlyUnread, readIds, source]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof filtered>();
    for (const a of filtered) {
      const arr = m.get(a.dayLabel) ?? [];
      arr.push(a);
      m.set(a.dayLabel, arr);
    }
    return Array.from(m.entries());
  }, [filtered]);


  return (
    <AppShell
      title="Atividade"
      subtitle="Tudo o que aconteceu na operação — respostas, confirmações, financeiro e sistema"
      actions={
        <button
          onClick={() => markAllRead()}
          disabled={unread === 0}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-input bg-surface text-[12px] font-medium hover:bg-muted disabled:opacity-40"
        >
          <CheckCheck className="size-3.5" /> Marcar todas como lidas
          {unread > 0 && <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 tabular-nums">{unread}</span>}
        </button>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {ACTIVITY_CATEGORIES.map((c) => {
          const active = filter === c.id;
          const count =
            c.id === "todas" ? ACTIVITY_FEED.length : ACTIVITY_FEED.filter((a) => a.category === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={cn(
                "h-7 px-2.5 rounded-full text-[11.5px] font-medium border transition-colors inline-flex items-center gap-1.5",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-surface text-foreground/70 hover:bg-muted"
              )}
            >
              {c.label}
              <span className={cn("tabular-nums text-[10px]", active ? "opacity-80" : "text-muted-foreground")}>{count}</span>
            </button>
          );
        })}
        <div className="mx-1.5 h-5 w-px bg-border" />
        <button
          onClick={() => setOnlyUnread((v) => !v)}
          className={cn(
            "h-7 px-2.5 rounded-full text-[11.5px] font-medium border transition-colors inline-flex items-center gap-1.5",
            onlyUnread
              ? "bg-foreground text-background border-foreground"
              : "border-border bg-surface text-foreground/70 hover:bg-muted"
          )}
        >
          Apenas não lidas
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {grouped.length === 0 && (
          <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">Nenhuma atividade nesta categoria.</div>
        )}
        {grouped.map(([day, list]) => (
          <div key={day}>
            <div className="px-4 py-2 bg-muted/40 border-b border-border text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              {day}
            </div>
            <ul className="divide-y divide-border">
              {list.map((a) => (
                <NotificationRow key={a.id} a={a} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
