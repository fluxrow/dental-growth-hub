DROP POLICY IF EXISTS user_roles_insert_admin_only ON public.user_roles;

CREATE POLICY user_roles_insert_admin_only
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    -- Bootstrap: first admin for a clinic the user just created
    (
      user_id = auth.uid()
      AND role = 'admin'::app_role
      AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
    )
    OR
    -- Existing admin granting role to someone else
    (
      auth.uid() <> user_id
      AND public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
);