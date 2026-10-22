/**
 * SpeakUp LMS — Unified Course Data Structure
 * Shared across:
 * 1. Public Courses page (/courses)
 * 2. Course Pricing page (/pricing)
 * 3. Course Outline page (/course-outline)
 * 4. Student LMS Enrolled Courses page (/lms/courses)
 * 5. Student LMS Dashboard course cards (/lms/dashboard)
 */
import initialCentralCourses from "./central-courses.json";

export interface UnifiedTopic {
  title: string;
  details: string;
  duration?: string;
}

export interface UnifiedModule {
  number: string;
  title: string;
  duration: string;
  description: string;
  topics: UnifiedTopic[];
}

export interface CentralCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  price_usd?: number;
  availability: "available" | "upcoming";
  duration_weeks: number;
  status: "draft" | "published";
  level?: string;
  image?: string;
  created_at: string;
  updated_at: string;
}

export interface UnifiedCourseRecord {
  id: string;
  slug: string;
  title: string;
  badge: "Available" | "Upcoming";
  description: string;
  image: string;
  duration: string;
  level: string;
  isPublished: boolean;
  price?: number;
  duration_weeks?: number;
  availability?: "available" | "upcoming";
  status?: "draft" | "published";
  pricing: {
    usd: number;
    pkr: number;
    features: string[];
    featured?: boolean;
  };
  outline: {
    overview: string;
    levelDescription: string;
    modules: UnifiedModule[];
  };
}

export const CANONICAL_COURSES: UnifiedCourseRecord[] = [
  {
    id: "grammar-a1",
    slug: "grammar-a1",
    title: "English Grammar Mastery — A1",
    badge: "Available",
    description:
      "Master the foundational structures of spoken and written English. Perfect for establishing an authoritative communicative foundation with structural confidence.",
    image:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
    duration: "6 Weeks",
    level: "Foundational Syntax",
    isPublished: true,
    pricing: {
      usd: 15,
      pkr: 4200,
      featured: false,
      features: [
        "Complete 4-Module video masterclasses",
        "Curated lecture study notes PDF",
        "Interactive sentence structure drills",
        "Official course completion certificate",
      ],
    },
    outline: {
      overview:
        "Designed to instill foundational grammatical precision, eliminate basic syntax confusion, and establish effortless spoken clarity.",
      levelDescription: "Foundational Syntax • 6 Weeks",
      modules: [
        {
          number: "01",
          title: "Foundational Syntax & Word Classification",
          duration: "Weeks 1–2",
          description: "Deconstructing sentence architecture, subject-verb concord, and primary predicate alignment.",
          topics: [
            { title: "01. Parts of Speech & Agreement", details: "Core principles of subject-verb agreement across formal executive contexts.", duration: "45 mins" },
            { title: "02. Present & Past Tense Nuances", details: "Avoiding tense slippage in project reporting and retrospective narratives.", duration: "50 mins" },
            { title: "03. Direct & Indirect Objects in Action", details: "Structuring transitive sentences for direct and authoritative clarity.", duration: "45 mins" },
          ],
        },
        {
          number: "02",
          title: "Sentence Architecture & Spoken Cadence",
          duration: "Weeks 3–4",
          description: "Mastering complex clause subordination, eliminating hesitation markers, and building rhythmic cadence.",
          topics: [
            { title: "04. Speaking With Confidence & Verbal Cadence", details: "Anchor pauses and respiratory pacing during spoken formal English.", duration: "55 mins" },
            { title: "05. Subordinate Clauses & Analytical Logic", details: "Joining causal and conditional clauses without run-on sentences.", duration: "50 mins" },
            { title: "06. Executive Prepositional Phrases", details: "Eliminating prepositional ambiguity in contractual and corporate dialogue.", duration: "45 mins" },
          ],
        },
        {
          number: "03",
          title: "Complex Rhetoric & Discourse Markers",
          duration: "Week 5",
          description: "Connecting ideas with transitional rhetoric, formal discourse signposts, and diplomatic qualifiers.",
          topics: [
            { title: "07. Transitional Signposts in Spoken English", details: "Using 'Furthermore', 'Consequently', and 'In summary' naturally.", duration: "45 mins" },
            { title: "08. Modals of Certainty and Diplomatic Politeness", details: "Calibrating firmness and courtesy in executive decision making.", duration: "50 mins" },
          ],
        },
        {
          number: "04",
          title: "Oral Defense & Capstone Evaluation",
          duration: "Week 6",
          description: "Comprehensive practical assessment, live oral defense with mentors, and diagnostic graduation feedback.",
          topics: [
            { title: "09. Oral Defense Seminar", details: "Defending a 10-minute executive briefing without notes or filler words.", duration: "60 mins" },
          ],
        },
      ],
    },
  },
  {
    id: "speak-30",
    slug: "speak-30",
    title: "Speak in 30 Days — Fluency & Cadence",
    badge: "Available",
    description:
      "Intensive verbal articulation, eliminating conversational pauses and filler words, and training acoustic cadence for high-stakes meetings and formal defenses.",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    duration: "4 Weeks",
    level: "Accelerated Fluency",
    isPublished: true,
    pricing: {
      usd: 25,
      pkr: 7000,
      featured: true,
      features: [
        "Intensive verbal articulation curriculum",
        "Cadence anchor & pause training",
        "Colloquial & executive idiom breakdowns",
        "Oral assessment feedback with mentor",
        "Verified credential with unique ID",
      ],
    },
    outline: {
      overview:
        "Fast-track verbal articulation, rhythm cadence, and confident executive conversational rhetoric.",
      levelDescription: "Accelerated Fluency • 4 Weeks",
      modules: [
        {
          number: "01",
          title: "Phonetic Precision & Breath Mechanics",
          duration: "Week 1",
          description: "Diaphragmatic breath support, vocal projection, and syllable stress eradication.",
          topics: [
            { title: "01. Breath Anchors & Voice Placement", details: "Grounding pitch to project executive gravitas without strain.", duration: "40 mins" },
            { title: "02. Vowel Elongation & Consonant Punch", details: "Crisp diction across fast-paced dialogue.", duration: "45 mins" },
          ],
        },
        {
          number: "02",
          title: "Cadence & Pause Control",
          duration: "Weeks 2–3",
          description: "Eliminating filler vocalizations (um, uh) through intentional strategic silences.",
          topics: [
            { title: "03. The Power of Tactical Silence", details: "Using 2-second strategic pauses to hold boardroom attention.", duration: "50 mins" },
            { title: "04. Spontaneous Narrative Structuring", details: "Answering complex impromptu questions with concise clarity.", duration: "55 mins" },
          ],
        },
        {
          number: "03",
          title: "Final Capstone Evaluation",
          duration: "Week 4",
          description: "Live keynote speaking simulation and individual articulation assessment report.",
          topics: [
            { title: "05. Live Executive Simulation", details: "Delivering a persuasive briefing under simulated pressure.", duration: "60 mins" },
          ],
        },
      ],
    },
  },
  {
    id: "strategic-negotiation",
    slug: "strategic-negotiation",
    title: "Strategic Negotiation & Persuasion",
    badge: "Available",
    description:
      "Advanced linguistic tactics for cross-border transactions, executive conflict resolution, and steering high-stakes corporate discourse.",
    image:
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80",
    duration: "8 Weeks",
    level: "Executive Rhetoric",
    isPublished: true,
    pricing: {
      usd: 40,
      pkr: 11000,
      featured: false,
      features: [
        "Boardroom conflict & persuasion strategies",
        "Cross-border executive discourse",
        "Countering objections & pressure tactics",
        "Live cohort defense session invitation",
        "Direct email advisory with Sir Mudassir",
      ],
    },
    outline: {
      overview:
        "High-stakes communication, persuasive argument structures, and commanding boardroom authority.",
      levelDescription: "Executive Rhetoric • 8 Weeks",
      modules: [
        {
          number: "01",
          title: "Framing & Psychological Anchoring",
          duration: "Weeks 1–3",
          description: "Linguistic anchoring, value proposition framing, and opening negotiation gambits.",
          topics: [
            { title: "01. Opening Gambits & Position Setting", details: "Establishing high expectations with courteous deference.", duration: "50 mins" },
            { title: "02. Linguistic Framing Techniques", details: "Reframing objections into mutual win conditions.", duration: "55 mins" },
          ],
        },
        {
          number: "02",
          title: "Tactical Concessions & Stalemate Resolution",
          duration: "Weeks 4–6",
          description: "Linguistic formulas for trading concessions without diminishing core project equity.",
          topics: [
            { title: "03. If-Then Conditional Concessions", details: "Locking commitments with structured trade-off formulas.", duration: "60 mins" },
            { title: "04. Defusing High-Pressure Demands", details: "De-escalating aggressive tactics diplomatically.", duration: "50 mins" },
          ],
        },
        {
          number: "03",
          title: "Closing & Contractual Accord",
          duration: "Weeks 7–8",
          description: "Solidifying consensus, sealing terms, and executive handshake etiquette.",
          topics: [
            { title: "05. Consensus Language & Closing", details: "Summarizing complex terms with shared ownership.", duration: "60 mins" },
          ],
        },
      ],
    },
  },
  {
    id: "professional-mastery",
    slug: "professional-mastery",
    title: "Professional Executive Series",
    badge: "Available",
    description:
      "Comprehensive curriculum integrating formal rhetoric, board reporting, articulate spontaneous replies, and boardroom influence.",
    image:
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
    duration: "10 Weeks",
    level: "Advanced Rhetoric",
    isPublished: true,
    pricing: {
      usd: 50,
      pkr: 14000,
      featured: false,
      features: [
        "Comprehensive 10-week executive syllabus",
        "Weekly 1-on-1 mentor strategy audit",
        "Executive presentation slide deck reviews",
        "Institutional letter of recommendation",
      ],
    },
    outline: {
      overview:
        "Comprehensive curriculum integrating formal rhetoric, board reporting, and boardroom influence.",
      levelDescription: "Advanced Rhetoric • 10 Weeks",
      modules: [
        {
          number: "01",
          title: "Boardroom Reporting & Conciseness",
          duration: "Weeks 1–4",
          description: "Executive summaries, bottom-line upfront (BLUF) techniques, and managing executive Q&A.",
          topics: [
            { title: "01. BLUF Communication Structure", details: "Delivering crucial outcomes within the first 60 seconds.", duration: "50 mins" },
            { title: "02. Visual Data Commentary", details: "Articulating complex graphs and financial models clearly.", duration: "55 mins" },
          ],
        },
        {
          number: "02",
          title: "Crisis Communication & Spokesmanship",
          duration: "Weeks 5–8",
          description: "Communicating through organizational uncertainty, press holding statements, and internal morale.",
          topics: [
            { title: "03. Crisis Framing & Calmness", details: "Maintaining acoustic steadiness during organizational turbulence.", duration: "60 mins" },
          ],
        },
        {
          number: "03",
          title: "Executive Capstone Defense",
          duration: "Weeks 9–10",
          description: "Simulated annual shareholder address and panel interrogation defense.",
          topics: [
            { title: "04. Annual Address Simulation", details: "Delivering an inspiring 20-minute address to a mock board.", duration: "65 mins" },
          ],
        },
      ],
    },
  },
  {
    id: "global-leadership",
    slug: "global-leadership",
    title: "Global Leadership Intensive",
    badge: "Upcoming",
    description:
      "Immersive capstone cohort program focused on keynote address delivery, speech crafting, and international diplomacy communication.",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    duration: "12 Weeks",
    level: "Elite Capstone",
    isPublished: true,
    pricing: {
      usd: 75,
      pkr: 21000,
      featured: false,
      features: [
        "Direct keynote speechwriting mentorship",
        "Teleprompter & stage movement training",
        "International diplomacy protocol briefing",
        "Lifetime alumni society fellowship",
      ],
    },
    outline: {
      overview:
        "Immersive capstone cohort program focused on keynote address delivery, speech crafting, and international diplomacy.",
      levelDescription: "Elite Capstone • 12 Weeks",
      modules: [
        {
          number: "01",
          title: "The Architecture of Great Speeches",
          duration: "Weeks 1–4",
          description: "Rhetorical tropes (anaphora, tricolon, antithesis) and crafting memorable soundbites.",
          topics: [
            { title: "01. Classical Rhetorical Devices", details: "Elevating speech rhythm with cadence and repetition.", duration: "60 mins" },
          ],
        },
        {
          number: "02",
          title: "Stage Command & Presence",
          duration: "Weeks 5–8",
          description: "Physical presence, deliberate movement, and managing large auditorium acoustics.",
          topics: [
            { title: "02. Auditorium Voice Placement", details: "Filling high-capacity spaces without vocal strain.", duration: "60 mins" },
          ],
        },
        {
          number: "03",
          title: "Diplomatic Capstone Address",
          duration: "Weeks 9–12",
          description: "Full-scale recorded keynote delivery and global fellowship induction.",
          topics: [
            { title: "03. Keynote Graduation Showcase", details: "Delivering a 15-minute capstone address to faculty.", duration: "75 mins" },
          ],
        },
      ],
    },
  },
];

/**
 * Central Course Accessor for all courses (drafts and published).
 * Used by Admin panel and centralized persistence.
 */
export function getAllCentralCourses(): CentralCourse[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("speakup_central_courses");
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}
  }
  return initialCentralCourses as CentralCourse[];
}

/**
 * Accessor for unified course records.
 * Seamlessly merges canonical definitions with centralized dynamic course records.
 * Strictly derives from central-courses store: when 0 courses are published, returns [].
 */
export function getUnifiedCourses(): UnifiedCourseRecord[] {
  const centralList = getAllCentralCourses();
  const publishedCentral = centralList.filter(
    (c) => c.status === "published" && !/executive\s*speech/i.test(c.title)
  );

  if (publishedCentral.length === 0) {
    return [];
  }

  const canonicalMap = new Map(CANONICAL_COURSES.map((c) => [c.id.toLowerCase(), c]));

  return publishedCentral.map((central) => {
    const canonical = canonicalMap.get(central.id.toLowerCase()) || canonicalMap.get(central.slug.toLowerCase());
    const mappedDuration = `${central.duration_weeks} Weeks`;
    const mappedBadge: "Available" | "Upcoming" = central.availability === "upcoming" ? "Upcoming" : "Available";
    const mappedUsd =
      central.price_usd !== undefined && central.price_usd !== null
        ? central.price_usd
        : (canonical?.pricing?.usd ?? 0);

    return {
      id: central.id,
      slug: central.slug,
      title: central.title,
      badge: mappedBadge,
      description: central.description,
      image: central.image || canonical?.image || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
      duration: mappedDuration,
      level: central.level || canonical?.level || "A1",
      isPublished: true,
      price: central.price,
      duration_weeks: central.duration_weeks,
      availability: (central.availability === "upcoming" ? "upcoming" : "available") as "available" | "upcoming",
      status: central.status,
      pricing: {
        usd: mappedUsd,
        pkr: central.price,
        featured: canonical?.pricing?.featured || false,
        features: canonical?.pricing?.features || [
          `Comprehensive ${central.duration_weeks}-Week executive training`,
          "Curated masterclass lecture notes & resource PDFs",
          "Interactive practical drills and live mentor feedback",
          "Official verified certificate of completion",
        ],
      },
      outline: canonical?.outline || {
        overview: central.description,
        levelDescription: `${central.level || "Executive Series"} • ${mappedDuration}`,
        modules: [
          {
            number: "01",
            title: "Foundations & Executive Framework",
            duration: `Weeks 1–${Math.max(1, Math.floor(central.duration_weeks / 2))}`,
            description: "Core conceptual models and communicative frameworks.",
            topics: [
              { title: "01. Introduction & Strategic Objectives", details: "Core competencies and personal trajectory diagnostic.", duration: "45 mins" },
            ],
          },
          {
            number: "02",
            title: "Applied Mastery & Capstone Evaluation",
            duration: `Weeks ${Math.max(2, Math.floor(central.duration_weeks / 2) + 1)}–${central.duration_weeks}`,
            description: "Practical simulations, applied defenses, and final assessment.",
            topics: [
              { title: "02. Capstone Assessment Defense", details: "Executive panel defense and credential verification.", duration: "60 mins" },
            ],
          },
        ],
      },
    };
  });
}

export function getUnifiedCourseById(idOrSlug: string): UnifiedCourseRecord | undefined {
  const norm = idOrSlug.toLowerCase().trim();
  const all = getUnifiedCourses();
  return all.find(
    (c) => c.id.toLowerCase() === norm || c.slug.toLowerCase() === norm
  );
}

/**
 * Maps unified course records to student enrollment views,
 * strictly displaying courses enrolled for the current student.
 */
export function getStudentEnrolledCourses(
  enrolledCourseIds: string[],
  progressMap?: Record<string, { progressPercentage: number; lastAccessedAt?: string; completedLessonsCount?: number; totalLessonsCount?: number }>
): Array<{
  id: string;
  title: string;
  description: string;
  image: string;
  duration: string;
  level: string;
  progress: number;
  status: "In Progress" | "Completed";
  lastAccessed: string;
}> {
  // Strictly display genuine enrolled courses. When student has no enrollments, return empty list.
  const effectiveIds = enrolledCourseIds;

  return effectiveIds
    .map((id) => {
      const course = getUnifiedCourseById(id);
      if (!course) return null;

      const prog = progressMap?.[id] || progressMap?.[course.id] || { progressPercentage: 0 };
      const pct = prog.progressPercentage ?? 0;

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        image: course.image,
        duration: course.duration,
        level: course.level,
        progress: pct,
        status: (pct >= 100 ? "Completed" : "In Progress") as "In Progress" | "Completed",
        lastAccessed: prog.lastAccessedAt ? new Date(prog.lastAccessedAt).toLocaleDateString() : "Recently",
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
}
