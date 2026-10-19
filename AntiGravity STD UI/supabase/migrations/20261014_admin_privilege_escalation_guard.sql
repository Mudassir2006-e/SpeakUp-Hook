-- ==============================================================================
-- SpeakUp LMS — Administrator Authorization Hardening & Privilege Escalation Guard
-- Migration File: supabase/migrations/20261014_admin_privilege_escalation_guard.sql
-- Target: PostgreSQL / Supabase
-- Execution Role: postgres / DBA
-- Description:
--   1. Documents and hardens public.is_admin() SECURITY DEFINER behavior.
--      Explains why SECURITY DEFINER is architecturally necessary (prevents RLS recursion).
--   2. Prevents self-escalation privilege vulnerabilities on public.profiles.
--      Ensures regular authenticated students and teachers cannot issue direct SQL/REST updates
--      to change their own role to 'admin' or alter account status fields.
--   3. Adds a BEFORE UPDATE trigger on public.profiles to strictly enforce that
--      only existing administrators or trusted backend service-role operations
--      can modify the 'role' and 'status' columns.
--   4. Hardens RLS UPDATE policy on public.profiles with an explicit WITH CHECK clause
--      that supports all legitimate roles (students, teachers, faculty) while blocking
--      unauthorized role or status alterations.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN public.is_admin() WITH STRICT PERMISSIONS AND DOCUMENTATION
-- ------------------------------------------------------------------------------
-- SECURITY DEFINER ARCHITECTURAL JUSTIFICATION:
-- public.is_admin() evaluates whether the calling user (auth.uid()) has role = 'admin' in public.profiles.
-- It is invoked by RLS policies across 45+ tables (courses, lessons, modules, cms_content, storage.objects, etc.).
-- If declared as SECURITY INVOKER:
--   a) Calling it from within public.profiles RLS policies triggers fatal infinite recursion.
--   b) Calling it when unprivileged users query published courses or content would fail if RLS
--      restricts direct access to the profiles relation.
-- SECURITY DEFINER breaks recursion by executing with owner privileges (postgres) while reading only
-- the specific calling user's row (auth.uid()).
--
-- DIRECT RPC POSTGREST ACCESS ASSESSMENT:
-- Direct PostgREST RPC access (POST /rest/v1/rpc/is_admin) returns solely a boolean reflecting the
-- caller's own administrative status (auth.uid()). It exposes no table rows, PII, or other users' roles.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (auth.uid()) AND role = 'admin'
    );
END;
$$;

-- Restrict execution: Revoke completely from anon and PUBLIC; grant only to authenticated and system roles
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, postgres;

COMMENT ON FUNCTION public.is_admin() IS 
'Security Definer administrative checker with immutable search_path (pg_catalog, public). Necessary to prevent RLS recursion on public.profiles while securing administrative policies.';

-- ------------------------------------------------------------------------------
-- 2. IMMUTABLE ROLE/STATUS HELPERS FOR RLS (PREVENT RECURSION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_profile_role(p_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_status(p_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
    SELECT status FROM public.profiles WHERE id = p_id;
$$;

REVOKE ALL ON FUNCTION public.get_profile_role(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_profile_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_role(UUID) TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.get_profile_status(UUID) TO authenticated, service_role, postgres;

-- ------------------------------------------------------------------------------
-- 3. PREVENT PRIVILEGE ESCALATION ON public.profiles (DATABASE TRIGGER)
-- ------------------------------------------------------------------------------
-- Hardens database against direct REST API privilege escalation where an authenticated
-- student attempts to update their own profile with { "role": "admin" }.
-- Concurrently preserves legitimate administrative mutations executed by backend service-role.

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_jwt_role TEXT;
    is_trusted_service BOOLEAN;
    is_admin_user BOOLEAN;
BEGIN
    -- Extract verified JWT role claim if present (Supabase PostgREST context)
    v_jwt_role := COALESCE(
        auth.jwt() ->> 'role',
        current_setting('request.jwt.claim.role', true),
        ''
    );

    -- SECURITY DEFINER TRUST BOUNDARY AUDIT & FIX:
    -- Under PostgreSQL SECURITY DEFINER execution, current_user ALWAYS resolves to the function owner
    -- ('postgres'), regardless of who invoked the statement. Using current_user = 'postgres' created
    -- a critical vulnerability by treating all callers (including students) as trusted superusers.
    --
    -- To establish a robust trust boundary:
    -- 1. NEVER trust current_user inside a SECURITY DEFINER function.
    -- 2. Direct database operations (DBA migrations, psql, administrative maintenance) are identified
    --    via session_user IN ('postgres', 'supabase_admin') only when NO unprivileged user JWT is present.
    -- 3. Backend service-role operations are identified by explicit 'service_role' JWT claims.
    -- 4. Any caller with JWT role 'authenticated' or 'anon' is explicitly untrusted as a service role,
    --    forcing them through strict role, status, and identity validation.
    is_trusted_service := (
        (
            (session_user IN ('postgres', 'supabase_admin') AND v_jwt_role NOT IN ('authenticated', 'anon'))
            OR v_jwt_role = 'service_role'
        )
        AND v_jwt_role NOT IN ('authenticated', 'anon')
    );

    -- Check if calling user is an authorized admin in public.profiles
    is_admin_user := public.is_admin();

    -- If caller is neither the trusted service role nor an active administrator:
    IF NOT (is_trusted_service OR is_admin_user) THEN
        -- Prevent unauthorized role changes
        IF (NEW.role IS DISTINCT FROM OLD.role) THEN
            RAISE EXCEPTION 'Unauthorized: Students, teachers, and standard accounts cannot modify user roles.'
                USING ERRCODE = '42501';
        END IF;

        -- Prevent unauthorized status changes (e.g., self-activation of suspended accounts)
        IF (NEW.status IS DISTINCT FROM OLD.status) THEN
            RAISE EXCEPTION 'Unauthorized: Account status modifications require administrator authorization.'
                USING ERRCODE = '42501';
        END IF;

        -- Prevent updating other users' profile records
        IF (NEW.id IS DISTINCT FROM OLD.id) OR (OLD.id IS DISTINCT FROM auth.uid()) THEN
            RAISE EXCEPTION 'Unauthorized: Cannot modify other user profiles.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- ------------------------------------------------------------------------------
-- 4. HARDEN public.profiles RLS UPDATE POLICY WITH WITH CHECK CLAUSE
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile or admins update all" ON public.profiles;

CREATE POLICY "Users can update own profile or admins update all"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id OR public.is_admin()
    )
    WITH CHECK (
        public.is_admin() OR (
            auth.uid() = id AND
            role = public.get_profile_role(auth.uid()) AND
            status = public.get_profile_status(auth.uid())
        )
    );

-- ==============================================================================
-- ROLLBACK INSTRUCTIONS (FOR DBA):
-- To revert this migration:
--   DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
--   DROP FUNCTION IF EXISTS public.prevent_profile_role_escalation();
--   DROP POLICY IF EXISTS "Users can update own profile or admins update all" ON public.profiles;
--   CREATE POLICY "Users can update own profile or admins update all" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_admin());
--   DROP FUNCTION IF EXISTS public.get_profile_role(UUID);
--   DROP FUNCTION IF EXISTS public.get_profile_status(UUID);
-- ==============================================================================
