-- ==============================================================================
-- SpeakUp LMS — Supabase Database Architecture & Security Schema
-- Target: PostgreSQL / Supabase
-- Description: Foundation schema for profiles, courses, enrollments, modules,
--              lessons, and Draft-to-Publish CMS engine.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CUSTOM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE enrollment_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE video_source_type AS ENUM ('youtube', 'google_drive', 'hosted', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE
-- Extends Supabase auth.users with application-specific role and identity data
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if public.profiles already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

-- 4. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    level TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. COURSE ENROLLMENTS TABLE (Explicit Course-Access Association)
-- A registered student is NOT automatically enrolled. Each course requires an approved record.
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    status enrollment_status NOT NULL DEFAULT 'pending',
    receipt_tid TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejected_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_course_enrollment UNIQUE (user_id, course_id)
);

-- Ensure user_id and all essential columns exist if public.course_enrollments was pre-created in Supabase
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS status enrollment_status NOT NULL DEFAULT 'pending';
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS receipt_tid TEXT;
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS duration_months INTEGER NOT NULL DEFAULT 3;
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 6. MODULES TABLE
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

-- 7. LESSONS TABLE
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    video_url TEXT,
    video_source video_source_type DEFAULT 'youtube',
    notes TEXT,
    practice_content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE;

-- 8. CMS CONTENT TABLE (Draft -> Review -> Publish Workflow)
CREATE TABLE IF NOT EXISTS public.cms_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_key TEXT NOT NULL UNIQUE,
    draft_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    published_data JSONB,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 9. AUTOMATIC TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_timestamp ON public.profiles;
CREATE TRIGGER set_profiles_timestamp BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_courses_timestamp ON public.courses;
CREATE TRIGGER set_courses_timestamp BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_course_enrollments_timestamp ON public.course_enrollments;
CREATE TRIGGER set_course_enrollments_timestamp BEFORE UPDATE ON public.course_enrollments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_modules_timestamp ON public.modules;
CREATE TRIGGER set_modules_timestamp BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_lessons_timestamp ON public.lessons;
CREATE TRIGGER set_lessons_timestamp BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_content_timestamp ON public.cms_content;
CREATE TRIGGER set_cms_content_timestamp BEFORE UPDATE ON public.cms_content FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. AUTH PROFILE CREATION TRIGGER
-- Whenever a user signs up via Supabase Auth, a corresponding profile is automatically created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, avatar_url, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Registered Student'),
        'student',
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;

-- Helper security definer function to check if current user is an admin without recursion
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

-- --- PROFILES POLICIES ---
-- Users can view their own profile; Admins can view all profiles
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admins view all"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

-- Users can update their own profile; Admins can update any profile
DROP POLICY IF EXISTS "Users can update own profile or admins update all" ON public.profiles;
CREATE POLICY "Users can update own profile or admins update all"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

-- Only admins can delete profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
    ON public.profiles FOR DELETE
    USING (public.is_admin());

-- --- COURSES POLICIES ---
-- Anyone (students & public) can view published courses; Admins can view all courses
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Public can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON public.courses;

CREATE POLICY "Public can view published courses"
    ON public.courses FOR SELECT
    USING (is_published = true);

CREATE POLICY "Admins can view all courses"
    ON public.courses FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Only admins can insert, update, delete courses
DROP POLICY IF EXISTS "Admins can insert courses" ON public.courses;
CREATE POLICY "Admins can insert courses"
    ON public.courses FOR INSERT
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update courses" ON public.courses;
CREATE POLICY "Admins can update courses"
    ON public.courses FOR UPDATE
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;
CREATE POLICY "Admins can delete courses"
    ON public.courses FOR DELETE
    USING (public.is_admin());

-- --- COURSE ENROLLMENTS POLICIES ---
-- Students can only view their own enrollments; Admins can view all
DROP POLICY IF EXISTS "Students view own enrollments or admins view all" ON public.course_enrollments;
CREATE POLICY "Students view own enrollments or admins view all"
    ON public.course_enrollments FOR SELECT
    USING (auth.uid() = course_enrollments.user_id OR public.is_admin());

-- Students can insert a course access request for themselves with 'pending' status; Admins can create any enrollment
DROP POLICY IF EXISTS "Students can request course access or admins can grant" ON public.course_enrollments;
CREATE POLICY "Students can request course access or admins can grant"
    ON public.course_enrollments FOR INSERT
    WITH CHECK (
        (auth.uid() = course_enrollments.user_id AND status = 'pending')
        OR public.is_admin()
    );

-- Only admins can update enrollment status (Approve, Reject, Revoke)
DROP POLICY IF EXISTS "Admins can update course enrollments" ON public.course_enrollments;
CREATE POLICY "Admins can update course enrollments"
    ON public.course_enrollments FOR UPDATE
    USING (public.is_admin());

-- Only admins can delete course enrollments
DROP POLICY IF EXISTS "Admins can delete course enrollments" ON public.course_enrollments;
CREATE POLICY "Admins can delete course enrollments"
    ON public.course_enrollments FOR DELETE
    USING (public.is_admin());

-- --- MODULES POLICIES ---
-- Students can view modules ONLY IF they have an approved enrollment in the course; Admins can view all
DROP POLICY IF EXISTS "Enrolled students or admins can view modules" ON public.modules;
CREATE POLICY "Enrolled students or admins can view modules"
    ON public.modules FOR SELECT
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.course_enrollments
            WHERE course_enrollments.course_id = modules.course_id
              AND course_enrollments.user_id = auth.uid()
              AND course_enrollments.status = 'approved'
        )
    );

DROP POLICY IF EXISTS "Admins can insert modules" ON public.modules;
CREATE POLICY "Admins can insert modules"
    ON public.modules FOR INSERT
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update modules" ON public.modules;
CREATE POLICY "Admins can update modules"
    ON public.modules FOR UPDATE
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete modules" ON public.modules;
CREATE POLICY "Admins can delete modules"
    ON public.modules FOR DELETE
    USING (public.is_admin());

-- --- LESSONS POLICIES ---
-- Students can view lessons ONLY IF they have an approved enrollment in the course owning the module; Admins view all
DROP POLICY IF EXISTS "Enrolled students or admins can view lessons" ON public.lessons;
CREATE POLICY "Enrolled students or admins can view lessons"
    ON public.lessons FOR SELECT
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.modules
            JOIN public.course_enrollments ON course_enrollments.course_id = modules.course_id
            WHERE modules.id = lessons.module_id
              AND course_enrollments.user_id = auth.uid()
              AND course_enrollments.status = 'approved'
        )
    );

DROP POLICY IF EXISTS "Admins can insert lessons" ON public.lessons;
CREATE POLICY "Admins can insert lessons"
    ON public.lessons FOR INSERT
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update lessons" ON public.lessons;
CREATE POLICY "Admins can update lessons"
    ON public.lessons FOR UPDATE
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete lessons" ON public.lessons;
CREATE POLICY "Admins can delete lessons"
    ON public.lessons FOR DELETE
    USING (public.is_admin());

-- --- CMS CONTENT POLICIES ---
-- Anyone can view published CMS data
DROP POLICY IF EXISTS "Anyone can view published CMS content" ON public.cms_content;
DROP POLICY IF EXISTS "Public can view published CMS content" ON public.cms_content;
DROP POLICY IF EXISTS "Admins can view all CMS content" ON public.cms_content;

CREATE POLICY "Public can view published CMS content"
    ON public.cms_content FOR SELECT
    USING (published_data IS NOT NULL);

CREATE POLICY "Admins can view all CMS content"
    ON public.cms_content FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Only admins can insert, update, or publish CMS content
DROP POLICY IF EXISTS "Admins can insert CMS content" ON public.cms_content;
CREATE POLICY "Admins can insert CMS content"
    ON public.cms_content FOR INSERT
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update CMS content" ON public.cms_content;
CREATE POLICY "Admins can update CMS content"
    ON public.cms_content FOR UPDATE
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete CMS content" ON public.cms_content;
CREATE POLICY "Admins can delete CMS content"
    ON public.cms_content FOR DELETE
    USING (public.is_admin());

-- --- EMAIL TEMPLATES & LOGS POLICIES (Phase 5: Email Center) ---
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    resend_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view email templates" ON public.email_templates;
CREATE POLICY "Admins can view email templates" ON public.email_templates FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert email templates" ON public.email_templates;
CREATE POLICY "Admins can insert email templates" ON public.email_templates FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update email templates" ON public.email_templates;
CREATE POLICY "Admins can update email templates" ON public.email_templates FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete email templates" ON public.email_templates;
CREATE POLICY "Admins can delete email templates" ON public.email_templates FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view email logs" ON public.email_logs;
CREATE POLICY "Admins can view email logs" ON public.email_logs FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert email logs" ON public.email_logs;
CREATE POLICY "Admins can insert email logs" ON public.email_logs FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update email logs" ON public.email_logs;
CREATE POLICY "Admins can update email logs" ON public.email_logs FOR UPDATE USING (public.is_admin());

-- ==============================================================================
-- --- 12. BOOKING REQUESTS (Advisory Sessions) ---
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

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Ensure columns exist if public.booking_requests pre-existed in live database
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

DROP POLICY IF EXISTS "Anyone can submit booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Public can submit booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Allow public insert" ON public.booking_requests;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.booking_requests;
DROP POLICY IF EXISTS "public_booking_insert" ON public.booking_requests;
DROP POLICY IF EXISTS "Public can submit validated booking requests" ON public.booking_requests;
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

DROP POLICY IF EXISTS "Admins can view booking requests" ON public.booking_requests;
CREATE POLICY "Admins can view booking requests"
    ON public.booking_requests FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update booking requests" ON public.booking_requests;
CREATE POLICY "Admins can update booking requests"
    ON public.booking_requests FOR UPDATE
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete booking requests" ON public.booking_requests;
CREATE POLICY "Admins can delete booking requests"
    ON public.booking_requests FOR DELETE
    TO authenticated
    USING (public.is_admin());

REVOKE ALL ON public.booking_requests FROM PUBLIC;
REVOKE ALL ON public.booking_requests FROM anon;
GRANT INSERT ON public.booking_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.booking_requests TO authenticated, service_role;

-- --- 13. REVIEWS & TESTIMONIALS ---
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

-- Ensure columns exist if public.reviews pre-existed in live database
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

DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public can submit reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public review insert" ON public.reviews;
DROP POLICY IF EXISTS "Enable insert for reviews" ON public.reviews;
DROP POLICY IF EXISTS "public_review_insert" ON public.reviews;
DROP POLICY IF EXISTS "Public can submit validated student reviews" ON public.reviews;
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

DROP POLICY IF EXISTS "Anyone can view published reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public can view published reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public can view published reviews or admins view all" ON public.reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.reviews;

CREATE POLICY "Public can view published reviews"
    ON public.reviews FOR SELECT
    USING (status = 'published');

CREATE POLICY "Admins can view all reviews"
    ON public.reviews FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;
CREATE POLICY "Admins can update reviews"
    ON public.reviews FOR UPDATE
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
CREATE POLICY "Admins can delete reviews"
    ON public.reviews FOR DELETE
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

-- ==============================================================================
-- 14. PERMISSIONS GRANTS (anon, authenticated, service_role)
-- Grants PostgreSQL role access so RLS can control individual row access
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- Re-enforce sensitive table restrictions after blanket schema grants
REVOKE ALL ON public.booking_requests FROM PUBLIC, anon;
GRANT INSERT ON public.booking_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.booking_requests TO authenticated, service_role;

REVOKE ALL ON public.reviews FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.reviews TO anon, authenticated;
GRANT SELECT (id, student_name, rating, review_text, program, status, created_at, published_at) ON public.reviews TO anon, authenticated;
GRANT UPDATE, DELETE ON public.reviews TO authenticated, service_role;
GRANT ALL ON public.reviews TO service_role;


