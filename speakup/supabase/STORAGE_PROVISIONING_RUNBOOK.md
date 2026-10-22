# SpeakUp LMS — Supabase Storage Provisioning Runbook

**Audience:** Authorized Supabase Administrator / DBA  
**Scope:** Supabase Storage Buckets (`avatars` and `assignments`)  
**Target Environment:** Live Supabase Project  
**Status:** REQUIRED BEFORE VERCEL PRODUCTION DEPLOYMENT

---

## 1. Overview & Bucket Specifications

SpeakUp LMS utilizes two primary Supabase Storage buckets:

| Bucket Name | Access Level | Max File Size | Allowed MIME Types | Purpose |
| :--- | :---: | :---: | :---: | :--- |
| **`avatars`** | **Public** | 5 MB | `image/jpeg`, `image/png`, `image/webp` | Profile photos for students, teachers, and admins. Publicly rendered via `getPublicUrl()`. |
| **`assignments`** | **Private** | 10 MB | `image/jpeg`, `image/png`, `image/webp` | Handwritten student assignment page uploads. Strictly private. Access requires 24-hr signed URLs or admin session. |

---

## 2. Option A: Automated Provisioning via SQL Editor (Recommended)

1. Open the **Supabase Dashboard** -> **SQL Editor**.
2. Paste and run the contents of [`supabase/migrations/20261012_storage_buckets.sql`](./migrations/20261012_storage_buckets.sql).
3. Confirm that the query succeeds with 0 errors.

---

## 3. Option B: Manual Provisioning via Supabase Dashboard

If you prefer using the Supabase Web UI:

### Bucket 1: `avatars` (Public Profile Images)
1. Go to **Storage** -> **Create a new bucket**.
2. **Bucket name:** `avatars`
3. **Public bucket:** Toggle **ON** (Enabled).
4. **File size limit:** `5 MB`
5. **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`
6. Click **Save**.
7. Go to **Policies** -> `avatars`:
   - Add policy: `SELECT` -> Target roles: `anon`, `authenticated` -> Expression: `bucket_id = 'avatars'` (Public read).
   - Add policy: `INSERT` -> Target roles: `authenticated` -> Expression: `bucket_id = 'avatars' AND (name LIKE ('student_' || auth.uid()::text || '_%') OR (storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())`
   - Add policy: `UPDATE` -> Target roles: `authenticated` -> Expression: `bucket_id = 'avatars' AND (name LIKE ('student_' || auth.uid()::text || '_%') OR (storage.foldername(name))[1] = auth.uid()::text OR owner = auth.uid() OR public.is_admin())`
   - Add policy: `DELETE` -> Target roles: `authenticated` -> Expression: `bucket_id = 'avatars' AND (name LIKE ('student_' || auth.uid()::text || '_%') OR (storage.foldername(name))[1] = auth.uid()::text OR owner = auth.uid() OR public.is_admin())`

### Bucket 2: `assignments` (Private Student Work)
1. Go to **Storage** -> **Create a new bucket**.
2. **Bucket name:** `assignments`
3. **Public bucket:** Toggle **OFF** (Disabled / Private).
4. **File size limit:** `10 MB`
5. **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`
6. Click **Save**.
7. Go to **Policies** -> `assignments`:
   - Add policy for `INSERT` (Students upload only to their own submission folder):
     ```sql
     (storage.foldername(name))[1] = 'submissions' AND (storage.foldername(name))[2] = auth.uid()::text
     ```
   - Add policy for `SELECT` (Students view own submissions, Admins view all):
     ```sql
     (((storage.foldername(name))[1] = 'submissions' AND (storage.foldername(name))[2] = auth.uid()::text) OR public.is_admin())
     ```

---

## 4. Verification Check

Run the following query in the **Supabase SQL Editor** to confirm both buckets exist with the correct public flags:

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('avatars', 'assignments');
```

Expected result:
- `avatars` -> `public = true`
- `assignments` -> `public = false`
