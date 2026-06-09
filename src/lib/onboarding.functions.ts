import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------------------------------------------------------------------
// completeOnboarding
// ---------------------------------------------------------------------------
// Upserts the clinic (idempotent), updates the user's profile, and inserts
// the admin user_role. All writes are done under the user's RLS session so
// row-level security is enforced. Returns the clinic id.
// ---------------------------------------------------------------------------

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      clinicName: string;
      clinicCnpj?: string | null;
      clinicAddress?: string | null;
      clinicSpecialties?: string[];
      userName?: string | null;
    }) => {
      if (!input?.clinicName?.trim()) throw new Error("Nome da clínica obrigatório");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // ── 1. Idempotência: reaproveita clínica já criada por este usuário ──────
    const { data: existing } = await context.supabase
      .from("clinicas")
      .select("id")
      .eq("created_by", userId)
      .maybeSingle();

    let clinicId: string;

    if (existing?.id) {
      clinicId = existing.id;
      const { error } = await context.supabase
        .from("clinicas")
        .update({
          name: data.clinicName.trim(),
          cnpj: data.clinicCnpj ?? null,
          address: data.clinicAddress ?? null,
          specialties: data.clinicSpecialties ?? [],
          onboarded: true,
        })
        .eq("id", clinicId);
      if (error) throw new Error(error.message);
    } else {
      // Generate a stable unique slug
      const baseSlug =
        data.clinicName
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || `clinica-${Date.now()}`;
      const slug = `${baseSlug}-${userId.slice(0, 6)}-${Date.now().toString(36)}`;

      const { data: clinic, error: cErr } = await context.supabase
        .from("clinicas")
        .insert({
          name: data.clinicName.trim(),
          slug,
          cnpj: data.clinicCnpj ?? null,
          address: data.clinicAddress ?? null,
          specialties: data.clinicSpecialties ?? [],
          logo_url: null,
          onboarded: true,
          created_by: userId,
        })
        .select("id")
        .single();
      if (cErr) throw new Error(cErr.message);
      clinicId = clinic.id;
    }

    // ── 2. Atualiza profile com clinic_id e nome ──────────────────────────
    const { error: pErr } = await context.supabase
      .from("profiles")
      .update({
        clinic_id: clinicId,
        name: data.userName ?? null,
      })
      .eq("id", userId);
    if (pErr) throw new Error(pErr.message);

    // ── 3. Garante role admin (unique(user_id, role) — ignora duplicata) ──
    const { error: roleErr } = await context.supabase.from("user_roles").insert({
      user_id: userId,
      clinic_id: clinicId,
      role: "admin",
    });
    if (roleErr && !roleErr.message.toLowerCase().includes("duplicate")) {
      throw new Error(roleErr.message);
    }

    return { clinicId };
  });

// ---------------------------------------------------------------------------
// setClinicLogoUrl
// ---------------------------------------------------------------------------
// After the client-side storage upload, call this to persist the logo path.
// Separate from completeOnboarding because storage.upload() must happen
// client-side (requires a File object from the browser).
// ---------------------------------------------------------------------------

export const setClinicLogoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clinicId: string; logoUrl: string }) => {
    if (!input?.clinicId) throw new Error("clinicId obrigatório");
    if (!input?.logoUrl) throw new Error("logoUrl obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("clinicas")
      .update({ logo_url: data.logoUrl })
      .eq("id", data.clinicId);
    if (error) throw new Error(error.message);
    return { success: true };
  });
