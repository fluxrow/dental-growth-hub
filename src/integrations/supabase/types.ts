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
          lost_reason: string | null
          name: string
          next_action: string | null
          owner_id: string | null
          patient_id: string | null
          phone: string | null
          source: string | null
          stage: Database["public"]["Enums"]["opportunity_stage"]
          stage_changed_at: string
          updated_at: string
          value: number | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          lost_reason?: string | null
          name: string
          next_action?: string | null
          owner_id?: string | null
          patient_id?: string | null
          phone?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          stage_changed_at?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          lost_reason?: string | null
          name?: string
          next_action?: string | null
          owner_id?: string | null
          patient_id?: string | null
          phone?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          stage_changed_at?: string
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
          last_visit_at: string | null
          ltv: number
          name: string
          next_action: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["patient_status"]
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email?: string | null
          id?: string
          last_visit_at?: string | null
          ltv?: number
          name: string
          next_action?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string | null
          id?: string
          last_visit_at?: string | null
          ltv?: number
          name?: string
          next_action?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
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
