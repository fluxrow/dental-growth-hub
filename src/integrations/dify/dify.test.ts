/**
 * Smoke test da integração Dify.
 *
 * Cobre o caminho padrão de produção quando DIFY_API_URL/DIFY_API_KEY não estão
 * configuradas: cliente mock → resposta → estado do chat component.
 *
 * NÃO testa o server function em si (requer infra TanStack Start rodando), mas
 * testa a lógica que ele envolve: getDifyClient() + client.chat() + shape do
 * DifyChatResponse que o componente consome.
 */

import { describe, it, expect } from "vitest";
import { createDifyMockClient } from "./mock";
import { createDifyClient } from "./client";
import type { ChatMessage, DifyChatResponse } from "./types";

// ---------------------------------------------------------------------------
// Helpers — espelham exatamente o que DifyChat faz em onSuccess/onError
// ---------------------------------------------------------------------------
function applySuccessToMessages(prev: ChatMessage[], res: DifyChatResponse): ChatMessage[] {
  return [
    ...prev,
    {
      id: res.message_id,
      role: "assistant" as const,
      content: res.answer,
      timestamp: res.created_at * 1000,
    },
  ];
}

// ---------------------------------------------------------------------------

describe("createDifyMockClient — cliente usado quando Dify não está configurado", () => {
  it("retorna DifyChatResponse com todos os campos obrigatórios", async () => {
    const client = createDifyMockClient();
    const res = await client.chat({ query: "Olá", user: "clinic-test" });

    expect(res.id).toBeTypeOf("string");
    expect(res.message_id).toBeTypeOf("string");
    expect(res.conversation_id).toBeTypeOf("string");
    expect(res.answer).toBeTypeOf("string");
    expect(res.answer.length).toBeGreaterThan(0);
    expect(res.created_at).toBeGreaterThan(0);
  });

  it("mantém conversation_id passado na requisição", async () => {
    const client = createDifyMockClient();
    const existingId = "conv-abc-123";
    const res = await client.chat({
      query: "outra pergunta",
      user: "clinic-1",
      conversation_id: existingId,
    });
    expect(res.conversation_id).toBe(existingId);
  });

  it("gera novo conversation_id quando nenhum é passado", async () => {
    const client = createDifyMockClient();
    const res = await client.chat({ query: "início", user: "clinic-1" });
    expect(res.conversation_id).toBeTypeOf("string");
    expect(res.conversation_id.length).toBeGreaterThan(0);
  });

  it("IDs de message e conversa são únicos entre chamadas", async () => {
    const client = createDifyMockClient();
    const [r1, r2] = await Promise.all([
      client.chat({ query: "a", user: "u1" }),
      client.chat({ query: "b", user: "u2" }),
    ]);
    expect(r1.message_id).not.toBe(r2.message_id);
    expect(r1.id).not.toBe(r2.id);
  });
});

describe("detecção de palavras-chave no mock", () => {
  const client = createDifyMockClient();

  it("resposta genérica para saudação sem palavra-chave", async () => {
    const res = await client.chat({ query: "Oi, tudo bem?", user: "u" });
    expect(res.answer).toContain("assistente");
  });

  it("detecta 'procedimento'", async () => {
    const res = await client.chat({ query: "Quais procedimentos vocês oferecem?", user: "u" });
    expect(res.answer.toLowerCase()).toMatch(/limpeza|clareamento|ortodontia/);
  });

  it("detecta 'horário'", async () => {
    const res = await client.chat({ query: "Qual o horário de funcionamento?", user: "u" });
    expect(res.answer.toLowerCase()).toMatch(/segunda|sábado|18h/);
  });

  it("detecta 'preço'", async () => {
    const res = await client.chat({ query: "Quanto custa uma limpeza?", user: "u" });
    expect(res.answer).toMatch(/R\$|avaliação/);
  });

  it("detecta 'convênio'", async () => {
    const res = await client.chat({ query: "Aceitam plano Unimed?", user: "u" });
    expect(res.answer.toLowerCase()).toMatch(/unimed|bradesco|convênio|plano/);
  });

  it("detecta 'emergência'", async () => {
    const res = await client.chat({ query: "Estou com muita dor, é urgente!", user: "u" });
    expect(res.answer.toLowerCase()).toMatch(/emergência|urgência|ligue|dor/);
  });

  it("detecta 'agendar'", async () => {
    const res = await client.chat({ query: "Quero agendar uma consulta", user: "u" });
    expect(res.answer.toLowerCase()).toMatch(/consulta|agendar|horário|nome/);
  });
});

describe("fluxo ponta a ponta — mock client → estado do chat component", () => {
  it("mensagem do assistente é adicionada corretamente ao histórico", async () => {
    const client = createDifyMockClient();

    // Estado inicial (igual ao useState do DifyChat)
    const initialMessages: ChatMessage[] = [
      { id: "welcome", role: "assistant", content: "Olá!", timestamp: Date.now() },
    ];

    // Usuário envia mensagem
    const userQuery = "Quero saber sobre clareamento dental";
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userQuery,
      timestamp: Date.now(),
    };
    const afterUserMsg = [...initialMessages, userMsg];

    // Server function (mock) retorna resposta
    const res = await client.chat({ query: userQuery, user: "clinic-demo" });

    // onSuccess do useMutation aplica resposta — mesmo código do componente
    const finalMessages = applySuccessToMessages(afterUserMsg, res);

    expect(finalMessages).toHaveLength(3); // welcome + user + assistant
    const lastMsg = finalMessages[2];
    expect(lastMsg.role).toBe("assistant");
    expect(lastMsg.content).toBe(res.answer);
    expect(lastMsg.id).toBe(res.message_id);
    // Conteúdo é relevante para a pergunta
    expect(lastMsg.content.toLowerCase()).toMatch(/clareamento|procedimento|avaliação/);
  });

  it("conversa de múltiplos turnos mantém conversation_id consistente", async () => {
    const client = createDifyMockClient();

    const turn1 = await client.chat({ query: "Olá", user: "clinic-1" });
    const turn2 = await client.chat({
      query: "Que procedimentos fazem?",
      user: "clinic-1",
      conversation_id: turn1.conversation_id,
    });
    const turn3 = await client.chat({
      query: "Qual o preço?",
      user: "clinic-1",
      conversation_id: turn2.conversation_id,
    });

    // Dify mantém contexto via conversation_id — todos os turnos usam o mesmo ID
    expect(turn2.conversation_id).toBe(turn1.conversation_id);
    expect(turn3.conversation_id).toBe(turn1.conversation_id);
  });
});

describe("createDifyClient — cliente real (estrutura)", () => {
  it("expõe método chat", () => {
    const client = createDifyClient({
      apiUrl: "http://localhost",
      apiKey: "app-test",
    });
    expect(typeof client.chat).toBe("function");
  });
});
