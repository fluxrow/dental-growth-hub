import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ClinicTone = "acolhedora" | "institucional" | "descontraida";

export const updateClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      clinicId: string;
      name: string;
      city?: string | null;
      phone?: string | null;
      address?: string | null;
      tone?: ClinicTone | null;
    }) => {
      if (!input?.clinicId) throw new Error("clinicId obrigatório");
      if (!input.name?.trim()) throw new Error("Nome da clínica não pode ser vazio");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("clinicas")
      .update({
        name: data.name.trim(),
        city: data.city ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        tone: data.tone ?? null,
      })
      .eq("id", data.clinicId);

    if (error) throw new Error(error.message);
    return { success: true };
  });
