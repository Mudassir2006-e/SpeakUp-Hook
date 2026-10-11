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
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$;

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
CREATE POLICY "Anyone can view published courses"
    ON public.courses FOR SELECT
    USING (is_published = true OR public.is_admin());

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
CREATE POLICY "Anyone can view published CMS content"
    ON public.cms_content FOR SELECT
    USING (published_data IS NOT NULL OR public.is_admin());

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
-- 12. PERMISSIONS GRANTS (anon, authenticated, service_role)
-- Grants PostgreSQL role access so RLS can control individual row access
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

