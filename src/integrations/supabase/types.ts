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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_usage_logs: {
        Row: {
          completion_tokens: number | null
          created_at: string | null
          function_name: string
          id: string
          latency_ms: number | null
          prompt_tokens: number | null
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          prompt_tokens?: number | null
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          prompt_tokens?: number | null
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
      assessment_questions: {
        Row: {
          assessment_id: string
          id: string
          question_id: string
          sort_order: number | null
        }
        Insert: {
          assessment_id: string
          id?: string
          question_id: string
          sort_order?: number | null
        }
        Update: {
          assessment_id?: string
          id?: string
          question_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          instructions: string | null
          name: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          name: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          name?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_images: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          image_url: string
          ocr_text: string | null
          processed_image_url: string | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          image_url: string
          ocr_text?: string | null
          processed_image_url?: string | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          image_url?: string
          ocr_text?: string | null
          processed_image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempt_images_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_misconceptions: {
        Row: {
          attempt_id: string
          confidence: number | null
          misconception_id: string
        }
        Insert: {
          attempt_id: string
          confidence?: number | null
          misconception_id: string
        }
        Update: {
          attempt_id?: string
          confidence?: number | null
          misconception_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_misconceptions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_misconceptions_misconception_id_fkey"
            columns: ["misconception_id"]
            isOneToOne: false
            referencedRelation: "misconception_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          assessment_id: string | null
          created_at: string
          id: string
          qr_code: string | null
          question_id: string
          status: Database["public"]["Enums"]["attempt_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          qr_code?: string | null
          question_id: string
          status?: Database["public"]["Enums"]["attempt_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          qr_code?: string | null
          question_id?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          class_period: string | null
          created_at: string
          id: string
          join_code: string
          name: string
          school_year: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_period?: string | null
          created_at?: string
          id?: string
          join_code: string
          name: string
          school_year?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_period?: string | null
          created_at?: string
          id?: string
          join_code?: string
          name?: string
          school_year?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_results: {
        Row: {
          created_at: string
          id: string
          level_a_score: number | null
          level_a_total: number | null
          level_b_score: number | null
          level_b_total: number | null
          level_c_score: number | null
          level_c_total: number | null
          level_d_score: number | null
          level_d_total: number | null
          level_e_score: number | null
          level_e_total: number | null
          level_f_score: number | null
          level_f_total: number | null
          notes: string | null
          recommended_level: string | null
          standard: string | null
          student_id: string
          teacher_id: string
          topic_name: string
          updated_at: string
          worksheet_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level_a_score?: number | null
          level_a_total?: number | null
          level_b_score?: number | null
          level_b_total?: number | null
          level_c_score?: number | null
          level_c_total?: number | null
          level_d_score?: number | null
          level_d_total?: number | null
          level_e_score?: number | null
          level_e_total?: number | null
          level_f_score?: number | null
          level_f_total?: number | null
          notes?: string | null
          recommended_level?: string | null
          standard?: string | null
          student_id: string
          teacher_id: string
          topic_name: string
          updated_at?: string
          worksheet_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level_a_score?: number | null
          level_a_total?: number | null
          level_b_score?: number | null
          level_b_total?: number | null
          level_c_score?: number | null
          level_c_total?: number | null
          level_d_score?: number | null
          level_d_total?: number | null
          level_e_score?: number | null
          level_e_total?: number | null
          level_f_score?: number | null
          level_f_total?: number | null
          notes?: string | null
          recommended_level?: string | null
          standard?: string | null
          student_id?: string
          teacher_id?: string
          topic_name?: string
          updated_at?: string
          worksheet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_results_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_results_worksheet_id_fkey"
            columns: ["worksheet_id"]
            isOneToOne: false
            referencedRelation: "worksheets"
            referencedColumns: ["id"]
          },
        ]
      }
      ferpa_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          teacher_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          teacher_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          teacher_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      grade_history: {
        Row: {
          attempt_id: string | null
          created_at: string
          grade: number
          grade_justification: string | null
          id: string
          nys_standard: string | null
          raw_score_earned: number | null
          raw_score_possible: number | null
          regents_justification: string | null
          regents_score: number | null
          student_id: string
          teacher_id: string
          topic_id: string | null
          topic_name: string
        }
        Insert: {
          attempt_id?: string | null
          created_at?: string
          grade: number
          grade_justification?: string | null
          id?: string
          nys_standard?: string | null
          raw_score_earned?: number | null
          raw_score_possible?: number | null
          regents_justification?: string | null
          regents_score?: number | null
          student_id: string
          teacher_id: string
          topic_id?: string | null
          topic_name: string
        }
        Update: {
          attempt_id?: string | null
          created_at?: string
          grade?: number
          grade_justification?: string | null
          id?: string
          nys_standard?: string | null
          raw_score_earned?: number | null
          raw_score_possible?: number | null
          regents_justification?: string | null
          regents_score?: number | null
          student_id?: string
          teacher_id?: string
          topic_id?: string | null
          topic_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_history_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_history_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_history_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      misconception_tags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          topic_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          topic_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "misconception_tags_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      name_corrections: {
        Row: {
          class_id: string
          correct_student_id: string
          created_at: string
          handwritten_name: string
          id: string
          normalized_name: string
          teacher_id: string
          times_used: number
          updated_at: string
        }
        Insert: {
          class_id: string
          correct_student_id: string
          created_at?: string
          handwritten_name: string
          id?: string
          normalized_name: string
          teacher_id: string
          times_used?: number
          updated_at?: string
        }
        Update: {
          class_id?: string
          correct_student_id?: string
          created_at?: string
          handwritten_name?: string
          id?: string
          normalized_name?: string
          teacher_id?: string
          times_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "name_corrections_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "name_corrections_correct_student_id_fkey"
            columns: ["correct_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "name_corrections_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_scans: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          image_url: string
          notes: string | null
          status: string
          student_id: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          image_url: string
          notes?: string | null
          status?: string
          student_id?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          image_url?: string
          notes?: string | null
          status?: string
          student_id?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_scans_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_scans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_scans_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      question_topics: {
        Row: {
          question_id: string
          topic_id: string
        }
        Insert: {
          question_id: string
          topic_id: string
        }
        Update: {
          question_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_topics_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer_image_url: string | null
          answer_text: string | null
          assessment_mode: string
          created_at: string
          difficulty: number | null
          id: string
          jmap_id: string | null
          jmap_url: string | null
          prompt_image_url: string | null
          prompt_text: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          answer_image_url?: string | null
          answer_text?: string | null
          assessment_mode?: string
          created_at?: string
          difficulty?: number | null
          id?: string
          jmap_id?: string | null
          jmap_url?: string | null
          prompt_image_url?: string | null
          prompt_text?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          answer_image_url?: string | null
          answer_text?: string | null
          assessment_mode?: string
          created_at?: string
          difficulty?: number | null
          id?: string
          jmap_id?: string | null
          jmap_url?: string | null
          prompt_image_url?: string | null
          prompt_text?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      result_comments: {
        Row: {
          attempt_id: string
          author_name: string | null
          author_type: string
          content: string
          created_at: string
          id: string
          is_read: boolean
        }
        Insert: {
          attempt_id: string
          author_name?: string | null
          author_type: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
        }
        Update: {
          attempt_id?: string
          author_name?: string | null
          author_type?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "result_comments_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrics: {
        Row: {
          created_at: string
          description: string
          id: string
          points: number
          question_id: string
          step_number: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          points?: number
          question_id: string
          step_number: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          points?: number
          question_id?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "rubrics_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_auto_scored: boolean | null
          notes: string | null
          points_earned: number | null
          rubric_id: string | null
          teacher_override: boolean | null
          updated_at: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_auto_scored?: boolean | null
          notes?: string | null
          points_earned?: number | null
          rubric_id?: string | null
          teacher_override?: boolean | null
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_auto_scored?: boolean | null
          notes?: string | null
          points_earned?: number | null
          rubric_id?: string | null
          teacher_override?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          ai_auto_reject_enabled: boolean | null
          ai_daily_limit: number | null
          ai_detection_enabled: boolean | null
          ai_detection_threshold: number | null
          ai_hourly_limit: number | null
          analysis_provider: string | null
          created_at: string
          grading_scale: Json | null
          id: string
          integration_webhook_enabled: boolean | null
          integration_webhook_url: string | null
          level_a_notifications: boolean | null
          level_drop_notifications: boolean | null
          low_regents_alerts_enabled: boolean | null
          low_regents_threshold: number | null
          parent_ai_notifications: boolean | null
          sister_app_coin_multiplier: number | null
          sister_app_sync_enabled: boolean | null
          sister_app_xp_multiplier: number | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          ai_auto_reject_enabled?: boolean | null
          ai_daily_limit?: number | null
          ai_detection_enabled?: boolean | null
          ai_detection_threshold?: number | null
          ai_hourly_limit?: number | null
          analysis_provider?: string | null
          created_at?: string
          grading_scale?: Json | null
          id?: string
          integration_webhook_enabled?: boolean | null
          integration_webhook_url?: string | null
          level_a_notifications?: boolean | null
          level_drop_notifications?: boolean | null
          low_regents_alerts_enabled?: boolean | null
          low_regents_threshold?: number | null
          parent_ai_notifications?: boolean | null
          sister_app_coin_multiplier?: number | null
          sister_app_sync_enabled?: boolean | null
          sister_app_xp_multiplier?: number | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          ai_auto_reject_enabled?: boolean | null
          ai_daily_limit?: number | null
          ai_detection_enabled?: boolean | null
          ai_detection_threshold?: number | null
          ai_hourly_limit?: number | null
          analysis_provider?: string | null
          created_at?: string
          grading_scale?: Json | null
          id?: string
          integration_webhook_enabled?: boolean | null
          integration_webhook_url?: string | null
          level_a_notifications?: boolean | null
          level_drop_notifications?: boolean | null
          low_regents_alerts_enabled?: boolean | null
          low_regents_threshold?: number | null
          parent_ai_notifications?: boolean | null
          sister_app_coin_multiplier?: number | null
          sister_app_sync_enabled?: boolean | null
          sister_app_xp_multiplier?: number | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sister_app_sync_log: {
        Row: {
          action: string
          created_at: string
          data: Json
          id: string
          processed: boolean
          processed_at: string | null
          source_app: string
          student_id: string | null
          teacher_id: string
        }
        Insert: {
          action: string
          created_at?: string
          data?: Json
          id?: string
          processed?: boolean
          processed_at?: string | null
          source_app?: string
          student_id?: string | null
          teacher_id: string
        }
        Update: {
          action?: string
          created_at?: string
          data?: Json
          id?: string
          processed?: boolean
          processed_at?: string | null
          source_app?: string
          student_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sister_app_sync_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sister_app_sync_log_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_id: string
          created_at: string
          custom_pseudonym: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          parent_email: string | null
          student_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          custom_pseudonym?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          parent_email?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          custom_pseudonym?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          parent_email?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_api_keys: {
        Row: {
          api_key_hash: string
          api_key_prefix: string
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          teacher_id: string
        }
        Insert: {
          api_key_hash: string
          api_key_prefix: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          teacher_id: string
        }
        Update: {
          api_key_hash?: string
          api_key_prefix?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_api_keys_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          teacher_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          teacher_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      worksheets: {
        Row: {
          created_at: string
          id: string
          is_shared: boolean
          questions: Json
          settings: Json
          share_code: string | null
          teacher_id: string
          teacher_name: string | null
          title: string
          topics: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_shared?: boolean
          questions?: Json
          settings?: Json
          share_code?: string | null
          teacher_id: string
          teacher_name?: string | null
          title: string
          topics?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_shared?: boolean
          questions?: Json
          settings?: Json
          share_code?: string | null
          teacher_id?: string
          teacher_name?: string | null
          title?: string
          topics?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worksheets_teacher_id_fkey"
            columns: ["teacher_id"]
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
      check_ai_rate_limit: {
        Args: {
          p_daily_limit?: number
          p_hourly_limit?: number
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      attempt_status: "pending" | "analyzed" | "reviewed"
      user_role: "teacher" | "student" | "admin"
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
      attempt_status: ["pending", "analyzed", "reviewed"],
      user_role: ["teacher", "student", "admin"],
    },
  },
} as const
