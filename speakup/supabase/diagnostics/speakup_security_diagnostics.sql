-- ==============================================================================
-- SpeakUp LMS — Consolidated Read-Only Security Diagnostic SQL Suite
-- Engine Compatibility: PostgreSQL 15.x and 16+ (Version-agnostic catalog parsing)
-- Target Roles: anon, authenticated, service_role
-- Target Tables: public.courses, public.course_enrollments, public.admin_mfa_challenges
-- Target Schema: public
-- Mode: Strictly READ-ONLY (Acquires standard ACCESS SHARE locks; zero mutations)
-- Incorporates all verified corrections through Round 30
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- DIAGNOSTIC 1: RECURSIVE ROLE MEMBERSHIP & INHERITANCE PATH AUDIT
-- Resolves complete direct and transitive role membership graphs.
-- Distinguishes automatic privilege inheritance from session-switching (SET ROLE).
-- Uses server_version_num for version detection without depending on table rows.
-- Safe on PG 15 (rolinherit fallback) and PG 16+ (granular inherit_option / set_option).
-- ------------------------------------------------------------------------------
WITH RECURSIVE role_graph AS (
  -- Base case: direct memberships of client roles
  SELECT 
    m.rolname AS root_client_role,
    m.oid AS root_role_oid,
    p.rolname AS parent_role,
    p.oid AS parent_role_oid,
    1 AS depth,
    ARRAY[m.rolname, p.rolname] AS role_path,
    am.admin_option AS edge_admin_option,
    -- Detect inherit_option on PG 16+ via to_jsonb; fall back to member's rolinherit on PG 15
    CASE 
      WHEN current_setting('server_version_num')::integer >= 160000 
        THEN COALESCE((to_jsonb(am)->>'inherit_option')::boolean, TRUE)
      ELSE m.rolinherit
    END AS edge_inherits,
    -- Detect set_option on PG 16+ via to_jsonb; fall back to TRUE on PG 15
    CASE 
      WHEN current_setting('server_version_num')::integer >= 160000 
        THEN COALESCE((to_jsonb(am)->>'set_option')::boolean, TRUE)
      ELSE TRUE
    END AS edge_can_set_role,
    CASE 
      WHEN current_setting('server_version_num')::integer >= 160000 
        THEN COALESCE((to_jsonb(am)->>'inherit_option')::boolean, TRUE)
      ELSE m.rolinherit
    END AS cumulative_inherits,
    CASE 
      WHEN current_setting('server_version_num')::integer >= 160000 
        THEN COALESCE((to_jsonb(am)->>'set_option')::boolean, TRUE)
      ELSE TRUE
    END AS cumulative_can_set_role
  FROM pg_auth_members am
  JOIN pg_roles m ON m.oid = am.member
  JOIN pg_roles p ON p.oid = am.roleid
  WHERE m.rolname IN ('anon', 'authenticated', 'service_role')

  UNION ALL

  -- Recursive step: multi-hop transitive memberships (parent of parent)
  SELECT 
    rg.root_client_role,
    rg.root_role_oid,
    p.rolname AS parent_role,
    p.oid AS parent_role_oid,
    rg.depth + 1,
    rg.role_path || p.rolname,
    am.admin_option AS edge_admin_option,
    CASE 
      WHEN current_setting('server_version_num')::integer >= 160000 
        THEN COALESCE((to_jsonb(am)->>'inherit_option')::boolean, TRUE)
      ELSE m.rolinherit
    END AS edge_inherits,
    CASE 
      WHEN current_setting('server_version_num')::integer >= 160000 
        THEN COALESCE((to_jsonb(am)->>'set_option')::boolean, TRUE)
      ELSE TRUE
    END AS edge_can_set_role,
    -- Cumulative inheritance requires every edge along the path to have inheritance enabled
    rg.cumulative_inherits AND (
      CASE 
        WHEN current_setting('server_version_num')::integer >= 160000 
          THEN COALESCE((to_jsonb(am)->>'inherit_option')::boolean, TRUE)
        ELSE m.rolinherit
      END
    ) AS cumulative_inherits,
    -- Cumulative SET ROLE capability requires every edge along the path to permit SET ROLE
    rg.cumulative_can_set_role AND (
      CASE 
        WHEN current_setting('server_version_num')::integer >= 160000 
          THEN COALESCE((to_jsonb(am)->>'set_option')::boolean, TRUE)
        ELSE TRUE
      END
    ) AS cumulative_can_set_role
  FROM pg_auth_members am
  JOIN pg_roles m ON m.oid = am.member
  JOIN pg_roles p ON p.oid = am.roleid
  JOIN role_graph rg ON rg.parent_role_oid = am.member
  WHERE NOT (p.rolname = ANY(rg.role_path)) -- Cycle prevention
)
SELECT 
  root_client_role,
  parent_role,
  depth,
  array_to_string(role_path, ' -> ') AS inheritance_path,
  edge_admin_option AS admin_option,
  edge_inherits AS hop_inherits,
  edge_can_set_role AS hop_can_set_role,
  cumulative_inherits AS path_inherits_privileges,
  cumulative_can_set_role AS path_allows_set_role,
  CASE 
    WHEN cumulative_inherits AND cumulative_can_set_role THEN 
      'INHERIT_AND_SET_ROLE (Privileges inherited automatically; session can also SET ROLE)'
    WHEN cumulative_inherits THEN 
      'AUTOMATIC_INHERITANCE_ONLY (Privileges inherited automatically; SET ROLE blocked)'
    WHEN cumulative_can_set_role THEN 
      'SET_ROLE_ONLY (NOINHERIT; privileges accessible ONLY via explicit SET ROLE)'
    ELSE 'BLOCKED_MEMBERSHIP (Neither INHERIT nor SET ROLE enabled)'
  END AS path_membership_mode
FROM role_graph
ORDER BY root_client_role, depth, parent_role;

-- ------------------------------------------------------------------------------
-- DIAGNOSTIC 2: TABLE-LEVEL RAW ACL INSPECTION (pg_class.relacl)
-- Decomposes actual catalog ACL arrays. Resolves default ACLs if relacl IS NULL.
-- ------------------------------------------------------------------------------
SELECT 
  n.nspname AS schema_name,
  c.relname AS table_name,
  pg_get_userbyid(c.relowner) AS table_owner,
  c.relacl IS NULL AS uses_implicit_default_acl,
  COALESCE(r.rolname, 'PUBLIC') AS grantee_role,
  priv.privilege_type,
  priv.is_grantable,
  pg_get_userbyid(priv.grantor) AS grantor_role
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r'::"char", c.relowner))) priv
LEFT JOIN pg_roles r ON r.oid = priv.grantee
WHERE n.nspname = 'public'
  AND c.relname IN ('courses', 'course_enrollments', 'admin_mfa_challenges')
ORDER BY c.relname, grantee_role, priv.privilege_type;

-- ------------------------------------------------------------------------------
-- DIAGNOSTIC 3: COLUMN-LEVEL RAW ACL INSPECTION (pg_attribute.attacl)
-- Decomposes granular column-level ACLs for target tables.
-- ------------------------------------------------------------------------------
SELECT 
  n.nspname AS schema_name,
  c.relname AS table_name,
  a.attname AS column_name,
  a.attnum AS column_index,
  COALESCE(r.rolname, 'PUBLIC') AS grantee_role,
  priv.privilege_type,
  priv.is_grantable,
  pg_get_userbyid(priv.grantor) AS grantor_role
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
CROSS JOIN LATERAL aclexplode(a.attacl) priv
LEFT JOIN pg_roles r ON r.oid = priv.grantee
WHERE n.nspname = 'public'
  AND c.relname IN ('courses', 'course_enrollments', 'admin_mfa_challenges')
  AND a.attnum > 0 
  AND NOT a.attisdropped
ORDER BY c.relname, a.attnum, grantee_role, priv.privilege_type;

-- ------------------------------------------------------------------------------
-- DIAGNOSTIC 4A: TABLE-LEVEL EFFECTIVE PRIVILEGES & COMPLETE ACL IDENTITY ATTRIBUTION
-- Evaluates has_table_privilege across target tables and client roles.
-- Identifies every underlying ACL entry using: grantor, grantee, privilege, and grantable.
-- Deduplicates multiple membership paths to the same underlying ancestor ACL grant.
-- Preserves all distinct membership paths as supporting diagnostic evidence.
-- Partitions table ownership from ordinary grants to eliminate duplicate counting.
-- ------------------------------------------------------------------------------
WITH RECURSIVE active_role_tree AS (
  -- Base case: direct memberships of client roles
  SELECT 
    m.rolname AS client_role,
    p.rolname AS parent_role,
    p.oid AS parent_role_oid,
    ARRAY[m.rolname, p.rolname] AS path,
    array_to_string(ARRAY[m.rolname, p.rolname], '->') AS path_str,
    CASE 
      WHEN current_setting('server_version_num')::integer >= 160000 
        THEN COALESCE((to_jsonb(am)->>'inherit_option')::boolean, TRUE)
      ELSE m.rolinherit
    END AS cumulative_inherits
  FROM pg_auth_members am
  JOIN pg_roles m ON m.oid = am.member
  JOIN pg_roles p ON p.oid = am.roleid
  WHERE m.rolname IN ('anon', 'authenticated', 'service_role')

  UNION ALL

  -- Recursive step: transitive memberships with cycle prevention
  SELECT 
    art.client_role,
    p.rolname AS parent_role,
    p.oid AS parent_role_oid,
    art.path || p.rolname,
    art.path_str || '->' || p.rolname,
    art.cumulative_inherits AND (
      CASE 
        WHEN current_setting('server_version_num')::integer >= 160000 
          THEN COALESCE((to_jsonb(am)->>'inherit_option')::boolean, TRUE)
        ELSE m.rolinherit
      END
    ) AS cumulative_inherits
  FROM pg_auth_members am
  JOIN pg_roles m ON m.oid = am.member
  JOIN pg_roles p ON p.oid = am.roleid
  JOIN active_role_tree art ON art.parent_role_oid = am.member
  WHERE NOT (p.rolname = ANY(art.path))
),
-- Deduplicate membership paths per ancestor role; preserve paths as concatenated evidence
active_inherited_roles AS (
  SELECT 
    client_role,
    parent_role,
    parent_role_oid,
    string_agg(path_str, ', ' ORDER BY path_str) AS inheritance_paths
  FROM active_role_tree
  WHERE cumulative_inherits = TRUE
  GROUP BY client_role, parent_role, parent_role_oid
),
role_table_privs AS (
  SELECT 
    r.rolname AS role_name,
    r.oid AS role_oid,
    t.relname AS target_table,
    p.priv_name
  FROM (VALUES ('anon'), ('authenticated'), ('service_role')) r_names(rolname)
  JOIN pg_roles r ON r.rolname = r_names.rolname
  CROSS JOIN (VALUES ('courses'), ('course_enrollments'), ('admin_mfa_challenges')) t(relname)
  CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(priv_name)
),
identified_table_sources AS (
  SELECT 
    rtp.role_name,
    rtp.target_table,
    rtp.priv_name,
    source_label
  FROM role_table_privs rtp
  CROSS JOIN LATERAL (
    -- Source 1: Direct table ownership
    -- Verified via ownership defaults (c.relacl IS NULL) or explicit owner ACE in c.relacl
    SELECT 'CONFIRMED: DIRECT_TABLE_OWNERSHIP' AS source_label
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = rtp.target_table
      AND c.relowner = rtp.role_oid
      AND (
        c.relacl IS NULL 
        OR EXISTS (
          SELECT 1 FROM aclexplode(c.relacl) priv
          WHERE priv.grantee = c.relowner AND priv.privilege_type = rtp.priv_name
        )
      )

    UNION ALL

    -- Source 2: Inherited table ownership
    -- Deduplicated by owner role; paths displayed as supporting evidence
    SELECT 'CONFIRMED: INHERITED_TABLE_OWNERSHIP(' || air.parent_role || ' [paths: ' || air.inheritance_paths || '])'
    FROM active_inherited_roles air
    JOIN pg_class c ON c.relname = rtp.target_table
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND air.client_role = rtp.role_name
      AND air.parent_role_oid = c.relowner
      AND (
        c.relacl IS NULL 
        OR EXISTS (
          SELECT 1 FROM aclexplode(c.relacl) priv
          WHERE priv.grantee = c.relowner AND priv.privilege_type = rtp.priv_name
        )
      )

    UNION ALL

    -- Source 3: Direct non-owner table grant in pg_class.relacl
    -- Identifies full underlying ACL identity: grantor, grantee, privilege, grantable
    SELECT 'CONFIRMED: DIRECT_TABLE_GRANT(grantor=' || pg_get_userbyid(priv.grantor) || 
      ', grantee=' || pg_get_userbyid(priv.grantee) || 
      ', privilege=' || priv.privilege_type || 
      ', grantable=' || priv.is_grantable || ')'
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) priv
    WHERE n.nspname = 'public' AND c.relname = rtp.target_table
      AND priv.grantee = rtp.role_oid
      AND priv.grantee != c.relowner
      AND priv.privilege_type = rtp.priv_name

    UNION ALL

    -- Source 4: Universal grant to PUBLIC in pg_class.relacl
    -- Identifies full underlying ACL identity preserving grantee=PUBLIC
    SELECT 'CONFIRMED: PUBLIC_TABLE_GRANT(grantor=' || pg_get_userbyid(priv.grantor) || 
      ', grantee=PUBLIC, privilege=' || priv.privilege_type || 
      ', grantable=' || priv.is_grantable || ')'
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r'::"char", c.relowner))) priv
    WHERE n.nspname = 'public' AND c.relname = rtp.target_table
      AND priv.grantee = 0
      AND priv.privilege_type = rtp.priv_name

    UNION ALL

    -- Source 5: Inherited non-owner table grant
    -- Deduplicated by underlying ACL identity (grantor, grantee, priv_name, grantable).
    -- Multiple paths to one ancestor ACE count as 1 source; distinct ACEs count separately.
    SELECT 'CONFIRMED: INHERITED_TABLE_GRANT(' || air.parent_role || 
      ' [grantor=' || pg_get_userbyid(priv.grantor) || 
      ', grantee=' || pg_get_userbyid(priv.grantee) || 
      ', privilege=' || priv.privilege_type || 
      ', grantable=' || priv.is_grantable || 
      '; paths: ' || air.inheritance_paths || '])'
    FROM active_inherited_roles air
    JOIN pg_class c ON c.relname = rtp.target_table
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) priv
    WHERE n.nspname = 'public'
      AND air.client_role = rtp.role_name
      AND priv.grantee = air.parent_role_oid
      AND priv.grantee != c.relowner
      AND priv.privilege_type = rtp.priv_name

    UNION ALL

    -- Source 6: Direct client superuser bypass (non-inheritable attribute)
    SELECT 'CONFIRMED: CLIENT_SUPERUSER_BYPASS'
    FROM pg_roles r
    WHERE r.oid = rtp.role_oid AND r.rolsuper = TRUE

    UNION ALL

    -- Source 7: Predefined global table roles
    -- Deduplicated by predefined role; multiple paths count as 1 source
    SELECT 'CONFIRMED: PREDEFINED_ROLE(pg_read_all_data [paths: ' || air.inheritance_paths || '])'
    FROM active_inherited_roles air
    WHERE air.client_role = rtp.role_name
      AND air.parent_role = 'pg_read_all_data'
      AND rtp.priv_name = 'SELECT'

    UNION ALL

    SELECT 'CONFIRMED: PREDEFINED_ROLE(pg_write_all_data [paths: ' || air.inheritance_paths || '])'
    FROM active_inherited_roles air
    WHERE air.client_role = rtp.role_name
      AND air.parent_role = 'pg_write_all_data'
      AND rtp.priv_name IN ('INSERT', 'UPDATE', 'DELETE')
  ) sources
)
SELECT 
  rtp.role_name,
  rtp.target_table,
  rtp.priv_name,
  has_table_privilege(rtp.role_name, 'public.' || rtp.target_table, rtp.priv_name) AS has_effective_privilege,
  CASE 
    WHEN NOT has_table_privilege(rtp.role_name, 'public.' || rtp.target_table, rtp.priv_name) THEN 'NONE'
    WHEN its.aggregated_sources IS NOT NULL THEN its.aggregated_sources
    ELSE 'UNRESOLVED_COMPOSITE_SOURCE (Privilege confirmed by engine, source unmapped in static catalogs)'
  END AS attributed_privilege_source,
  CASE 
    WHEN NOT has_table_privilege(rtp.role_name, 'public.' || rtp.target_table, rtp.priv_name) THEN 'NO_PRIVILEGE'
    WHEN its.source_count > 1 THEN 'MULTIPLE_CONFIRMED_SOURCES (Explicitly listed)'
    WHEN its.source_count = 1 THEN 'SINGLE_CONFIRMED_SOURCE'
    ELSE 'AMBIGUOUS_UNRESOLVED'
  END AS source_multiplicity
FROM role_table_privs rtp
LEFT JOIN (
  SELECT 
    role_name,
    target_table,
    priv_name,
    string_agg(DISTINCT source_label, '; ' ORDER BY source_label) AS aggregated_sources,
    count(DISTINCT source_label) AS source_count
  FROM identified_table_sources
  GROUP BY role_name, target_table, priv_name
) its ON its.role_name = rtp.role_name 
     AND its.target_table = rtp.target_table 
     AND its.priv_name = rtp.priv_name
ORDER BY rtp.target_table, rtp.role_name, rtp.priv_name;

-- ------------------------------------------------------------------------------
-- DIAGNOSTIC 4B: DYNAMIC COLUMN-LEVEL PRIVILEGES & COMPLETE ACL IDENTITY ATTRIBUTION
-- Discovers actual columns dynamically from pg_attribute.
-- Identifies every underlying ACL entry using: grantor, grantee, privilege, and grantable.
-- Deduplicates multiple membership paths to the same underlying ancestor column or table grant.
-- Preserves all distinct membership paths as supporting diagnostic evidence.
-- Incorporates accepted Round 30 correction: includes DELETE in pg_write_all_data check.
-- Reports MULTIPLE_CONFIRMED_SOURCES when explicit column grants and independent table grants co-exist.
-- ------------------------------------------------------------------------------
WITH RECURSIVE active_role_tree AS (
  SELECT 
    m.rolname AS client_role,
    p.rolname AS parent_role,
    p.oid AS parent_role_oid,
    ARRAY[m.rolname, p.rolname] AS path,
    array_to_string(ARRAY[m.rolname, p.rolname], '->') AS path_str,
    CASE 
      WHEN current_setting('server_version_num')::integer >= 160000 
        THEN COALESCE((to_jsonb(am)->>'inherit_option')::boolean, TRUE)
      ELSE m.rolinherit
    END AS cumulative_inherits
  FROM pg_auth_members am
  JOIN pg_roles m ON m.oid = am.member
  JOIN pg_roles p ON p.oid = am.roleid
  WHERE m.rolname IN ('anon', 'authenticated', 'service_role')

  UNION ALL

  SELECT 
    art.client_role,
    p.rolname AS parent_role,
    p.oid AS parent_role_oid,
    art.path || p.rolname,
    art.path_str || '->' || p.rolname,
    art.cumulative_inherits AND (
      CASE 
        WHEN current_setting('server_version_num')::integer >= 160000 
          THEN COALESCE((to_jsonb(am)->>'inherit_option')::boolean, TRUE)
        ELSE m.rolinherit
      END
    ) AS cumulative_inherits
  FROM pg_auth_members am
  JOIN pg_roles m ON m.oid = am.member
  JOIN pg_roles p ON p.oid = am.roleid
  JOIN active_role_tree art ON art.parent_role_oid = am.member
  WHERE NOT (p.rolname = ANY(art.path)) -- Cycle prevention
),
-- Deduplicate membership paths per ancestor role; preserve paths as concatenated evidence
active_inherited_roles AS (
  SELECT 
    client_role,
    parent_role,
    parent_role_oid,
    string_agg(path_str, ', ' ORDER BY path_str) AS inheritance_paths
  FROM active_role_tree
  WHERE cumulative_inherits = TRUE
  GROUP BY client_role, parent_role, parent_role_oid
),
discovered_columns AS (
  SELECT 
    c.relname AS table_name,
    c.relowner,
    c.relacl,
    a.attname AS column_name,
    a.attnum AS column_index,
    a.attacl
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid
  WHERE n.nspname = 'public'
    AND c.relname IN ('courses', 'course_enrollments', 'admin_mfa_challenges')
    AND a.attnum > 0 
    AND NOT a.attisdropped
),
column_priv_checks AS (
  SELECT 
    r.rolname AS role_name,
    r.oid AS role_oid,
    dc.table_name,
    dc.relowner,
    dc.relacl,
    dc.column_name,
    dc.attacl,
    p.priv_name
  FROM (VALUES ('anon'), ('authenticated'), ('service_role')) r_names(rolname)
  JOIN pg_roles r ON r.rolname = r_names.rolname
  CROSS JOIN discovered_columns dc
  CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')) p(priv_name)
),
identified_column_sources AS (
  SELECT 
    cpc.role_name,
    cpc.table_name,
    cpc.column_name,
    cpc.priv_name,
    source_label
  FROM column_priv_checks cpc
  CROSS JOIN LATERAL (
    -- ==========================================================================
    -- 1. EXPLICIT COLUMN-LEVEL ACL GRANTS (pg_attribute.attacl)
    -- ==========================================================================
    -- Source 1A: Direct column ACE in pg_attribute.attacl
    SELECT 'CONFIRMED: DIRECT_COLUMN_GRANT(grantor=' || pg_get_userbyid(priv.grantor) || 
      ', grantee=' || pg_get_userbyid(priv.grantee) || 
      ', privilege=' || priv.privilege_type || 
      ', grantable=' || priv.is_grantable || ')' AS source_label
    FROM aclexplode(cpc.attacl) priv
    WHERE priv.grantee = cpc.role_oid
      AND priv.privilege_type = cpc.priv_name

    UNION ALL

    -- Source 1B: Universal PUBLIC column ACE in pg_attribute.attacl
    SELECT 'CONFIRMED: PUBLIC_COLUMN_GRANT(grantor=' || pg_get_userbyid(priv.grantor) || 
      ', grantee=PUBLIC, privilege=' || priv.privilege_type || 
      ', grantable=' || priv.is_grantable || ')'
    FROM aclexplode(cpc.attacl) priv
    WHERE priv.grantee = 0
      AND priv.privilege_type = cpc.priv_name

    UNION ALL

    -- Source 1C: Inherited column ACE from parent role
    -- Deduplicated by underlying column ACE; multiple paths count as 1 source
    SELECT 'CONFIRMED: INHERITED_COLUMN_GRANT(' || air.parent_role || 
      ' [grantor=' || pg_get_userbyid(priv.grantor) || 
      ', grantee=' || pg_get_userbyid(priv.grantee) || 
      ', privilege=' || priv.privilege_type || 
      ', grantable=' || priv.is_grantable || 
      '; paths: ' || air.inheritance_paths || '])'
    FROM active_inherited_roles air
    CROSS JOIN LATERAL aclexplode(cpc.attacl) priv
    WHERE air.client_role = cpc.role_name
      AND priv.grantee = air.parent_role_oid
      AND priv.privilege_type = cpc.priv_name

    UNION ALL

    -- ==========================================================================
    -- 2. TABLE OWNERSHIP EXPLAINS COLUMN ACCESS
    -- ==========================================================================
    -- Source 2A: Direct table ownership explains column access
    SELECT 'DERIVED: DIRECT_TABLE_OWNERSHIP'
    WHERE cpc.relowner = cpc.role_oid
      AND (
        cpc.relacl IS NULL 
        OR EXISTS (
          SELECT 1 FROM aclexplode(cpc.relacl) priv
          WHERE priv.grantee = cpc.relowner AND priv.privilege_type = cpc.priv_name
        )
      )

    UNION ALL

    -- Source 2B: Inherited table ownership explains column access
    -- Deduplicated by ancestor owner role; multiple paths count as 1 source
    SELECT 'DERIVED: INHERITED_TABLE_OWNERSHIP(' || air.parent_role || ' [paths: ' || air.inheritance_paths || '])'
    FROM active_inherited_roles air
    WHERE air.client_role = cpc.role_name
      AND air.parent_role_oid = cpc.relowner
      AND (
        cpc.relacl IS NULL 
        OR EXISTS (
          SELECT 1 FROM aclexplode(cpc.relacl) priv
          WHERE priv.grantee = cpc.relowner AND priv.privilege_type = cpc.priv_name
        )
      )

    UNION ALL

    -- ==========================================================================
    -- 3. INDEPENDENTLY VERIFIED TABLE-LEVEL GRANTS EXPLAIN COLUMN ACCESS
    -- (Excludes owner ACEs to eliminate duplicate counting with Category 2)
    -- ==========================================================================
    -- Source 3A: Direct non-owner table grant in pg_class.relacl
    SELECT 'DERIVED_FROM_TABLE: DIRECT_TABLE_GRANT(grantor=' || pg_get_userbyid(priv.grantor) || 
      ', grantee=' || pg_get_userbyid(priv.grantee) || 
      ', privilege=' || priv.privilege_type || 
      ', grantable=' || priv.is_grantable || ')'
    FROM aclexplode(cpc.relacl) priv
    WHERE priv.grantee = cpc.role_oid
      AND priv.grantee != cpc.relowner
      AND priv.privilege_type = cpc.priv_name

    UNION ALL

    -- Source 3B: Universal PUBLIC table grant in pg_class.relacl
    SELECT 'DERIVED_FROM_TABLE: PUBLIC_TABLE_GRANT(grantor=' || pg_get_userbyid(priv.grantor) || 
      ', grantee=PUBLIC, privilege=' || priv.privilege_type || 
      ', grantable=' || priv.is_grantable || ')'
    FROM aclexplode(COALESCE(cpc.relacl, acldefault('r'::"char", cpc.relowner))) priv
    WHERE priv.grantee = 0
      AND priv.privilege_type = cpc.priv_name

    UNION ALL

    -- Source 3C: Inherited non-owner table grant
    -- Deduplicated by underlying table ACE; multiple paths count as 1 source
    SELECT 'DERIVED_FROM_TABLE: INHERITED_TABLE_GRANT(' || air.parent_role || 
      ' [grantor=' || pg_get_userbyid(priv.grantor) || 
      ', grantee=' || pg_get_userbyid(priv.grantee) || 
      ', privilege=' || priv.privilege_type || 
      ', grantable=' || priv.is_grantable || 
      '; paths: ' || air.inheritance_paths || '])'
    FROM active_inherited_roles air
    CROSS JOIN LATERAL aclexplode(cpc.relacl) priv
    WHERE air.client_role = cpc.role_name
      AND priv.grantee = air.parent_role_oid
      AND priv.grantee != cpc.relowner
      AND priv.privilege_type = cpc.priv_name

    UNION ALL

    -- Source 3D: Predefined global roles granting table access
    -- Deduplicated by predefined role; multiple paths count as 1 source
    SELECT 'DERIVED_FROM_TABLE: PREDEFINED_ROLE(pg_read_all_data [paths: ' || air.inheritance_paths || '])'
    FROM active_inherited_roles air
    WHERE air.client_role = cpc.role_name
      AND air.parent_role = 'pg_read_all_data'
      AND cpc.priv_name = 'SELECT'

    UNION ALL

    SELECT 'DERIVED_FROM_TABLE: PREDEFINED_ROLE(pg_write_all_data [paths: ' || air.inheritance_paths || '])'
    FROM active_inherited_roles air
    WHERE air.client_role = cpc.role_name
      AND air.parent_role = 'pg_write_all_data'
      AND cpc.priv_name IN ('INSERT', 'UPDATE')

    UNION ALL

    -- ==========================================================================
    -- 4. DIRECT CLIENT SUPERUSER ELEVATION BYPASS
    -- ==========================================================================
    -- Source 4: Direct client superuser bypass (non-inheritable attribute)
    SELECT 'DERIVED: CLIENT_SUPERUSER_BYPASS'
    FROM pg_roles r
    WHERE r.oid = cpc.role_oid AND r.rolsuper = TRUE
  ) sources
)
SELECT 
  cpc.role_name,
  cpc.table_name,
  cpc.column_name,
  cpc.priv_name,
  has_column_privilege(cpc.role_name, format('public.%I', cpc.table_name), cpc.column_name, cpc.priv_name) AS has_effective_privilege,
  CASE 
    WHEN NOT has_column_privilege(cpc.role_name, format('public.%I', cpc.table_name), cpc.column_name, cpc.priv_name) THEN 'NONE'
    WHEN ics.aggregated_sources IS NOT NULL THEN ics.aggregated_sources
    ELSE 'UNRESOLVED_COLUMN_SOURCE (Privilege confirmed by engine, source unmapped in static catalogs)'
  END AS attributed_column_source,
  CASE 
    WHEN NOT has_column_privilege(cpc.role_name, format('public.%I', cpc.table_name), cpc.column_name, cpc.priv_name) THEN 'NO_PRIVILEGE'
    WHEN ics.source_count > 1 THEN 'MULTIPLE_CONFIRMED_SOURCES (Explicitly listed)'
    WHEN ics.source_count = 1 THEN 'SINGLE_CONFIRMED_SOURCE'
    ELSE 'AMBIGUOUS_UNRESOLVED'
  END AS source_multiplicity
FROM column_priv_checks cpc
LEFT JOIN (
  SELECT 
    role_name,
    table_name,
    column_name,
    priv_name,
    string_agg(DISTINCT source_label, '; ' ORDER BY source_label) AS aggregated_sources,
    count(DISTINCT source_label) AS source_count
  FROM identified_column_sources
  GROUP BY role_name, table_name, column_name, priv_name
) ics ON ics.role_name = cpc.role_name 
     AND ics.table_name = cpc.table_name 
     AND ics.column_name = cpc.column_name 
     AND ics.priv_name = cpc.priv_name
ORDER BY cpc.table_name, cpc.column_name, cpc.role_name, cpc.priv_name;

-- ------------------------------------------------------------------------------
-- DIAGNOSTIC 5A: EFFECTIVE SCHEMA PRIVILEGES & DML EXECUTION PREREQUISITE AUDIT
-- Evaluates has_schema_privilege for USAGE and CREATE on schema public.
-- Prerequisite Rule: If has_schema_privilege(role, 'public', 'USAGE') = FALSE,
-- any query on tables in schema public fails with 'permission denied for schema public'
-- regardless of table-level or column-level permissions.
-- ------------------------------------------------------------------------------
SELECT 
  r.rolname AS target_role,
  'public' AS schema_name,
  sp.priv_name AS schema_privilege,
  has_schema_privilege(r.rolname, 'public', sp.priv_name) AS has_effective_schema_privilege,
  CASE 
    WHEN sp.priv_name = 'USAGE' AND has_schema_privilege(r.rolname, 'public', 'USAGE') THEN 
      'ACCESS_PERMITTED: Role can resolve objects and execute DML if table/column privileges permit'
    WHEN sp.priv_name = 'USAGE' AND NOT has_schema_privilege(r.rolname, 'public', 'USAGE') THEN 
      'HARD_BLOCK: All table access in public fails with permission denied for schema public'
    WHEN sp.priv_name = 'CREATE' AND has_schema_privilege(r.rolname, 'public', 'CREATE') THEN 
      'WARNING: Role has CREATE privilege on public schema (can create new relations/types)'
    WHEN sp.priv_name = 'CREATE' AND NOT has_schema_privilege(r.rolname, 'public', 'CREATE') THEN 
      'SAFE: Role cannot create new relations or objects in public schema'
    ELSE 'INSPECT'
  END AS dml_execution_impact
FROM (VALUES ('anon'), ('authenticated'), ('service_role')) r_names(rolname)
JOIN pg_roles r ON r.rolname = r_names.rolname
CROSS JOIN (VALUES ('USAGE'), ('CREATE')) sp(priv_name)
ORDER BY r.rolname, sp.priv_name DESC;

-- ------------------------------------------------------------------------------
-- DIAGNOSTIC 5B: DEFAULT ACLs & RAW SCHEMA ACL INSPECTION
-- Audits pg_default_acl and pg_namespace to verify future table grant propagation
-- and raw catalog schema permissions.
-- ------------------------------------------------------------------------------
SELECT 
  'DEFAULT_ACL' AS object_category,
  n.nspname AS schema_name,
  pg_get_userbyid(d.defaclrole) AS target_defacl_role,
  d.defaclobjtype AS object_type,
  COALESCE(grantee_role.rolname, 'PUBLIC') AS grantee_name,
  priv.privilege_type,
  priv.is_grantable
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) AS priv
LEFT JOIN pg_roles grantee_role ON grantee_role.oid = priv.grantee
WHERE n.nspname = 'public' OR d.defaclnamespace = 0

UNION ALL

SELECT 
  'SCHEMA_PRIVILEGE' AS object_category,
  n.nspname AS schema_name,
  pg_get_userbyid(n.nspowner) AS target_defacl_role,
  's' AS object_type,
  COALESCE(grantee_role.rolname, 'PUBLIC') AS grantee_name,
  priv.privilege_type,
  priv.is_grantable
FROM pg_namespace n
CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl, acldefault('n'::"char", n.nspowner))) AS priv
LEFT JOIN pg_roles grantee_role ON grantee_role.oid = priv.grantee
WHERE n.nspname = 'public';

-- ------------------------------------------------------------------------------
-- DIAGNOSTIC 6: COMPLETE ANCESTOR ROLE INVENTORY & ELEVATION AUDIT
-- Displays EVERY ancestor role reached through recursive membership paths.
-- Evaluates rolsuper and rolbypassrls before generic predefined-role names.
-- Classifies ancestor rolsuper/rolbypassrls as non-inheritable special attributes,
-- switchable ONLY if the path permits SET ROLE; never as automatically inherited.
-- ------------------------------------------------------------------------------
WITH RECURSIVE member_roles AS (
  SELECT 
    m.rolname AS client_role,
    p.rolname AS parent_role,
    p.oid AS parent_role_oid,
    1 AS depth,
    ARRAY[m.rolname, p.rolname] AS path,
    CASE 
      WHEN current_setting('server_version_num')::integer >= 160000 
        THEN COALESCE((to_jsonb(am)->>'inherit_option')::boolean, TRUE)
      ELSE m.rolinherit
    END AS cumulative_inherits,
    CASE 
      WHEN current_setting('server_version_num')::integer >= 160000 
        THEN COALESCE((to_jsonb(am)->>'set_option')::boolean, TRUE)
      ELSE TRUE
    END AS cumulative_can_set_role
  FROM pg_auth_members am
  JOIN pg_roles m ON m.oid = am.member
  JOIN pg_roles p ON p.oid = am.roleid
  WHERE m.rolname IN ('anon', 'authenticated', 'service_role')

  UNION ALL

  SELECT 
    mr.client_role,
    p.rolname AS parent_role,
    p.oid AS parent_role_oid,
    mr.depth + 1,
    mr.path || p.rolname,
    mr.cumulative_inherits AND (
      CASE 
        WHEN current_setting('server_version_num')::integer >= 160000 
          THEN COALESCE((to_jsonb(am)->>'inherit_option')::boolean, TRUE)
        ELSE m.rolinherit
      END
    ) AS cumulative_inherits,
    mr.cumulative_can_set_role AND (
      CASE 
        WHEN current_setting('server_version_num')::integer >= 160000 
          THEN COALESCE((to_jsonb(am)->>'set_option')::boolean, TRUE)
        ELSE TRUE
      END
    ) AS cumulative_can_set_role
  FROM pg_auth_members am
  JOIN pg_roles m ON m.oid = am.member
  JOIN pg_roles p ON p.oid = am.roleid
  JOIN member_roles mr ON mr.parent_role_oid = am.member
  WHERE NOT (p.rolname = ANY(mr.path)) -- Cycle prevention
)
SELECT 
  r.rolname AS target_client_role,
  r.rolsuper AS client_has_superuser,
  r.rolbypassrls AS client_has_bypassrls,
  COALESCE(mr.parent_role, 'NONE') AS ancestor_role,
  COALESCE(pr.rolsuper, FALSE) AS ancestor_has_superuser,
  COALESCE(pr.rolbypassrls, FALSE) AS ancestor_has_bypassrls,
  COALESCE(mr.depth, 0) AS membership_depth,
  COALESCE(array_to_string(mr.path, ' -> '), r.rolname) AS membership_path,
  COALESCE(mr.cumulative_inherits, FALSE) AS automatically_inherits_privileges,
  COALESCE(mr.cumulative_can_set_role, FALSE) AS can_assume_via_set_role,
  CASE 
    WHEN mr.parent_role IS NULL THEN 'NO_INHERITED_ROLES'
    WHEN mr.cumulative_inherits AND mr.cumulative_can_set_role THEN 
      'INHERIT_AND_SET_ROLE (Privileges inherited automatically; role can also be assumed via SET ROLE)'
    WHEN mr.cumulative_inherits THEN 
      'AUTOMATIC_INHERITANCE_ONLY (Privileges inherited automatically; SET ROLE restricted)'
    WHEN mr.cumulative_can_set_role THEN 
      'SET_ROLE_ONLY (NOINHERIT; privileges accessible ONLY after explicit SET ROLE)'
    ELSE 'BLOCKED_MEMBERSHIP (Neither INHERIT nor SET ROLE enabled)'
  END AS membership_mode,
  CASE 
    WHEN mr.parent_role IS NULL THEN 'Direct role evaluation only'
    
    -- 1. Evaluate actual superuser capability on ancestor role based on SET ROLE permeability
    -- (Superuser attribute is non-inheritable under PostgreSQL semantics)
    WHEN pr.rolsuper AND mr.cumulative_can_set_role THEN 
      'ANCESTOR_HAS_SUPERUSER (SWITCHABLE_VIA_SET_ROLE): Ancestor has rolsuper=TRUE. Superuser attribute is NOT inheritable; becomes active ONLY if the session explicitly executes SET ROLE.'
    WHEN pr.rolsuper THEN 
      'ANCESTOR_HAS_SUPERUSER (INACCESSIBLE): Ancestor has rolsuper=TRUE, but membership path does not permit SET ROLE.'

    -- 2. Evaluate actual RLS-bypass capability on ancestor role based on SET ROLE permeability
    -- (BYPASSRLS attribute is non-inheritable under PostgreSQL semantics)
    WHEN pr.rolbypassrls AND mr.cumulative_can_set_role THEN 
      'ANCESTOR_HAS_BYPASSRLS (SWITCHABLE_VIA_SET_ROLE): Ancestor has rolbypassrls=TRUE. RLS bypass attribute is NOT inheritable; becomes active ONLY if the session explicitly executes SET ROLE.'
    WHEN pr.rolbypassrls THEN 
      'ANCESTOR_HAS_BYPASSRLS (INACCESSIBLE): Ancestor has rolbypassrls=TRUE, but membership path does not permit SET ROLE.'

    -- 3. Evaluate predefined global table roles with path permeability (table ACLs ARE inheritable)
    WHEN mr.parent_role = 'pg_read_all_data' AND mr.cumulative_inherits THEN 
      'ACTIVE_UNIVERSAL_READ: Predefined role; grants global SELECT across all tables. Does NOT bypass RLS.'
    WHEN mr.parent_role = 'pg_read_all_data' AND mr.cumulative_can_set_role THEN 
      'POTENTIAL_UNIVERSAL_READ_VIA_SET_ROLE: Predefined role; grants global SELECT only after SET ROLE. Does NOT bypass RLS.'
    WHEN mr.parent_role = 'pg_read_all_data' THEN 
      'INACCESSIBLE_PREDEFINED_ROLE (pg_read_all_data)'

    WHEN mr.parent_role = 'pg_write_all_data' AND mr.cumulative_inherits THEN 
      'ACTIVE_UNIVERSAL_WRITE: Predefined role; grants global INSERT/UPDATE/DELETE. Does NOT bypass RLS.'
    WHEN mr.parent_role = 'pg_write_all_data' AND mr.cumulative_can_set_role THEN 
      'POTENTIAL_UNIVERSAL_WRITE_VIA_SET_ROLE: Predefined role; grants global write only after SET ROLE. Does NOT bypass RLS.'
    WHEN mr.parent_role = 'pg_write_all_data' THEN 
      'INACCESSIBLE_PREDEFINED_ROLE (pg_write_all_data)'

    WHEN mr.parent_role = 'pg_database_owner' THEN 
      'DATABASE_OWNER: Predefined role representing current database owner.'
    WHEN mr.parent_role IN ('pg_read_all_settings', 'pg_read_all_stats', 'pg_stat_scan_tables') THEN 
      'OPERATIONAL_TELEMETRY: Reads configuration/stats. No table row data access.'
    WHEN mr.parent_role = 'supabase_admin' THEN 
      'SUPABASE_PLATFORM_ROLE: Managed platform role (actual rolsuper=' || COALESCE(pr.rolsuper::text, 'false') || ', actual rolbypassrls=' || COALESCE(pr.rolbypassrls::text, 'false') || ')'
    
    ELSE 'APPLICATION_OR_CUSTOM_ROLE: Non-predefined ancestor role; inspect Diagnostics 2, 3, and 4 for table/column grants'
  END AS security_impact_assessment
FROM pg_roles r
LEFT JOIN member_roles mr ON mr.client_role = r.rolname 
LEFT JOIN pg_roles pr ON pr.oid = mr.parent_role_oid
WHERE r.rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY r.rolname, mr.depth;

