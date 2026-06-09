
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','recepcao','dentista','marketing');
CREATE TYPE public.clinic_tone AS ENUM ('acolhedora','institucional','descontraida');
CREATE TYPE public.patient_status AS ENUM ('ativo','tratamento','inativo','recuperado','lead');
CREATE TYPE public.opportunity_stage AS ENUM ('novo','contato','agendada','confirmada','compareceu','tratamento','ativo','perdida');
CREATE TYPE public.activity_kind AS ENUM ('resposta','confirmacao','falha','avaliacao','cobranca_enviada','cobranca_respondida','pagamento_confirmado','pagamento_atrasado','cobranca_falhou','sistema');
CREATE TYPE public.notif_kind AS ENUM ('conversa','oportunidade','cobranca','avaliacao','sistema','financeiro');

-- ============ updated_at helper ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============ CLINICAS ============
CREATE TABLE public.clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  cnpj TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  logo_url TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  tone public.clinic_tone DEFAULT 'acolhedora',
  specialties TEXT[] DEFAULT '{}',
  whatsapp_provider TEXT,
  whatsapp_instance TEXT,
  whatsapp_phone TEXT,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinicas TO authenticated;
GRANT ALL ON public.clinicas TO service_role;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_clinicas_updated BEFORE UPDATE ON public.clinicas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
  email TEXT,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- helper: current clinic of the auth user (security definer, bypasses RLS)
CREATE OR REPLACE FUNCTION public.current_clinic_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ============ USER_ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, clinic_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
      AND (clinic_id IS NULL OR clinic_id = public.current_clinic_id())
  )
$$;

-- ============ PACIENTES ============
CREATE TABLE public.pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status public.patient_status NOT NULL DEFAULT 'lead',
  source TEXT,
  ltv NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  next_action TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pacientes_clinic_status ON public.pacientes(clinic_id, status);
CREATE INDEX idx_pacientes_clinic_phone ON public.pacientes(clinic_id, phone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacientes TO authenticated;
GRANT ALL ON public.pacientes TO service_role;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_pacientes_updated BEFORE UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ OPORTUNIDADES ============
CREATE TABLE public.oportunidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  stage public.opportunity_stage NOT NULL DEFAULT 'novo',
  source TEXT,
  value NUMERIC(10,2) DEFAULT 0,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  next_action TEXT,
  stage_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lost_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_oportunidades_clinic_stage ON public.oportunidades(clinic_id, stage);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oportunidades TO authenticated;
GRANT ALL ON public.oportunidades TO service_role;
ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_oportunidades_updated BEFORE UPDATE ON public.oportunidades
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ ATIVIDADES ============
CREATE TABLE public.atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  kind public.activity_kind NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  patient_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  value NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_atividades_clinic_created ON public.atividades(clinic_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atividades TO authenticated;
GRANT ALL ON public.atividades TO service_role;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

-- ============ NOTIFICACOES ============
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.notif_kind NOT NULL,
  category TEXT,
  title TEXT NOT NULL,
  detail TEXT,
  patient_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  value NUMERIC(10,2),
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_clinic_user_read ON public.notificacoes(clinic_id, user_id, read);
CREATE INDEX idx_notif_clinic_created ON public.notificacoes(clinic_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============

-- clinicas: read own; insert any authenticated (during onboarding); update if member
CREATE POLICY "clinicas_select_own" ON public.clinicas FOR SELECT TO authenticated
  USING (id = public.current_clinic_id());
CREATE POLICY "clinicas_insert_auth" ON public.clinicas FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "clinicas_update_own" ON public.clinicas FOR UPDATE TO authenticated
  USING (id = public.current_clinic_id());

-- profiles
CREATE POLICY "profiles_select_clinic" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR clinic_id = public.current_clinic_id());
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- user_roles
CREATE POLICY "user_roles_select_clinic" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR clinic_id = public.current_clinic_id());
CREATE POLICY "user_roles_insert_self_or_admin" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_update_admin" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_delete_admin" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- generic clinic isolation for the rest
CREATE POLICY "pacientes_all_own_clinic" ON public.pacientes FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY "oportunidades_all_own_clinic" ON public.oportunidades FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY "atividades_all_own_clinic" ON public.atividades FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY "notificacoes_select_own" ON public.notificacoes FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "notificacoes_insert_clinic" ON public.notificacoes FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());
CREATE POLICY "notificacoes_update_own" ON public.notificacoes FOR UPDATE TO authenticated
  USING (clinic_id = public.current_clinic_id() AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "notificacoes_delete_own" ON public.notificacoes FOR DELETE TO authenticated
  USING (clinic_id = public.current_clinic_id() AND (user_id IS NULL OR user_id = auth.uid()));

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
