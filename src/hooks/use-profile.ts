import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  clinic_id: string | null;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  role: string | null;
};

export type Clinic = {
  id: string;
  name: string;
  city: string | null;
  slug: string | null;
  onboarded: boolean;
  tone: "acolhedora" | "institucional" | "descontraida" | null;
  phone: string | null;
  address: string | null;
};

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<{ profile: Profile | null; clinic: Clinic | null }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: raw, error } = await (supabase as any)
        .from("profiles")
        .select("id, clinic_id, email, name, avatar_url")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      let profile = raw ? ({ ...raw, role: null } as Profile) : null;
      if (!profile?.clinic_id) return { profile, clinic: null };
      const clinicId = profile.clinic_id;
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .eq("clinic_id", clinicId)
        .maybeSingle();
      profile = { ...profile, role: roleRow?.role ?? null };
      const { data: clinic } = await supabase
        .from("clinicas")
        .select("id, name, city, slug, onboarded, tone, phone, address")
        .eq("id", clinicId)
        .maybeSingle();
      return { profile, clinic: clinic ?? null };
    },
  });
}
