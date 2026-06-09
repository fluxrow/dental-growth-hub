-- ============================================================
-- Migration: automation_fields
-- Adds scheduling + contact tracking fields needed for
-- AF-01 (instant WA), AF-03 (cold lead cron), AF-05 (D-1 reminder)
-- and audit log for all automation webhook events.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. oportunidades — scheduling & contact tracking
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS scheduled_at       TIMESTAMPTZ,           -- data/hora real da consulta agendada
  ADD COLUMN IF NOT EXISTS last_contacted_at  TIMESTAMPTZ,           -- última vez que automação enviou mensagem
  ADD COLUMN IF NOT EXISTS wa_first_sent_at   TIMESTAMPTZ,           -- guard: evita double-send no AF-01
  ADD COLUMN IF NOT EXISTS reminder_sent_at   TIMESTAMPTZ;           -- guard: evita reenvio do lembrete D-1

COMMENT ON COLUMN public.oportunidades.scheduled_at
  IS 'Data/hora da consulta agendada — base para AF-05 (lembrete D-1) e SLA de confirmação';
COMMENT ON COLUMN public.oportunidades.last_contacted_at
  IS 'Última vez que qualquer automação enviou mensagem — base para AF-03 (lead frio) e anti-spam';
COMMENT ON COLUMN public.oportunidades.wa_first_sent_at
  IS 'Timestamp do primeiro WhatsApp enviado via AF-01 — idempotency guard';
COMMENT ON COLUMN public.oportunidades.reminder_sent_at
  IS 'Timestamp do lembrete D-1 enviado via AF-05 — idempotency guard';

-- Index para o cron AF-03: oportunidades frias por clinic_id + stage + last_contacted_at
CREATE INDEX IF NOT EXISTS oportunidades_cold_lead_idx
  ON public.oportunidades (clinic_id, stage, last_contacted_at)
  WHERE stage NOT IN ('ativo', 'perdida');

-- Index para AF-05: busca por scheduled_at no dia seguinte
CREATE INDEX IF NOT EXISTS oportunidades_scheduled_at_idx
  ON public.oportunidades (clinic_id, scheduled_at)
  WHERE stage IN ('agendada', 'confirmada') AND scheduled_at IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 2. webhook_events — audit log imutável de todos os eventos
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID        REFERENCES public.clinicas(id) ON DELETE CASCADE,
  source        TEXT        NOT NULL,  -- 'meta_leads' | 'twilio_status' | 'twilio_inbound' | 'supabase_db'
  event_type    TEXT        NOT NULL,  -- 'new_lead' | 'message_delivered' | 'message_failed' | 'opp_stage_changed'
  payload       JSONB       NOT NULL DEFAULT '{}',
  entity_id     UUID,                  -- oportunidade.id | paciente.id — para rastrear por entidade
  entity_type   TEXT,                  -- 'oportunidade' | 'paciente' | 'cobranca'
  processed     BOOLEAN     NOT NULL DEFAULT false,
  processed_at  TIMESTAMPTZ,
  error         TEXT,                  -- erro de processamento, se houver
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.webhook_events
  IS 'Audit log imutável de todos os webhooks recebidos e eventos de automação. '
     'Nunca deletar — usado para debug, idempotency e re-processamento.';

-- Índices operacionais
CREATE INDEX IF NOT EXISTS webhook_events_clinic_unprocessed_idx
  ON public.webhook_events (clinic_id, processed, created_at)
  WHERE processed = false;

CREATE INDEX IF NOT EXISTS webhook_events_entity_idx
  ON public.webhook_events (entity_type, entity_id, created_at);

-- RLS: clínica só vê seus próprios eventos (service role para escrita via webhook)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events_select_own"
  ON public.webhook_events
  FOR SELECT
  USING (clinic_id = public.current_clinic_id());

-- ────────────────────────────────────────────────────────────
-- 3. automacoes — tabela real (substitui mock AUTOMATIONS)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.automacoes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID        NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  code         TEXT        NOT NULL,   -- 'af_01_wa_immediato' | 'af_03_cold_lead' | etc.
  name         TEXT        NOT NULL,
  description  TEXT,
  enabled      BOOLEAN     NOT NULL DEFAULT false,
  config       JSONB       NOT NULL DEFAULT '{}',  -- thresholds, templates, horários
  last_run_at  TIMESTAMPTZ,
  run_count    INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, code)
);

COMMENT ON TABLE public.automacoes
  IS 'Configuração das automações ativas por clínica. '
     'config JSONB armazena parâmetros específicos (delay_hours, template_id, business_hours_only, etc.)';

ALTER TABLE public.automacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automacoes_all_own"
  ON public.automacoes
  FOR ALL
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- ────────────────────────────────────────────────────────────
-- 4. Seed: templates padrão de automação (desabilitados por default)
-- ────────────────────────────────────────────────────────────
-- Inserção via função para evitar hardcode de clinic_id.
-- A clínica ativa os fluxos na tela /automacoes.
-- Seed real acontece no onboarding (server fn) após clinic_id gerado.
