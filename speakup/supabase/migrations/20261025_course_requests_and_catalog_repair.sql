-- ==============================================================================
-- SpeakUp LMS — Migration: 20261025_course_requests_and_catalog_repair.sql
-- Target: PostgreSQL 15+ / Supabase
-- Purpose:
--   1. Reconcile legacy course_enrollments schema (student_id / enrollment_status)
--      with canonical application schema (user_id / status).
--   2. Validate user_id data type (must be UUID if present, or added as UUID).
--   3. Validate student_id data type (native UUID or verified UUID text) before backfill.
--   4. Fail-closed validation for non-null enrollment identifiers; enforce NOT NULL
--      on both public.course_enrollments.user_id and course_id without fabricating values.
--   5. Validate and enforce foreign key from user_id to public.profiles(id) with
--      exact single-column mapping, ON DELETE CASCADE, ON UPDATE NO ACTION, MATCH SIMPLE ('s'),
--      NOT DEFERRABLE, and convalidated = true.
--      Exhaustively detects user_id anywhere in conkey (including composite foreign keys).
--      Detects and aborts on conflicting, unvalidated, or duplicate foreign keys for manual review.
--   6. Validate public.enrollment_status enum labels. Safely reconcile status
--      column type from text/varchar or foreign enum, enforce NOT NULL and matching
--      default. Reject unsupported data types. Abort on unknown values.
--   7. Independently inspect named unique constraint unique_user_course_enrollment and
--      validate complete definition. Validate active non-partial non-expression unique index on
--      (user_id, course_id). Abort transaction if duplicates exist.
--   8. Full table-level and column-level privilege cleanup on courses,
--      course_enrollments, and admin_mfa_challenges. Restore least privilege.
--   9. Enforce canonical SELECT policy on course_enrollments; clean up other policies.
-- Atomicity: Fully enclosed in BEGIN / COMMIT. Aborts cleanly on any validation error.
-- Status: REVIEW DRAFT — NOT APPROVED FOR EXECUTION
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ENUM VALIDATION: public.enrollment_status
-- ------------------------------------------------------------------------------
DO $$ 
DECLARE
  missing_labels TEXT;
BEGIN
  -- 1.1 Create enum type if it does not exist in schema public
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' AND t.typname = 'enrollment_status'
  ) THEN
    CREATE TYPE public.enrollment_status AS ENUM ('pending', 'approved', 'rejected');
  ELSE
    -- 1.2 Verify that all required labels ('pending', 'approved', 'rejected') exist in public schema
    SELECT string_agg(required_label, ', ')
    INTO missing_labels
    FROM unnest(ARRAY['pending', 'approved', 'rejected']) AS required_label
    WHERE required_label NOT IN (
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'enrollment_status'
    );

    IF missing_labels IS NOT NULL THEN
      RAISE EXCEPTION 'Aborting migration: public.enrollment_status enum exists but is missing required label(s): [%]. Resolve enum labels before proceeding.', missing_labels;
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. SCHEMA RECONCILIATION: public.course_enrollments
-- ------------------------------------------------------------------------------
-- 2.1 Verify existing user_id data type or add canonical user_id column
DO $$
DECLARE
  uid_data_type TEXT;
  uid_udt_schema TEXT;
  uid_udt_name TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'course_enrollments' 
      AND column_name = 'user_id'
  ) THEN
    -- Column exists: inspect its explicit data type
    SELECT data_type, udt_schema, udt_name
    INTO uid_data_type, uid_udt_schema, uid_udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'course_enrollments' 
      AND column_name = 'user_id';

    -- Must be UUID type: udt_name = 'uuid'
    IF uid_udt_name != 'uuid' THEN
      RAISE EXCEPTION 'Aborting migration: Existing column public.course_enrollments.user_id has unsupported data type [%] (udt: %.%). Expected UUID. Manual review required to avoid silent cast or data reinterpretation.', uid_data_type, uid_udt_schema, uid_udt_name;
    END IF;
  ELSE
    -- Column is absent: add canonical user_id as nullable UUID to permit initial backfill in Step 2.2
    ALTER TABLE public.course_enrollments ADD COLUMN user_id UUID;
  END IF;
END $$;

-- 2.2 Backfill user_id from student_id with strict data-type verification
DO $$
DECLARE
  sid_data_type TEXT;
  sid_udt_schema TEXT;
  sid_udt_name TEXT;
  invalid_uuid_count INTEGER := 0;
  invalid_uuid_samples TEXT := '';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'course_enrollments' 
      AND column_name = 'student_id'
  ) THEN
    -- Retrieve explicit data type of student_id
    SELECT data_type, udt_schema, udt_name
    INTO sid_data_type, sid_udt_schema, sid_udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'course_enrollments' 
      AND column_name = 'student_id';

    -- Supported compatible types:
    -- 1) Native uuid: udt_name = 'uuid'
    -- 2) String types: 'text', 'character varying', 'character' (verified for UUID format)
    IF sid_udt_name = 'uuid' THEN
      UPDATE public.course_enrollments 
      SET user_id = student_id 
      WHERE user_id IS NULL AND student_id IS NOT NULL;
    ELSIF sid_data_type IN ('text', 'character varying', 'character') THEN
      -- Verify that all non-null student_id values conform to standard UUID format
      SELECT count(*), string_agg(DISTINCT student_id::text, ', ')
      INTO invalid_uuid_count, invalid_uuid_samples
      FROM public.course_enrollments
      WHERE student_id IS NOT NULL
        AND student_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

      IF invalid_uuid_count > 0 THEN
        RAISE EXCEPTION 'Aborting migration: Column public.course_enrollments.student_id has % non-UUID value(s): [%]. Cannot safely assign text student_id to UUID user_id without data loss or reinterpretation.', invalid_uuid_count, invalid_uuid_samples;
      END IF;

      -- Safely cast verified UUID text values to UUID
      UPDATE public.course_enrollments 
      SET user_id = student_id::uuid 
      WHERE user_id IS NULL AND student_id IS NOT NULL;
    ELSE
      -- Any other type (integer, bigint, numeric, jsonb, etc.) cannot be safely converted
      RAISE EXCEPTION 'Aborting migration: Column public.course_enrollments.student_id has unsupported data type [%] (udt: %.%). Cannot safely convert to UUID user_id.', sid_data_type, sid_udt_schema, sid_udt_name;
    END IF;
  END IF;
END $$;

-- 2.2b Fail-Closed Validation and NOT NULL Enforcement for Enrollment Identifiers (user_id, course_id)
DO $$
DECLARE
  null_uid_count INTEGER := 0;
  null_cid_count INTEGER := 0;
  uid_is_nullable TEXT;
  cid_is_nullable TEXT;
BEGIN
  -- Verify course_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'course_enrollments' 
      AND column_name = 'course_id'
  ) THEN
    RAISE EXCEPTION 'Aborting migration: Required column public.course_enrollments.course_id does not exist. Schema repair required.';
  END IF;

  -- 1. Fail-closed check: abort if any records have NULL user_id (do not fabricate or silently populate)
  SELECT COUNT(*) INTO null_uid_count
  FROM public.course_enrollments
  WHERE user_id IS NULL;

  IF null_uid_count > 0 THEN
    RAISE EXCEPTION 'Aborting migration: Found % record(s) in public.course_enrollments with NULL user_id. Manual resolution required; cannot enforce NOT NULL on user_id.', null_uid_count;
  END IF;

  -- 2. Fail-closed check: abort if any records have NULL course_id (do not fabricate or silently populate)
  SELECT COUNT(*) INTO null_cid_count
  FROM public.course_enrollments
  WHERE course_id IS NULL;

  IF null_cid_count > 0 THEN
    RAISE EXCEPTION 'Aborting migration: Found % record(s) in public.course_enrollments with NULL course_id. Manual resolution required; cannot enforce NOT NULL on course_id.', null_cid_count;
  END IF;

  -- 3. Enforce NOT NULL on user_id if currently nullable
  SELECT is_nullable INTO uid_is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'course_enrollments' 
    AND column_name = 'user_id';

  IF uid_is_nullable = 'YES' THEN
    ALTER TABLE public.course_enrollments ALTER COLUMN user_id SET NOT NULL;
  END IF;

  -- 4. Enforce NOT NULL on course_id if currently nullable
  SELECT is_nullable INTO cid_is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'course_enrollments' 
    AND column_name = 'course_id';

  IF cid_is_nullable = 'YES' THEN
    ALTER TABLE public.course_enrollments ALTER COLUMN course_id SET NOT NULL;
  END IF;
END $$;

-- 2.3 Comprehensive Foreign Key Inspection & Enforcement (user_id -> public.profiles(id))
DO $$
DECLARE
  matching_fk_name TEXT := NULL;
  fk_count INTEGER := 0;
  orphan_count INTEGER := 0;
  fk_rec RECORD;
  user_attnum INT2;
  profiles_id_attnum INT2;
BEGIN
  -- Get column attribute numbers
  SELECT attnum INTO user_attnum 
  FROM pg_attribute 
  WHERE attrelid = 'public.course_enrollments'::regclass AND attname = 'user_id';

  SELECT attnum INTO profiles_id_attnum 
  FROM pg_attribute 
  WHERE attrelid = 'public.profiles'::regclass AND attname = 'id';

  -- Check any existing constraint named 'fk_course_enrollments_user_id' that is NOT a foreign key
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.course_enrollments'::regclass
      AND conname = 'fk_course_enrollments_user_id'
      AND contype != 'f'
  ) THEN
    RAISE EXCEPTION 'Aborting migration: Constraint fk_course_enrollments_user_id exists but is not a foreign key (type: %). Manual review required.',
      (SELECT contype FROM pg_constraint WHERE conrelid = 'public.course_enrollments'::regclass AND conname = 'fk_course_enrollments_user_id');
  END IF;

  -- Exhaustively inspect ALL foreign keys on public.course_enrollments where user_id is in conkey (including composite FKs)
  FOR fk_rec IN
    SELECT c.oid, c.conname, c.confrelid, c.confdeltype, c.confupdtype,
           c.confmatchtype, c.condeferrable, c.condeferred, c.convalidated,
           c.conkey, c.confkey, pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    WHERE c.conrelid = 'public.course_enrollments'::regclass
      AND c.contype = 'f'
      AND user_attnum = ANY(c.conkey)
  LOOP
    fk_count := fk_count + 1;

    -- Detect composite foreign keys involving user_id
    IF cardinality(fk_rec.conkey) > 1 THEN
      RAISE EXCEPTION 'Aborting migration: Found unexpected composite foreign key constraint [%] on course_enrollments involving user_id (def: %). Manual review required.',
        fk_rec.conname, fk_rec.def;
    END IF;

    -- If single-column FK references something other than public.profiles(id), detect conflicting relationship
    IF fk_rec.confrelid != 'public.profiles'::regclass OR fk_rec.confkey != ARRAY[profiles_id_attnum] THEN
      RAISE EXCEPTION 'Aborting migration: Found conflicting foreign key constraint [%] on user_id referencing [%] with definition [%]. Manual review required.',
        fk_rec.conname, fk_rec.confrelid::regclass, fk_rec.def;
    END IF;

    -- FK references public.profiles(id). Verify if it matches exact required definition:
    -- confdeltype = 'c' (ON DELETE CASCADE)
    -- confupdtype = 'a' (ON UPDATE NO ACTION)
    -- confmatchtype = 's' (MATCH SIMPLE: 's' = simple, 'f' = full, 'p' = partial)
    -- condeferrable = FALSE (NOT DEFERRABLE)
    -- condeferred = FALSE (INITIALLY IMMEDIATE)
    -- convalidated = TRUE (VALIDATED)
    IF fk_rec.confdeltype = 'c'
       AND fk_rec.confupdtype = 'a'
       AND fk_rec.confmatchtype = 's'
       AND fk_rec.condeferrable = FALSE
       AND fk_rec.condeferred = FALSE
       AND fk_rec.convalidated = TRUE THEN
      matching_fk_name := fk_rec.conname;
    ELSE
      -- Found an FK from user_id to public.profiles(id) with non-matching flags
      RAISE EXCEPTION 'Aborting migration: Found existing foreign key [%] from user_id to public.profiles(id) with non-matching definition [%] (deltype: %, updtype: %, matchtype: %, deferrable: %, deferred: %, validated: %). Manual review required; will not silently drop or replace.',
        fk_rec.conname, fk_rec.def, fk_rec.confdeltype, fk_rec.confupdtype, fk_rec.confmatchtype, fk_rec.condeferrable, fk_rec.condeferred, fk_rec.convalidated;
    END IF;
  END LOOP;

  -- If more than 1 FK exists on user_id, abort for manual deduplication
  IF fk_count > 1 THEN
    RAISE EXCEPTION 'Aborting migration: Multiple foreign key constraints (%) found on user_id. Manual deduplication required.', fk_count;
  END IF;

  -- If an exact matching, validated CASCADE FK already exists, preserve it and skip creation
  IF matching_fk_name IS NOT NULL THEN
    NULL; -- Relationship already satisfied and verified
  ELSE
    -- No FK exists on user_id. Check for orphan records before adding constraint.
    SELECT count(*) INTO orphan_count
    FROM public.course_enrollments ce
    WHERE ce.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ce.user_id);

    IF orphan_count > 0 THEN
      RAISE EXCEPTION 'Aborting migration: Found % orphan user_id records in course_enrollments that do not exist in public.profiles. Clean or associate orphan records before creating foreign key.', orphan_count;
    END IF;

    -- Add the validated exact foreign key
    ALTER TABLE public.course_enrollments
      ADD CONSTRAINT fk_course_enrollments_user_id
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2.4 Status Column Data Type Reconcile & Safe Status Backfill
DO $$ 
DECLARE
  unmapped_count INTEGER := 0;
  unmapped_samples TEXT := '';
  status_is_canonical_enum BOOLEAN := FALSE;
  has_legacy_col BOOLEAN := FALSE;
  has_status_col BOOLEAN := FALSE;
  status_data_type TEXT := '';
  status_udt_schema TEXT := '';
  status_udt_name TEXT := '';
  status_is_enum_type BOOLEAN := FALSE;
BEGIN
  -- Step A: Inspect existing status and enrollment_status column definitions
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'course_enrollments' 
      AND column_name = 'status'
  ) INTO has_status_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'course_enrollments' 
      AND column_name = 'enrollment_status'
  ) INTO has_legacy_col;

  IF has_status_col THEN
    -- Retrieve explicit data type and UDT descriptors
    SELECT data_type, udt_schema, udt_name
    INTO status_data_type, status_udt_schema, status_udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'course_enrollments' 
      AND column_name = 'status';

    -- Check if status is defined as an enum type (in public or another schema)
    SELECT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = status_udt_schema
        AND t.typname = status_udt_name
        AND t.typtype = 'e'
    ) INTO status_is_enum_type;

    -- Explicitly validate that status has a supported data type:
    -- Supported: text, character varying, character, or any enum type (typtype = 'e')
    IF status_data_type NOT IN ('text', 'character varying', 'character') AND NOT status_is_enum_type THEN
      RAISE EXCEPTION 'Aborting migration: Column public.course_enrollments.status has unsupported data type [%] (udt: %.%). Only text/varchar and enum types are supported for reconciliation.', status_data_type, status_udt_schema, status_udt_name;
    END IF;

    -- Check if status is already the canonical public.enrollment_status enum
    status_is_canonical_enum := (status_udt_schema = 'public' AND status_udt_name = 'enrollment_status');
  ELSE
    -- Add status column directly as public.enrollment_status (initially nullable for clean backfill)
    ALTER TABLE public.course_enrollments 
      ADD COLUMN status public.enrollment_status;
    status_is_canonical_enum := TRUE;
  END IF;

  -- Step B: Validate canonical status values across the entire table
  IF status_is_canonical_enum THEN
    SELECT count(*), string_agg(DISTINCT status::text, ', ')
    INTO unmapped_count, unmapped_samples
    FROM public.course_enrollments
    WHERE status IS NOT NULL
      AND status::text NOT IN ('pending', 'approved', 'rejected');

    IF unmapped_count > 0 THEN
      RAISE EXCEPTION 'Aborting migration: Found % records with unexpected canonical status enum values: [%].', unmapped_count, unmapped_samples;
    END IF;
  ELSE
    -- Status is text/varchar OR an enum from another schema/type
    -- Validate all values against recognized mappings using status::text
    SELECT count(*), string_agg(DISTINCT status::text, ', ')
    INTO unmapped_count, unmapped_samples
    FROM public.course_enrollments
    WHERE status IS NOT NULL
      AND status::text NOT ILIKE ALL (ARRAY[
        'approved', 'enrolled', 'active',
        'rejected', 'cancelled', 'declined',
        'pending', 'requested', 'waiting'
      ]);

    IF unmapped_count > 0 THEN
      RAISE EXCEPTION 'Aborting migration: Found % records with unknown status values: [%]. Cannot safely convert status column to public.enrollment_status.', unmapped_count, unmapped_samples;
    END IF;

    -- Safely remove existing text/enum default before type conversion to avoid cast errors
    ALTER TABLE public.course_enrollments 
      ALTER COLUMN status DROP DEFAULT;

    -- Alter column type to public.enrollment_status using explicit CASE cast
    -- status::text safely extracts string representation from text, varchar, or any schema enum
    ALTER TABLE public.course_enrollments 
      ALTER COLUMN status TYPE public.enrollment_status 
      USING (
        CASE 
          WHEN status::text ILIKE ANY (ARRAY['approved', 'enrolled', 'active']) THEN 'approved'::public.enrollment_status
          WHEN status::text ILIKE ANY (ARRAY['rejected', 'cancelled', 'declined']) THEN 'rejected'::public.enrollment_status
          ELSE 'pending'::public.enrollment_status
        END
      );

    status_is_canonical_enum := TRUE;
  END IF;

  -- Step C: Validate EVERY non-null legacy enrollment_status value across the entire table
  -- Must validate even if canonical status is already populated. Unexpected values abort the transaction.
  IF has_legacy_col THEN
    SELECT count(*), string_agg(DISTINCT enrollment_status::text, ', ')
    INTO unmapped_count, unmapped_samples
    FROM public.course_enrollments
    WHERE enrollment_status IS NOT NULL
      AND enrollment_status::text NOT ILIKE ALL (ARRAY[
        'approved', 'enrolled', 'active',
        'rejected', 'cancelled', 'declined',
        'pending', 'requested', 'waiting'
      ]);

    IF unmapped_count > 0 THEN
      RAISE EXCEPTION 'Aborting migration: Found % records with unknown legacy enrollment_status values: [%]. Explicit mapping required; values cannot be silently defaulted.', unmapped_count, unmapped_samples;
    END IF;

    -- Safe one-time legacy reconciliation from enrollment_status:
    -- Since status is now guaranteed to be public.enrollment_status, cast directly to public.enrollment_status.
    -- Never assigns raw text to an incompatible enum column.
    -- Strictly backfills ONLY where status IS NULL so canonical data is never overwritten.
    UPDATE public.course_enrollments 
    SET status = CASE 
      WHEN enrollment_status::text ILIKE ANY (ARRAY['approved', 'enrolled', 'active']) 
        THEN 'approved'::public.enrollment_status
      WHEN enrollment_status::text ILIKE ANY (ARRAY['rejected', 'cancelled', 'declined']) 
        THEN 'rejected'::public.enrollment_status
      WHEN enrollment_status::text ILIKE ANY (ARRAY['pending', 'requested', 'waiting']) 
        THEN 'pending'::public.enrollment_status
    END
    WHERE status IS NULL 
      AND enrollment_status IS NOT NULL;
  END IF;

  -- Step D: Handle any remaining NULL status values, enforce NOT NULL and matching enum DEFAULT
  UPDATE public.course_enrollments 
  SET status = 'pending'::public.enrollment_status 
  WHERE status IS NULL;

  ALTER TABLE public.course_enrollments 
    ALTER COLUMN status SET NOT NULL;

  ALTER TABLE public.course_enrollments 
    ALTER COLUMN status SET DEFAULT 'pending'::public.enrollment_status;
END $$;

-- 2.5 Unique Index & Constraint Validation on (user_id, course_id)
DO $$ 
DECLARE
  named_uc_exists BOOLEAN := FALSE;
  named_uc_valid BOOLEAN := FALSE;
  dup_count INTEGER := 0;
  named_c_rec RECORD;
  named_c_idx_rec RECORD;
  idx_rec RECORD;
  standalone_rel_rec RECORD;
BEGIN
  -- 1. Independently inspect the named constraint 'unique_user_course_enrollment' if it exists
  SELECT 
    c.oid, 
    c.conname,
    c.contype,
    c.conindid,
    c.condeferrable,
    c.condeferred,
    c.convalidated,
    (
      SELECT array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum))
      FROM pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) AS cols,
    pg_get_constraintdef(c.oid) AS def
  INTO named_c_rec
  FROM pg_constraint c
  WHERE c.conrelid = 'public.course_enrollments'::regclass 
    AND c.conname = 'unique_user_course_enrollment';

  IF named_c_rec.oid IS NOT NULL THEN
    -- Strict fail-closed validation: must be a confirmed unique constraint (contype = 'u') spanning exactly (user_id, course_id)
    -- Uses IS DISTINCT FROM so a NULL contype, NULL cols, or any unexpected definition always raises an exception
    IF named_c_rec.contype IS DISTINCT FROM 'u' 
       OR (named_c_rec.cols IS DISTINCT FROM ARRAY['user_id', 'course_id'] 
           AND named_c_rec.cols IS DISTINCT FROM ARRAY['course_id', 'user_id']) THEN
      RAISE EXCEPTION 'Aborting migration: Existing constraint unique_user_course_enrollment has unexpected definition [%]. It is not a unique constraint on (user_id, course_id). Manual review required.', named_c_rec.def;
    END IF;

    -- Only set to TRUE after exact definition has been positively verified
    named_uc_exists := TRUE;

    -- Explicitly verify that its backing index exists and meets all canonical requirements:
    -- Target table ownership, ordinary index (relkind = 'i'), B-tree, unique, valid, ready, live,
    -- non-partial, non-expression, exactly 2 key columns, no INCLUDE columns, default sort ordering, ordinary NULL-distinct
    IF named_c_rec.conindid IS NOT NULL THEN
      SELECT 
        i.indexrelid,
        i.indrelid,
        ic.relkind,
        i.indisunique,
        i.indisvalid,
        i.indisready,
        i.indislive,
        i.indnullsnotdistinct,
        i.indnkeyatts,
        i.indnatts,
        i.indoption[0] AS opt_col0,
        i.indoption[1] AS opt_col1,
        i.indpred IS NOT NULL AS is_partial,
        i.indexprs IS NOT NULL AS is_expression,
        am.amname AS access_method,
        (
          SELECT array_agg(a.attname ORDER BY array_position(ARRAY[i.indkey[0], i.indkey[1]], a.attnum))
          FROM pg_attribute a
          WHERE a.attrelid = i.indrelid AND a.attnum IN (i.indkey[0], i.indkey[1])
        ) AS index_key_cols
      INTO named_c_idx_rec
      FROM pg_index i
      JOIN pg_class ic ON ic.oid = i.indexrelid
      JOIN pg_am am ON am.oid = ic.relam
      WHERE i.indexrelid = named_c_rec.conindid;
    END IF;

    -- Check complete canonical specification (all checks strictly fail-closed via IS NOT DISTINCT FROM):
    -- Constraint: NOT DEFERRABLE, INITIALLY IMMEDIATE, VALIDATED.
    -- Backing index: EXISTS, OWNS TARGET TABLE, ORDINARY INDEX (relkind = 'i'), B-tree, UNIQUE,
    --                VALID, READY, LIVE, NOT PARTIAL, NOT EXPRESSION,
    --                EXACTLY 2 KEY COLUMNS (user_id, course_id), NO INCLUDE COLUMNS,
    --                DEFAULT SORT ORDERING (opt_col0 IS NOT DISTINCT FROM 0 AND opt_col1 IS NOT DISTINCT FROM 0),
    --                CONFIRMED ORDINARY NULL-DISTINCT (indnullsnotdistinct IS NOT DISTINCT FROM FALSE).
    -- A missing, NULL, or non-compliant backing index will NEVER default to compliant.
    IF named_c_rec.condeferrable IS NOT DISTINCT FROM FALSE 
       AND named_c_rec.condeferred IS NOT DISTINCT FROM FALSE 
       AND named_c_rec.convalidated IS NOT DISTINCT FROM TRUE
       AND named_c_idx_rec.indexrelid IS NOT NULL
       AND named_c_idx_rec.indrelid IS NOT DISTINCT FROM 'public.course_enrollments'::regclass
       AND named_c_idx_rec.relkind IS NOT DISTINCT FROM 'i'
       AND named_c_idx_rec.access_method IS NOT DISTINCT FROM 'btree'
       AND named_c_idx_rec.indisunique IS NOT DISTINCT FROM TRUE
       AND named_c_idx_rec.indisvalid IS NOT DISTINCT FROM TRUE
       AND named_c_idx_rec.indisready IS NOT DISTINCT FROM TRUE
       AND named_c_idx_rec.indislive IS NOT DISTINCT FROM TRUE
       AND named_c_idx_rec.is_partial IS NOT DISTINCT FROM FALSE
       AND named_c_idx_rec.is_expression IS NOT DISTINCT FROM FALSE
       AND named_c_idx_rec.indnkeyatts IS NOT DISTINCT FROM 2
       AND named_c_idx_rec.indnatts IS NOT DISTINCT FROM 2
       AND named_c_idx_rec.opt_col0 IS NOT DISTINCT FROM 0
       AND named_c_idx_rec.opt_col1 IS NOT DISTINCT FROM 0
       AND (named_c_idx_rec.index_key_cols IS NOT DISTINCT FROM ARRAY['user_id', 'course_id'] 
            OR named_c_idx_rec.index_key_cols IS NOT DISTINCT FROM ARRAY['course_id', 'user_id'])
       AND named_c_idx_rec.indnullsnotdistinct IS NOT DISTINCT FROM FALSE THEN
      named_uc_valid := TRUE;
    ELSE
      named_uc_valid := FALSE;
    END IF;
  END IF;

  -- 2. Inspect all relevant unique indexes covering (user_id, course_id), including indexes with INCLUDE columns.
  -- Detect and abort on conflicting NULLS NOT DISTINCT indexes with comprehensive diagnostics.
  FOR idx_rec IN
    SELECT 
      c.relname AS index_name,
      i.indexrelid,
      i.indisunique,
      i.indisvalid,
      i.indisready,
      i.indnullsnotdistinct,
      i.indnkeyatts,
      i.indnatts,
      i.indpred IS NOT NULL AS is_partial,
      i.indexprs IS NOT NULL AS is_expression,
      con.conname AS constraint_name,
      con.contype AS constraint_type,
      pg_get_indexdef(i.indexrelid) AS def
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_constraint con ON con.conindid = i.indexrelid
    WHERE n.nspname = 'public'
      AND i.indrelid = 'public.course_enrollments'::regclass
      AND i.indisunique = TRUE
      AND i.indnkeyatts = 2
      AND (
        SELECT array_agg(a.attname ORDER BY array_position(ARRAY[i.indkey[0], i.indkey[1]], a.attnum))
        FROM pg_attribute a
        WHERE a.attrelid = i.indrelid AND a.attnum IN (i.indkey[0], i.indkey[1])
      ) IN (ARRAY['user_id', 'course_id'], ARRAY['course_id', 'user_id'])
  LOOP
    -- Fail-closed validation of NULL uniqueness semantics:
    -- If index has unknown/NULL indnullsnotdistinct semantics, abort immediately (do not treat unknown as compliant)
    IF idx_rec.indnullsnotdistinct IS NULL THEN
      RAISE EXCEPTION 'Aborting migration: Found unique index [%] on course_enrollments with unexpected NULL indnullsnotdistinct catalog value. Definition: [%]. Fail-closed security requires explicit boolean semantics (FALSE for ordinary NULLS DISTINCT). Manual review required.',
        idx_rec.index_name,
        idx_rec.def;
    ELSIF idx_rec.indnullsnotdistinct = TRUE THEN
      -- If this is the backing index of a non-compliant named constraint being replaced in Step 3,
      -- it will be safely dropped when that named constraint is dropped.
      -- If it is ANY OTHER index (standalone or backing an unrelated constraint, with or without INCLUDE columns),
      -- automatic removal is unsafe (Rule 5) and leaving it in place violates data integrity (Rule 3).
      IF named_c_rec.conindid IS NULL OR idx_rec.indexrelid != named_c_rec.conindid THEN
        RAISE EXCEPTION 'Aborting migration: Found conflicting unique index [%] on course_enrollments with NULLS NOT DISTINCT semantics. Definition: [%]. Constraint backing: [%]. Automatic removal is unsafe because dropping unrelated indexes or constraints may break dependencies or application behavior without explicit administrator approval. Required manual action: Inspect the index and, if ordinary NULL-distinct uniqueness is intended, drop or recreate this index using standard NULLS DISTINCT before re-running the migration.',
          idx_rec.index_name,
          idx_rec.def,
          CASE 
            WHEN idx_rec.constraint_name IS NOT NULL 
              THEN 'Backs constraint ' || quote_ident(idx_rec.constraint_name) || ' (contype: ' || idx_rec.constraint_type || ')'
            ELSE 'Standalone index (not attached to any constraint)'
          END;
      END IF;
    END IF;
  END LOOP;

  -- 3. Ensure the canonical named constraint 'unique_user_course_enrollment' exists with exact definition.
  -- If compliant named constraint already exists, preserve it without modification (Rule 8).
  -- If non-compliant, a separate unique index must NEVER cause the migration to skip correcting it (Rule 1).
  IF NOT named_uc_valid THEN
    -- Check for duplicate non-null (user_id, course_id) records before attempting to create or alter constraint
    SELECT count(*) INTO dup_count
    FROM (
      SELECT user_id, course_id 
      FROM public.course_enrollments 
      WHERE user_id IS NOT NULL AND course_id IS NOT NULL 
      GROUP BY user_id, course_id 
      HAVING COUNT(*) > 1
    ) sub;

    IF dup_count > 0 THEN
      RAISE EXCEPTION 'Aborting migration: Found % duplicate (user_id, course_id) record groups in course_enrollments. Duplicates must be resolved manually before a unique constraint can be applied.', dup_count;
    END IF;

    -- If a named constraint existed but had non-matching flags (e.g. deferrable, unvalidated, or nulls not distinct),
    -- drop it only after its definition has been positively verified above to span exactly (user_id, course_id)
    IF named_uc_exists THEN
      ALTER TABLE public.course_enrollments DROP CONSTRAINT unique_user_course_enrollment;
    END IF;

    -- Check if an existing relation named 'unique_user_course_enrollment' exists in pg_class in public schema
    SELECT 
      c.oid,
      c.relkind,
      am.amname AS access_method,
      i.indexrelid,
      i.indrelid,
      i.indisunique,
      i.indisvalid,
      i.indisready,
      i.indislive,
      i.indnullsnotdistinct,
      i.indnkeyatts,
      i.indnatts,
      i.indoption[0] AS opt_col0,
      i.indoption[1] AS opt_col1,
      i.indpred IS NOT NULL AS is_partial,
      i.indexprs IS NOT NULL AS is_expression,
      (
        SELECT array_agg(a.attname ORDER BY array_position(ARRAY[i.indkey[0], i.indkey[1]], a.attnum))
        FROM pg_attribute a
        WHERE a.attrelid = i.indrelid AND a.attnum IN (i.indkey[0], i.indkey[1])
      ) AS index_key_cols,
      (
        SELECT con.conname 
        FROM pg_constraint con 
        WHERE con.conindid = i.indexrelid 
        LIMIT 1
      ) AS attached_constraint_name,
      CASE WHEN c.relkind = 'i' THEN pg_get_indexdef(c.oid) ELSE NULL END AS def
    INTO standalone_rel_rec
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_index i ON i.indexrelid = c.oid
    LEFT JOIN pg_am am ON am.oid = c.relam
    WHERE n.nspname = 'public'
      AND c.relname = 'unique_user_course_enrollment';

    IF standalone_rel_rec.oid IS NOT NULL THEN
      -- A relation named 'unique_user_course_enrollment' exists in pg_class.
      -- Verify that it strictly meets every requirement for attachment via USING INDEX:
      IF standalone_rel_rec.relkind IS DISTINCT FROM 'i' THEN
        RAISE EXCEPTION 'Aborting migration: Relation public.unique_user_course_enrollment exists but is not an index (relkind: %). Expected an index relation. Manual review required.', standalone_rel_rec.relkind;
      END IF;

      IF standalone_rel_rec.indrelid IS DISTINCT FROM 'public.course_enrollments'::regclass THEN
        RAISE EXCEPTION 'Aborting migration: Index public.unique_user_course_enrollment exists but belongs to a different table [%]. Manual review required.', standalone_rel_rec.indrelid::regclass;
      END IF;

      IF standalone_rel_rec.access_method IS DISTINCT FROM 'btree' THEN
        RAISE EXCEPTION 'Aborting migration: Index public.unique_user_course_enrollment uses access method [%]. Expected btree. Manual review required.', standalone_rel_rec.access_method;
      END IF;

      IF standalone_rel_rec.indisunique IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'Aborting migration: Index public.unique_user_course_enrollment is not unique. Manual review required.';
      END IF;

      IF standalone_rel_rec.indisvalid IS DISTINCT FROM TRUE OR standalone_rel_rec.indisready IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'Aborting migration: Index public.unique_user_course_enrollment is not valid or ready (valid: %, ready: %). Manual review required.', standalone_rel_rec.indisvalid, standalone_rel_rec.indisready;
      END IF;

      -- Validate that index is live (not marked dead or undergoing drop)
      IF standalone_rel_rec.indislive IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'Aborting migration: Index public.unique_user_course_enrollment is not live (indislive: %). An index that is dead or pending drop cannot be used to enforce a unique constraint. Manual review required.', standalone_rel_rec.indislive;
      END IF;

      IF standalone_rel_rec.is_partial IS DISTINCT FROM FALSE THEN
        RAISE EXCEPTION 'Aborting migration: Index public.unique_user_course_enrollment is a partial index. Partial indexes cannot support a unique constraint.';
      END IF;

      IF standalone_rel_rec.is_expression IS DISTINCT FROM FALSE THEN
        RAISE EXCEPTION 'Aborting migration: Index public.unique_user_course_enrollment is an expression-based index. Expression indexes cannot support a standard unique constraint.';
      END IF;

      IF standalone_rel_rec.indnkeyatts IS DISTINCT FROM 2 OR standalone_rel_rec.indnatts IS DISTINCT FROM 2 THEN
        RAISE EXCEPTION 'Aborting migration: Index public.unique_user_course_enrollment does not have exactly 2 key columns without INCLUDE columns (% total columns, % key columns). Manual review required.', standalone_rel_rec.indnatts, standalone_rel_rec.indnkeyatts;
      END IF;

      IF (standalone_rel_rec.index_key_cols IS DISTINCT FROM ARRAY['user_id', 'course_id'] 
          AND standalone_rel_rec.index_key_cols IS DISTINCT FROM ARRAY['course_id', 'user_id']) THEN
        RAISE EXCEPTION 'Aborting migration: Index public.unique_user_course_enrollment has unexpected key columns [%]. Expected (user_id, course_id). Manual review required.', standalone_rel_rec.index_key_cols;
      END IF;

      -- Validate default B-tree sort ordering on both key columns (PostgreSQL requires ASC NULLS LAST: indoption = 0)
      -- Explicitly uses IS DISTINCT FROM 0 so NULL values cannot pass
      IF standalone_rel_rec.opt_col0 IS DISTINCT FROM 0 OR standalone_rel_rec.opt_col1 IS DISTINCT FROM 0 THEN
        RAISE EXCEPTION 'Aborting migration: Index public.unique_user_course_enrollment has non-default sort ordering and cannot be used to enforce a unique constraint. Key column 1 sort option: % (%), Key column 2 sort option: % (%). PostgreSQL requires default sort ordering (ASC NULLS LAST). Manual review required.',
          standalone_rel_rec.opt_col0,
          CASE 
            WHEN standalone_rel_rec.opt_col0 = 0 THEN 'default ASC NULLS LAST'
            WHEN standalone_rel_rec.opt_col0 = 1 THEN 'DESC NULLS LAST'
            WHEN standalone_rel_rec.opt_col0 = 2 THEN 'ASC NULLS FIRST'
            WHEN standalone_rel_rec.opt_col0 = 3 THEN 'DESC NULLS FIRST'
            WHEN standalone_rel_rec.opt_col0 IS NULL THEN 'NULL / unassigned'
            ELSE 'non-default (' || standalone_rel_rec.opt_col0 || ')'
          END,
          standalone_rel_rec.opt_col1,
          CASE 
            WHEN standalone_rel_rec.opt_col1 = 0 THEN 'default ASC NULLS LAST'
            WHEN standalone_rel_rec.opt_col1 = 1 THEN 'DESC NULLS LAST'
            WHEN standalone_rel_rec.opt_col1 = 2 THEN 'ASC NULLS FIRST'
            WHEN standalone_rel_rec.opt_col1 = 3 THEN 'DESC NULLS FIRST'
            WHEN standalone_rel_rec.opt_col1 IS NULL THEN 'NULL / unassigned'
            ELSE 'non-default (' || standalone_rel_rec.opt_col1 || ')'
          END;
      END IF;

      IF standalone_rel_rec.indnullsnotdistinct IS DISTINCT FROM FALSE THEN
        RAISE EXCEPTION 'Aborting migration: Index public.unique_user_course_enrollment has non-standard or unknown NULL uniqueness semantics (indnullsnotdistinct: %). Expected confirmed FALSE (standard NULLS DISTINCT). Manual review required.', standalone_rel_rec.indnullsnotdistinct;
      END IF;

      IF standalone_rel_rec.attached_constraint_name IS NOT NULL THEN
        RAISE EXCEPTION 'Aborting migration: Index public.unique_user_course_enrollment is already attached to another constraint [%]. Manual review required.', standalone_rel_rec.attached_constraint_name;
      END IF;

      -- All attachment prerequisites strictly satisfied
      ALTER TABLE public.course_enrollments 
        ADD CONSTRAINT unique_user_course_enrollment UNIQUE USING INDEX unique_user_course_enrollment;
    ELSE
      -- Add canonical named unique constraint (PostgreSQL defaults to NOT DEFERRABLE, INITIALLY IMMEDIATE, validated, and ordinary NULL-distinct)
      ALTER TABLE public.course_enrollments 
        ADD CONSTRAINT unique_user_course_enrollment UNIQUE (user_id, course_id);
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. PERMISSION CLEANUP & RESTORATION: public.courses
-- ------------------------------------------------------------------------------
-- 3.1 Revoke explicit column-level grants from all client roles and PUBLIC
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT grantee, table_schema, table_name, column_name
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND table_name = 'courses'
      AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
  LOOP
    IF rec.grantee = 'PUBLIC' THEN
      EXECUTE format(
        'REVOKE ALL (%I) ON TABLE %I.%I FROM PUBLIC',
        rec.column_name, rec.table_schema, rec.table_name
      );
    ELSE
      EXECUTE format(
        'REVOKE ALL (%I) ON TABLE %I.%I FROM %I',
        rec.column_name, rec.table_schema, rec.table_name, rec.grantee
      );
    END IF;
  END LOOP;
END $$;

-- 3.2 Revoke table-level baseline privileges from all client roles and PUBLIC
REVOKE ALL ON TABLE public.courses FROM anon, authenticated, service_role, PUBLIC;

-- 3.3 Restore strictly intended least-privilege table permissions
GRANT SELECT ON TABLE public.courses TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.courses TO service_role;

-- ------------------------------------------------------------------------------
-- 4. PERMISSION CLEANUP & RESTORATION: public.course_enrollments
-- ------------------------------------------------------------------------------
-- 4.1 Revoke explicit column-level grants from all client roles and PUBLIC
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT grantee, table_schema, table_name, column_name
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND table_name = 'course_enrollments'
      AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
  LOOP
    IF rec.grantee = 'PUBLIC' THEN
      EXECUTE format(
        'REVOKE ALL (%I) ON TABLE %I.%I FROM PUBLIC',
        rec.column_name, rec.table_schema, rec.table_name
      );
    ELSE
      EXECUTE format(
        'REVOKE ALL (%I) ON TABLE %I.%I FROM %I',
        rec.column_name, rec.table_schema, rec.table_name, rec.grantee
      );
    END IF;
  END LOOP;
END $$;

-- 4.2 Revoke table-level baseline privileges from all client roles and PUBLIC
REVOKE ALL ON TABLE public.course_enrollments FROM anon, authenticated, service_role, PUBLIC;

-- 4.3 Restore strictly intended least-privilege table permissions
-- Authenticated users receive SELECT ONLY (governed by RLS)
GRANT SELECT ON TABLE public.course_enrollments TO authenticated;

-- Elevated service_role receives full CRUD for server actions and admin workflows
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.course_enrollments TO service_role;

-- ------------------------------------------------------------------------------
-- 5. ACCIDENTAL DATA LOSS GUARDS & PRIVILEGES: public.admin_mfa_challenges
-- ------------------------------------------------------------------------------
-- 5.1 Revoke explicit column-level grants from all client roles and PUBLIC
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT grantee, table_schema, table_name, column_name
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND table_name = 'admin_mfa_challenges'
      AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
  LOOP
    IF rec.grantee = 'PUBLIC' THEN
      EXECUTE format(
        'REVOKE ALL (%I) ON TABLE %I.%I FROM PUBLIC',
        rec.column_name, rec.table_schema, rec.table_name
      );
    ELSE
      EXECUTE format(
        'REVOKE ALL (%I) ON TABLE %I.%I FROM %I',
        rec.column_name, rec.table_schema, rec.table_name, rec.grantee
      );
    END IF;
  END LOOP;
END $$;

-- 5.2 Revoke table-level baseline privileges from all client roles and PUBLIC
REVOKE ALL ON TABLE public.admin_mfa_challenges FROM anon, authenticated, service_role, PUBLIC;

-- 5.3 Restore strictly required CRUD operations to service_role (TRUNCATE, REFERENCES, TRIGGER remain revoked)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_mfa_challenges TO service_role;

-- ------------------------------------------------------------------------------
-- 6. CANONICAL COURSE CATALOG SEEDING (DEFERRED PENDING LIVE VERIFICATION)
-- ------------------------------------------------------------------------------
-- Hardcoded course seeding is omitted. Course catalog records must be reconciled
-- separately after live catalog inspection.

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY ENFORCEMENT ON public.course_enrollments
-- ------------------------------------------------------------------------------
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- 7.1 Clean up legacy and unexpected policies on course_enrollments
-- ==============================================================================
-- MANDATORY PRE-EXECUTION REVIEW REQUIREMENT:
-- Before running this block, the live inventory of policies on public.course_enrollments
-- must be inspected using Preflight Query 6.
-- This cleanup loop drops all policies EXCEPT "Students view own enrollments or admins view all".
-- Known candidate legacy policies that will be dropped if present on the live table:
--   1. "Users can view their own enrollments" (legacy student SELECT policy)
--   2. "Admins can view all enrollments" (legacy admin SELECT policy)
--   3. "Admins can insert course enrollments" (obsolete write policy; service_role bypasses RLS)
--   4. "Admins can update course enrollments" (obsolete write policy; service_role bypasses RLS)
--   5. Any custom or permissive student write policies violating least privilege.
-- ==============================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'course_enrollments'
      AND policyname != 'Students view own enrollments or admins view all'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.course_enrollments', pol.policyname);
  END LOOP;
END $$;

-- 7.2 Establish canonical SELECT policy explicitly scoped TO authenticated
DROP POLICY IF EXISTS "Students view own enrollments or admins view all" ON public.course_enrollments;
CREATE POLICY "Students view own enrollments or admins view all"
    ON public.course_enrollments
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

COMMIT;

-- ------------------------------------------------------------------------------
-- 8. READ-ONLY PREFLIGHT & DIAGNOSTIC QUERIES (Run in SQL Editor Before Migration)
-- Standalone, stateless, read-only queries. Zero session or connection-pool dependency.
-- ------------------------------------------------------------------------------
/*
-- ==============================================================================
-- PREFLIGHT 1: Inspect public.enrollment_status enum labels in public namespace
-- ==============================================================================
SELECT 
  n.nspname AS schema_name,
  t.typname AS enum_name,
  e.enumlabel AS enum_label,
  e.enumsortorder AS sort_order
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' 
  AND t.typname = 'enrollment_status'
ORDER BY e.enumsortorder;

-- ==============================================================================
-- PREFLIGHT 2: Inspect existing columns and data types in public.course_enrollments
-- ==============================================================================
SELECT 
  column_name,
  data_type,
  udt_schema,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'course_enrollments'
ORDER BY ordinal_position;

-- ==============================================================================
-- PREFLIGHT 3: STANDALONE OPTIONAL-COLUMN DIAGNOSTICS (Stateless & Pool-Safe)
-- Separates column-presence detection (via information_schema) from row aggregation.
-- Correctly handles empty tables ('TABLE_EMPTY') and absent columns ('COLUMN_NOT_PRESENT').
-- No aggregate expressions in GROUP BY. Completely stateless and pool-safe.
-- ==============================================================================
WITH cols AS (
  SELECT 
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'course_enrollments' AND column_name = 'status'
    ) AS has_status,
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'course_enrollments' AND column_name = 'enrollment_status'
    ) AS has_legacy,
    (SELECT COUNT(*) FROM public.course_enrollments) AS total_rows
),
status_vals AS (
  SELECT 
    COALESCE(to_jsonb(ce)->>'status', '[NULL]') AS val,
    COUNT(*) AS cnt
  FROM public.course_enrollments ce
  GROUP BY to_jsonb(ce)->>'status'
),
legacy_vals AS (
  SELECT 
    COALESCE(to_jsonb(ce)->>'enrollment_status', '[NULL]') AS val,
    COUNT(*) AS cnt
  FROM public.course_enrollments ce
  GROUP BY to_jsonb(ce)->>'enrollment_status'
)
SELECT 
  'status' AS analyzed_column,
  CASE 
    WHEN NOT c.has_status THEN 'COLUMN_NOT_PRESENT'
    WHEN c.total_rows = 0 THEN 'TABLE_EMPTY'
    ELSE s.val
  END AS status_value,
  CASE 
    WHEN NOT c.has_status OR c.total_rows = 0 THEN 0
    ELSE s.cnt
  END AS record_count
FROM cols c
LEFT JOIN status_vals s ON c.has_status AND c.total_rows > 0

UNION ALL

SELECT 
  'enrollment_status' AS analyzed_column,
  CASE 
    WHEN NOT c.has_legacy THEN 'COLUMN_NOT_PRESENT'
    WHEN c.total_rows = 0 THEN 'TABLE_EMPTY'
    ELSE l.val
  END AS status_value,
  CASE 
    WHEN NOT c.has_legacy OR c.total_rows = 0 THEN 0
    ELSE l.cnt
  END AS record_count
FROM cols c
LEFT JOIN legacy_vals l ON c.has_legacy AND c.total_rows > 0
ORDER BY analyzed_column, status_value;

-- ==============================================================================
-- PREFLIGHT 4: STANDALONE ENROLLMENT INTEGRITY & RECORD-LEVEL DIAGNOSTICS
-- Safe to execute whether user_id, course_id, student_id, id, or created_at exist.
-- Completely stateless. No temporary tables or functions.
-- CRITICAL POLICY:
--   - Do not automatically delete, merge, or overwrite any records.
--   - Do not enforce NOT NULL on user_id or course_id without verified data and application compatibility.
-- ==============================================================================
-- 4.1 Summary of record totals, column presence, nullability, and backfill readiness
WITH cols AS (
  SELECT 
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_enrollments' AND column_name = 'user_id') AS has_user_id,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_enrollments' AND column_name = 'course_id') AS has_course_id,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_enrollments' AND column_name = 'student_id') AS has_student_id,
    (SELECT COUNT(*) FROM public.course_enrollments) AS total_rows
)
SELECT 
  c.total_rows AS total_records,
  c.has_user_id,
  COUNT(CASE WHEN c.has_user_id AND to_jsonb(ce)->>'user_id' IS NULL THEN 1 END) AS null_user_id_count,
  COUNT(CASE WHEN c.has_user_id AND to_jsonb(ce)->>'user_id' IS NOT NULL THEN 1 END) AS populated_user_id_count,
  c.has_course_id,
  COUNT(CASE WHEN c.has_course_id AND to_jsonb(ce)->>'course_id' IS NULL THEN 1 END) AS null_course_id_count,
  COUNT(CASE WHEN c.has_course_id AND to_jsonb(ce)->>'course_id' IS NOT NULL THEN 1 END) AS populated_course_id_count,
  c.has_student_id,
  COUNT(CASE WHEN c.has_student_id AND to_jsonb(ce)->>'student_id' IS NOT NULL THEN 1 END) AS populated_student_id_count,
  COUNT(CASE 
    WHEN (c.has_user_id AND to_jsonb(ce)->>'user_id' IS NULL)
     AND (c.has_student_id AND to_jsonb(ce)->>'student_id' IS NOT NULL) THEN 1 
  END) AS eligible_for_backfill_count
FROM cols c
LEFT JOIN public.course_enrollments ce ON c.total_rows > 0
GROUP BY c.total_rows, c.has_user_id, c.has_course_id, c.has_student_id;

-- 4.2 Detect duplicate enrollments on (user_id, course_id)
SELECT 
  to_jsonb(ce)->>'user_id' AS user_id,
  to_jsonb(ce)->>'course_id' AS course_id,
  COUNT(*) AS duplicate_count
FROM public.course_enrollments ce
WHERE (to_jsonb(ce) ? 'user_id') AND (to_jsonb(ce) ? 'course_id')
  AND to_jsonb(ce)->>'user_id' IS NOT NULL 
  AND to_jsonb(ce)->>'course_id' IS NOT NULL
GROUP BY to_jsonb(ce)->>'user_id', to_jsonb(ce)->>'course_id'
HAVING COUNT(*) > 1;

-- 4.3 Detect orphan user_id records (not present in public.profiles)
SELECT 
  to_jsonb(ce)->>'id' AS record_id,
  to_jsonb(ce)->>'user_id' AS user_id,
  to_jsonb(ce)->>'course_id' AS course_id,
  to_jsonb(ce)->>'created_at' AS created_at
FROM public.course_enrollments ce
WHERE (to_jsonb(ce) ? 'user_id')
  AND to_jsonb(ce)->>'user_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id::text = to_jsonb(ce)->>'user_id'
  );

-- 4.4 Sample incomplete records (NULL user_id or NULL course_id)
SELECT 
  to_jsonb(ce)->>'id' AS record_id,
  to_jsonb(ce)->>'user_id' AS user_id,
  to_jsonb(ce)->>'course_id' AS course_id,
  to_jsonb(ce)->>'created_at' AS created_at
FROM public.course_enrollments ce
WHERE (to_jsonb(ce) ? 'user_id' AND to_jsonb(ce)->>'user_id' IS NULL)
   OR (to_jsonb(ce) ? 'course_id' AND to_jsonb(ce)->>'course_id' IS NULL)
LIMIT 10;

-- ==============================================================================
-- PREFLIGHT 5: ROLE MEMBERSHIPS & EFFECTIVE TABLE / COLUMN PRIVILEGES
-- Checks actual roles: anon, authenticated, service_role.
-- PUBLIC grants are automatically reflected in these roles' effective privileges.
-- ==============================================================================
-- 5.1 Role catalog information and memberships
SELECT 
  r.rolname AS role_name,
  r.rolcanlogin AS can_login,
  r.rolsuper AS is_superuser,
  ARRAY(
    SELECT m.rolname 
    FROM pg_roles m 
    WHERE pg_has_role(r.rolname, m.rolname, 'MEMBER') AND m.rolname != r.rolname
  ) AS member_of_roles
FROM pg_roles r
WHERE r.rolname IN ('anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin')
ORDER BY r.rolname;

-- 5.2 Effective table-level privileges across actual roles (evaluates direct + PUBLIC grants)
SELECT 
  role_name,
  target_table,
  has_table_privilege(role_name, target_table, 'SELECT') AS can_select,
  has_table_privilege(role_name, target_table, 'INSERT') AS can_insert,
  has_table_privilege(role_name, target_table, 'UPDATE') AS can_update,
  has_table_privilege(role_name, target_table, 'DELETE') AS can_delete,
  has_table_privilege(role_name, target_table, 'TRUNCATE') AS can_truncate,
  has_table_privilege(role_name, target_table, 'REFERENCES') AS can_references,
  has_table_privilege(role_name, target_table, 'TRIGGER') AS can_trigger
FROM (
  VALUES 
    ('anon', 'public.courses'),
    ('authenticated', 'public.courses'),
    ('service_role', 'public.courses'),
    ('anon', 'public.course_enrollments'),
    ('authenticated', 'public.course_enrollments'),
    ('service_role', 'public.course_enrollments'),
    ('anon', 'public.admin_mfa_challenges'),
    ('authenticated', 'public.admin_mfa_challenges'),
    ('service_role', 'public.admin_mfa_challenges')
) AS checks(role_name, target_table);

-- 5.3 Explicit column-level grants from information_schema (including explicit PUBLIC grants)
SELECT 
  cp.grantee,
  cp.table_schema,
  cp.table_name,
  cp.column_name,
  cp.privilege_type,
  cp.is_grantable
FROM information_schema.column_privileges cp
WHERE cp.table_schema = 'public'
  AND cp.table_name IN ('courses', 'course_enrollments', 'admin_mfa_challenges')
  AND cp.grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
ORDER BY cp.table_name, cp.column_name, cp.grantee, cp.privilege_type;

-- 5.4 Effective column-level privileges for actual roles (evaluates direct + PUBLIC grants)
SELECT 
  r.role_name,
  c.table_name,
  c.column_name,
  has_column_privilege(r.role_name, format('public.%I', c.table_name), c.column_name, 'SELECT') AS can_select,
  has_column_privilege(r.role_name, format('public.%I', c.table_name), c.column_name, 'INSERT') AS can_insert,
  has_column_privilege(r.role_name, format('public.%I', c.table_name), c.column_name, 'UPDATE') AS can_update,
  has_column_privilege(r.role_name, format('public.%I', c.table_name), c.column_name, 'REFERENCES') AS can_references
FROM (
  VALUES ('anon'), ('authenticated'), ('service_role')
) AS r(role_name)
CROSS JOIN (
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name IN ('courses', 'course_enrollments', 'admin_mfa_challenges')
) c
ORDER BY c.table_name, c.column_name, r.role_name;

-- ==============================================================================
-- PREFLIGHT 6: LIVE RLS POLICY INVENTORY ON public.course_enrollments
-- Review all active policies before migration execution.
-- ==============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check,
  CASE 
    WHEN policyname = 'Students view own enrollments or admins view all' THEN 'PRESERVED_AND_REFRESHED'
    ELSE 'WILL_BE_DROPPED_BY_MIGRATION'
  END AS expected_migration_action
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'course_enrollments';
*/

-- ------------------------------------------------------------------------------
-- 9. READ-ONLY POST-MIGRATION VALIDATION QUERIES (Run After Migration Execution)
-- ------------------------------------------------------------------------------
/*
-- Post-Validation 1: Verify effective table privileges across actual roles
SELECT 
  role_name,
  target_table,
  has_table_privilege(role_name, target_table, 'SELECT') AS can_select,
  has_table_privilege(role_name, target_table, 'INSERT') AS can_insert,
  has_table_privilege(role_name, target_table, 'UPDATE') AS can_update,
  has_table_privilege(role_name, target_table, 'DELETE') AS can_delete,
  has_table_privilege(role_name, target_table, 'TRUNCATE') AS can_truncate,
  has_table_privilege(role_name, target_table, 'REFERENCES') AS can_references,
  has_table_privilege(role_name, target_table, 'TRIGGER') AS can_trigger
FROM (
  VALUES 
    ('anon', 'public.courses'),
    ('authenticated', 'public.courses'),
    ('service_role', 'public.courses'),
    ('anon', 'public.course_enrollments'),
    ('authenticated', 'public.course_enrollments'),
    ('service_role', 'public.course_enrollments'),
    ('anon', 'public.admin_mfa_challenges'),
    ('authenticated', 'public.admin_mfa_challenges'),
    ('service_role', 'public.admin_mfa_challenges')
) AS checks(role_name, target_table);

-- Post-Validation 2: Verify active policies on course_enrollments (must show exactly 1 SELECT policy TO authenticated)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check 
FROM pg_policies 
WHERE tablename = 'course_enrollments';

-- Post-Validation 3: Verify foreign key definition (single column user_id -> profiles.id, ON DELETE CASCADE, validated)
SELECT 
  c.conname,
  c.conrelid::regclass AS source_table,
  c.confrelid::regclass AS referenced_table,
  c.confdeltype,
  c.confupdtype,
  c.confmatchtype,
  c.condeferrable,
  c.condeferred,
  c.convalidated
FROM pg_constraint c
WHERE c.conrelid = 'public.course_enrollments'::regclass
  AND c.contype = 'f';

-- Post-Validation 4: Verify unique constraint on (user_id, course_id)
-- Checks constraint flags and backing index NULL uniqueness semantics (indnullsnotdistinct = false)
SELECT 
  c.conname,
  c.contype,
  c.condeferrable,
  c.condeferred,
  c.convalidated,
  COALESCE(i.indnullsnotdistinct, FALSE) AS indnullsnotdistinct,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
LEFT JOIN pg_index i ON i.indexrelid = c.conindid
WHERE c.conrelid = 'public.course_enrollments'::regclass
  AND c.contype = 'u';

-- Post-Validation 5: Verify all active unique indexes on public.course_enrollments
-- Validates indisunique, indisvalid, indisready, indislive, and indnullsnotdistinct (PG 15+)
SELECT 
  c.relname AS index_name,
  i.indisunique,
  i.indisvalid,
  i.indisready,
  i.indislive,
  COALESCE(i.indnullsnotdistinct, FALSE) AS indnullsnotdistinct,
  pg_get_indexdef(i.indexrelid) AS index_definition
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
WHERE i.indrelid = 'public.course_enrollments'::regclass
  AND i.indisunique = TRUE;
*/

-- ------------------------------------------------------------------------------
-- 10. ROLLBACK CONSIDERATIONS & LIMITATIONS
-- ------------------------------------------------------------------------------
/*
-- IMPORTANT: The statements below provide guidance for manual rollback of specific
-- structural changes. They DO NOT constitute a complete automated rollback, as data
-- state changes cannot be reversed automatically without a pre-migration database backup.
--
-- 1. WHAT CAN BE REVERSED:
--    a. RLS Policy:
--       DROP POLICY IF EXISTS "Students view own enrollments or admins view all" ON public.course_enrollments;
--       (Re-create previous policy only if the exact prior definition was documented).
--    b. Table Privileges:
--       Grants and revokes can be modified to match previous ACL states documented before migration.
--    c. Unique Constraint:
--       ALTER TABLE public.course_enrollments DROP CONSTRAINT IF EXISTS unique_user_course_enrollment;
--    d. Foreign Key:
--       ALTER TABLE public.course_enrollments DROP CONSTRAINT IF EXISTS fk_course_enrollments_user_id;
--    e. Added Columns (DESTRUCTIVE - will delete data populated since migration):
--       -- ALTER TABLE public.course_enrollments DROP COLUMN IF EXISTS status;
--       -- ALTER TABLE public.course_enrollments DROP COLUMN IF EXISTS user_id;
--       -- DROP TYPE IF EXISTS public.enrollment_status;
--
-- 2. WHAT CANNOT BE AUTOMATICALLY REVERSED:
--    a. Non-destructive backfills:
--       The UPDATE statements backfill 'user_id' from 'student_id' where 'user_id' was NULL,
--       and normalize recognized 'enrollment_status' values into 'status'. Once written,
--       rows that previously had user_id = NULL cannot be programmatically distinguished
--       from rows that were already populated, unless a point-in-time snapshot or pre-migration
--       backup table exists.
--    b. Newly inserted/updated records:
--       Any course enrollment records created by the application after this migration runs
--       will rely on the 'user_id' and 'status' columns.
*/
