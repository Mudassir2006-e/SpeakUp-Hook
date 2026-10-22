-- ==============================================================================
-- SpeakUp LMS — Stage 1: Profiles RLS Recursion Prevention & Privilege Guard
-- Migration File: supabase/migrations/20261017_stage1_profiles_rls_and_privilege_guard.sql
--
-- STATUS: PRODUCTION-SAFE DRAFT SPECIFICATION (Requires manual execution via Supabase SQL Editor)
--
-- SUMMARY OF REMEDIATION (ALIGNED WITH LIVE SCHEMA):
--   1. Eliminates PostgreSQL RLS infinite recursion (error 54001) by construction
--      using short-circuiting CASE statements on public.profiles.
--   2. Preserves administrative authorization for verified administrators (role = 'admin')
--      while locking out explicitly suspended accounts (account_status != 'suspended').
--      Tolerates account_status = 'pending' to prevent locking out the live administrator.
--   3. Sets hardened search_path = pg_catalog, public across all SECURITY DEFINER
--      functions, omitting pg_temp to prevent schema substitution attacks.
--   4. Hardens trg_prevent_profile_role_escalation with a positive trust whitelist
--      (postgres, supabase_admin, supabase_auth_admin, service_role, verified admin).
--   5. Locks down sensitive registration & profile columns: id, role, account_status,
--      created_at, strictly adhering to the deployed schema without referencing
--      nonexistent or unmigrated database columns.
--   6. Enforces email identity protection on INSERT and UPDATE while enabling verified
--      email synchronization via auth.users trigger and verified JWT claim matching.
--   7. Explicitly drops all legacy / conflicting permissive policies to eliminate the
--      PostgreSQL permissive policy OR bypass vulnerability.
--   8. Revokes client-side DELETE on public.profiles from authenticated and anon.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- SECTION 1: HARDENED HELPER FUNCTIONS (Least Privilege & Search Path)
-- ==============================================================================

-- 1.1 Helper: public.is_admin()
-- Determines whether the current authenticated caller is an authorized administrator.
-- Fails closed if auth.uid() is NULL or account is suspended.
-- NOTE FOR OWNER: The live administrator currently has account_status = 'pending'.
-- If administrative access should strictly require verified active status,
-- the administrator's account must first be activated in the Supabase Dashboard
-- before updating this check to require active account activation.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
DECLARE
    v_role TEXT;
    v_account_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT role, account_status INTO v_role, v_account_status
    FROM public.profiles
    WHERE id = auth.uid();

    -- Preserves administrative access for verified administrators while preventing
    -- explicitly suspended administrator accounts from exercising admin privileges.
    RETURN COALESCE(v_role = 'admin' AND v_account_status IS DISTINCT FROM 'suspended', FALSE);
END;
$$;

-- 1.2 Helper: public.get_profile_role(UUID)
-- Returns profile role with strict IDOR protections. Non-admins cannot inspect other users.
CREATE OR REPLACE FUNCTION public.get_profile_role(p_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
DECLARE
    v_role TEXT;
    v_jwt_role TEXT;
BEGIN
    v_jwt_role := COALESCE(auth.jwt() ->> 'role', '');

    -- Allow self-lookup, verified admin, service_role, or database superuser
    IF auth.uid() IS NOT NULL AND p_id <> auth.uid() AND NOT public.is_admin() THEN
        RETURN NULL;
    END IF;

    IF auth.uid() IS NULL AND v_jwt_role <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin', 'supabase_auth_admin') THEN
        RETURN NULL;
    END IF;

    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = p_id;

    RETURN v_role;
END;
$$;

-- 1.3 Helper: public.get_profile_status(UUID)
-- Returns profile account_status with strict IDOR protections.
-- Uses canonical account_status column.
CREATE OR REPLACE FUNCTION public.get_profile_status(p_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
DECLARE
    v_status TEXT;
    v_jwt_role TEXT;
BEGIN
    v_jwt_role := COALESCE(auth.jwt() ->> 'role', '');

    IF auth.uid() IS NOT NULL AND p_id <> auth.uid() AND NOT public.is_admin() THEN
        RETURN NULL;
    END IF;

    IF auth.uid() IS NULL AND v_jwt_role <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin', 'supabase_auth_admin') THEN
        RETURN NULL;
    END IF;

    SELECT account_status INTO v_status
    FROM public.profiles
    WHERE id = p_id;

    RETURN v_status;
END;
$$;

-- 1.4 Canonical Named Alias: public.get_profile_account_status(UUID)
CREATE OR REPLACE FUNCTION public.get_profile_account_status(p_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
BEGIN
    RETURN public.get_profile_status(p_id);
END;
$$;

-- 1.5 Function Grants: Revoke anonymous, public, and untrusted execution
-- Helper functions (get_profile_role, get_profile_status, get_profile_account_status) are restricted
-- strictly to internal service_role and postgres, eliminating both anonymous and authenticated RPC execution.
-- is_admin() is revoked from PUBLIC and anon; authenticated retains EXECUTE strictly for RLS policy evaluation.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public.get_profile_role(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_role(UUID) TO service_role, postgres;

REVOKE ALL ON FUNCTION public.get_profile_status(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_status(UUID) TO service_role, postgres;

REVOKE ALL ON FUNCTION public.get_profile_account_status(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_account_status(UUID) TO service_role, postgres;


-- ==============================================================================
-- SECTION 2: VERIFIED EMAIL SYNCHRONIZATION TRIGGER (auth.users -> public.profiles)
-- ==============================================================================

-- 2.1 Automatically synchronize verified email changes from auth.users to public.profiles.
-- When a user completes the verification OTP flow (supabase.auth.verifyOtp), GoTrue
-- updates auth.users.email. This trigger propagates the update to public.profiles.
CREATE OR REPLACE FUNCTION public.handle_user_email_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        UPDATE public.profiles
        SET email = NEW.email
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    WHEN (NEW.email IS DISTINCT FROM OLD.email)
    EXECUTE FUNCTION public.handle_user_email_change();

-- 2.2 Restrict trigger function execution: Triggers execute under table ownership;
-- direct PostgREST RPC execution from PUBLIC, anon, and authenticated is strictly revoked.
REVOKE ALL ON FUNCTION public.handle_user_email_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_user_email_change() TO service_role, postgres;


-- ==============================================================================
-- SECTION 3: PRIVILEGE ESCALATION, FIELD TAMPERING & EMAIL IDENTITY GUARD
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_jwt_role TEXT;
    v_jwt_email TEXT;
    v_is_trusted BOOLEAN := FALSE;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- Extract verified JWT role claim if present (Supabase PostgREST context)
    v_jwt_role := COALESCE(
        auth.jwt() ->> 'role',
        current_setting('request.jwt.claim.role', true),
        ''
    );

    -- =========================================================================
    -- A. TRUSTED EXECUTION BOUNDARY (DBA, GoTrue Auth Trigger, Backend Service Role)
    -- =========================================================================
    -- CRITICAL SECURITY DEFINER AUDIT RULE:
    -- In PostgreSQL SECURITY DEFINER functions, current_user ALWAYS resolves to
    -- the function owner ('postgres'), regardless of the actual caller.
    -- Therefore, NEVER evaluate current_user to establish trust.
    --
    -- Legitimate trusted contexts are identified strictly by:
    -- 1. Direct superuser/DBA sessions or internal GoTrue Auth engine sessions:
    --    session_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin')
    --    ONLY when NO untrusted client JWT claim is present.
    -- 2. Trusted backend service-role API calls:
    --    v_jwt_role = 'service_role'
    IF (
        (session_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin') AND v_jwt_role NOT IN ('authenticated', 'anon'))
        OR (v_jwt_role = 'service_role')
    ) AND v_jwt_role NOT IN ('authenticated', 'anon') THEN
        v_is_trusted := TRUE;
    END IF;

    -- If not already trusted by execution environment, check if caller is a confirmed admin
    IF NOT v_is_trusted AND v_jwt_role = 'authenticated' THEN
        BEGIN
            v_is_admin := public.is_admin();
        EXCEPTION WHEN OTHERS THEN
            v_is_admin := FALSE; -- Safely fail closed if is_admin() recurs, times out, or fails
        END;
        IF v_is_admin IS TRUE THEN
            v_is_trusted := TRUE;
        END IF;
    END IF;

    -- Trusted operations (GoTrue hooks, service_role server actions, admins) proceed unimpeded
    IF v_is_trusted THEN
        RETURN NEW;
    END IF;

    -- =========================================================================
    -- B. UNTRUSTED CLIENT INSERT VALIDATION (Student Registration Path)
    -- =========================================================================
    IF TG_OP = 'INSERT' THEN
        -- Identity check: caller must be authenticated and inserting their own row
        IF auth.uid() IS NULL OR NEW.id <> auth.uid() THEN
            RAISE EXCEPTION 'Access denied: cannot register profile for another identity.';
        END IF;

        -- Email identity check: if JWT carries an email claim, profile email must match
        v_jwt_email := auth.jwt() ->> 'email';
        IF v_jwt_email IS NOT NULL AND v_jwt_email <> '' THEN
            IF LOWER(NEW.email) IS DISTINCT FROM LOWER(v_jwt_email) THEN
                RAISE EXCEPTION 'Access denied: profile email must match authenticated identity email.';
            END IF;
        END IF;

        -- Role lockdown: untrusted clients can strictly only register as 'student'
        IF NEW.role IS DISTINCT FROM 'student' THEN
            RAISE EXCEPTION 'Access denied: self-assignment of privileged roles is prohibited.';
        END IF;

        -- Account status lockdown: untrusted clients cannot self-approve; must be 'pending'
        IF NEW.account_status IS NULL THEN
            NEW.account_status := 'pending';
        ELSIF NEW.account_status IS DISTINCT FROM 'pending' THEN
            RAISE EXCEPTION 'Access denied: self-registration status must be pending.';
        END IF;

        -- Normalize creation timestamp
        NEW.created_at := NOW();

        RETURN NEW;
    END IF;

    -- =========================================================================
    -- C. UNTRUSTED CLIENT UPDATE VALIDATION (Student Profile Edit Path)
    -- =========================================================================
    IF TG_OP = 'UPDATE' THEN
        -- Identity immutability
        IF NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'Access denied: profile identity ID cannot be altered.';
        END IF;

        -- Email identity protection:
        -- Untrusted clients cannot set an arbitrary email. However, if the user recently
        -- completed verified email change and refreshed their session, allow synchronization
        -- if and only if NEW.email matches their cryptographically verified JWT email claim.
        IF LOWER(NEW.email) IS DISTINCT FROM LOWER(OLD.email) THEN
            v_jwt_email := auth.jwt() ->> 'email';
            IF v_jwt_email IS NULL OR LOWER(NEW.email) IS DISTINCT FROM LOWER(v_jwt_email) THEN
                RAISE EXCEPTION 'Access denied: profile email can only be updated to match the verified account email.';
            END IF;
        END IF;

        -- Privileged role immutability
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Access denied: role modification prohibited.';
        END IF;

        -- Account status immutability: untrusted clients cannot un-suspend or alter account_status
        IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
            RAISE EXCEPTION 'Access denied: status modification prohibited.';
        END IF;

        -- Preserve audit creation timestamp
        NEW.created_at := OLD.created_at;

        -- Legitimate student updates (full_name, avatar_url, phone) proceed
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- 3.1 Restrict trigger function execution: Triggers execute under table ownership;
-- direct PostgREST RPC execution from PUBLIC, anon, and authenticated is strictly revoked.
REVOKE ALL ON FUNCTION public.prevent_profile_role_escalation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_profile_role_escalation() TO service_role, postgres;


-- ==============================================================================
-- SECTION 4: ANTI-RECURSION RLS POLICIES (CASE Short-Circuit Construction)
-- ==============================================================================

-- 4.1 Clean up all historical, studio-template, and conflicting lowercase policies
-- This eliminates the permissive-policy OR bypass vulnerability.
DROP POLICY IF EXISTS "user can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or admins update all" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;

-- Ensure RLS is active on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4.2 Deploy Unified Anti-Recursion SELECT Policy
-- Short-circuits immediately when auth.uid() = id, evaluating to TRUE without calling public.is_admin().
-- When auth.uid() <> id, calls public.is_admin(), whose internal SELECT WHERE id = auth.uid()
-- short-circuits at depth 1, preventing infinite recursion (error 54001) by construction.
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        CASE 
            WHEN auth.uid() = id THEN TRUE 
            ELSE public.is_admin() 
        END
    );

-- 4.3 Deploy Unified INSERT Policy
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        CASE 
            WHEN auth.uid() = id THEN TRUE 
            ELSE public.is_admin() 
        END
    );

-- 4.4 Deploy Unified Anti-Recursion UPDATE Policy
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        CASE 
            WHEN auth.uid() = id THEN TRUE 
            ELSE public.is_admin() 
        END
    )
    WITH CHECK (
        CASE 
            WHEN auth.uid() = id THEN TRUE 
            ELSE public.is_admin() 
        END
    );

-- 4.5 Revoke client-side DELETE on public.profiles (Managed via auth cascade or service_role only)
REVOKE DELETE ON public.profiles FROM authenticated, anon;

COMMIT;


-- ==============================================================================
-- SECTION 5: POST-MIGRATION VALIDATION VERIFICATION QUERIES
-- (Execute in Supabase SQL Editor following migration to verify correct application)
-- ==============================================================================
/*
-- 1. Verify function signatures and search_path hardening:
SELECT proname, prosrc, prosecdef, proconfig
FROM pg_proc
WHERE proname IN ('is_admin', 'get_profile_role', 'get_profile_status', 'prevent_profile_role_escalation');

-- 2. Verify RLS policies on public.profiles:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 3. Verify trigger existence on public.profiles and auth.users:
SELECT tgname, relname, proname
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgname IN ('trg_prevent_profile_role_escalation', 'on_auth_user_email_updated');

-- 4. Verify existing administrator access:
-- Should return TRUE for the live administrator without error:
-- SELECT public.is_admin();
*/


-- ==============================================================================
-- SECTION 6: EMERGENCY RECOVERY RUNBOOK (DO NOT EXECUTE AS PART OF MIGRATION)
-- ==============================================================================
/*
EMERGENCY RECOVERY RUNBOOK:
If public.is_admin() suffers an unexpected failure or regression in live production:
1. DO NOT drop trg_prevent_profile_role_escalation! The trigger preserves role & account_status integrity.
2. In the Supabase Dashboard SQL Editor (Level 3 - runs as postgres), execute the following
   failsafe lockdown policies to restore student access immediately without calling is_admin():

   BEGIN;
   DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
   DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

   CREATE POLICY "profiles_select_policy" ON public.profiles
       FOR SELECT TO authenticated
       USING (auth.uid() = id);

   CREATE POLICY "profiles_update_policy" ON public.profiles
       FOR UPDATE TO authenticated
       USING (auth.uid() = id)
       WITH CHECK (auth.uid() = id);
   COMMIT;

3. While in lockdown, active students can log in and update their personal details without issue.
   Client-side administrative access to other users' profiles is temporarily suspended.
4. Database owners (postgres) and backend operations (service_role) retain full access.
5. Once public.is_admin() is repaired, re-apply Section 4 to restore normal administrative operations.
*/
