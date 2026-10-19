/**
 * SpeakUp LMS — Professional Email Branding & Templates
 * Generates responsive, accessible, cross-client HTML email templates
 * using SpeakUp's signature gold and dark luxury aesthetic.
 */

export interface EmailBrandingOptions {
  senderName?: string;
  senderEmail?: string;
  replyTo?: string | null;
  avatarUrl?: string | null;
  siteUrl?: string;
}

const DEFAULT_BRANDING: EmailBrandingOptions = {
  senderName: "SpeakUp Team",
  senderEmail: process.env.EMAIL_FROM_ADDRESS || "",
  replyTo: "support@speakup.edu.pk",
  siteUrl: "https://speakup.edu.pk",
};

/**
 * Resolves the authoritative, publicly accessible HTTPS brand logo URL.
 * Automatically verifies that the base URL is a valid public HTTPS origin,
 * preventing broken images and alt-text fallbacks caused by localhost or invalid domains.
 */
export function resolvePublicEmailLogoUrl(isDark = false): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const isPublicHttps =
    Boolean(configuredSiteUrl) &&
    configuredSiteUrl!.startsWith("https://") &&
    !configuredSiteUrl!.includes("localhost") &&
    !configuredSiteUrl!.includes("127.0.0.1") &&
    !configuredSiteUrl!.includes("0.0.0.0");

  const baseDomain = isPublicHttps ? configuredSiteUrl! : "https://speakup.edu.pk";
  const filename = isDark ? "speakup-logo-dark.png" : "speakup-logo.png";
  return `${baseDomain}/${filename}`;
}

/**
 * Base email layout wrapper with responsive styling and cross-client compatibility.
 */
export function renderEmailLayout(
  contentHtml: string,
  options: EmailBrandingOptions = {}
): string {
  const senderName = options.senderName || DEFAULT_BRANDING.senderName || "SpeakUp LMS";
  const senderEmail = options.senderEmail || DEFAULT_BRANDING.senderEmail || "";
  const replyTo = options.replyTo !== undefined ? options.replyTo : DEFAULT_BRANDING.replyTo;
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>SpeakUp LMS</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f7f5ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: auto !important; padding: 12px !important; }
      .email-card { padding: 24px 18px !important; }
      .button-cta { display: block !important; width: 100% !important; text-align: center !important; }
    }
    @media only screen and (max-width: 375px) {
      .email-container { padding: 8px !important; }
      .email-card { padding: 18px 12px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5ef;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7f5ef; padding: 32px 0;">
    <tr>
      <td align="center">
        <!-- Main Responsive Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="580" class="email-container" style="max-width: 580px; width: 100%; margin: 0 auto;">
          
          <!-- Header Branding -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-family: 'Cinzel', Georgia, serif; font-size: 20px; font-weight: 700; letter-spacing: 0.12em; color: #141416; text-transform: uppercase;">
                      SPEAKUP LMS
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: 0.1em; color: #8a6d1b; text-transform: uppercase; font-weight: 600;">
                      Language &amp; Communication Mastery
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main White Card -->
          <tr>
            <td class="email-card" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #eae5d9; padding: 36px 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer Note -->
          <tr>
            <td align="center" style="padding-top: 24px; padding-bottom: 32px;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #737373; line-height: 1.5;">
                Sent from <strong>${senderName}</strong>${senderEmail ? ` &lt;${senderEmail}&gt;` : ""}
              </p>
              ${
                replyTo
                  ? `<p style="margin: 0 0 10px 0; font-size: 11px; color: #8c8c8c;">
                      Questions or replies? Reach out to <a href="mailto:${replyTo}" style="color: #8a6d1b; text-decoration: underline;">${replyTo}</a>
                    </p>`
                  : ""
              }
              <p style="margin: 0; font-size: 11px; color: #a3a3a3;">
                &copy; ${currentYear} SpeakUp LMS. All rights reserved. Confidential communication.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. Test Verification Email Template
 */
export function getTestVerificationEmailHtml(params: {
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
  replyTo?: string | null;
  avatarUrl?: string | null;
  providerNotice?: string;
}): string {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: #f6f3eb; border: 1px solid #d4af37; color: #8a6d1b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 12px; border-radius: 999px;">
        Identity Verification Dispatch
      </span>
      <h2 style="margin: 14px 0 6px 0; font-size: 22px; font-weight: 700; color: #141416;">
        Sender Identity Verification
      </h2>
      <p style="margin: 0; font-size: 13px; color: #666666;">
        This test message confirms your SpeakUp LMS outgoing email configuration.
      </p>
    </div>

    <div style="background-color: #fbf9f4; border: 1px solid #ede8dc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #8a6d1b; font-weight: 700;">
        Verified Configuration Parameters
      </h3>
      <table border="0" cellpadding="4" cellspacing="0" width="100%" style="font-size: 13px; color: #333333;">
        <tr>
          <td width="35%" style="color: #777777; font-weight: 500;">Display Name:</td>
          <td><strong>${params.senderName}</strong></td>
        </tr>
        <tr>
          <td style="color: #777777; font-weight: 500;">From Address:</td>
          <td><code style="background-color: #ece8dc; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${params.senderEmail}</code></td>
        </tr>
        <tr>
          <td style="color: #777777; font-weight: 500;">Reply-To Address:</td>
          <td><strong>${params.replyTo || params.senderEmail}</strong></td>
        </tr>
        <tr>
          <td style="color: #777777; font-weight: 500;">Test Recipient:</td>
          <td><strong>${params.recipientEmail}</strong></td>
        </tr>
        <tr>
          <td style="color: #777777; font-weight: 500;">Timestamp:</td>
          <td>${new Date().toUTCString()}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; line-height: 1.6; color: #444444; margin-bottom: 16px;">
      If you are reading this email in your inbox:
    </p>
    <ul style="font-size: 13px; line-height: 1.6; color: #555555; padding-left: 20px; margin-bottom: 24px;">
      <li>Your email provider (Resend) successfully authenticated and dispatched the transmission.</li>
      <li>The From header correctly renders <strong>${params.senderName} &lt;${params.senderEmail}&gt;</strong>.</li>
      <li>Replies will be directed to <strong>${params.replyTo || params.senderEmail}</strong>.</li>
    </ul>

    <!-- Important Branding Notice (Requirement 5) -->
    <div style="background-color: #faf5e8; border-left: 3px solid #d4af37; padding: 14px 16px; border-radius: 6px; font-size: 12px; line-height: 1.5; color: #705514; margin-bottom: 24px;">
      <strong>Note on Inbox Profile Avatars:</strong><br>
      The SpeakUp branding and logo display inside this email template. However, the avatar circle displayed beside the sender name in external mail clients (like Gmail or Apple Mail) is governed by domain-level <strong>BIMI (Brand Indicators for Message Identification)</strong>, <strong>Google Workspace Profile</strong>, or <strong>Gravatar</strong> records for <code>${params.senderEmail}</code>.
    </div>

    <div style="text-align: center;">
      <a href="https://speakup.edu.pk/admin/portal-email" class="button-cta" style="background-color: #d4af37; color: #141416; text-decoration: none; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 12px 28px; border-radius: 8px; display: inline-block;">
        Return to Admin Panel
      </a>
    </div>
  `;

  return renderEmailLayout(content, {
    senderName: params.senderName,
    senderEmail: params.senderEmail,
    replyTo: params.replyTo,
    avatarUrl: params.avatarUrl,
  });
}

/**
 * 2. Student Account Approved Email Template
 */
export function getStudentAccountApprovedEmailHtml(params: {
  studentName?: string;
  studentEmail: string;
  senderName: string;
  senderEmail: string;
  replyTo?: string | null;
  avatarUrl?: string | null;
}): string {
  const greetingName = params.studentName?.trim() || "Scholar";
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #141416;">
      Your SpeakUp Account Has Been Approved!
    </h2>
    <p style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 16px;">
      Dear ${greetingName},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 20px;">
      Our academic admissions team has reviewed and approved your student account registration. You now have full access to sign in to the SpeakUp LMS portal.
    </p>

    <div style="background-color: #fbf9f4; border: 1px solid #ede8dc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #141416;">
        Next Steps:
      </h3>
      <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #555555;">
        <li>Log in to your student dashboard using your registered credentials.</li>
        <li>Browse our premium English communication, public speaking, and IELTS courses.</li>
        <li>Submit course enrollment requests for your desired learning tracks.</li>
      </ol>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <a href="https://speakup.edu.pk/auth/login" class="button-cta" style="background-color: #d4af37; color: #141416; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 14px 32px; border-radius: 8px; display: inline-block;">
        Log In to SpeakUp LMS
      </a>
    </div>

    <p style="font-size: 13px; line-height: 1.5; color: #666666; margin: 0;">
      Warm regards,<br>
      <strong>${params.senderName} Admissions Team</strong>
    </p>
  `;

  return renderEmailLayout(content, {
    senderName: params.senderName,
    senderEmail: params.senderEmail,
    replyTo: params.replyTo,
    avatarUrl: params.avatarUrl,
  });
}

/**
 * 3. Course Enrollment Decision Email Template
 */
export function getCourseEnrollmentDecisionEmailHtml(params: {
  studentName?: string;
  studentEmail: string;
  courseTitle: string;
  decision: "approved" | "rejected";
  senderName: string;
  senderEmail: string;
  replyTo?: string | null;
  avatarUrl?: string | null;
}): string {
  const greetingName = params.studentName?.trim() || "Scholar";
  const isApproved = params.decision === "approved";

  const content = isApproved
    ? `
      <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #141416;">
        Course Enrollment Approved!
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 16px;">
        Dear ${greetingName},
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 20px;">
        Congratulations! Your enrollment application for <strong>${params.courseTitle}</strong> has been officially approved by the academic faculty.
      </p>

      <div style="background-color: #f7faf7; border: 1px solid #d4edd4; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #235c23;">
          <strong>All course modules, recorded lectures, and speaking exercises are now unlocked</strong> in your student dashboard.
        </p>
      </div>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="https://speakup.edu.pk/lms/dashboard" class="button-cta" style="background-color: #d4af37; color: #141416; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 14px 32px; border-radius: 8px; display: inline-block;">
          Access Your Course Now
        </a>
      </div>

      <p style="font-size: 13px; line-height: 1.5; color: #666666; margin: 0;">
        Best wishes on your journey to mastery,<br>
        <strong>${params.senderName} Academic Team</strong>
      </p>
    `
    : `
      <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #141416;">
        Course Enrollment Update
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 16px;">
        Dear ${greetingName},
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 20px;">
        Thank you for your interest in <strong>${params.courseTitle}</strong>. Our faculty has reviewed your application, but we are unable to approve this course request at this time.
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #555555; margin-bottom: 24px;">
        Your SpeakUp account remains active. You may request access to other available cohorts or contact administration if you need assistance with prerequisites or tuition verification.
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="https://speakup.edu.pk/lms/dashboard" class="button-cta" style="background-color: #141416; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 14px 32px; border-radius: 8px; display: inline-block;">
          View Student Dashboard
        </a>
      </div>
      <p style="font-size: 13px; line-height: 1.5; color: #666666; margin: 0;">
        Regards,<br>
        <strong>${params.senderName} Academic Team</strong>
      </p>
    `;

  return renderEmailLayout(content, {
    senderName: params.senderName,
    senderEmail: params.senderEmail,
    replyTo: params.replyTo,
    avatarUrl: params.avatarUrl,
  });
}

/**
 * Password Reset Email Template
 */
export function getPasswordResetEmailHtml(params: {
  studentName?: string;
  studentEmail: string;
  resetLink: string;
  senderName: string;
  senderEmail: string;
  replyTo?: string | null;
  avatarUrl?: string | null;
}): string {
  const greetingName = params.studentName?.trim() || "Scholar";
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #141416;">
      Reset Your SpeakUp LMS Password
    </h2>
    <p style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 16px;">
      Dear ${greetingName},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 20px;">
      An administrator has generated a secure password reset link for your SpeakUp student account (<strong>${params.studentEmail}</strong>). Please click the button below to choose a new password:
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${params.resetLink}" class="button-cta" style="background-color: #d4af37; color: #141416; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 14px 32px; border-radius: 8px; display: inline-block;">
        Reset Your Password
      </a>
    </div>
    <p style="font-size: 12px; line-height: 1.5; color: #777777; margin-bottom: 24px;">
      If you did not request this link, you can safely ignore this email. This link will expire in 24 hours.<br>
      <span style="color: #8a6d1b; word-break: break-all;">${params.resetLink}</span>
    </p>
    <p style="font-size: 13px; line-height: 1.5; color: #666666; margin: 0;">
      Warm regards,<br>
      <strong>${params.senderName} Academic Team</strong>
    </p>
  `;

  return renderEmailLayout(content, {
    senderName: params.senderName,
    senderEmail: params.senderEmail,
    replyTo: params.replyTo,
    avatarUrl: params.avatarUrl,
  });
}

/**
 * Password Setup / Invitation Email Template
 */
export function getPasswordSetupEmailHtml(params: {
  studentName?: string;
  studentEmail: string;
  setupLink: string;
  senderName: string;
  senderEmail: string;
  replyTo?: string | null;
  avatarUrl?: string | null;
}): string {
  const greetingName = params.studentName?.trim() || "Scholar";
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #141416;">
      Welcome to SpeakUp LMS — Set Up Your Account
    </h2>
    <p style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 16px;">
      Dear ${greetingName},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 20px;">
      You have been registered for SpeakUp LMS! Please click the button below to establish your secure password and access your learning dashboard:
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${params.setupLink}" class="button-cta" style="background-color: #d4af37; color: #141416; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 14px 32px; border-radius: 8px; display: inline-block;">
        Set Up Your Password
      </a>
    </div>
    <p style="font-size: 12px; line-height: 1.5; color: #777777; margin-bottom: 24px;">
      This setup link will expire in 24 hours.<br>
      <span style="color: #8a6d1b; word-break: break-all;">${params.setupLink}</span>
    </p>
    <p style="font-size: 13px; line-height: 1.5; color: #666666; margin: 0;">
      Warm regards,<br>
      <strong>${params.senderName} Admissions Team</strong>
    </p>
  `;

  return renderEmailLayout(content, {
    senderName: params.senderName,
    senderEmail: params.senderEmail,
    replyTo: params.replyTo,
    avatarUrl: params.avatarUrl,
  });
}


export interface WelcomeStudentEmailParams {
  studentName?: string;
  studentEmail: string;
  courseName?: string;
  courseDuration?: string;
  registrationDate?: string;
  registrationTime?: string;
  accountStatus?: "pending" | "active" | string;
  senderName?: string;
  senderEmail?: string;
  replyTo?: string | null;
  avatarUrl?: string | null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * 4. Automated Student Welcome Email Template
 * Personalized welcome letter from Sir Mudassir Ali supporting English and German language journeys.
 * Features encouraging motivational guidance, verified course details, and responsive layout.
 */
export function getWelcomeStudentEmailHtml(params: WelcomeStudentEmailParams): string {
  const rawGreeting = params.studentName?.trim() || "Scholar";
  const greetingName = escapeHtml(rawGreeting);
  const isPending = params.accountStatus === "pending";
  const formattedDate = params.registrationDate
    ? escapeHtml(params.registrationDate)
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://speakup.edu.pk").replace(/\/+$/, "");

  const hasCourse = Boolean(params.courseName?.trim());
  const safeCourseName = hasCourse ? escapeHtml(params.courseName!.trim()) : "";
  const safeDuration = params.courseDuration ? escapeHtml(params.courseDuration.trim()) : null;

  const content = `
    <!-- Header Badge -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: #f6f3eb; border: 1px solid #d4af37; color: #8a6d1b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 14px; border-radius: 999px;">
        Institutional Academic Welcome
      </span>
      <h2 style="margin: 14px 0 6px 0; font-size: 22px; font-weight: 700; color: #141416;">
        Welcome to SpeakUp, ${greetingName}!
      </h2>
      <p style="margin: 0; font-size: 13px; color: #666666;">
        Your Language Mastery &amp; Communication Journey Begins Here
      </p>
    </div>

    <!-- Personal Teacher Introduction -->
    <div style="margin-bottom: 20px;">
      <p style="font-size: 14px; line-height: 1.6; color: #333333; margin: 0 0 14px 0;">
        Dear <strong>${greetingName}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #444444; margin: 0 0 14px 0;">
        My name is <strong>Sir Mudassir Ali</strong>, and as your lead mentor and faculty instructor, I am personally delighted to welcome you to <strong>SpeakUp LMS</strong>. Whether your aspiration is achieving natural confidence in professional spoken English or mastering German for international academic and career opportunities, our academy is committed to providing you with rigorous, world-class coaching every step of the way.
      </p>
    </div>

    <!-- Motivational Message -->
    <div style="background-color: #faf7f0; border-left: 3px solid #d4af37; padding: 16px 18px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #524317; font-style: italic;">
        &ldquo;True linguistic fluency is not a talent—it is a discipline forged through steady daily practice, active speaking, and constructive correction. Every lecture, articulation exercise, and feedback assessment you complete here is engineered to elevate your clarity and presence. Stay consistent, engage with purpose, and embrace every opportunity to speak.&rdquo;
      </p>
      <p style="margin: 8px 0 0 0; font-size: 12px; font-weight: 700; color: #8a6d1b; text-align: right;">
        — Sir Mudassir Ali
      </p>
    </div>

    <!-- Personalized Registration & Course Details -->
    <div style="background-color: #fbf9f4; border: 1px solid #ede8dc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 14px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #8a6d1b; font-weight: 700;">
        Official Enrollment Particulars
      </h3>
      <table border="0" cellpadding="4" cellspacing="0" width="100%" style="font-size: 13px; color: #333333;">
        <tr>
          <td width="38%" style="color: #777777; font-weight: 500;">Scholar Name:</td>
          <td><strong>${greetingName}</strong></td>
        </tr>
        <tr>
          <td style="color: #777777; font-weight: 500;">Registered Email:</td>
          <td><code style="background-color: #ece8dc; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${escapeHtml(params.studentEmail)}</code></td>
        </tr>
        ${
          hasCourse
            ? `<tr>
                <td style="color: #777777; font-weight: 500;">Selected Course:</td>
                <td><strong style="color: #141416;">${safeCourseName}</strong></td>
              </tr>
              ${
                safeDuration
                  ? `<tr>
                      <td style="color: #777777; font-weight: 500;">Program Duration:</td>
                      <td><strong>${safeDuration}</strong></td>
                    </tr>`
                  : ""
              }`
            : `<tr>
                <td style="color: #777777; font-weight: 500;">Learning Track:</td>
                <td><strong>General Language Studies (English &amp; German)</strong></td>
              </tr>`
        }
        <tr>
          <td style="color: #777777; font-weight: 500;">Registration Date:</td>
          <td>${formattedDate}</td>
        </tr>
      </table>
    </div>

    <!-- Access Status Guidance -->
    ${
      isPending
        ? `<div style="background-color: #fcf8e3; border: 1px solid #faebcc; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #8a6d3b;">
              Admissions Review in Progress
            </p>
            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #8a6d3b;">
              Your student registration is currently being verified by our admissions office. Once approved, you will receive full access to course materials and scheduled seminars.
            </p>
          </div>
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${siteUrl}/auth/login" class="button-cta" style="background-color: #d4af37; color: #141416; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 14px 32px; border-radius: 8px; display: inline-block;">
              View Account Status
            </a>
          </div>`
        : `<div style="background-color: #edf7ed; border: 1px solid #c8e6c9; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #2e7d32;">
              Account Status: Active &amp; Ready
            </p>
            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #2e7d32;">
              Your student account is active. You can log in immediately to browse masterclasses, track your speaking assessments, and submit course enrollment requests.
            </p>
          </div>
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${siteUrl}/auth/login" class="button-cta" style="background-color: #d4af37; color: #141416; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 14px 32px; border-radius: 8px; display: inline-block;">
              Log In to Student Portal
            </a>
          </div>`
    }

    <!-- Instructor Sign-off -->
    <p style="font-size: 13px; line-height: 1.5; color: #555555; margin: 0;">
      Warm regards,<br>
      <strong>Sir Mudassir Ali &amp; The SpeakUp Academic Faculty</strong><br>
      <span style="color: #8a6d1b; font-size: 11px; text-transform: uppercase; font-weight: 600;">
        Language &amp; Communication Mastery Academy
      </span>
    </p>
  `;

  return renderEmailLayout(content, {
    senderName: params.senderName,
    senderEmail: params.senderEmail,
    replyTo: params.replyTo,
    avatarUrl: params.avatarUrl,
  });
}

/**
 * Plain text alternative for automated student welcome email
 */
export function getWelcomeStudentEmailText(params: WelcomeStudentEmailParams): string {
  const greetingName = params.studentName?.trim() || "Scholar";
  const formattedDate = params.registrationDate || new Date().toLocaleDateString();
  const courseStr = params.courseName
    ? `Selected Course: ${params.courseName}`
    : "Learning Track: General Language Studies (English & German)";
  const durationStr = params.courseDuration ? `\nProgram Duration: ${params.courseDuration}` : "";
  const isPending = params.accountStatus === "pending";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://speakup.edu.pk").replace(/\/+$/, "");

  return `Welcome to SpeakUp, ${greetingName}!

Dear ${greetingName},

My name is Sir Mudassir Ali, and as your lead mentor and faculty instructor, I am personally delighted to welcome you to SpeakUp LMS. Whether your aspiration is achieving natural confidence in professional spoken English or mastering German for international academic and career opportunities, our academy is committed to providing you with rigorous, world-class coaching every step of the way.

"True linguistic fluency is not a talent—it is a discipline forged through steady daily practice, active speaking, and constructive correction. Every lecture, articulation exercise, and feedback assessment you complete here is engineered to elevate your clarity and presence. Stay consistent, engage with purpose, and embrace every opportunity to speak."
— Sir Mudassir Ali

Official Enrollment Particulars:
- Scholar Name: ${greetingName}
- Registered Email: ${params.studentEmail}
- ${courseStr}${durationStr}
- Registration Date: ${formattedDate}

Account Status: ${isPending ? "Admissions Review in Progress" : "Active & Ready"}
${
  isPending
    ? "Your student registration is currently being verified by our admissions office. Once approved, you will receive full access."
    : "Your account is active. You can log in immediately to browse masterclasses, track assessments, and submit course enrollment requests."
}

Sign in at: ${siteUrl}/auth/login

Warm regards,
Sir Mudassir Ali & The SpeakUp Academic Faculty
SpeakUp LMS
`;
}



/**
 * 4. Supabase Auth Custom Email Templates
 * Ready-to-copy HTML templates for Supabase Dashboard (Authentication -> Email Templates).
 */
export const SUPABASE_AUTH_TEMPLATES = {
  confirmation: {
    subject: "Confirm your email on SpeakUp LMS",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Confirm Your Email</title></head>
<body style="margin: 0; padding: 0; background-color: #f7f5ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7f5ef; padding: 32px 0;">
    <tr><td align="center">
      <table border="0" cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; width: 100%; margin: 0 auto;">
        <tr><td align="center" style="padding-bottom: 24px;">
          <h1 style="margin: 0; font-family: 'Cinzel', Georgia, serif; font-size: 20px; font-weight: 700; letter-spacing: 0.12em; color: #141416; text-transform: uppercase;">SPEAKUP LMS</h1>
          <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: 0.1em; color: #8a6d1b; text-transform: uppercase; font-weight: 600;">Language &amp; Communication Mastery</p>
        </td></tr>
        <tr><td style="background-color: #ffffff; border-radius: 16px; border: 1px solid #eae5d9; padding: 36px 32px;">
          <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #141416;">Confirm Your Email Address</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 20px;">
            Thank you for registering on SpeakUp LMS. Please confirm your email address by clicking the button below or using your 6-digit confirmation code:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="{{ .ConfirmationURL }}" style="background-color: #d4af37; color: #141416; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 14px 32px; border-radius: 8px; display: inline-block;">
              Confirm Email Address
            </a>
          </div>
          <p style="font-size: 12px; color: #777777; margin-bottom: 0;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="color: #8a6d1b; word-break: break-all;">{{ .ConfirmationURL }}</span>
          </p>
        </td></tr>
        <tr><td align="center" style="padding-top: 24px;">
          <p style="margin: 0; font-size: 11px; color: #a3a3a3;">&copy; SpeakUp LMS. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  },
  recovery: {
    subject: "Reset your SpeakUp LMS password",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset Your Password</title></head>
<body style="margin: 0; padding: 0; background-color: #f7f5ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7f5ef; padding: 32px 0;">
    <tr><td align="center">
      <table border="0" cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; width: 100%; margin: 0 auto;">
        <tr><td align="center" style="padding-bottom: 24px;">
          <h1 style="margin: 0; font-family: 'Cinzel', Georgia, serif; font-size: 20px; font-weight: 700; letter-spacing: 0.12em; color: #141416; text-transform: uppercase;">SPEAKUP LMS</h1>
          <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: 0.1em; color: #8a6d1b; text-transform: uppercase; font-weight: 600;">Language &amp; Communication Mastery</p>
        </td></tr>
        <tr><td style="background-color: #ffffff; border-radius: 16px; border: 1px solid #eae5d9; padding: 36px 32px;">
          <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #141416;">Reset Your Password</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 20px;">
            We received a request to reset your password for SpeakUp LMS. Click the button below to choose a new password:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="{{ .ConfirmationURL }}" style="background-color: #d4af37; color: #141416; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 14px 32px; border-radius: 8px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 12px; color: #777777; margin-bottom: 0;">
            If you did not request a password reset, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td align="center" style="padding-top: 24px;">
          <p style="margin: 0; font-size: 11px; color: #a3a3a3;">&copy; SpeakUp LMS. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  },
  invite: {
    subject: "You have been invited to SpeakUp LMS",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Invitation to SpeakUp LMS</title></head>
<body style="margin: 0; padding: 0; background-color: #f7f5ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7f5ef; padding: 32px 0;">
    <tr><td align="center">
      <table border="0" cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; width: 100%; margin: 0 auto;">
        <tr><td align="center" style="padding-bottom: 24px;">
          <h1 style="margin: 0; font-family: 'Cinzel', Georgia, serif; font-size: 20px; font-weight: 700; letter-spacing: 0.12em; color: #141416; text-transform: uppercase;">SPEAKUP LMS</h1>
          <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: 0.1em; color: #8a6d1b; text-transform: uppercase; font-weight: 600;">Language &amp; Communication Mastery</p>
        </td></tr>
        <tr><td style="background-color: #ffffff; border-radius: 16px; border: 1px solid #eae5d9; padding: 36px 32px;">
          <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #141416;">Welcome to SpeakUp LMS</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 20px;">
            An administrator has registered your student account on SpeakUp LMS. Click the button below to accept your invitation and create your password:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="{{ .ConfirmationURL }}" style="background-color: #d4af37; color: #141416; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 14px 32px; border-radius: 8px; display: inline-block;">
              Accept Invitation &amp; Set Password
            </a>
          </div>
        </td></tr>
        <tr><td align="center" style="padding-top: 24px;">
          <p style="margin: 0; font-size: 11px; color: #a3a3a3;">&copy; SpeakUp LMS. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  },
};

/**
 * 9. Admin Two-Factor MFA Verification Code Email Template
 * Responsive, cross-client template with mobile-optimized container, balanced padding,
 * and high-contrast styling for desktop, tablet, and 320px–375px mobile viewports.
 */
export function getAdminMfaVerificationEmailHtml(params: {
  code: string;
  expiresMinutes?: number;
  options?: EmailBrandingOptions;
}): string {
  const expires = params.expiresMinutes || 3;
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>SpeakUp LMS — Admin Security Code</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #0a0c10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 600px) {
      .mfa-outer-table { padding: 16px 8px !important; }
      .mfa-container { width: 100% !important; max-width: 100% !important; }
      .mfa-card { padding: 24px 16px !important; }
      .mfa-inner-box { padding: 20px 12px !important; }
      .mfa-otp-code { font-size: 28px !important; letter-spacing: 0.16em !important; padding: 10px 14px !important; }
    }
    @media only screen and (max-width: 375px) {
      .mfa-outer-table { padding: 12px 4px !important; }
      .mfa-card { padding: 18px 12px !important; border-radius: 10px !important; }
      .mfa-inner-box { padding: 16px 8px !important; }
      .mfa-otp-code { font-size: 24px !important; letter-spacing: 0.12em !important; padding: 8px 10px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0c10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" class="mfa-outer-table" style="background-color: #0a0c10; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Responsive Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="560" class="mfa-container" style="max-width: 560px; width: 100%; margin: 0 auto;">
          
          <!-- Header Branding -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-family: 'Cinzel', Georgia, serif; font-size: 20px; font-weight: 700; letter-spacing: 0.12em; color: #d4af37; text-transform: uppercase;">
                      SPEAKUP LMS
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: 0.1em; color: #9ba1b0; text-transform: uppercase; font-weight: 600;">
                      Institutional Administration Security
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Dark Card -->
          <tr>
            <td class="mfa-card" style="background-color: #0f1115; border-radius: 12px; border: 1px solid #232733; padding: 32px 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
              
              <!-- Inner Code Box Container -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="mfa-inner-box" style="background-color: #161922; border: 1px solid #2a2f3d; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td align="center" style="padding: 24px 16px;">
                    <p style="color: #cbd2e1; font-size: 14px; margin: 0 0 16px; font-weight: 500;">
                      Your single-use administrative access code is:
                    </p>
                    
                    <!-- Centered, Fluid OTP Code Rectangle -->
                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" class="mfa-otp-code" style="background-color: #0a0c10; border: 1.5px solid #d4af37; border-radius: 6px; padding: 10px 18px; color: #ffffff; font-family: 'Courier New', Courier, monospace, -apple-system; font-size: 28px; font-weight: 700; letter-spacing: 0.18em; line-height: 1.2; text-align: center; word-break: keep-all; white-space: nowrap;">${params.code}</td>
                      </tr>
                    </table>

                    <p style="color: #8c93a4; font-size: 12px; margin: 16px 0 0;">
                      This code will expire in ${expires} minutes and can only be used once.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <p style="color: #727a8c; font-size: 12px; line-height: 1.6; margin: 0;">
                <strong style="color: #9ba1b0;">Security Alert:</strong> This code was requested following an administrative login. If you did not initiate this sign-in attempt, please revoke all sessions and change your administrator password immediately.
              </p>
            </td>
          </tr>

          <!-- Footer Note -->
          <tr>
            <td align="center" style="padding-top: 24px; padding-bottom: 16px;">
              <p style="margin: 0; font-size: 11px; color: #616876;">
                &copy; ${currentYear} SpeakUp LMS. Institutional Access Control. Confidential.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

