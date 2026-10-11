# SpeakUp LMS — Supabase Authentication Email Configuration Guide

This guide details how to configure Supabase Authentication to send all student auth emails (Confirmation, Password Reset, Magic Link, Invite) using SpeakUp's unified sender identity and luxury branding.

---

## 1. Custom SMTP Provider Setup (Supabase Dashboard)

To prevent Supabase default sender identities (`noreply@mail.app.supabase.io`) and ensure emails come from your verified SpeakUp identity, connect your transactional email provider (Resend) via Custom SMTP:

1. Open your **Supabase Dashboard** -> Select your Project.
2. Navigate to **Authentication** -> **SMTP Settings** (or **Email Settings**).
3. Enable **Enable Custom SMTP**.
4. Fill in the following credentials:
   - **Sender email**: Enter the exact sender email configured in SpeakUp Admin Panel (e.g. `support@yourdomain.com` or `onboarding@resend.dev` for development).
   - **Sender name**: `SpeakUp LMS` (or your configured Portal Email Sender Name).
   - **Host**: `smtp.resend.com`
   - **Port number**: `465` (SSL) or `587` (TLS)
   - **Username**: `resend`
   - **Password**: Your `RESEND_API_KEY` (starts with `re_...`)
   - **Encryption**: `SSL/TLS` (for port 465) or `STARTTLS` (for port 587)
5. Click **Save Changes**.

---

## 2. Supabase Auth Email Templates

In your **Supabase Dashboard** -> **Authentication** -> **Email Templates**, customize the HTML for each flow to match SpeakUp's gold & dark luxury aesthetic.

> **Note**: Supabase automatically substitutes variables like `{{ .ConfirmationURL }}` and `{{ .Token }}`. Keep these intact.

### A. Confirm signup (Registration Confirmation)

**Subject**: `Confirm your SpeakUp LMS account`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your SpeakUp Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0e11; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d0e11; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #141416; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #18191c 0%, #101012 100%); padding: 36px 32px; text-align: center; border-bottom: 1px solid #27272a;">
              <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                Speak<span style="color: #d4af37;">Up</span> <span style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #a1a1aa; vertical-align: middle; margin-left: 6px;">LMS</span>
              </div>
              <div style="margin-top: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #d4af37; font-weight: 600;">
                Academic Portal Authentication
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                Confirm your student email address
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #d4d4d8;">
                Welcome to SpeakUp LMS. To verify your email address and submit your registration for administrative approval, please confirm your account below:
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #c49d2c 100%); color: #0d0e11; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(212,175,55,0.35);">
                  Confirm Email Address
                </a>
              </div>

              <div style="background-color: #1a1a1e; border: 1px solid #27272a; border-radius: 10px; padding: 16px 20px; margin-top: 28px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #a1a1aa;">
                  <strong>Note:</strong> Once your email is confirmed, your account will be reviewed by SpeakUp admissions before course access is unlocked.
                </p>
              </div>

              <p style="margin: 28px 0 0 0; font-size: 12px; line-height: 1.5; color: #71717a;">
                If the button above does not work, copy and paste this URL into your browser:<br>
                <a href="{{ .ConfirmationURL }}" style="color: #d4af37; word-break: break-all;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f1012; padding: 24px 32px; border-top: 1px solid #222226; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #71717a;">
                SpeakUp LMS &bull; Department of Academic Admissions
              </p>
              <p style="margin: 0; font-size: 11px; color: #52525b;">
                If you did not create this account, please disregard this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

### B. Reset Password (Password Recovery)

**Subject**: `Reset your SpeakUp LMS password`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your SpeakUp Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0e11; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d0e11; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #141416; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #18191c 0%, #101012 100%); padding: 36px 32px; text-align: center; border-bottom: 1px solid #27272a;">
              <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                Speak<span style="color: #d4af37;">Up</span> <span style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #a1a1aa; vertical-align: middle; margin-left: 6px;">LMS</span>
              </div>
              <div style="margin-top: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #d4af37; font-weight: 600;">
                Security &amp; Account Recovery
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                Reset your password
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #d4d4d8;">
                We received a request to reset the password associated with your SpeakUp account. Click the button below to choose a new password:
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #c49d2c 100%); color: #0d0e11; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(212,175,55,0.35);">
                  Reset Password
                </a>
              </div>

              <div style="background-color: #1a1a1e; border: 1px solid #27272a; border-radius: 10px; padding: 16px 20px; margin-top: 28px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #a1a1aa;">
                  <strong>Security notice:</strong> For security, this link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email; your password will not be changed.
                </p>
              </div>

              <p style="margin: 28px 0 0 0; font-size: 12px; line-height: 1.5; color: #71717a;">
                Direct URL:<br>
                <a href="{{ .ConfirmationURL }}" style="color: #d4af37; word-break: break-all;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f1012; padding: 24px 32px; border-top: 1px solid #222226; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #71717a;">
                SpeakUp LMS &bull; Security &amp; Access Control
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

### C. Invite user (Admin Invitations)

**Subject**: `You've been invited to SpeakUp LMS`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SpeakUp LMS Invitation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0e11; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d0e11; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #141416; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #18191c 0%, #101012 100%); padding: 36px 32px; text-align: center; border-bottom: 1px solid #27272a;">
              <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                Speak<span style="color: #d4af37;">Up</span> <span style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #a1a1aa; vertical-align: middle; margin-left: 6px;">LMS</span>
              </div>
              <div style="margin-top: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #d4af37; font-weight: 600;">
                Official Invitation
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                You're invited to SpeakUp LMS
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #d4d4d8;">
                An administrator has provisioned an account for you on the SpeakUp Learning Management System. Click below to accept the invitation and set up your password:
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #c49d2c 100%); color: #0d0e11; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(212,175,55,0.35);">
                  Accept Invitation &amp; Set Password
                </a>
              </div>

              <p style="margin: 28px 0 0 0; font-size: 12px; line-height: 1.5; color: #71717a;">
                Direct URL:<br>
                <a href="{{ .ConfirmationURL }}" style="color: #d4af37; word-break: break-all;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f1012; padding: 24px 32px; border-top: 1px solid #222226; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #71717a;">
                SpeakUp LMS &bull; Academic Portal
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. In-Body Email Branding vs Inbox Avatar Circles

### In-Body Branding (Controlled by SpeakUp)
- The SpeakUp logo, golden accent styling (`#d4af37`), sender display name, and custom profile image inside the body of every email sent by the LMS are fully automated.
- Application emails (course approval/rejection, account acceptance, verification tests) dynamically fetch the avatar and sender name set in **Admin Panel -> Portal Email**.

### Inbox Avatar Circles (Controlled by Email Client & Domain DNS)
- **Important**: Uploading an image in the Admin Panel controls the visual header inside the email body, but **no email client (like Gmail, Apple Mail, or Outlook)** uses an email's body HTML to render the avatar circle next to the sender in the inbox list.
- To display your SpeakUp avatar circle in recipient inboxes:
  1. **Google Workspace / BIMI**: Configure a BIMI (Brand Indicators for Message Identification) DNS TXT record for your domain (`default._bimi.yourdomain.com`) with an SVG logo. Requires DMARC enforcement (`p=quarantine` or `p=reject`).
  2. **Gravatar**: Create a free Gravatar profile for the sending address (e.g. `support@yourdomain.com`) and upload the SpeakUp logo. Many inboxes (Apple Mail, Thunderbird, WordPress, etc.) will automatically pull and display this image.
  3. **Google Account**: If the sender email is a Google Workspace or Gmail address, set the profile photo in Google Account Settings.
