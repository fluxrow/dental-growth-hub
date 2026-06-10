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
  Activity as ActivityIcon,
  Upload,
  Eye,
  EyeOff,
  LogOut,
  Stethoscope,
  MoreHorizontal,
  X,
  Crosshair,
  ShieldCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { CommandBar } from "./command-bar";
import { usePeriod, setPeriod, PERIOD_LABELS, type Period } from "@/hooks/use-period";
import { cn } from "@/lib/utils";
import { NotificationsPopover } from "./notifications-popover";
import { useEmptyMode, toggleEmptyMode } from "@/hooks/use-empty-mode";
import { useAuth, signOut } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useNavigate } from "@tanstack/react-router";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Hoje",
    items: [
      { to: "/app/triagem", label: "Triagem", icon: Crosshair },
      { to: "/app/oportunidades", label: "Oportunidades", icon: Target },
      { to: "/app/conversas", label: "Conversas", icon: MessagesSquare },
      { to: "/app/atividade", label: "Atividade", icon: ActivityIcon },
    ],
  },
  {
    label: "Pacientes",
    items: [
      { to: "/app/pacientes", label: "Pacientes", icon: Users },
      { to: "/app/campanhas", label: "Campanhas", icon: Megaphone },
      { to: "/app/avaliacoes", label: "Avaliações", icon: Star },
      { to: "/app/cobrancas", label: "Cobranças", icon: Wallet },
    ],
  },
  {
    label: "Clínica",
    items: [
      { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/app/diagnostico", label: "Diagnóstico", icon: Stethoscope },
      { to: "/app/automacoes", label: "Automações", icon: Zap },
      { to: "/app/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/app/importar", label: "Importar", icon: Upload },
      { to: "/app/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

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
  const { user } = useAuth();
  const { data } = useProfile(user?.id);
  const navigate = useNavigate();
  const clinicName = data?.clinic?.name ?? "Sua clínica";
  const clinicCity = data?.clinic?.city ?? "";
  const clinicInitials = clinicName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const userName = data?.profile?.name ?? user?.email ?? "Usuário";
  const userInitials = userName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      {/* md: compact icon-only rail · lg: full 240px sidebar */}
      <aside className="hidden md:flex md:w-16 lg:w-[240px] shrink-0 flex-col border-r border-border bg-sidebar">
        <Link
          to="/"
          className="flex items-center gap-2 h-16 border-b border-sidebar-border justify-center px-0 lg:justify-start lg:px-5"
        >
          <Logo />
          <span className="font-display font-semibold tracking-tight hidden lg:inline">
            DentalFlux
          </span>
        </Link>
        <div className="hidden lg:block px-3 py-2">
          <button className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-sidebar-accent text-left">
            <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">
              {clinicInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{clinicName}</div>
              <div className="text-[11px] text-muted-foreground truncate">{clinicCity}</div>
            </div>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-4 pt-2 space-y-1">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="hidden lg:block px-2 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                {group.label}
              </div>
              {group.items.map((item) => {
                const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to as never}
                    title={item.label}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors justify-center lg:justify-start",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Admin-only section */}
          {data?.profile?.role === "admin" && (
            <div>
              <div className="hidden lg:block px-2 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                Admin
              </div>
              <Link
                to="/app/admin/cs-queue"
                title="CS Queue"
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors justify-center lg:justify-start",
                  pathname.startsWith("/app/admin")
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <ShieldCheck className="size-4 shrink-0" />
                <span className="truncate hidden lg:inline">CS Queue</span>
              </Link>
            </div>
          )}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 flex-col lg:flex-row">
            <div
              title={userName}
              className="size-8 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-primary-foreground text-[11px] font-semibold"
            >
              {userInitials}
            </div>
            <div className="flex-1 min-w-0 hidden lg:block">
              <div className="text-[12px] font-medium truncate">{userName}</div>
              <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Sair (você poderá entrar com outra conta Google na próxima tela)"
              className="size-7 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground flex items-center justify-center"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
          <Link
            to="/app/configuracoes"
            className="mt-2 hidden lg:block text-[11px] text-muted-foreground hover:text-primary"
          >
            Gerenciar agenda Google →
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 h-16 border-b border-border bg-background/80 backdrop-blur flex items-center gap-3 px-4 lg:px-6">
          <div className="md:hidden">
            <Link to="/" className="flex items-center gap-2">
              <Logo />
              <span className="font-display font-semibold">DentalFlux</span>
            </Link>
          </div>
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-[15px] font-semibold tracking-tight truncate" title={title}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-[12px] text-muted-foreground truncate" title={subtitle}>
                {subtitle}
              </p>
            )}
          </div>
          {/* Mobile-only: mode toggle + notifications always accessible */}
          <div className="flex items-center gap-1.5 md:hidden">
            <EmptyModeToggle />
            <NotificationsPopover />
          </div>
          {/* Desktop: search + period + mode toggle + notifications + page actions */}
          <div className="hidden md:flex items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Buscar… (⌘K)"
                readOnly
                onClick={() =>
                  window.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
                  )
                }
                className="h-8 w-56 rounded-md border border-input bg-surface pl-8 pr-3 text-[12px] placeholder:text-muted-foreground/70 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <PeriodSelector />
            <EmptyModeToggle />
            <NotificationsPopover />
            {actions}
          </div>
        </header>
        <main
          className={cn(
            flush ? "pb-16 md:pb-0" : "p-4 pb-[4.5rem] md:pb-4 lg:p-6 lg:pb-6",
            "flex-1 min-w-0",
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Global command bar (⌘K) */}
      <CommandBar />
    </div>
  );
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────

const BOTTOM_TABS: NavItem[] = [
  { to: "/app", label: "Início", icon: LayoutDashboard, exact: true },
  { to: "/app/triagem", label: "Triagem", icon: Crosshair },
  { to: "/app/oportunidades", label: "Pipeline", icon: Target },
  { to: "/app/conversas", label: "Conversas", icon: MessagesSquare },
];

const MORE_ITEMS: NavItem[] = [
  { to: "/app/pacientes", label: "Pacientes", icon: Users },
  { to: "/app/diagnostico", label: "Diagnóstico", icon: Stethoscope },
  { to: "/app/automacoes", label: "Automações", icon: Zap },
  { to: "/app/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/app/avaliacoes", label: "Avaliações", icon: Star },
  { to: "/app/cobrancas", label: "Cobranças", icon: Wallet },
  { to: "/app/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/app/importar", label: "Importar", icon: Upload },
  { to: "/app/configuracoes", label: "Configurações", icon: Settings },
];

function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* "Mais" drawer slide-up */}
      <div
        className={cn(
          "md:hidden fixed bottom-16 inset-x-0 z-40 bg-background border-t border-border rounded-t-2xl transition-transform duration-300",
          open ? "translate-y-0" : "translate-y-full pointer-events-none",
        )}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <span className="text-[13px] font-semibold tracking-tight">Mais opções</span>
          <button
            onClick={() => setOpen(false)}
            className="size-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 p-3">
          {MORE_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as never}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl p-3 text-[11px] font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="h-safe-area-bottom" />
      </div>

      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-background/90 backdrop-blur border-t border-border flex items-stretch">
        {BOTTOM_TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to as never}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("size-5 transition-transform", active && "scale-110")} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
        {/* Mais button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors",
            open ? "text-primary" : "text-muted-foreground",
          )}
        >
          <MoreHorizontal className={cn("size-5 transition-transform", open && "scale-110")} />
          <span>Mais</span>
        </button>
      </nav>
    </>
  );
}

function EmptyModeToggle() {
  const live = useEmptyMode();
  return (
    <button
      onClick={toggleEmptyMode}
      title={live ? "Mostrar dados de exemplo (mocks)" : "Mostrar dados reais da sua clínica"}
      className={cn(
        "h-8 px-2.5 rounded-md border text-[11.5px] font-medium inline-flex items-center gap-1.5 transition-colors",
        live
          ? "border-success bg-success/10 text-success"
          : "border-input bg-surface text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {live ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      <span className="hidden md:inline">{live ? "Real" : "Demo"}</span>
    </button>
  );
}

function PeriodSelector() {
  const current = usePeriod();
  const periods = Object.entries(PERIOD_LABELS) as [Period, string][];

  return (
    <div className="hidden md:flex h-8 rounded-md border border-input bg-surface overflow-hidden">
      {periods.map(([key, label]) => (
        <button
          key={key}
          onClick={() => setPeriod(key)}
          className={cn(
            "px-2.5 text-[11.5px] font-medium border-r border-input last:border-r-0 transition-colors",
            current === key
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Logo() {
  return (
    <div className="size-7 rounded-md bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-primary-foreground">
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 4 L12 12 L5 20" />
        <path d="M12 4 L19 12 L12 20" />
      </svg>
    </div>
  );
}
