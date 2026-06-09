import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  clinic_id: string | null;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
};

export type Clinic = {
  id: string;
  name: string;
  city: string | null;
  slug: string | null;
  onboarded: boolean;
  tone: "acolhedora" | "institucional" | "descontraida" | null;
};

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<{ profile: Profile | null; clinic: Clinic | null }> => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, clinic_id, email, name, avatar_url")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      if (!profile?.clinic_id) return { profile: profile ?? null, clinic: null };
      const { data: clinic } = await supabase
        .from("clinicas")
        .select("id, name, city, slug, onboarded, tone")
        .eq("id", profile.clinic_id)
        .maybeSingle();
      return { profile, clinic: clinic ?? null };
    },
  });
}
