import type { PatientField, PatientStatus } from "@/lib/types/migration";

const FIELD_TOKENS: Record<PatientField, string[]> = {
  name: ["nome", "paciente", "patient", "cliente", "nome paciente", "nome completo"],
  phone: [
    "telefone",
    "celular",
    "fone",
    "phone",
    "whatsapp",
    "tel",
    "cel",
    "contato",
    "numero",
    "mobile",
  ],
  email: ["email", "e-mail", "mail"],
  last_visit_at: [
    "ultima visita",
    "ultimo atendimento",
    "data visita",
    "last visit",
    "data ultima consulta",
  ],
  ltv: ["ltv", "valor total", "receita", "total gasto", "total pago", "faturamento"],
  status: ["status", "situacao", "situação", "estado"],
  source: ["origem", "source", "canal", "indicacao", "como conheceu"],
  tags: ["tags", "etiquetas", "especialidade", "procedimento", "observacoes"],
  ignore: [],
};

const STATUS_TOKENS: Record<PatientStatus, string[]> = {
  ativo: ["ativo", "active", "alta", "regular", "ok"],
  tratamento: ["tratamento", "em tratamento", "em andamento"],
  inativo: ["inativo", "inactive", "desistiu", "cancelou", "parou", "abandonou"],
  recuperado: ["recuperado", "reativado", "voltou", "retornou"],
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .trim();
}

export function autoMatchColumns(headers: string[]): Record<string, PatientField> {
  const result: Record<string, PatientField> = {};
  const usedFields = new Set<PatientField>();

  for (const header of headers) {
    const norm = normalize(header);
    let matched: PatientField = "ignore";
    for (const [field, tokens] of Object.entries(FIELD_TOKENS) as [PatientField, string[]][]) {
      if (field === "ignore") continue;
      if (usedFields.has(field)) continue;
      if (tokens.some((t) => norm.includes(normalize(t)))) {
        matched = field;
        usedFields.add(field);
        break;
      }
    }
    result[header] = matched;
  }
  return result;
}

export function autoMatchStatus(values: string[]): Record<string, PatientStatus | ""> {
  const result: Record<string, PatientStatus | ""> = {};
  for (const val of values) {
    const norm = normalize(val);
    let matched: PatientStatus | "" = "";
    for (const [status, tokens] of Object.entries(STATUS_TOKENS) as [PatientStatus, string[]][]) {
      if (tokens.some((t) => norm.includes(normalize(t)))) {
        matched = status;
        break;
      }
    }
    result[val] = matched;
  }
  return result;
}

export { FIELD_TOKENS, STATUS_TOKENS, normalize };
