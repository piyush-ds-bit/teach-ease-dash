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
  public: {
    Tables: {
      borrowers: {
        Row: {
          contact_number: string | null
          created_at: string
          duration_months: number | null
          id: string
          interest_rate: number | null
          interest_type: Database["public"]["Enums"]["interest_type"]
          loan_start_date: string
          merged_into_borrower_id: string | null
          name: string
          notes: string | null
          principal_amount: number
          profile_photo_url: string | null
          teacher_id: string | null
        }
        Insert: {
          contact_number?: string | null
          created_at?: string
          duration_months?: number | null
          id?: string
          interest_rate?: number | null
          interest_type?: Database["public"]["Enums"]["interest_type"]
          loan_start_date: string
          merged_into_borrower_id?: string | null
          name: string
          notes?: string | null
          principal_amount: number
          profile_photo_url?: string | null
          teacher_id?: string | null
        }
        Update: {
          contact_number?: string | null
          created_at?: string
          duration_months?: number | null
          id?: string
          interest_rate?: number | null
          interest_type?: Database["public"]["Enums"]["interest_type"]
          loan_start_date?: string
          merged_into_borrower_id?: string | null
          name?: string
          notes?: string | null
          principal_amount?: number
          profile_photo_url?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "borrowers_merged_into_borrower_id_fkey"
            columns: ["merged_into_borrower_id"]
            isOneToOne: false
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_ledger: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          entry_type: string
          id: string
          metadata: Json | null
          month_key: string
          student_id: string
          teacher_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          entry_type: string
          id?: string
          metadata?: Json | null
          month_key: string
          student_id: string
          teacher_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          entry_type?: string
          id?: string
          metadata?: Json | null
          month_key?: string
          student_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_ledger_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          completed: boolean | null
          created_at: string | null
          description: string
          due_date: string
          id: string
          student_id: string
          teacher_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          description: string
          due_date: string
          id?: string
          student_id: string
          teacher_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          description?: string
          due_date?: string
          id?: string
          student_id?: string
          teacher_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homework_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lending_ledger: {
        Row: {
          amount: number
          borrower_id: string
          created_at: string
          description: string | null
          entry_date: string
          entry_type: string
          id: string
          loan_id: string | null
          metadata: Json | null
          teacher_id: string | null
        }
        Insert: {
          amount: number
          borrower_id: string
          created_at?: string
          description?: string | null
          entry_date: string
          entry_type: string
          id?: string
          loan_id?: string | null
          metadata?: Json | null
          teacher_id?: string | null
        }
        Update: {
          amount?: number
          borrower_id?: string
          created_at?: string
          description?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          loan_id?: string | null
          metadata?: Json | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lending_ledger_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lending_ledger_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          borrower_id: string
          created_at: string
          id: string
          interest_rate: number | null
          interest_type: Database["public"]["Enums"]["interest_type"]
          legacy_borrower_id: string | null
          principal_amount: number
          settled_at: string | null
          start_date: string
          status: Database["public"]["Enums"]["loan_status"]
          teacher_id: string | null
        }
        Insert: {
          borrower_id: string
          created_at?: string
          id?: string
          interest_rate?: number | null
          interest_type?: Database["public"]["Enums"]["interest_type"]
          legacy_borrower_id?: string | null
          principal_amount: number
          settled_at?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["loan_status"]
          teacher_id?: string | null
        }
        Update: {
          borrower_id?: string
          created_at?: string
          id?: string
          interest_rate?: number | null
          interest_type?: Database["public"]["Enums"]["interest_type"]
          legacy_borrower_id?: string | null
          principal_amount?: number
          settled_at?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["loan_status"]
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loans_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          month: string
          payment_date: string
          payment_mode: string
          proof_image_url: string | null
          student_id: string
          teacher_id: string | null
          transaction_id: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string
          id?: string
          month: string
          payment_date: string
          payment_mode: string
          proof_image_url?: string | null
          student_id: string
          teacher_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          month?: string
          payment_date?: string
          payment_mode?: string
          proof_image_url?: string | null
          student_id?: string
          teacher_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          day_of_week: string
          end_time: string
          id: string
          notes: string | null
          start_time: string
          teacher_id: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: string
          end_time: string
          id?: string
          notes?: string | null
          start_time: string
          teacher_id?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: string
          end_time?: string
          id?: string
          notes?: string | null
          start_time?: string
          teacher_id?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          class: string
          contact_number: string
          created_at: string
          id: string
          joining_date: string
          monthly_fee: number
          name: string
          paused_months: string[] | null
          profile_photo_url: string | null
          remarks: string | null
          subject: string | null
          teacher_id: string | null
        }
        Insert: {
          class: string
          contact_number: string
          created_at?: string
          id?: string
          joining_date: string
          monthly_fee: number
          name: string
          paused_months?: string[] | null
          profile_photo_url?: string | null
          remarks?: string | null
          subject?: string | null
          teacher_id?: string | null
        }
        Update: {
          class?: string
          contact_number?: string
          created_at?: string
          id?: string
          joining_date?: string
          monthly_fee?: number
          name?: string
          paused_months?: string[] | null
          profile_photo_url?: string | null
          remarks?: string | null
          subject?: string | null
          teacher_id?: string | null
        }
        Relationships: []
      }
      teachers: {
        Row: {
          created_at: string
          created_by: string
          email: string
          full_name: string
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["teacher_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["teacher_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["teacher_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          dashboard_stats_visible: boolean
          id: string
          profile_cards_visible: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dashboard_stats_visible?: boolean
          id?: string
          profile_cards_visible?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dashboard_stats_visible?: boolean
          id?: string
          profile_cards_visible?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "teacher" | "super_admin"
      interest_type: "simple_monthly" | "simple_yearly" | "zero_interest"
      loan_status: "active" | "settled"
      teacher_status: "active" | "suspended"
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
      app_role: ["admin", "user", "teacher", "super_admin"],
      interest_type: ["simple_monthly", "simple_yearly", "zero_interest"],
      loan_status: ["active", "settled"],
      teacher_status: ["active", "suspended"],
    },
  },
} as const
