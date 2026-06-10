-- ============================================================
-- Migration: conversas_mensagens
-- Suporte a conversas multi-canal (WhatsApp, Instagram DM,
-- Facebook Messenger) com rastreamento por mensagem.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. conversas — inbox unificado multi-canal
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversas (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID        NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  phone        TEXT        NOT NULL,   -- phone normalizado OU sender_id (IG/FB)
  contact_name TEXT,
  channel      TEXT        NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'instagram', 'messenger', 'sms', 'email')),
  status       TEXT        NOT NULL DEFAULT 'novo'
    CHECK (status IN ('novo', 'em_atendimento', 'aguardando', 'resolvido', 'spam')),
  last_message TEXT,
  last_msg_at  TIMESTAMPTZ,
  unread       INTEGER     NOT NULL DEFAULT 0 CHECK (unread >= 0),
  assigned_to  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  tags         TEXT[]      NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, channel, phone)
);

COMMENT ON TABLE public.conversas
  IS 'Inbox unificado multi-canal. Uma entrada por contato × canal × clínica. '
     'Para WhatsApp: phone = número normalizado (55119...). '
     'Para Instagram/Messenger: phone = sender_id da Meta.';

CREATE INDEX IF NOT EXISTS conversas_clinic_channel_idx
  ON public.conversas (clinic_id, channel, status, last_msg_at DESC);

CREATE INDEX IF NOT EXISTS conversas_unread_idx
  ON public.conversas (clinic_id, unread)
  WHERE unread > 0;

ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversas_all_own"
  ON public.conversas
  FOR ALL
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- ────────────────────────────────────────────────────────────
-- 2. mensagens — histórico completo de cada conversa
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mensagens (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id   UUID        NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
  clinic_id     UUID        NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  direction     TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel       TEXT        NOT NULL
    CHECK (channel IN ('whatsapp', 'instagram', 'messenger', 'sms', 'email')),
  content       TEXT        NOT NULL,
  media_type    TEXT        CHECK (media_type IN ('image', 'audio', 'video', 'document', 'sticker', 'location')),
  media_url     TEXT,
  wa_message_id TEXT,         -- Z-API messageId ou Meta message mid
  status        TEXT        NOT NULL DEFAULT 'enviado'
    CHECK (status IN ('pending', 'enviado', 'entregue', 'lido', 'failed')),
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mensagens
  IS 'Histórico de mensagens de cada conversa. '
     'wa_message_id é usado para rastrear status via webhook Z-API (on-whatsapp-message-status-changes) '
     'e para idempotência na Meta (message mid).';

CREATE INDEX IF NOT EXISTS mensagens_conversa_idx
  ON public.mensagens (conversa_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS mensagens_wa_message_idx
  ON public.mensagens (wa_message_id)
  WHERE wa_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mensagens_clinic_idx
  ON public.mensagens (clinic_id, sent_at DESC);

ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mensagens_all_own"
  ON public.mensagens
  FOR ALL
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- ────────────────────────────────────────────────────────────
-- 3. webhook_events — audit log de todos os webhooks recebidos
--    (Z-API, Meta Lead Ads, Meta DM, Meta Comments)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID        REFERENCES public.clinicas(id) ON DELETE SET NULL,
  source       TEXT        NOT NULL,  -- "zapi_receive" | "meta_leadgen" | "meta_ig_comment" | ...
  event_type   TEXT        NOT NULL,
  external_id  TEXT,                  -- meta comment_id, leadgen_id para idempotência
  entity_type  TEXT,                  -- "conversa" | "oportunidade" | "clinic_integration"
  entity_id    UUID,
  payload      JSONB       NOT NULL DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.webhook_events
  IS 'Audit log imutável de todos os webhooks recebidos. '
     'external_id + source = chave de idempotência por origem. '
     'Permite replay e debugging de eventos.';

CREATE INDEX IF NOT EXISTS webhook_events_source_idx
  ON public.webhook_events (source, created_at DESC);

CREATE INDEX IF NOT EXISTS webhook_events_clinic_idx
  ON public.webhook_events (clinic_id, created_at DESC)
  WHERE clinic_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_idempotency_idx
  ON public.webhook_events (source, external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Apenas superadmin vê todos; serviço pode escrever via service role
CREATE POLICY "webhook_events_select_superadmin"
  ON public.webhook_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- ────────────────────────────────────────────────────────────
-- 4. Trigger: atualizar conversas.updated_at automaticamente
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_conversa_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversas_updated_at ON public.conversas;
CREATE TRIGGER conversas_updated_at
  BEFORE UPDATE ON public.conversas
  FOR EACH ROW EXECUTE FUNCTION public.update_conversa_updated_at();

-- ────────────────────────────────────────────────────────────
-- 5. Realtime — habilitar para atualizações em tempo real
--    (o frontend usa supabase.channel para inbox ao vivo)
-- ────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens;
