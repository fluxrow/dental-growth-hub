-- ============================================================
-- Migration: clinicas — campos de avaliação e reputação
-- Usado pelo AF-07 (pedido de avaliação Google D+7)
-- ============================================================

ALTER TABLE public.clinicas
  ADD COLUMN IF NOT EXISTS google_review_url  TEXT,
  ADD COLUMN IF NOT EXISTS google_place_id    TEXT;

COMMENT ON COLUMN public.clinicas.google_review_url
  IS 'URL direta para avaliação Google do consultório. Formato: https://search.google.com/local/writereview?placeid=...';

COMMENT ON COLUMN public.clinicas.google_place_id
  IS 'Google Place ID do consultório (opcional — para gerar review_url automaticamente)';
