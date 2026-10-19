"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getAuthoritativeSenderIdentity, sendWelcomeStudentEmail } from "@/lib/email";

export interface PublicRegistrationPayload {
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  courseInterest?: string;
  receiptTid?: string;
}

export interface PublicRegistrationResult {
  success: boolean;
  emailSent?: boolean;
  emailError?: string;
  error?: string;
}

/**
 * Server action to ensure newly registered public students receive pending account status.
 * Sets public.profiles.account_status = 'pending' and auth.users app_metadata.status = 'pending'.
 * Strictly does NOT grant any automatic course enrollments.
 * Dispatches the welcome acknowledgement email server-side without leaking credentials to client code.
 */
export async function setPublicRegistrationPendingAction(
  payload: PublicRegistrationPayload
): Promise<PublicRegistrationResult> {
  try {
    const adminClient = createAdminClient();
    const normalizedEmail = payload.email.trim().toLowerCase();

    // 1. Explicitly ensure profile account_status is 'pending', role is strictly 'student', and receipt_id is saved
    await (adminClient as any).from("profiles").upsert(
      {
        id: payload.userId,
        email: normalizedEmail,
        full_name: payload.fullName,
        phone: payload.phone || null,
        role: "student",
        account_status: "pending",
        receipt_id: payload.receiptTid || null,
      },
      { onConflict: "id" }
    );

    // 2. Set auth metadata status to 'pending' and role strictly to 'student'
    try {
      const { data: userData } = await adminClient.auth.admin.getUserById(payload.userId);
      const currentMeta = userData?.user?.app_metadata || {};
      await adminClient.auth.admin.updateUserById(payload.userId, {
        app_metadata: {
          ...currentMeta,
          role: "student",
          status: "pending",
        },
      });
    } catch (authErr) {
      console.warn("Notice: Auth app_metadata status update for public registration:", authErr);
    }

    // 3. Dispatch welcome email from the server with idempotency check
    let emailSent = false;
    let emailError: string | undefined;

    try {
      // Check if welcome email has already been sent to this student to prevent duplicate dispatches
      const { data: existingLogs } = await (adminClient as any)
        .from("email_logs")
        .select("id, status")
        .eq("recipient_email", normalizedEmail)
        .eq("template_id", "welcome_student")
        .eq("status", "sent")
        .limit(1);

      if (existingLogs && existingLogs.length > 0) {
        console.info(`Welcome email already delivered to ${normalizedEmail}, idempotency preserved.`);
        emailSent = true;
      } else {
        const identity = await getAuthoritativeSenderIdentity();
        const now = new Date();
        const readableDate = now.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const readableTime = now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // Resolve course duration if course is specified
        let courseDuration: string | undefined;
        if (payload.courseInterest) {
          try {
            const { getUnifiedCourses } = await import("@/config/unifiedCourses");
            const allCourses = getUnifiedCourses();
            const matched = allCourses.find(
              (c) =>
                c.title.toLowerCase().trim() === payload.courseInterest?.toLowerCase().trim() ||
                c.slug.toLowerCase().trim() === payload.courseInterest?.toLowerCase().trim()
            );
            if (matched?.duration) {
              courseDuration = matched.duration;
            }
          } catch {
            // Non-blocking course lookup
          }
        }

        const emailRes = await sendWelcomeStudentEmail({
          studentName: payload.fullName,
          studentEmail: normalizedEmail,
          courseName: payload.courseInterest || undefined,
          courseDuration,
          registrationDate: readableDate,
          registrationTime: readableTime,
          accountStatus: "pending",
          senderName: identity.fromName,
          senderEmail: identity.fromEmail,
          replyTo: identity.replyTo,
          avatarUrl: identity.avatarUrl,
        });

        emailSent = Boolean(emailRes.success);
        if (!emailRes.success) {
          emailError = emailRes.error;
        }
      }
    } catch (mailErr: any) {
      emailError = mailErr?.message || "Failed to dispatch welcome email";
      console.warn("Public registration welcome email dispatch notice:", mailErr);
    }

    // 4. Dispatch notification to authoritative administrator email
    try {
      const { sendAdminNotificationEmail } = await import("@/lib/email");
      await sendAdminNotificationEmail({
        subject: `New Student Registration (Pending Review): ${payload.fullName}`,
        html: `<p>A new student has registered and is pending review on SpeakUp LMS:</p><ul><li><strong>Name:</strong> ${payload.fullName}</li><li><strong>Email:</strong> ${normalizedEmail}</li><li><strong>Course Interest:</strong> ${payload.courseInterest || "General"}</li><li><strong>Receipt TID:</strong> ${payload.receiptTid || "Not provided"}</li><li><strong>Registration Time:</strong> ${new Date().toLocaleString()}</li></ul><p>Please review and approve their account in the Admin Panel.</p>`,
      });
    } catch (adminNotifyErr) {
      console.warn("Notice: Non-blocking admin notification for registration:", adminNotifyErr);
    }

    return { success: true, emailSent, emailError };
  } catch (err: any) {
    console.error("Failed to initialize public registration pending status:", err);
    return { success: false, error: err?.message || "Failed to initialize student account status." };
  }
}

// Preserve backwards-compatibility alias
export const setPublicRegistrationActiveAction = setPublicRegistrationPendingAction;
