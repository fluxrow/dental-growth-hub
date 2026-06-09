import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Target,
  MessagesSquare,
  Users,
  Megaphone,
  Zap,
  Wallet,
  Star,
  BarChart3,
  Settings,
  ChevronDown,
  Search,
  Bell,
} from "lucide-react";
import type { ReactNode } from "react";
import { CLINIC, USER } from "@/lib/mock";
import { cn } from "@/lib/utils";

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/app",                label: "Dashboard",    icon: LayoutDashboard, exact: true },
  { to: "/app/oportunidades",  label: "Oportunidades",icon: Target },
  { to: "/app/conversas",      label: "Conversas",    icon: MessagesSquare },
  { to: "/app/pacientes",      label: "Pacientes",    icon: Users },
  { to: "/app/campanhas",      label: "Campanhas",    icon: Megaphone },
  { to: "/app/automacoes",     label: "Automações",   icon: Zap },
  { to: "/app/cobrancas",      label: "Cobranças",    icon: Wallet },
  { to: "/app/avaliacoes",     label: "Avaliações",   icon: Star },
  { to: "/app/relatorios",     label: "Relatórios",   icon: BarChart3 },
  { to: "/app/configuracoes",  label: "Configurações",icon: Settings },
];

const PERIODS = ["Hoje", "7 dias", "30 dias", "90 dias"] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
  flush,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[240px] shrink-0 flex-col border-r border-border bg-sidebar">
        <Link to="/" className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <Logo />
          <span className="font-display font-semibold tracking-tight">DentalFlux</span>
        </Link>
        <div className="px-3 py-2">
          <button className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-sidebar-accent text-left">
            <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">
              SP
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{CLINIC.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{CLINIC.city}</div>
            </div>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-4 pt-2">
          <div className="px-2 py-1.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            Operação
          </div>
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-primary-foreground text-[11px] font-semibold">
              ML
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate">{USER.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{USER.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 h-16 border-b border-border bg-background/80 backdrop-blur flex items-center gap-3 px-4 lg:px-6">
          <div className="lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <Logo />
              <span className="font-display font-semibold">DentalFlux</span>
            </Link>
          </div>
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-[15px] font-semibold tracking-tight truncate">{title}</h1>
            )}
            {subtitle && (
              <p className="text-[12px] text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Buscar paciente, oportunidade…"
                className="h-8 w-64 rounded-md border border-input bg-surface pl-8 pr-3 text-[12px] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <PeriodSelector />
            <button className="size-8 rounded-md border border-input bg-surface hover:bg-muted flex items-center justify-center">
              <Bell className="size-3.5" />
            </button>
            {actions}
          </div>
        </header>
        <main className={cn(flush ? "" : "p-4 lg:p-6", "flex-1 min-w-0")}>{children}</main>
      </div>
    </div>
  );
}

function PeriodSelector() {
  return (
    <div className="hidden md:flex h-8 rounded-md border border-input bg-surface overflow-hidden">
      {PERIODS.map((p, i) => (
        <button
          key={p}
          className={cn(
            "px-2.5 text-[11.5px] font-medium border-r border-input last:border-r-0",
            i === 2
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

export function Logo() {
  return (
    <div className="size-7 rounded-md bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-primary-foreground">
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 4 L12 12 L5 20" />
        <path d="M12 4 L19 12 L12 20" />
      </svg>
    </div>
  );
}
