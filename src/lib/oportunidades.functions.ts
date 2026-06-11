import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Enums } from "@/integrations/supabase/types";

type OppStage = Enums<"opportunity_stage">;

// ---------------------------------------------------------------------------
// advanceOportunidade  (P1-5: advance stage and persist)
// ---------------------------------------------------------------------------

export const advanceOportunidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; nextStage: OppStage }) => {
    if (!input?.id) throw new Error("id obrigatório");
    if (!input.nextStage) throw new Error("nextStage obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    // Defense in depth: além da RLS, restringe o update à clínica do usuário
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.clinic_id) throw new Error("Usuário sem clínica vinculada");

    const { error } = await context.supabase
      .from("oportunidades")
      .update({
        stage: data.nextStage,
        stage_changed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("clinic_id", profile.clinic_id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ---------------------------------------------------------------------------
// loseOportunidade  (P1-5: mark as lost)
// ---------------------------------------------------------------------------

export const loseOportunidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; lostReason?: string | null }) => {
    if (!input?.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    // Defense in depth: além da RLS, restringe o update à clínica do usuário
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.clinic_id) throw new Error("Usuário sem clínica vinculada");

    const { error } = await context.supabase
      .from("oportunidades")
      .update({
        stage: "perdida" satisfies OppStage,
        stage_changed_at: new Date().toISOString(),
        lost_at: new Date().toISOString(),
        lost_reason: data.lostReason ?? null,
      })
      .eq("id", data.id)
      .eq("clinic_id", profile.clinic_id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ---------------------------------------------------------------------------
// createOportunidade
// ---------------------------------------------------------------------------

export const createOportunidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      clinicId: string;
      name: string;
      phone?: string | null;
      source?: string | null;
      value?: number | null;
      nextAction?: string | null;
    }) => {
      if (!input?.clinicId) throw new Error("clinicId obrigatório");
      if (!input.name?.trim()) throw new Error("Nome obrigatório");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("oportunidades")
      .insert({
        clinic_id: data.clinicId,
        name: data.name.trim(),
        phone: data.phone ?? null,
        source: data.source ?? null,
        value: data.value ?? null,
        next_action: data.nextAction ?? null,
        stage: "novo" satisfies OppStage,
        stage_changed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });
