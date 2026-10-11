"use server";

import fs from "fs";
import path from "path";

function safeRevalidatePath(p: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    if (typeof revalidatePath === "function") revalidatePath(p);
  } catch {}
}

export interface CentralPrivacyItem {
  id: string;
  number: number;
  title: string;
  content: string;
}

export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const PRIVACY_FILE = path.join(process.cwd(), "src", "config", "central-privacy.json");

const DEFAULT_PRIVACY: CentralPrivacyItem[] = [
  {
    id: "priv-1",
    number: 1,
    title: "Certification Integrity & Public Registry",
    content:
      "Upon successful completion of course requirements, certificates are assigned a permanent serial code. Third-party employers may only verify certificate authenticity and completion date via our registry.",
  },
  {
    id: "priv-2",
    number: 2,
    title: "Governance Inquiries & Account Deletion",
    content:
      "Students maintain the right to review registered personal information or request data archiving upon course completion by contacting our academic administration desk at admissions@speakup.com.",
  },
];

function readPrivacyFile(): CentralPrivacyItem[] {
  try {
    if (!fs.existsSync(PRIVACY_FILE)) {
      fs.writeFileSync(PRIVACY_FILE, JSON.stringify(DEFAULT_PRIVACY, null, 2), "utf-8");
      return DEFAULT_PRIVACY;
    }
    const raw = fs.readFileSync(PRIVACY_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_PRIVACY;
  } catch {
    return DEFAULT_PRIVACY;
  }
}

function writePrivacyFile(items: CentralPrivacyItem[]): void {
  try {
    const dir = path.dirname(PRIVACY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PRIVACY_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write central-privacy.json:", err);
  }
}

/**
 * Retrieves all dynamic privacy policy sections.
 */
export async function getCentralPrivacyAction(): Promise<ActionResponse<CentralPrivacyItem[]>> {
  try {
    const sections = readPrivacyFile();
    return { success: true, data: sections };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load privacy policy.",
      data: DEFAULT_PRIVACY,
    };
  }
}

/**
 * Saves and publishes the dynamic privacy policy sections.
 */
export async function saveCentralPrivacyAction(
  items: CentralPrivacyItem[]
): Promise<ActionResponse<CentralPrivacyItem[]>> {
  try {
    if (!Array.isArray(items)) {
      return { success: false, error: "Invalid privacy sections format." };
    }

    // Renumber sequentially 1..N
    const normalized: CentralPrivacyItem[] = items.map((item, idx) => ({
      id: item.id || `priv-${Date.now()}-${idx}`,
      number: idx + 1,
      title: item.title.trim(),
      content: item.content.trim(),
    }));

    writePrivacyFile(normalized);
    safeRevalidatePath("/privacy");
    safeRevalidatePath("/admin/edit-page");

    return {
      success: true,
      data: normalized,
      message: "Privacy Policy sections published successfully.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save privacy sections.",
    };
  }
}
