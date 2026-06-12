import type { DifyChatRequest, DifyChatResponse } from "./types";
import type { DifyClient } from "./client";

const MOCK_ANSWERS: Array<[RegExp, string]> = [
  [
    /procedimento|tratamento|serviço|oferecem|fazem/i,
    "Oferecemos limpeza dental (R$ 180), clareamento (R$ 450), ortodontia (a partir de R$ 350/mês), implantes e próteses. Gostaria de agendar uma consulta de avaliação gratuita?",
  ],
  [
    /horário|funcionamento|hora|abre|fecha/i,
    "Funcionamos de segunda a sexta das 8h às 18h, e aos sábados das 8h às 12h. Posso verificar a disponibilidade de horários para você!",
  ],
  [
    /preço|valor|custo|quanto custa|orcamento/i,
    "Os valores variam conforme o procedimento. A consulta de avaliação é gratuita. Limpeza: R$ 180. Clareamento: R$ 450. Para tratamentos mais complexos, agende uma avaliação presencial.",
  ],
  [
    /convênio|plano|seguro|unimed|bradesco|sulamerica/i,
    "Trabalhamos com Unimed, Bradesco Saúde, SulAmérica e Amil. Você possui algum convênio? Posso verificar a cobertura para o seu plano.",
  ],
  [
    /emergência|dor|urgente|urgência/i,
    "Para emergências ligue: (11) 3333-4444. Temos horários de urgência disponíveis para casos de dor intensa.",
  ],
  [
    /agendar|consulta|marcar|agendamento/i,
    "Ótimo! Para agendar uma consulta, preciso do seu nome e telefone. Também podemos verificar disponibilidade diretamente pelo nosso sistema. Qual horário é mais conveniente para você?",
  ],
];

function getMockAnswer(query: string): string {
  for (const [pattern, answer] of MOCK_ANSWERS) {
    if (pattern.test(query)) return answer;
  }
  return "Olá! Sou o assistente IA da clínica. Posso ajudar com informações sobre procedimentos, horários, convênios e agendamentos. Como posso te ajudar?";
}

export function createDifyMockClient(): DifyClient {
  const sessionConversationId = crypto.randomUUID();

  async function chat(req: DifyChatRequest): Promise<DifyChatResponse> {
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));

    return {
      id: crypto.randomUUID(),
      message_id: crypto.randomUUID(),
      conversation_id: req.conversation_id ?? sessionConversationId,
      answer: getMockAnswer(req.query),
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  return { chat };
}
