import { getCurrentUserRole } from "@/lib/auth/roles";

/**
 * Validates that the current user has verified administrator privileges.
 * Returns { adminId } on success, or { error } on failure.
 */
export async function verifyAdminCaller(): Promise<{ adminId: string } | { error: string }> {
  try {
    const { userId, role } = await getCurrentUserRole();
    if (!userId || role !== "admin") {
      return { error: "Forbidden: Administrative privileges required." };
    }
    return { adminId: userId };
  } catch {
    return {
      error: "Authentication verification failed.",
    };
  }
}
