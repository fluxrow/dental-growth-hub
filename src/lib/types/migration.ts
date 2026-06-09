export type MigrationJobStatus =
  | 'uploaded' | 'parsing' | 'parsed' | 'mapped'
  | 'validating' | 'validated' | 'importing' | 'done' | 'error'

export type SourceType = 'csv' | 'xlsx' | 'google_sheets'
export type DuplicateStrategy = 'update' | 'skip'
export type PatientField = 'name' | 'phone' | 'email' | 'status' | 'last_visit_at' | 'ltv' | 'source' | 'tags' | 'ignore'
export type PatientStatus = 'ativo' | 'tratamento' | 'inativo' | 'recuperado'

export interface ColumnMapEntry {
  sourceCol: string
  targetField: PatientField
  confidence: 'high' | 'medium' | 'low'
}

export interface ValidationError {
  row: number
  field: string
  value: string
  reason: string
}

export interface ValidationWarning {
  row: number
  field: string
  value: string
  suggestion: string
}

export interface DuplicateRow {
  row: number
  existingPatientId: string
  phone: string
}

export interface ValidationReport {
  total: number
  valid: number
  warnings: number
  duplicates: number
  errors: number
  errorRows: ValidationError[]
  warningRows: ValidationWarning[]
  duplicateRows: DuplicateRow[]
}

export interface MigrationJob {
  id: string
  clinic_id: string
  source_type: SourceType
  source_filename: string | null
  source_url: string | null
  status: MigrationJobStatus
  error_message: string | null
  total_rows: number | null
  detected_headers: string[] | null
  column_map: Record<string, PatientField> | null
  duplicate_strategy: DuplicateStrategy
  validation_report: ValidationReport | null
  progress_pct: number
  imported_rows: number
  skipped_rows: number
  error_rows: number
  created_by: string
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface DiagnosticSnapshot {
  id: string
  clinic_id: string
  triggered_by: 'migration' | 'manual' | 'cron'
  total_patients: number
  active_patients: number
  inactive_patients: number
  treatment_patients: number
  inactive_recovery_est: number
  stalled_opps_count: number
  stalled_opps_value: number
  health_score: number
  score_retention: number
  score_adimplencia: number
  score_funnel: number
  score_reputation: number
  score_engagement: number
  total_recoverable: number
  recommended_actions: Array<{
    priority: 'urgente' | 'esta_semana' | 'este_mes'
    category: string
    title: string
    estimated_value: number
  }>
  snapshot_at: string
}
