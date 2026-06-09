-- security: add WITH CHECK to clinicas_update_own policy
-- Ensures that even after an UPDATE the resulting row still belongs to the
-- current user's clinic. Without WITH CHECK, the USING clause only guards
-- *which* rows can be updated, but not *what* they can be changed to.
-- This prevents a user from, e.g., changing the id or other ownership fields
-- to point to a different clinic.

ALTER POLICY "clinicas_update_own" ON public.clinicas
  USING     (id = public.current_clinic_id())
  WITH CHECK (id = public.current_clinic_id());
