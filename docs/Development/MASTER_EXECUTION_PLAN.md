# DrFlux — Master Execution Plan
> Versão 1.0 · 2026-06-09 · Gerado após sessão de estratégia completa

---

## Visão Geral

Este plano cobre **4 sprints críticos** para colocar o DrFlux em condições de:
1. Receber o primeiro cliente pagante com billing funcional
2. Entregar o prometido na call de venda (automações reais, dunning, WhatsApp)
3. Capturar leads via redes sociais (Meta Ads + Instagram DM + FB Comments)
4. Executar automaticamente a régua de Customer Success D+0 → D+90

---

## Índice

- [Sprint 2 — Foundation Ready](#sprint-2--foundation-ready)
- [Sprint 3 — Full Automations + Social](#sprint-3--full-automations--social)
- [Sprint 4 — CS Agent + Admin Panel](#sprint-4--cs-agent--admin-panel)
- [Sprint 5 — Retention Engine](#sprint-5--retention-engine)
- [Stripe Billing — Spec Completa](#stripe-billing--spec-completa)
- [Z-API Webhooks — Spec Completa](#z-api-webhooks--spec-completa)
- [Meta / Instagram — Spec Completa](#meta--instagram--spec-completa)
- [CS Régua Automática — Spec Completa](#cs-régua-automática--spec-completa)
- [Cobranças Dunning Engine — Spec Completa](#cobranças-dunning-engine--spec-completa)
- [Variáveis de Ambiente Necessárias](#variáveis-de-ambiente-necessárias)

---

## Sprint 2 — Foundation Ready
> **Objetivo:** poder fechar o primeiro cliente pagante com tudo funcionando

### Prioridade 1 — Cobranças: Dunning Engine (diferencial de venda)
**Por que primeiro:** é o maior diferencial demonstrável em call. Nenhum concorrente entrega dunning visual.

**Arquivos a criar/modificar:**
```
src/routes/app.cobrancas.tsx              REFACTOR COMPLETO
src/components/app/dunning-queue.tsx      CRIAR — fila de ações urgentes
src/components/app/charge-timeline.tsx    CRIAR — régua visual por paciente
src/components/app/charge-preview-modal.tsx CRIAR — preview + envio
src/lib/cobrancas.functions.ts            CRIAR — server fns
supabase/migrations/YYYYMMDD_cobrancas.sql CRIAR — tabela cobrancas real
```

**Spec da migration `cobrancas`:**
```sql
CREATE TABLE public.cobrancas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID        NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id     UUID        REFERENCES pacientes(id),
  oportunidade_id UUID        REFERENCES oportunidades(id),
  description     TEXT        NOT NULL,
  value           NUMERIC(10,2) NOT NULL,
  due_date        DATE        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pendente',
    -- 'pendente' | 'vencendo' | 'atrasada' | 'recuperada' | 'paga' | 'cancelada'
  channel         TEXT,       -- 'whatsapp' | 'sms' | 'email'
  installment_n   INTEGER,    -- parcela atual
  installment_of  INTEGER,    -- total de parcelas
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cobranca_tentativas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cobranca_id UUID        NOT NULL REFERENCES cobrancas(id) ON DELETE CASCADE,
  channel     TEXT        NOT NULL, -- 'whatsapp' | 'sms' | 'email'
  stage_day   INTEGER     NOT NULL, -- D-3=−3, D+0=0, D+3=3, D+7=7, D+10=10
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT        NOT NULL DEFAULT 'enviado',
    -- 'enviado' | 'entregue' | 'lido' | 'clicado' | 'falhou'
  message_preview TEXT,
  wa_message_id TEXT,  -- Z-API messageId para rastrear status
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para dunning queue
CREATE INDEX cobrancas_dunning_idx ON public.cobrancas
  (clinic_id, status, due_date)
  WHERE status IN ('pendente', 'vencendo', 'atrasada');
```

**Spec do DunningQueue component:**
```tsx
// Mostra cobranças que precisam de ação hoje
// Ordena: atrasadas com mais dias primeiro
// Ação: Enviar WA | Enviar SMS | Ligar | Resolver manualmente
// Batch: selecionar várias e enviar de uma vez (com delay anti-ban)
```

**Spec da régua visual (ChargeTimeline):**
```
D-3 → [enviado/pendente] → D+0 → [entregue/lido] → D+3 → D+7 → D+10 → Escalado
         ↑ linha do tempo horizontal por cobrança
         ↑ marcador de posição atual
         ↑ tooltip com data/status de cada tentativa
```

---

### Prioridade 2 — Stripe Billing (antes de fechar cliente)
→ Ver seção [Stripe Billing](#stripe-billing--spec-completa)

### Prioridade 3 — Z-API Webhooks Inbound
→ Ver seção [Z-API Webhooks](#z-api-webhooks--spec-completa)

---

## Sprint 3 — Full Automations + Social
> **Objetivo:** Automações rodando + captura de leads via redes sociais

### Prioridade 4 — Meta / Instagram Social Webhooks
→ Ver seção [Meta / Instagram](#meta--instagram--spec-completa)

### Prioridade 5 — Automações Backend Real
**AF-01 Resposta imediata ao lead:** já tem gatilho no `meta-leads.ts` via Supabase webhook → n8n
**AF-02 Confirmação D-1:** precisa de cron que busca `oportunidades` com `scheduled_at = tomorrow`
**AF-03 Lead frio:** cron que busca `last_contacted_at < threshold by stage`
**AF-04 Reativação:** cron semanal pacientes sem visita > 90 dias
**AF-05 Cobrança escalonada:** integrado ao dunning engine de Sprint 2
**AF-06 Pós-consulta:** trigger em `stage → compareceu`
**AF-07 Avaliação Google:** 7 dias após comparecimento

**Arquivos:**
```
src/routes/api/cron/af-02-confirmacao.ts   CRIAR
src/routes/api/cron/af-03-lead-frio.ts     CRIAR
src/routes/api/cron/af-04-reativacao.ts    CRIAR
src/routes/api/cron/af-06-pos-consulta.ts  CRIAR (trigger)
src/routes/api/cron/af-07-avaliacao.ts     CRIAR (cron D+7)
```

---

## Sprint 4 — CS Agent + Admin Panel
> **Objetivo:** régua de Customer Success automática executada pelo "agente"

→ Ver seção [CS Régua Automática](#cs-régua-automática--spec-completa)

---

## Sprint 5 — Retention Engine
> **Objetivo:** evitar churn antes de acontecer

### Cancel Flow
```
src/routes/app.configuracoes.tsx  → adicionar seção "Cancelar assinatura"
src/components/app/cancel-flow-modal.tsx  CRIAR
src/routes/api/cancel-flow.ts     CRIAR — registra reason, dispara save offer
```

**Save offers por razão:**
| Razão | Oferta |
|---|---|
| Muito caro | 1 mês grátis se pagar anual |
| Não usando | Pausa 30 dias + sessão de onboarding gratuita |
| Faltou feature | Preview do roadmap + compromisso |
| Problema técnico | CS call em 2h |
| Fechando negócio | Gratidão + exportação de dados em 1 clique |

### Health Score
```sql
-- View materializada atualizada diariamente
CREATE MATERIALIZED VIEW clinic_health_scores AS
SELECT
  clinic_id,
  (login_score * 0.30 + feature_score * 0.25 + billing_score * 0.25 + engagement_score * 0.20) AS score,
  CASE
    WHEN score >= 80 THEN 'healthy'
    WHEN score >= 60 THEN 'attention'
    WHEN score >= 40 THEN 'at_risk'
    ELSE 'critical'
  END AS status
FROM ...
```

---

## Stripe Billing — Spec Completa

### Produtos a criar no Stripe Dashboard

```
Produto 1: DrFlux Implementação
  - Tipo: one_time
  - Preço: R$1.997,00 (BRL)
  - ID sugerido: prod_drflux_impl

Produto 2: DrFlux Recorrente Mensal
  - Tipo: recurring, interval: month
  - Preço: R$997,00/mês (BRL)
  - Trial: 0 dias (venda via call, não self-serve)
  - ID sugerido: prod_drflux_monthly

Produto 3: DrFlux Recorrente Anual
  - Tipo: recurring, interval: year
  - Preço: R$8.970,00/ano (25% off = 3 meses grátis)
  - ID sugerido: prod_drflux_annual
```

### Arquivos a criar

```
src/lib/billing.functions.ts          CRIAR — server fns Stripe
src/routes/api/webhooks/stripe.ts     CRIAR — webhook handler
src/routes/app.billing.tsx            CRIAR — página de assinatura admin
supabase/migrations/YYYYMMDD_plans.sql CRIAR — tabelas de billing
```

### Migration `plans` + `clinic_subscriptions`

```sql
-- Planos disponíveis (seed fixo — só superadmin altera)
CREATE TABLE public.plans (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_price_id TEXT NOT NULL UNIQUE,
  name         TEXT    NOT NULL,
  interval     TEXT    NOT NULL, -- 'month' | 'year' | 'one_time'
  amount_cents INTEGER NOT NULL,
  currency     TEXT    NOT NULL DEFAULT 'brl',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  features     JSONB   NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assinatura atual de cada clínica
CREATE TABLE public.clinic_subscriptions (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id             UUID    NOT NULL UNIQUE REFERENCES clinicas(id),
  stripe_customer_id    TEXT    NOT NULL UNIQUE,
  stripe_subscription_id TEXT   UNIQUE,
  plan_id               UUID    REFERENCES plans(id),
  status                TEXT    NOT NULL DEFAULT 'trialing',
    -- 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled'
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT false,
  canceled_at           TIMESTAMPTZ,
  trial_end             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Histórico de pagamentos
CREATE TABLE public.payment_events (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         UUID    REFERENCES clinicas(id),
  stripe_event_id   TEXT    NOT NULL UNIQUE, -- idempotency
  event_type        TEXT    NOT NULL,
  amount_cents      INTEGER,
  currency          TEXT,
  status            TEXT,
  invoice_id        TEXT,
  payload           JSONB   NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `billing.functions.ts` — server fns

```typescript
// createCheckoutSession({ clinicId, planId, successUrl, cancelUrl })
// → cria Stripe Customer se não existir
// → cria Checkout Session com implementation fee + recurring
// → retorna { url } para redirecionar

// createPortalSession({ clinicId })
// → Stripe Billing Portal para atualizar cartão / cancelar

// getSubscriptionStatus({ clinicId })
// → retorna { status, plan, currentPeriodEnd, cancelAtPeriodEnd }
```

### `src/routes/api/webhooks/stripe.ts` — webhook handler

**Eventos críticos a processar:**

```typescript
// MUST HANDLE (críticos):
'checkout.session.completed'     → ativar assinatura + provisionar acesso
'invoice.paid'                   → renovação confirmada → atualizar period_end
'invoice.payment_failed'         → enviar dunning email + notificar CS
'customer.subscription.deleted'  → revogar acesso + iniciar offboarding
'customer.subscription.updated'  → sincronizar status

// SHOULD HANDLE (recomendados):
'customer.subscription.trial_will_end'  → notificar cliente 3 dias antes
'invoice.upcoming'               → aviso de cobrança próxima
'customer.subscription.paused'  → registrar pausa para cancel flow
'invoice.payment_action_required' → notificar autenticação necessária (3DS)
```

**Estrutura do handler:**

```typescript
// POST /api/webhooks/stripe
// 1. Verificar Stripe-Signature com stripe.webhooks.constructEvent()
// 2. Inserir em payment_events para idempotency (stripe_event_id UNIQUE)
// 3. Switch por event.type → processar ação
// 4. Retornar 200 imediatamente, processar assincronamente

// IMPORTANTE: Stripe retenta por 3 dias se não receber 200 em < 5s
// Usar mesmo padrão do meta-leads.ts: responder + processEvents() async
```

### Variáveis de ambiente necessárias (Stripe)

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
STRIPE_PRICE_ID_IMPL=price_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Z-API Webhooks — Spec Completa

### Estado atual
- Z-API já referenciado em `ZAPIIntegration.md` e estrutura existe
- `webhook_events` table já existe (migration `automation_fields.sql`)
- Meta Leads webhook já implementado como referência

### Webhooks a implementar

| Evento Z-API | Endpoint nosso | Finalidade |
|---|---|---|
| `on-message-received` | `/api/webhooks/zapi-receive` | Receber msgs dos pacientes + alimentar Conversas |
| `on-message-send` (sent by me) | `/api/webhooks/zapi-receive` | Mesmo handler — flag `fromMe=true` |
| `on-whatsapp-message-status-changes` | `/api/webhooks/zapi-status` | Atualizar status nas tentativas de cobrança |
| `on-whatsapp-disconnected` | `/api/webhooks/zapi-disconnect` | Alertar admin que número desconectou |
| `on-webhook-connected` | `/api/webhooks/zapi-connect` | Registrar reconexão |

### Arquivos a criar

```
src/routes/api/webhooks/zapi-receive.ts      CRIAR
src/routes/api/webhooks/zapi-status.ts       CRIAR
src/routes/api/webhooks/zapi-disconnect.ts   CRIAR
src/routes/api/webhooks/zapi-connect.ts      CRIAR
src/lib/zapi.functions.ts                    CRIAR — server fns de envio
src/lib/zapi-register.ts                     CRIAR — registrar webhooks ao conectar instância
```

### Payload do `on-message-received`

```typescript
interface ZAPIMessagePayload {
  instanceId: string;
  messageId: string;
  phone: string;           // ex: "5511999999999@c.us"
  fromMe: boolean;
  momment: number;         // timestamp Unix
  status: "PENDING" | "SENT" | "RECEIVED" | "READ" | "PLAYED";
  senderName: string;
  connectedPhone: string;
  broadcast: boolean;
  type: "text" | "image" | "audio" | "video" | "document" | "sticker";
  // Para texto:
  text?: {
    message: string;
    description?: string;
  };
  // Para imagem:
  image?: {
    imageUrl: string;
    caption?: string;
    mimeType: string;
  };
  // Para áudio/ptt:
  audio?: {
    audioUrl: string;
    ptt: boolean;   // true = mensagem de voz
    seconds: number;
    mimeType: string;
  };
}
```

### `zapi-receive.ts` — lógica completa

```typescript
// POST /api/webhooks/zapi-receive
// 1. Sem assinatura HMAC no Z-API — validar instanceId + token da header
// 2. Inserir em webhook_events (source: 'zapi_receive')
// 3. Resolver clinic_id via clinic_integrations WHERE provider='zapi' AND instance_id=payload.instanceId
// 4. Normalizar phone → remover @c.us, garantir +55
// 5. Buscar ou criar conversa em 'conversas' por phone + clinic_id
// 6. Inserir mensagem em 'mensagens'
// 7. Se fromMe=false → notificar via Supabase Realtime (já funciona automaticamente)
// 8. Se fromMe=false + oportunidade em stage 'novo' → pode disparar AI response (futuro)
```

### `zapi-status.ts` — atualização de status de cobrança

```typescript
// POST /api/webhooks/zapi-status
// Payload: { messageId, status: 'READ' | 'RECEIVED' | 'PLAYED' }
// 1. Buscar cobranca_tentativas WHERE wa_message_id = messageId
// 2. Atualizar status: 'enviado' → 'entregue' → 'lido'
// 3. Se lida → atualizar cobrancas.status para 'em_acompanhamento'
// 4. Se lida há 48h sem pagamento → enfileirar próxima tentativa da régua
```

### `zapi.functions.ts` — envio

```typescript
// sendText({ instanceId, token, phone, message })
// sendTemplate({ instanceId, token, phone, template, vars })
// sendCobranca({ clinicId, cobrancaId, stageDay })
//   → busca template da régua para stageDay
//   → personaliza com nome, valor, link de pagamento
//   → insere cobranca_tentativas com stage_day
//   → chama sendText + salva wa_message_id

// Registro de webhooks ao conectar instância:
// registerAllWebhooks({ instanceId, token, baseUrl })
//   → PUT /instances/{id}/receive + status + disconnect + connected
//   → usa update-every-webhooks para um único request
```

### Variáveis de ambiente necessárias (Z-API)

```env
ZAPI_BASE_URL=https://api.z-api.io
ZAPI_INSTANCE_TOKEN=...      # da instância no painel Z-API (por clínica)
ZAPI_CLIENT_TOKEN=...        # autenticação da conta no Z-API
```

> **Multi-tenant:** cada clínica tem sua própria instância Z-API.
> `clinic_integrations` armazena `{ provider: 'zapi', instance_id, token }` por `clinic_id`.

---

## Meta / Instagram — Spec Completa

### O que já existe
- `/api/webhooks/meta-leads.ts` — Lead Ads já implementado ✅
- `clinic_integrations` table referenciada

### O que falta

| Canal | Evento | Endpoint | Status |
|---|---|---|---|
| Meta Lead Ads | Novo lead via formulário | `/api/webhooks/meta-leads` | ✅ Implementado |
| Instagram DM | Mensagem direta recebida | `/api/webhooks/meta-messages` | ❌ A criar |
| Facebook DM | Mensagem via Messenger | `/api/webhooks/meta-messages` | ❌ A criar |
| Instagram Comments | Comentário em post | `/api/webhooks/meta-comments` | ❌ A criar |
| Facebook Comments | Comentário em post | `/api/webhooks/meta-comments` | ❌ A criar |
| Instagram Mention | @ menção em story/post | `/api/webhooks/meta-mentions` | ❌ A criar (Sprint 4) |

### Arquivos a criar

```
src/routes/api/webhooks/meta-messages.ts    CRIAR — DMs Instagram + Messenger
src/routes/api/webhooks/meta-comments.ts    CRIAR — comentários
```

### Permissões do Meta App necessárias

```
Para Lead Ads (já configurado):
  pages_manage_ads
  leads_retrieval

Para Instagram DM:
  instagram_manage_messages
  instagram_basic

Para Facebook DM (Messenger):
  pages_messaging
  pages_read_engagement

Para Comments:
  instagram_manage_comments
  pages_manage_engagement

Para Pages (geral):
  pages_read_engagement
  pages_show_list
```

### `meta-messages.ts` — handler de DMs

```typescript
// POST /api/webhooks/meta-messages
// Mesmo fluxo de verificação do meta-leads.ts (GET challenge + POST HMAC)
//
// Payload de DM recebida:
// {
//   object: "instagram" | "page",
//   entry: [{
//     id: "page_or_ig_id",
//     messaging: [{
//       sender: { id: "sender_psid" },
//       recipient: { id: "page_id" },
//       timestamp: 1234567890,
//       message: {
//         mid: "message_id",
//         text: "Olá, quero agendar uma consulta",
//         attachments?: [{ type: "image", payload: { url: "..." } }]
//       }
//     }]
//   }]
// }
//
// Lógica:
// 1. Verificar assinatura HMAC-SHA256 (X-Hub-Signature-256)
// 2. Resolver clinic_id via clinic_integrations WHERE provider='meta_ig' OR 'meta_fb'
// 3. Normalizar sender.id como "identificador" (não phone, é PSID)
// 4. Buscar ou criar conversa em 'conversas' WHERE external_id = sender.id
// 5. Inserir mensagem em 'mensagens' (channel: 'instagram_dm' | 'facebook_dm')
// 6. Se sender parece lead novo → criar oportunidade no stage 'novo' + AF-01
// 7. Notificar via Realtime para Conversas aparecer em tempo real
```

### `meta-comments.ts` — handler de comentários

```typescript
// Payload de comentário em post:
// {
//   object: "instagram" | "page",
//   entry: [{
//     id: "...",
//     changes: [{
//       field: "comments",
//       value: {
//         id: "comment_id",
//         media: { id: "post_id" },
//         from: { id: "user_id", username: "user_name" },
//         text: "Quanto custa? Me manda DM!",
//         timestamp: 1234567890
//       }
//     }]
//   }]
// }
//
// Lógica:
// 1. Se comentário contém palavras-chave (preço, agendar, quanto, consulta)
//    → Criar lead automático na stage 'novo' com source='instagram_comment'
//    → Disparar AF-01 via DM (se clinic permitiu resposta automática)
// 2. Registrar em webhook_events para auditoria
// 3. Mostrar na aba Conversas com origem 'Instagram · Comentário'
```

### Configuração no Meta for Developers

```
App Dashboard → Webhooks → Adicionar produto
  → Subscribe to:
    ✓ leadgen (já configurado)
    ✓ messages (para DMs)
    ✓ comments (para comentários)
    ✓ mention (Sprint 4)

Callback URL: https://drflux.app/api/webhooks/meta-messages
Verify Token: META_WEBHOOK_VERIFY_TOKEN (mesmo da env)
```

### Variáveis de ambiente necessárias (Meta)

```env
META_WEBHOOK_VERIFY_TOKEN=...   # já existe
META_APP_SECRET=...             # já existe
META_PAGE_ACCESS_TOKEN=...      # para responder DMs e comentários
META_INSTAGRAM_ACCESS_TOKEN=... # para Instagram Graph API
META_APP_ID=...                 # para autenticação OAuth do usuário
```

---

## CS Régua Automática — Spec Completa

### Visão geral

O "agente" é uma combinação de:
1. **Crons agendados** que verificam qual etapa da régua deve ser executada
2. **Templates de mensagem** por etapa
3. **Admin panel** para supervisão e intervenção manual

### Banco de dados necessário

```sql
-- Régua de CS por cliente
CREATE TABLE public.cs_touchpoints (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID        NOT NULL REFERENCES clinicas(id),
  touchpoint  TEXT        NOT NULL,
    -- 'd0_kickoff' | 'd7_checkin' | 'd30_qbr' | 'd90_renewal'
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  status      TEXT        NOT NULL DEFAULT 'pending',
    -- 'pending' | 'sent' | 'done' | 'skipped' | 'failed'
  channel     TEXT        NOT NULL DEFAULT 'whatsapp',
  message_sent TEXT,
  notes       TEXT,       -- CS pode adicionar notas após ligação
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed automático ao ativar assinatura:
-- INSERT cs_touchpoints:
--   D+0  → scheduled_at = subscription_start + 0 dias
--   D+7  → scheduled_at = subscription_start + 7 dias
--   D+30 → scheduled_at = subscription_start + 30 dias
--   D+90 → scheduled_at = subscription_start + 90 dias
```

### Templates de mensagem por etapa

**D+0 — Kick-off (imediato após pagamento)**
```
Olá {dentista_nome}! 🎉 Aqui é o DrFlux.

Sua assinatura foi ativada com sucesso. 

Próximos passos:
1. Acesse: app.drflux.com.br
2. Importe sua base de pacientes (levamos ~30 min)
3. Conecte seu WhatsApp

Posso te chamar agora para o kick-off? Leva só 1 hora e você já sai com tudo funcionando. 

Qual horário funciona hoje ou amanhã?
```

**D+7 — Check-in**
```
Oi {dentista_nome}, tudo bem?

Já faz 1 semana de DrFlux. 

Vi que você {acao_feita} — ótimo! 🎯

Sua clínica já tem {metricas}:
• {n} cobranças enviadas
• R$ {valor} em recuperação iniciada
• {n} leads atendidos

Tem alguma dúvida ou algo que não está funcionando como esperado?
```

**D+30 — QBR Lite**
```
{dentista_nome}, 1 mês de DrFlux! 🏆

Resultado do seu primeiro mês:
📊 R$ {valor_recuperado} em cobranças recuperadas
💌 {n} automações de WhatsApp enviadas
👥 {n} leads no pipeline
📉 Taxa de inadimplência: {taxa}%

Isso representa {roi}x o valor da sua assinatura.

Posso te ligar para um review de 20 minutos?
```

**D+90 — Renovação Anual**
```
{dentista_nome}, 3 meses se passaram rápido! 

Resultado acumulado:
• R$ {total_recuperado} recuperados
• {n} automações executadas
• {n} pacientes reativados

Clínicas que migram para o plano anual economizam R$2.994/ano (3 meses grátis) e travam esse ROI.

Topa um papo de 15 min para eu mostrar o que vem no próximo trimestre?
```

### Cron handler

```typescript
// src/routes/api/cron/cs-touchpoints.ts
// Executa a cada hora — verifica touchpoints pendentes com scheduled_at <= now()

// Lógica:
// 1. SELECT * FROM cs_touchpoints WHERE status='pending' AND scheduled_at <= now()
// 2. Para cada touchpoint:
//    a. Buscar métricas da clínica (valor_recuperado, n_automacoes, etc.)
//    b. Personalizar template com métricas reais
//    c. Enviar via Z-API (WhatsApp) ou email
//    d. Atualizar status → 'sent'
//    e. Inserir em webhook_events para auditoria
// 3. Retornar 200

// Para D+30 e D+90: verificar se há CS humano disponível
//   → Se sim: notificar CS via Slack/WhatsApp (canal interno) para fazer call
//   → Se não: enviar mensagem automática com link para agendar
```

### Admin Panel — Supervisão da Régua

```
/admin/cs-queue
  → Lista todos os touchpoints pendentes/executados
  → Filtro por status: pending | sent | done | skipped
  → Por touchpoint: d0_kickoff | d7_checkin | d30_qbr | d90_renewal
  → Ações:
    - "Executar agora" (força envio imediato)
    - "Marcar como feito" (ligação manual já feita)
    - "Pular" (cliente não precisa)
    - "Editar mensagem" (personalizar antes de enviar)
  → Métricas: taxa de resposta por etapa, % de clientes no D+90 que renovaram
```

---

## Cobranças Dunning Engine — Spec Completa

### Régua de cobrança (default — editável por clínica)

```
D-3  → Lembrete preventivo: "Sua consulta de {proc} vence em 3 dias. Valor: R${valor}"
D+0  → Vencimento: "Seu pagamento de R${valor} vence hoje. Clique para pagar: {link}"
D+3  → Amigável: "Vimos que o pagamento ainda está em aberto. Podemos parcelar?"
D+7  → Urgência: "Último aviso antes de encaminhar para cobrança formal. R${valor}"
D+10 → Escalação: "Encaminhando para contato direto. Por favor nos acione."
```

### KPIs do Dunning Dashboard

```
┌─────────────────────────────────────────────────────┐
│  COBRANÇAS                                           │
│  Taxa de recuperação este mês: 78% (+6% vs anterior)│
│  Total recuperado: R$86.420 ████████████░░░░         │
│  Em risco (vencendo em 3d): R$3.240  ⚠️              │
│  Atrasadas sem tentativa: 3  🔴                      │
└─────────────────────────────────────────────────────┘
```

### Dunning Queue (prioridade de ação)

```
Cobranças que precisam de ação HOJE:
┌─────────────────────────────────────────────────────┐
│ 🔴 Roberto Cunha · R$320 · +13d · nenhuma tentativa  │
│    [Enviar WA agora ↗] [Ligar] [Resolver]            │
│                                                      │
│ 🔴 Lucas Borges · R$280 · +11d · 2 tentativas        │
│    [Enviar WA agora ↗] [Escalar] [Resolver]          │
│                                                      │
│ ⚠️ Camila Vasconcelos · R$840 · vence em 3d          │
│    [Enviar lembrete preventivo] [Resolver]            │
└─────────────────────────────────────────────────────┘
```

### Timeline visual por cobrança

```
Roberto Cunha · Ortodontia · R$320 · +13 dias

D-3     D+0     D+3     D+7     D+10
 ○───────○───────○───────○───────●
                                  Vencimento atingido
                                  Nenhuma tentativa enviada
                                  [Enviar agora]
```

---

## Variáveis de Ambiente Necessárias

### Arquivo `.env` completo

```env
# ── Supabase ──────────────────────────────────────────
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # somente em *.server.ts

# ── Stripe ────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
STRIPE_PRICE_ID_IMPL=price_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# ── Z-API ─────────────────────────────────────────────
ZAPI_BASE_URL=https://api.z-api.io
ZAPI_CLIENT_TOKEN=...              # autenticação da conta (header Client-Token)
# Por clínica: armazenado em clinic_integrations, NÃO em env

# ── Meta / Instagram ──────────────────────────────────
META_WEBHOOK_VERIFY_TOKEN=...      # já existe
META_APP_SECRET=...                # já existe
META_PAGE_ACCESS_TOKEN=...         # para responder msgs
META_INSTAGRAM_ACCESS_TOKEN=...    # Instagram Graph API
META_APP_ID=...                    # OAuth app

# ── Comunicação interna ───────────────────────────────
INTERNAL_WA_INSTANCE_ID=...        # instância Z-API do DrFlux (CS alerts)
INTERNAL_WA_TOKEN=...
INTERNAL_ALERT_PHONE=+5511...      # cel do CS para alertas urgentes
```

---

## Checklist de Execução — Sprint 2

- [ ] **Cobrancas Migration** — criar tabela + tentativas + índices
- [ ] **DunningQueue Component** — lista priorizada com ações
- [ ] **ChargeTimeline Component** — régua visual D-3 a D+10
- [ ] **ChargePreviewModal** — preview WA/email antes do envio
- [ ] **cobrancas.functions.ts** — createCobranca, sendDunning, markPaid
- [ ] **app.cobrancas.tsx** — refactor com todos os componentes
- [ ] **Stripe Products** — criar no Dashboard (Impl + Monthly + Annual)
- [ ] **plans migration** — tabelas plans + clinic_subscriptions + payment_events
- [ ] **billing.functions.ts** — createCheckoutSession, createPortal, getStatus
- [ ] **stripe webhook** — handler com todos os 9 eventos
- [ ] **Env vars** — configurar em Lovable / Vercel
- [ ] **Z-API webhooks** — zapi-receive + zapi-status + zapi-disconnect
- [ ] **zapi.functions.ts** — sendText, sendCobranca, registerWebhooks

## Checklist de Execução — Sprint 3

- [ ] **Meta DM webhook** — meta-messages.ts
- [ ] **Meta Comments webhook** — meta-comments.ts
- [ ] **Meta App permissions** — solicitar no Meta for Developers
- [ ] **AF-02 cron** — confirmação D-1
- [ ] **AF-03 cron** — lead frio
- [ ] **AF-04 cron** — reativação pacientes
- [ ] **AF-06 trigger** — pós-consulta
- [ ] **AF-07 cron** — avaliação Google D+7

## Checklist de Execução — Sprint 4

- [ ] **cs_touchpoints migration**
- [ ] **cs-touchpoints cron** — verificar e executar régua
- [ ] **Templates de mensagem** por etapa com variáveis reais
- [ ] **Admin CS Queue** — /admin/cs-queue
- [ ] **Seed automático** ao ativar assinatura (checkout.session.completed)

## Checklist de Execução — Sprint 5

- [ ] **cancel-flow-modal** — survey + save offer
- [ ] **health score view** — materializada + refresh diário
- [ ] **Win-back email** — D+7, D+30, D+90 pós-cancelamento
- [ ] **Dunning próprio** — Stripe Smart Retries configurado
- [ ] **Dunning emails** — sequência própria do DrFlux para clientes inadimplentes

---

_Documento vivo — atualizar após cada sprint._
_Última atualização: 2026-06-09_
