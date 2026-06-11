import {
  ArrowRight,
  MoreHorizontal,
  CheckCircle2,
  CalendarPlus,
  XCircle,
  MessageSquare,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Opportunity, OppStage } from "@/lib/mock";
import { OPP_STAGES } from "@/lib/mock";

export function OpportunityCardActions({
  opp,
  onAdvance,
  onLose,
}: {
  opp: Opportunity;
  onAdvance: (id: string) => void;
  onLose: (id: string) => void;
}) {
  const idx = OPP_STAGES.findIndex((s) => s.id === opp.stage);
  const next: { id: OppStage; label: string } | undefined = OPP_STAGES[idx + 1];

  // Touch não tem hover: ações sempre visíveis abaixo de md
  return (
    <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
      {next && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdvance(opp.id);
            toast.success("Etapa avançada", { description: `${opp.name} → ${next.label}` });
          }}
          title={`Avançar para ${next.label}`}
          className="size-6 rounded hover:bg-primary/10 text-primary flex items-center justify-center"
        >
          <ArrowRight className="size-3.5" />
        </button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="size-6 rounded hover:bg-muted text-muted-foreground flex items-center justify-center"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => toast.success("Comparecimento registrado", { description: opp.name })}
          >
            <CheckCircle2 className="size-3.5" /> Registrar comparecimento
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              toast("Próxima ação criada", { description: `${opp.name} · follow-up agendado` })
            }
          >
            <CalendarPlus className="size-3.5" /> Criar próxima ação
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => toast("Abrindo conversa", { description: opp.name })}>
            <MessageSquare className="size-3.5" /> Abrir conversa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast("Abrindo paciente", { description: opp.name })}>
            <User className="size-3.5" /> Ver paciente
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              onLose(opp.id);
              toast.error("Oportunidade perdida", { description: opp.name });
            }}
            className="text-destructive focus:text-destructive"
          >
            <XCircle className="size-3.5" /> Marcar como perdida
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
