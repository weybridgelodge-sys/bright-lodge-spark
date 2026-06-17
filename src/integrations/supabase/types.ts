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
      bookings: {
        Row: {
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          currency: string
          details: Json
          environment: string
          event_key: string
          event_label: string
          fee_pence: number
          id: string
          line_items: Json
          paid_at: string | null
          payment_status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal_pence: number
          total_pence: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          currency?: string
          details?: Json
          environment?: string
          event_key: string
          event_label: string
          fee_pence?: number
          id?: string
          line_items?: Json
          paid_at?: string | null
          payment_status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_pence?: number
          total_pence?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          currency?: string
          details?: Json
          environment?: string
          event_key?: string
          event_label?: string
          fee_pence?: number
          id?: string
          line_items?: Json
          paid_at?: string | null
          payment_status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_pence?: number
          total_pence?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      candidates: {
        Row: {
          converted_member_id: string | null
          created_at: string
          created_by: string | null
          date_of_enquiry: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          proposer: string | null
          seconder: string | null
          stage: Database["public"]["Enums"]["candidate_stage"]
          updated_at: string
        }
        Insert: {
          converted_member_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_enquiry?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          proposer?: string | null
          seconder?: string | null
          stage?: Database["public"]["Enums"]["candidate_stage"]
          updated_at?: string
        }
        Update: {
          converted_member_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_enquiry?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          proposer?: string | null
          seconder?: string | null
          stage?: Database["public"]["Enums"]["candidate_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_converted_member_id_fkey"
            columns: ["converted_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lodge_documents: {
        Row: {
          category: Database["public"]["Enums"]["doc_category"]
          created_at: string
          description: string | null
          file_path: string
          file_size_bytes: number | null
          id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["doc_category"]
          created_at?: string
          description?: string | null
          file_path: string
          file_size_bytes?: number | null
          id?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["doc_category"]
          created_at?: string
          description?: string | null
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      lodge_event_courses: {
        Row: {
          course_label: string
          created_at: string
          description: string
          dish: string
          event_id: string
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          course_label: string
          created_at?: string
          description?: string
          dish: string
          event_id: string
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          course_label?: string
          created_at?: string
          description?: string
          dish?: string
          event_id?: string
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lodge_event_courses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "lodge_events"
            referencedColumns: ["id"]
          },
        ]
      }
      lodge_event_dining_options: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_default: boolean
          label: string
          position: number
          price_pence: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_default?: boolean
          label: string
          position?: number
          price_pence: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_default?: boolean
          label?: string
          position?: number
          price_pence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lodge_event_dining_options_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "lodge_events"
            referencedColumns: ["id"]
          },
        ]
      }
      lodge_events: {
        Row: {
          booking_deadline: string | null
          created_at: string
          dining_time: string
          dress_code: string
          event_date: string
          id: string
          intro: string
          intro_heading: string | null
          location: string
          published: boolean
          slug: string
          sort_order: number
          title: string
          tyling_time: string
          updated_at: string
        }
        Insert: {
          booking_deadline?: string | null
          created_at?: string
          dining_time?: string
          dress_code?: string
          event_date: string
          id?: string
          intro?: string
          intro_heading?: string | null
          location?: string
          published?: boolean
          slug: string
          sort_order?: number
          title: string
          tyling_time?: string
          updated_at?: string
        }
        Update: {
          booking_deadline?: string | null
          created_at?: string
          dining_time?: string
          dress_code?: string
          event_date?: string
          id?: string
          intro?: string
          intro_heading?: string | null
          location?: string
          published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          tyling_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_notices: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          event_date: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          event_date?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          event_date?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_progression_status: {
        Row: {
          created_at: string
          member_id: string
          notes: string | null
          readiness: Database["public"]["Enums"]["progression_readiness"]
          seniority_initiation_date: string | null
          seniority_tiebreaker: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          member_id: string
          notes?: string | null
          readiness?: Database["public"]["Enums"]["progression_readiness"]
          seniority_initiation_date?: string | null
          seniority_tiebreaker?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          member_id?: string
          notes?: string | null
          readiness?: Database["public"]["Enums"]["progression_readiness"]
          seniority_initiation_date?: string | null
          seniority_tiebreaker?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_progression_status_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_progression_status_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_wm_terms: {
        Row: {
          created_at: string
          id: string
          member_id: string
          notes: string | null
          updated_at: string
          year_ended: number | null
          year_started: number
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          notes?: string | null
          updated_at?: string
          year_ended?: number | null
          year_started: number
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          updated_at?: string
          year_ended?: number | null
          year_started?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_wm_terms_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_appointments: {
        Row: {
          appointed_on: string | null
          created_at: string
          id: string
          is_projection: boolean
          lodge_year: number
          member_id: string | null
          override_by: string | null
          override_reason: string | null
          position_key: string
          updated_at: string
        }
        Insert: {
          appointed_on?: string | null
          created_at?: string
          id?: string
          is_projection?: boolean
          lodge_year: number
          member_id?: string | null
          override_by?: string | null
          override_reason?: string | null
          position_key: string
          updated_at?: string
        }
        Update: {
          appointed_on?: string | null
          created_at?: string
          id?: string
          is_projection?: boolean
          lodge_year?: number
          member_id?: string | null
          override_by?: string | null
          override_reason?: string | null
          position_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "officer_appointments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "officer_appointments_override_by_fkey"
            columns: ["override_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "officer_appointments_position_key_fkey"
            columns: ["position_key"]
            isOneToOne: false
            referencedRelation: "officer_positions"
            referencedColumns: ["key"]
          },
        ]
      }
      officer_positions: {
        Row: {
          is_progressive: boolean
          key: string
          label: string
          order_index: number
        }
        Insert: {
          is_progressive?: boolean
          key: string
          label: string
          order_index: number
        }
        Update: {
          is_progressive?: boolean
          key?: string
          label?: string
          order_index?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          address_line3: string | null
          avatar_url: string | null
          county: string | null
          created_at: string
          date_of_birth: string | null
          degree: Database["public"]["Enums"]["masonic_degree"]
          email: string | null
          first_name: string | null
          full_name: string | null
          grand_rank: string | null
          id: string
          initiation_date: string | null
          is_honorary_member: boolean
          is_past_master: boolean
          is_royal_arch: boolean
          is_ugle_portal_registered: boolean
          joined_lodge_date: string | null
          joined_year: number | null
          last_name: string | null
          mother_lodge: string | null
          office: string | null
          passing_date: string | null
          phone: string | null
          postcode: string | null
          preferred_name: string | null
          provincial_rank: string | null
          raising_date: string | null
          rank: string | null
          status: Database["public"]["Enums"]["member_status"]
          title: string | null
          town: string | null
          ugle_reg_number: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          avatar_url?: string | null
          county?: string | null
          created_at?: string
          date_of_birth?: string | null
          degree?: Database["public"]["Enums"]["masonic_degree"]
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          grand_rank?: string | null
          id: string
          initiation_date?: string | null
          is_honorary_member?: boolean
          is_past_master?: boolean
          is_royal_arch?: boolean
          is_ugle_portal_registered?: boolean
          joined_lodge_date?: string | null
          joined_year?: number | null
          last_name?: string | null
          mother_lodge?: string | null
          office?: string | null
          passing_date?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_name?: string | null
          provincial_rank?: string | null
          raising_date?: string | null
          rank?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          title?: string | null
          town?: string | null
          ugle_reg_number?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          avatar_url?: string | null
          county?: string | null
          created_at?: string
          date_of_birth?: string | null
          degree?: Database["public"]["Enums"]["masonic_degree"]
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          grand_rank?: string | null
          id?: string
          initiation_date?: string | null
          is_honorary_member?: boolean
          is_past_master?: boolean
          is_royal_arch?: boolean
          is_ugle_portal_registered?: boolean
          joined_lodge_date?: string | null
          joined_year?: number | null
          last_name?: string | null
          mother_lodge?: string | null
          office?: string | null
          passing_date?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_name?: string | null
          provincial_rank?: string | null
          raising_date?: string | null
          rank?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          title?: string | null
          town?: string | null
          ugle_reg_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ritual_documents: {
        Row: {
          created_at: string
          description: string | null
          file_path: string
          file_size_bytes: number | null
          id: string
          is_general: boolean
          required_degree: Database["public"]["Enums"]["masonic_degree"]
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_path: string
          file_size_bytes?: number | null
          id?: string
          is_general?: boolean
          required_degree?: Database["public"]["Enums"]["masonic_degree"]
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          is_general?: boolean
          required_degree?: Database["public"]["Enums"]["masonic_degree"]
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      succession_risks: {
        Row: {
          created_at: string
          flagged_by: string | null
          id: string
          note: string | null
          role_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          flagged_by?: string | null
          id?: string
          note?: string | null
          role_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          flagged_by?: string | null
          id?: string
          note?: string | null
          role_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      current_office_label: { Args: { _user_id: string }; Returns: string }
      current_user_degree_level: { Args: { _user_id: string }; Returns: number }
      degree_level: {
        Args: { _d: Database["public"]["Enums"]["masonic_degree"] }
        Returns: number
      }
      effective_initiation_date: {
        Args: { _member_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "member" | "admin" | "secretary" | "worshipful_master"
      candidate_stage:
        | "enquiry"
        | "face_to_face"
        | "form_p"
        | "interviewed"
        | "read_in_lodge"
        | "initiated"
        | "withdrawn"
      doc_category:
        | "summons"
        | "meeting_minutes"
        | "committee_minutes"
        | "committee_agendas"
        | "media_files"
        | "ritual"
        | "other"
      masonic_degree:
        | "entered_apprentice"
        | "fellow_craft"
        | "master_mason"
        | "installed_master"
      member_status:
        | "pending"
        | "active"
        | "suspended"
        | "year_out"
        | "resigned"
        | "excluded"
        | "deceased"
      progression_readiness: "ready" | "needs_experience" | "non_progressive"
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
      app_role: ["member", "admin", "secretary", "worshipful_master"],
      candidate_stage: [
        "enquiry",
        "face_to_face",
        "form_p",
        "interviewed",
        "read_in_lodge",
        "initiated",
        "withdrawn",
      ],
      doc_category: [
        "summons",
        "meeting_minutes",
        "committee_minutes",
        "committee_agendas",
        "media_files",
        "ritual",
        "other",
      ],
      masonic_degree: [
        "entered_apprentice",
        "fellow_craft",
        "master_mason",
        "installed_master",
      ],
      member_status: [
        "pending",
        "active",
        "suspended",
        "year_out",
        "resigned",
        "excluded",
        "deceased",
      ],
      progression_readiness: ["ready", "needs_experience", "non_progressive"],
    },
  },
} as const
