export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      atividades: {
        Row: {
          clinic_id: string
          created_at: string
          detail: string | null
          id: string
          kind: Database["public"]["Enums"]["activity_kind"]
          patient_id: string | null
          title: string
          value: number | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          detail?: string | null
          id?: string
          kind: Database["public"]["Enums"]["activity_kind"]
          patient_id?: string | null
          title: string
          value?: number | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["activity_kind"]
          patient_id?: string | null
          title?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_diagnostics: {
        Row: {
          active_patients: number
          avg_days_stalled: number | null
          clinic_id: string
          created_at: string
          current_avg_rating: number | null
          health_score: number
          id: string
          inactive_ltv_total: number
          inactive_patients: number
          inactive_recovery_est: number
          migration_job_id: string | null
          overdue_old_value: number
          overdue_recent_value: number
          pending_charges_count: number
          pending_charges_value: number
          recommended_actions: Json
          review_eligible_count: number
          reviews_last_30d: number
          score_adimplencia: number | null
          score_engagement: number | null
          score_funnel: number | null
          score_reputation: number | null
          score_retention: number | null
          snapshot_at: string
          stalled_opps_count: number
          stalled_opps_value: number
          total_patients: number
          total_recoverable: number
          treatment_patients: number
          triggered_by: string
          upcoming_value: number
        }
        Insert: {
          active_patients?: number
          avg_days_stalled?: number | null
          clinic_id: string
          created_at?: string
          current_avg_rating?: number | null
          health_score?: number
          id?: string
          inactive_ltv_total?: number
          inactive_patients?: number
          inactive_recovery_est?: number
          migration_job_id?: string | null
          overdue_old_value?: number
          overdue_recent_value?: number
          pending_charges_count?: number
          pending_charges_value?: number
          recommended_actions?: Json
          review_eligible_count?: number
          reviews_last_30d?: number
          score_adimplencia?: number | null
          score_engagement?: number | null
          score_funnel?: number | null
          score_reputation?: number | null
          score_retention?: number | null
          snapshot_at?: string
          stalled_opps_count?: number
          stalled_opps_value?: number
          total_patients?: number
          total_recoverable?: number
          treatment_patients?: number
          triggered_by: string
          upcoming_value?: number
        }
        Update: {
          active_patients?: number
          avg_days_stalled?: number | null
          clinic_id?: string
          created_at?: string
          current_avg_rating?: number | null
          health_score?: number
          id?: string
          inactive_ltv_total?: number
          inactive_patients?: number
          inactive_recovery_est?: number
          migration_job_id?: string | null
          overdue_old_value?: number
          overdue_recent_value?: number
          pending_charges_count?: number
          pending_charges_value?: number
          recommended_actions?: Json
          review_eligible_count?: number
          reviews_last_30d?: number
          score_adimplencia?: number | null
          score_engagement?: number | null
          score_funnel?: number | null
          score_reputation?: number | null
          score_retention?: number | null
          snapshot_at?: string
          stalled_opps_count?: number
          stalled_opps_value?: number
          total_patients?: number
          total_recoverable?: number
          treatment_patients?: number
          triggered_by?: string
          upcoming_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinic_diagnostics_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_diagnostics_migration_job_id_fkey"
            columns: ["migration_job_id"]
            isOneToOne: false
            referencedRelation: "migration_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicas: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          onboarded: boolean
          phone: string | null
          slug: string | null
          specialties: string[] | null
          timezone: string | null
          tone: Database["public"]["Enums"]["clinic_tone"] | null
          updated_at: string
          whatsapp_instance: string | null
          whatsapp_phone: string | null
          whatsapp_provider: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          onboarded?: boolean
          phone?: string | null
          slug?: string | null
          specialties?: string[] | null
          timezone?: string | null
          tone?: Database["public"]["Enums"]["clinic_tone"] | null
          updated_at?: string
          whatsapp_instance?: string | null
          whatsapp_phone?: string | null
          whatsapp_provider?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          onboarded?: boolean
          phone?: string | null
          slug?: string | null
          specialties?: string[] | null
          timezone?: string | null
          tone?: Database["public"]["Enums"]["clinic_tone"] | null
          updated_at?: string
          whatsapp_instance?: string | null
          whatsapp_phone?: string | null
          whatsapp_provider?: string | null
        }
        Relationships: []
      }
      migration_job_rows: {
        Row: {
          clinic_id: string
          created_at: string
          error_field: string | null
          error_message: string | null
          id: string
          job_id: string
          normalized: Json | null
          patient_id: string | null
          raw_data: Json
          row_number: number
          status: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          error_field?: string | null
          error_message?: string | null
          id?: string
          job_id: string
          normalized?: Json | null
          patient_id?: string | null
          raw_data: Json
          row_number: number
          status: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          error_field?: string | null
          error_message?: string | null
          id?: string
          job_id?: string
          normalized?: Json | null
          patient_id?: string | null
          raw_data?: Json
          row_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_job_rows_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_job_rows_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "migration_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_job_rows_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_jobs: {
        Row: {
          clinic_id: string
          column_map: Json | null
          completed_at: string | null
          created_at: string
          created_by: string
          detected_headers: string[] | null
          duplicate_strategy: string | null
          error_message: string | null
          error_rows: number | null
          id: string
          imported_rows: number | null
          preview_data: Json | null
          progress_pct: number | null
          skipped_rows: number | null
          source_filename: string | null
          source_type: string
          source_url: string | null
          started_at: string | null
          status: string
          total_rows: number | null
          updated_at: string
          validation_report: Json | null
        }
        Insert: {
          clinic_id: string
          column_map?: Json | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          detected_headers?: string[] | null
          duplicate_strategy?: string | null
          error_message?: string | null
          error_rows?: number | null
          id?: string
          imported_rows?: number | null
          preview_data?: Json | null
          progress_pct?: number | null
          skipped_rows?: number | null
          source_filename?: string | null
          source_type: string
          source_url?: string | null
          started_at?: string | null
          status?: string
          total_rows?: number | null
          updated_at?: string
          validation_report?: Json | null
        }
        Update: {
          clinic_id?: string
          column_map?: Json | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          detected_headers?: string[] | null
          duplicate_strategy?: string | null
          error_message?: string | null
          error_rows?: number | null
          id?: string
          imported_rows?: number | null
          preview_data?: Json | null
          progress_pct?: number | null
          skipped_rows?: number | null
          source_filename?: string | null
          source_type?: string
          source_url?: string | null
          started_at?: string | null
          status?: string
          total_rows?: number | null
          updated_at?: string
          validation_report?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "migration_jobs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          action_url: string | null
          category: string | null
          clinic_id: string
          created_at: string
          detail: string | null
          id: string
          kind: Database["public"]["Enums"]["notif_kind"]
          patient_id: string | null
          read: boolean
          read_at: string | null
          title: string
          user_id: string | null
          value: number | null
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          clinic_id: string
          created_at?: string
          detail?: string | null
          id?: string
          kind: Database["public"]["Enums"]["notif_kind"]
          patient_id?: string | null
          read?: boolean
          read_at?: string | null
          title: string
          user_id?: string | null
          value?: number | null
        }
        Update: {
          action_url?: string | null
          category?: string | null
          clinic_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notif_kind"]
          patient_id?: string | null
          read?: boolean
          read_at?: string | null
          title?: string
          user_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      oportunidades: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          lost_at: string | null
          lost_reason: string | null
          name: string
          next_action: string | null
          owner_id: string | null
          patient_id: string | null
          phone: string | null
          source: string | null
          stage: Database["public"]["Enums"]["opportunity_stage"]
          stage_changed_at: string
          treatment_value_remaining: number | null
          updated_at: string
          value: number | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          name: string
          next_action?: string | null
          owner_id?: string | null
          patient_id?: string | null
          phone?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          stage_changed_at?: string
          treatment_value_remaining?: number | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          name?: string
          next_action?: string | null
          owner_id?: string | null
          patient_id?: string | null
          phone?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          stage_changed_at?: string
          treatment_value_remaining?: number | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          clinic_id: string
          created_at: string
          email: string | null
          id: string
          imported_at: string | null
          imported_from_job: string | null
          last_visit_at: string | null
          ltv: number
          name: string
          next_action: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["patient_status"]
          tags: string[] | null
          updated_at: string
          visit_count: number | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email?: string | null
          id?: string
          imported_at?: string | null
          imported_from_job?: string | null
          last_visit_at?: string | null
          ltv?: number
          name: string
          next_action?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          tags?: string[] | null
          updated_at?: string
          visit_count?: number | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string | null
          id?: string
          imported_at?: string | null
          imported_from_job?: string | null
          last_visit_at?: string | null
          ltv?: number
          name?: string
          next_action?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          tags?: string[] | null
          updated_at?: string
          visit_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pacientes_imported_from_job_fkey"
            columns: ["imported_from_job"]
            isOneToOne: false
            referencedRelation: "migration_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          clinic_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          clinic_id?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          clinic_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          clinic_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_and_save_diagnostic: {
        Args: { p_clinic_id: string; p_job_id?: string; p_triggered_by: string }
        Returns: {
          active_patients: number
          avg_days_stalled: number | null
          clinic_id: string
          created_at: string
          current_avg_rating: number | null
          health_score: number
          id: string
          inactive_ltv_total: number
          inactive_patients: number
          inactive_recovery_est: number
          migration_job_id: string | null
          overdue_old_value: number
          overdue_recent_value: number
          pending_charges_count: number
          pending_charges_value: number
          recommended_actions: Json
          review_eligible_count: number
          reviews_last_30d: number
          score_adimplencia: number | null
          score_engagement: number | null
          score_funnel: number | null
          score_reputation: number | null
          score_retention: number | null
          snapshot_at: string
          stalled_opps_count: number
          stalled_opps_value: number
          total_patients: number
          total_recoverable: number
          treatment_patients: number
          triggered_by: string
          upcoming_value: number
        }
        SetofOptions: {
          from: "*"
          to: "clinic_diagnostics"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_clinic_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_kind:
        | "resposta"
        | "confirmacao"
        | "falha"
        | "avaliacao"
        | "cobranca_enviada"
        | "cobranca_respondida"
        | "pagamento_confirmado"
        | "pagamento_atrasado"
        | "cobranca_falhou"
        | "sistema"
      app_role: "admin" | "recepcao" | "dentista" | "marketing"
      clinic_tone: "acolhedora" | "institucional" | "descontraida"
      notif_kind:
        | "conversa"
        | "oportunidade"
        | "cobranca"
        | "avaliacao"
        | "sistema"
        | "financeiro"
      opportunity_stage:
        | "novo"
        | "contato"
        | "agendada"
        | "confirmada"
        | "compareceu"
        | "tratamento"
        | "ativo"
        | "perdida"
      patient_status: "ativo" | "tratamento" | "inativo" | "recuperado" | "lead"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_kind: [
        "resposta",
        "confirmacao",
        "falha",
        "avaliacao",
        "cobranca_enviada",
        "cobranca_respondida",
        "pagamento_confirmado",
        "pagamento_atrasado",
        "cobranca_falhou",
        "sistema",
      ],
      app_role: ["admin", "recepcao", "dentista", "marketing"],
      clinic_tone: ["acolhedora", "institucional", "descontraida"],
      notif_kind: [
        "conversa",
        "oportunidade",
        "cobranca",
        "avaliacao",
        "sistema",
        "financeiro",
      ],
      opportunity_stage: [
        "novo",
        "contato",
        "agendada",
        "confirmada",
        "compareceu",
        "tratamento",
        "ativo",
        "perdida",
      ],
      patient_status: ["ativo", "tratamento", "inativo", "recuperado", "lead"],
    },
  },
} as const
