<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Permanent SpeakUp LMS Project Rules for AI Agents

1. **Preserve Existing UI**: Never redesign, restructure, or alter approved working UI unless explicitly requested by the user.
2. **Do Not Modify Unrelated Areas**: Confine all modifications strictly to the exact files and scope requested.
3. **Maintain Architectural Boundaries**: Keep the four application areas strictly isolated:
   - **Public Website** (`/`)
   - **Student LMS** (`/lms/...`)
   - **Admin Panel** (`/admin/...`)
   - **Authentication** (`/auth/...`)
4. **Do Not Expose Secrets**: Never place API keys, database credentials, service-role keys, or private secrets in client-side code or documentation.
5. **Do Not Weaken RLS**: Maintain Supabase Row Level Security on all database tables. Never grant unrestricted access or disable RLS policies.
6. **Never Expose Current Passwords**: Current passwords must never be retrieved, displayed, prefilled, or stored in plaintext. Password eye icons are strictly reserved for active password entry fields.
7. **Never Store Base64 in Auth Metadata**: Store all profile pictures, avatars, and images as binary files in Supabase Storage (`avatars` bucket). Only public storage URLs may be saved.
8. **Inspect Existing Architecture**: Always view and inspect existing code, patterns, and design tokens before making changes.
9. **Test Both Modified and Unaffected Areas**: Ensure that modifications in one area do not introduce regressions in any other area.
10. **Run Verification Commands**: Always verify that `npx tsc --noEmit` and `npm run build` pass with zero errors before completing tasks.
