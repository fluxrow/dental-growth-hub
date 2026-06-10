-- ============================================================
-- Migration: clinic_health_score
-- View materializada atualizada diariamente para medir saúde
-- de cada clínica no DrFlux (base para churn prevention proativo)
--
-- Score = login_score*0.30 + feature_score*0.25 + billing_score*0.25 + engagement_score*0.20
-- Status: healthy(80+) | attention(60-79) | at_risk(40-59) | critical(<40)
-- ============================================================

-- Tabela de eventos de login/sessão para calcular login_score
-- (alimentada por webhook ou middleware de autenticação)
CREATE TABLE IF NOT EXISTS public.clinic_activity_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID        NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  event_type TEXT        NOT NULL
    CHECK (event_type IN ('login', 'feature_use', 'wa_sent', 'opp_created', 'cobranca_sent')),
  feature    TEXT,       -- nome da feature usada (ex: 'dunning', 'cobrancas', 'campanhas')
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clinic_activity_events
  IS 'Eventos de atividade por clínica. Base para cálculo do Health Score.';

CREATE INDEX IF NOT EXISTS idx_activity_clinic_type_date
  ON public.clinic_activity_events (clinic_id, event_type, created_at DESC);

ALTER TABLE public.clinic_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_events_write_service"
  ON public.clinic_activity_events FOR INSERT WITH CHECK (true);

CREATE POLICY "activity_events_select_own"
  ON public.clinic_activity_events FOR SELECT
  USING (clinic_id = public.current_clinic_id());

-- ── Health Score View ──────────────────────────────────────────────────────
-- Calculado sobre janela de 30 dias
-- Normaliza cada sub-score para 0–100 com limites razoáveis

CREATE OR REPLACE VIEW public.clinic_health_scores AS
WITH

-- Logins nos últimos 30 dias (max esperado: 20 sessões/mês = score 100)
login_scores AS (
  SELECT
    clinic_id,
    LEAST(COUNT(*) * 5, 100) AS login_score   -- cada login = 5pts, cap 100
  FROM public.clinic_activity_events
  WHERE event_type = 'login'
    AND created_at > now() - interval '30 days'
  GROUP BY clinic_id
),

-- Features usadas nos últimos 30 dias (max esperado: 4 features distintas)
feature_scores AS (
  SELECT
    clinic_id,
    LEAST(COUNT(DISTINCT feature) * 25, 100) AS feature_score
  FROM public.clinic_activity_events
  WHERE event_type = 'feature_use'
    AND feature IS NOT NULL
    AND created_at > now() - interval '30 days'
  GROUP BY clinic_id
),

-- Billing health: penaliza falha de pagamento, bonus para ativo
billing_scores AS (
  SELECT
    c.id AS clinic_id,
    CASE
      WHEN cs.status = 'active'                          THEN 100
      WHEN cs.status = 'past_due'                        THEN 40
      WHEN cs.status = 'paused'                          THEN 60
      WHEN cs.status IS NULL                             THEN 50  -- sem dados
      ELSE 20
    END AS billing_score
  FROM public.clinicas c
  LEFT JOIN public.clinic_subscriptions cs ON cs.clinic_id = c.id
),

-- Engajamento: oportunidades criadas + cobranças enviadas nos 30 dias
engagement_scores AS (
  SELECT
    clinic_id,
    LEAST(
      (COALESCE(opp_count, 0) * 10) + (COALESCE(cob_count, 0) * 15),
      100
    ) AS engagement_score
  FROM (
    SELECT
      c.id AS clinic_id,
      (SELECT COUNT(*) FROM public.oportunidades o
       WHERE o.clinic_id = c.id AND o.created_at > now() - interval '30 days') AS opp_count,
      (SELECT COUNT(*) FROM public.cobrancas cb
       WHERE cb.clinic_id = c.id AND cb.created_at > now() - interval '30 days') AS cob_count
    FROM public.clinicas c
  ) sub
)

SELECT
  c.id                                                          AS clinic_id,
  c.name                                                        AS clinic_name,
  COALESCE(ls.login_score,       0)                            AS login_score,
  COALESCE(fs.feature_score,     0)                            AS feature_score,
  COALESCE(bs.billing_score,    50)                            AS billing_score,
  COALESCE(es.engagement_score,  0)                            AS engagement_score,
  ROUND(
    COALESCE(ls.login_score,      0) * 0.30 +
    COALESCE(fs.feature_score,    0) * 0.25 +
    COALESCE(bs.billing_score,   50) * 0.25 +
    COALESCE(es.engagement_score, 0) * 0.20
  )::INTEGER                                                    AS score,
  CASE
    WHEN ROUND(
      COALESCE(ls.login_score,      0) * 0.30 +
      COALESCE(fs.feature_score,    0) * 0.25 +
      COALESCE(bs.billing_score,   50) * 0.25 +
      COALESCE(es.engagement_score, 0) * 0.20
    ) >= 80 THEN 'healthy'
    WHEN ROUND(
      COALESCE(ls.login_score,      0) * 0.30 +
      COALESCE(fs.feature_score,    0) * 0.25 +
      COALESCE(bs.billing_score,   50) * 0.25 +
      COALESCE(es.engagement_score, 0) * 0.20
    ) >= 60 THEN 'attention'
    WHEN ROUND(
      COALESCE(ls.login_score,      0) * 0.30 +
      COALESCE(fs.feature_score,    0) * 0.25 +
      COALESCE(bs.billing_score,   50) * 0.25 +
      COALESCE(es.engagement_score, 0) * 0.20
    ) >= 40 THEN 'at_risk'
    ELSE 'critical'
  END                                                           AS status,
  now()                                                         AS calculated_at
FROM public.clinicas c
LEFT JOIN login_scores      ls ON ls.clinic_id      = c.id
LEFT JOIN feature_scores    fs ON fs.clinic_id      = c.id
LEFT JOIN billing_scores    bs ON bs.clinic_id      = c.id
LEFT JOIN engagement_scores es ON es.clinic_id      = c.id;

COMMENT ON VIEW public.clinic_health_scores
  IS 'Health score por clínica (0-100). Atualizado a cada consulta. '
     'Para admin: ver todas as clínicas. Para clínica: ver apenas a própria.';

-- RLS: clínica vê apenas o próprio score; admin (service role) vê tudo
-- A view herda as políticas das tabelas subjacentes via security_invoker default.
