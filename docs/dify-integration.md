# Integração Dify — Assistente IA com RAG

> **Escopo**: agente de atendimento/triagem de pacientes com Retrieval-Augmented Generation (RAG) sobre a base de conhecimento da clínica. Esta doc é escrita para IAs e devs que darão manutenção depois — o racional está explicitado aqui, não só o "como".

---

## O que é o Dify

[Dify](https://github.com/langgenius/dify) é uma plataforma open-source de orquestração de LLMs. Ela permite:

- Criar um **agente de chat** conectado a um modelo LLM (OpenAI, Anthropic, etc.)
- Criar uma **knowledge base** com documentos da clínica (PDFs, TXTs, Markdown) e fazer RAG: o agente busca trechos relevantes antes de responder
- Gerenciar **conversas com histórico** (Dify armazena o `conversation_id` e mantém contexto entre turnos)
- Expor tudo via **API REST** — é exatamente o que consumimos aqui

## Por que foi adicionado

O DentalFlux já tinha triagem manual (`/app/triagem`) e conversas de WhatsApp (`/app/conversas`). A demanda era **automatizar a primeira camada de atendimento** — responder dúvidas frequentes de pacientes sobre procedimentos, horários, preços e convênios sem precisar de um atendente humano.

Dify foi escolhido porque:

1. **Self-hosted**: dados da clínica não saem do ambiente controlado
2. **RAG nativo**: a knowledge base é gerenciada na própria UI do Dify, sem código extra
3. **API simples**: um único endpoint `/v1/chat-messages` cobre todo o fluxo de chat
4. **Histórico de conversa**: `conversation_id` mantém contexto entre mensagens sem state extra no servidor

---

## Estrutura de arquivos adicionados

```
src/
  integrations/dify/
    types.ts          — interfaces DifyChatRequest, DifyChatResponse, ChatMessage
    client.ts         — cliente HTTP real (createDifyClient)
    mock.ts           — cliente mock para dev sem instância rodando (createDifyMockClient)
  lib/
    dify.functions.ts — createServerFn que proxia chamadas ao Dify (mantém API key server-side)
  components/app/
    dify-chat.tsx     — componente React de chat (usa useMutation + sendDifyMessage)
  routes/
    app.assistente.tsx — rota /app/assistente (TanStack Router file-based)
docs/
  dify-integration.md — este arquivo
```

### Por que o cliente fica server-side

A API key do Dify **nunca deve ser exposta ao browser**. Por isso:

- `DIFY_API_URL` e `DIFY_API_KEY` são vars de ambiente **sem prefixo `VITE_`** — o Vite não as injeta no bundle do cliente
- `dify.functions.ts` usa `createServerFn` do TanStack Start: o handler roda no Node.js (servidor), não no browser
- O componente `DifyChat` chama `sendDifyMessage(...)` que internamente vira um fetch para o endpoint server, nunca diretamente para o Dify

### Comportamento sem configuração (modo mock)

Se `DIFY_API_URL` ou `DIFY_API_KEY` não estiverem definidas, `getDifyClient()` em `dify.functions.ts` usa automaticamente o `createDifyMockClient`. O mock:

- Detecta palavras-chave na pergunta (procedimentos, horário, preço, convênio, emergência, agendamento)
- Retorna respostas pré-definidas com delay simulado (600–1200ms)
- Mantém um `conversation_id` fictício por sessão
- **Não faz nenhuma chamada HTTP** — seguro para CI/CD e testes unitários

---

## Variáveis de ambiente

Adicione ao `.env` (e no painel do provedor de deploy):

```env
# URL base da sua instância Dify (sem trailing slash)
DIFY_API_URL=http://localhost/v1

# API Key do app Dify (gerada em: seu-dify.example.com → App → API Keys)
DIFY_API_KEY=app-xxxxxxxxxxxxxxxx
```

> **Atenção**: `DIFY_API_URL` aponta para a raiz da API Dify. O client já concatena `/v1/chat-messages`.
> Se sua instância tem prefixo (ex: `https://dify.example.com`), use esse valor diretamente.

---

## Rodando o Dify localmente com Docker Compose

> Pré-requisito: Docker Desktop rodando (`docker info` deve responder sem erro).

```bash
# 1. Clone o repositório do Dify
git clone https://github.com/langgenius/dify.git
cd dify/docker

# 2. Copie o arquivo de configuração
cp .env.example .env

# 3. Suba os serviços (pode demorar alguns minutos na primeira vez)
docker compose up -d

# 4. Acesse a interface web
open http://localhost
# Crie conta de admin na primeira visita
```

Serviços que sobem: `api`, `worker`, `web`, `db` (Postgres), `redis`, `weaviate` (vector store), `nginx`.

### Configurar o app de chat no Dify

1. Acesse `http://localhost` → **Studio** → **Create App** → **Chatbot**
2. Dê um nome (ex: "Assistente Clínica")
3. Em **Orchestration** → escolha o LLM (OpenAI GPT-4o ou Anthropic Claude)
4. Em **Knowledge** → conecte a knowledge base que você vai popular (veja seção abaixo)
5. Em **API Access** → copie a **API Key** → coloque em `DIFY_API_KEY`
6. `DIFY_API_URL` = `http://localhost` (ou o IP/domínio público da instância)

---

## Populando a knowledge base com documentos da clínica

No Dify:

1. Menu lateral → **Knowledge** → **Create Knowledge**
2. Dê um nome (ex: "Base Clínica XYZ")
3. **Upload files**: arraste PDFs, DOCXs ou TXTs com:
   - Lista de procedimentos e preços
   - FAQ de pacientes
   - Políticas da clínica (cancelamento, convênios aceitos, horários)
   - Protocolos de atendimento
4. Escolha o modelo de embedding (padrão: `text-embedding-ada-002` ou `bge-large-zh`)
5. Clique em **Save & Process** — o Dify vai indexar os documentos no Weaviate (vector store)
6. Depois de indexado, vá no seu app Chatbot → **Knowledge** → adicione a knowledge base recém-criada

**Formato recomendado dos documentos:**

```markdown
# Procedimentos - Clínica XYZ

## Limpeza Dental

Preço: R$ 180
Duração: 45 minutos
Convênios: Unimed, Bradesco Saúde

## Clareamento a Laser

...
```

Documentos bem estruturados com headings melhoram a qualidade do RAG.

---

## Fluxo de dados na integração

```
Browser (React)
  └─ DifyChat (dify-chat.tsx)
       └─ useMutation → sendDifyMessage({ query, conversationId, clinicId })
            └─ [TanStack Server Function — Node.js]
                 └─ getDifyClient() → DifyClient (real ou mock)
                      └─ fetch POST /v1/chat-messages → Dify API
                           └─ Dify: RAG lookup (Weaviate) + LLM → answer
                      └─ retorna DifyChatResponse { answer, conversation_id, ... }
            └─ [de volta ao browser]
       └─ setMessages + setConversationId
```

O `conversation_id` retornado pelo Dify é mantido em estado React (`useState`). Na próxima mensagem, ele é enviado de volta para o Dify, que usa o histórico armazenado internamente para manter contexto. Se o usuário clicar em "Limpar", o `conversation_id` é descartado e uma nova conversa começa.

---

## Por que isso é uma melhoria real

### Ganhos concretos para a clínica

**Atendimento fora do horário comercial.** Clínicas odontológicas perdem leads porque perguntas chegam às 22h e o atendente responde só no dia seguinte. Com o assistente, o paciente recebe resposta imediata sobre preços, convênios e disponibilidade — e o atendente humano só entra quando a conversa exige julgamento real (fechar agenda, negociar valor, lidar com queixa).

**Base de conhecimento "viva".** A equipe atualiza um documento no Dify (ex: nova tabela de preços, novo convênio aceito) e a resposta do assistente muda imediatamente — sem deploys, sem alterar código. A clínica passa a ter controle editorial direto sobre o que o assistente diz.

**RAG sem construir motor próprio.** Montar um pipeline de RAG do zero significa: escolher vector store, implementar chunking, embeddings, retrieval, reranking, histórico de conversa, observabilidade. O Dify entrega tudo isso pronto. O DentalFlux ganhou o mesmo resultado em horas de integração, não semanas de engenharia.

**Observabilidade e iteração.** O painel do Dify registra todas as conversas, quais trechos da knowledge base foram recuperados, qual foi a latência e o custo por mensagem. A equipe consegue ver onde o assistente erra, corrigir o documento fonte e medir o impacto — sem instrumentar código.

### Trade-offs honestos

| Trade-off                               | Detalhe                                                                                                                                                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dependência operacional**             | O assistente só funciona com uma instância Dify rodando e saudável. Sem Dify configurado, o sistema cai para o mock automaticamente — mas o mock não tem RAG real e retorna respostas genéricas.            |
| **Custo duplo**                         | Há custo de infra para rodar o Dify (Docker/VM/Kubernetes) _mais_ o custo do LLM por token. Numa clínica pequena com baixo volume isso é negligível; em alta escala precisa de sizing adequado.             |
| **Manutenção da instância**             | Updates de segurança, backups do Weaviate, health checks — alguém tem que fazer. Se não há SRE dedicado, uma opção é usar o [Dify Cloud](https://dify.ai) (SaaS gerenciado), alterando só a `DIFY_API_URL`. |
| **Qualidade depende da knowledge base** | RAG é "garbage in, garbage out": documentos mal estruturados ou desatualizados geram respostas ruins. O investimento em manter a base de conhecimento é tão importante quanto o código da integração.       |
| **Sem fallback para humano ainda**      | Hoje o assistente responde, mas não há handoff automático para um atendente quando o assistente não sabe ou o paciente fica insatisfeito. Isso está listado em extensões futuras.                           |

### Quando _não_ usar esta integração

Se a clínica tem volume muito baixo (< 20 perguntas/dia) e já tem atendente humano responsivo, o ROI pode não justificar manter a infra Dify. Neste caso, o mock existente continua funcionando e a rota `/app/assistente` serve como protótipo para demonstrar a funcionalidade antes de ligar o Dify real.

---

## Extensões futuras (não implementadas)

- **Streaming**: o Dify suporta `response_mode: "streaming"` via SSE. Atualmente usamos `"blocking"` por simplicidade. Para experiência mais responsiva em respostas longas, vale implementar o stream reader no server function.
- **Persistência de conversas**: guardar o `conversation_id` no Supabase associado ao paciente, para que o histórico sobreviva a reloads.
- **Integração com pacientes**: passar `inputs: { patient_name, stage }` para o Dify, permitindo respostas personalizadas por contexto.
- **Webhook de entrada**: expor um endpoint que receba mensagens do WhatsApp e as roteie para o Dify antes de chegar ao atendente humano.

---

_Criado em 2026-06-12. Mantido junto com o código — se mudar a estrutura de arquivos, atualize este doc._
