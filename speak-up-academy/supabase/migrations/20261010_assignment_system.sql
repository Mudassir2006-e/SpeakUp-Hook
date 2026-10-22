-- ==============================================================================
-- SpeakUp LMS — Incremental SQL Migration: Assignment Management & History
-- File: supabase/migrations/20261010_assignment_system.sql
-- Description: Safe incremental migration for assignments, student submissions,
--              multi-image attachments metadata, revision history, and RLS policies.
-- ==============================================================================

-- 1. ASSIGNMENTS TABLE
-- Persists assignment configuration created by instructors in Admin Panel
CREATE TABLE IF NOT EXISTS public.assignments (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    practice_type TEXT NOT NULL DEFAULT 'writing', -- 'reading' | 'writing'
    title TEXT NOT NULL,
    context_text TEXT,
    instructions TEXT NOT NULL,
    question_task TEXT,
    writing_requirements TEXT,
    example_reference TEXT,
    reference_file_url TEXT,
    max_marks INTEGER NOT NULL DEFAULT 20,
    rubric TEXT,
    time_guidance TEXT,
    word_count_guidance TEXT,
    language TEXT DEFAULT 'German',
    course_level TEXT DEFAULT 'A1',
    resubmission_allowed BOOLEAN NOT NULL DEFAULT true,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for instant lesson lookup
CREATE INDEX IF NOT EXISTS idx_assignments_course_lesson 
ON public.assignments (course_id, module_id, lesson_id, practice_type);

-- 2. ASSIGNMENT SUBMISSIONS TABLE
-- Persists student submissions, written text, uploaded image metadata, and attempts history
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES public.assignments(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    course_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    practice_type TEXT NOT NULL DEFAULT 'writing',
    student_email TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_number TEXT,
    student_text_answer TEXT,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Submitted', -- 'Submitted' | 'Under Review' | 'Reviewed' | 'Revision Requested'
    pages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Storage paths, dimensions, file size (no Base64)
    ai_evaluation JSONB,
    ai_score NUMERIC(5,2),
    ai_feedback TEXT,
    final_score NUMERIC(5,2),
    final_feedback TEXT,
    admin_reviewed_at TIMESTAMPTZ,
    admin_reviewed_by TEXT,
    history JSONB NOT NULL DEFAULT '[]'::jsonb, -- Preserves prior submissions and feedback
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_assignment UNIQUE (student_id, assignment_id)
);

-- Indexes for performance and reporting
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.assignment_submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.assignment_submissions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.assignment_submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_course ON public.assignment_submissions (course_id);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin (hardened search_path & restricted ACL)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (auth.uid()) AND role = 'admin'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, postgres;

-- Assignments RLS:
-- Anyone authenticated can view active assignments
DROP POLICY IF EXISTS "Active assignments are viewable by authenticated users" ON public.assignments;
CREATE POLICY "Active assignments are viewable by authenticated users"
ON public.assignments FOR SELECT
TO authenticated
USING (is_active = true OR public.is_admin());

-- Only admins can insert, update, or delete assignments
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.assignments;
CREATE POLICY "Admins can manage assignments"
ON public.assignments FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Assignment Submissions RLS:
-- Students can only view their own submissions; Admins can view all submissions
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.assignment_submissions;
CREATE POLICY "Users can view their own submissions"
ON public.assignment_submissions FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR public.is_admin());

-- Students can insert or update their own submissions
DROP POLICY IF EXISTS "Students can submit their own assignments" ON public.assignment_submissions;
CREATE POLICY "Students can submit their own assignments"
ON public.assignment_submissions FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update their own submissions or admins review" ON public.assignment_submissions;
CREATE POLICY "Students can update their own submissions or admins review"
ON public.assignment_submissions FOR UPDATE
TO authenticated
USING (student_id = auth.uid() OR public.is_admin())
WITH CHECK (student_id = auth.uid() OR public.is_admin());

-- 4. PRIVATE STORAGE BUCKET CONFIGURATION (Supabase Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignments', 'assignments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage RLS: Students can upload only to their own submission subfolder
DROP POLICY IF EXISTS "Students can upload assignment images" ON storage.objects;
CREATE POLICY "Students can upload assignment images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'assignments' AND
    (storage.foldername(name))[1] = 'submissions' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Students can read their own uploaded files; Admins can read all assignment files
DROP POLICY IF EXISTS "Authorized access to assignment images" ON storage.objects;
CREATE POLICY "Authorized access to assignment images"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'assignments' AND
    (
        ((storage.foldername(name))[1] = 'submissions' AND (storage.foldername(name))[2] = auth.uid()::text)
        OR public.is_admin()
    )
);
