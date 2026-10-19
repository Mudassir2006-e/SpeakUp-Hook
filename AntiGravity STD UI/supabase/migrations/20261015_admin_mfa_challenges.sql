-- ==============================================================================
-- SpeakUp LMS — Dedicated Private Table for Admin MFA Challenges
-- Migration File: supabase/migrations/20261015_admin_mfa_challenges.sql
-- Target: PostgreSQL / Supabase
-- Execution Role: postgres / DBA
-- Description:
--   1. Creates dedicated, private storage for admin email MFA verification challenges.
--   2. Enforces RLS with ZERO access for anon and authenticated clients.
--   3. Accessible strictly via backend service-role (createAdminClient) and postgres.
--   4. Eliminates reliance on public cms_content for challenge persistence.
--   5. Supports atomic single-use code consumption and per-admin concurrency isolation.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.admin_mfa_challenges (
    admin_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    hashed_code TEXT NOT NULL,
    salt TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts_left INT NOT NULL DEFAULT 5,
    resend_available_at TIMESTAMPTZ NOT NULL,
    target_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for expiration cleanup queries
CREATE INDEX IF NOT EXISTS idx_admin_mfa_challenges_expires_at 
    ON public.admin_mfa_challenges (expires_at);

-- ------------------------------------------------------------------------------
-- 1. STRICT ROW LEVEL SECURITY & LEAST-PRIVILEGE ACCESS
-- ------------------------------------------------------------------------------
ALTER TABLE public.admin_mfa_challenges ENABLE ROW LEVEL SECURITY;

-- Revoke all direct permissions from public, anon, and authenticated users
REVOKE ALL ON TABLE public.admin_mfa_challenges FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_mfa_challenges FROM anon;
REVOKE ALL ON TABLE public.admin_mfa_challenges FROM authenticated;

-- Grant access ONLY to the trusted service_role and database superuser
GRANT ALL ON TABLE public.admin_mfa_challenges TO service_role, postgres;

-- ------------------------------------------------------------------------------
-- 2. ATOMIC VERIFICATION AND SINGLE-USE CONSUMPTION FUNCTION
-- ------------------------------------------------------------------------------
-- Atomically decrements attempts or consumes the challenge in a single transaction,
-- eliminating read-modify-write race conditions under concurrent requests.
CREATE OR REPLACE FUNCTION public.consume_admin_mfa_attempt(
    p_admin_id UUID,
    p_success BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_rec RECORD;
BEGIN
    SELECT * INTO v_rec
    FROM public.admin_mfa_challenges
    WHERE admin_id = p_admin_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active challenge found.');
    END IF;

    IF now() > v_rec.expires_at THEN
        DELETE FROM public.admin_mfa_challenges WHERE admin_id = p_admin_id;
        RETURN jsonb_build_object('success', false, 'error', 'Verification code has expired. Please request a new code.');
    END IF;

    IF p_success THEN
        -- Single-use: delete challenge immediately upon successful match
        DELETE FROM public.admin_mfa_challenges WHERE admin_id = p_admin_id;
        RETURN jsonb_build_object('success', true);
    ELSE
        -- Incorrect attempt: decrement atomically
        IF v_rec.attempts_left <= 1 THEN
            DELETE FROM public.admin_mfa_challenges WHERE admin_id = p_admin_id;
            RETURN jsonb_build_object('success', false, 'error', 'Maximum verification attempts exceeded. Please request a new code.');
        ELSE
            UPDATE public.admin_mfa_challenges
            SET attempts_left = attempts_left - 1,
                updated_at = now()
            WHERE admin_id = p_admin_id;
            RETURN jsonb_build_object('success', false, 'attempts_left', v_rec.attempts_left - 1);
        END IF;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_admin_mfa_attempt(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_admin_mfa_attempt(UUID, BOOLEAN) FROM anon;
REVOKE ALL ON FUNCTION public.consume_admin_mfa_attempt(UUID, BOOLEAN) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_admin_mfa_attempt(UUID, BOOLEAN) TO service_role, postgres;

COMMENT ON TABLE public.admin_mfa_challenges IS
'Dedicated private storage for administrative email MFA challenges. Accessible strictly by service_role.';

-- ==============================================================================
-- ROLLBACK INSTRUCTIONS (FOR DBA):
-- To revert this migration:
--   DROP FUNCTION IF EXISTS public.consume_admin_mfa_attempt(UUID, BOOLEAN);
--   DROP TABLE IF EXISTS public.admin_mfa_challenges;
-- ==============================================================================

