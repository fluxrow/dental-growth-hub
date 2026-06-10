import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------------------------------------------------------------------
// Default automation templates seeded on first load per clinic
// ---------------------------------------------------------------------------

const DEFAULTS = [
  {
    code: "af_01_wa_imediato",
    name: "Resposta imediata ao lead",
    description: "Responde novos leads em até 5 minutos via WhatsApp — 24/7",
    config: {
      category: "follow-up",
      trigger_description: "Novo lead entra no funil",
      delay_minutes: 0,
    },
  },
  {
    code: "af_02_confirmacao_d1",
    name: "Confirmação D-1",
    description: "Lembrete de consulta 24h antes com link de confirmação/remarcação",
    config: {
      category: "confirmacao",
      trigger_description: "24h antes do scheduled_at",
      send_hour: 18,
    },
  },
  {
    code: "af_03_lead_frio",
    name: "Recuperação de lead frio",
    description: "Follow-up para leads sem resposta após threshold por etapa (3/7/2 dias)",
    config: {
      category: "follow-up",
      trigger_description: "Oportunidade sem movimento > threshold",
      max_attempts: 3,
    },
  },
  {
    code: "af_04_reativacao",
    name: "Reativação de pacientes inativos",
    description: "Campanha semanal para pacientes sem visita há 90+ dias",
    config: {
      category: "reativacao",
      trigger_description: "Paciente inativo > 90 dias",
      inactive_threshold_days: 90,
    },
  },
  {
    code: "af_05_cobranca",
    name: "Cobrança gentil (escalonada)",
    description: "Lembretes progressivos: D-3, D+1, D+7 antes de escalar para humano",
    config: {
      category: "cobranca",
      trigger_description: "Cobrança com due_date próximo ou vencido",
    },
  },
  {
    code: "af_06_pos_consulta",
    name: "Follow-up pós-consulta",
    description: "Mensagem 2h após comparecimento para converter orçamento em tratamento",
    config: {
      category: "follow-up",
      trigger_description: "Stage muda para 'compareceu'",
      delay_hours: 2,
    },
  },
  {
    code: "af_07_avaliacao",
    name: "Pedido de avaliação Google",
    description: "Solicita avaliação 7 dias após consulta para pacientes satisfeitos",
    config: {
      category: "avaliacao",
      trigger_description: "7 dias após consulta · sem avaliação recente",
      delay_days: 7,
    },
  },
] as const;

// ---------------------------------------------------------------------------
// listAutomacoes — retorna automações da clínica; faz seed se vazio
// ---------------------------------------------------------------------------

// config uses a JSON-serializable index type so TanStack Start can validate it
export type AutomacaoConfig = Record<string, string | number | boolean | null>;

export type AutomacaoRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  enabled: boolean;
  config: AutomacaoConfig;
  run_count: number;
  last_run_at: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: unknown) => supabase as any;

export const listAutomacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AutomacaoRow[]> => {
    const { data, error } = await db(context.supabase)
      .from("automacoes")
      .select("id, code, name, description, enabled, config, run_count, last_run_at")
      .order("created_at", { ascending: true });

    if (error) {
      const msg = (error as { message?: string }).message ?? "";
      // Tabela ainda não criada no Supabase — retorna vazio em vez de crashar
      if (msg.includes("schema cache") || msg.includes("relation") || msg.includes("does not exist")) {
        return [];
      }
      throw new Error(msg);
    }

    // Seed defaults na primeira vez que a clínica abre automações
    if (!data || (data as unknown[]).length === 0) {
      const { data: clinic } = await context.supabase.from("clinicas").select("id").single();

      if (clinic) {
        const toInsert = DEFAULTS.map((d) => ({
          clinic_id: clinic.id,
          code: d.code,
          name: d.name,
          description: d.description,
          enabled: false,
          config: d.config as unknown as AutomacaoConfig,
        }));

        const { data: seeded, error: seedErr } = await db(context.supabase)
          .from("automacoes")
          .insert(toInsert)
          .select("id, code, name, description, enabled, config, run_count, last_run_at");

        if (seedErr) throw new Error((seedErr as { message: string }).message);
        return (seeded ?? []) as unknown[] as AutomacaoRow[];
      }
    }

    return (data ?? []) as unknown[] as AutomacaoRow[];
  });

// ---------------------------------------------------------------------------
// toggleAutomacao — liga/desliga um fluxo
// ---------------------------------------------------------------------------

export const toggleAutomacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; enabled: boolean }) => {
    if (!input?.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("automacoes" as never)
      .update({ enabled: data.enabled, updated_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
