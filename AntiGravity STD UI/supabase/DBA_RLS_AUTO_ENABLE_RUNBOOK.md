# SpeakUp LMS — DBA Event-Trigger Hardening Runbook

**Target Object:** `public.rls_auto_enable()` (PostgreSQL Event Trigger Routine)  
**Execution Context:** Authorized Database Administrator (DBA) / Superuser Session  
**Prerequisite:** Requires superuser privileges or explicit routine ownership. **Do not run via standard unprivileged application accounts.**

---

## 1. Context & Architectural Purpose

In Supabase PostgreSQL instances, `public.rls_auto_enable()` is an event-trigger routine designed to automatically enable Row Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) on newly created tables in the `public` schema.

### Why this is separated from application migrations:
1. **Ownership Restrictions:** The routine is typically owned by the platform administration role (`supabase_admin`). In Supabase Cloud, the standard database role `postgres` is not a PostgreSQL superuser and cannot alter or revoke permissions on routines it does not own.
2. **PostgREST Exposure Risk:** By default in PostgreSQL, newly created functions in `public` have execution granted to `PUBLIC`. PostgREST interprets functions in `public` as Remote Procedure Call (RPC) endpoints. When unauthenticated callers invoke `/rpc/rls_auto_enable`, PostgREST attempts execution, returning error `0A000: cannot display a value of type event_trigger`.
3. **Fail-Safe Integrity:** Application migrations must never mask permission failures using non-fatal exception blocks (`WHEN insufficient_privilege THEN RAISE WARNING`), as this creates a false appearance of security resolution when underlying ACLs remain unpatched.

---

## 2. Phase 1: Pre-Execution Diagnostic Inspection

Execute the following diagnostic queries in the Supabase Dashboard SQL Editor or via `psql` connected as an authorized administrator. Record the output before altering any objects.

### Step 1.1: Verify Routine Existence, Signature & Owner
```sql
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name,
    pg_get_userbyid(p.proowner) AS function_owner,
    t.typname AS return_type,
    p.prosecdef AS is_security_definer,
    p.proconfig AS search_path_config,
    p.proacl AS access_control_list
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_type t ON p.prorettype = t.oid
WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable';
```
**Decision Criteria:**
- If **0 rows returned**: `public.rls_auto_enable()` does not exist in schema `public`. No action is required; close ticket.
- If **`function_owner` is NOT the role you are executing as** and you are not a superuser: **STOP**. You cannot execute `ALTER FUNCTION` or `REVOKE` without ownership or superuser elevation.

### Step 1.2: Inspect Associated Event Triggers
```sql
SELECT 
    evtname AS trigger_name,
    evtevent AS event_name,
    evtenabled AS trigger_status,
    pg_get_userbyid(evtowner) AS trigger_owner,
    evtfoid::regproc AS function_called
FROM pg_event_trigger
WHERE evtfoid = 'public.rls_auto_enable'::regproc;
```
**Decision Criteria:**
- Note whether the event trigger fires on `ddl_command_end`.
- Confirm that the trigger is enabled (`evtenabled = 'O'`). **Do not disable or drop the event trigger**, as doing so would disable automatic RLS enforcement for future tables.

### Step 1.3: Inspect Function Definition & Search-Path Safety
```sql
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable';
```
**Decision Criteria:**
- Verify that the function body only relies on standard system catalogs (`pg_event_trigger_ddl_commands()`) or `ALTER TABLE`.
- Pinned `search_path = pg_catalog, public` will not break internal references.

---

## 3. Phase 2: Fail-Fast Remediation Script

Once ownership is verified, execute the following block. This script enforces fail-fast error behavior: it checks that the executing session has appropriate authority, and raises an explicit `EXCEPTION` if privileges are insufficient rather than silently continuing.

```sql
DO $$
DECLARE
    v_owner TEXT;
    v_current_user TEXT := current_user;
    v_is_superuser BOOLEAN;
BEGIN
    -- 1. Inspect owner
    SELECT pg_get_userbyid(p.proowner) INTO v_owner
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable';

    IF v_owner IS NULL THEN
        RAISE NOTICE 'Function public.rls_auto_enable() does not exist. No remediation required.';
        RETURN;
    END IF;

    -- 2. Inspect superuser status
    SELECT rolsuper INTO v_is_superuser
    FROM pg_roles
    WHERE rolname = v_current_user;

    -- 3. Validate authorization
    IF NOT v_is_superuser AND v_current_user != v_owner THEN
        RAISE EXCEPTION 
            'AUTHORIZATION FAILURE: Cannot harden public.rls_auto_enable(). Owner is "%", but current user is "%" (superuser: %). Connect as function owner or superuser to apply.',
            v_owner, v_current_user, v_is_superuser;
    END IF;

    -- 4. Apply Privilege Revocations & Search Path Hardening
    -- Revoke untrusted public access (removes PostgREST RPC exposure)
    EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;';
    
    -- Preserve execution for internal database maintenance roles
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role, postgres;';
    
    -- Immutable search_path excluding pg_temp (mitigates search-path hijacking)
    EXECUTE 'ALTER FUNCTION public.rls_auto_enable() SET search_path = pg_catalog, public;';

    RAISE NOTICE 'SUCCESS: public.rls_auto_enable() secured successfully by % (search_path pinned, public/anon execution revoked).', v_current_user;
END $$;
```

---

## 4. Phase 3: Post-Execution Verification

Execute the following verification query to confirm that untrusted execution privileges have been completely eliminated:

```sql
SELECT 
    p.proname,
    p.proconfig AS pinned_search_path,
    HAS_FUNCTION_PRIVILEGE('anon', p.oid, 'EXECUTE') AS anon_can_execute,
    HAS_FUNCTION_PRIVILEGE('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
    HAS_FUNCTION_PRIVILEGE('service_role', p.oid, 'EXECUTE') AS service_role_can_execute,
    HAS_FUNCTION_PRIVILEGE('postgres', p.oid, 'EXECUTE') AS postgres_can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable';
```

### Expected Output Matrix:

| Check | Expected Value | Purpose |
|---|---|---|
| `pinned_search_path` | `{search_path=pg_catalog, public}` | Immutable search path |
| `anon_can_execute` | `false` | PostgREST RPC inaccessible |
| `authenticated_can_execute` | `false` | Ordinary users cannot invoke |
| `service_role_can_execute` | `true` | Internal maintenance preserved |
| `postgres_can_execute` | `true` | Database owner preserved |

---

## 5. Rollback Procedure (Emergency Only)

If internal DDL operations encounter permission issues during migration, restore default event trigger privileges using the owner role:

```sql
-- Run only as function owner or superuser
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO PUBLIC;
```
