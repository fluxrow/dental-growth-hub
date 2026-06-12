/**
 * /app/assistente — Assistente IA (Dify + RAG)
 *
 * Chat com agente Dify treinado na base de conhecimento da clínica
 * (procedimentos, FAQ, políticas). Chamadas ao Dify são proxiadas
 * via server function para que a API key nunca chegue ao cliente.
 *
 * Configuração: DIFY_API_URL + DIFY_API_KEY (ver docs/dify-integration.md).
 * Sem as vars configuradas, o servidor usa o mock automaticamente.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { AppShell } from "@/components/app/app-shell";
import { DifyChat } from "@/components/app/dify-chat";
import { Bot, BookOpen, MessageSquare, Zap } from "lucide-react";

export const Route = createFileRoute("/app/assistente")({
  head: () => ({ meta: [{ title: "Assistente IA · Dr. Flux" }] }),
  component: Assistente,
});

const CAPABILITIES = [
  {
    icon: MessageSquare,
    title: "Triagem de dúvidas",
    desc: "Responde perguntas frequentes sobre procedimentos, preços e convênios.",
  },
  {
    icon: BookOpen,
    title: "Base de conhecimento",
    desc: "Treinado com FAQs, políticas e protocolos da clínica via RAG no Dify.",
  },
  {
    icon: Zap,
    title: "Agendamento guiado",
    desc: "Orienta o paciente a agendar uma consulta com as informações certas.",
  },
];

function Assistente() {
  const { user } = useAuth();
  const { data: profileData } = useProfile(user?.id);
  const clinicId = profileData?.clinic?.id ?? "demo";

  return (
    <AppShell
      title="Assistente IA"
      subtitle="Atendimento automatizado · base de conhecimento da clínica"
      flush
    >
      <div
        className="h-full flex flex-col lg:flex-row gap-0 min-h-0"
        style={{ height: "calc(100vh - 80px)" }}
      >
        <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-surface">
          <DifyChat clinicId={clinicId} />
        </div>

        <aside className="w-full lg:w-72 shrink-0 px-4 lg:px-0 lg:pl-5 py-4 lg:py-0 space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Dify · RAG</p>
                <p className="text-xs text-zinc-500">agente de atendimento</p>
              </div>
            </div>
            <div className="space-y-3">
              {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-2.5">
                  <div className="size-6 rounded-md bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="size-3.5 text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-800">{title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-800 mb-1">Modo demo ativo</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Configure <code className="font-mono bg-amber-100 px-1 rounded">DIFY_API_URL</code> e{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">DIFY_API_KEY</code> para
              conectar à sua instância Dify real. Veja{" "}
              <span className="font-medium">docs/dify-integration.md</span>.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
