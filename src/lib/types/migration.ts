export type MigrationStatus =
  | "uploaded" | "parsing" | "parsed" | "mapped"
  | "validating" | "validated" | "importing" | "done" | "error";

export type DuplicateStrategy = "update" | "skip";

export type TargetField =
  | "name" | "phone" | "email" | "status"
  | "last_visit_at" | "ltv" | "source" | "tags" | "ignore";

export type PatientStatus = "ativo" | "tratamento" | "inativo" | "recuperado";

export interface ColumnMap {
  [header: string]: TargetField;
}

export interface StatusMap {
  [rawValue: string]: PatientStatus;
}

export interface ValidationReport {
  total: number;
  valid: number;
  warnings: number;
  duplicates: number;
  errors: number;
  errorRows: Array<{ row: number; field: string; value: string; reason: string }>;
  warningRows: Array<{ row: number; field: string; value: string; suggestion: string }>;
  duplicateRows: Array<{ row: number; existingPatientId: string; phone: string }>;
}

export interface NormalizedRow {
  rowNumber: number;
  status: "valid" | "warning" | "duplicate" | "error";
  data: {
    name?: string;
    phone?: string;
    email?: string | null;
    status?: PatientStatus;
    last_visit_at?: string | null;
    ltv?: number;
    source?: string | null;
    tags?: string[] | null;
  };
  warnings: string[];
  error?: { field: string; reason: string };
  duplicateOf?: string;
  raw: Record<string, unknown>;
}

export interface MigrationJob {
  id: string;
  clinic_id: string;
  source_type: "csv" | "xlsx" | "google_sheets";
  source_filename: string | null;
  status: MigrationStatus;
  total_rows: number | null;
  imported_rows: number | null;
  skipped_rows: number | null;
  error_rows: number | null;
  progress_pct: number | null;
  created_at: string;
}

export interface DiagnosticSnapshot {
  id: string;
  total_recoverable: number;
  health_score: number;
  inactive_patients: number;
  inactive_recovery_est: number;
  stalled_opps_count: number;
  stalled_opps_value: number;
  pending_charges_value: number;
  recommended_actions: unknown;
}

export const FIELD_LABELS: Record<TargetField, string> = {
  name: "Nome *",
  phone: "Telefone *",
  email: "Email",
  status: "Status",
  last_visit_at: "Última visita",
  ltv: "LTV (valor)",
  source: "Origem",
  tags: "Tags",
  ignore: "Ignorar",
};
