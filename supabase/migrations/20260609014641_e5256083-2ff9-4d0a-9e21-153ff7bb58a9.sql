
-- =========================================================
-- migration_jobs
-- =========================================================
CREATE TABLE public.migration_jobs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id          UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  source_type        TEXT NOT NULL CHECK (source_type IN ('csv','xlsx','google_sheets')),
  source_filename    TEXT,
  source_url         TEXT,
  status             TEXT NOT NULL DEFAULT 'uploaded'
                     CHECK (status IN ('uploaded','parsing','parsed','mapped','validating','validated','importing','done','error')),
  error_message      TEXT,
  total_rows         INTEGER,
  detected_headers   TEXT[],
  preview_data       JSONB,
  column_map         JSONB,
  duplicate_strategy TEXT CHECK (duplicate_strategy IN ('update','skip')) DEFAULT 'skip',
  validation_report  JSONB,
  progress_pct       INTEGER DEFAULT 0,
  imported_rows      INTEGER DEFAULT 0,
  skipped_rows       INTEGER DEFAULT 0,
  error_rows         INTEGER DEFAULT 0,
  created_by         UUID NOT NULL REFERENCES auth.users(id),
  started_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_migration_jobs_clinic ON public.migration_jobs(clinic_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.migration_jobs TO authenticated;
GRANT ALL ON public.migration_jobs TO service_role;

ALTER TABLE public.migration_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mj_select" ON public.migration_jobs
  FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id());
CREATE POLICY "mj_insert" ON public.migration_jobs
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());
CREATE POLICY "mj_update" ON public.migration_jobs
  FOR UPDATE TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());
CREATE POLICY "mj_delete" ON public.migration_jobs
  FOR DELETE TO authenticated
  USING (clinic_id = public.current_clinic_id());

CREATE TRIGGER trg_mj_updated_at
  BEFORE UPDATE ON public.migration_jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- migration_job_rows
-- =========================================================
CREATE TABLE public.migration_job_rows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  job_id        UUID NOT NULL REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  row_number    INTEGER NOT NULL,
  raw_data      JSONB NOT NULL,
  normalized    JSONB,
  status        TEXT NOT NULL CHECK (status IN ('valid','warning','duplicate','error','imported','skipped')),
  patient_id    UUID REFERENCES public.pacientes(id),
  error_field   TEXT,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_rows_job ON public.migration_job_rows(job_id, row_number);
CREATE INDEX idx_job_rows_status ON public.migration_job_rows(job_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.migration_job_rows TO authenticated;
GRANT ALL ON public.migration_job_rows TO service_role;

ALTER TABLE public.migration_job_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mjr_select" ON public.migration_job_rows
  FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id());
CREATE POLICY "mjr_insert" ON public.migration_job_rows
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());
CREATE POLICY "mjr_update" ON public.migration_job_rows
  FOR UPDATE TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());
CREATE POLICY "mjr_delete" ON public.migration_job_rows
  FOR DELETE TO authenticated
  USING (clinic_id = public.current_clinic_id());

-- =========================================================
-- clinic_diagnostics
-- =========================================================
CREATE TABLE public.clinic_diagnostics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id             UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  triggered_by          TEXT NOT NULL CHECK (triggered_by IN ('migration','manual','cron')),
  migration_job_id      UUID REFERENCES public.migration_jobs(id),

  total_patients        INTEGER NOT NULL DEFAULT 0,
  active_patients       INTEGER NOT NULL DEFAULT 0,
  inactive_patients     INTEGER NOT NULL DEFAULT 0,
  treatment_patients    INTEGER NOT NULL DEFAULT 0,
  inactive_ltv_total    NUMERIC(12,2) NOT NULL DEFAULT 0,
  inactive_recovery_est NUMERIC(12,2) NOT NULL DEFAULT 0,

  pending_charges_count INTEGER NOT NULL DEFAULT 0,
  pending_charges_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  overdue_recent_value  NUMERIC(12,2) NOT NULL DEFAULT 0,
  overdue_old_value     NUMERIC(12,2) NOT NULL DEFAULT 0,
  upcoming_value        NUMERIC(12,2) NOT NULL DEFAULT 0,

  stalled_opps_count    INTEGER NOT NULL DEFAULT 0,
  stalled_opps_value    NUMERIC(12,2) NOT NULL DEFAULT 0,
  avg_days_stalled      NUMERIC(5,1),

  review_eligible_count INTEGER NOT NULL DEFAULT 0,
  current_avg_rating    NUMERIC(3,1),
  reviews_last_30d      INTEGER NOT NULL DEFAULT 0,

  health_score          INTEGER NOT NULL DEFAULT 50 CHECK (health_score BETWEEN 0 AND 100),
  score_retention       NUMERIC(5,2),
  score_adimplencia     NUMERIC(5,2),
  score_funnel          NUMERIC(5,2),
  score_reputation      NUMERIC(5,2),
  score_engagement      NUMERIC(5,2),

  total_recoverable     NUMERIC(12,2) NOT NULL DEFAULT 0,
  recommended_actions   JSONB NOT NULL DEFAULT '[]'::JSONB,

  snapshot_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_diagnostics_clinic ON public.clinic_diagnostics(clinic_id, snapshot_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_diagnostics TO authenticated;
GRANT ALL ON public.clinic_diagnostics TO service_role;

ALTER TABLE public.clinic_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cd_select" ON public.clinic_diagnostics
  FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id());
CREATE POLICY "cd_insert" ON public.clinic_diagnostics
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());

-- =========================================================
-- Alterações em tabelas existentes
-- =========================================================
ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS visit_count        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS imported_from_job  UUID REFERENCES public.migration_jobs(id),
  ADD COLUMN IF NOT EXISTS imported_at        TIMESTAMPTZ;

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS treatment_value_remaining NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ;

-- =========================================================
-- Função: calculate_and_save_diagnostic
-- =========================================================
CREATE OR REPLACE FUNCTION public.calculate_and_save_diagnostic(
  p_clinic_id   UUID,
  p_triggered_by TEXT,
  p_job_id      UUID DEFAULT NULL
)
RETURNS public.clinic_diagnostics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INT := 0; v_active INT := 0; v_inactive INT := 0; v_treat INT := 0;
  v_inactive_ltv NUMERIC := 0; v_avg_ticket NUMERIC := 0;
  v_inactive_recovery NUMERIC := 0;

  v_stalled_count INT := 0; v_stalled_value NUMERIC := 0; v_avg_days NUMERIC := NULL;
  v_funnel_conv NUMERIC := 0.35;

  v_pending_count INT := 0; v_pending_value NUMERIC := 0;
  v_overdue_recent NUMERIC := 0; v_overdue_old NUMERIC := 0; v_upcoming NUMERIC := 0;

  v_review_eligible INT := 0; v_avg_rating NUMERIC := NULL; v_reviews_30 INT := 0;

  v_score_ret NUMERIC := 50; v_score_adi NUMERIC := 50;
  v_score_fun NUMERIC := 50; v_score_rep NUMERIC := 50; v_score_eng NUMERIC := 50;
  v_health INT := 50;

  v_rec_inactive NUMERIC := 0; v_rec_charges NUMERIC := 0;
  v_rec_opps NUMERIC := 0; v_rec_reviews NUMERIC := 0;
  v_total_recoverable NUMERIC := 0;

  v_actions JSONB := '[]'::jsonb;
  v_row public.clinic_diagnostics;
BEGIN
  -- Pacientes
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'ativo'),
    COUNT(*) FILTER (WHERE status = 'inativo'),
    COUNT(*) FILTER (WHERE status = 'tratamento'),
    COALESCE(SUM(ltv) FILTER (WHERE status = 'inativo'), 0),
    COALESCE(AVG(NULLIF(ltv,0)) FILTER (WHERE ltv > 0), 0)
  INTO v_total, v_active, v_inactive, v_treat, v_inactive_ltv, v_avg_ticket
  FROM public.pacientes
  WHERE clinic_id = p_clinic_id AND anonymized_at IS NULL;

  v_inactive_recovery := v_inactive * 0.20 * COALESCE(v_avg_ticket,0) * 2;

  -- Oportunidades paradas (> 7 dias na etapa atual, não perdidas/ativas)
  SELECT
    COUNT(*),
    COALESCE(SUM(value), 0),
    AVG(EXTRACT(DAY FROM (now() - stage_changed_at)))
  INTO v_stalled_count, v_stalled_value, v_avg_days
  FROM public.oportunidades
  WHERE clinic_id = p_clinic_id
    AND stage NOT IN ('ativo','perdida')
    AND stage_changed_at < now() - INTERVAL '7 days';

  -- Cobranças e avaliações: tabelas ainda não existem neste projeto.
  -- Mantemos zeros; serão preenchidos quando os módulos forem migrados.

  -- Scores parciais (0-100)
  -- Retenção: % de ativos vs total
  IF v_total > 0 THEN
    v_score_ret := LEAST(100, (v_active::numeric / v_total) * 100);
  END IF;

  -- Adimplência: sem cobranças no banco ainda → neutro
  v_score_adi := 70;

  -- Funil: penaliza por oportunidades paradas
  IF v_total > 0 THEN
    v_score_fun := GREATEST(0, 100 - LEAST(100, v_stalled_count * 5));
  END IF;

  -- Reputação: sem avaliações no banco ainda → neutro
  v_score_rep := 70;

  -- Engajamento: proxy = pacientes em tratamento / total
  IF v_total > 0 THEN
    v_score_eng := LEAST(100, (v_treat::numeric / v_total) * 200);
  END IF;

  v_health := ROUND(
    v_score_ret * 0.30 +
    v_score_adi * 0.25 +
    v_score_fun * 0.20 +
    v_score_rep * 0.15 +
    v_score_eng * 0.10
  );
  v_health := GREATEST(0, LEAST(100, v_health));

  -- Total recuperável (soma ponderada das 4 fontes)
  v_rec_inactive := v_inactive_recovery;
  v_rec_charges  := v_upcoming * 0.95 + v_overdue_recent * 0.75 + v_overdue_old * 0.35;
  v_rec_opps     := v_stalled_value * v_funnel_conv;
  v_rec_reviews  := v_review_eligible * 0.60 * COALESCE(v_avg_ticket,0) * 0.3;
  v_total_recoverable := v_rec_inactive + v_rec_charges + v_rec_opps + v_rec_reviews;

  -- Ações recomendadas (priorizadas)
  v_actions := '[]'::jsonb;

  IF v_overdue_old > 0 THEN
    v_actions := v_actions || jsonb_build_object(
      'priority','urgente',
      'category','cobranca',
      'title','Recuperar cobranças vencidas há mais de 30 dias',
      'estimated_value', ROUND(v_overdue_old * 0.35, 2)
    );
  END IF;

  IF v_stalled_count > 0 THEN
    v_actions := v_actions || jsonb_build_object(
      'priority','urgente',
      'category','funil',
      'title', format('Reativar %s oportunidades paradas', v_stalled_count),
      'estimated_value', ROUND(v_stalled_value * v_funnel_conv, 2)
    );
  END IF;

  IF v_inactive > 0 THEN
    v_actions := v_actions || jsonb_build_object(
      'priority','esta_semana',
      'category','retencao',
      'title', format('Campanha de reativação para %s pacientes inativos', v_inactive),
      'estimated_value', ROUND(v_inactive_recovery, 2)
    );
  END IF;

  IF v_upcoming > 0 THEN
    v_actions := v_actions || jsonb_build_object(
      'priority','esta_semana',
      'category','cobranca',
      'title','Enviar lembretes de cobranças a vencer',
      'estimated_value', ROUND(v_upcoming * 0.95, 2)
    );
  END IF;

  IF v_review_eligible > 0 THEN
    v_actions := v_actions || jsonb_build_object(
      'priority','este_mes',
      'category','reputacao',
      'title', format('Pedir avaliação para %s pacientes elegíveis', v_review_eligible),
      'estimated_value', ROUND(v_rec_reviews, 2)
    );
  END IF;

  -- Insert do snapshot
  INSERT INTO public.clinic_diagnostics (
    clinic_id, triggered_by, migration_job_id,
    total_patients, active_patients, inactive_patients, treatment_patients,
    inactive_ltv_total, inactive_recovery_est,
    pending_charges_count, pending_charges_value,
    overdue_recent_value, overdue_old_value, upcoming_value,
    stalled_opps_count, stalled_opps_value, avg_days_stalled,
    review_eligible_count, current_avg_rating, reviews_last_30d,
    health_score, score_retention, score_adimplencia, score_funnel, score_reputation, score_engagement,
    total_recoverable, recommended_actions
  ) VALUES (
    p_clinic_id, p_triggered_by, p_job_id,
    v_total, v_active, v_inactive, v_treat,
    v_inactive_ltv, v_inactive_recovery,
    v_pending_count, v_pending_value,
    v_overdue_recent, v_overdue_old, v_upcoming,
    v_stalled_count, v_stalled_value, v_avg_days,
    v_review_eligible, v_avg_rating, v_reviews_30,
    v_health, v_score_ret, v_score_adi, v_score_fun, v_score_rep, v_score_eng,
    v_total_recoverable, v_actions
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_and_save_diagnostic(UUID, TEXT, UUID) TO authenticated, service_role;
