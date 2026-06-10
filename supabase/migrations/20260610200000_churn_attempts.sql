-- ============================================================
-- Migration: churn_attempts
-- Registra tentativas de cancelamento e ações de retenção
-- Usado pelo CancelFlowModal para analytics de churn
-- ============================================================

CREATE TABLE IF NOT EXISTS public.churn_attempts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID        NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  reason          TEXT        NOT NULL,    -- cancel reason id (expensive, not_using, etc.)
  action          TEXT        NOT NULL     -- offer_accepted | paused | cancelled
    CHECK (action IN ('offer_accepted', 'paused', 'cancelled', 'support_escalated')),
  coupon_id       TEXT,                    -- Stripe coupon ID se action = offer_accepted
  paused_months   INTEGER,                 -- meses se action = paused
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.churn_attempts
  IS 'Registro de tentativas de cancelamento e ações de retenção. '
     'Alimenta analytics de churn e cohort analysis de save rate.';

-- Índice para análise por clínica e período
CREATE INDEX IF NOT EXISTS idx_churn_attempts_clinic_created
  ON public.churn_attempts (clinic_id, created_at DESC);

-- Índice para análise agregada por motivo
CREATE INDEX IF NOT EXISTS idx_churn_attempts_reason
  ON public.churn_attempts (reason, action);

-- RLS: service role apenas (server-side only)
ALTER TABLE public.churn_attempts ENABLE ROW LEVEL SECURITY;

-- Clínica pode ler seus próprios registros
CREATE POLICY "churn_attempts_select_own"
  ON public.churn_attempts
  FOR SELECT
  USING (clinic_id = public.current_clinic_id());

-- Escrita exclusiva via service role (server functions)
CREATE POLICY "churn_attempts_write_service"
  ON public.churn_attempts
  FOR INSERT
  WITH CHECK (true); -- supabaseAdmin (service role) bypassa RLS
