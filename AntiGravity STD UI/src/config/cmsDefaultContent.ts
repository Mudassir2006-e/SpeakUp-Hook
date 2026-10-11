/**
 * SpeakUp LMS — CMS Default Page Structures & Content Store
 * Serves as the canonical content model for the Universal Page Editor.
 */

export interface CmsField {
  id: string;
  label: string;
  type: "text" | "textarea" | "image" | "link" | "number" | "select" | "faq_list" | "card_list";
  value: any;
  placeholder?: string;
  options?: string[];
  helpText?: string;
}

export interface CmsSection {
  id: string;
  name: string;
  description: string;
  fields: Record<string, CmsField>;
}

export interface CmsPageData {
  pageKey: string;
  pageTitle: string;
  route: string;
  sections: Record<string, CmsSection>;
}

export const CMS_DEFAULT_PAGES: Record<string, CmsPageData> = {
  home: {
    pageKey: "home",
    pageTitle: "Home Page",
    route: "/",
    sections: {
      hero: {
        id: "hero",
        name: "Hero Section",
        description: "Primary entrance banner, headline, and main CTA buttons",
        fields: {
          badgeText: {
            id: "badgeText",
            label: "Badge / Notice Text",
            type: "text",
            value: "Cohort 2026 Admission Open",
          },
          heading: {
            id: "heading",
            label: "Main Heading",
            type: "text",
            value: "Master the Art of Communication",
          },
          subheading: {
            id: "subheading",
            label: "Heading Accent / Tagline",
            type: "text",
            value: "Elevate your executive presence through bespoke linguistic training.",
          },
          bodyText: {
            id: "bodyText",
            label: "Introduction Body Text",
            type: "textarea",
            value:
              "Elevate your executive presence through bespoke linguistic training designed for the world’s most discerning professionals.",
          },
          primaryButtonText: {
            id: "primaryButtonText",
            label: "Primary Button Text",
            type: "text",
            value: "Learn More",
          },
          primaryButtonLink: {
            id: "primaryButtonLink",
            label: "Primary Button URL",
            type: "link",
            value: "/courses",
          },
          secondaryButtonText: {
            id: "secondaryButtonText",
            label: "Secondary Button Text",
            type: "text",
            value: "Free Demo",
          },
          secondaryButtonLink: {
            id: "secondaryButtonLink",
            label: "Secondary Button URL",
            type: "link",
            value: "/demo",
          },
          advisoryHeading: {
            id: "advisoryHeading",
            label: "Advisory Card Note",
            type: "textarea",
            value:
              "For personalized guidance on your leadership journey, book a private session with our academic team to discuss your goals.",
          },
          advisoryButtonText: {
            id: "advisoryButtonText",
            label: "Advisory Button Text",
            type: "text",
            value: "Book Your Session",
          },
          advisoryButtonLink: {
            id: "advisoryButtonLink",
            label: "Advisory Button URL",
            type: "link",
            value: "/book-session",
          },
        },
      },
      stats: {
        id: "stats",
        name: "Impact & Statistics Bar",
        description: "Numerical key performance metrics and milestones",
        fields: {
          stat1Number: { id: "stat1Number", label: "Stat 1 Value", type: "text", value: "98%" },
          stat1Label: { id: "stat1Label", label: "Stat 1 Label", type: "text", value: "Fluency Advancement Rate" },
          stat2Number: { id: "stat2Number", label: "Stat 2 Value", type: "text", value: "12+" },
          stat2Label: { id: "stat2Label", label: "Stat 2 Label", type: "text", value: "Years Coaching Executives" },
          stat3Number: { id: "stat3Number", label: "Stat 3 Value", type: "text", value: "2,500+" },
          stat3Label: { id: "stat3Label", label: "Stat 3 Label", type: "text", value: "Alumni Worldwide" },
          stat4Number: { id: "stat4Number", label: "Stat 4 Value", type: "text", value: "100%" },
          stat4Label: { id: "stat4Label", label: "Stat 4 Label", type: "text", value: "Mentor Accountability" },
        },
      },
      curriculum_preview: {
        id: "curriculum_preview",
        name: "Featured Courses Showcase",
        description: "Promotional preview of flagship linguistic programs",
        fields: {
          sectionTitle: { id: "sectionTitle", label: "Section Title", type: "text", value: "Curriculum Pathways" },
          sectionSubtitle: {
            id: "sectionSubtitle",
            label: "Section Subtitle",
            type: "textarea",
            value: "Precision language programs crafted for every level of professional proficiency.",
          },
          exploreButtonText: { id: "exploreButtonText", label: "Explore All Button", type: "text", value: "View All Programs" },
          exploreButtonLink: { id: "exploreButtonLink", label: "Explore Button Link", type: "link", value: "/courses" },
        },
      },
      cta_banner: {
        id: "cta_banner",
        name: "Final Call to Action Banner",
        description: "Closing high-conversion call to action banner",
        fields: {
          bannerHeading: {
            id: "bannerHeading",
            label: "Banner Headline",
            type: "text",
            value: "Begin Your Executive Transformation Today",
          },
          bannerBody: {
            id: "bannerBody",
            label: "Banner Description",
            type: "textarea",
            value:
              "Join ambitious leaders who have unlocked global career opportunities with SpeakUp’s bespoke communication masterclasses.",
          },
          ctaButtonText: { id: "ctaButtonText", label: "CTA Button Text", type: "text", value: "Apply for Admission" },
          ctaButtonLink: { id: "ctaButtonLink", label: "CTA Button Link", type: "link", value: "/book-session" },
        },
      },
      header: {
        id: "header",
        name: "Website Navigation Header",
        description: "Brand logo, navigation links, and student portal button",
        fields: {
          logoText: { id: "logoText", label: "Logo Brand Name", type: "text", value: "SpeakUp" },
          logoTagline: { id: "logoTagline", label: "Logo Subtext", type: "text", value: "" },
          logoImage: { id: "logoImage", label: "Logo Image URL", type: "image", value: "" },
          nav1Label: { id: "nav1Label", label: "Nav Item 1 Label", type: "text", value: "Home" },
          nav1Link: { id: "nav1Link", label: "Nav Item 1 URL", type: "link", value: "/" },
          nav2Label: { id: "nav2Label", label: "Nav Item 2 Label", type: "text", value: "Courses" },
          nav2Link: { id: "nav2Link", label: "Nav Item 2 URL", type: "link", value: "/courses" },
          nav3Label: { id: "nav3Label", label: "Nav Item 3 Label", type: "text", value: "Methodology" },
          nav3Link: { id: "nav3Link", label: "Nav Item 3 URL", type: "link", value: "/methodology" },
          nav4Label: { id: "nav4Label", label: "Nav Item 4 Label", type: "text", value: "Pricing" },
          nav4Link: { id: "nav4Link", label: "Nav Item 4 URL", type: "link", value: "/pricing" },
          nav5Label: { id: "nav5Label", label: "Nav Item 5 Label", type: "text", value: "Privacy" },
          nav5Link: { id: "nav5Link", label: "Nav Item 5 URL", type: "link", value: "/privacy" },
          portalButtonText: { id: "portalButtonText", label: "Account / Portal Button", type: "text", value: "Student Portal" },
        },
      },
      footer: {
        id: "footer",
        name: "Website Global Footer",
        description: "Footer brand info, platform navigation, and administration contact",
        fields: {
          brandTagline: {
            id: "brandTagline",
            label: "Footer Brand Description",
            type: "textarea",
            value: "Premium linguistic education for the discerning global professional.",
          },
          privacyLinkText: { id: "privacyLinkText", label: "Privacy Policy Link Label", type: "text", value: "Privacy & Policies" },
          termsLinkText: { id: "termsLinkText", label: "Terms Link Label", type: "text", value: "Terms & Conditions" },
          contactHeading: { id: "contactHeading", label: "Contact Header", type: "text", value: "Contact Administration" },
          contactText: {
            id: "contactText",
            label: "Contact Guidance",
            type: "textarea",
            value: "Reach out to our academic administration for guidance on curriculum, enrollment, and verification.",
          },
          contactEmail: { id: "contactEmail", label: "Contact Email Address", type: "text", value: "admissions@speakup.com" },
          copyrightText: { id: "copyrightText", label: "Copyright Statement", type: "text", value: "© 2026 SpeakUp. All Rights Reserved." },
        },
      },
    },
  },
  courses: {
    pageKey: "courses",
    pageTitle: "Courses Catalog",
    route: "/courses",
    sections: {
      header: {
        id: "header",
        name: "Courses Header Banner",
        description: "Top title and orientation for public curriculum catalog",
        fields: {
          pageHeading: { id: "pageHeading", label: "Page Heading", type: "text", value: "Executive Linguistic Curriculum" },
          subheading: {
            id: "subheading",
            label: "Subheading",
            type: "textarea",
            value: "Select your targeted course pathway. Each program includes studio video masterclasses, curated notes, and practical drills.",
          },
          filterBadge: { id: "filterBadge", label: "Badge Label", type: "text", value: "CEFR Standards A1 – C1" },
        },
      },
      enrollment_notice: {
        id: "enrollment_notice",
        name: "Tuition & Payment Notice",
        description: "Guidance on manual bank transfer and verification",
        fields: {
          noticeTitle: { id: "noticeTitle", label: "Notice Title", type: "text", value: "Verified Enrollment Process" },
          noticeBody: {
            id: "noticeBody",
            label: "Notice Explanation",
            type: "textarea",
            value:
              "Tuition payments are verified manually via domestic bank transfer or Raast. Provide your transaction TID for immediate activation.",
          },
          helpButtonText: { id: "helpButtonText", label: "Help Button Text", type: "text", value: "Review Tuition Schedule" },
          helpButtonLink: { id: "helpButtonLink", label: "Help Button Link", type: "link", value: "/pricing" },
        },
      },
    },
  },
  about: {
    pageKey: "about",
    pageTitle: "About Us",
    route: "/about",
    sections: {
      founder: {
        id: "founder",
        name: "Visionary & Founder Profile",
        description: "Sir Mudassir Ali's bio, credentials, and coaching philosophy",
        fields: {
          founderName: { id: "founderName", label: "Leader Name", type: "text", value: "Sir Mudassir Ali" },
          title: { id: "title", label: "Title & Designation", type: "text", value: "Founder & Lead Speech Coach" },
          headline: { id: "headline", label: "Section Headline", type: "text", value: "The Visionary Behind Linguistic Excellence" },
          bioParagraph1: {
            id: "bioParagraph1",
            label: "Bio Paragraph 1",
            type: "textarea",
            value:
              "Elevating executive communication through a refined, disciplined approach. Discover the philosophy that drives SpeakUp's bespoke language mastery programs.",
          },
          bioParagraph2: {
            id: "bioParagraph2",
            label: "Bio Paragraph 2",
            type: "textarea",
            value:
              "With over a decade of experience training corporate leaders, ambassadors, and academics, Sir Mudassir Ali bridges linguistic precision with public charisma.",
          },
          bookSessionButtonText: { id: "bookSessionButtonText", label: "Book Button Text", type: "text", value: "Schedule Advisory Call" },
          bookSessionButtonLink: { id: "bookSessionButtonLink", label: "Book Button Link", type: "link", value: "/book-session" },
        },
      },
      philosophy: {
        id: "philosophy",
        name: "Institutional Philosophy",
        description: "Core pedagogical values and speaking methodology",
        fields: {
          pillar1Title: { id: "pillar1Title", label: "Pillar 1 Title", type: "text", value: "Phonetic Precision" },
          pillar1Text: { id: "pillar1Text", label: "Pillar 1 Description", type: "textarea", value: "Systematic neutralization of non-native speech patterns." },
          pillar2Title: { id: "pillar2Title", label: "Pillar 2 Title", type: "text", value: "Executive Presence" },
          pillar2Text: { id: "pillar2Text", label: "Pillar 2 Description", type: "textarea", value: "Posture, breath control, and commanding cadence." },
          pillar3Title: { id: "pillar3Title", label: "Pillar 3 Title", type: "text", value: "Immediate Application" },
          pillar3Text: { id: "pillar3Text", label: "Pillar 3 Description", type: "textarea", value: "Daily drills and real-world speaking simulations." },
        },
      },
    },
  },
  pricing: {
    pageKey: "pricing",
    pageTitle: "Pricing & Tuition",
    route: "/pricing",
    sections: {
      header: {
        id: "header",
        name: "Tuition Header",
        description: "Introductory header for fees and institutional bank accounts",
        fields: {
          title: { id: "title", label: "Page Title", type: "text", value: "Transparent Tuition Schedule" },
          subtitle: {
            id: "subtitle",
            label: "Subtitle",
            type: "textarea",
            value: "All programs include comprehensive curriculum access, studio masterclass recordings, and personal verification.",
          },
          currencyNote: { id: "currencyNote", label: "Currency & Fee Note", type: "text", value: "Fixed Rates in PKR — Zero Hidden Surcharges" },
        },
      },
      payment_instructions: {
        id: "payment_instructions",
        name: "Payment Instructions",
        description: "Bank transfer and verification instructions",
        fields: {
          bank1Name: { id: "bank1Name", label: "Bank 1 Name", type: "text", value: "Meezan Bank Limited" },
          bank1Account: { id: "bank1Account", label: "Bank 1 Account Title", type: "text", value: "SpeakUp" },
          bank1Iban: { id: "bank1Iban", label: "Bank 1 IBAN", type: "text", value: "PK36MEZN0001234567890123" },
          bank2Name: { id: "bank2Name", label: "Bank 2 / Raast", type: "text", value: "Raast Instant Transfer" },
          bank2Account: { id: "bank2Account", label: "Bank 2 Account / ID", type: "text", value: "+92 300 1234567" },
          guidelineText: {
            id: "guidelineText",
            label: "Submission Guideline",
            type: "textarea",
            value: "Submit your payment screenshot or transaction ID during registration. Approvals are processed within 2 to 4 business hours.",
          },
        },
      },
    },
  },
  faq: {
    pageKey: "faq",
    pageTitle: "Frequently Asked Questions",
    route: "/faq",
    sections: {
      header: {
        id: "header",
        name: "FAQ Header",
        description: "Page heading and support prompt",
        fields: {
          heading: { id: "heading", label: "Headline", type: "text", value: "Frequently Asked Questions" },
          subheading: {
            id: "subheading",
            label: "Subheading",
            type: "textarea",
            value: "Clear answers regarding admissions, tuition payments, course approval, and LMS access.",
          },
        },
      },
      faq_items: {
        id: "faq_items",
        name: "Featured Q&A Items",
        description: "Primary question-and-answer pairs",
        fields: {
          q1: { id: "q1", label: "Question 1", type: "text", value: "How does the course access approval work?" },
          a1: {
            id: "a1",
            label: "Answer 1",
            type: "textarea",
            value:
              "Account verification is an instant email OTP check. Once verified, academic administration reviews your enrollment request and grants curriculum access.",
          },
          q2: { id: "q2", label: "Question 2", type: "text", value: "What learning materials are provided?" },
          a2: {
            id: "a2",
            label: "Answer 2",
            type: "textarea",
            value:
              "Every course includes 3 core components: studio video lectures, structured notes for immediate study, and rigorous speaking practice drills.",
          },
          q3: { id: "q3", label: "Question 3", type: "text", value: "Can I access lessons on mobile devices?" },
          a3: {
            id: "a3",
            label: "Answer 3",
            type: "textarea",
            value: "Yes. The SpeakUp student LMS is fully responsive and optimized for mobile, tablet, and desktop viewports.",
          },
        },
      },
    },
  },
  methodology: {
    pageKey: "methodology",
    pageTitle: "Methodology",
    route: "/methodology",
    sections: {
      header: {
        id: "header",
        name: "Methodology Header",
        description: "Introduction to our 4-pillar communication framework",
        fields: {
          heading: { id: "heading", label: "Headline", type: "text", value: "The SpeakUp Executive Framework" },
          subheading: {
            id: "subheading",
            label: "Subheading",
            type: "textarea",
            value: "A rigorous pedagogical system designed to eliminate hesitation and instill commanding articulation.",
          },
        },
      },
      framework_stages: {
        id: "framework_stages",
        name: "Mastery Stages",
        description: "The 4 structured stages of language transformation",
        fields: {
          stage1Title: { id: "stage1Title", label: "Stage 1", type: "text", value: "1. Diagnostic & Phonetic Audit" },
          stage1Desc: { id: "stage1Desc", label: "Stage 1 Details", type: "textarea", value: "Comprehensive baseline assessment of vocal tone, vowel clarity, and speech cadence." },
          stage2Title: { id: "stage2Title", label: "Stage 2", type: "text", value: "2. Structural Grammar & Lexicon" },
          stage2Desc: { id: "stage2Desc", label: "Stage 2 Details", type: "textarea", value: "Advanced syntax mastery eliminating colloquial errors in high-stakes environments." },
          stage3Title: { id: "stage3Title", label: "Stage 3", type: "text", value: "3. Rhetorical Articulation Drills" },
          stage3Desc: { id: "stage3Desc", label: "Stage 3 Details", type: "textarea", value: "Rapid-fire speech improvisation and defensive argumentation practice." },
          stage4Title: { id: "stage4Title", label: "Stage 4", type: "text", value: "4. Executive Oral Defense" },
          stage4Desc: { id: "stage4Desc", label: "Stage 4 Details", type: "textarea", value: "Capstone presentation defended live before our senior academic board." },
        },
      },
    },
  },
  contact: {
    pageKey: "contact",
    pageTitle: "Book Session / Contact",
    route: "/book-session",
    sections: {
      header: {
        id: "header",
        name: "Advisory Booking Header",
        description: "Consultation header and office hours",
        fields: {
          heading: { id: "heading", label: "Headline", type: "text", value: "Schedule a Private Advisory Session" },
          subheading: {
            id: "subheading",
            label: "Subheading",
            type: "textarea",
            value: "Consult directly with our academic advisors to select the optimal course pathway for your career objectives.",
          },
          officeHours: { id: "officeHours", label: "Office & Clinic Hours", type: "text", value: "Monday – Saturday: 10:00 AM – 7:00 PM PKT" },
          contactPhone: { id: "contactPhone", label: "Direct Phone / WhatsApp", type: "text", value: "+92 300 0000000" },
        },
      },
    },
  },
  dashboard: {
    pageKey: "dashboard",
    pageTitle: "Student LMS Dashboard",
    route: "/lms/dashboard",
    sections: {
      welcome: {
        id: "welcome",
        name: "Student Welcome Banner",
        description: "Greeting banner and motivational message for logged-in students",
        fields: {
          greetingPrefix: { id: "greetingPrefix", label: "Greeting Prefix", type: "text", value: "Welcome Back" },
          portalTagline: {
            id: "portalTagline",
            label: "Tagline",
            type: "text",
            value: "Continue your linguistic development with dedicated practice drills.",
          },
          primaryActionText: { id: "primaryActionText", label: "Action Button Text", type: "text", value: "Explore Courses" },
          primaryActionLink: { id: "primaryActionLink", label: "Action Button Link", type: "link", value: "/lms/courses" },
        },
      },
    },
  },
  "enrolled-courses": {
    pageKey: "enrolled-courses",
    pageTitle: "Enrolled Courses",
    route: "/lms/courses",
    sections: {
      header: {
        id: "header",
        name: "Curriculum Portal Header",
        description: "Title for student's enrolled courses and course application queue",
        fields: {
          heading: { id: "heading", label: "Headline", type: "text", value: "Your Enrolled Programs" },
          subheading: {
            id: "subheading",
            label: "Subheading",
            type: "textarea",
            value: "Approved courses unlock on-demand video lectures, curated study notes, and articulation drills.",
          },
        },
      },
    },
  },
  terms: {
    pageKey: "terms",
    pageTitle: "Terms & Conditions",
    route: "/pricing?tab=terms#terms-conditions",
    sections: {
      header: {
        id: "header",
        name: "Terms Header",
        description: "Introductory header for institutional terms and conditions",
        fields: {
          badgeText: { id: "badgeText", label: "Badge Label", type: "text", value: "Institutional Agreement" },
          pageHeading: { id: "pageHeading", label: "Heading", type: "text", value: "Course Terms & Conditions" },
          subheading: {
            id: "subheading",
            label: "Subheading",
            type: "textarea",
            value: "Institutional guidelines, academic access policies, and student governance regulations.",
          },
        },
      },
      terms_list: {
        id: "terms_list",
        name: "Terms & Policies Clauses",
        description: "Official clauses governing student enrollment and platform conduct",
        fields: {
          term1Title: { id: "term1Title", label: "Clause 01 Title", type: "text", value: "Individual Student License & Credentials" },
          term1Text: {
            id: "term1Text",
            label: "Clause 01 Text",
            type: "textarea",
            value: "Course access is strictly individual and non-transferable. Sharing credentials, lecture recordings, or course notes with third parties violates institutional policy and results in immediate access revocation without refund.",
          },
          term2Title: { id: "term2Title", label: "Clause 02 Title", type: "text", value: "Verification & Course Unlocking" },
          term2Text: {
            id: "term2Text",
            label: "Clause 02 Text",
            type: "textarea",
            value: "Email verification confirms your student account. Course material unlocking is executed individually by academic administration upon receipt verification, ensuring structured progress control.",
          },
          term3Title: { id: "term3Title", label: "Clause 03 Title", type: "text", value: "Certification Standards" },
          term3Text: {
            id: "term3Text",
            label: "Clause 03 Text",
            type: "textarea",
            value: "Official certificates of completion are issued only when a student achieves a minimum 80% completion metric on course modules and completes the practical capstone assignment or oral defense seminar.",
          },
          term4Title: { id: "term4Title", label: "Clause 04 Title", type: "text", value: "Refund Policy" },
          term4Text: {
            id: "term4Text",
            label: "Clause 04 Text",
            type: "textarea",
            value: "Due to the proprietary nature of our curated PDFs and recorded masterclasses, enrollment fees are non-refundable once portal credentials and curriculum materials have been accessed.",
          },
        },
      },
      governance: {
        id: "governance",
        name: "Governance Footer",
        description: "Institutional governance code and action button",
        fields: {
          governanceCode: { id: "governanceCode", label: "Governance Reference Code", type: "text", value: "Governance Code: SPK-TRM-2026" },
          registerButtonText: { id: "registerButtonText", label: "Button Label", type: "text", value: "Register" },
        },
      },
    },
  },
};
