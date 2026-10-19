-- ==============================================================================
-- SpeakUp LMS — Dedicated Server-Only Email Credential Storage & CMS Sanitization
-- Migration File: supabase/migrations/20261016_secure_portal_email_credentials.sql
-- Target: PostgreSQL / Supabase
-- Execution Role: postgres / DBA (DO NOT EXECUTE AUTOMATICALLY — PENDING REVIEW)
--
-- PURPOSE:
--   1. Eliminates Google OAuth refresh token exposure from public.cms_content.
--   2. Creates dedicated, private public.portal_email_credentials table with zero
--      anonymous or client access (accessible strictly by service_role and postgres).
--   3. Updates cms_content RLS policy so that page_key = 'portal_email' cannot be
--      enumerated or read by anonymous callers.
--   4. Safely migrates existing refresh tokens from cms_content into the private table,
--      then sanitizes cms_content JSON columns by stripping access_token and refresh_token.
--
-- ROLLBACK PLAN:
--   Provided at the bottom of this file in comment format.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. CREATE DEDICATED PRIVATE CREDENTIAL TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_email_credentials (
    credential_key TEXT PRIMARY KEY,
    credential_value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure updated_at trigger maintenance
DROP TRIGGER IF EXISTS set_portal_email_credentials_timestamp ON public.portal_email_credentials;
CREATE TRIGGER set_portal_email_credentials_timestamp
    BEFORE UPDATE ON public.portal_email_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 2. STRICT ROW LEVEL SECURITY (ZERO PUBLIC / CLIENT ACCESS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.portal_email_credentials ENABLE ROW LEVEL SECURITY;

-- Revoke all permissions from public, anon, and authenticated users
REVOKE ALL ON TABLE public.portal_email_credentials FROM PUBLIC;
REVOKE ALL ON TABLE public.portal_email_credentials FROM anon;
REVOKE ALL ON TABLE public.portal_email_credentials FROM authenticated;

-- Grant access ONLY to the trusted backend service_role and database superuser
GRANT ALL ON TABLE public.portal_email_credentials TO service_role, postgres;

-- ------------------------------------------------------------------------------
-- 3. HARDEN CMS CONTENT PUBLIC RLS POLICY
-- ------------------------------------------------------------------------------
-- Ensure public visitors cannot read 'portal_email' records from cms_content,
-- preserving public access only for general website pages.
DROP POLICY IF EXISTS "Public can view published CMS content" ON public.cms_content;

CREATE POLICY "Public can view published CMS content"
    ON public.cms_content FOR SELECT
    USING (published_data IS NOT NULL AND page_key != 'portal_email');

-- Admins retain access to all CMS content (including portal_email)
-- Policy "Admins can view all CMS content" remains active and enforces public.is_admin()

-- ------------------------------------------------------------------------------
-- 4. MIGRATE EXISTING CREDENTIALS & SANITIZE CMS CONTENT
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_published JSONB;
    v_draft JSONB;
    v_refresh_token TEXT;
    v_has_token BOOLEAN := FALSE;
    v_rec_id UUID;
BEGIN
    SELECT id, published_data, draft_data
    INTO v_rec_id, v_published, v_draft
    FROM public.cms_content
    WHERE page_key = 'portal_email'
    LIMIT 1;

    IF v_rec_id IS NOT NULL THEN
        -- Check if refresh token exists in published_data or draft_data
        v_refresh_token := COALESCE(
            v_published->'connected_gmail'->>'refresh_token',
            v_draft->'connected_gmail'->>'refresh_token'
        );

        -- Migrate refresh token to dedicated server credential storage
        IF v_refresh_token IS NOT NULL AND length(trim(v_refresh_token)) > 0 THEN
            INSERT INTO public.portal_email_credentials (credential_key, credential_value, updated_at)
            VALUES ('gmail_refresh_token', v_refresh_token, now())
            ON CONFLICT (credential_key) DO NOTHING;
            v_has_token := TRUE;
        END IF;

        -- Check if a valid credential already exists in portal_email_credentials
        IF NOT v_has_token THEN
            SELECT EXISTS (
                SELECT 1 FROM public.portal_email_credentials
                WHERE credential_key = 'gmail_refresh_token'
                  AND length(trim(credential_value)) > 0
            ) INTO v_has_token;
        END IF;

        -- Sanitize published_data by stripping tokens and preserving valid has_refresh_token flag
        IF v_published IS NOT NULL AND v_published ? 'connected_gmail' AND v_published->'connected_gmail' IS NOT NULL THEN
            v_has_token := v_has_token OR COALESCE((v_published->'connected_gmail'->>'has_refresh_token')::boolean, FALSE);
            v_published := jsonb_set(
                v_published,
                '{connected_gmail}',
                (v_published->'connected_gmail') - 'refresh_token' - 'access_token' - 'token_expiry' || jsonb_build_object('has_refresh_token', v_has_token)
            );
        END IF;

        -- Sanitize draft_data by stripping tokens and preserving valid has_refresh_token flag
        IF v_draft IS NOT NULL AND v_draft ? 'connected_gmail' AND v_draft->'connected_gmail' IS NOT NULL THEN
            v_has_token := v_has_token OR COALESCE((v_draft->'connected_gmail'->>'has_refresh_token')::boolean, FALSE);
            v_draft := jsonb_set(
                v_draft,
                '{connected_gmail}',
                (v_draft->'connected_gmail') - 'refresh_token' - 'access_token' - 'token_expiry' || jsonb_build_object('has_refresh_token', v_has_token)
            );
        END IF;

        -- Update cms_content with sanitized payload
        UPDATE public.cms_content
        SET published_data = v_published,
            draft_data = v_draft,
            updated_at = now()
        WHERE id = v_rec_id;
    END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------------------------
-- 5. VERIFICATION QUERY (For manual audit post-execution)
-- ------------------------------------------------------------------------------
-- SELECT credential_key, created_at, updated_at FROM public.portal_email_credentials;
-- SELECT page_key, published_data->'connected_gmail' FROM public.cms_content WHERE page_key = 'portal_email';
-- Check: published_data->'connected_gmail' must NOT contain 'refresh_token' or 'access_token'.

-- ==============================================================================
-- ROLLBACK SCRIPT (Execute only if rolling back this migration):
-- ==============================================================================
-- DROP TABLE IF EXISTS public.portal_email_credentials;
-- DROP POLICY IF EXISTS "Public can view published CMS content" ON public.cms_content;
-- CREATE POLICY "Public can view published CMS content"
--     ON public.cms_content FOR SELECT
--     USING (published_data IS NOT NULL);
-- ==============================================================================
