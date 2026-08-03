export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      kyc_pipeline_events: {
        Row: {
          created_at: string;
          duration_ms: number | null;
          id: string;
          message: string | null;
          metadata: Json | null;
          score: number | null;
          stage: string;
          status: string;
          submission_id: string;
        };
        Insert: {
          created_at?: string;
          duration_ms?: number | null;
          id?: string;
          message?: string | null;
          metadata?: Json | null;
          score?: number | null;
          stage: string;
          status: string;
          submission_id: string;
        };
        Update: {
          created_at?: string;
          duration_ms?: number | null;
          id?: string;
          message?: string | null;
          metadata?: Json | null;
          score?: number | null;
          stage?: string;
          status?: string;
          submission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'kyc_pipeline_events_submission_id_fkey';
            columns: ['submission_id'];
            isOneToOne: false;
            referencedRelation: 'kyc_submissions';
            referencedColumns: ['id'];
          },
        ];
      };
      kyc_submissions: {
        Row: {
          address_consistency_score: number | null;
          ai_confidence: number | null;
          ai_extracted_dob: string | null;
          ai_extracted_doc_no: string | null;
          ai_extracted_name: string | null;
          ai_face_match_score: number | null;
          ai_flag_reason: string | null;
          ai_name_match_score: number | null;
          ai_processing_log: Json | null;
          ai_tamper_score: number | null;
          attempt_number: number;
          back_image_path: string;
          clerk_id: string;
          decision_reason: string | null;
          document_type: string;
          electricity_bill_path: string | null;
          expected_outcome: string | null;
          extracted_bill_account_name: string | null;
          extracted_bill_address: string | null;
          extracted_bill_date: string | null;
          extracted_dob: string | null;
          extracted_doc_number: string | null;
          extracted_full_name: string | null;
          extracted_issue_date: string | null;
          extracted_issuer: string | null;
          face_match_score: number | null;
          face_match_status: string | null;
          front_image_path: string;
          id: string;
          id_bill_match_score: number | null;
          overall_score: number | null;
          pipeline_completed_at: string | null;
          pipeline_duration_ms: number | null;
          pipeline_started_at: string | null;
          profile_id_match_score: number | null;
          quality_issues: Json | null;
          quality_score: number | null;
          quality_status: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          selfie_image_path: string | null;
          simulated_stages: string[] | null;
          status: string;
          submitted_at: string;
          tamper_notes: string | null;
          tamper_score: number | null;
          tamper_status: string | null;
          utility_bill_back_path: string | null;
          utility_bill_front_path: string | null;
          utility_bill_type: string | null;
          verification_type: string | null;
        };
        Insert: {
          address_consistency_score?: number | null;
          ai_confidence?: number | null;
          ai_extracted_dob?: string | null;
          ai_extracted_doc_no?: string | null;
          ai_extracted_name?: string | null;
          ai_face_match_score?: number | null;
          ai_flag_reason?: string | null;
          ai_name_match_score?: number | null;
          ai_processing_log?: Json | null;
          ai_tamper_score?: number | null;
          attempt_number?: number;
          back_image_path: string;
          clerk_id: string;
          decision_reason?: string | null;
          document_type: string;
          electricity_bill_path?: string | null;
          expected_outcome?: string | null;
          extracted_bill_account_name?: string | null;
          extracted_bill_address?: string | null;
          extracted_bill_date?: string | null;
          extracted_dob?: string | null;
          extracted_doc_number?: string | null;
          extracted_full_name?: string | null;
          extracted_issue_date?: string | null;
          extracted_issuer?: string | null;
          face_match_score?: number | null;
          face_match_status?: string | null;
          front_image_path: string;
          id?: string;
          id_bill_match_score?: number | null;
          overall_score?: number | null;
          pipeline_completed_at?: string | null;
          pipeline_duration_ms?: number | null;
          pipeline_started_at?: string | null;
          profile_id_match_score?: number | null;
          quality_issues?: Json | null;
          quality_score?: number | null;
          quality_status?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          selfie_image_path?: string | null;
          simulated_stages?: string[] | null;
          status?: string;
          submitted_at?: string;
          tamper_notes?: string | null;
          tamper_score?: number | null;
          tamper_status?: string | null;
          utility_bill_back_path?: string | null;
          utility_bill_front_path?: string | null;
          utility_bill_type?: string | null;
          verification_type?: string | null;
        };
        Update: {
          address_consistency_score?: number | null;
          ai_confidence?: number | null;
          ai_extracted_dob?: string | null;
          ai_extracted_doc_no?: string | null;
          ai_extracted_name?: string | null;
          ai_face_match_score?: number | null;
          ai_flag_reason?: string | null;
          ai_name_match_score?: number | null;
          ai_processing_log?: Json | null;
          ai_tamper_score?: number | null;
          attempt_number?: number;
          back_image_path?: string;
          clerk_id?: string;
          decision_reason?: string | null;
          document_type?: string;
          electricity_bill_path?: string | null;
          expected_outcome?: string | null;
          extracted_bill_account_name?: string | null;
          extracted_bill_address?: string | null;
          extracted_bill_date?: string | null;
          extracted_dob?: string | null;
          extracted_doc_number?: string | null;
          extracted_full_name?: string | null;
          extracted_issue_date?: string | null;
          extracted_issuer?: string | null;
          face_match_score?: number | null;
          face_match_status?: string | null;
          front_image_path?: string;
          id?: string;
          id_bill_match_score?: number | null;
          overall_score?: number | null;
          pipeline_completed_at?: string | null;
          pipeline_duration_ms?: number | null;
          pipeline_started_at?: string | null;
          profile_id_match_score?: number | null;
          quality_issues?: Json | null;
          quality_score?: number | null;
          quality_status?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          selfie_image_path?: string | null;
          simulated_stages?: string[] | null;
          status?: string;
          submitted_at?: string;
          tamper_notes?: string | null;
          tamper_score?: number | null;
          tamper_status?: string | null;
          utility_bill_back_path?: string | null;
          utility_bill_front_path?: string | null;
          utility_bill_type?: string | null;
          verification_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'kyc_submissions_clerk_id_fkey';
            columns: ['clerk_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['clerk_id'];
          },
        ];
      };
      landlord_profiles: {
        Row: {
          avg_rating: number;
          clerk_id: string;
          created_at: string;
          is_phone_shared_default: boolean;
          total_reviews: number;
          updated_at: string;
          verification_reject_reason: string | null;
          verification_reviewed_at: string | null;
          verification_status: string;
          verification_submitted_at: string | null;
        };
        Insert: {
          avg_rating?: number;
          clerk_id: string;
          created_at?: string;
          is_phone_shared_default?: boolean;
          total_reviews?: number;
          updated_at?: string;
          verification_reject_reason?: string | null;
          verification_reviewed_at?: string | null;
          verification_status?: string;
          verification_submitted_at?: string | null;
        };
        Update: {
          avg_rating?: number;
          clerk_id?: string;
          created_at?: string;
          is_phone_shared_default?: boolean;
          total_reviews?: number;
          updated_at?: string;
          verification_reject_reason?: string | null;
          verification_reviewed_at?: string | null;
          verification_status?: string;
          verification_submitted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'landlord_profiles_clerk_id_fkey';
            columns: ['clerk_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['clerk_id'];
          },
        ];
      };
      products: {
        Row: {
          active: boolean;
          duration_months: number;
          id: string;
          name: string;
          price: number;
        };
        Insert: {
          active?: boolean;
          duration_months: number;
          id: string;
          name: string;
          price: number;
        };
        Update: {
          active?: boolean;
          duration_months?: number;
          id?: string;
          name?: string;
          price?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          active_role: string | null;
          avatar_path: string | null;
          avatar_url: string | null;
          city: string | null;
          clerk_id: string;
          created_at: string;
          full_name: string | null;
          onboarding_complete: boolean;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          active_role?: string | null;
          avatar_path?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          clerk_id: string;
          created_at?: string;
          full_name?: string | null;
          onboarding_complete?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          active_role?: string | null;
          avatar_path?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          clerk_id?: string;
          created_at?: string;
          full_name?: string | null;
          onboarding_complete?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          amenities: Json;
          area_sqft: number | null;
          available_from: string;
          bathrooms: number | null;
          bedrooms: number | null;
          created_at: string;
          deposit: number | null;
          description: string | null;
          extra_details: Json;
          floor: number | null;
          furnishing: string | null;
          id: string;
          is_deleted: boolean;
          is_draft: boolean;
          is_paused: boolean;
          landlord_id: string;
          linked_occupant_id: string | null;
          location_address: string | null;
          location_area: string;
          location_lat: number | null;
          location_lng: number | null;
          photo_urls: string[];
          price: number;
          property_type: Database['public']['Enums']['property_type_enum'];
          status: Database['public']['Enums']['property_status_enum'];
          title: string;
          total_floors: number | null;
          updated_at: string;
          views: number;
        };
        Insert: {
          amenities?: Json;
          area_sqft?: number | null;
          available_from: string;
          bathrooms?: number | null;
          bedrooms?: number | null;
          created_at?: string;
          deposit?: number | null;
          description?: string | null;
          extra_details?: Json;
          floor?: number | null;
          furnishing?: string | null;
          id?: string;
          is_deleted?: boolean;
          is_draft?: boolean;
          is_paused?: boolean;
          landlord_id: string;
          linked_occupant_id?: string | null;
          location_address?: string | null;
          location_area: string;
          location_lat?: number | null;
          location_lng?: number | null;
          photo_urls?: string[];
          price: number;
          property_type: Database['public']['Enums']['property_type_enum'];
          status?: Database['public']['Enums']['property_status_enum'];
          title: string;
          total_floors?: number | null;
          updated_at?: string;
          views?: number;
        };
        Update: {
          amenities?: Json;
          area_sqft?: number | null;
          available_from?: string;
          bathrooms?: number | null;
          bedrooms?: number | null;
          created_at?: string;
          deposit?: number | null;
          description?: string | null;
          extra_details?: Json;
          floor?: number | null;
          furnishing?: string | null;
          id?: string;
          is_deleted?: boolean;
          is_draft?: boolean;
          is_paused?: boolean;
          landlord_id?: string;
          linked_occupant_id?: string | null;
          location_address?: string | null;
          location_area?: string;
          location_lat?: number | null;
          location_lng?: number | null;
          photo_urls?: string[];
          price?: number;
          property_type?: Database['public']['Enums']['property_type_enum'];
          status?: Database['public']['Enums']['property_status_enum'];
          title?: string;
          total_floors?: number | null;
          updated_at?: string;
          views?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'properties_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['clerk_id'];
          },
          {
            foreignKeyName: 'properties_linked_occupant_id_fkey';
            columns: ['linked_occupant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['clerk_id'];
          },
        ];
      };
      saved_properties: {
        Row: {
          clerk_id: string;
          created_at: string;
          id: string;
          property_id: string;
        };
        Insert: {
          clerk_id: string;
          created_at?: string;
          id?: string;
          property_id: string;
        };
        Update: {
          clerk_id?: string;
          created_at?: string;
          id?: string;
          property_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'saved_properties_clerk_id_fkey';
            columns: ['clerk_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['clerk_id'];
          },
          {
            foreignKeyName: 'saved_properties_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      transactions: {
        Row: {
          amount: number;
          clerk_id: string;
          created_at: string;
          esewa_ref_id: string | null;
          id: string;
          product_id: string;
          raw_callback: Json | null;
          status: string;
          tax_amount: number;
          total_amount: number;
          transaction_uuid: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          clerk_id: string;
          created_at?: string;
          esewa_ref_id?: string | null;
          id?: string;
          product_id: string;
          raw_callback?: Json | null;
          status?: string;
          tax_amount?: number;
          total_amount: number;
          transaction_uuid: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          clerk_id?: string;
          created_at?: string;
          esewa_ref_id?: string | null;
          id?: string;
          product_id?: string;
          raw_callback?: Json | null;
          status?: string;
          tax_amount?: number;
          total_amount?: number;
          transaction_uuid?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      user_passes: {
        Row: {
          clerk_id: string;
          created_at: string;
          expires_at: string;
          id: string;
          product_id: string;
          starts_at: string;
          status: string;
          transaction_id: string;
        };
        Insert: {
          clerk_id: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          product_id: string;
          starts_at?: string;
          status?: string;
          transaction_id: string;
        };
        Update: {
          clerk_id?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          product_id?: string;
          starts_at?: string;
          status?: string;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_passes_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_passes_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      user_preferences: {
        Row: {
          clerk_id: string;
          property_types: string[];
          updated_at: string;
        };
        Insert: {
          clerk_id: string;
          property_types?: string[];
          updated_at?: string;
        };
        Update: {
          clerk_id?: string;
          property_types?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_preferences_clerk_id_fkey';
            columns: ['clerk_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['clerk_id'];
          },
        ];
      };
      user_roles: {
        Row: {
          clerk_id: string;
          created_at: string;
          id: string;
          role: string;
        };
        Insert: {
          clerk_id: string;
          created_at?: string;
          id?: string;
          role: string;
        };
        Update: {
          clerk_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_clerk_id_fkey';
            columns: ['clerk_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['clerk_id'];
          },
        ];
      };
      visit_requests: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: string;
          landlord_id: string;
          landlord_response_note: string | null;
          note: string | null;
          previous_requested_date: string | null;
          previous_time_slot: Database['public']['Enums']['time_slot_enum'] | null;
          property_id: string;
          requested_date: string;
          reschedule_count: number;
          responded_at: string | null;
          status: Database['public']['Enums']['visit_status_enum'];
          tenant_follow_up_note: string | null;
          tenant_follow_up_response: string | null;
          tenant_id: string;
          time_slot: Database['public']['Enums']['time_slot_enum'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          landlord_id: string;
          landlord_response_note?: string | null;
          note?: string | null;
          previous_requested_date?: string | null;
          previous_time_slot?: Database['public']['Enums']['time_slot_enum'] | null;
          property_id: string;
          requested_date: string;
          reschedule_count?: number;
          responded_at?: string | null;
          status?: Database['public']['Enums']['visit_status_enum'];
          tenant_follow_up_note?: string | null;
          tenant_follow_up_response?: string | null;
          tenant_id: string;
          time_slot: Database['public']['Enums']['time_slot_enum'];
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          landlord_id?: string;
          landlord_response_note?: string | null;
          note?: string | null;
          previous_requested_date?: string | null;
          previous_time_slot?: Database['public']['Enums']['time_slot_enum'] | null;
          property_id?: string;
          requested_date?: string;
          reschedule_count?: number;
          responded_at?: string | null;
          status?: Database['public']['Enums']['visit_status_enum'];
          tenant_follow_up_note?: string | null;
          tenant_follow_up_response?: string | null;
          tenant_id?: string;
          time_slot?: Database['public']['Enums']['time_slot_enum'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'visit_requests_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['clerk_id'];
          },
          {
            foreignKeyName: 'visit_requests_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'visit_requests_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['clerk_id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_visit_request: {
        Args: { p_visit_id: string };
        Returns: {
          completed_at: string | null;
          created_at: string;
          id: string;
          landlord_id: string;
          landlord_response_note: string | null;
          note: string | null;
          previous_requested_date: string | null;
          previous_time_slot: Database['public']['Enums']['time_slot_enum'] | null;
          property_id: string;
          requested_date: string;
          reschedule_count: number;
          responded_at: string | null;
          status: Database['public']['Enums']['visit_status_enum'];
          tenant_follow_up_note: string | null;
          tenant_follow_up_response: string | null;
          tenant_id: string;
          time_slot: Database['public']['Enums']['time_slot_enum'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'visit_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      append_simulated_stage: {
        Args: { p_stage: string; p_submission_id: string };
        Returns: undefined;
      };
      assert_visit_landlord: {
        Args: { p_visit_id: string };
        Returns: {
          completed_at: string | null;
          created_at: string;
          id: string;
          landlord_id: string;
          landlord_response_note: string | null;
          note: string | null;
          previous_requested_date: string | null;
          previous_time_slot: Database['public']['Enums']['time_slot_enum'] | null;
          property_id: string;
          requested_date: string;
          reschedule_count: number;
          responded_at: string | null;
          status: Database['public']['Enums']['visit_status_enum'];
          tenant_follow_up_note: string | null;
          tenant_follow_up_response: string | null;
          tenant_id: string;
          time_slot: Database['public']['Enums']['time_slot_enum'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'visit_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      complete_onboarding:
        | {
            Args: {
              p_avatar_path?: string;
              p_avatar_url?: string;
              p_city: string;
              p_clerk_id: string;
              p_full_name: string;
              p_has_landlord_role: boolean;
              p_kyc_submission_id?: string;
              p_phone: string;
              p_property_types: string[];
              p_roles: string[];
            };
            Returns: Json;
          }
        | {
            Args: {
              p_city: string;
              p_full_name: string;
              p_has_landlord_role: boolean;
              p_kyc_submission_id?: string;
              p_property_types: Database['public']['Enums']['property_type_enum'][];
              p_roles: Database['public']['Enums']['user_role_type'][];
              p_user_id: string;
            };
            Returns: Json;
          };
      finalize_rental: {
        Args: { p_visit_id: string };
        Returns: {
          amenities: Json;
          area_sqft: number | null;
          available_from: string;
          bathrooms: number | null;
          bedrooms: number | null;
          created_at: string;
          deposit: number | null;
          description: string | null;
          extra_details: Json;
          floor: number | null;
          furnishing: string | null;
          id: string;
          is_deleted: boolean;
          is_draft: boolean;
          is_paused: boolean;
          landlord_id: string;
          linked_occupant_id: string | null;
          location_address: string | null;
          location_area: string;
          location_lat: number | null;
          location_lng: number | null;
          photo_urls: string[];
          price: number;
          property_type: Database['public']['Enums']['property_type_enum'];
          status: Database['public']['Enums']['property_status_enum'];
          title: string;
          total_floors: number | null;
          updated_at: string;
          views: number;
        };
        SetofOptions: {
          from: '*';
          to: 'properties';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_next_kyc_attempt: { Args: { p_user_id: string }; Returns: number };
      insert_kyc_submission: {
        Args: {
          p_back_image_path: string;
          p_clerk_id: string;
          p_document_type: string;
          p_electricity_bill_path?: string;
          p_front_image_path: string;
        };
        Returns: {
          address_consistency_score: number | null;
          ai_confidence: number | null;
          ai_extracted_dob: string | null;
          ai_extracted_doc_no: string | null;
          ai_extracted_name: string | null;
          ai_face_match_score: number | null;
          ai_flag_reason: string | null;
          ai_name_match_score: number | null;
          ai_processing_log: Json | null;
          ai_tamper_score: number | null;
          attempt_number: number;
          back_image_path: string;
          clerk_id: string;
          decision_reason: string | null;
          document_type: string;
          electricity_bill_path: string | null;
          expected_outcome: string | null;
          extracted_bill_account_name: string | null;
          extracted_bill_address: string | null;
          extracted_bill_date: string | null;
          extracted_dob: string | null;
          extracted_doc_number: string | null;
          extracted_full_name: string | null;
          extracted_issue_date: string | null;
          extracted_issuer: string | null;
          face_match_score: number | null;
          face_match_status: string | null;
          front_image_path: string;
          id: string;
          id_bill_match_score: number | null;
          overall_score: number | null;
          pipeline_completed_at: string | null;
          pipeline_duration_ms: number | null;
          pipeline_started_at: string | null;
          profile_id_match_score: number | null;
          quality_issues: Json | null;
          quality_score: number | null;
          quality_status: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          selfie_image_path: string | null;
          simulated_stages: string[] | null;
          status: string;
          submitted_at: string;
          tamper_notes: string | null;
          tamper_score: number | null;
          tamper_status: string | null;
          utility_bill_back_path: string | null;
          utility_bill_front_path: string | null;
          utility_bill_type: string | null;
          verification_type: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'kyc_submissions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      log_pipeline_event: {
        Args: {
          p_duration_ms?: number;
          p_message?: string;
          p_metadata?: Json;
          p_score?: number;
          p_stage: string;
          p_status: string;
          p_submission_id: string;
        };
        Returns: string;
      };
      recalculate_property_status: {
        Args: { p_property_id: string };
        Returns: Database['public']['Enums']['property_status_enum'];
      };
      reject_visit_request: {
        Args: { p_reason?: string; p_visit_id: string };
        Returns: {
          completed_at: string | null;
          created_at: string;
          id: string;
          landlord_id: string;
          landlord_response_note: string | null;
          note: string | null;
          previous_requested_date: string | null;
          previous_time_slot: Database['public']['Enums']['time_slot_enum'] | null;
          property_id: string;
          requested_date: string;
          reschedule_count: number;
          responded_at: string | null;
          status: Database['public']['Enums']['visit_status_enum'];
          tenant_follow_up_note: string | null;
          tenant_follow_up_response: string | null;
          tenant_id: string;
          time_slot: Database['public']['Enums']['time_slot_enum'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'visit_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      relist_property: {
        Args: { p_property_id: string };
        Returns: {
          amenities: Json;
          area_sqft: number | null;
          available_from: string;
          bathrooms: number | null;
          bedrooms: number | null;
          created_at: string;
          deposit: number | null;
          description: string | null;
          extra_details: Json;
          floor: number | null;
          furnishing: string | null;
          id: string;
          is_deleted: boolean;
          is_draft: boolean;
          is_paused: boolean;
          landlord_id: string;
          linked_occupant_id: string | null;
          location_address: string | null;
          location_area: string;
          location_lat: number | null;
          location_lng: number | null;
          photo_urls: string[];
          price: number;
          property_type: Database['public']['Enums']['property_type_enum'];
          status: Database['public']['Enums']['property_status_enum'];
          title: string;
          total_floors: number | null;
          updated_at: string;
          views: number;
        };
        SetofOptions: {
          from: '*';
          to: 'properties';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      requesting_user_id: { Args: never; Returns: string };
      reschedule_visit_request: {
        Args: {
          p_message?: string;
          p_new_date: string;
          p_new_slot: Database['public']['Enums']['time_slot_enum'];
          p_visit_id: string;
        };
        Returns: {
          completed_at: string | null;
          created_at: string;
          id: string;
          landlord_id: string;
          landlord_response_note: string | null;
          note: string | null;
          previous_requested_date: string | null;
          previous_time_slot: Database['public']['Enums']['time_slot_enum'] | null;
          property_id: string;
          requested_date: string;
          reschedule_count: number;
          responded_at: string | null;
          status: Database['public']['Enums']['visit_status_enum'];
          tenant_follow_up_note: string | null;
          tenant_follow_up_response: string | null;
          tenant_id: string;
          time_slot: Database['public']['Enums']['time_slot_enum'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'visit_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
    };
    Enums: {
      document_type_type: 'CITIZENSHIP' | 'NATIONAL_ID';
      kyc_status_type: 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
      property_status_enum: 'AVAILABLE' | 'HIGH_DEMAND' | 'UNDER_DISCUSSION' | 'OCCUPIED';
      property_type_enum: 'ROOM' | 'APARTMENT' | 'HOUSE' | 'OFFICE' | 'FLAT';
      time_slot_enum: 'MORNING' | 'AFTERNOON' | 'EVENING';
      user_role_type: 'tenant' | 'landlord';
      verification_status_type: 'UNVERIFIED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
      visit_status_enum:
        | 'PENDING'
        | 'ACCEPTED'
        | 'RESCHEDULED'
        | 'REJECTED'
        | 'VISIT_COMPLETED'
        | 'DISCUSSION_ONGOING'
        | 'RENTAL_FINALIZED'
        | 'CLOSED'
        | 'CANCELLED_BY_TENANT';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      document_type_type: ['CITIZENSHIP', 'NATIONAL_ID'],
      kyc_status_type: ['UNDER_REVIEW', 'VERIFIED', 'REJECTED'],
      property_status_enum: ['AVAILABLE', 'HIGH_DEMAND', 'UNDER_DISCUSSION', 'OCCUPIED'],
      property_type_enum: ['ROOM', 'APARTMENT', 'HOUSE', 'OFFICE', 'FLAT'],
      time_slot_enum: ['MORNING', 'AFTERNOON', 'EVENING'],
      user_role_type: ['tenant', 'landlord'],
      verification_status_type: ['UNVERIFIED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'],
      visit_status_enum: [
        'PENDING',
        'ACCEPTED',
        'RESCHEDULED',
        'REJECTED',
        'VISIT_COMPLETED',
        'DISCUSSION_ONGOING',
        'RENTAL_FINALIZED',
        'CLOSED',
        'CANCELLED_BY_TENANT',
      ],
    },
  },
} as const;
