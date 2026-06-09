import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Enums } from "@/integrations/supabase/types";

type PatientStatus = Enums<"patient_status">;

// ---------------------------------------------------------------------------
// createPaciente  (P1-3: "Novo paciente" button)
// ---------------------------------------------------------------------------

export const createPaciente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      clinicId: string;
      name: string;
      phone?: string | null;
      email?: string | null;
      status?: PatientStatus;
      source?: string | null;
      tags?: string[];
    }) => {
      if (!input?.clinicId) throw new Error("clinicId obrigatório");
      if (!input.name?.trim()) throw new Error("Nome do paciente obrigatório");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("pacientes")
      .insert({
        clinic_id: data.clinicId,
        name: data.name.trim(),
        phone: data.phone ?? null,
        email: data.email ?? null,
        status: data.status ?? "lead",
        source: data.source ?? null,
        tags: data.tags ?? [],
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ---------------------------------------------------------------------------
// updatePaciente
// ---------------------------------------------------------------------------

export const updatePaciente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      name?: string;
      phone?: string | null;
      email?: string | null;
      status?: PatientStatus;
      source?: string | null;
      nextAction?: string | null;
      tags?: string[];
    }) => {
      if (!input?.id) throw new Error("id obrigatório");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pacientes")
      .update({
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.source !== undefined && { source: data.source }),
        ...(data.nextAction !== undefined && { next_action: data.nextAction }),
        ...(data.tags !== undefined && { tags: data.tags }),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
