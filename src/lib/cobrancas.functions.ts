/**
 * cobrancas.functions.ts — Server fns para o Dunning Engine
 *
 * Funções:
 *  listCobrancas      — Lista cobranças com filtros + dunning metadata
 *  createCobranca     — Cria nova cobrança
 *  updateCobrancaStatus — Marca como paga / cancelada
 *  getDunningQueue    — Fila priorizada para ação imediata
 *  getChargeTimeline  — Histórico de tentativas de uma cobrança
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

// ─── listCobrancas ────────────────────────────────────────────────────────────

export const listCobrancas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      status?: string;
      clinicId?: string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    }) => input ?? {},
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", context.userId)
      .maybeSingle();

    const clinicId = data.clinicId ?? profile?.clinic_id;
    if (!clinicId) throw new Error("clinic_id não encontrado");

    let query = supabase
      .from("cobrancas")
      .select(
        `
        id,
        description,
        value,
        due_date,
        status,
        channel,
        installment_n,
        installment_of,
        paid_at,
        created_at,
        paciente:pacientes(id, name, phone),
        tentativas:cobranca_tentativas(
          id, stage_day, status, sent_at, wa_message_id
        )
      `,
      )
      .eq("clinic_id", clinicId)
      .order("due_date", { ascending: true });

    if (data.status) query = query.eq("status", data.status);
    if (data.from) query = query.gte("due_date", data.from);
    if (data.to) query = query.lte("due_date", data.to);

    const limit = data.limit ?? 50;
    const offset = data.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data: rows, error, count } = await query;
    if (error) throw error;

    return { rows: rows ?? [], total: count ?? 0 };
  });

// ─── getDunningQueue ──────────────────────────────────────────────────────────
// Retorna cobranças que PRECISAM de ação agora (priorizadas pelo stage da régua)

export const getDunningQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as AnySupabase;
    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", context.userId)
      .maybeSingle();

    const clinicId = profile?.clinic_id;
    if (!clinicId) throw new Error("clinic_id não encontrado");

    const today = new Date().toISOString().split("T")[0];
    const d3 = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];
    const dm3 = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

    // Cobranças que merecem ação:
    //  - Vencendo em 3 dias (D-3): aviso preventivo
    //  - Vencendo hoje (D+0): urgente
    //  - Atrasadas até 10 dias: cada stage da régua
    const { data, error } = await supabase
      .from("cobrancas")
      .select(
        `
        id, description, value, due_date, status, channel,
        paciente:pacientes(id, name, phone),
        tentativas:cobranca_tentativas(
          id, stage_day, status, sent_at
        )
      `,
      )
      .eq("clinic_id", clinicId)
      .in("status", ["pendente", "vencendo", "atrasada"])
      .gte("due_date", d3) // não mostrar cobranças muito antigas já escaladas
      .lte("due_date", today) // não mostrar futuras além do D-3
      .or(`due_date.gte.${dm3},due_date.lte.${today}`)
      .order("due_date", { ascending: true })
      .limit(100);

    if (error) throw error;

    // Calcular nextStageDay para cada cobrança
    const queue = (data ?? []).map(
      (c: {
        id: string;
        due_date: string;
        tentativas: Array<{ stage_day: number }>;
        [key: string]: unknown;
      }) => {
        const daysLate = Math.floor((Date.now() - new Date(c.due_date).getTime()) / 86400000);

        const sentStages = new Set(
          (c.tentativas ?? []).map((t: { stage_day: number }) => t.stage_day),
        );

        // Sequência de stages da régua
        const stages = [-3, 0, 3, 7, 10];
        const nextStage = stages.find((s) => s <= daysLate && !sentStages.has(s)) ?? null;

        return { ...c, daysLate, nextStage, sentStages: [...sentStages] };
      },
    );

    // Prioridade: mais atrasadas + stage pendente primeiro
    type QueueItem = { nextStage: number | null; daysLate: number };
    queue.sort((a: QueueItem, b: QueueItem) => {
      if (a.nextStage !== null && b.nextStage === null) return -1;
      if (a.nextStage === null && b.nextStage !== null) return 1;
      return b.daysLate - a.daysLate;
    });

    return queue;
  });

// ─── getChargeTimeline ────────────────────────────────────────────────────────

export const getChargeTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cobrancaId: string }) => {
    if (!input?.cobrancaId) throw new Error("cobrancaId obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;

    const { data: rows, error } = await supabase
      .from("cobranca_tentativas")
      .select("*")
      .eq("cobranca_id", data.cobrancaId)
      .order("stage_day", { ascending: true });

    if (error) throw error;
    return rows ?? [];
  });

// ─── createCobranca ───────────────────────────────────────────────────────────

export const createCobranca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      pacienteId?: string;
      oportunidadeId?: string;
      description: string;
      value: number;
      dueDate: string;
      channel?: "whatsapp" | "sms" | "email";
      installmentN?: number;
      installmentOf?: number;
    }) => {
      if (!input?.description) throw new Error("description obrigatório");
      if (!input?.value || input.value <= 0) throw new Error("value deve ser > 0");
      if (!input?.dueDate) throw new Error("dueDate obrigatório");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", context.userId)
      .maybeSingle();

    const clinicId = profile?.clinic_id;
    if (!clinicId) throw new Error("clinic_id não encontrado");

    const { data: cobranca, error } = await supabase
      .from("cobrancas")
      .insert({
        clinic_id: clinicId,
        paciente_id: data.pacienteId,
        oportunidade_id: data.oportunidadeId,
        description: data.description,
        value: data.value,
        due_date: data.dueDate,
        channel: data.channel ?? "whatsapp",
        installment_n: data.installmentN,
        installment_of: data.installmentOf,
        status: "pendente",
      })
      .select("id")
      .single();

    if (error) throw error;
    return cobranca;
  });

// ─── updateCobrancaStatus ─────────────────────────────────────────────────────

export const updateCobrancaStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      cobrancaId: string;
      status: "paga" | "cancelada" | "pendente" | "atrasada";
      paidAt?: string;
    }) => {
      if (!input?.cobrancaId) throw new Error("cobrancaId obrigatório");
      if (!input?.status) throw new Error("status obrigatório");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;

    const { error } = await supabase
      .from("cobrancas")
      .update({
        status: data.status,
        paid_at: data.status === "paga" ? (data.paidAt ?? new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.cobrancaId);

    if (error) throw error;
    return { ok: true };
  });
