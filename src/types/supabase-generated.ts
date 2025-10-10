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
    PostgrestVersion: "13.0.5"
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
      comments: {
        Row: {
          body: string
          comment_type: string
          created_at: string
          end_offset: number | null
          id: string
          is_stale: boolean | null
          original_quoted_text: string | null
          quoted_text: string | null
          resolved_at: string | null
          resource_id: string
          start_offset: number | null
          status: string
          thread_prev_comment_id: string | null
          thread_root_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          comment_type: string
          created_at?: string
          end_offset?: number | null
          id?: string
          is_stale?: boolean | null
          original_quoted_text?: string | null
          quoted_text?: string | null
          resolved_at?: string | null
          resource_id: string
          start_offset?: number | null
          status?: string
          thread_prev_comment_id?: string | null
          thread_root_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          comment_type?: string
          created_at?: string
          end_offset?: number | null
          id?: string
          is_stale?: boolean | null
          original_quoted_text?: string | null
          quoted_text?: string | null
          resolved_at?: string | null
          resource_id?: string
          start_offset?: number | null
          status?: string
          thread_prev_comment_id?: string | null
          thread_root_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_jobs: {
        Row: {
          api_version: string | null
          completed_at: string | null
          created_at: string | null
          current_step: string | null
          error_code: string | null
          error_details: string | null
          error_message: string | null
          extraction_method: string | null
          id: string
          include_transcript: boolean | null
          max_poll_count: number | null
          metadata_json: Json | null
          normalized_url: string
          original_url: string
          platform: string
          poll_count: number | null
          poll_interval_ms: number | null
          progress: number | null
          retry_after_ms: number | null
          status: string
          transcript: string | null
          updated_at: string | null
          user_id: string
          warnings: string[] | null
        }
        Insert: {
          api_version?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_step?: string | null
          error_code?: string | null
          error_details?: string | null
          error_message?: string | null
          extraction_method?: string | null
          id?: string
          include_transcript?: boolean | null
          max_poll_count?: number | null
          metadata_json?: Json | null
          normalized_url: string
          original_url: string
          platform: string
          poll_count?: number | null
          poll_interval_ms?: number | null
          progress?: number | null
          retry_after_ms?: number | null
          status?: string
          transcript?: string | null
          updated_at?: string | null
          user_id: string
          warnings?: string[] | null
        }
        Update: {
          api_version?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_step?: string | null
          error_code?: string | null
          error_details?: string | null
          error_message?: string | null
          extraction_method?: string | null
          id?: string
          include_transcript?: boolean | null
          max_poll_count?: number | null
          metadata_json?: Json | null
          normalized_url?: string
          original_url?: string
          platform?: string
          poll_count?: number | null
          poll_interval_ms?: number | null
          progress?: number | null
          retry_after_ms?: number | null
          status?: string
          transcript?: string | null
          updated_at?: string | null
          user_id?: string
          warnings?: string[] | null
        }
        Relationships: []
      }
      processing_jobs_cleanup_log: {
        Row: {
          cleaned_at: string | null
          deleted_count: number
          id: string
          retention_days: number
        }
        Insert: {
          cleaned_at?: string | null
          deleted_count: number
          id?: string
          retention_days: number
        }
        Update: {
          cleaned_at?: string | null
          deleted_count?: number
          id?: string
          retention_days?: number
        }
        Relationships: []
      }
      resource_type_configs: {
        Row: {
          config: Json
          created_at: string
          id: string
          resource_type: Database["public"]["Enums"]["resource_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          resource_type: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          resource_type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string
          description: string
          id: string
          metadata: Json | null
          notes: string
          tags: string[] | null
          title: string
          transcript: string | null
          type: Database["public"]["Enums"]["resource_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          notes?: string
          tags?: string[] | null
          title: string
          transcript?: string | null
          type: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          notes?: string
          tags?: string[] | null
          title?: string
          transcript?: string | null
          type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_processing_jobs: {
        Args: { retention_days?: number }
        Returns: number
      }
      flatten_short_form_metadata: {
        Args: { metadata: Json }
        Returns: Json
      }
      generate_invitation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      initialize_default_resource_type_configs: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      share_is_valid: {
        Args: { target_share_id: string }
        Returns: boolean
      }
      user_has_share_access: {
        Args: {
          check_email?: string
          check_user_id?: string
          target_share_id: string
        }
        Returns: boolean
      }
      validate_sharing_security: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      resource_type: "book" | "video" | "podcast" | "article" | "short-video"
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
      resource_type: ["book", "video", "podcast", "article", "short-video"],
    },
  },
} as const
