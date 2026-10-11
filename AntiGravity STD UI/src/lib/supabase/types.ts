export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "student" | "admin";

export type EnrollmentStatus = "pending" | "approved" | "rejected";

export type VideoSource = "youtube" | "google_drive" | "hosted" | "other";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          avatar_url: string | null;
          phone: string | null;
          status?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          avatar_url?: string | null;
          phone?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          phone?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          level: string;
          is_published: boolean;
          thumbnail_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description: string;
          level: string;
          is_published?: boolean;
          thumbnail_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string;
          level?: string;
          is_published?: boolean;
          thumbnail_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      course_enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          status: EnrollmentStatus;
          receipt_tid: string | null;
          requested_at: string;
          approved_at: string | null;
          approved_by: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          duration_months?: number | null;
          expires_at?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          status?: EnrollmentStatus;
          receipt_tid?: string | null;
          requested_at?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          duration_months?: number | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          status?: EnrollmentStatus;
          receipt_tid?: string | null;
          requested_at?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          duration_months?: number | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          order_index: number;
          video_url: string | null;
          video_source: VideoSource | null;
          notes: string | null;
          practice_content: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          title: string;
          order_index?: number;
          video_url?: string | null;
          video_source?: VideoSource | null;
          notes?: string | null;
          practice_content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          module_id?: string;
          title?: string;
          order_index?: number;
          video_url?: string | null;
          video_source?: VideoSource | null;
          notes?: string | null;
          practice_content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cms_content: {
        Row: {
          id: string;
          page_key: string;
          draft_data: Json;
          published_data: Json | null;
          version: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          page_key: string;
          draft_data: Json;
          published_data?: Json | null;
          version?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          page_key?: string;
          draft_data?: Json;
          published_data?: Json | null;
          version?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
      email_templates: {
        Row: {
          id: string;
          name: string;
          subject: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subject?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_logs: {
        Row: {
          id: string;
          recipient_email: string;
          subject: string;
          template_id: string | null;
          status: string;
          resend_id: string | null;
          error_message: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          recipient_email: string;
          subject: string;
          template_id?: string | null;
          status?: string;
          resend_id?: string | null;
          error_message?: string | null;
          sent_at?: string;
        };
        Update: {
          id?: string;
          recipient_email?: string;
          subject?: string;
          template_id?: string | null;
          status?: string;
          resend_id?: string | null;
          error_message?: string | null;
          sent_at?: string;
        };
      };
    };
  };
}

