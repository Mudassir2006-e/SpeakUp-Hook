-- ==============================================================================
-- SpeakUp LMS — Application Security Hardening Migration (Decoupled Architecture)
-- Migration File: 20261011_security_advisor_fixes.sql
-- Target: PostgreSQL / Supabase
-- Execution Role: postgres (Standard DBA / Supabase Dashboard SQL Editor)
-- Description:
--   1. Hardens public.is_admin() with immutable search_path (pg_catalog, public)
--      without pg_temp, and revokes execute from anon/PUBLIC.
--   2. Preserves public schema usage for all standard application roles.
--   3. Decouples public viewing policies from is_admin() across courses, cms_content, and reviews.
--   4. Reconciles schema columns, safely drops legacy NOT NULL constraints on
--      historical columns (first_name, last_name, name, email), and backfills records.
--   5. Aligns review validation with form behavior (minimum 3 trimmed characters).
--   6. Explicitly drops permissive policies ("Anyone can submit...") to prevent OR bypass.
--   7. Implements least-privilege table grants protecting applicant PII and moderation queues.
--
-- Note: Platform-level event trigger hardening (public.rls_auto_enable) is intentionally
--       decoupled into supabase/DBA_RLS_AUTO_ENABLE_RUNBOOK.md for elevated administrator execution.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN public.is_admin() FUNCTION
-- ------------------------------------------------------------------------------
-- Pinned search_path excludes pg_temp to prevent temporary schema search-path hijacking (CVE-2018-1058).
-- All database references (auth.uid(), public.profiles) are strictly schema-qualified.
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

-- Revoke execute from untrusted roles; preserve for authenticated users and database engine
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, postgres;

COMMENT ON FUNCTION public.is_admin() IS 
'Security Definer administrative authorization checker with immutable search_path (pg_catalog, public) and restricted execute privileges.';

-- ------------------------------------------------------------------------------
-- 2. PRESERVE PUBLIC SCHEMA USAGE
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. DECOUPLE public.courses POLICIES (PREVENT ANONYMOUS is_admin() DEPENDENCY)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Public can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON public.courses;

-- Public and students can view ONLY published courses (zero reference to is_admin())
CREATE POLICY "Public can view published courses"
    ON public.courses FOR SELECT
    USING (is_published = true);

-- Authenticated administrators can view ALL courses (including drafts)
CREATE POLICY "Admins can view all courses"
    ON public.courses FOR SELECT
    TO authenticated
    USING (public.is_admin());

GRANT SELECT ON public.courses TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. DECOUPLE public.cms_content POLICIES (PREVENT ANONYMOUS is_admin() DEPENDENCY)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view published CMS content" ON public.cms_content;
DROP POLICY IF EXISTS "Public can view published CMS content" ON public.cms_content;
DROP POLICY IF EXISTS "Admins can view all CMS content" ON public.cms_content;

-- Public visitors can view ONLY published CMS data (zero reference to is_admin())
CREATE POLICY "Public can view published CMS content"
    ON public.cms_content FOR SELECT
    USING (published_data IS NOT NULL);

-- Authenticated administrators can view ALL CMS content (including drafts)
CREATE POLICY "Admins can view all CMS content"
    ON public.cms_content FOR SELECT
    TO authenticated
    USING (public.is_admin());

GRANT SELECT ON public.cms_content TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 5. SECURE public.booking_requests (Table, Columns & Least-Privilege Policies)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT,
    email TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT '+92',
    phone TEXT NOT NULL,
    network TEXT,
    professional_status TEXT DEFAULT 'professional',
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure expected columns exist on pre-existing live table without failing on NOT NULL
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT '+92';
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS network TEXT;
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS professional_status TEXT DEFAULT 'professional';
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Safely drop legacy NOT NULL constraints on legacy columns to prevent 23502 errors when application inserts full_name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'first_name'
    ) THEN
        ALTER TABLE public.booking_requests ALTER COLUMN first_name DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'last_name'
    ) THEN
        ALTER TABLE public.booking_requests ALTER COLUMN last_name DROP NOT NULL;
    END IF;
END $$;

-- Safely backfill full_name from legacy first_name / last_name if present (Dynamic SQL prevents 42703 errors)
DO $$
DECLARE
    has_first BOOLEAN;
    has_last BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'first_name'
    ) INTO has_first;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'last_name'
    ) INTO has_last;

    IF has_first AND has_last THEN
        EXECUTE 'UPDATE public.booking_requests
                 SET full_name = TRIM(CONCAT(COALESCE(first_name, ''''), '' '', COALESCE(last_name, '''')))
                 WHERE (full_name IS NULL OR full_name = '''') 
                   AND (first_name IS NOT NULL OR last_name IS NOT NULL);';
    ELSIF has_first THEN
        EXECUTE 'UPDATE public.booking_requests
                 SET full_name = TRIM(first_name)
                 WHERE (full_name IS NULL OR full_name = '''') AND first_name IS NOT NULL;';
    ELSIF has_last THEN
        EXECUTE 'UPDATE public.booking_requests
                 SET full_name = TRIM(last_name)
                 WHERE (full_name IS NULL OR full_name = '''') AND last_name IS NOT NULL;';
    END IF;
END $$;

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Explicitly drop the actual live policy and all legacy/permissive variants
DROP POLICY IF EXISTS "Anyone can submit booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Public can submit booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Allow public insert" ON public.booking_requests;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.booking_requests;
DROP POLICY IF EXISTS "public_booking_insert" ON public.booking_requests;
DROP POLICY IF EXISTS "Public can submit validated booking requests" ON public.booking_requests;

-- Hardened INSERT policy:
-- 1. Keeps legitimate public booking submission functional for visitors.
-- 2. Strictly enforces status = 'pending' on insert (prevents attackers from injecting pre-approved bookings).
-- 3. Validates name length (2-100), RFC email syntax, numeric phone length (5-30), and limits message size.
CREATE POLICY "Public can submit validated booking requests"
    ON public.booking_requests FOR INSERT
    WITH CHECK (
        status = 'pending'
        AND char_length(trim(full_name)) >= 2
        AND char_length(trim(full_name)) <= 100
        AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        AND char_length(trim(phone)) >= 5
        AND char_length(trim(phone)) <= 30
        AND (message IS NULL OR char_length(message) <= 2000)
    );

-- SELECT Policy: Restricted strictly to verified administrators to protect applicant PII
DROP POLICY IF EXISTS "Anyone can view booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.booking_requests;
DROP POLICY IF EXISTS "Allow public read" ON public.booking_requests;
DROP POLICY IF EXISTS "Admins can view booking requests" ON public.booking_requests;

CREATE POLICY "Admins can view booking requests"
    ON public.booking_requests FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- UPDATE Policy: Restricted strictly to verified administrators
DROP POLICY IF EXISTS "Admins can update booking requests" ON public.booking_requests;
CREATE POLICY "Admins can update booking requests"
    ON public.booking_requests FOR UPDATE
    TO authenticated
    USING (public.is_admin());

-- DELETE Policy: Restricted strictly to verified administrators
DROP POLICY IF EXISTS "Admins can delete booking requests" ON public.booking_requests;
CREATE POLICY "Admins can delete booking requests"
    ON public.booking_requests FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Explicit privilege grants (Least-Privilege Defense-in-Depth)
REVOKE ALL ON public.booking_requests FROM PUBLIC;
REVOKE ALL ON public.booking_requests FROM anon;
GRANT INSERT ON public.booking_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.booking_requests TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. SECURE public.reviews (Table, Columns & Decoupled Policies)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT,
    student_email TEXT,
    rating INTEGER NOT NULL DEFAULT 5,
    review_text TEXT NOT NULL,
    program TEXT NOT NULL DEFAULT 'English Grammar Mastery — A1',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure expected columns exist on pre-existing live table without failing on NOT NULL
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS student_email TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS program TEXT NOT NULL DEFAULT 'English Grammar Mastery — A1';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Safely drop legacy NOT NULL constraints on legacy columns to prevent 23502 errors when application inserts student_name/student_email
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'name'
    ) THEN
        ALTER TABLE public.reviews ALTER COLUMN name DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'email'
    ) THEN
        ALTER TABLE public.reviews ALTER COLUMN email DROP NOT NULL;
    END IF;
END $$;

-- Safely backfill student_name and student_email from legacy columns if present (Dynamic SQL prevents 42703 errors)
DO $$
DECLARE
    has_name BOOLEAN;
    has_email BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'name'
    ) INTO has_name;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'email'
    ) INTO has_email;

    IF has_name THEN
        EXECUTE 'UPDATE public.reviews
                 SET student_name = name
                 WHERE (student_name IS NULL OR student_name = '''') AND name IS NOT NULL;';
    END IF;

    IF has_email THEN
        EXECUTE 'UPDATE public.reviews
                 SET student_email = email
                 WHERE (student_email IS NULL OR student_email = '''') AND email IS NOT NULL;';
    END IF;
END $$;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Explicitly drop the actual live policy and all legacy/permissive variants
DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public can submit reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public review insert" ON public.reviews;
DROP POLICY IF EXISTS "Enable insert for reviews" ON public.reviews;
DROP POLICY IF EXISTS "public_review_insert" ON public.reviews;
DROP POLICY IF EXISTS "Public can submit validated student reviews" ON public.reviews;

-- Hardened INSERT policy:
-- 1. Keeps legitimate public student reviews submission functional.
-- 2. Forces status = 'pending' to require administrator moderation before publication.
-- 3. Validates name length (2-100), email pattern, rating boundaries (1-5), and review text length (3-3000 chars, non-whitespace).
CREATE POLICY "Public can submit validated student reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (
        status = 'pending'
        AND char_length(trim(student_name)) >= 2
        AND char_length(trim(student_name)) <= 100
        AND student_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        AND rating >= 1
        AND rating <= 5
        AND char_length(trim(review_text)) >= 3
        AND char_length(trim(review_text)) <= 3000
        AND (program IS NULL OR char_length(trim(program)) <= 120)
    );

-- Decoupled SELECT Policies:
DROP POLICY IF EXISTS "Anyone can view published reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public can view published reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public can view published reviews or admins view all" ON public.reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.reviews;

-- 1. Public visitors can view ONLY published reviews (zero reference to is_admin())
CREATE POLICY "Public can view published reviews"
    ON public.reviews FOR SELECT
    USING (status = 'published');

-- 2. Authenticated administrators can view ALL reviews (pending, accepted, rejected)
CREATE POLICY "Admins can view all reviews"
    ON public.reviews FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- UPDATE Policy: Restricted strictly to verified administrators
DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;
CREATE POLICY "Admins can update reviews"
    ON public.reviews FOR UPDATE
    TO authenticated
    USING (public.is_admin());

-- DELETE Policy: Restricted strictly to verified administrators
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
CREATE POLICY "Admins can delete reviews"
    ON public.reviews FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Explicit privilege grants (Least-Privilege Defense-in-Depth & Reviewer Privacy)
-- Strips all inherited/table-level permissions from untrusted roles and restricts SELECT
-- on anon and authenticated to public testimonial columns, preventing student_email scraping.
REVOKE ALL ON public.reviews FROM PUBLIC;
REVOKE ALL ON public.reviews FROM anon, authenticated;
GRANT INSERT ON public.reviews TO anon, authenticated;
GRANT SELECT (id, student_name, rating, review_text, program, status, created_at, published_at) ON public.reviews TO anon, authenticated;
GRANT UPDATE, DELETE ON public.reviews TO authenticated, service_role;
GRANT ALL ON public.reviews TO service_role;
