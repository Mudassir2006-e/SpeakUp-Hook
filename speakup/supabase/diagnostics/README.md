# SpeakUp LMS — Security & Inherited Privilege Diagnostic Suite

This directory contains the consolidated, read-only PostgreSQL security diagnostic SQL suite for the SpeakUp LMS platform (`speakup_security_diagnostics.sql`).

## Purpose

The diagnostic suite audits role memberships, catalog Access Control Lists (ACLs), effective table-level and column-level privileges, schema `USAGE` prerequisites, default ACLs, and privilege elevation vectors. It validates that client roles (`anon`, `authenticated`, `service_role`) have strictly expected permissions on core LMS tables:
- `public.courses`
- `public.course_enrollments`
- `public.admin_mfa_challenges`

## Safety Guarantee

- **Strictly READ-ONLY:** All queries in this suite perform read-only catalog inspections (`pg_class`, `pg_attribute`, `pg_roles`, `pg_auth_members`, `pg_default_acl`, `pg_namespace`).
- **Zero Mutations:** Executes no `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `GRANT`, `REVOKE`, or `DROP` statements.
- **Minimal Locking:** Acquires only transient, standard `ACCESS SHARE` locks during catalog queries. Does not block application reads or writes.

---

## Suite Structure

| Diagnostic | Objective | Engine Scope |
| :--- | :--- | :--- |
| **Diagnostic 1** | **Recursive Role Membership & Inheritance Path Audit**<br>Resolves direct and multi-hop transitive role memberships. Distinguishes automatic privilege inheritance (`cumulative_inherits`) from session-switching (`cumulative_can_set_role`). | PostgreSQL 15.x & 16+ version-agnostic (`server_version_num` detection). |
| **Diagnostic 2** | **Table-Level Raw ACL Inspection**<br>Decomposes raw `pg_class.relacl` arrays using `aclexplode()`, identifying table owners, default ACLs, grantors, and grantees. | Scoped to schema `public`. |
| **Diagnostic 3** | **Column-Level Raw ACL Inspection**<br>Dynamically discovers columns from `pg_attribute` and decomposes `pg_attribute.attacl`. | Scoped to schema `public`. |
| **Diagnostic 4A** | **Table-Level Effective Privileges & Complete ACL Identity Attribution**<br>Tests `has_table_privilege()`. Identifies exact underlying ACL identities (`grantor`, `grantee`, `privilege`, `grantable`), deduplicates multiple membership paths to the same ACE, and isolates ownership from ordinary grants. | All target tables & roles. |
| **Diagnostic 4B** | **Dynamic Column-Level Privileges & Complete ACL Identity Attribution**<br>Tests `has_column_privilege()`. Decomposes column derivations into direct grants, PUBLIC grants, inherited grants, ownership derivation, and predefined roles (including `DELETE` for `pg_write_all_data`). | All discovered columns. |
| **Diagnostic 5A** | **Effective Schema Privileges & DML Execution Prerequisite**<br>Verifies `has_schema_privilege('public', 'USAGE')` and `CREATE`. Documents that missing schema `USAGE` hard-blocks table queries even if table grants exist. | Roles `anon`, `authenticated`, `service_role`. |
| **Diagnostic 5B** | **Default ACLs & Raw Schema ACL Inspection**<br>Audits `pg_default_acl` to detect future table privilege drift. | Schemas `public` and universal (`defaclnamespace = 0`). |
| **Diagnostic 6** | **Complete Ancestor Role Inventory & Elevation Audit**<br>Inventories all reachable ancestor roles. Inspects catalog `rolsuper` and `rolbypassrls` attributes directly. Classifies them as non-inheritable special attributes switchable only via `SET ROLE`. | All target client roles. |

---

## How to Execute

1. Open the **Supabase Dashboard** for the target project.
2. Navigate to the **SQL Editor**.
3. Open `speakup_security_diagnostics.sql` and paste the entire script (or individual diagnostic sections) into the editor.
4. Click **Run**.
5. Compare the output against the Expected Privilege Matrix below.

---

## Expected Baseline Privilege Matrix

| Target Table | Role | Expected Privileges (`has_effective_privilege = TRUE`) | Prohibited Privileges (`has_effective_privilege` MUST BE `FALSE`) | Safe Attributed Source (Table) | Safe Attributed Source (Column) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `public.courses` | `anon` | `SELECT` | `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` | `CONFIRMED: DIRECT_TABLE_GRANT(...)` | `DERIVED_FROM_TABLE: DIRECT_TABLE_GRANT(...)` |
| `public.courses` | `authenticated` | `SELECT` | `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` | `CONFIRMED: DIRECT_TABLE_GRANT(...)` | `DERIVED_FROM_TABLE: DIRECT_TABLE_GRANT(...)` |
| `public.courses` | `service_role` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | `TRUNCATE`, `REFERENCES`, `TRIGGER` | `CONFIRMED: DIRECT_TABLE_GRANT(...)` | `DERIVED_FROM_TABLE: DIRECT_TABLE_GRANT(...)` |
| `public.course_enrollments` | `anon` | **NONE** (All 7 must be `FALSE`) | `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` | `NONE` | `NONE` |
| `public.course_enrollments` | `authenticated` | `SELECT` (governed by RLS) | `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` | `CONFIRMED: DIRECT_TABLE_GRANT(...)` | `DERIVED_FROM_TABLE: DIRECT_TABLE_GRANT(...)` |
| `public.course_enrollments` | `service_role` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | `TRUNCATE`, `REFERENCES`, `TRIGGER` | `CONFIRMED: DIRECT_TABLE_GRANT(...)` | `DERIVED_FROM_TABLE: DIRECT_TABLE_GRANT(...)` |
| `public.admin_mfa_challenges` | `anon` | **NONE** (All 7 must be `FALSE`) | `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` | `NONE` | `NONE` |
| `public.admin_mfa_challenges` | `authenticated` | **NONE** (All 7 must be `FALSE`) | `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` | `NONE` | `NONE` |
| `public.admin_mfa_challenges` | `service_role` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | `TRUNCATE`, `REFERENCES`, `TRIGGER` | `CONFIRMED: DIRECT_TABLE_GRANT(...)` | `DERIVED_FROM_TABLE: DIRECT_TABLE_GRANT(...)` |

