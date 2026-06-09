---
title: Clinic Diagnostic
status: architecture
last_updated: 2026-06-08
---

# DentalFlux — Clinic Diagnostic

> Arquitetura do diagnóstico automático de oportunidades de receita.
> Status: Documentação pré-implementação.

---

## Conceito

O Diagnóstico da Clínica é o primeiro e mais poderoso momento "Uau" do DentalFlux.

Acontece em dois contextos:

1. **Após importação de dados** — resultado imediato da migração
2. **Diagnóstico periódico** — recalculado mensalmente ou sob demanda

A ideia central: **mostrar para o dono da clínica, em 30 segundos,
quanto dinheiro ele está deixando de ganhar agora**.

---

## Componentes do Diagnóstico

### 1. Diagnóstico de Pacientes Inativos

```sql
-- Quantidade e potencial de reativação
SELECT
  COUNT(*) AS total_inativos,
  ROUND(AVG(ltv), 2) AS ltv_medio,
  SUM(ltv) AS ltv_total_inativos,
  -- Estimativa conservadora: 20% de taxa de reativação × LTV médio
  ROUND(COUNT(*) * 0.20 * AVG(ltv), 2) AS potencial_reativacao
FROM pacientes
WHERE clinic_id = current_clinic_id()
  AND status = 'inativo'
  AND anonymized_at IS NULL;
```

**Saída no diagnóstico:**

```
🔴 247 pacientes inativos identificados
   LTV médio: R$ 1.847
   Potencial de reativação: R$ 91.173
   (estimativa conservadora: 20% de conversão)
```

---

### 2. Diagnóstico de Cobranças Abertas

```sql
SELECT
  COUNT(*) AS total_cobrancas_abertas,
  SUM(value) AS valor_total,
  SUM(CASE WHEN due_date > CURRENT_DATE THEN value ELSE 0 END) AS a_vencer,
  SUM(CASE WHEN due_date <= CURRENT_DATE
            AND due_date >= CURRENT_DATE - 30 THEN value ELSE 0 END) AS vencida_recente,
  SUM(CASE WHEN due_date < CURRENT_DATE - 30 THEN value ELSE 0 END) AS vencida_antiga
FROM cobrancas
WHERE clinic_id = current_clinic_id()
  AND status IN ('pendente', 'vencendo', 'atrasada');
```

**Saída no diagnóstico:**

```
🟡 R$ 34.500 em cobranças pendentes
   A vencer (7 dias): R$ 8.200   — Ação: lembrete preventivo
   Vencida recente:   R$ 18.300  — Alta chance de recuperação
   Vencida antiga:    R$ 8.000   — Requer abordagem diferenciada
```

---

### 3. Diagnóstico de Oportunidades Abandonadas

```sql
SELECT
  COUNT(*) AS total_abandonadas,
  SUM(value) AS valor_total,
  AVG(EXTRACT(day FROM now() - stage_changed_at))::INTEGER AS media_dias_parada
FROM oportunidades
WHERE clinic_id = current_clinic_id()
  AND stage IN ('novo', 'contato', 'agendada')
  AND EXTRACT(day FROM now() - stage_changed_at) >
    CASE stage
      WHEN 'novo'     THEN 3
      WHEN 'contato'  THEN 7
      WHEN 'agendada' THEN 2
      ELSE 14
    END;
```

**Saída no diagnóstico:**

```
🟠 18 oportunidades abandonadas no funil
   Valor estimado: R$ 54.200
   Média de dias paradas: 12 dias
   Ação recomendada: retomar contato hoje
```

---

### 4. Diagnóstico de Avaliações Google Perdidas

```sql
SELECT COUNT(*) AS elegíveis_sem_pedido
FROM pacientes p
WHERE p.clinic_id = current_clinic_id()
  AND p.status IN ('ativo', 'tratamento')
  AND p.last_visit_at >= CURRENT_DATE - 30
  AND NOT EXISTS (
    SELECT 1 FROM avaliacoes a
    WHERE a.patient_id = p.id
      AND a.request_sent_at >= CURRENT_DATE - 60
  );
```

**Saída no diagnóstico:**

```
⭐ 34 pacientes atendidos ainda não avaliaram você no Google
   Nota atual estimada: 4.2★
   Com mais avaliações positivas: 4.8★ (média esperada)
   Impacto estimado: +12 novos pacientes/mês via Google
```

---

### 5. Score de Saúde Geral (Clinic Health Score)

| Componente            | Peso | Fórmula                                                     |
| --------------------- | ---- | ----------------------------------------------------------- |
| Retenção de pacientes | 30%  | `ativos / (ativos + inativos)`                              |
| Adimplência           | 25%  | `1 - (cobrancas_atrasadas_valor / total_cobrancas_valor)`   |
| Velocidade do funil   | 20%  | `1 - (oportunidades_paradas / total_oportunidades_abertas)` |
| Reputação Google      | 15%  | `avaliacoes_recentes / elegíveis`                           |
| Engajamento WhatsApp  | 10%  | `mensagens_respondidas / mensagens_enviadas_7d`             |

**Exibição visual:**

- Gauge circular grande (0–100)
- Verde (80+) / Amarelo (60–79) / Laranja (40–59) / Vermelho (0–39)
- Comparação futura: "Clínicas similares: 72 pontos"

---

## O Relatório de Diagnóstico — Wireframe

```
┌─────────────────────────────────────────────────┐
│  DIAGNÓSTICO DA CLÍNICA          [Data]          │
│                                                  │
│            Clinic Health Score                   │
│                   [72]                           │
│               ● Atenção                         │
│                                                  │
│         Potencial Total Recuperável              │
│               R$ 179.873                         │
│                                                  │
├──────────────┬───────────────┬──────────────────┤
│     247      │   R$ 34.500   │       18         │
│  Pacientes   │   Cobranças   │  Oportunidades   │
│   Inativos   │   Pendentes   │   Abandonadas    │
│              │               │                  │
│  Potencial:  │  Recuperável: │  Valor parado:   │
│  R$ 91.173   │   R$ 34.500   │   R$ 54.200      │
├──────────────┴───────────────┴──────────────────┤
│  ⭐ 34 pacientes elegíveis para avaliação Google │
│     Impacto estimado: +12 novos pacientes/mês   │
├─────────────────────────────────────────────────┤
│               AÇÕES RECOMENDADAS                │
│                                                  │
│  🔥 Urgente (hoje)                              │
│     ├── Retomar 6 oportunidades críticas        │
│     └── Cobrar R$ 8.200 que vencem esta semana  │
│                                                  │
│  📅 Esta semana                                 │
│     ├── Campanha para 50 inativos (alta LTV)    │
│     └── Enviar pedidos de avaliação (34 pac.)   │
│                                                  │
│  📊 Este mês                                   │
│     └── Campanha de reativação: 247 inativos    │
│                                                  │
│  [Iniciar Ações Recomendadas]  [Exportar PDF]   │
└─────────────────────────────────────────────────┘
```

---

## Tabela `clinic_diagnostics`

Persiste histórico dos diagnósticos para evolução temporal:

```sql
id                    UUID PK
clinic_id             UUID FK → clinicas.id
triggered_by          TEXT       -- 'migration','manual','cron'
migration_job_id      UUID FK → migration_jobs.id  -- NULL se não via importação

-- Pacientes
total_patients        INTEGER
active_patients       INTEGER
inactive_patients     INTEGER
inactive_ltv_total    NUMERIC(12,2)
inactive_recovery_est NUMERIC(12,2)

-- Cobranças
pending_charges_count INTEGER
pending_charges_value NUMERIC(12,2)
overdue_recent_value  NUMERIC(12,2)
overdue_old_value     NUMERIC(12,2)

-- Oportunidades
stalled_opps_count    INTEGER
stalled_opps_value    NUMERIC(12,2)

-- Avaliações
review_eligible_count INTEGER
current_avg_rating    NUMERIC(3,1)

-- Score
health_score          INTEGER    -- 0–100
total_recoverable     NUMERIC(12,2)

snapshot_at           TIMESTAMPTZ DEFAULT now()
created_at            TIMESTAMPTZ DEFAULT now()
```

---

## Estratégia de Diferenciação

O Diagnóstico da Clínica é **o principal argumento de vendas do DentalFlux**.

### No processo comercial

1. Prospect faz upload de planilha em demo guiada
2. Diagnóstico gerado em < 30 segundos
3. Vendedor mostra: "Você tem R$ 179.873 de potencial recuperável hoje"
4. Fecha trial com base no ROI imediato e tangível

### Na retenção

- Diagnóstico mensal automático via cron (todo dia 1)
- Notificação push: "Seu diagnóstico de junho está pronto — R$ 45.000 de novas oportunidades"
- QBR baseado na evolução do Health Score ao longo dos meses

### Benchmarking futuro

- Comparar Health Score com média de clínicas similares (mesma especialidade, porte)
- "Sua retenção é 12% abaixo da média — veja como clínicas similares resolveram isso"
- Alimenta o ciclo de expansão de plano (Starter → Pro → Business)
