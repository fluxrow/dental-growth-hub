import { supabase } from "@/integrations/supabase/client";

// Demo dataset: 20 patients, 15 opportunities, ~10 activities, ~6 notifications.
// Idempotent guard via clinic flag (no metadata column → uses count check on pacientes).

const NOMES = [
  "Marina Souza", "Bruno Costa", "Camila Ribeiro", "Diego Almeida", "Eduarda Lima",
  "Felipe Martins", "Gabriela Nunes", "Henrique Silva", "Isabela Rocha", "João Pereira",
  "Karina Mendes", "Lucas Andrade", "Mariana Castro", "Nicolas Borges", "Olívia Faria",
  "Pedro Henrique", "Quésia Vieira", "Rafael Tavares", "Sofia Carvalho", "Tiago Moreira",
];

const SOURCES = ["Google Ads", "Instagram", "Indicação", "Site", "Meta Ads", "Orgânico"];
const TAGS = ["implante", "ortodontia", "estética", "particular", "convênio", "vip", "limpeza"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randTags(): string[] {
  const n = 1 + Math.floor(Math.random() * 3);
  const out = new Set<string>();
  while (out.size < n) out.add(rand(TAGS));
  return [...out];
}
function phone(i: number) { return `+55 11 9${(10000 + i * 173).toString().slice(0, 4)}-${(1000 + i * 31).toString().slice(0, 4)}`; }
function daysAgo(d: number) { return new Date(Date.now() - d * 86400000).toISOString(); }

export async function seedDemoData(clinicId: string, userId: string): Promise<{ inserted: boolean }> {
  // Skip if already has data
  const { count } = await supabase
    .from("pacientes")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId);
  if ((count ?? 0) > 0) return { inserted: false };

  // Pacientes
  const pacientes = NOMES.map((name, i) => ({
    clinic_id: clinicId,
    name,
    phone: phone(i),
    email: `${name.toLowerCase().replace(/\s+/g, ".").normalize("NFD").replace(/[\u0300-\u036f]/g, "")}@exemplo.com`,
    status: (["lead", "ativo", "tratamento", "inativo", "recuperado"] as const)[i % 5],
    source: rand(SOURCES),
    ltv: Math.round(Math.random() * 8000),
    last_visit_at: daysAgo(Math.floor(Math.random() * 180)),
    next_action: rand(["Confirmar avaliação", "Enviar orçamento", "Lembrete 24h", "Pedir avaliação Google", "Reativação"]),
    tags: randTags(),
  }));

  const { data: insertedPatients, error: pErr } = await supabase
    .from("pacientes")
    .insert(pacientes)
    .select("id, name, phone");
  if (pErr) throw pErr;

  // Oportunidades (15) tied to first 15 patients
  const stages = ["novo", "contato", "agendada", "confirmada", "compareceu", "tratamento", "ativo"] as const;
  const oportunidades = (insertedPatients ?? []).slice(0, 15).map((p, i) => ({
    clinic_id: clinicId,
    patient_id: p.id,
    name: p.name,
    phone: p.phone,
    stage: stages[i % stages.length],
    source: rand(SOURCES),
    value: 500 + Math.round(Math.random() * 9500),
    owner_id: userId,
    next_action: rand(["Ligar amanhã", "Enviar orçamento", "Confirmar consulta", "Aguardar resposta"]),
    stage_changed_at: daysAgo(Math.floor(Math.random() * 10)),
  }));
  const { error: oErr } = await supabase.from("oportunidades").insert(oportunidades);
  if (oErr) throw oErr;

  // Atividades
  type Kind = "resposta" | "confirmacao" | "falha" | "avaliacao" | "cobranca_enviada" | "cobranca_respondida" | "pagamento_confirmado" | "pagamento_atrasado" | "cobranca_falhou" | "sistema";
  const atividades: Array<{ kind: Kind; title: string; detail?: string; value?: number }> = [
    { kind: "resposta", title: `${insertedPatients![0].name} respondeu no WhatsApp`, detail: "Confirmou interesse no orçamento" },
    { kind: "confirmacao", title: `${insertedPatients![1].name} confirmou consulta`, detail: "Avaliação amanhã 14h" },
    { kind: "pagamento_confirmado", title: `Pagamento confirmado · ${insertedPatients![2].name}`, value: 450 },
    { kind: "cobranca_enviada", title: `Cobrança enviada · ${insertedPatients![3].name}`, value: 1200 },
    { kind: "avaliacao", title: `${insertedPatients![4].name} avaliou 5 estrelas no Google` },
    { kind: "falha", title: `Falha no envio para ${insertedPatients![5].name}`, detail: "WhatsApp não entregue" },
    { kind: "pagamento_atrasado", title: `${insertedPatients![6].name} com cobrança vencida`, value: 800 },
    { kind: "cobranca_respondida", title: `${insertedPatients![7].name} respondeu sobre pagamento` },
    { kind: "sistema", title: "Automação 'Confirmação 24h' enviou 12 mensagens" },
    { kind: "resposta", title: `${insertedPatients![8].name} respondeu no WhatsApp` },
  ];
  const atividadesRows = atividades.map((a, i) => ({
    clinic_id: clinicId,
    kind: a.kind,
    title: a.title,
    detail: a.detail ?? null,
    value: a.value ?? null,
    patient_id: insertedPatients![i]?.id ?? null,
    created_at: daysAgo(Math.floor(i / 3)),
  }));
  await supabase.from("atividades").insert(atividadesRows);

  // Notificações
  type NKind = "conversa" | "oportunidade" | "cobranca" | "avaliacao" | "sistema" | "financeiro";
  const notificacoes = atividadesRows.slice(0, 6).map((a) => {
    const fin = a.kind === "pagamento_confirmado" || a.kind === "cobranca_enviada" || a.kind === "pagamento_atrasado" || a.kind === "cobranca_falhou";
    return {
      clinic_id: clinicId,
      user_id: userId,
      kind: (fin ? "financeiro" : "sistema") as NKind,
      title: a.title,
      detail: a.detail,
      patient_id: a.patient_id,
      value: a.value,
    };
  });
  await supabase.from("notificacoes").insert(notificacoes);

  return { inserted: true };
}

