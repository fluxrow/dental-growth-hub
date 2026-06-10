-- ============================================================
-- Migration: meta_page_id em clinicas + meta_leadgen_id em oportunidades
-- Desbloqueia resolução clinic←→Meta page e deduplicação de leads
-- ============================================================

-- 1. clinicas.meta_page_id — Facebook Page ID ou Instagram Account ID
ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS meta_page_id       TEXT,
  ADD COLUMN IF NOT EXISTS meta_ig_account_id TEXT;

COMMENT ON COLUMN clinicas.meta_page_id       IS 'Facebook Page ID para resolução de webhooks Meta';
COMMENT ON COLUMN clinicas.meta_ig_account_id IS 'Instagram Account ID para resolução de webhooks Meta';

-- Índice para lookup rápido no webhook
CREATE INDEX IF NOT EXISTS idx_clinicas_meta_page_id
  ON clinicas (meta_page_id)
  WHERE meta_page_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clinicas_meta_ig_account_id
  ON clinicas (meta_ig_account_id)
  WHERE meta_ig_account_id IS NOT NULL;

-- 2. oportunidades.meta_leadgen_id — ID único do lead gerado pelo Meta Lead Ads
ALTER TABLE oportunidades
  ADD COLUMN IF NOT EXISTS meta_leadgen_id TEXT;

COMMENT ON COLUMN oportunidades.meta_leadgen_id IS 'ID único do lead Meta Lead Ads para deduplicação';

-- Índice único para idempotência: mesmo leadgen_id não cria duas oportunidades
CREATE UNIQUE INDEX IF NOT EXISTS idx_oportunidades_meta_leadgen_id
  ON oportunidades (meta_leadgen_id)
  WHERE meta_leadgen_id IS NOT NULL;

-- 3. clinic_integrations — garantir que meta_fb e meta_ig têm índice por page_id
--    Já existem via credentials JSONB + contains(), mas vamos garantir GIN index
CREATE INDEX IF NOT EXISTS idx_clinic_integrations_credentials_gin
  ON clinic_integrations USING GIN (credentials)
  WHERE provider IN ('meta_fb', 'meta_ig', 'meta_ads');

-- 4. RLS: meta_page_id e meta_ig_account_id seguem a política de clinicas
--    (as políticas existentes em clinicas já cobrem novas colunas automaticamente)
