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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      kyc_submissions: {
        Row: {
          attempt_number: number
          back_image_path: string
          document_type: Database["public"]["Enums"]["document_type_type"]
          front_image_path: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["kyc_status_type"]
          submitted_at: string
          user_id: string
        }
        Insert: {
          attempt_number?: number
          back_image_path: string
          document_type: Database["public"]["Enums"]["document_type_type"]
          front_image_path: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status_type"]
          submitted_at?: string
          user_id: string
        }
        Update: {
          attempt_number?: number
          back_image_path?: string
          document_type?: Database["public"]["Enums"]["document_type_type"]
          front_image_path?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status_type"]
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      landlord_profiles: {
        Row: {
          avg_rating: number
          created_at: string
          is_phone_shared_default: boolean
          total_reviews: number
          updated_at: string
          user_id: string
          verification_reject_reason: string | null
          verification_reviewed_at: string | null
          verification_status: Database["public"]["Enums"]["verification_status_type"]
          verification_submitted_at: string | null
        }
        Insert: {
          avg_rating?: number
          created_at?: string
          is_phone_shared_default?: boolean
          total_reviews?: number
          updated_at?: string
          user_id: string
          verification_reject_reason?: string | null
          verification_reviewed_at?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status_type"]
          verification_submitted_at?: string | null
        }
        Update: {
          avg_rating?: number
          created_at?: string
          is_phone_shared_default?: boolean
          total_reviews?: number
          updated_at?: string
          user_id?: string
          verification_reject_reason?: string | null
          verification_reviewed_at?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status_type"]
          verification_submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landlord_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_role: Database["public"]["Enums"]["user_role_type"] | null
          avatar_path: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarding_complete: boolean
          phone: string
          updated_at: string
        }
        Insert: {
          active_role?: Database["public"]["Enums"]["user_role_type"] | null
          avatar_path?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_complete?: boolean
          phone: string
          updated_at?: string
        }
        Update: {
          active_role?: Database["public"]["Enums"]["user_role_type"] | null
          avatar_path?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_complete?: boolean
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          property_types: Database["public"]["Enums"]["property_type_enum"][]
          updated_at: string
          user_id: string
        }
        Insert: {
          property_types?: Database["public"]["Enums"]["property_type_enum"][]
          updated_at?: string
          user_id: string
        }
        Update: {
          property_types?: Database["public"]["Enums"]["property_type_enum"][]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_onboarding:
        | {
            Args: {
              p_avatar_path?: string
              p_avatar_url?: string
              p_city: string
              p_full_name: string
              p_has_landlord_role: boolean
              p_kyc_submission_id?: string
              p_property_types: string[]
              p_roles: string[]
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_city: string
              p_full_name: string
              p_has_landlord_role: boolean
              p_kyc_submission_id?: string
              p_property_types: Database["public"]["Enums"]["property_type_enum"][]
              p_roles: Database["public"]["Enums"]["user_role_type"][]
              p_user_id: string
            }
            Returns: Json
          }
      get_next_kyc_attempt: { Args: { p_user_id: string }; Returns: number }
      insert_kyc_submission: {
        Args: {
          p_back_image_path: string
          p_document_type: string
          p_front_image_path: string
          p_user_id: string
        }
        Returns: {
          attempt_number: number
          back_image_path: string
          document_type: Database["public"]["Enums"]["document_type_type"]
          front_image_path: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["kyc_status_type"]
          submitted_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "kyc_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      upsert_profile_on_auth: {
        Args: { p_phone: string; p_user_id: string }
        Returns: {
          active_role: Database["public"]["Enums"]["user_role_type"] | null
          avatar_path: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarding_complete: boolean
          phone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      document_type_type: "CITIZENSHIP" | "NATIONAL_ID"
      kyc_status_type: "UNDER_REVIEW" | "VERIFIED" | "REJECTED"
      property_type_enum: "ROOM" | "APARTMENT" | "HOUSE" | "OFFICE" | "FLAT"
      user_role_type: "tenant" | "landlord"
      verification_status_type:
        | "UNVERIFIED"
        | "UNDER_REVIEW"
        | "VERIFIED"
        | "REJECTED"
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

// ─── Convenience type aliases ──────────────────────────────────────────────
export type Profile        = Tables<'profiles'>
export type ProfileInsert  = TablesInsert<'profiles'>
export type ProfileUpdate  = TablesUpdate<'profiles'>
export type KYCSubmission   = Tables<'kyc_submissions'>
export type UserRole        = Enums<'user_role_type'>
export type DocumentType    = Enums<'document_type_type'>

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      document_type_type: ["CITIZENSHIP", "NATIONAL_ID"],
      kyc_status_type: ["UNDER_REVIEW", "VERIFIED", "REJECTED"],
      property_type_enum: ["ROOM", "APARTMENT", "HOUSE", "OFFICE", "FLAT"],
      user_role_type: ["tenant", "landlord"],
      verification_status_type: [
        "UNVERIFIED",
        "UNDER_REVIEW",
        "VERIFIED",
        "REJECTED",
      ],
    },
  },
} as const
