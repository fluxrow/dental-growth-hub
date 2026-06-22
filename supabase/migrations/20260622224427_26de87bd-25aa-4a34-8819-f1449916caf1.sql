
-- 1) Move pg_net out of public (drop+recreate, since pg_net doesn't support SET SCHEMA)
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO authenticated, service_role, anon;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- 2) user_roles: remove self-grant branch
DROP POLICY IF EXISTS user_roles_insert_admin_only ON public.user_roles;
CREATE POLICY user_roles_insert_admin_only
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() <> user_id
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 3) clinic_diagnostics: remove client-side INSERT
DROP POLICY IF EXISTS cd_insert ON public.clinic_diagnostics;
REVOKE INSERT ON public.clinic_diagnostics FROM authenticated;

-- 4) clinic_integrations: hide tokens from authenticated admins
REVOKE SELECT ON public.clinic_integrations FROM authenticated;
GRANT SELECT (
  id, clinic_id, provider, status, scope, calendar_id,
  connected_by_user_id, connected_at, last_sync_at, expires_at,
  metadata, created_at, updated_at
) ON public.clinic_integrations TO authenticated;
GRANT ALL ON public.clinic_integrations TO service_role;
