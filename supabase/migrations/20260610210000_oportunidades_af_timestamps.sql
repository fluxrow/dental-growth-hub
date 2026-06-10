-- ============================================================
-- Migration: oportunidades — campos de automação AF-06/AF-07
-- Rastreia quando cada automação de pós-consulta foi executada
-- ============================================================

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS last_contacted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS af06_sent_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS af07_sent_at       TIMESTAMPTZ;

COMMENT ON COLUMN public.oportunidades.last_contacted_at IS 'Última vez que houve contato ativo com o lead (usado pelo AF-03)';
COMMENT ON COLUMN public.oportunidades.af06_sent_at      IS 'Timestamp do envio da mensagem pós-consulta AF-06';
COMMENT ON COLUMN public.oportunidades.af07_sent_at      IS 'Timestamp do pedido de avaliação Google AF-07 (D+7)';

-- Índice para AF-03 (leads frios por stage + last_contacted_at)
CREATE INDEX IF NOT EXISTS idx_oportunidades_last_contacted
  ON public.oportunidades (clinic_id, stage, last_contacted_at)
  WHERE stage IN ('novo', 'contatado', 'interessado', 'negociando');

-- Índice para AF-07 (busca por af06_sent_at + af07_sent_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_oportunidades_af06_af07
  ON public.oportunidades (af06_sent_at)
  WHERE af06_sent_at IS NOT NULL AND af07_sent_at IS NULL;
