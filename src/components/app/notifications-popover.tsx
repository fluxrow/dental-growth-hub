import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  MessageSquare,
  CalendarCheck,
  AlertTriangle,
  Star,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Settings as SettingsIcon,
  CheckCheck,
  User,
  Receipt,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ACTIVITY_FEED, type Activity, type ActivityKind } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { markAllRead, markRead, useReadIds, useUnreadCount } from "@/hooks/use-notifications";

const ICON: Record<ActivityKind, { icon: typeof Bell; cls: string }> = {
  resposta: { icon: MessageSquare, cls: "bg-info/10 text-info" },
  confirmacao: { icon: CalendarCheck, cls: "bg-success/10 text-success" },
  falha: { icon: AlertTriangle, cls: "bg-warning/15 text-warning-foreground" },
  avaliacao: { icon: Star, cls: "bg-warning/15 text-warning-foreground" },
  "cobranca-enviada": { icon: Send, cls: "bg-primary/10 text-primary" },
  "cobranca-respondida": { icon: MessageSquare, cls: "bg-info/10 text-info" },
  "pagamento-confirmado": { icon: CheckCircle2, cls: "bg-success/10 text-success" },
  "pagamento-atrasado": { icon: Clock, cls: "bg-warning/15 text-warning-foreground" },
  "cobranca-falhou": { icon: XCircle, cls: "bg-destructive/10 text-destructive" },
  sistema: { icon: SettingsIcon, cls: "bg-muted text-foreground/70" },
};

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const items = ACTIVITY_FEED.slice(0, 8);
  const unread = useUnreadCount();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative size-8 rounded-md border border-input bg-surface hover:bg-muted flex items-center justify-center">
          <Bell className="size-3.5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] p-0 overflow-hidden">
        <div className="px-4 h-12 flex items-center justify-between border-b border-border">
          <div className="text-[13px] font-semibold">Notificações</div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground">{unread} não lidas</span>
            <button
              onClick={() => markAllRead()}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline disabled:opacity-40"
              disabled={unread === 0}
            >
              <CheckCheck className="size-3" /> Marcar todas
            </button>
          </div>
        </div>
        <ul className="max-h-[440px] overflow-y-auto divide-y divide-border">
          {items.map((a) => (
            <NotificationRow key={a.id} a={a} onNav={() => setOpen(false)} />
          ))}
        </ul>
        <div className="border-t border-border p-2">
          <Link
            to="/app/atividade"
            onClick={() => setOpen(false)}
            className="block text-center text-[12.5px] font-medium text-primary py-1.5 rounded hover:bg-primary/5"
          >
            Ver toda a atividade
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function NotificationRow({
  a,
  onNav,
  compact,
}: {
  a: Activity;
  onNav?: () => void;
  compact?: boolean;
}) {
  const m = ICON[a.kind];
  const Icon = m.icon;
  const readIds = useReadIds();
  const isUnread = a.unread && !readIds.has(a.id);

  const handleClick = () => {
    if (isUnread) markRead(a.id);
    onNav?.();
  };

  const isFinance = a.category === "financeiro";

  return (
    <li
      className={cn(
        "flex items-start gap-3 px-4",
        compact ? "py-2.5" : "py-3",
        isUnread && "bg-primary/[0.03]",
      )}
    >
      <div className={cn("size-8 rounded-md flex items-center justify-center shrink-0", m.cls)}>
        <Icon className="size-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[12.5px] font-medium leading-snug truncate">{a.title}</div>
          <span className="text-[10.5px] text-muted-foreground shrink-0">{a.time}</span>
        </div>
        <div className="text-[11.5px] text-muted-foreground truncate">
          {a.patient ? <span className="text-foreground/80 font-medium">{a.patient}</span> : null}
          {a.patient && a.detail ? " · " : ""}
          {a.detail}
          {typeof a.value === "number" && a.value > 0 ? (
            <span className="ml-1 tabular-nums">· R$ {a.value.toLocaleString("pt-BR")}</span>
          ) : null}
        </div>
        <div className="mt-1 flex items-center gap-3 flex-wrap">
          {isFinance && a.patientHref && (
            <Link
              to={a.patientHref as never}
              onClick={handleClick}
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary hover:underline"
            >
              <User className="size-3" /> Ver paciente
            </Link>
          )}
          {isFinance && a.billingHref && (
            <Link
              to={a.billingHref as never}
              onClick={handleClick}
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary hover:underline"
            >
              <Receipt className="size-3" /> Histórico
            </Link>
          )}
          {!isFinance &&
            a.action &&
            (a.action.href ? (
              <Link
                to={a.action.href as never}
                onClick={handleClick}
                className="text-[11.5px] font-medium text-primary hover:underline"
              >
                {a.action.label} →
              </Link>
            ) : (
              <button
                onClick={handleClick}
                className="text-[11.5px] font-medium text-primary hover:underline"
              >
                {a.action.label}
              </button>
            ))}
          {isUnread && (
            <button
              onClick={() => markRead(a.id)}
              className="ml-auto text-[10.5px] text-muted-foreground hover:text-foreground"
            >
              Marcar como lida
            </button>
          )}
        </div>
      </div>
      {isUnread && <span className="size-1.5 rounded-full bg-primary shrink-0 mt-2" />}
    </li>
  );
}
