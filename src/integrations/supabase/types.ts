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
      almoner_reports: {
        Row: {
          advice: string
          created_at: string
          created_by: string | null
          finalised_at: string | null
          id: string
          markdown: string
          period_from: string
          period_to: string
          snapshot: Json
          status: Database["public"]["Enums"]["almoner_report_status"]
          title: string
          updated_at: string
        }
        Insert: {
          advice?: string
          created_at?: string
          created_by?: string | null
          finalised_at?: string | null
          id?: string
          markdown?: string
          period_from: string
          period_to: string
          snapshot?: Json
          status?: Database["public"]["Enums"]["almoner_report_status"]
          title?: string
          updated_at?: string
        }
        Update: {
          advice?: string
          created_at?: string
          created_by?: string | null
          finalised_at?: string | null
          id?: string
          markdown?: string
          period_from?: string
          period_to?: string
          snapshot?: Json
          status?: Database["public"]["Enums"]["almoner_report_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      festive_board_attendance: {
        Row: {
          amount_pence: number
          attendance_status: Database["public"]["Enums"]["festive_attendance_status"]
          booking_id: string | null
          created_at: string
          created_by: string | null
          id: string
          meeting_id: string
          member_id: string | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["festive_payment_method"]
          updated_at: string
          visitor_lodge_name: string | null
          visitor_lodge_number: string | null
          visitor_name: string | null
        }
        Insert: {
          amount_pence?: number
          attendance_status?: Database["public"]["Enums"]["festive_attendance_status"]
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_id: string
          member_id?: string | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["festive_payment_method"]
          updated_at?: string
          visitor_lodge_name?: string | null
          visitor_lodge_number?: string | null
          visitor_name?: string | null
        }
        Update: {
          amount_pence?: number
          attendance_status?: Database["public"]["Enums"]["festive_attendance_status"]
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_id?: string
          member_id?: string | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["festive_payment_method"]
          updated_at?: string
          visitor_lodge_name?: string | null
          visitor_lodge_number?: string | null
          visitor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "festive_board_attendance_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "festive_board_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "festive_board_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "festive_board_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      festive_board_meetings: {
        Row: {
          created_at: string
          created_by: string | null
          headcount_override: number | null
          id: string
          meeting_date: string
          meeting_type: Database["public"]["Enums"]["festive_meeting_type"]
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          headcount_override?: number | null
          id?: string
          meeting_date: string
          meeting_type?: Database["public"]["Enums"]["festive_meeting_type"]
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          headcount_override?: number | null
          id?: string
          meeting_date?: string
          meeting_type?: Database["public"]["Enums"]["festive_meeting_type"]
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
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
      lodge_template: {
        Row: {
          consecration_date: string | null
          cover_left_image_url: string | null
          cover_right_image_url: string | null
          created_at: string
          data_protection_text: string | null
          data_protection_text_short: string | null
          dining_booking_url: string | null
          honorary_members: string | null
          id: string
          lodge_name: string
          lodge_number: string
          lodge_representatives: Json
          logo_url: string | null
          loi_details: string | null
          mcf_contact: string | null
          overseas_attendance_text: string | null
          progression_notice_text: string | null
          province: string
          provincial_website: string | null
          regular_meeting_pattern: string | null
          royal_arch_rep: string | null
          secretary_contact: string | null
          updated_at: string
          updated_by: string | null
          venue_address: string | null
          wm_contact: string | null
        }
        Insert: {
          consecration_date?: string | null
          cover_left_image_url?: string | null
          cover_right_image_url?: string | null
          created_at?: string
          data_protection_text?: string | null
          data_protection_text_short?: string | null
          dining_booking_url?: string | null
          honorary_members?: string | null
          id?: string
          lodge_name?: string
          lodge_number?: string
          lodge_representatives?: Json
          logo_url?: string | null
          loi_details?: string | null
          mcf_contact?: string | null
          overseas_attendance_text?: string | null
          progression_notice_text?: string | null
          province?: string
          provincial_website?: string | null
          regular_meeting_pattern?: string | null
          royal_arch_rep?: string | null
          secretary_contact?: string | null
          updated_at?: string
          updated_by?: string | null
          venue_address?: string | null
          wm_contact?: string | null
        }
        Update: {
          consecration_date?: string | null
          cover_left_image_url?: string | null
          cover_right_image_url?: string | null
          created_at?: string
          data_protection_text?: string | null
          data_protection_text_short?: string | null
          dining_booking_url?: string | null
          honorary_members?: string | null
          id?: string
          lodge_name?: string
          lodge_number?: string
          lodge_representatives?: Json
          logo_url?: string | null
          loi_details?: string | null
          mcf_contact?: string | null
          overseas_attendance_text?: string | null
          progression_notice_text?: string | null
          province?: string
          provincial_website?: string | null
          regular_meeting_pattern?: string | null
          royal_arch_rep?: string | null
          secretary_contact?: string | null
          updated_at?: string
          updated_by?: string | null
          venue_address?: string | null
          wm_contact?: string | null
        }
        Relationships: []
      }
      loi_attendance: {
        Row: {
          created_at: string
          id: string
          member_id: string
          part: string
          part_other: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          part: string
          part_other?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          part?: string
          part_other?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loi_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loi_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "loi_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      loi_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          focus: string
          focus_other: string | null
          id: string
          kpi_category: string | null
          notes: string | null
          session_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          focus: string
          focus_other?: string | null
          id?: string
          kpi_category?: string | null
          notes?: string | null
          session_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          focus?: string
          focus_other?: string | null
          id?: string
          kpi_category?: string | null
          notes?: string | null
          session_date?: string
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
          middle_name: string | null
          mother_lodge: string | null
          office: string | null
          passing_date: string | null
          phone: string | null
          post_nominals: string | null
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
          middle_name?: string | null
          mother_lodge?: string | null
          office?: string | null
          passing_date?: string | null
          phone?: string | null
          post_nominals?: string | null
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
          middle_name?: string | null
          mother_lodge?: string | null
          office?: string | null
          passing_date?: string | null
          phone?: string | null
          post_nominals?: string | null
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
      summons_email_log: {
        Row: {
          error: string | null
          id: string
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string
          status: string
          summons_id: string
        }
        Insert: {
          error?: string | null
          id?: string
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string
          status?: string
          summons_id: string
        }
        Update: {
          error?: string | null
          id?: string
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string
          status?: string
          summons_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "summons_email_log_summons_id_fkey"
            columns: ["summons_id"]
            isOneToOne: false
            referencedRelation: "summonses"
            referencedColumns: ["id"]
          },
        ]
      }
      summonses: {
        Row: {
          agenda: Json
          candidates: Json
          created_at: string
          created_by: string | null
          dining_deadline: string | null
          dining_enquiry_email: string | null
          dining_enquiry_name: string | null
          dining_menu: string | null
          dining_price: string | null
          dress_code: string | null
          id: string
          lodge_event_id: string | null
          meeting_date: string | null
          meeting_number: number
          meeting_time: string | null
          meeting_type: string | null
          minutes_confirmation_date: string | null
          next_meeting_date: string | null
          notice_overrides: Json
          officer_night_date: string | null
          pdf_storage_path: string | null
          sent_at: string | null
          sent_to_count: number | null
          status: Database["public"]["Enums"]["summons_status"]
          updated_at: string
        }
        Insert: {
          agenda?: Json
          candidates?: Json
          created_at?: string
          created_by?: string | null
          dining_deadline?: string | null
          dining_enquiry_email?: string | null
          dining_enquiry_name?: string | null
          dining_menu?: string | null
          dining_price?: string | null
          dress_code?: string | null
          id?: string
          lodge_event_id?: string | null
          meeting_date?: string | null
          meeting_number: number
          meeting_time?: string | null
          meeting_type?: string | null
          minutes_confirmation_date?: string | null
          next_meeting_date?: string | null
          notice_overrides?: Json
          officer_night_date?: string | null
          pdf_storage_path?: string | null
          sent_at?: string | null
          sent_to_count?: number | null
          status?: Database["public"]["Enums"]["summons_status"]
          updated_at?: string
        }
        Update: {
          agenda?: Json
          candidates?: Json
          created_at?: string
          created_by?: string | null
          dining_deadline?: string | null
          dining_enquiry_email?: string | null
          dining_enquiry_name?: string | null
          dining_menu?: string | null
          dining_price?: string | null
          dress_code?: string | null
          id?: string
          lodge_event_id?: string | null
          meeting_date?: string | null
          meeting_number?: number
          meeting_time?: string | null
          meeting_type?: string | null
          minutes_confirmation_date?: string | null
          next_meeting_date?: string | null
          notice_overrides?: Json
          officer_night_date?: string | null
          pdf_storage_path?: string | null
          sent_at?: string | null
          sent_to_count?: number | null
          status?: Database["public"]["Enums"]["summons_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "summonses_lodge_event_id_fkey"
            columns: ["lodge_event_id"]
            isOneToOne: false
            referencedRelation: "lodge_events"
            referencedColumns: ["id"]
          },
        ]
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
      welfare_absences: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          member_id: string
          notes: string | null
          period_end: string | null
          period_start: string
          reason: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          member_id: string
          notes?: string | null
          period_end?: string | null
          period_start: string
          reason: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string
          reason?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "welfare_absences_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      welfare_correspondence: {
        Row: {
          body: string | null
          correspondence_date: string
          created_at: string
          deleted_at: string | null
          direction: string
          id: string
          logged_by: string | null
          member_id: string | null
          method: string
          subject: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          correspondence_date?: string
          created_at?: string
          deleted_at?: string | null
          direction: string
          id?: string
          logged_by?: string | null
          member_id?: string | null
          method: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          correspondence_date?: string
          created_at?: string
          deleted_at?: string | null
          direction?: string
          id?: string
          logged_by?: string | null
          member_id?: string | null
          method?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "welfare_correspondence_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      welfare_life_events: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          event_date: string
          event_type: string
          id: string
          member_id: string
          notes: string | null
          recurring: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_date: string
          event_type: string
          id?: string
          member_id: string
          notes?: string | null
          recurring?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_date?: string
          event_type?: string
          id?: string
          member_id?: string
          notes?: string | null
          recurring?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "welfare_life_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      welfare_log_entries: {
        Row: {
          action_taken: string | null
          contact_date: string
          contact_nature: Database["public"]["Enums"]["welfare_contact_nature"]
          contact_type: Database["public"]["Enums"]["welfare_contact_type"]
          created_at: string
          deleted_at: string | null
          follow_up_date: string | null
          id: string
          logged_by: string | null
          member_id: string
          nature_detail: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          contact_date?: string
          contact_nature: Database["public"]["Enums"]["welfare_contact_nature"]
          contact_type: Database["public"]["Enums"]["welfare_contact_type"]
          created_at?: string
          deleted_at?: string | null
          follow_up_date?: string | null
          id?: string
          logged_by?: string | null
          member_id: string
          nature_detail?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          contact_date?: string
          contact_nature?: Database["public"]["Enums"]["welfare_contact_nature"]
          contact_type?: Database["public"]["Enums"]["welfare_contact_type"]
          created_at?: string
          deleted_at?: string | null
          follow_up_date?: string | null
          id?: string
          logged_by?: string | null
          member_id?: string
          nature_detail?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "welfare_log_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      welfare_member_status: {
        Row: {
          created_at: string
          member_id: string
          notes: string | null
          status: Database["public"]["Enums"]["welfare_status_level"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          member_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["welfare_status_level"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          member_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["welfare_status_level"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "welfare_member_status_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      welfare_rmtgb_referrals: {
        Row: {
          closed_date: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          member_id: string
          outcome: string | null
          referral_date: string
          referral_type: string
          status: string
          summary: string
          updated_at: string
        }
        Insert: {
          closed_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          member_id: string
          outcome?: string | null
          referral_date?: string
          referral_type: string
          status?: string
          summary: string
          updated_at?: string
        }
        Update: {
          closed_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          member_id?: string
          outcome?: string | null
          referral_date?: string
          referral_type?: string
          status?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "welfare_rmtgb_referrals_member_id_fkey"
            columns: ["member_id"]
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
      can_access_almoner: { Args: { _user_id: string }; Returns: boolean }
      current_lodge_year: { Args: never; Returns: number }
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
      is_current_wm_or_ipm: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      almoner_report_status: "draft" | "final"
      app_role:
        | "member"
        | "admin"
        | "secretary"
        | "worshipful_master"
        | "director_of_ceremonies"
        | "assistant_secretary"
        | "almoner"
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
      festive_attendance_status:
        | "booked"
        | "attended"
        | "no_show"
        | "cancelled_refunded"
      festive_meeting_type: "regular" | "installation" | "emergency"
      festive_payment_method:
        | "stripe"
        | "paid_on_night_cash"
        | "paid_on_night_card"
        | "complimentary"
        | "unknown"
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
      summons_status: "draft" | "finalised" | "sent"
      welfare_contact_nature:
        | "routine"
        | "illness"
        | "bereavement"
        | "financial"
        | "mental_health"
        | "hospitalisation"
        | "other"
      welfare_contact_type:
        | "in_person"
        | "phone"
        | "card"
        | "email"
        | "lodge_visit"
        | "none"
      welfare_status_level: "green" | "amber" | "red"
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
      almoner_report_status: ["draft", "final"],
      app_role: [
        "member",
        "admin",
        "secretary",
        "worshipful_master",
        "director_of_ceremonies",
        "assistant_secretary",
        "almoner",
      ],
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
      festive_attendance_status: [
        "booked",
        "attended",
        "no_show",
        "cancelled_refunded",
      ],
      festive_meeting_type: ["regular", "installation", "emergency"],
      festive_payment_method: [
        "stripe",
        "paid_on_night_cash",
        "paid_on_night_card",
        "complimentary",
        "unknown",
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
      summons_status: ["draft", "finalised", "sent"],
      welfare_contact_nature: [
        "routine",
        "illness",
        "bereavement",
        "financial",
        "mental_health",
        "hospitalisation",
        "other",
      ],
      welfare_contact_type: [
        "in_person",
        "phone",
        "card",
        "email",
        "lodge_visit",
        "none",
      ],
      welfare_status_level: ["green", "amber", "red"],
    },
  },
} as const
