-- ==============================================================================
-- SpeakUp LMS — Supabase Storage Provisioning Migration
-- Migration File: supabase/migrations/20261012_storage_buckets.sql
-- Target: PostgreSQL / Supabase Storage (storage.buckets, storage.objects)
-- Execution Role: postgres / service_role
-- Description:
--   1. Provisions the public 'avatars' bucket for student and admin profile pictures.
--   2. Ensures the private 'assignments' bucket is configured for student submissions.
--   3. Configures least-privilege Row Level Security (RLS) policies for both buckets.
--   4. Fully idempotent: safe to run multiple times without errors or duplicate policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PUBLIC AVATARS BUCKET PROVISIONING
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5 MB max per avatar
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Enable RLS on storage.objects (standard in Supabase)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Avatars RLS: Public read access for profile display across website and LMS
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Avatars RLS: Authenticated users can upload avatars (scoped to their own student filename or user folder, or admin)
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND (
        name LIKE ('student_' || auth.uid()::text || '_%')
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_admin()
    )
);

-- Avatars RLS: Authenticated users can update/overwrite only their own avatars
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND (
        name LIKE ('student_' || auth.uid()::text || '_%')
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR owner = auth.uid()
        OR public.is_admin()
    )
)
WITH CHECK (
    bucket_id = 'avatars' AND (
        name LIKE ('student_' || auth.uid()::text || '_%')
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR owner = auth.uid()
        OR public.is_admin()
    )
);

-- Avatars RLS: Authenticated users can delete only their own avatars
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND (
        name LIKE ('student_' || auth.uid()::text || '_%')
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR owner = auth.uid()
        OR public.is_admin()
    )
);

-- ------------------------------------------------------------------------------
-- 2. PRIVATE ASSIGNMENTS BUCKET PROVISIONING
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'assignments',
    'assignments',
    false, -- Strictly private; access requires signed URLs or admin session
    10485760, -- 10 MB max per page image
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Assignments RLS: Students can upload only to their own submission subfolder
DROP POLICY IF EXISTS "Students can upload assignment images" ON storage.objects;
CREATE POLICY "Students can upload assignment images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'assignments' AND
    (storage.foldername(name))[1] = 'submissions' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Assignments RLS: Students can read their own files; Admins can read all assignments
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

-- Assignments RLS: Admins can update/delete assignment files (for grading or moderation)
DROP POLICY IF EXISTS "Admins can manage assignment images" ON storage.objects;
CREATE POLICY "Admins can manage assignment images"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'assignments' AND public.is_admin()
)
WITH CHECK (
    bucket_id = 'assignments' AND public.is_admin()
);
