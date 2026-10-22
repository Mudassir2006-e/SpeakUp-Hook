"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useCmsContent } from "@/lib/cms/useCmsContent";

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  category: string;
  items: FAQItem[];
}

import { getCentralFaqsAction, CentralFaq } from "@/app/admin/faq-actions";

export default function FAQPage() {
  const cms = useCmsContent("faq");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "0-0": true,
    "1-0": true,
  });
  const [dynamicFaqs, setDynamicFaqs] = useState<CentralFaq[] | null>(null);

  React.useEffect(() => {
    async function loadFaqs() {
      try {
        const res = await getCentralFaqsAction();
        if (res.success && res.data && res.data.length > 0) {
          setDynamicFaqs(res.data.filter((f) => f.status !== "draft"));
        }
      } catch {
        // Fallback to built-in faqData
      }
    }
    loadFaqs();
  }, []);

  const fallbackFaqData: FAQCategory[] = [
    {
      category: "Enrollment & Registration",
      items: [
        {
          q: "How does the enrollment process work?",
          a: "Enrollment starts with registering on our website. You select your preferred course, review the transparent tuition fees, transfer the amount to one of our dual institutional bank accounts, and provide your transaction reference number during registration. Upon receipt verification, administration unlocks your course access.",
        },
        {
          q: "What is the difference between account verification and course approval?",
          a: "Account verification is an instant 6-digit OTP process confirming your email address and giving you access to the student portal. Course access is approved individually by administration for each course enrolled, ensuring that your study materials and mentor schedule are properly configured.",
        },
        {
          q: "Can I pay via domestic bank transfer or mobile wallet?",
          a: "Yes. We accept transfers via Meezan Bank, Raast, JazzCash, Nayapay, and EasyPaisa, as well as international wire transfers and Wise via our Standard Chartered institutional account.",
        },
      ],
    },
    {
      category: "LMS & Learning Experience",
      items: [
        {
          q: "What is included inside the SpeakUp LMS?",
          a: "Every course inside our LMS includes 3 core components: 1) High-definition Video Masterclasses with playback controls, 2) Comprehensive curated Study Notes available for immediate copying or reference, and 3) Practical Exercises & Drills designed to cement articulation habits.",
        },
        {
          q: "Can I access the course on mobile and tablet devices?",
          a: "Yes. The SpeakUp student LMS is fully responsive and optimized for smartphones, tablets, laptops, and desktop displays. You can review notes, watch lectures, and complete drills anywhere.",
        },
        {
          q: "Are the lectures pre-recorded or live?",
          a: "Our core curriculum is delivered via on-demand studio-grade masterclasses so you can learn at your own pace. In addition, registered students receive invitations to live oral defense seminars and interactive coaching workshops with Sir Mudassir Ali.",
        },
      ],
    },
    {
      category: "Certification & Credentialing",
      items: [
        {
          q: "How do I earn an official SpeakUp Certificate?",
          a: "To qualify for official certification, students must complete at least 80% of course lectures and modules, finish the practical assignments, and participate in an oral assessment evaluation. Each issued certificate includes a unique verification serial number.",
        },
        {
          q: "Is the certificate recognized for professional and academic portfolios?",
          a: "Yes. Our certificates are issued under institutional governance standards and can be shared on LinkedIn, appended to executive CVs, or verified directly by employers via our credentials portal.",
        },
      ],
    },
  ];

  // Group dynamic central FAQs by category if available
  const faqData: FAQCategory[] = React.useMemo(() => {
    if (!dynamicFaqs || dynamicFaqs.length === 0) {
      return fallbackFaqData;
    }

    const categoryMap = new Map<string, FAQItem[]>();
    for (const faq of dynamicFaqs) {
      const cat = faq.category || "General";
      const existing = categoryMap.get(cat) || [];
      existing.push({ q: faq.question, a: faq.answer });
      categoryMap.set(cat, existing);
    }

    return Array.from(categoryMap.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  }, [dynamicFaqs]);

  const toggleItem = (catIdx: number, itemIdx: number) => {
    const key = `${catIdx}-${itemIdx}`;
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      <Navbar />

      <main className="flex-1 py-12 md:py-20">
        <div className="max-w-[1000px] mx-auto px-6 md:px-12">
          {/* Header */}
          <header className="text-center mb-16">
            {/* Main Heading enclosed in stylish rectangular rounded box */}
            <div className="inline-flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-2xl shadow-[0_4px_24px_-6px_rgba(212,175,55,0.18)] mb-5">
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-[0.08em] text-[var(--text-main)]">
                {cms.header?.heading || "Frequently Asked Questions"}
              </h1>
            </div>

            {/* Natural Subheading */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3">
              <span className="h-px w-6 sm:w-12 bg-gradient-to-r from-transparent to-[#d4af37]/60" />
              <h2 className="font-display text-base sm:text-lg md:text-xl font-semibold tracking-wide text-[#d4af37]">
                {cms.header?.subheading || "Clear Answers & Academic Guidance"}
              </h2>
              <span className="h-px w-6 sm:w-12 bg-gradient-to-l from-transparent to-[#d4af37]/60" />
            </div>

            <p className="font-serif text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
              Find answers to common questions about admissions, enrollment, bank transfers, and navigating your executive education journey with SpeakUp.
            </p>
          </header>

          {/* Accordion Categories */}
          <div className="space-y-12 mb-16">
            {faqData.map((cat, catIdx) => (
              <div key={catIdx} className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-[var(--surface-border)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#d4af37]"></span>
                  <h2 className="font-display text-xl font-bold text-[var(--text-main)] uppercase tracking-wider">
                    {cat.category}
                  </h2>
                </div>

                <div className="space-y-3">
                  {cat.items.map((item, itemIdx) => {
                    const key = `${catIdx}-${itemIdx}`;
                    const isOpen = !!openItems[key];

                    return (
                      <div
                        key={itemIdx}
                        className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl overflow-hidden shadow-xs hover:border-[#d4af37]/40 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => toggleItem(catIdx, itemIdx)}
                          className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <span className="font-display text-base md:text-lg font-bold text-[var(--text-main)]">
                            {item.q}
                          </span>
                          <span className="material-symbols-outlined text-[22px] text-[var(--text-muted)] transition-transform duration-200 shrink-0">
                            {isOpen ? "expand_less" : "expand_more"}
                          </span>
                        </button>

                        {isOpen && (
                          <div className="px-6 pb-6 pt-1 font-serif text-[15px] md:text-[16px] text-[var(--text-muted)] leading-relaxed border-t border-[var(--surface-border)]/40 bg-[var(--surface-low)]/20">
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Need More Assistance Banner */}
          <div className="bg-[var(--surface-low)] border border-[#d4af37]/30 rounded-2xl p-8 md:p-10 text-center shadow-xs">
            <h3 className="font-display text-2xl font-bold text-[var(--text-main)] mb-3">
              Have a specific question not covered here?
            </h3>
            <p className="font-serif text-base text-[var(--text-muted)] max-w-xl mx-auto mb-6 leading-relaxed">
              Our academic advisors are on standby to provide individualized assistance regarding course schedules, prerequisites, or fee payment support.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/book-session"
                className="bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all font-display text-xs uppercase tracking-widest font-bold px-8 py-3.5 rounded-full shadow-xs"
              >
                Book a Session
              </Link>
              <Link
                href="/pricing#bank"
                className="border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-xs uppercase tracking-widest font-bold px-8 py-3.5 rounded-full transition-all"
              >
                View Bank Details
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
