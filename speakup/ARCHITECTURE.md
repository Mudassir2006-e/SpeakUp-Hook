# SpeakUp LMS — Architectural Separation & Fault Isolation Guide

## 1. Executive Summary & Design Principle

The SpeakUp platform is architecturally structured around **four independent application areas**:

1. **Public Website** (`/`, `/courses`, `/about`, `/faculty`, `/methodology`, `/pricing`, `/reviews`, `/faq`, `/privacy`, `/book-session`, `/course-outline`)
2. **Student LMS** (`/lms/...`)
3. **Admin Panel** (`/admin/...`)
4. **Authentication / Session Recovery** (`/auth/...`)

The overarching architectural rule is:
> **CONNECTED FUNCTIONALLY + ISOLATED DURING FAILURES**

Each area operates behind strict route boundaries, error boundaries, loading boundaries, and server-side authorization guards. A failure, syntax exception, or runtime crash in one area does not bring down the entire application window or prevent users from authenticating.

---

## 2. The Four Application Areas & Boundaries

| Area | Primary Routes | Target Audience | Key Responsibilities |
|---|---|---|---|
| **Public Website** | `/`, `/courses`, `/about`, `/faculty`, `/methodology`, `/pricing`, `/reviews`, `/faq`, `/privacy`, `/book-session`, `/course-outline` | Prospective students, clients, general public | Public curriculum display, pedagogical methodology, consultation booking, public footer with published social links. |
| **Student LMS** | `/lms/dashboard`, `/lms/courses`, `/lms/learn`, `/lms/profile`, `/lms/events`, `/lms/certificates` | Authenticated students | Active curriculum progress, lesson playback, attendance logs, student profile & photo management, certificate statuses. |
| **Admin Panel** | `/admin/dashboard`, `/admin/students`, `/admin/emails`, `/admin/portal-email`, `/admin/links`, `/admin/edit`, `/admin/profile` | Authenticated administrators | Enrollment management, batch email center, branded outbound portal sender identity, public social links publishing, public website route index. |
| **Authentication** | `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify`, `/auth/change-email` | All users (recovery entry point) | Centralized credential entry, session initialization, verification, secure password reset. |

---

## 3. Route & Component Isolation

- **Independent Route Segments**: Each application area is partitioned under its own Next.js App Router directory subtree (`src/app/`, `src/app/lms/`, `src/app/admin/`, `src/app/auth/`).
- **No Cross-Area Component Pollution**:
  - The Public Website has zero imports from Admin Panel or Student LMS components.
  - The Student LMS has zero imports from Admin Panel components.
  - The Admin Panel has zero imports from Student LMS components (`changeAdminPasswordAction` resides in `src/app/admin/actions.ts`).
  - The Authentication area is strictly self-contained and imports no Admin or LMS page components.
- **Shared Primitives**: Only universal presentation primitives (e.g., `SpeakUpSymbol`, `Logo`, `InitialsAvatar`, and validation utilities in `src/lib/validation.ts`) are shared.

---

## 4. Error Boundaries (`error.tsx`)

Every application tier features a dedicated client error boundary:

1. **`src/app/error.tsx` (Public Website)**: Catches client errors on public pages and presents a branded recovery prompt with links to reload, return to homepage, or proceed to the Sign-In portal.
2. **`src/app/lms/error.tsx` (Student LMS)**: Traps exceptions within `/lms/...` and provides recovery options ("Try Again", "LMS Dashboard", "Sign In") without bubbling errors to root layout.
3. **`src/app/admin/error.tsx` (Admin Panel)**: Traps exceptions within `/admin/...` and provides admin recovery controls ("Try Again", "Admin Dashboard", "Admin Sign In").
4. **`src/app/auth/error.tsx` (Authentication)**: Traps auth-level rendering errors, always providing a clean path to reload or return to the sign-in form.

**Result**: A failure in a single component or page results in a controlled, localized error state rather than an unrecoverable whole-app crash.

---

## 5. Loading & Data Isolation

- **Independent Suspense / Loading**:
  - `src/app/admin/loading.tsx`: Dedicated loading spinner for administrative routing.
  - `src/app/lms/loading.tsx`: Dedicated loading spinner for student LMS transitions.
- **Asynchronous Data Fault Tolerance**:
  - If admin metrics or email tables fail, the public website and LMS continue rendering.
  - If student enrollments fail, the admin panel and public website continue rendering.
  - Authentication queries the core Supabase Auth endpoint directly and never waits on LMS or Admin custom table queries.

---

## 6. Authentication as the Independent Recovery Entry Point

The `/auth/login` page is the designated **system recovery entry point**:
- It requires no CMS content queries.
- It requires no course table joins.
- It requires no administrative permission checks to render.
- If the public homepage, LMS, or Admin panel experiences an unexpected failure, `/auth/login` remains fully accessible directly at `https://<domain>/auth/login`.
- After successful credential verification, role-based routing directs the authenticated user safely to their respective dashboard (`/admin/dashboard` or `/lms/dashboard`).

---

## 7. Supabase Architecture & Security Boundaries

- **Single Centralized Auth Authority**: All logins, session tokens, and passwords remain in Supabase Auth. No duplicate auth systems or secondary databases exist.
- **Row Level Security (RLS)**:
  - `profiles`: Users can read/update their own profile; admins have managed access.
  - `cms_content`: Public can read published content; only admins can edit drafts and publish.
  - `email_logs`, `email_templates`: Strictly restricted to administrator roles.
  - `course_enrollments`: Students view only their own records; admins manage approvals.
- **No Password Exposure**: Passwords are never retrieved, logged, prefilled, or displayed. Password updates use `supabase.auth.updateUser({ password })`.
- **Zero Base64 in Auth Metadata**: All profile photos and portal sender avatars are stored as binary files in Supabase Storage (`avatars` bucket). Public URLs are persisted in database records.

---

## 8. Deployment Architecture

- **Single Unified Next.js Deployment**: Hosted on Vercel/Node runtime.
- **Adequacy of Logical Isolation**: Next.js App Router subtrees provide complete logical fault isolation via segment layouts, route-level `error.tsx` boundaries, and route middleware.
- **Physical Multi-Deployment Evaluation**: Splitting the repository into multiple Vercel projects is currently unnecessary and would introduce cross-origin cookie synchronization overhead, duplicate asset builds, and increased operational maintenance without providing additional user-facing fault isolation.
