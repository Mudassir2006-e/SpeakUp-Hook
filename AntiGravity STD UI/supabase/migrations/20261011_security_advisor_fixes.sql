-- ==============================================================================
-- SpeakUp LMS — Supabase Security Advisor Hardening Migration
-- Migration File: 20261011_security_advisor_fixes.sql
-- Target: PostgreSQL / Supabase
-- Description:
--   1. Addresses Supabase Database Linter warning on public.booking_requests INSERT policy.
--   2. Addresses Supabase Database Linter warning on public.reviews INSERT policy.
--   3. Secures and restricts execution privileges on public.rls_auto_enable().
--   4. Hardens public.is_admin() with safe search_path and revokes execute from anon/PUBLIC.
--   5. Restricts general function execution privileges in schema public from untrusted callers.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN public.is_admin() FUNCTION
-- ------------------------------------------------------------------------------
-- Ensure search_path is strictly pinned to prevent Trojan horse object hijacking
-- Schema-qualify all table queries (public.profiles)
-- Revoke execution from PUBLIC and anon, granting solely to authenticated & service_role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$;

-- Revoke default public execution privileges
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, postgres;

COMMENT ON FUNCTION public.is_admin() IS 
'Security Definer administrative authorization checker with immutable search_path and restricted execute privileges.';

-- ------------------------------------------------------------------------------
-- 2. SECURE public.rls_auto_enable()
-- ------------------------------------------------------------------------------
-- Remove execution privileges from untrusted callers (anon, authenticated, PUBLIC)
-- to prevent remote unprivileged invocation through PostgREST RPC endpoints.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
    ) THEN
        EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;';
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role, postgres;';
        EXECUTE 'ALTER FUNCTION public.rls_auto_enable() SET search_path = pg_catalog, public, pg_temp;';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. REVOKE BROAD ROUTINE EXECUTION FROM anon ROLE IN SCHEMA public
-- ------------------------------------------------------------------------------
-- Prevent untrusted anonymous visitors from executing internal routines by default
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- Re-grant required public functions if needed
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. SECURE public.booking_requests (Table & Least-Privilege Policies)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
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

-- Ensure RLS is active
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Drop legacy or overly permissive insert policies
DROP POLICY IF EXISTS "Public can submit booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Allow public insert" ON public.booking_requests;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.booking_requests;
DROP POLICY IF EXISTS "public_booking_insert" ON public.booking_requests;
DROP POLICY IF EXISTS "Public can submit validated booking requests" ON public.booking_requests;

-- Hardened INSERT policy:
-- 1. Keeps legitimate public booking submission functional for visitors.
-- 2. Strictly enforces status = 'pending' on insert (prevents attackers from injecting pre-approved bookings).
-- 3. Validates name, email pattern, phone length, and limits message payload size.
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

-- SELECT Policy: Restricted to verified administrators to protect applicant PII
DROP POLICY IF EXISTS "Admins can view booking requests" ON public.booking_requests;
CREATE POLICY "Admins can view booking requests"
    ON public.booking_requests FOR SELECT
    USING (public.is_admin());

-- UPDATE Policy: Restricted to verified administrators
DROP POLICY IF EXISTS "Admins can update booking requests" ON public.booking_requests;
CREATE POLICY "Admins can update booking requests"
    ON public.booking_requests FOR UPDATE
    USING (public.is_admin());

-- DELETE Policy: Restricted to verified administrators
DROP POLICY IF EXISTS "Admins can delete booking requests" ON public.booking_requests;
CREATE POLICY "Admins can delete booking requests"
    ON public.booking_requests FOR DELETE
    USING (public.is_admin());

-- Explicit privilege grants
GRANT INSERT ON public.booking_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.booking_requests TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. SECURE public.reviews (Table & Least-Privilege Policies)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    review_text TEXT NOT NULL,
    program TEXT NOT NULL DEFAULT 'English Grammar Mastery — A1',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure RLS is active
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Drop legacy or overly permissive policies
DROP POLICY IF EXISTS "Public can submit reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public review insert" ON public.reviews;
DROP POLICY IF EXISTS "Enable insert for reviews" ON public.reviews;
DROP POLICY IF EXISTS "public_review_insert" ON public.reviews;
DROP POLICY IF EXISTS "Public can submit validated student reviews" ON public.reviews;

-- Hardened INSERT policy:
-- 1. Keeps legitimate public student reviews submission functional.
-- 2. Forces status = 'pending' to require administrator moderation before publication.
-- 3. Validates name, email, rating range (1-5), and review text length.
CREATE POLICY "Public can submit validated student reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (
        status = 'pending'
        AND char_length(trim(student_name)) >= 2
        AND char_length(trim(student_name)) <= 100
        AND student_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        AND rating >= 1
        AND rating <= 5
        AND char_length(trim(review_text)) >= 10
        AND char_length(trim(review_text)) <= 3000
        AND (program IS NULL OR char_length(trim(program)) <= 120)
    );

-- SELECT Policy: Public visitors can only view published reviews; Admins can view all
DROP POLICY IF EXISTS "Public can view published reviews or admins view all" ON public.reviews;
DROP POLICY IF EXISTS "Public can view published reviews" ON public.reviews;
CREATE POLICY "Public can view published reviews or admins view all"
    ON public.reviews FOR SELECT
    USING (status = 'published' OR public.is_admin());

-- UPDATE Policy: Restricted to verified administrators
DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;
CREATE POLICY "Admins can update reviews"
    ON public.reviews FOR UPDATE
    USING (public.is_admin());

-- DELETE Policy: Restricted to verified administrators
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
CREATE POLICY "Admins can delete reviews"
    ON public.reviews FOR DELETE
    USING (public.is_admin());

-- Explicit privilege grants
GRANT SELECT, INSERT ON public.reviews TO anon, authenticated;
GRANT UPDATE, DELETE ON public.reviews TO authenticated, service_role;
