"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";

export interface CentralFaqItem {
  id: string;
  question: string;
  answer: string;
  category: "General" | "Registration" | "LMS" | "Certificate" | "Learning Path" | "Pricing" | "Courses" | "Payment" | string;
  status: "published" | "draft";
  order_index?: number;
  updated_at?: string;
}

export type CentralFaq = CentralFaqItem;

const FAQS_FILE_PATH = path.join(process.cwd(), "src", "config", "central-faqs.json");

function readCentralFaqs(): CentralFaqItem[] {
  try {
    if (!fs.existsSync(FAQS_FILE_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(FAQS_FILE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read central-faqs.json", err);
    return [];
  }
}

function writeCentralFaqs(faqs: CentralFaqItem[]): void {
  const dir = path.dirname(FAQS_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(FAQS_FILE_PATH, JSON.stringify(faqs, null, 2), "utf-8");
}

export async function getCentralFaqsAction(): Promise<{
  success: boolean;
  data: CentralFaqItem[];
  error?: string;
}> {
  try {
    const faqs = readCentralFaqs();
    return { success: true, data: faqs };
  } catch (err: any) {
    return { success: false, data: [], error: err?.message || "Failed to load FAQs." };
  }
}

export async function saveCentralFaqAction(
  faq: Partial<CentralFaqItem> & { question: string; answer: string; category: string }
): Promise<{ success: boolean; data?: CentralFaqItem; error?: string }> {
  try {
    const question = faq.question.trim();
    const answer = faq.answer.trim();
    const category = faq.category.trim();

    if (!question) {
      return { success: false, error: "Question is required." };
    }
    if (!answer) {
      return { success: false, error: "Answer is required." };
    }

    const currentFaqs = readCentralFaqs();
    const faqId = faq.id || `faq-${Date.now()}`;
    const existingIndex = currentFaqs.findIndex((f) => f.id === faqId);

    const updatedItem: CentralFaqItem = {
      id: faqId,
      question,
      answer,
      category,
      status: faq.status || "published",
      order_index: faq.order_index ?? (existingIndex >= 0 ? currentFaqs[existingIndex].order_index : currentFaqs.length + 1),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      currentFaqs[existingIndex] = updatedItem;
    } else {
      currentFaqs.push(updatedItem);
    }

    writeCentralFaqs(currentFaqs);
    revalidatePath("/faq");
    revalidatePath("/admin/faqs");
    return { success: true, data: updatedItem };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save FAQ." };
  }
}

export async function deleteCentralFaqAction(
  faqId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentFaqs = readCentralFaqs();
    const filtered = currentFaqs.filter((f) => f.id !== faqId);
    writeCentralFaqs(filtered);
    revalidatePath("/faq");
    revalidatePath("/admin/faqs");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete FAQ." };
  }
}
