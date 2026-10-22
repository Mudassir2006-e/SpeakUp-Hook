-- ==============================================================================
-- SpeakUp LMS — Phase 5: Admin Email Center Database Schema & Permissions
-- Target: PostgreSQL / Supabase
-- Description: Schema definitions, RLS policies, and permission grants for
--              email_templates and email_logs.
-- ==============================================================================

-- 1. EMAIL TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist (safe for pre-existing tables)
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. EMAIL LOGS TABLE
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    resend_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS resend_id TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. AUTOMATIC TIMESTAMP TRIGGER FOR EMAIL TEMPLATES
DROP TRIGGER IF EXISTS set_email_templates_timestamp ON public.email_templates;
CREATE TRIGGER set_email_templates_timestamp 
    BEFORE UPDATE ON public.email_templates 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view, create, update, and delete email templates
DROP POLICY IF EXISTS "Admins can view email templates" ON public.email_templates;
CREATE POLICY "Admins can view email templates"
    ON public.email_templates FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert email templates" ON public.email_templates;
CREATE POLICY "Admins can insert email templates"
    ON public.email_templates FOR INSERT
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update email templates" ON public.email_templates;
CREATE POLICY "Admins can update email templates"
    ON public.email_templates FOR UPDATE
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete email templates" ON public.email_templates;
CREATE POLICY "Admins can delete email templates"
    ON public.email_templates FOR DELETE
    USING (public.is_admin());

-- Admins can view and insert email logs
DROP POLICY IF EXISTS "Admins can view email logs" ON public.email_logs;
CREATE POLICY "Admins can view email logs"
    ON public.email_logs FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert email logs" ON public.email_logs;
CREATE POLICY "Admins can insert email logs"
    ON public.email_logs FOR INSERT
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update email logs" ON public.email_logs;
CREATE POLICY "Admins can update email logs"
    ON public.email_logs FOR UPDATE
    USING (public.is_admin());

-- 5. EXPLICIT PERMISSION GRANTS
-- Crucial: allows service_role and authenticated roles to query and manage these tables
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.email_templates TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.email_logs TO anon, authenticated, service_role;

-- 6. DEFAULT TEMPLATES SEED (Non-destructive: only inserted if table is empty)
INSERT INTO public.email_templates (name, subject, body)
SELECT 
    'Course Welcome & Orientation',
    'Welcome to {{course_name}} — SpeakUp LMS',
    '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #d4af37; margin: 0; font-size: 26px;">SpeakUp LMS</h1>
    <p style="color: #666; font-size: 14px; margin-top: 4px;">Language & Communication Mastery</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #eaeaea; border-radius: 12px; padding: 28px;">
    <h2 style="margin-top: 0; color: #111;">Hello {{first_name}},</h2>
    <p style="line-height: 1.6; color: #444;">
      Welcome to <strong>{{course_name}}</strong>! Your course enrollment has been officially confirmed by our academic administration team.
    </p>
    <p style="line-height: 1.6; color: #444;">
      You can now log in to your student dashboard to access your video lectures, structured notes, and speaking practice modules.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://speakup.edu/lms/dashboard" style="background-color: #d4af37; color: #000; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
        Go to Student Dashboard
      </a>
    </div>
    <p style="line-height: 1.6; color: #666; font-size: 13px;">
      If you have questions or need assistance, reply directly to this email or message your mentor.
    </p>
  </div>
  <div style="text-align: center; margin-top: 24px; color: #999; font-size: 12px;">
    © SpeakUp LMS. Sent to {{email}}.
  </div>
</div>'
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates LIMIT 1);

INSERT INTO public.email_templates (name, subject, body)
SELECT 
    'Course Enrollment Approved',
    'Your Enrollment in {{course_name}} Has Been Approved',
    '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <div style="background: #ffffff; border: 1px solid #eaeaea; border-radius: 12px; padding: 28px;">
    <h2 style="margin-top: 0; color: #111;">Congratulations {{first_name}}!</h2>
    <p style="line-height: 1.6; color: #444;">
      Your enrollment application for <strong>{{course_name}}</strong> has been reviewed and approved.
    </p>
    <p style="line-height: 1.6; color: #444;">
      All curriculum lessons and resources are unlocked for your account. Start learning today:
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="https://speakup.edu/lms/dashboard" style="background-color: #141416; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
        Access Your Course
      </a>
    </div>
  </div>
</div>'
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE name = 'Course Enrollment Approved');

INSERT INTO public.email_templates (name, subject, body)
SELECT 
    'Important Academic Announcement',
    'Important Announcement: SpeakUp Academic Schedule',
    '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <div style="background: #ffffff; border: 1px solid #eaeaea; border-radius: 12px; padding: 28px;">
    <h2 style="margin-top: 0; color: #111;">Dear {{first_name}},</h2>
    <p style="line-height: 1.6; color: #444;">
      Please take note of the following update regarding your learning schedule and upcoming speaking workshops.
    </p>
    <p style="line-height: 1.6; color: #444;">
      Check your student portal for session links and practice material.
    </p>
    <p style="line-height: 1.6; color: #666; font-size: 13px;">
      Best regards,<br/>The SpeakUp Academic Team
    </p>
  </div>
</div>'
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE name = 'Important Academic Announcement');
