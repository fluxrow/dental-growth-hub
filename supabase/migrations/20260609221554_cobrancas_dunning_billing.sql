-- ============================================================
-- Migration: cobrancas_dunning_billing
-- Tables: cobrancas, cobranca_tentativas, plans,
--         clinic_subscriptions, payment_events
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. cobrancas — cobranças reais com dunning metadata
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cobrancas (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID          NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  paciente_id     UUID          REFERENCES public.pacientes(id) ON DELETE SET NULL,
  oportunidade_id UUID          REFERENCES public.oportunidades(id) ON DELETE SET NULL,
  description     TEXT          NOT NULL,
  value           NUMERIC(10,2) NOT NULL CHECK (value > 0),
  due_date        DATE          NOT NULL,
  status          TEXT          NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'vencendo', 'atrasada', 'recuperada', 'paga', 'cancelada')),
  channel         TEXT          CHECK (channel IN ('whatsapp', 'sms', 'email')),
  installment_n   INTEGER       CHECK (installment_n > 0),
  installment_of  INTEGER       CHECK (installment_of > 0),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cobrancas
  IS 'Cobranças ativas da clínica. Base do dunning engine — régua D-3 a D+10.';

-- Índices para dunning queue (cobranças que precisam de ação)
CREATE INDEX IF NOT EXISTS cobrancas_dunning_idx
  ON public.cobrancas (clinic_id, status, due_date)
  WHERE status IN ('pendente', 'vencendo', 'atrasada');

CREATE INDEX IF NOT EXISTS cobrancas_paciente_idx
  ON public.cobrancas (clinic_id, paciente_id);

-- RLS
ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cobrancas_all_own"
  ON public.cobrancas
  FOR ALL
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- ────────────────────────────────────────────────────────────
-- 2. cobranca_tentativas — histórico de cada tentativa da régua
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cobranca_tentativas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cobranca_id     UUID        NOT NULL REFERENCES public.cobrancas(id) ON DELETE CASCADE,
  clinic_id       UUID        NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  channel         TEXT        NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  stage_day       INTEGER     NOT NULL, -- D-3=-3, D+0=0, D+3=3, D+7=7, D+10=10
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT        NOT NULL DEFAULT 'enviado'
    CHECK (status IN ('enviado', 'entregue', 'lido', 'clicado', 'falhou')),
  message_preview TEXT,
  wa_message_id   TEXT,       -- Z-API messageId para rastrear status via webhook
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cobranca_tentativas
  IS 'Histórico de cada tentativa de cobrança por canal. '
     'wa_message_id permite rastrear leitura via webhook Z-API on-whatsapp-message-status-changes.';

CREATE INDEX IF NOT EXISTS tentativas_cobranca_idx
  ON public.cobranca_tentativas (cobranca_id, stage_day);

CREATE INDEX IF NOT EXISTS tentativas_wa_message_idx
  ON public.cobranca_tentativas (wa_message_id)
  WHERE wa_message_id IS NOT NULL;

-- RLS
ALTER TABLE public.cobranca_tentativas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cobranca_tentativas_all_own"
  ON public.cobranca_tentativas
  FOR ALL
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- ────────────────────────────────────────────────────────────
-- 3. plans — planos disponíveis do DrFlux (seed fixo)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.plans (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_price_id  TEXT    NOT NULL UNIQUE,
  name             TEXT    NOT NULL,
  interval         TEXT    NOT NULL CHECK (interval IN ('month', 'year', 'one_time')),
  amount_cents     INTEGER NOT NULL CHECK (amount_cents > 0),
  currency         TEXT    NOT NULL DEFAULT 'brl',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  features         JSONB   NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.plans
  IS 'Planos disponíveis para assinatura. Gerenciado apenas por superadmin. '
     'stripe_price_id referencia o Price ID no Stripe Dashboard.';

-- RLS: leitura pública (cliente vê os planos), escrita só superadmin
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_all"
  ON public.plans
  FOR SELECT
  USING (true);

CREATE POLICY "plans_write_superadmin"
  ON public.plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Seed dos planos (price IDs fictícios — substituir após criar no Stripe Dashboard)
INSERT INTO public.plans (stripe_price_id, name, interval, amount_cents, features)
VALUES
  ('price_drflux_impl_placeholder',    'Implementação DrFlux', 'one_time', 199700,
   '{"includes": ["onboarding_guiado", "importacao_dados", "config_whatsapp", "treinamento_1h"]}'::jsonb),
  ('price_drflux_monthly_placeholder', 'DrFlux Mensal',        'month',    99700,
   '{"includes": ["plataforma_completa", "automacoes", "dunning", "suporte"]}'::jsonb),
  ('price_drflux_annual_placeholder',  'DrFlux Anual',         'year',     897000,
   '{"includes": ["plataforma_completa", "automacoes", "dunning", "suporte", "desconto_25pct"]}'::jsonb)
ON CONFLICT (stripe_price_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 4. clinic_subscriptions — assinatura atual de cada clínica
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clinic_subscriptions (
  id                     UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id              UUID    NOT NULL UNIQUE REFERENCES public.clinicas(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT    NOT NULL UNIQUE,
  stripe_subscription_id TEXT    UNIQUE,
  plan_id                UUID    REFERENCES public.plans(id),
  status                 TEXT    NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'canceled', 'incomplete')),
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT false,
  canceled_at            TIMESTAMPTZ,
  cancel_reason          TEXT,    -- razão do cancel flow
  trial_end              TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clinic_subscriptions
  IS 'Status de assinatura por clínica. Sincronizado via Stripe webhooks. '
     'status=active = acesso liberado. status=past_due = acesso condicionado ao dunning.';

ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;

-- Clínica vê sua própria assinatura; superadmin vê todas
CREATE POLICY "subscriptions_select_own"
  ON public.clinic_subscriptions
  FOR SELECT
  USING (
    clinic_id = public.current_clinic_id()
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "subscriptions_write_service"
  ON public.clinic_subscriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- ────────────────────────────────────────────────────────────
-- 5. payment_events — histórico imutável de eventos de pagamento
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_events (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        UUID    REFERENCES public.clinicas(id) ON DELETE SET NULL,
  stripe_event_id  TEXT    NOT NULL UNIQUE, -- idempotency key
  event_type       TEXT    NOT NULL,
  amount_cents     INTEGER,
  currency         TEXT,
  status           TEXT,
  invoice_id       TEXT,
  subscription_id  TEXT,
  payload          JSONB   NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_events
  IS 'Audit log imutável de todos os eventos Stripe. '
     'stripe_event_id UNIQUE garante idempotência — evento duplicado é ignorado silenciosamente.';

CREATE INDEX IF NOT EXISTS payment_events_clinic_idx
  ON public.payment_events (clinic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payment_events_type_idx
  ON public.payment_events (event_type, created_at DESC);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_events_select_superadmin"
  ON public.payment_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- ────────────────────────────────────────────────────────────
-- 6. cs_touchpoints — régua de Customer Success D+0 a D+90
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cs_touchpoints (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID    NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  touchpoint    TEXT    NOT NULL
    CHECK (touchpoint IN ('d0_kickoff', 'd7_checkin', 'd30_qbr', 'd90_renewal')),
  scheduled_at  TIMESTAMPTZ NOT NULL,
  executed_at   TIMESTAMPTZ,
  status        TEXT    NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'done', 'skipped', 'failed')),
  channel       TEXT    NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'email', 'call')),
  message_sent  TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, touchpoint)  -- uma entrada por touchpoint por clínica
);

COMMENT ON TABLE public.cs_touchpoints
  IS 'Régua de Customer Success por clínica. '
     'Populada automaticamente ao ativar assinatura (checkout.session.completed). '
     'Executada por cron horário: /api/cron/cs-touchpoints.';

CREATE INDEX IF NOT EXISTS cs_touchpoints_pending_idx
  ON public.cs_touchpoints (status, scheduled_at)
  WHERE status = 'pending';

ALTER TABLE public.cs_touchpoints ENABLE ROW LEVEL SECURITY;

-- Superadmin gerencia; clínica vê os próprios
CREATE POLICY "cs_touchpoints_select_own"
  ON public.cs_touchpoints
  FOR SELECT
  USING (
    clinic_id = public.current_clinic_id()
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "cs_touchpoints_write_superadmin"
  ON public.cs_touchpoints
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- ────────────────────────────────────────────────────────────
-- 7. clinic_integrations — canal de comunicação por clínica
--    (Z-API, Meta, Instagram — uma linha por provedor)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clinic_integrations (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID    NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  provider     TEXT    NOT NULL
    CHECK (provider IN ('zapi', 'meta_ads', 'meta_ig', 'meta_fb', 'google_calendar', 'stripe')),
  status       TEXT    NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  credentials  JSONB   NOT NULL DEFAULT '{}', -- { instance_id, token, page_id, ... }
  metadata     JSONB   NOT NULL DEFAULT '{}', -- { phone_number, page_name, ig_username, ... }
  connected_at TIMESTAMPTZ,
  error_at     TIMESTAMPTZ,
  error_msg    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, provider)
);

COMMENT ON TABLE public.clinic_integrations
  IS 'Canal de comunicação e integrações externas por clínica. '
     'credentials JSONB armazena tokens/instâncias de forma estruturada (nunca expor ao cliente). '
     'Z-API: { instance_id, token } por clínica. Meta: { page_id, access_token }.';

ALTER TABLE public.clinic_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_all_own"
  ON public.clinic_integrations
  FOR ALL
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());
