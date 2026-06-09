// Status & strategy types
export type MigrationStatus =
  | "uploaded"
  | "parsing"
  | "parsed"
  | "mapped"
  | "validating"
  | "validated"
  | "importing"
  | "done"
  | "error";

export type MigrationJobStatus = MigrationStatus; // alias for compatibility

export type SourceType = "csv" | "xlsx" | "google_sheets";
export type DuplicateStrategy = "update" | "skip";

// Field mapping — TargetField is the canonical name; PatientField is an alias
export type TargetField =
  | "name"
  | "phone"
  | "email"
  | "status"
  | "last_visit_at"
  | "ltv"
  | "source"
  | "tags"
  | "ignore";

export type PatientField = TargetField; // alias for compatibility

export type PatientStatus = "ativo" | "tratamento" | "inativo" | "recuperado";

export interface ColumnMap {
  [header: string]: TargetField;
}

export interface StatusMap {
  [rawValue: string]: PatientStatus;
}

// Validation structures
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

// Migration job
export interface MigrationJob {
  id: string;
  clinic_id: string;
  source_type: SourceType;
  source_filename: string | null;
  source_url?: string | null;
  status: MigrationStatus;
  error_message?: string | null;
  total_rows: number | null;
  detected_headers?: string[] | null;
  column_map: Record<string, TargetField> | null;
  duplicate_strategy: DuplicateStrategy;
  validation_report: ValidationReport | null;
  progress_pct: number | null;
  imported_rows: number | null;
  skipped_rows: number | null;
  error_rows: number | null;
  created_by?: string;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

// Diagnostic snapshot — matches all fields returned by calculate_and_save_diagnostic RPC
export interface DiagnosticSnapshot {
  id: string;
  clinic_id: string;
  triggered_by: string;
  migration_job_id: string | null;
  snapshot_at: string;
  created_at: string;

  // Patients
  total_patients: number;
  active_patients: number;
  treatment_patients: number;
  inactive_patients: number;
  inactive_ltv_total: number;
  inactive_recovery_est: number;

  // Charges
  pending_charges_count: number;
  pending_charges_value: number;
  upcoming_value: number;
  overdue_recent_value: number;
  overdue_old_value: number;

  // Opportunities
  stalled_opps_count: number;
  stalled_opps_value: number;
  avg_days_stalled: number | null;

  // Reviews
  review_eligible_count: number;
  reviews_last_30d: number;
  current_avg_rating: number | null;

  // Score components (0–100)
  score_retention: number | null;
  score_adimplencia: number | null;
  score_funnel: number | null;
  score_reputation: number | null;
  score_engagement: number | null;

  // Totals
  health_score: number;
  total_recoverable: number;

  recommended_actions: Array<{
    priority: "urgente" | "esta_semana" | "este_mes";
    category: string;
    title: string;
    estimated_value: number;
  }>;
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
