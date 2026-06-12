import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, Send, Loader2, User, AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendDifyMessage } from "@/lib/dify.functions";
import type { ChatMessage } from "@/integrations/dify/types";

interface DifyChatProps {
  clinicId: string;
  placeholder?: string;
  welcomeMessage?: string;
}

export function DifyChat({
  clinicId,
  placeholder = "Pergunte sobre procedimentos, horários, convênios…",
  welcomeMessage = "Olá! Sou o assistente IA da clínica. Como posso ajudar você?",
}: DifyChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: welcomeMessage,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMut = useMutation({
    mutationFn: (query: string) => sendDifyMessage({ data: { query, conversationId, clinicId } }),
    onSuccess: (res) => {
      setConversationId(res.conversation_id);
      setMessages((prev) => [
        ...prev,
        {
          id: res.message_id,
          role: "assistant",
          content: res.answer,
          timestamp: res.created_at * 1000,
        },
      ]);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Erro ao processar sua mensagem. Tente novamente. (${(err as Error).message})`,
          timestamp: Date.now(),
        },
      ]);
    },
  });

  function handleSend() {
    const query = input.trim();
    if (!query || sendMut.isPending) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: query, timestamp: Date.now() },
    ]);
    setInput("");
    sendMut.mutate(query);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClear() {
    setMessages([
      { id: "welcome", role: "assistant", content: welcomeMessage, timestamp: Date.now() },
    ]);
    setConversationId(undefined);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Assistente IA</p>
            <p className="text-xs text-zinc-500">Atendimento automatizado · RAG</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-8 px-2 text-zinc-400 hover:text-zinc-700"
        >
          <Trash2 className="size-3.5 mr-1" />
          Limpar
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-4 py-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex gap-2.5", msg.role === "user" && "flex-row-reverse")}
            >
              <div
                className={cn(
                  "size-7 rounded-full shrink-0 flex items-center justify-center mt-0.5",
                  msg.role === "assistant" ? "bg-primary/10" : "bg-zinc-200",
                )}
              >
                {msg.role === "assistant" ? (
                  <Bot className="size-3.5 text-primary" />
                ) : (
                  <User className="size-3.5 text-zinc-600" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "assistant"
                    ? "bg-zinc-100 text-zinc-800 rounded-tl-sm"
                    : "bg-primary text-primary-foreground rounded-tr-sm",
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {sendMut.isPending && (
            <div className="flex gap-2.5">
              <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5 shrink-0">
                <Bot className="size-3.5 text-primary" />
              </div>
              <div className="bg-zinc-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin text-zinc-500" />
                <span className="text-sm text-zinc-500">Digitando…</span>
              </div>
            </div>
          )}

          {sendMut.isError && !sendMut.isPending && (
            <div className="flex items-center gap-2 text-xs text-red-500 px-1">
              <AlertTriangle className="size-3.5 shrink-0" />
              Falha ao conectar com o assistente.
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </ScrollArea>

      <div className="shrink-0 border-t border-border bg-surface px-4 py-3">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={sendMut.isPending}
            rows={1}
            className="resize-none min-h-[40px] max-h-[120px] flex-1 text-sm"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sendMut.isPending}
            size="sm"
            className="h-10 px-3 shrink-0"
          >
            {sendMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-zinc-400 mt-1.5 text-center">
          IA pode cometer erros · confirme informações críticas com a equipe
        </p>
      </div>
    </div>
  );
}
