/**
 * diagnostics.functions.ts — Server fns para o Diagnóstico da clínica
 *
 * Funções:
 *  runClinicDiagnostic — Executa a RPC calculate_and_save_diagnostic via service role.
 *
 * Contexto: o hardening de segurança revogou EXECUTE de anon/authenticated nas
 * funções SECURITY DEFINER, então a RPC não pode mais ser chamada do client.
 * Aqui validamos que o usuário pertence à clínica antes de executar com admin.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export const runClinicDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clinicId: string }) => {
    if (!input?.clinicId) throw new Error("clinicId é obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;

    // Defesa em profundidade: o usuário só pode diagnosticar a própria clínica
    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.clinic_id || profile.clinic_id !== data.clinicId) {
      throw new Error("Acesso negado: clínica não pertence ao usuário");
    }

    const { error } = await (supabaseAdmin as AnySupabase).rpc("calculate_and_save_diagnostic", {
      p_clinic_id: data.clinicId,
      p_triggered_by: "manual",
    });
    if (error) throw new Error(error.message);

    return { ok: true };
  });
