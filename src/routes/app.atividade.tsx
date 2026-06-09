import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCheck } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { NotificationRow } from "@/components/app/notifications-popover";
import { ACTIVITY_CATEGORIES, ACTIVITY_FEED, type ActivityCategory } from "@/lib/mock";
import { markAllRead, useReadIds, useUnreadCount } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/atividade")({
  head: () => ({ meta: [{ title: "Atividade · DentalFlux" }] }),
  component: AtividadePage,
});

function AtividadePage() {
  const [filter, setFilter] = useState<ActivityCategory | "todas">("todas");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const readIds = useReadIds();
  const unread = useUnreadCount();

  const filtered = useMemo(() => {
    let arr = filter === "todas" ? ACTIVITY_FEED : ACTIVITY_FEED.filter((a) => a.category === filter);
    if (onlyUnread) arr = arr.filter((a) => a.unread && !readIds.has(a.id));
    return arr;
  }, [filter, onlyUnread, readIds]);

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
