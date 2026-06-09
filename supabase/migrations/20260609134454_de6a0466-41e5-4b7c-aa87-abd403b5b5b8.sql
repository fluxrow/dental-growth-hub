
ALTER TABLE public.clinicas
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS provisioning_status jsonb NOT NULL DEFAULT '{"calendar":"pending","whatsapp":"pending","reviews":"pending","email":"pending"}'::jsonb;

CREATE TABLE IF NOT EXISTS public.clinic_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  calendar_id text,
  connected_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_at timestamptz,
  last_sync_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, provider)
);

GRANT SELECT ON public.clinic_integrations TO authenticated;
GRANT ALL ON public.clinic_integrations TO service_role;

ALTER TABLE public.clinic_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read integrations of own clinic"
  ON public.clinic_integrations FOR SELECT
  TO authenticated
  USING (clinic_id = public.current_clinic_id());

CREATE TRIGGER tg_clinic_integrations_updated_at
  BEFORE UPDATE ON public.clinic_integrations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "clinic members upload own logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-logos'
    AND (storage.foldername(name))[1] = public.current_clinic_id()::text
  );

CREATE POLICY "clinic members read own logo"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'clinic-logos'
    AND (storage.foldername(name))[1] = public.current_clinic_id()::text
  );

CREATE POLICY "clinic members update own logo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'clinic-logos'
    AND (storage.foldername(name))[1] = public.current_clinic_id()::text
  );

CREATE POLICY "clinic members delete own logo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'clinic-logos'
    AND (storage.foldername(name))[1] = public.current_clinic_id()::text
  );
