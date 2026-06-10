import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Target, MessagesSquare, Users, Megaphone, Zap, Wallet,
  Star, BarChart3, Settings, Activity as ActivityIcon, Upload, Stethoscope,
  Search, Crosshair, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Command registry ─────────────────────────────────────────────────────────

type Cmd = {
  id: string;
  label: string;
  group: string;
  icon: typeof Search;
  to: string;
  keywords?: string;
};

const COMMANDS: Cmd[] = [
  // Hoje
  { id: "triagem",       label: "Triagem do dia",   group: "Hoje",     icon: Crosshair,      to: "/app/triagem",         keywords: "urgente frio acoes" },
  { id: "oportunidades", label: "Oportunidades",    group: "Hoje",     icon: Target,         to: "/app/oportunidades",   keywords: "pipeline funil lead" },
  { id: "conversas",     label: "Conversas",        group: "Hoje",     icon: MessagesSquare, to: "/app/conversas",       keywords: "whatsapp mensagem chat" },
  { id: "atividade",     label: "Atividade",        group: "Hoje",     icon: ActivityIcon,   to: "/app/atividade",       keywords: "log historico eventos" },
  // Pacientes
  { id: "pacientes",     label: "Pacientes",        group: "Pacientes",icon: Users,          to: "/app/pacientes",       keywords: "lista cadastro busca" },
  { id: "campanhas",     label: "Campanhas",        group: "Pacientes",icon: Megaphone,      to: "/app/campanhas",       keywords: "marketing reativacao envio" },
  { id: "avaliacoes",    label: "Avaliações",       group: "Pacientes",icon: Star,           to: "/app/avaliacoes",      keywords: "google review nps nota" },
  { id: "cobrancas",     label: "Cobranças",        group: "Pacientes",icon: Wallet,         to: "/app/cobrancas",       keywords: "financeiro pagamento divida" },
  // Clínica
  { id: "dashboard",     label: "Dashboard",        group: "Clínica",  icon: LayoutDashboard,to: "/app",                 keywords: "inicio home visao geral kpi" },
  { id: "diagnostico",   label: "Diagnóstico",      group: "Clínica",  icon: Stethoscope,    to: "/app/diagnostico",     keywords: "saude perda receita score" },
  { id: "automacoes",    label: "Automações",       group: "Clínica",  icon: Zap,            to: "/app/automacoes",      keywords: "fluxo automatico disparo regra" },
  { id: "relatorios",    label: "Relatórios",       group: "Clínica",  icon: BarChart3,      to: "/app/relatorios",      keywords: "grafico analytics metricas" },
  { id: "importar",      label: "Importar dados",   group: "Clínica",  icon: Upload,         to: "/app/importar",        keywords: "csv planilha migrar" },
  { id: "configuracoes", label: "Configurações",    group: "Clínica",  icon: Settings,       to: "/app/configuracoes",   keywords: "perfil clinica conta equipe" },
];

// ─── Fuzzy filter ─────────────────────────────────────────────────────────────

function match(cmd: Cmd, q: string): boolean {
  if (!q) return true;
  const hay = `${cmd.label} ${cmd.keywords ?? ""} ${cmd.group}`.toLowerCase();
  return q
    .toLowerCase()
    .split(" ")
    .every((tok) => hay.includes(tok));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setQuery("");
      setSel(0);
    }
  }, [open]);

  const filtered = useMemo(
    () => COMMANDS.filter((c) => match(c, query)),
    [query],
  );

  // Group filtered results
  const groups = useMemo(() => {
    const map = new Map<string, Cmd[]>();
    filtered.forEach((c) => {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    });
    return [...map.entries()];
  }, [filtered]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((v) => Math.min(v + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((v) => Math.max(v - 1, 0));
    } else if (e.key === "Enter" && filtered[sel]) {
      execute(filtered[sel]);
    }
  };

  const execute = (cmd: Cmd) => {
    setOpen(false);
    navigate({ to: cmd.to as never });
  };

  if (!open) return null;

  let flatIdx = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search input */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSel(0); }}
            onKeyDown={handleKey}
            placeholder="Buscar página ou ação…"
            className="flex-1 bg-transparent text-[14px] placeholder:text-muted-foreground/60 outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-input bg-muted px-1.5 text-[10px] text-muted-foreground font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-8">
              Nenhum resultado para "{query}"
            </p>
          ) : (
            groups.map(([groupName, items]) => (
              <div key={groupName}>
                <div className="px-4 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                  {groupName}
                </div>
                {items.map((cmd) => {
                  const idx = flatIdx++;
                  const Icon = cmd.icon;
                  const isSelected = idx === sel;
                  return (
                    <button
                      key={cmd.id}
                      onMouseEnter={() => setSel(idx)}
                      onClick={() => execute(cmd)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      <Icon className="size-4 shrink-0 opacity-70" />
                      <span className="flex-1 text-[13px] font-medium">{cmd.label}</span>
                      {isSelected && (
                        <ArrowRight className="size-3.5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-3 text-[10.5px] text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> navegar</span>
          <span><kbd className="font-mono">↵</kbd> abrir</span>
          <span><kbd className="font-mono">Esc</kbd> fechar</span>
          <span className="ml-auto opacity-60">⌘K para abrir</span>
        </div>
      </div>
    </>
  );
}
