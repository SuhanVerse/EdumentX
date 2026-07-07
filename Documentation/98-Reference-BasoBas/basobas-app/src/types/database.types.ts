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
          clerk_id: string
          document_type: string
          electricity_bill_path: string | null
          front_image_path: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
        }
        Insert: {
          attempt_number?: number
          back_image_path: string
          clerk_id: string
          document_type: string
          electricity_bill_path?: string | null
          front_image_path: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
        }
        Update: {
          attempt_number?: number
          back_image_path?: string
          clerk_id?: string
          document_type?: string
          electricity_bill_path?: string | null
          front_image_path?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_submissions_clerk_id_fkey"
            columns: ["clerk_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["clerk_id"]
          },
        ]
      }
      landlord_profiles: {
        Row: {
          avg_rating: number
          clerk_id: string
          created_at: string
          is_phone_shared_default: boolean
          total_reviews: number
          updated_at: string
          verification_reject_reason: string | null
          verification_reviewed_at: string | null
          verification_status: string
          verification_submitted_at: string | null
        }
        Insert: {
          avg_rating?: number
          clerk_id: string
          created_at?: string
          is_phone_shared_default?: boolean
          total_reviews?: number
          updated_at?: string
          verification_reject_reason?: string | null
          verification_reviewed_at?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
        }
        Update: {
          avg_rating?: number
          clerk_id?: string
          created_at?: string
          is_phone_shared_default?: boolean
          total_reviews?: number
          updated_at?: string
          verification_reject_reason?: string | null
          verification_reviewed_at?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landlord_profiles_clerk_id_fkey"
            columns: ["clerk_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["clerk_id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_role: string | null
          avatar_path: string | null
          avatar_url: string | null
          city: string | null
          clerk_id: string
          created_at: string
          full_name: string | null
          onboarding_complete: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          active_role?: string | null
          avatar_path?: string | null
          avatar_url?: string | null
          city?: string | null
          clerk_id: string
          created_at?: string
          full_name?: string | null
          onboarding_complete?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active_role?: string | null
          avatar_path?: string | null
          avatar_url?: string | null
          city?: string | null
          clerk_id?: string
          created_at?: string
          full_name?: string | null
          onboarding_complete?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          clerk_id: string
          property_types: string[]
          updated_at: string
        }
        Insert: {
          clerk_id: string
          property_types?: string[]
          updated_at?: string
        }
        Update: {
          clerk_id?: string
          property_types?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_clerk_id_fkey"
            columns: ["clerk_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["clerk_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          clerk_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          clerk_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          clerk_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_clerk_id_fkey"
            columns: ["clerk_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["clerk_id"]
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
              p_clerk_id: string
              p_full_name: string
              p_has_landlord_role: boolean
              p_kyc_submission_id?: string
              p_phone: string
              p_property_types: string[]
              p_roles: string[]
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
          p_clerk_id: string
          p_document_type: string
          p_electricity_bill_path?: string | null
          p_front_image_path: string
        }
        Returns: {
          attempt_number: number
          back_image_path: string
          clerk_id: string
          document_type: string
          electricity_bill_path: string | null
          front_image_path: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
        }
        SetofOptions: {
          from: "*"
          to: "kyc_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      requesting_user_id: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
