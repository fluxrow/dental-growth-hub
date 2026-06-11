
-- 1) Tighten user_roles INSERT: prevent self-grant and require admin
DROP POLICY IF EXISTS user_roles_insert_admin_only ON public.user_roles;
CREATE POLICY user_roles_insert_admin_only ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() <> user_id
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 2) Harden has_role against NULL current_clinic_id
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        clinic_id IS NULL
        OR (
          public.current_clinic_id() IS NOT NULL
          AND clinic_id = public.current_clinic_id()
        )
      )
  )
$$;

-- 3) Add DELETE policy on clinic_integrations (admins of own clinic)
DROP POLICY IF EXISTS "admins delete own clinic integrations" ON public.clinic_integrations;
CREATE POLICY "admins delete own clinic integrations" ON public.clinic_integrations
  FOR DELETE TO authenticated
  USING (clinic_id = public.current_clinic_id() AND public.has_role(auth.uid(), 'admin'::app_role));

-- 4) Migrate all 'public'-role policies to 'authenticated' so unauthenticated
--    requests are rejected at the role layer regardless of current_clinic_id() result.

-- automacoes
DROP POLICY IF EXISTS automacoes_all_own ON public.automacoes;
CREATE POLICY automacoes_all_own ON public.automacoes FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- churn_attempts
DROP POLICY IF EXISTS churn_attempts_insert_own ON public.churn_attempts;
DROP POLICY IF EXISTS churn_attempts_select_own ON public.churn_attempts;
CREATE POLICY churn_attempts_insert_own ON public.churn_attempts FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());
CREATE POLICY churn_attempts_select_own ON public.churn_attempts FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id());

-- clinic_activity_events
DROP POLICY IF EXISTS activity_events_insert_own ON public.clinic_activity_events;
DROP POLICY IF EXISTS activity_events_select_own ON public.clinic_activity_events;
CREATE POLICY activity_events_insert_own ON public.clinic_activity_events FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());
CREATE POLICY activity_events_select_own ON public.clinic_activity_events FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id());

-- clinic_subscriptions
DROP POLICY IF EXISTS subscriptions_select_own ON public.clinic_subscriptions;
DROP POLICY IF EXISTS subscriptions_write_admin ON public.clinic_subscriptions;
CREATE POLICY subscriptions_select_own ON public.clinic_subscriptions FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY subscriptions_write_admin ON public.clinic_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- cobranca_tentativas
DROP POLICY IF EXISTS cobranca_tentativas_all_own ON public.cobranca_tentativas;
CREATE POLICY cobranca_tentativas_all_own ON public.cobranca_tentativas FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- cobrancas
DROP POLICY IF EXISTS cobrancas_all_own ON public.cobrancas;
CREATE POLICY cobrancas_all_own ON public.cobrancas FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- conversas
DROP POLICY IF EXISTS conversas_all_own ON public.conversas;
CREATE POLICY conversas_all_own ON public.conversas FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- cs_touchpoints
DROP POLICY IF EXISTS cs_touchpoints_select_own ON public.cs_touchpoints;
DROP POLICY IF EXISTS cs_touchpoints_write_admin ON public.cs_touchpoints;
CREATE POLICY cs_touchpoints_select_own ON public.cs_touchpoints FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY cs_touchpoints_write_admin ON public.cs_touchpoints FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- mensagens
DROP POLICY IF EXISTS mensagens_all_own ON public.mensagens;
CREATE POLICY mensagens_all_own ON public.mensagens FOR ALL TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- payment_events (admin-only read)
DROP POLICY IF EXISTS payment_events_select_admin ON public.payment_events;
CREATE POLICY payment_events_select_admin ON public.payment_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- plans (catalog: signed-in users only)
DROP POLICY IF EXISTS plans_select_all ON public.plans;
DROP POLICY IF EXISTS plans_write_admin ON public.plans;
CREATE POLICY plans_select_all ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY plans_write_admin ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- webhook_events
DROP POLICY IF EXISTS webhook_events_select_own ON public.webhook_events;
CREATE POLICY webhook_events_select_own ON public.webhook_events FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() OR public.has_role(auth.uid(), 'admin'::app_role));
