---
title: Revenue Leak Engine
status: architecture
last_updated: 2026-06-08
---

# DentalFlux — Revenue Leak Engine

> Arquitetura do motor de cálculo de receita perdida e recuperável.
> Status: Documentação pré-implementação.

---

## Conceito

O Revenue Leak Engine é o diferencial estratégico do DentalFlux.
Ele responde em tempo real a pergunta mais importante para qualquer clínica:

> **"Quanto dinheiro você está deixando na mesa agora?"**

Ao contrário de relatórios históricos, o Revenue Leak Engine opera de forma
contínua, recalculando o potencial recuperável à medida que novos dados entram.

---

## As 5 Fontes de Vazamento

### 1. Pacientes Perdidos (Churn de Carteira)

**Definição:** Pacientes que já foram ativos mas pararam de comparecer.

**Critério de classificação:**

- `status = 'inativo'` — sem visita há mais de 90 dias
- `status = 'ativo'` com `last_visit_at < hoje - 180 dias`

**Cálculo do potencial:**

```
potencial_paciente = ticket_medio_clinica × frequencia_media_anual
potencial_total = SUM(potencial_paciente) para todos inativos
```

**Campos necessários (tabela `pacientes`):**

- `last_visit_at`
- `status`
- `ltv` (histórico real, base para ticket médio)

**Classificação de urgência:**

| Dias sem visita | Urgência | Ação sugerida          |
| --------------- | -------- | ---------------------- |
| 91–180 dias     | Média    | Campanha de reativação |
| 181–365 dias    | Alta     | WhatsApp personalizado |
| +365 dias       | Crítica  | Oferta especial        |

---

### 2. Cobranças Pendentes (Inadimplência Ativa)

**Definição:** Valores já gerados mas não recebidos.

**Critério:**

- `status IN ('pendente', 'vencendo', 'atrasada')`

**Cálculo:**

```
vazamento_cobrancas = SUM(value) WHERE status IN ('pendente','vencendo','atrasada')
```

**Subcategorias:**

- `a_vencer` — vence nos próximos 7 dias (risco de inadimplência)
- `vencida_recente` — venceu há 1–30 dias (alta recuperabilidade)
- `vencida_antiga` — venceu há +30 dias (baixa recuperabilidade, custo maior)

**Score de recuperabilidade:**

```
score = (1 / dias_atraso) × ltv_do_paciente × engajamento_whatsapp
```

---

### 3. Oportunidades Abandonadas (Pipeline Morto)

**Definição:** Leads que pararam de progredir no funil sem conversão nem descarte.

**Critério:**

- `stage IN ('novo','contato','agendada')` com `days_in_stage > threshold`

**Thresholds por etapa:**

| Etapa      | Dias sem movimento | Classificação    |
| ---------- | ------------------ | ---------------- |
| novo       | > 3 dias           | Quente esfriando |
| contato    | > 7 dias           | Abandonada       |
| agendada   | > 2 dias do agend. | Risco de falta   |
| confirmada | > 1 dia do agend.  | Crítico          |

**Cálculo:**

```
vazamento_oportunidades = SUM(value) WHERE stage IN critério AND days_in_stage > threshold
```

---

### 4. Avaliações Não Solicitadas (Reputação Perdida)

**Definição:** Pacientes que compareceram e ficaram satisfeitos mas não deixaram avaliação.

**Critério de elegibilidade:**

- Compareceu nos últimos 30 dias (`stage = 'compareceu'` ou `status = 'ativo'`)
- Sem registro em `avaliacoes` para este paciente neste período
- Sem pedido enviado nos últimos 60 dias

**Impacto calculado:**

```
valor_por_avaliacao = novos_pacientes_google_mensal / total_avaliacoes × ticket_medio

elegíveis_sem_pedido = COUNT(pacientes elegíveis)
receita_potencial = elegíveis_sem_pedido × valor_por_avaliacao
```

---

### 5. Tratamentos Incompletos (Plano Abandonado)

**Definição:** Pacientes com tratamento iniciado mas sem retorno para as sessões seguintes.

**Critério:**

- `stage = 'tratamento'` com `days_in_stage > 45`
- `last_visit_at < hoje - 30 dias` para pacientes em tratamento ativo

**Cálculo:**

```
vazamento_tratamento = SUM(treatment_value_remaining) WHERE critério
```

---

## Score de Saúde da Clínica (Clinic Health Score)

Composição do score geral (0–100):

| Componente                 | Peso | Cálculo                                       |
| -------------------------- | ---- | --------------------------------------------- |
| Taxa de retenção           | 30%  | `pacientes_ativos / total_pacientes`          |
| Taxa de inadimplência      | 25%  | `1 - (cobrancas_atrasadas / total_cobrancas)` |
| Taxa de conversão do funil | 20%  | `convertidos / leads_novos_30d`               |
| Taxa de avaliação          | 15%  | `avaliacoes_recebidas / elegíveis`            |
| NPS implícito              | 10%  | `média de ratings × 20`                       |

**Classificação:**

| Score  | Status   | Cor      |
| ------ | -------- | -------- |
| 80–100 | Saudável | Verde    |
| 60–79  | Atenção  | Amarelo  |
| 40–59  | Risco    | Laranja  |
| 0–39   | Crítico  | Vermelho |

---

## Potencial Total Recuperável

Número principal exibido no Dashboard:

```
potencial_recuperavel =
  vazamento_cobrancas +
  (vazamento_oportunidades × taxa_conversao_historica) +
  (pacientes_inativos × ticket_medio × prob_reativacao) +
  (elegíveis_avaliacao × valor_por_avaliacao)
```

Este número é atualizado:

- A cada novo webhook Z-API recebido
- A cada mudança de status de oportunidade
- A cada cobrança criada/paga
- Diariamente via cron job às 06h

---

## Queries SQL de Referência

### Pacientes inativos com potencial

```sql
SELECT
  p.id,
  p.name,
  p.phone,
  p.last_visit_at,
  EXTRACT(day FROM now() - p.last_visit_at)::INTEGER AS days_inactive,
  p.ltv,
  COALESCE(p.ltv / NULLIF(visit_count, 0), avg_ticket.value) AS estimated_ticket
FROM pacientes p
CROSS JOIN (
  SELECT AVG(ltv) AS value
  FROM pacientes
  WHERE clinic_id = current_clinic_id() AND ltv > 0
) avg_ticket
WHERE p.clinic_id = current_clinic_id()
  AND p.status = 'inativo'
  AND p.anonymized_at IS NULL
ORDER BY p.ltv DESC;
```

### Cobranças pendentes por urgência

```sql
SELECT
  c.*,
  p.name AS patient_name,
  p.phone,
  CASE
    WHEN c.due_date > CURRENT_DATE THEN 'a_vencer'
    WHEN c.due_date >= CURRENT_DATE - 30 THEN 'vencida_recente'
    ELSE 'vencida_antiga'
  END AS urgency,
  SUM(c.value) OVER (PARTITION BY c.clinic_id) AS total_pending
FROM cobrancas c
JOIN pacientes p ON p.id = c.patient_id
WHERE c.clinic_id = current_clinic_id()
  AND c.status IN ('pendente', 'vencendo', 'atrasada')
ORDER BY c.due_date ASC;
```

### Oportunidades paradas

```sql
SELECT
  o.*,
  EXTRACT(day FROM now() - o.stage_changed_at)::INTEGER AS days_stalled,
  CASE o.stage
    WHEN 'novo'      THEN 3
    WHEN 'contato'   THEN 7
    WHEN 'agendada'  THEN 2
    ELSE 14
  END AS threshold_days
FROM oportunidades o
WHERE o.clinic_id = current_clinic_id()
  AND o.stage NOT IN ('ativo', 'perdida')
  AND EXTRACT(day FROM now() - o.stage_changed_at) >
    CASE o.stage
      WHEN 'novo'     THEN 3
      WHEN 'contato'  THEN 7
      WHEN 'agendada' THEN 2
      ELSE 14
    END
ORDER BY o.value DESC NULLS LAST;
```

---

## Integração com o Dashboard

O KPI "Potencial Recuperável" deve ser o número mais destacado do Dashboard,
exibido em destaque acima dos demais KPIs.

Componente: `RevenueLeakBanner` (a criar no Sprint 02+)

```typescript
interface RevenueLeakSummary {
  totalRecoverable: number;
  breakdown: {
    inactivePatients: number;
    pendingCharges: number;
    stalledOpportunities: number;
    missingReviews: number;
  };
  urgentActions: number;
  clinicHealthScore: number;
}
```
