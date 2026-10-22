# SpeakUp LMS — Recovery & Operational Verification Runbook

## 1. Quick Start Commands

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run TypeScript compilation check
npx tsc --noEmit

# Run production build verification
npm run build
```

---

## 2. Navigating the Four Application Areas

| Area | Direct URL Path | Description |
|---|---|---|
| **Sign-In (Recovery Entry)** | `http://localhost:3000/auth/login` | Direct entry point to authenticate or recover sessions. |
| **Public Website** | `http://localhost:3000/` | Main public homepage and academic showcase. |
| **Student LMS** | `http://localhost:3000/lms/dashboard` | Student learning dashboard and enrolled courses. |
| **Admin Panel** | `http://localhost:3000/admin/dashboard` | Administrative operations and system management. |

---

## 3. How to Test Each Area Independently

### A. Testing Sign-In Independently
1. Open a clean browser window or private tab.
2. Navigate directly to `http://localhost:3000/auth/login`.
3. Verify that the login form loads without requiring any data from the public site, LMS, or admin panel.
4. Test invalid email format or password length to verify client-side validation triggers appropriately.
5. Sign in with student credentials to verify redirection to `/lms/dashboard`.
6. Sign in with admin credentials to verify redirection to `/admin/dashboard`.

### B. Testing Student LMS
1. Authenticate with a student account.
2. Visit `http://localhost:3000/lms/dashboard`.
3. Check the profile dropdown and visit `/lms/profile`. Verify that actual authenticated user data appears (name, email, phone, verification status) with clean `—` empty states for unpopulated fields.
4. Verify that the change password form does not display the existing password and that eye icons only reveal active typing.
5. Check mobile and tablet responsive layouts: ensure the SpeakUp logo in the top bar is properly aligned and does not clip or wrap.

### C. Testing Admin Panel
1. Authenticate with an administrator account.
2. Visit `http://localhost:3000/admin/dashboard`.
3. Visit `/admin/portal-email`: verify that Portal Sender Name and Email can be configured, sender profile picture can be uploaded/cropped, and live preview updates in real time.
4. Visit `/admin/links`: verify LinkedIn, Instagram, and Facebook inputs. Verify that "Save Draft" stages changes and "Publish" makes them live.
5. Visit `/admin/edit`: verify that the 11 actual public website pages appear as selectable cards with direct live links.
6. Visit `/admin/emails`: verify that the Email Center is fully preserved and functional.

### D. Testing Public Website
1. Visit `http://localhost:3000/`.
2. Scroll to the footer: verify that published LinkedIn and Instagram links point to configured destinations. Verify that Facebook only renders if configured and published.
3. Test theme toggling between Light and Dark mode.

---

## 4. How to Identify Which Area is Failing

If an error is reported, identify the failing segment by URL and boundary:

- **Error prefixed with `/admin`**: Confined to the Admin Panel. Check `src/app/admin/`. `src/app/admin/error.tsx` isolates this from students and the public.
- **Error prefixed with `/lms`**: Confined to the Student LMS. Check `src/app/lms/`. `src/app/lms/error.tsx` isolates this from administrators and the public.
- **Error prefixed with `/auth`**: Confined to Authentication. Check `src/app/auth/`. `src/app/auth/error.tsx` handles isolated recovery.
- **Error on `/` or public routes**: Confined to the Public Website. Check `src/app/error.tsx`.

---

## 5. Safe Recovery Steps

1. **Clear Stale Browser Storage**:
   If experiencing redirect or stale session behavior, clear localStorage keys (`speakup_admin_name`, `speakup_student_name`, `speakup-theme`) and browser cookies for the local domain.
2. **Verify Environment Configuration**:
   Ensure `.env.local` contains valid values for the required categories without placing secrets in version control:
   - Supabase project URL and anonymous key: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Supabase service role key: `SUPABASE_SERVICE_ROLE_KEY`
   - Resend email provider key: `RESEND_API_KEY`
   - Outbound sender identity fallbacks: `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS`
3. **Verify Database Grants**:
   Ensure `authenticated` role in Supabase has `SELECT`, `INSERT`, `UPDATE` grants on required application tables (`profiles`, `course_enrollments`, `cms_content`, `email_logs`, `email_templates`).

---

## 6. Files & Areas That Must NOT Be Modified Casually

- **`src/app/auth/login/page.tsx`**: Must remain completely independent of LMS and Admin components as the recovery entry point.
- **`src/lib/supabase/client.ts` & `src/lib/supabase/server.ts`**: Core authentication and database connection handles.
- **`src/middleware.ts` (or `proxy.ts`)**: Enforces session authentication and role protection.
- **Database RLS Policies**: Must never be disabled or bypassed.
