---
title: Sprint 02 — Migration Engine + Clinic Diagnostic + Revenue Leak Engine
status: planning
last_updated: 2026-06-08
depends_on: Sprint01 (Supabase + Auth + Multi-tenant + Pacientes)
---

# DentalFlux — Sprint 02

> **Objetivo:** Implementar o trio estratégico do produto: importação de dados,
> diagnóstico automático da clínica e motor de cálculo de receita recuperável.
>
> Estes três módulos juntos formam o principal argumento de vendas e retenção
> do DentalFlux. Devem estar prontos antes de qualquer esforço comercial em escala.

---

## Pré-requisitos (Sprint 01 concluído)

- [ ] Supabase configurado (projeto prod + staging)
- [ ] Auth funcional (login/registro/logout)
- [ ] RLS multi-tenant operacional
- [ ] Tabelas `clinicas`, `usuarios`, `pacientes` criadas e populadas
- [ ] Guard `/app` usando sessão real (não localStorage)

---

## 1. Estrutura de Tabelas

### 1.1 `migration_jobs`

Controla cada importação de planilha. Uma clínica pode ter múltiplos jobs.

```sql
CREATE TABLE migration_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,

  -- Origem
  source_type       TEXT NOT NULL CHECK (source_type IN ('csv','xlsx','google_sheets')),
  source_filename   TEXT,                        -- nome original do arquivo
  source_url        TEXT,                        -- storage path ou sheets URL

  -- Pipeline de processamento
  status            TEXT NOT NULL DEFAULT 'uploaded'
                    CHECK (status IN (
                      'uploaded','parsing','parsed',
                      'mapped','validating','validated',
                      'importing','done','error'
                    )),
  error_message     TEXT,                        -- mensagem de erro se status = 'error'

  -- Resultado do parsing
  total_rows        INTEGER,
  detected_headers  TEXT[],                      -- colunas encontradas no arquivo
  preview_data      JSONB,                       -- primeiras 10 linhas para exibição

  -- Configuração do mapeamento (Step 3)
  column_map        JSONB,
  /*
    Estrutura: {
      "name":         { "source_col": "Nome Paciente", "confidence": "high" },
      "phone":        { "source_col": "Celular",       "confidence": "high" },
      "email":        { "source_col": "Email",         "confidence": "medium" },
      "last_visit_at":{ "source_col": "Ultima Visita", "confidence": "low" },
      "ltv":          { "source_col": "Valor Total",   "confidence": "medium" },
      "status":       { "source_col": "Status",        "confidence": "high",
                        "value_map": { "Ativo":"ativo","Inativo":"inativo" } }
    }
  */
  duplicate_strategy TEXT CHECK (duplicate_strategy IN ('update','skip')) DEFAULT 'skip',

  -- Relatório de validação (Step 4)
  validation_report JSONB,
  /*
    Estrutura: {
      "total": 1200, "valid": 1089, "warnings": 87,
      "duplicates": 18, "errors": 6,
      "error_rows":    [{ "row": 5,  "field": "phone", "value": "abc", "reason": "inválido" }],
      "warning_rows":  [{ "row": 12, "field": "email", "value": "sem@", "suggestion": "verificar" }],
      "duplicate_rows":[{ "row": 34, "existing_patient_id": "uuid...", "phone": "5511..." }]
    }
  */

  -- Progresso da importação (Step 5)
  progress_pct      INTEGER DEFAULT 0,           -- 0–100
  imported_rows     INTEGER DEFAULT 0,
  skipped_rows      INTEGER DEFAULT 0,
  error_rows        INTEGER DEFAULT 0,

  -- Metadados
  created_by        UUID NOT NULL REFERENCES usuarios(id),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_migration_jobs_clinic ON migration_jobs(clinic_id, created_at DESC);
ALTER TABLE migration_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_isolation" ON migration_jobs
  USING (clinic_id = current_clinic_id());
```

---

### 1.2 `migration_job_rows`

Registro individual de cada linha processada. Permite auditoria e retry.

```sql
CREATE TABLE migration_job_rows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  job_id        UUID NOT NULL REFERENCES migration_jobs(id) ON DELETE CASCADE,

  row_number    INTEGER NOT NULL,
  raw_data      JSONB NOT NULL,               -- dados originais da linha
  normalized    JSONB,                        -- dados após normalização
  status        TEXT NOT NULL CHECK (status IN ('valid','warning','duplicate','error','imported','skipped')),
  patient_id    UUID REFERENCES pacientes(id),-- preenchido após importação bem-sucedida
  error_field   TEXT,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_job_rows_job ON migration_job_rows(job_id, row_number);
CREATE INDEX idx_job_rows_status ON migration_job_rows(job_id, status);
ALTER TABLE migration_job_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_isolation" ON migration_job_rows
  USING (clinic_id = current_clinic_id());
```

---

### 1.3 `clinic_diagnostics`

Snapshot histórico dos diagnósticos. Permite evolução temporal do health score.

```sql
CREATE TABLE clinic_diagnostics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id             UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  triggered_by          TEXT NOT NULL CHECK (triggered_by IN ('migration','manual','cron')),
  migration_job_id      UUID REFERENCES migration_jobs(id),

  -- Pacientes
  total_patients        INTEGER NOT NULL DEFAULT 0,
  active_patients       INTEGER NOT NULL DEFAULT 0,
  inactive_patients     INTEGER NOT NULL DEFAULT 0,
  treatment_patients    INTEGER NOT NULL DEFAULT 0,
  inactive_ltv_total    NUMERIC(12,2) NOT NULL DEFAULT 0,
  inactive_recovery_est NUMERIC(12,2) NOT NULL DEFAULT 0,   -- × 0.20

  -- Cobranças
  pending_charges_count INTEGER NOT NULL DEFAULT 0,
  pending_charges_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  overdue_recent_value  NUMERIC(12,2) NOT NULL DEFAULT 0,   -- venceu 1–30 dias
  overdue_old_value     NUMERIC(12,2) NOT NULL DEFAULT 0,   -- venceu > 30 dias
  upcoming_value        NUMERIC(12,2) NOT NULL DEFAULT 0,   -- vence em 7 dias

  -- Oportunidades
  stalled_opps_count    INTEGER NOT NULL DEFAULT 0,
  stalled_opps_value    NUMERIC(12,2) NOT NULL DEFAULT 0,
  avg_days_stalled      NUMERIC(5,1),

  -- Avaliações
  review_eligible_count INTEGER NOT NULL DEFAULT 0,
  current_avg_rating    NUMERIC(3,1),
  reviews_last_30d      INTEGER NOT NULL DEFAULT 0,

  -- Score composto
  health_score          INTEGER NOT NULL CHECK (health_score BETWEEN 0 AND 100),
  score_retention       NUMERIC(5,2),         -- componente 30%
  score_adimplencia     NUMERIC(5,2),         -- componente 25%
  score_funnel          NUMERIC(5,2),         -- componente 20%
  score_reputation      NUMERIC(5,2),         -- componente 15%
  score_engagement      NUMERIC(5,2),         -- componente 10%

  -- Total recuperável
  total_recoverable     NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Ações recomendadas geradas
  recommended_actions   JSONB,
  /*
    Estrutura: [
      { "priority": "urgent", "label": "Retomar 6 oportunidades críticas",
        "action_type": "opportunity_followup", "count": 6, "value": 18200 },
      { "priority": "this_week", "label": "Cobrar R$ 8.200 que vencem esta semana",
        "action_type": "charge_reminder", "count": 4, "value": 8200 }
    ]
  */

  snapshot_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_diagnostics_clinic ON clinic_diagnostics(clinic_id, snapshot_at DESC);
ALTER TABLE clinic_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_isolation" ON clinic_diagnostics
  USING (clinic_id = current_clinic_id());
```

---

### 1.4 Alterações em tabelas existentes

Campos adicionais necessários em `pacientes`:

```sql
-- Campos para o Revenue Leak Engine
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS visit_count         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_campaign_id  UUID REFERENCES campanhas(id),
  ADD COLUMN IF NOT EXISTS imported_from_job   UUID REFERENCES migration_jobs(id),
  ADD COLUMN IF NOT EXISTS imported_at         TIMESTAMPTZ;
```

Campos adicionais em `oportunidades`:

```sql
ALTER TABLE oportunidades
  ADD COLUMN IF NOT EXISTS treatment_value_remaining NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ;
```

---

## 2. Fluxo Completo de Importação

```
[Frontend]                     [Edge Function: parse-file]     [Supabase]
    │                                      │                        │
    │── upload arquivo ──────────────────>│                        │
    │                                      │── store arquivo ─────>│ Storage
    │                                      │── INSERT job ─────────>│ migration_jobs
    │<── { jobId, status: 'uploaded' } ───│                        │
    │                                      │                        │
    │── trigger parse ───────────────────>│                        │
    │   POST /functions/parse-file         │── detectar encoding    │
    │   { jobId }                          │── detectar delimitador │
    │                                      │── extrair headers      │
    │                                      │── extrair preview[10]  │
    │                                      │── UPDATE job ─────────>│ status='parsed'
    │<── { headers[], preview[], total } ──│                        │
    │                                      │                        │
    │── usuário faz mapeamento             │                        │
    │── POST /api/migrations/map           │                        │
    │   { jobId, columnMap }              │                        │
    │                                      │── UPDATE job ─────────>│ status='mapped'
    │                                      │                        │
    │── trigger validação ───────────────>│                        │
    │   POST /functions/validate-job       │── processar cada linha │
    │   { jobId }                          │── normalizar campos    │
    │                                      │── checar duplicatas    │
    │                                      │── gerar relatório      │
    │                                      │── UPDATE job ─────────>│ status='validated'
    │<── ValidationReport ─────────────────│                        │
    │                                      │                        │
    │── usuário confirma importação        │                        │
    │── POST /api/migrations/import        │                        │
    │   { jobId, duplicateStrategy }      │                        │
    │                                      │                        │
    │                          [Edge Function: import-job]          │
    │                                      │── UPDATE job ─────────>│ status='importing'
    │                                      │── batch 1/N            │
    │                                      │── INSERT pacientes ───>│
    │                                      │── INSERT job_rows ────>│
    │<── Realtime progress (SSE) ──────────│── UPDATE progress_pct >│
    │   (0% → 100%)                        │── batch N/N            │
    │                                      │── UPDATE job ─────────>│ status='done'
    │                                      │                        │
    │                                      │── trigger diagnóstico  │
    │                          [Edge Function: run-diagnostic]      │
    │                                      │── calcular métricas    │
    │                                      │── calcular health score│
    │                                      │── gerar ações          │
    │                                      │── INSERT diagnostic ──>│ clinic_diagnostics
    │<── redirect /app/diagnostico ────────│                        │
```

---

## 3. Mapeamento Automático de Colunas

### 3.1 Algoritmo de Auto-match

O auto-match usa similaridade por tokens (não regex exato) para tolerar variações
de nome de coluna comuns em planilhas de clínicas brasileiras.

**Função:** `autoMatchColumns(headers: string[]): ColumnMap`

```
Para cada campo alvo (name, phone, email, ...):
  Para cada header da planilha:
    1. Normalizar: lowercase, remover acentos, remover espaços extras
    2. Calcular score de similaridade:
       - match exato normalizado → score 1.0
       - contém token-chave → score 0.8
       - similaridade Levenshtein > 0.75 → score 0.6
    3. Selecionar header com maior score
    4. Classificar confiança:
       - score >= 0.9 → "high"
       - score >= 0.6 → "medium"
       - score < 0.6  → "low" (exibir para revisão manual)
```

### 3.2 Dicionário de Tokens por Campo

```typescript
const FIELD_TOKENS: Record<string, string[]> = {
  name: [
    'nome', 'paciente', 'patient', 'cliente', 'client',
    'nome paciente', 'nome completo', 'full name'
  ],
  phone: [
    'telefone', 'celular', 'fone', 'phone', 'whatsapp',
    'tel', 'cel', 'contato', 'numero', 'mobile'
  ],
  email: [
    'email', 'e-mail', 'correio', 'mail'
  ],
  last_visit_at: [
    'ultima visita', 'ultimo atendimento', 'data visita',
    'last visit', 'data ultima consulta', 'ultima consulta',
    'data atendimento', 'ultimo retorno'
  ],
  ltv: [
    'ltv', 'valor total', 'receita', 'total gasto',
    'total pago', 'faturamento', 'valor acumulado',
    'total tratamentos', 'revenue'
  ],
  status: [
    'status', 'situacao', 'situação', 'ativo', 'estado'
  ],
  source: [
    'origem', 'source', 'canal', 'indicacao', 'indicação',
    'como conheceu', 'midia', 'mídia'
  ],
  tags: [
    'tags', 'etiquetas', 'especialidade', 'procedimento',
    'observacoes', 'notas'
  ],
}
```

### 3.3 Mapeamento de Valores de Status

Além de mapear a coluna, é necessário mapear os **valores** da coluna de status
para os valores aceitos pelo sistema.

O engine deve:
1. Extrair valores únicos da coluna de status (máx. 20 distintos)
2. Exibir ao usuário uma tabela: "Valor na planilha" → "Status no DentalFlux"
3. Sugerir mapeamento automático por tokens:

```typescript
const STATUS_TOKENS: Record<string, string[]> = {
  ativo:      ['ativo', 'active', 'alta', 'regular', 'ok', 'normal'],
  tratamento: ['tratamento', 'em tratamento', 'treatment', 'em andamento'],
  inativo:    ['inativo', 'inactive', 'desistiu', 'cancelou', 'parou',
               'sumiu', 'nao retornou', 'abandonou', 'perdido'],
  recuperado: ['recuperado', 'reativado', 'voltou', 'retornou'],
}
// Default para qualquer valor não mapeado: 'inativo'
```

---

## 4. Regras de Validação

### 4.1 Campo `phone` (obrigatório)

```
1. Remover todos os não-numéricos: "(11) 9 8765-4321" → "11987654321"
2. Se 8 dígitos: adicionar DDD padrão da clínica + prefixo 55
3. Se 10 dígitos (sem 55): adicionar prefixo 55 → "5511987654321"
4. Se 11 dígitos (sem 55): adicionar prefixo 55 → "55119987654321"
5. Se 12–13 dígitos: manter como está
6. Validar: deve ter 12 ou 13 dígitos no final
7. ERRO se inválido após todas as transformações
8. DUPLICATA se já existe em pacientes (clinic_id, phone)
```

### 4.2 Campo `name` (obrigatório)

```
1. Trim whitespace
2. Title Case: "MARIA DA SILVA" → "Maria da Silva"
3. ERRO se vazio, null, ou < 2 caracteres após trim
4. WARNING se apenas 1 palavra (sem sobrenome)
```

### 4.3 Campo `last_visit_at` (opcional)

Formatos tentados em ordem:
```
DD/MM/YYYY        → "25/03/2024"
DD/MM/YY          → "25/03/24"
YYYY-MM-DD        → "2024-03-25"
MM/DD/YYYY        → "03/25/2024" (detectar se dia > 12)
DD-MM-YYYY        → "25-03-2024"
timestamp (ms)    → 1711324800000
timestamp (s)     → 1711324800
texto relativo    → "há 3 meses" (aproximar)
```
WARNING se não reconhecido, NULL se impossível.
ERRO se data futura (> hoje).

### 4.4 Campo `ltv` (opcional)

```
1. Remover: "R$", "$", ".", espaços → "R$ 1.234,56" → "1234,56"
2. Trocar vírgula decimal por ponto → "1234.56"
3. Converter para NUMERIC
4. WARNING se negativo (importar como 0)
5. WARNING se > R$ 500.000 (valor suspeito, importar mas alertar)
```

### 4.5 Campo `email` (opcional)

```
1. Lowercase + trim
2. Regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
3. WARNING se inválido (importar como NULL)
```

### 4.6 Regras de negócio transversais

```
- Linha completamente vazia → ignorar silenciosamente (não conta como erro)
- Linha com apenas phone preenchido → ERROR (nome obrigatório)
- Máx 50.000 linhas por job → ERRO no upload se exceder
- Caracteres de controle no texto → sanitizar (remover \x00–\x1F exceto \n\t)
```

---

## 5. Cálculo do Potencial Recuperável

O `total_recoverable` é a soma das 4 fontes de vazamento, com fatores de
recuperabilidade realistas para o segmento odontológico.

### 5.1 Fonte 1: Pacientes Inativos

```sql
-- Ticket médio da clínica (base para estimar receita por reativação)
WITH ticket_medio AS (
  SELECT
    COALESCE(
      AVG(NULLIF(ltv, 0)) / NULLIF(AVG(NULLIF(visit_count, 0)), 0),
      350.00   -- fallback conservador: R$ 350/consulta se sem histórico
    ) AS value
  FROM pacientes
  WHERE clinic_id = current_clinic_id()
),
inativos AS (
  SELECT
    COUNT(*) AS total,
    SUM(GREATEST(ltv, 0)) AS ltv_total
  FROM pacientes
  WHERE clinic_id = current_clinic_id()
    AND status = 'inativo'
    AND anonymized_at IS NULL
)
SELECT
  inativos.total,
  inativos.ltv_total,
  -- Estimativa conservadora: 20% taxa de reativação × ticket médio × 2 consultas
  ROUND(inativos.total * 0.20 * ticket_medio.value * 2, 2) AS potencial_reativacao
FROM inativos, ticket_medio;
```

**Fator de recuperabilidade por antiguidade:**

| Dias inativo | Fator | Justificativa |
|-------------|-------|---------------|
| 91–180      | 0.30  | Alta chance, ainda lembra da clínica |
| 181–365     | 0.20  | Médio, precisa de oferta |
| 366–730     | 0.10  | Baixo, relacionamento frio |
| > 730       | 0.05  | Muito baixo, foco em novos |

### 5.2 Fonte 2: Cobranças Pendentes

```sql
SELECT
  SUM(value) FILTER (WHERE due_date > CURRENT_DATE)           AS a_vencer,
  SUM(value) FILTER (WHERE due_date BETWEEN
    CURRENT_DATE - 30 AND CURRENT_DATE)                       AS vencida_recente,
  SUM(value) FILTER (WHERE due_date < CURRENT_DATE - 30)      AS vencida_antiga,
  -- Total recuperável ponderado
  SUM(value) FILTER (WHERE due_date > CURRENT_DATE) * 0.95
  + SUM(value) FILTER (WHERE due_date BETWEEN
      CURRENT_DATE - 30 AND CURRENT_DATE) * 0.75
  + SUM(value) FILTER (WHERE due_date < CURRENT_DATE - 30) * 0.35
    AS potencial_cobracas
FROM cobrancas
WHERE clinic_id = current_clinic_id()
  AND status IN ('pendente', 'vencendo', 'atrasada');
```

### 5.3 Fonte 3: Oportunidades Paradas

```sql
WITH thresholds AS (
  SELECT
    id,
    value,
    stage,
    EXTRACT(day FROM now() - stage_changed_at)::INTEGER AS days_stalled,
    CASE stage
      WHEN 'novo'      THEN 3
      WHEN 'contato'   THEN 7
      WHEN 'agendada'  THEN 2
      WHEN 'confirmada'THEN 1
      ELSE 14
    END AS threshold
  FROM oportunidades
  WHERE clinic_id = current_clinic_id()
    AND stage NOT IN ('ativo', 'perdida', 'tratamento')
)
SELECT
  COUNT(*) AS total_paradas,
  SUM(COALESCE(value, 0)) AS valor_bruto,
  -- Fator de conversão histórico da clínica (ou 0.35 como default)
  ROUND(SUM(COALESCE(value, 0)) * COALESCE(
    (SELECT converted_count::FLOAT / NULLIF(total_count, 0)
     FROM (
       SELECT
         COUNT(*) FILTER (WHERE stage = 'ativo') AS converted_count,
         COUNT(*) AS total_count
       FROM oportunidades WHERE clinic_id = current_clinic_id()
     ) stats
    ), 0.35
  ), 2) AS potencial_oportunidades
FROM thresholds
WHERE days_stalled > threshold;
```

### 5.4 Fonte 4: Avaliações Google Não Solicitadas

```sql
WITH eligible AS (
  SELECT COUNT(*) AS count
  FROM pacientes p
  WHERE p.clinic_id = current_clinic_id()
    AND p.status IN ('ativo', 'tratamento')
    AND p.last_visit_at >= CURRENT_DATE - 30
    AND NOT EXISTS (
      SELECT 1 FROM avaliacoes a
      WHERE a.patient_id = p.id
        AND a.clinic_id = p.clinic_id
        AND a.request_sent_at >= CURRENT_DATE - 60
    )
),
-- Valor por avaliação: estimado como 5% do ticket médio × 12 meses
-- (cada avaliação traz ~0.3 novos pacientes por ano, conservador)
ticket AS (
  SELECT COALESCE(AVG(NULLIF(ltv,0)) / NULLIF(AVG(NULLIF(visit_count,0)),0), 350) AS value
  FROM pacientes WHERE clinic_id = current_clinic_id()
)
SELECT
  eligible.count AS elegíveis,
  ROUND(eligible.count * 0.60 * ticket.value * 0.3, 2) AS potencial_avaliacoes
  -- 60% taxa de resposta a pedidos × valor estimado por avaliação
FROM eligible, ticket;
```

### 5.5 Total Recuperável Consolidado

```sql
-- Agregar todas as fontes
SELECT
  inactive_recovery_est
  + (SELECT potencial_cobracas FROM ...)
  + (SELECT potencial_oportunidades FROM ...)
  + (SELECT potencial_avaliacoes FROM ...)
  AS total_recoverable
FROM clinic_diagnostics
WHERE clinic_id = current_clinic_id()
ORDER BY snapshot_at DESC
LIMIT 1;
```

---

## 6. Clinic Health Score

Score de 0–100 calculado como média ponderada de 5 componentes.

### 6.1 Componentes e Fórmulas

```sql
WITH base AS (
  SELECT
    -- C1: Retenção (30%) — razão ativos / total
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE COUNT(*) FILTER (WHERE status IN ('ativo','tratamento'))::FLOAT
           / COUNT(*)
    END AS retention_rate,

    -- Dados para C2: Adimplência
    (SELECT COALESCE(SUM(value) FILTER (WHERE status = 'paga'), 0)
     FROM cobrancas WHERE clinic_id = current_clinic_id()) AS paid_value,
    (SELECT COALESCE(SUM(value), 0)
     FROM cobrancas WHERE clinic_id = current_clinic_id()) AS total_charge_value

  FROM pacientes
  WHERE clinic_id = current_clinic_id()
    AND anonymized_at IS NULL
),
funnel AS (
  -- C3: Velocidade do funil (20%)
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 1
    ELSE 1 - (
      COUNT(*) FILTER (WHERE stage NOT IN ('ativo','perdida')
        AND EXTRACT(day FROM now() - stage_changed_at) > 7)::FLOAT
      / NULLIF(COUNT(*) FILTER (WHERE stage NOT IN ('perdida')), 0)
    )
    END AS funnel_velocity
  FROM oportunidades
  WHERE clinic_id = current_clinic_id()
),
reputation AS (
  -- C4: Reputação (15%)
  SELECT
    CASE WHEN elegíveis = 0 THEN 1
    ELSE LEAST(received::FLOAT / elegíveis, 1)
    END AS reputation_rate
  FROM (
    SELECT
      COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS received,
      (SELECT COUNT(*) FROM pacientes
       WHERE clinic_id = current_clinic_id()
         AND status IN ('ativo','tratamento')
         AND last_visit_at >= CURRENT_DATE - 30) AS elegíveis
    FROM avaliacoes
    WHERE clinic_id = current_clinic_id()
  ) r
),
engagement AS (
  -- C5: Engajamento WhatsApp (10%)
  SELECT
    CASE WHEN sent = 0 THEN 1
    ELSE responded::FLOAT / sent
    END AS engagement_rate
  FROM (
    SELECT
      COUNT(*) FILTER (WHERE from_type = 'clinic'
        AND created_at >= now() - interval '7 days') AS sent,
      COUNT(*) FILTER (WHERE from_type = 'patient'
        AND created_at >= now() - interval '7 days') AS responded
    FROM mensagens m
    JOIN conversas c ON c.id = m.conversation_id
    WHERE c.clinic_id = current_clinic_id()
  ) e
)
SELECT
  -- Score final ponderado
  ROUND((
    LEAST(base.retention_rate, 1) * 30 +
    LEAST(CASE WHEN base.total_charge_value = 0 THEN 1
               ELSE base.paid_value / base.total_charge_value END, 1) * 25 +
    LEAST(funnel.funnel_velocity, 1) * 20 +
    LEAST(reputation.reputation_rate, 1) * 15 +
    LEAST(engagement.engagement_rate, 1) * 10
  ))::INTEGER AS health_score,

  -- Componentes individuais (para breakdown no frontend)
  ROUND(LEAST(base.retention_rate, 1) * 100, 1) AS score_retention,
  ROUND(LEAST(CASE WHEN base.total_charge_value = 0 THEN 1
                   ELSE base.paid_value / base.total_charge_value END, 1) * 100, 1) AS score_adimplencia,
  ROUND(LEAST(funnel.funnel_velocity, 1) * 100, 1) AS score_funnel,
  ROUND(LEAST(reputation.reputation_rate, 1) * 100, 1) AS score_reputation,
  ROUND(LEAST(engagement.engagement_rate, 1) * 100, 1) AS score_engagement

FROM base, funnel, reputation, engagement;
```

### 6.2 Classificação e Cor

| Score  | Label    | Cor     | Ação sugerida |
|--------|----------|---------|---------------|
| 80–100 | Saudável | Verde   | Manter e expandir |
| 60–79  | Atenção  | Amarelo | Focar nas 2 piores dimensões |
| 40–59  | Risco    | Laranja | Ação imediata nas cobranças e retenção |
| 0–39   | Crítico  | Vermelho| Intervenção urgente, contato com CS |

---

## 7. Queries SQL Necessárias

Todas as queries são encapsuladas em funções PostgreSQL para reutilização
por Edge Functions e pelo cron de diagnóstico periódico.

### 7.1 Função: `calculate_clinic_diagnostic(p_clinic_id UUID)`

```sql
CREATE OR REPLACE FUNCTION calculate_clinic_diagnostic(p_clinic_id UUID)
RETURNS TABLE (
  metric_key   TEXT,
  metric_value NUMERIC,
  metric_label TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Retorna todas as métricas como rows para máxima flexibilidade
  RETURN QUERY
  SELECT 'inactive_patients',   COUNT(*)::NUMERIC,     'Pacientes Inativos'
  FROM pacientes WHERE clinic_id = p_clinic_id AND status = 'inativo'
  UNION ALL
  SELECT 'pending_charges_value', COALESCE(SUM(value), 0), 'Cobranças Pendentes'
  FROM cobrancas WHERE clinic_id = p_clinic_id AND status IN ('pendente','vencendo','atrasada')
  -- ... (demais métricas)
  ;
END;
$$;
```

### 7.2 Função: `get_revenue_leak_summary(p_clinic_id UUID)`

```sql
CREATE OR REPLACE FUNCTION get_revenue_leak_summary(p_clinic_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalRecoverable',       ...,
    'breakdown', jsonb_build_object(
      'inactivePatients',     ...,
      'pendingCharges',       ...,
      'stalledOpportunities', ...,
      'missingReviews',       ...
    ),
    'urgentActions',          ...,
    'clinicHealthScore',      ...
  ) INTO result;

  RETURN result;
END;
$$;
```

### 7.3 Função: `get_recommended_actions(p_clinic_id UUID)`

Gera lista priorizada de ações para o diagnóstico e o dashboard.

```sql
CREATE OR REPLACE FUNCTION get_recommended_actions(p_clinic_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  actions JSONB := '[]'::JSONB;
BEGIN
  -- Urgente: oportunidades críticas (agendadas paradas)
  -- Urgente: cobranças vencendo em 7 dias
  -- Esta semana: campanha inativos alta LTV
  -- Esta semana: pedidos de avaliação
  -- Este mês: campanha reativação geral
  RETURN actions;
END;
$$;
```

---

## 8. APIs Futuras

Todas as rotas abaixo são **TanStack Start server functions** (não API routes separadas).

### 8.1 Migration Engine

| Método | Rota | Edge Function | Descrição |
|--------|------|---------------|-----------|
| POST | `/api/migrations/upload` | `upload-file` | Recebe arquivo, cria job, retorna jobId |
| POST | `/api/migrations/parse` | `parse-file` | Inicia parsing do arquivo |
| GET  | `/api/migrations/:jobId` | — | Status e dados do job |
| POST | `/api/migrations/:jobId/map` | — | Salva column_map |
| POST | `/api/migrations/:jobId/validate` | `validate-job` | Inicia validação |
| POST | `/api/migrations/:jobId/import` | `import-job` | Inicia importação |
| GET  | `/api/migrations/:jobId/progress` | — (Realtime) | SSE de progresso |
| GET  | `/api/migrations` | — | Lista jobs da clínica |

### 8.2 Clinic Diagnostic

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/diagnostic/run` | Gera diagnóstico manual |
| GET  | `/api/diagnostic/latest` | Retorna diagnóstico mais recente |
| GET  | `/api/diagnostic/history` | Histórico de snapshots |
| GET  | `/api/diagnostic/actions` | Ações recomendadas atuais |

### 8.3 Revenue Leak

| Método | Rota | Descrição |
|--------|------|-----------|
| GET  | `/api/revenue-leak/summary` | Resumo em tempo real |
| GET  | `/api/revenue-leak/inactive-patients` | Lista paginada de inativos com potencial |
| GET  | `/api/revenue-leak/pending-charges` | Cobranças por urgência |
| GET  | `/api/revenue-leak/stalled-opps` | Oportunidades paradas |
| GET  | `/api/revenue-leak/review-eligible` | Elegíveis para avaliação |

### 8.4 Google Sheets OAuth

| Método | Rota | Descrição |
|--------|------|-----------|
| GET  | `/api/integrations/google/auth-url` | Gera URL de OAuth |
| GET  | `/api/integrations/google/callback` | Recebe code, troca por token |
| GET  | `/api/integrations/google/sheets` | Lista planilhas da conta |
| GET  | `/api/integrations/google/sheets/:id/tabs` | Lista abas de uma planilha |

---

## 9. UX Completa do Processo

### 9.1 Tela: `/app/importar` — Hub de Importação

```
┌──────────────────────────────────────────────────────┐
│  Importar Pacientes                                   │
│  Traga seus dados de qualquer sistema ou planilha     │
│                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  📊 Excel   │  │   📄 CSV    │  │  🟢 Google  │  │
│  │  .xlsx .xls │  │   .csv      │  │    Sheets   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│                                                       │
│  ─────── ou arraste o arquivo aqui ───────           │
│                                                       │
│  Histórico de importações (última 5):                │
│  ✅ 1.247 pacientes  |  12/06/2026  |  planilha.xlsx │
│  ✅ 89 pacientes     |  03/06/2026  |  backup.csv    │
└──────────────────────────────────────────────────────┘
```

---

### 9.2 Step 1: Upload + Parsing

```
┌──────────────────────────────────────────────────────┐
│  ① Upload  ② Preview  ③ Mapeamento  ④ Validação     │
│                                                       │
│           Analisando sua planilha...                  │
│                                                       │
│                  [████████░░] 80%                     │
│                                                       │
│           ✓ 1.247 linhas encontradas                  │
│           ✓ 8 colunas detectadas                      │
│           ✓ Encoding UTF-8                            │
└──────────────────────────────────────────────────────┘
```

---

### 9.3 Step 2: Preview

```
┌──────────────────────────────────────────────────────┐
│  ② Preview — primeiras 10 linhas                      │
│                                                       │
│  Nome Paciente  | Celular       | Status | Ult. Visita│
│  Ana Lima       | (11) 99999-01 | Ativo  | 15/05/2026 │
│  Carlos Silva   | 11 98765-4321 | Inativ | 10/01/2024 │
│  Maria Santos   | 5511987654321 | Trat.  | 22/05/2026 │
│  ...            | ...           | ...    | ...        │
│                                                       │
│  [← Voltar]                    [Continuar →]          │
└──────────────────────────────────────────────────────┘
```

---

### 9.4 Step 3: Mapeamento

```
┌──────────────────────────────────────────────────────┐
│  ③ Mapeamento de Colunas                              │
│                                                       │
│  Coluna na planilha    → Campo DentalFlux   Confiança │
│  ──────────────────────────────────────────────────  │
│  "Nome Paciente"       → [Nome          ▼]  🟢 Alta  │
│  "Celular"             → [Telefone      ▼]  🟢 Alta  │
│  "Email"               → [Email         ▼]  🟢 Alta  │
│  "Ultima Visita"       → [Última visita ▼]  🟡 Média │
│  "Status"              → [Status        ▼]  🟢 Alta  │
│  "Valor Total"         → [LTV           ▼]  🟡 Média │
│  "Especialidade"       → [Tags          ▼]  🟡 Média │
│  "Observações"         → [Ignorar       ▼]  ──       │
│                                                       │
│  Coluna de Status — mapeamento de valores:            │
│  "Ativo"       → ativo       ✓ automático             │
│  "Inativo"     → inativo     ✓ automático             │
│  "Em tratamento" → tratamento ✓ automático            │
│  "Alta"        → [ativo   ▼] ⚠ revisar               │
│                                                       │
│  [← Voltar]                    [Validar →]            │
└──────────────────────────────────────────────────────┘
```

---

### 9.5 Step 4: Relatório de Validação

```
┌──────────────────────────────────────────────────────┐
│  ④ Validação — 1.247 linhas analisadas               │
│                                                       │
│  ✅ 1.089 válidas        pronto para importar        │
│  ⚠️   87 com avisos      serão importadas com alerta  │
│  🔄   18 duplicadas      telefone já cadastrado       │
│  ❌    6 com erro         não serão importadas        │
│                                                       │
│  Para duplicadas:                                     │
│  ○ Atualizar dados existentes                         │
│  ● Ignorar (manter dados atuais)                      │
│                                                       │
│  ▼ Ver 6 erros                                        │
│    Linha 47:  "Telefone" → "abc123" → inválido        │
│    Linha 203: "Nome" → vazio → obrigatório            │
│    ...                                                │
│                                                       │
│  ▼ Ver 87 avisos                                      │
│    Linha 12: email "sem@" → formato inválido          │
│    ...                                                │
│                                                       │
│  [← Corrigir mapeamento]   [Importar 1.194 →]         │
└──────────────────────────────────────────────────────┘
```

---

### 9.6 Step 5: Progresso em Tempo Real

```
┌──────────────────────────────────────────────────────┐
│  Importando pacientes...                              │
│                                                       │
│              [███████████░░░░░] 68%                   │
│              814 de 1.194 pacientes                   │
│                                                       │
│  ✓ Processado em lotes de 500                        │
│  ✓ Dados criptografados em trânsito                   │
│  ⏱ Tempo estimado: ~8 segundos                       │
│                                                       │
│  (não feche esta janela)                              │
└──────────────────────────────────────────────────────┘
```

---

### 9.7 Step 6: Resultado + Diagnóstico

```
┌──────────────────────────────────────────────────────┐
│  ✅ Importação concluída!                             │
│                                                       │
│  1.194 pacientes adicionados à sua base               │
│  87 importados com avisos  |  6 ignorados             │
│                                                       │
│  ──────────────────────────────────────────────────  │
│  🎯 DIAGNÓSTICO DA CLÍNICA                           │
│                                                       │
│  Analisamos sua base e encontramos:                   │
│                                                       │
│         R$ 179.873                                    │
│    de potencial recuperável                           │
│                                                       │
│  🔴 247 pacientes inativos  →  R$ 91.173 estimados   │
│  🟡 R$ 34.500 em cobranças abertas                   │
│  🟠 18 oportunidades paradas → R$ 54.200             │
│  ⭐ 34 sem avaliação Google                          │
│                                                       │
│         [Ver Diagnóstico Completo]                    │
│         [Ir para o Dashboard]                         │
└──────────────────────────────────────────────────────┘
```

---

### 9.8 Tela: `/app/diagnostico` — Diagnóstico Completo

Tela full-page com:
- Health Score (gauge) + breakdown dos 5 componentes
- Cards de cada fonte de vazamento (clicáveis → ação direta)
- Lista de ações recomendadas por prioridade (Urgente / Esta semana / Este mês)
- Histórico de scores (linha do tempo se múltiplos diagnósticos)
- Botão "Exportar PDF" (futuro)
- Botão "Atualizar diagnóstico" (recalcula on-demand)

---

## 10. Backlog Técnico

### Migrations SQL

| # | Arquivo | Descrição | Esforço |
|---|---------|-----------|---------|
| M1 | `004_migration_jobs.sql` | Tabela migration_jobs + RLS | 1h |
| M2 | `005_migration_job_rows.sql` | Tabela migration_job_rows + RLS | 0.5h |
| M3 | `006_clinic_diagnostics.sql` | Tabela clinic_diagnostics + RLS | 1h |
| M4 | `007_pacientes_additions.sql` | Novos campos em pacientes | 0.5h |
| M5 | `008_oportunidades_additions.sql` | Novos campos em oportunidades | 0.5h |
| M6 | `functions_diagnostic.sql` | Funções SQL: calculate, get_summary, get_actions | 4h |

### Edge Functions (Supabase)

| # | Função | Descrição | Esforço |
|---|--------|-----------|---------|
| E1 | `parse-file` | Parsing CSV/XLSX com SheetJS, detecção de encoding | 6h |
| E2 | `validate-job` | Validação de todas as linhas em batch | 5h |
| E3 | `import-job` | Importação em lotes de 500 + Realtime progress | 6h |
| E4 | `run-diagnostic` | Calcula todas as métricas + INSERT em clinic_diagnostics | 4h |
| E5 | `cron-diagnostic` | Cron diário às 06h para recalcular health score | 1h |

### Frontend

| # | Componente/Rota | Descrição | Esforço |
|---|----------------|-----------|---------|
| F1 | `src/routes/app.importar.tsx` | Hub de importação (Step 0) | 2h |
| F2 | `src/routes/app.importar.$jobId.tsx` | Wizard de importação (Steps 1–6) | 8h |
| F3 | `src/components/app/migration-wizard/` | Componentes de cada step | 6h |
| F4 | `src/routes/app.diagnostico.tsx` | Tela de diagnóstico completo | 6h |
| F5 | `src/components/app/health-score-gauge.tsx` | Gauge circular animado | 3h |
| F6 | `src/components/app/revenue-leak-banner.tsx` | Banner de potencial recuperável no Dashboard | 2h |
| F7 | `src/components/app/recommended-actions.tsx` | Lista de ações priorizadas | 3h |
| F8 | `src/hooks/use-migration.ts` | Hook com polling/SSE de progresso | 2h |
| F9 | `src/lib/api/migrations.ts` | Client de chamadas ao backend | 2h |
| F10| `src/lib/api/diagnostic.ts` | Client de chamadas ao diagnóstico | 1h |

### Integrações

| # | Integração | Descrição | Esforço |
|---|-----------|-----------|---------|
| I1 | SheetJS | Parser XLSX/XLS no Edge Function | 1h (instalar + configurar) |
| I2 | Google Sheets API | OAuth flow + leitura de planilha | 4h |
| I3 | Supabase Storage | Upload e acesso controlado de arquivos | 1h |
| I4 | Supabase Realtime | Progresso de importação em tempo real | 2h |

---

## 11. Estimativa de Esforço

| Categoria | Horas estimadas |
|-----------|----------------|
| Migrations SQL | 7.5h |
| Edge Functions | 22h |
| Frontend | 35h |
| Integrações | 8h |
| Testes e QA | 8h |
| **Total** | **~80h** |

Estimativa para 1 dev full-stack: **2 semanas** (sprint de 2 semanas, ~40h/semana).

---

## 12. Dependências

| Dependência | Tipo | Bloqueador para |
|-------------|------|----------------|
| Sprint 01 concluído | Sprint | Tudo neste sprint |
| Tabelas `pacientes`, `cobrancas`, `oportunidades`, `avaliacoes` existentes | SQL | Queries de diagnóstico |
| `current_clinic_id()` function | SQL | RLS em todas as tabelas novas |
| SheetJS (`@zhbhun/xlsx`) | npm | Edge Function `parse-file` |
| Google Cloud Project (OAuth) | Infra | Google Sheets import |
| Supabase Storage bucket `migrations` | Infra | Upload de arquivos |
| Supabase Realtime habilitado no projeto | Infra | Progresso em tempo real |

---

## 13. Ordem de Implementação

```
Semana 1
  Dia 1–2:  M1–M6 (migrations + funções SQL)
            E4 (run-diagnostic) — valida as queries
  Dia 3:    E1 (parse-file) + I1 (SheetJS)
  Dia 4:    E2 (validate-job) + E3 (import-job)
  Dia 5:    F9+F10 (API clients) + I3 (Storage) + I4 (Realtime)

Semana 2
  Dia 1:    F1+F2 (rotas do wizard)
  Dia 2:    F3 (componentes dos steps 1–4)
  Dia 3:    F7 (step 5 progresso + realtime) + F8 (hook)
  Dia 4:    F4 (tela diagnóstico) + F5 (gauge) + F6 (banner)
  Dia 5:    Testes ponta-a-ponta + E5 (cron) + I2 (Google Sheets)
            QA com planilhas reais de clínicas teste
```

### Critérios de Aceite do Sprint 02

- [ ] Upload de Excel com 1.000 linhas processa em < 30 segundos
- [ ] Mapeamento automático acerta > 80% das colunas em planilhas teste
- [ ] Validação detecta e classifica 100% dos erros de telefone inválido
- [ ] Importação de 1.000 pacientes em < 60 segundos com progresso em tempo real
- [ ] Diagnóstico gerado automaticamente após importação
- [ ] Health Score exibido com breakdown dos 5 componentes
- [ ] `total_recoverable` calculado e exibido no banner do Dashboard
- [ ] Diagnóstico periódico recalculado pelo cron às 06h
- [ ] RLS testado: clínica A não acessa jobs nem diagnósticos da clínica B
- [ ] Google Sheets: importação via URL pública funciona end-to-end
```
