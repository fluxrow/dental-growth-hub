---
title: Sprint de Automação — DrFlux
type: product-strategy + client-offer
last_updated: 2026-06-09
status: proposta aprovada para execução
---

# DrFlux — Motor de Automação

> **"Sua clínica atende pacientes. O DrFlux garante que nenhum fique pelo caminho."**
>
> Este documento descreve o Sprint de Automação: o conjunto de fluxos que transforma o DrFlux
> de um CRM passivo em um sistema que **age automaticamente** — 24 horas por dia, 7 dias por semana.

---

## O problema que estamos resolvendo

Toda clínica tem os mesmos três buracos:

```
LEAD CHEGA                TRATAMENTO                 PACIENTE
    │                        │                           │
    ▼                        ▼                           ▼
Sem resposta            Orçamento aberto           Some sem avisar
em 47% dos casos        há 15+ dias sem            Nunca é buscado
                        follow-up                  de volta
```

Esses três buracos representam, em média:

| Buraco                            | Impacto mensal estimado                  |
| --------------------------------- | ---------------------------------------- |
| Leads sem resposta (>48h)         | R$ 8.000–35.000 em pipeline desperdiçado |
| Orçamentos abertos/abandonados    | R$ 12.000–54.000 parados no funil        |
| Pacientes inativos sem reativação | R$ 25.000–90.000 em LTV perdido          |
| **Total recuperável médio**       | **R$ 45.000–179.000/mês**                |

O DrFlux fecha esses buracos com automação contextual — não com spam genérico.

---

## Os 7 Fluxos do Sprint de Automação

### AF-01 · Resposta imediata ao novo lead

**Gatilho:** novo lead entra no funil (via formulário, WhatsApp, Meta Ads)
**Ação:** mensagem personalizada em até 5 minutos — mesmo sábado, mesmo madrugada

```
Lead chega → Verificar WhatsApp → Enviar mensagem de boas-vindas
           → Registrar em oportunidades (stage: "contato")
           → Notificar equipe da clínica
```

**Por que importa:**
Clínicas que respondem em menos de 5 minutos têm 9× mais chance de converter o lead.
O concorrente que responde primeiro geralmente fecha.

**Guardrail:** `wa_first_sent_at` — nunca envia duas vezes para o mesmo lead.

---

### AF-02 · Confirmação de consulta (D-1)

**Gatilho:** consulta agendada com `scheduled_at` = amanhã
**Ação:** mensagem de confirmação às 18h do dia anterior

```
D-1 18h → Enviar: "Olá {nome}, lembrando sua consulta amanhã às {hora}"
        → "1 para confirmar / 2 para remarcar"
        → Confirma → stage: "confirmada"
        → Remarca → stage: "novo" + flag para reagendamento
        → Sem resposta → ligar (alerta para recepção)
```

**Por que importa:**
Consultas confirmadas por mensagem têm 78% menos taxa de falta.
Cada falta evitada = R$ 150–800 direto no caixa.

**Guardrail:** `reminder_sent_at` — não reenvia para quem já confirmou.

---

### AF-03 · Recuperação de lead frio

**Gatilho:** cron diário · oportunidades sem movimentação > threshold por etapa

| Etapa    | Threshold           | Ação                             |
| -------- | ------------------- | -------------------------------- |
| novo     | 3 dias sem contato  | Toque inicial                    |
| contato  | 7 dias sem resposta | Follow-up "ainda tem interesse?" |
| agendada | 2 dias após data    | Reagendamento automático         |

```
Cron 09h → Busca leads frios → Para cada:
         → Envia mensagem de reaquecimento (template variado)
         → Registra last_contacted_at
         → Após 3 tentativas sem resposta: stage → "perdida" (lost_reason: sem_resposta)
```

**Por que importa:**
60% das vendas perdidas poderiam ter sido recuperadas com follow-up.
A maioria das clínicas faz no máximo 1 tentativa. O DrFlux faz 3.

---

### AF-04 · Paciente inativo — reativação

**Gatilho:** cron semanal · pacientes com status "inativo" ou sem visita > 90 dias
**Ação:** mensagem personalizada com oferta de retorno

```
Segmentação por dias inativo:
91–180 dias  → "Sentimos sua falta, tudo bem?"
181–365 dias → "Já faz um tempo! Que tal agendarmos seu retorno?"
+365 dias    → "Você é especial pra gente — cupom de retorno para o mês"
```

**Por que importa:**
Reativar paciente existente custa 5× menos que adquirir um novo.
Taxa de reativação média com mensagem personalizada: 18–25%.

---

### AF-05 · Cobrança gentil (escalonada)

**Gatilho:** cobrança com `due_date` próximo ou vencido

```
D-3  → "Lembrete amigável: seu pagamento vence em 3 dias"
D+1  → "Olá! Percebemos que seu pagamento venceu ontem"
D+7  → "Oi {nome}, vamos resolver isso juntos? Posso ajudar"
D+14 → Alerta para a clínica (abordagem humana necessária)
```

**Por que importa:**
Cobranças gentis e progressivas têm 3× mais chance de pagamento que cobrança única.
Clínicas perdem 8–15% do faturamento para inadimplência por falta de follow-up.

---

### AF-06 · Pós-consulta → conversão para tratamento

**Gatilho:** stage muda para "compareceu"
**Ação:** follow-up 2 horas depois da consulta

```
stage = "compareceu" → Aguardar 2h
                     → Enviar: "Como foi sua consulta? Ficou com dúvidas?"
                     → Resposta positiva → Agendar retorno → stage: "tratamento"
                     → Sem resposta em 24h → AF-03 (lead frio)
```

**Por que importa:**
O momento pós-consulta é o de maior intenção de tratamento.
Clínicas que fazem follow-up em 24h têm 40% mais conversão de orçamento.

---

### AF-07 · Avaliação Google (pós-tratamento)

**Gatilho:** paciente com status "ativo" + última visita < 30 dias + sem avaliação recente
**Ação:** pedido de avaliação personalizado

```
7 dias após consulta → Enviar: "Obrigado por confiar na nossa clínica!
                               Você poderia nos ajudar com uma avaliação?"
                     → Link direto para Google Reviews
                     → Registrar em avaliacoes.request_sent_at
```

**Por que importa:**
Cada avaliação 5★ no Google representa ~0,8 novos pacientes por mês.
Clínicas com 4.8★ vs 4.2★ recebem 3× mais cliques no Google.

---

## Arquitetura Técnica

### Stack de execução

```
Supabase (trigger)
    │
    ▼
n8n (orquestrador)  ──────────────────────────────────────────────
    │                         │                    │              │
    ▼                         ▼                    ▼              ▼
WhatsApp (Z-API)         Supabase DB          webhook_events   Slack/
(mensagens)              (atualiza stage,     (audit log)      Email
                          last_contacted_at)                   (alertas)
```

### Campos novos em `oportunidades`

| Campo               | Tipo        | Uso                            |
| ------------------- | ----------- | ------------------------------ |
| `scheduled_at`      | TIMESTAMPTZ | Base para AF-02 (lembrete D-1) |
| `last_contacted_at` | TIMESTAMPTZ | Base para AF-03 (lead frio)    |
| `wa_first_sent_at`  | TIMESTAMPTZ | Idempotency AF-01              |
| `reminder_sent_at`  | TIMESTAMPTZ | Idempotency AF-02              |

### Tabelas novas

| Tabela           | Propósito                                                        |
| ---------------- | ---------------------------------------------------------------- |
| `webhook_events` | Audit log imutável — debug, replay, idempotency                  |
| `automacoes`     | Configuração de cada fluxo por clínica (enable/disable + params) |

### Endpoint novo

```
POST /api/webhooks/meta-leads
```

Recebe leads do Meta Lead Ads → cria oportunidade → dispara AF-01 automaticamente.

---

## Regras anti-ban WhatsApp

Todas as mensagens respeitam:

```
Delay entre mensagens:  2–8 segundos (randomizado)
Volume máximo/dia:      150 mensagens por número
Lotes máximos:          30 mensagens antes de pausa de 10 min
Horário:                seg–sex 8h–20h | sáb 9h–14h
Templates frios:        aprovados pelo Meta previamente
Opt-out:                "PARAR" remove paciente de todas as campanhas
```

---

## O que o cliente configura (UI `/app/automacoes`)

Cada fluxo aparece como um card na tela de Automações:

```
┌─────────────────────────────────────────────────┐
│  ⚡ Resposta Imediata ao Lead           [ON/OFF] │
│  Responde novos leads em até 5 minutos           │
│                                                  │
│  Mensagem enviada: "Olá {nome}, vi seu..."       │
│  [Personalizar]                                  │
│                                                  │
│  📊 Últimos 30 dias: 47 leads respondidos        │
│     Taxa de conversão: 34%                       │
│  💰 Receita estimada recuperada: R$ 12.400       │
└─────────────────────────────────────────────────┘
```

---

## Cronograma de entrega

### Sprint 03 (semanas 1–2) — Fundação

- [x] Campos `scheduled_at` + `last_contacted_at` + idempotency guards em `oportunidades`
- [x] Tabela `webhook_events` (audit log)
- [x] Tabela `automacoes` (configuração)
- [x] Endpoint `POST /api/webhooks/meta-leads` (AF-07 fonte)
- [ ] Tabela `automacoes` conectada à UI `/app/automacoes`
- [ ] AF-01 via Supabase Webhook → n8n (configuração n8n)
- [ ] AF-02 via Cron n8n diário às 18h

### Sprint 04 (semanas 3–4) — Engine completa

- [ ] AF-03 (lead frio) — cron diário
- [ ] AF-04 (reativação) — cron semanal
- [ ] AF-05 (cobrança escalonada) — trigger em `cobrancas`
- [ ] Dashboard de automações com métricas reais

### Sprint 05 (semana 5–6) — Fechamento do ciclo

- [ ] AF-06 (pós-consulta)
- [ ] AF-07 (avaliação Google)
- [ ] Relatório de automações: mensagens enviadas, aberturas, conversões
- [ ] Revenue Leak Engine conectado às métricas reais de automação

---

## ROI esperado por clínica (30 dias após ativação)

| Fluxo                         | Receita recuperada estimada      |
| ----------------------------- | -------------------------------- |
| AF-01 Resposta imediata       | R$ 4.000–18.000                  |
| AF-02 Confirmação D-1         | R$ 2.000–8.000 (faltas evitadas) |
| AF-03 Lead frio               | R$ 3.000–12.000                  |
| AF-04 Reativação inativos     | R$ 8.000–35.000                  |
| AF-05 Cobrança                | R$ 4.000–15.000                  |
| AF-06 Pós-consulta            | R$ 3.000–10.000                  |
| AF-07 Avaliações → novos pac. | R$ 2.000–6.000                   |
| **Total**                     | **R$ 26.000–104.000/mês**        |

> Conservador: baseado em taxa de conversão de 15–25% para fluxos de reativação
> e 70–80% para confirmações. Clínicas com base > 500 pacientes tendem ao limite superior.

---

## Por que agora

Três razões para priorizar este sprint antes do próximo:

**1. O produto já tem o diagnóstico.** A clínica já sabe quanto está perdendo (`/app/diagnostico`).
Sem automação, esse número é só um relatório. Com automação, ele diminui toda semana.

**2. A concorrência ainda não chegou aqui.** ERPs e prontuários não vão construir isso.
É complexo demais para eles e simples demais para ser o core deles. Nossa janela é hoje.

**3. Churn zero quando os fluxos funcionam.** Uma clínica que recuperou R$ 30.000 em 30 dias
não cancela. Automação não é feature — é retenção.

---

_Última atualização: 2026-06-09 · Responsável: Produto + Arquitetura DrFlux_
