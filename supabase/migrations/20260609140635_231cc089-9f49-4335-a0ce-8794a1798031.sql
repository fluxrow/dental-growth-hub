CREATE POLICY "admins manage own clinic integrations insert"
ON public.clinic_integrations FOR INSERT TO authenticated
WITH CHECK (clinic_id = public.current_clinic_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage own clinic integrations update"
ON public.clinic_integrations FOR UPDATE TO authenticated
USING (clinic_id = public.current_clinic_id() AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (clinic_id = public.current_clinic_id() AND public.has_role(auth.uid(), 'admin'));