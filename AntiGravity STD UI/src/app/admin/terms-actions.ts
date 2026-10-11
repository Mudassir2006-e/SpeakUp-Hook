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

export interface CentralTermItem {
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

const TERMS_FILE = path.join(process.cwd(), "src", "config", "central-terms.json");

const DEFAULT_TERMS: CentralTermItem[] = [
  {
    id: "term-1",
    number: 1,
    title: "Individual Student License & Credentials",
    content:
      "Course access is strictly individual and non-transferable. Sharing credentials, lecture recordings, or course notes with third parties violates institutional policy and results in immediate access revocation without refund.",
  },
  {
    id: "term-2",
    number: 2,
    title: "Verification & Course Unlocking",
    content:
      "Email verification confirms your student account. Course material unlocking is executed individually by academic administration upon receipt verification, ensuring structured progress control.",
  },
  {
    id: "term-3",
    number: 3,
    title: "Certification Standards",
    content:
      "Official certificates of completion are issued only when a student achieves a minimum 80% completion metric on course modules and completes the practical capstone assignment or oral defense seminar.",
  },
  {
    id: "term-4",
    number: 4,
    title: "Refund Policy",
    content:
      "Due to the proprietary nature of our curated PDFs and recorded masterclasses, enrollment fees are non-refundable once portal credentials and curriculum materials have been accessed.",
  },
];

function readTermsFile(): CentralTermItem[] {
  try {
    if (!fs.existsSync(TERMS_FILE)) {
      fs.writeFileSync(TERMS_FILE, JSON.stringify(DEFAULT_TERMS, null, 2), "utf-8");
      return DEFAULT_TERMS;
    }
    const raw = fs.readFileSync(TERMS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_TERMS;
  } catch {
    return DEFAULT_TERMS;
  }
}

function writeTermsFile(items: CentralTermItem[]): void {
  try {
    const dir = path.dirname(TERMS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TERMS_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write central-terms.json:", err);
  }
}

/**
 * Retrieves all dynamic terms and conditions sections.
 */
export async function getCentralTermsAction(): Promise<ActionResponse<CentralTermItem[]>> {
  try {
    const terms = readTermsFile();
    return { success: true, data: terms };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load terms.",
      data: DEFAULT_TERMS,
    };
  }
}

/**
 * Saves and publishes the full list of dynamic terms and conditions sections.
 */
export async function saveCentralTermsAction(
  items: CentralTermItem[]
): Promise<ActionResponse<CentralTermItem[]>> {
  try {
    if (!Array.isArray(items)) {
      return { success: false, error: "Invalid terms list format." };
    }

    // Renumber sequentially 1..N
    const normalized: CentralTermItem[] = items.map((item, idx) => ({
      id: item.id || `term-${Date.now()}-${idx}`,
      number: idx + 1,
      title: item.title.trim(),
      content: item.content.trim(),
    }));

    writeTermsFile(normalized);
    safeRevalidatePath("/terms");
    safeRevalidatePath("/admin/edit-page");

    return {
      success: true,
      data: normalized,
      message: "Terms & Conditions sections published successfully.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save terms.",
    };
  }
}
