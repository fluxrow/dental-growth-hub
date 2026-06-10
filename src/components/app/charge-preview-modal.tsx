/**
 * ChargePreviewModal — Preview + confirmação de envio de cobrança
 *
 * Exibe:
 *  - Preview da mensagem que será enviada (template dunning)
 *  - Informações do paciente e valor
 *  - Stage da régua (D-3 / D+0 / D+3 / D+7 / D+10)
 *  - Botão de confirmar envio → chama sendCobrancaWA
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendCobrancaWA } from "@/lib/zapi.functions";
import { X, Send, MessageCircle, User, Calendar, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChargeItem {
  id: string;
  description: string;
  value: number;
  due_date: string;
  daysLate: number;
  nextStage: number | null;
  paciente?: { id: string; name: string; phone: string } | null;
}

interface ChargePreviewModalProps {
  item: ChargeItem | null;
  clinicName?: string;
  onClose: () => void;
}

// ─── Template preview (client-side para rápido feedback) ──────────────────────

function buildPreviewMessage(item: ChargeItem, clinicName: string): string {
  const formatBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const firstName = item.paciente?.name?.split(" ")[0] ?? "Paciente";
  const dueFormatted = new Date(item.due_date + "T12:00:00").toLocaleDateString("pt-BR");
  const valueFormatted = formatBRL(item.value);
  const stageDay = item.nextStage ?? 0;

  switch (stageDay) {
    case -3:
      return `Olá, ${firstName}! 😊\n\nPassando para lembrar que sua consulta na *${clinicName}* vence em 3 dias (${dueFormatted}).\n\nValor: *${valueFormatted}*\n\nQualquer dúvida estamos à disposição! 🦷`;
    case 0:
      return `Olá, ${firstName}!\n\nHoje é o vencimento do seu pagamento na *${clinicName}*.\n\nValor: *${valueFormatted}*\n\nEvite juros realizando o pagamento hoje! 😊`;
    case 3:
      return `Oi, ${firstName}! Tudo bem?\n\nIdentificamos que o pagamento de *${valueFormatted}* na *${clinicName}* ainda está em aberto (venceu em ${dueFormatted}).\n\nPode nos ajudar a resolver isso? 🙏`;
    case 7:
      return `Olá, ${firstName}.\n\nSeu pagamento de *${valueFormatted}* na *${clinicName}* está em atraso há 7 dias.\n\nPrecisamos regularizar para manter seu cadastro ativo.\n\nFale conosco se precisar de apoio! 🙏`;
    case 10:
      return `${firstName}, precisamos falar sobre o seu pagamento em aberto.\n\nValor: *${valueFormatted}* — vencido em ${dueFormatted}.\n\nPor favor entre em contato com a *${clinicName}* para evitar encaminhamento para cobrança.`;
    default:
      return `Olá, ${firstName}! Você tem um pagamento pendente de *${valueFormatted}* na *${clinicName}*. Vencimento: ${dueFormatted}.`;
  }
}

function stageLabel(day: number | null): string {
  if (day === null) return "—";
  if (day === -3) return "D-3 — Aviso preventivo (3 dias antes)";
  if (day === 0) return "D+0 — Vencimento";
  if (day === 3) return "D+3 — 1ª cobrança (3 dias de atraso)";
  if (day === 7) return "D+7 — 2ª cobrança (urgente)";
  if (day === 10) return "D+10 — Última tentativa";
  return `D${day >= 0 ? "+" : ""}${day}`;
}

function stageBadgeColor(day: number | null): string {
  if (day === null || day <= -1) return "bg-blue-100 text-blue-700";
  if (day === 0) return "bg-yellow-100 text-yellow-700";
  if (day <= 3) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChargePreviewModal({
  item,
  clinicName = "Clínica",
  onClose,
}: ChargePreviewModalProps) {
  const queryClient = useQueryClient();
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (!item?.paciente?.phone) throw new Error("Telefone do paciente não encontrado");
      return sendCobrancaWA({
        data: {
          cobrancaId: item.id,
          phone: item.paciente.phone,
          stageDay: item.nextStage ?? 0,
          patientName: item.paciente.name,
          value: item.value,
          dueDate: new Date(item.due_date + "T12:00:00").toLocaleDateString("pt-BR"),
        },
      });
    },
    onSuccess: () => {
      setSent(true);
      queryClient.invalidateQueries({ queryKey: ["dunning-queue"] });
      queryClient.invalidateQueries({ queryKey: ["charge-timeline", item?.id] });
      setTimeout(onClose, 1500);
    },
  });

  if (!item) return null;

  const preview = buildPreviewMessage(item, clinicName);
  const valueFormatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(item.value);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-5 text-emerald-600" />
            <span className="font-semibold text-zinc-900">Preview da Mensagem</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Patient info */}
          <div className="flex items-center gap-3 rounded-xl bg-zinc-50 border border-zinc-200 p-3">
            <div className="size-9 rounded-full bg-zinc-200 flex items-center justify-center">
              <User className="size-4 text-zinc-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-900 text-sm">
                {item.paciente?.name ?? "Paciente desconhecido"}
              </p>
              <p className="text-xs text-zinc-500">{item.paciente?.phone ?? "—"}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-zinc-900 text-sm">{valueFormatted}</p>
              <p className="text-xs text-zinc-500 flex items-center gap-1 justify-end">
                <Calendar className="size-3" />
                {new Date(item.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          {/* Stage badge */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold",
                stageBadgeColor(item.nextStage),
              )}
            >
              {stageLabel(item.nextStage)}
            </span>
            {item.daysLate > 0 && (
              <span className="flex items-center gap-1 text-xs text-orange-600">
                <AlertTriangle className="size-3" />
                {item.daysLate} dias de atraso
              </span>
            )}
          </div>

          {/* WhatsApp preview */}
          <div className="rounded-xl bg-[#ECE5DD] p-3">
            <p className="text-[10px] font-semibold text-zinc-500 mb-2 uppercase tracking-wide">
              Prévia WhatsApp
            </p>
            <div className="bg-white rounded-xl rounded-tl-none px-3 py-2.5 shadow-sm max-w-[90%]">
              <p className="text-sm text-zinc-900 whitespace-pre-wrap leading-relaxed">
                {preview.replace(/\*(.*?)\*/g, (_, t) => t) /* strip bold markers for preview */}
              </p>
              <p className="text-right text-[10px] text-zinc-400 mt-1">
                {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          {/* Warning if no phone */}
          {!item.paciente?.phone && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="size-4 shrink-0" />
              Telefone do paciente não cadastrado — cadastre antes de enviar.
            </div>
          )}

          {/* Success state */}
          {sent && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700 font-medium">
              ✅ Mensagem enviada com sucesso!
            </div>
          )}

          {/* Error state */}
          {mutation.isError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              Erro: {(mutation.error as Error)?.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-300 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || sent || !item.paciente?.phone}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all",
              sent
                ? "bg-emerald-500 text-white"
                : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <Send className="size-4" />
            {mutation.isPending ? "Enviando..." : sent ? "Enviado!" : "Confirmar Envio"}
          </button>
        </div>
      </div>
    </div>
  );
}
