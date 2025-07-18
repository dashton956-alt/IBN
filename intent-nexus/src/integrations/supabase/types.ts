export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      configuration_snapshots: {
        Row: {
          configuration_data: Json
          configuration_hash: string
          created_at: string | null
          device_id: string
          id: string
          intent_id: string | null
          snapshot_type: string | null
        }
        Insert: {
          configuration_data: Json
          configuration_hash: string
          created_at?: string | null
          device_id: string
          id?: string
          intent_id?: string | null
          snapshot_type?: string | null
        }
        Update: {
          configuration_data?: Json
          configuration_hash?: string
          created_at?: string | null
          device_id?: string
          id?: string
          intent_id?: string | null
          snapshot_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuration_snapshots_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "network_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_snapshots_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "network_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      merge_requests: {
        Row: {
          author_email: string | null
          change_number: string | null
          created_at: string | null
          description: string | null
          id: string
          intent_id: string | null
          netbox_mr_id: string | null
          netbox_url: string | null
          reviewers: string[] | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_email?: string | null
          change_number?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          intent_id?: string | null
          netbox_mr_id?: string | null
          netbox_url?: string | null
          reviewers?: string[] | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_email?: string | null
          change_number?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          intent_id?: string | null
          netbox_mr_id?: string | null
          netbox_url?: string | null
          reviewers?: string[] | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merge_requests_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "network_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      network_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          description: string | null
          device_id: string | null
          id: string
          intent_id: string | null
          metric_value: number | null
          resolved_at: string | null
          severity: string
          status: string | null
          threshold_value: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          description?: string | null
          device_id?: string | null
          id?: string
          intent_id?: string | null
          metric_value?: number | null
          resolved_at?: string | null
          severity: string
          status?: string | null
          threshold_value?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          description?: string | null
          device_id?: string | null
          id?: string
          intent_id?: string | null
          metric_value?: number | null
          resolved_at?: string | null
          severity?: string
          status?: string | null
          threshold_value?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "network_alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "network_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_alerts_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "network_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      network_devices: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown | null
          last_updated: string | null
          location: string | null
          model: string | null
          name: string
          netbox_id: number | null
          nso_device_name: string | null
          status: string
          type: string
          vendor: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          last_updated?: string | null
          location?: string | null
          model?: string | null
          name: string
          netbox_id?: number | null
          nso_device_name?: string | null
          status?: string
          type: string
          vendor?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          last_updated?: string | null
          location?: string | null
          model?: string | null
          name?: string
          netbox_id?: number | null
          nso_device_name?: string | null
          status?: string
          type?: string
          vendor?: string | null
        }
        Relationships: []
      }
      network_intents: {
        Row: {
          approved_by: string | null
          configuration: string | null
          created_at: string | null
          created_by: string | null
          deployed_at: string | null
          description: string | null
          id: string
          intent_type: string
          natural_language_input: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          configuration?: string | null
          created_at?: string | null
          created_by?: string | null
          deployed_at?: string | null
          description?: string | null
          id?: string
          intent_type: string
          natural_language_input?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          configuration?: string | null
          created_at?: string | null
          created_by?: string | null
          deployed_at?: string | null
          description?: string | null
          id?: string
          intent_type?: string
          natural_language_input?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      network_metrics: {
        Row: {
          device_id: string | null
          id: string
          metric_type: string
          timestamp: string | null
          unit: string | null
          value: number | null
        }
        Insert: {
          device_id?: string | null
          id?: string
          metric_type: string
          timestamp?: string | null
          unit?: string | null
          value?: number | null
        }
        Update: {
          device_id?: string | null
          id?: string
          metric_type?: string
          timestamp?: string | null
          unit?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "network_metrics_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "network_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_thresholds: {
        Row: {
          created_at: string | null
          created_by: string | null
          critical_threshold: number
          device_id: string | null
          enabled: boolean | null
          id: string
          metric_type: string
          operator: string | null
          updated_at: string | null
          warning_threshold: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          critical_threshold: number
          device_id?: string | null
          enabled?: boolean | null
          id?: string
          metric_type: string
          operator?: string | null
          updated_at?: string | null
          warning_threshold: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          critical_threshold?: number
          device_id?: string | null
          enabled?: boolean | null
          id?: string
          metric_type?: string
          operator?: string | null
          updated_at?: string | null
          warning_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_thresholds_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "network_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          dashboard_layout: Json | null
          id: string
          notification_settings: Json | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dashboard_layout?: Json | null
          id?: string
          notification_settings?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dashboard_layout?: Json | null
          id?: string
          notification_settings?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "engineer" | "viewer" | "approver"
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
      app_role: ["admin", "engineer", "viewer", "approver"],
    },
  },
} as const
