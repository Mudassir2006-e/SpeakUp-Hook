-- ==============================================================================
-- SpeakUp LMS — SQL Migration: Methodology Media, Course Media & CMS Revisions
-- Migration: 20261007_methodology_and_course_media.sql
-- Description: Supports methodology showcase images, course thumbnails,
--              CMS revert revision tracking, and Supabase storage security.
-- ==============================================================================

-- 1. METHODOLOGY MEDIA TABLE (Requirement 18)
CREATE TABLE IF NOT EXISTS public.methodology_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_url TEXT NOT NULL,
    caption TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_methodology_media_order ON public.methodology_media (display_order ASC);

-- Automatic updated_at trigger
DROP TRIGGER IF EXISTS set_methodology_media_timestamp ON public.methodology_media;
CREATE TRIGGER set_methodology_media_timestamp 
BEFORE UPDATE ON public.methodology_media 
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. COURSE MEDIA TABLE (Requirement 18)
CREATE TABLE IF NOT EXISTS public.course_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    course_slug TEXT,
    media_type TEXT NOT NULL DEFAULT 'thumbnail',
    media_url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_media_slug ON public.course_media (course_slug);

DROP TRIGGER IF EXISTS set_course_media_timestamp ON public.course_media;
CREATE TRIGGER set_course_media_timestamp 
BEFORE UPDATE ON public.course_media 
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. CMS REVISIONS TABLE (Requirements 16, 17, 18)
CREATE TABLE IF NOT EXISTS public.cms_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_key TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    revision_type TEXT NOT NULL DEFAULT 'published', -- 'draft', 'published', 'reverted'
    content_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_revisions_page ON public.cms_revisions (page_key, version DESC);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES (Requirements 19, 22)
ALTER TABLE public.methodology_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_revisions ENABLE ROW LEVEL SECURITY;

-- Methodology Media: Public can read published images; Admins have full access
DROP POLICY IF EXISTS "Public can view published methodology media" ON public.methodology_media;
CREATE POLICY "Public can view published methodology media"
    ON public.methodology_media FOR SELECT
    USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage methodology media" ON public.methodology_media;
CREATE POLICY "Admins can manage methodology media"
    ON public.methodology_media FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Course Media: Public can view published media; Admins manage
DROP POLICY IF EXISTS "Public can view published course media" ON public.course_media;
CREATE POLICY "Public can view published course media"
    ON public.course_media FOR SELECT
    USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage course media" ON public.course_media;
CREATE POLICY "Admins can manage course media"
    ON public.course_media FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- CMS Revisions: Admins only
DROP POLICY IF EXISTS "Admins can access CMS revisions" ON public.cms_revisions;
CREATE POLICY "Admins can access CMS revisions"
    ON public.cms_revisions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 5. STORAGE BUCKET POLICIES (Requirement 19)
-- Ensure 'website_assets' storage bucket exists and is secure
INSERT INTO storage.buckets (id, name, public)
VALUES ('website_assets', 'website_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read assets
DROP POLICY IF EXISTS "Public read access to website assets" ON storage.objects;
CREATE POLICY "Public read access to website assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'website_assets');

-- Admins can upload, modify, and delete assets
DROP POLICY IF EXISTS "Admins can upload website assets" ON storage.objects;
CREATE POLICY "Admins can upload website assets"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'website_assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update website assets" ON storage.objects;
CREATE POLICY "Admins can update website assets"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'website_assets' AND public.is_admin())
    WITH CHECK (bucket_id = 'website_assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete website assets" ON storage.objects;
CREATE POLICY "Admins can delete website assets"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'website_assets' AND public.is_admin());
