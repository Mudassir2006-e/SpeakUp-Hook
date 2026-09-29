"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import SpeakUpVideoPlayer from "@/components/SpeakUpVideoPlayer";
import LmsProfileDropdown from "@/components/LmsProfileDropdown";

type LearningTab = "videos" | "notes" | "practice";

interface Lesson {
  id: string;
  moduleId: string;
  moduleTitle: string;
  number: string;
  title: string;
  description: string;
  videoId: string;
  defaultNotes: string;
  defaultPractice: string;
}

const LESSONS: Lesson[] = [
  // Module 1 (Completed)
  {
    id: "l01",
    moduleId: "mod1",
    moduleTitle: "Module 1: Foundational Syntax",
    number: "01",
    title: "Parts of Speech & Grammatical Agreement",
    description:
      "Understand subject-verb agreement, pronoun references, and foundational sentence structure to build grammatically rock-solid sentences.",
    videoId: "iCvmsMzlF7o",
    defaultNotes: `SpeakUp Masterclass — Lesson 01: Parts of Speech & Agreement

Core Syntax Principle:
Every declarative sentence requires structural alignment between the agent (subject) and the active predicate verb. In formal academic discourse, compound subjects joined by 'neither/nor' take the number of the closest subject.

Key Cadence Principles from this Masterclass:
1. Subject-Verb Congruence: Always locate the head noun before selecting singular or plural verb forms.
2. Collective Nouns: Treat collective nouns as singular in standard formal academic English unless individual members are acting independently.
3. Prepositional Interference: Do not let intervening prepositional phrases alter the number of the verb.`,
    defaultPractice: `Instructor Practice Directives — Lesson 01: Parts of Speech & Agreement

Pedagogical Objective:
Examine how compound subjects and intervening prepositional phrases create grammatical incongruity in spontaneous speech. Practice isolating the true head noun before assigning singular or plural verb inflection.

Instructional Exercise 1:
Analyze the sentence: "Neither the principal investigator nor the associated laboratory analysts (is/are) authorized to alter the trial parameters without prior institutional clearance." Note that 'analysts' determines the plural verb form 'are' due to the proximity principle in formal English.

Instructional Exercise 2:
Rephrase this construction aloud three times using downward terminal pitch inflection to ensure conclusive vocal finality.`,
  },
  {
    id: "l02",
    moduleId: "mod1",
    moduleTitle: "Module 1: Foundational Syntax",
    number: "02",
    title: "Present Tense Nuances & Auxiliary Verbs",
    description:
      "Differentiate between simple present, present continuous, and present perfect aspects with academic precision.",
    videoId: "iCvmsMzlF7o",
    defaultNotes: `SpeakUp Masterclass — Lesson 02: Present Tense Nuances

Temporal Scope Principle:
Present simple establishes timeless academic truths and persistent empirical findings, whereas present perfect bridges past discovery with ongoing significance.

Key Cadence Principles from this Masterclass:
1. Present Simple for Methodological Truths: Use simple present for general facts and constant theories.
2. Present Perfect for Cumulative Literature: Use present perfect ('Researchers have demonstrated...') when the timeline continues to affect the present.
3. Modal Auxiliaries: Deploy 'shall', 'may', and 'must' with careful calibrated degrees of necessity.`,
    defaultPractice: `Instructor Practice Directives — Lesson 02: Present Tense Nuances

Pedagogical Objective:
Distinguish between empirical observations that require continuous aspect versus methodological principles that demand simple present indicative verbs.

Instructional Exercise:
Formulate two contrasting declarations regarding institutional performance: one indicating an enduring statutory mandate using present simple, and a second highlighting an ongoing 10-year trajectory using present perfect continuous.`,
  },
  {
    id: "l03",
    moduleId: "mod1",
    moduleTitle: "Module 1: Foundational Syntax",
    number: "03",
    title: "Direct & Indirect Objects in Formal Syntax",
    description:
      "Master transitivity, ditransitive verbs, and objective case assignment in formal executive statements.",
    videoId: "iCvmsMzlF7o",
    defaultNotes: `SpeakUp Masterclass — Lesson 03: Direct & Indirect Objects

Object Architecture:
Direct objects complete the verb's transitive arc, whereas indirect objects denote the recipient or beneficiary. Positioning indirect objects before direct objects yields greater acoustic conciseness.

Key Cadence Principles from this Masterclass:
1. Dative Shift: Recognize when moving the recipient reduces unnecessary prepositional weight.
2. Case Integrity: Pronouns governed by transitive verbs must strictly retain objective case ('whom', 'them', 'us').
3. Phrasal Clarity: Place heavy noun clauses as direct objects following the verb rather than embedding them awkwardly.`,
    defaultPractice: `Instructor Practice Directives — Lesson 03: Object Architecture

Pedagogical Objective:
Eliminate prepositional bloat by utilizing the dative shift in administrative directives.

Instructional Exercise:
Compare "The committee delivered the finalized audit findings to the executive board" with "The committee delivered the executive board the finalized audit findings." Notice how the latter version centers the recipient directly and accelerates syntactic delivery.`,
  },

  // Module 2 (Active)
  {
    id: "l04",
    moduleId: "mod2",
    moduleTitle: "Module 2: Sentence Architecture",
    number: "04",
    title: "Sentence Architecture",
    description:
      "Master foundational clause rhythm, eliminate hesitation markers in spoken English, and build natural acoustic cadence for formal meetings and high-stakes executive defenses.",
    videoId: "iCvmsMzlF7o",
    defaultNotes: `SpeakUp Academic Masterclass — Lecture Notes & Cadence Principles

Verbal cadence in elite academic presentation is not defined by rapid delivery; rather, it is anchored in the intentional timing of subordinate pauses. An orator establishes dominance and clarity by anchoring key predicate verbs with a controlled breath drop.

Key Cadence Principles from this Masterclass:

Principle 1: The Clause Anchor
Never rush compound conjunctions ('whereas', 'nevertheless'). Allow an intentional 0.4-second acoustic breath pause to signal that a structured contrast is approaching.

Principle 2: Vocal Pitch Modulation
High pitch at sentence ends projects insecurity or seeking validation (uptalk). Conclude declarative statements on a grounded downward pitch tone to communicate certainty and scholarly command.

Principle 3: The Closing Cadence
In the final sentence of any proposal or defense, decelerate tempo by 15%, articulate each syllable crisply, and conclude with a definitive downward inflection.`,
    defaultPractice: `Instructor Practice Directives — Module 2, Lesson 4: Sentence Architecture

Pedagogical Objective & Core Principle:
In this masterclass unit, learners focus on sentence architecture: constructing authoritative subordinate clauses and eliminating involuntary vocal hesitations. Cadence is anchored in the intentional timing of subordinate pauses before adversative conjunctions.

Verbal Articulation Exercise:
Review the following model sentence from the lecture masterclass: "Whereas initial forecasts anticipated severe operational constraints; our executive team has consolidated supply pathways, ensuring uninterrupted delivery." Practice reading this declaration aloud with a controlled breath drop precisely at the semicolon pause marker.

Cadence Drill Steps:
1. Deliver the introductory concessive clause ("Whereas initial forecasts...") at steady conversational cadence.
2. Insert an intentional 0.4-second acoustic breath drop immediately preceding the main clause.
3. Pronounce the head predicate verb ("consolidated") with firm acoustic resonance and conclude with a falling downward inflection.

Mentor Evaluation Guidelines:
Evaluate whether your spoken rhythm maintains consistent vocal stability throughout the subordinate-to-main clause transition without vocal pitch uptalk.`,
  },
  {
    id: "l05",
    moduleId: "mod2",
    moduleTitle: "Module 2: Sentence Architecture",
    number: "05",
    title: "Subordinate Clauses & Logical Cohesion",
    description:
      "Construct multi-tiered sentences using concessive and causal dependent clauses to project authority.",
    videoId: "iCvmsMzlF7o",
    defaultNotes: `SpeakUp Masterclass — Lesson 05: Subordinate Clauses & Logic

Hierarchical Subordination:
Subordination forces the listener to evaluate the primary thesis as dominant over contextual qualifiers. Lead with concessive clauses ('Although...', 'Even if...') to anticipate counter-arguments before presenting your central premise.

Key Cadence Principles from this Masterclass:
1. Fronted Subordinate Clauses: Use a comma and pause when the dependent clause begins the sentence.
2. Avoiding Dangling Modifiers: Ensure the subject of the main clause directly performs any action described in introductory participial phrases.
3. Logical Connectors: Deploy 'hence', 'consequently', and 'furthermore' with appropriate semicolon pauses.`,
    defaultPractice: `Instructor Practice Directives — Lesson 05: Subordinate Clauses & Logic

Pedagogical Objective:
Construct authoritative complex sentences fronted with concessive clauses to frame objections before presenting the core recommendation.

Instructional Exercise:
Draft a two-part executive statement opening with 'Although' or 'Even though', balancing secondary constraints against primary strategic outcomes.`,
  },
  {
    id: "l06",
    moduleId: "mod2",
    moduleTitle: "Module 2: Sentence Architecture",
    number: "06",
    title: "Executive Prepositional Phrases",
    description:
      "Learn to avoid prepositional stacking while deploying authoritative idioms that sharpen executive presence.",
    videoId: "iCvmsMzlF7o",
    defaultNotes: `SpeakUp Masterclass — Lesson 06: Prepositional Mastery

Concise Articulation:
Excessive strings of prepositions ('of the...', 'for the...', 'in the...') create cognitive drag. Replace multi-word prepositional phrases with active verbs or possessive compounds.

Key Cadence Principles from this Masterclass:
1. Limit Chains: Avoid having more than two consecutive prepositional phrases attached to a single noun.
2. Precise Idiomatic Prepositions: Master subtle distinctions ('comply with', 'concur in', 'concur with').
3. Strategic Fronting: Fronting prepositional phrases of time or location sets immediate acoustic framing.`,
    defaultPractice: `Instructor Practice Directives — Lesson 06: Prepositional Mastery

Pedagogical Objective:
Deconstruct bloated prepositional chains to increase spoken velocity and cognitive retention.

Instructional Exercise:
Locate any document draft containing three consecutive 'of' phrases and rewrite it using possessive structures or active transitive verbs.`,
  },

  // Module 3 (Locked)
  {
    id: "l07",
    moduleId: "mod3",
    moduleTitle: "Module 3: Complex Rhetoric",
    number: "07",
    title: "Rhetorical Devices & Cadence Anchors",
    description:
      "Harness anaphora, epistrophe, and tricolon structures to create memorable oratorical cadences.",
    videoId: "iCvmsMzlF7o",
    defaultNotes: `SpeakUp Masterclass — Lesson 07: Rhetorical Cadence

Classical Rhetoric in Spoken English:
Tricolon (rule of three) coupled with isocolon (parallel rhythm) produces instant emotional resonance and perceived authority in spoken arguments.`,
    defaultPractice: `Instructor Practice Directives — Lesson 07: Rhetorical Devices

Pedagogical Objective:
Utilize parallel structures and tricolon rhythm in formal committee presentations.`,
  },
  {
    id: "l08",
    moduleId: "mod3",
    moduleTitle: "Module 3: Complex Rhetoric",
    number: "08",
    title: "Strategic Impromptu Defense",
    description:
      "Tactics for fielding adversarial cross-examinations and difficult questions with steady vocal composure.",
    videoId: "iCvmsMzlF7o",
    defaultNotes: `SpeakUp Masterclass — Lesson 08: Strategic Impromptu Defense

Adversarial Defense Framework:
When confronted with challenging objections:
1. Acknowledge the premise without conceding ground.
2. Reframe the scope to empirical benchmarks.
3. Deliver the definitive answer on a falling pitch terminal cadence.`,
    defaultPractice: `Instructor Practice Directives — Lesson 08: Impromptu Defense

Pedagogical Objective:
Structure 30-second impromptu responses using the Acknowledge-Reframe-Conclude paradigm.`,
  },

  // Module 4 (Locked Capstone)
  {
    id: "l09",
    moduleId: "mod4",
    moduleTitle: "Module 4: Capstone Defense",
    number: "09",
    title: "Capstone Oral Defense & Final Evaluation",
    description:
      "Comprehensive synthesis presentation evaluated on verbal cadence, syntactic authority, and composure.",
    videoId: "iCvmsMzlF7o",
    defaultNotes: `SpeakUp Masterclass — Lesson 09: Capstone Oral Defense

Oral Defense Protocol:
Deliver a continuous five-minute executive brief synthesizing all prior modules.`,
    defaultPractice: `Instructor Practice Directives — Lesson 09: Capstone Defense

Pedagogical Objective:
Synthesize all syntactic cadence markers in an uninterrupted 5-minute oral defense.`,
  },
];

export default function CoursePlayerPage() {
  const [activeLessonId, setActiveLessonId] = useState("l04");
  const [activeTab, setActiveTab] = useState<LearningTab>("videos");
  const [copied, setCopied] = useState(false);
  const [copiedPractice, setCopiedPractice] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(true);

  // Lesson completion state (persisted)
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(["l01", "l02", "l03"]);

  // Lecture notes state (per lesson, editable & auto-persisted)
  const [notesContent, setNotesContent] = useState<string>("");

  // Instructor practice material state (persisted per lesson)
  const [practiceContent, setPracticeContent] = useState<string>("");

  // Collapsible modules state
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    mod1: true,
    mod2: true,
    mod3: false,
    mod4: false,
  });

  // Locked module notification toast
  const [lockedToast, setLockedToast] = useState<string | null>(null);
  const [certNotification, setCertNotification] = useState<string | null>(null);

  // Current active lesson object
  const currentLesson = LESSONS.find((l) => l.id === activeLessonId) || LESSONS[3];

  // Load completed lessons from localStorage on mount
  useEffect(() => {
    const savedCompleted = localStorage.getItem("speakup_completed_lessons");
    if (savedCompleted) {
      try {
        const parsed = JSON.parse(savedCompleted);
        if (Array.isArray(parsed)) {
          setCompletedLessonIds(parsed);
        }
      } catch (err) {
        console.error("Failed to parse completed lessons", err);
      }
    }
  }, []);

  // Sync lecture notes and practice material when active lesson changes
  useEffect(() => {
    const notesStorageKey = `speakup_notes_${activeLessonId}`;
    const savedNote = localStorage.getItem(notesStorageKey);
    if (savedNote !== null) {
      setNotesContent(savedNote);
    } else {
      setNotesContent(currentLesson.defaultNotes);
    }

    const practiceStorageKey = `speakup_practice_${activeLessonId}`;
    const savedPractice = localStorage.getItem(practiceStorageKey);
    if (savedPractice !== null) {
      setPracticeContent(savedPractice);
    } else {
      setPracticeContent(currentLesson.defaultPractice);
    }
  }, [activeLessonId, currentLesson.defaultNotes, currentLesson.defaultPractice]);

  const toggleModule = (key: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isCurrentCompleted = completedLessonIds.includes(activeLessonId);

  const toggleLessonCompletion = (lessonId: string) => {
    setCompletedLessonIds((prev) => {
      let updated: string[];
      if (prev.includes(lessonId)) {
        updated = prev.filter((id) => id !== lessonId);
      } else {
        updated = [...prev, lessonId];
      }
      localStorage.setItem("speakup_completed_lessons", JSON.stringify(updated));
      return updated;
    });
  };

  const handleNextLesson = () => {
    const currentIndex = LESSONS.findIndex((l) => l.id === activeLessonId);
    if (currentIndex < LESSONS.length - 1) {
      const nextLesson = LESSONS[currentIndex + 1];
      if (nextLesson.moduleId === "mod3" || nextLesson.moduleId === "mod4") {
        setLockedToast("Next module is locked until Module 2 is completed.");
        setTimeout(() => setLockedToast(null), 3000);
        return;
      }
      setActiveLessonId(nextLesson.id);
      setExpandedModules((prev) => ({ ...prev, [nextLesson.moduleId]: true }));
    }
  };

  const handlePrevLesson = () => {
    const currentIndex = LESSONS.findIndex((l) => l.id === activeLessonId);
    if (currentIndex > 0) {
      const prevLesson = LESSONS[currentIndex - 1];
      setActiveLessonId(prevLesson.id);
      setExpandedModules((prev) => ({ ...prev, [prevLesson.moduleId]: true }));
    }
  };

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(notesContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPractice = () => {
    if (practiceContent) {
      navigator.clipboard.writeText(practiceContent);
      setCopiedPractice(true);
      setTimeout(() => setCopiedPractice(false), 2000);
    }
  };

  const handleCertificateClick = () => {
    setCertNotification(
      "Your certificate is locked. Complete all modules in English Grammar Mastery — A1 to unlock your verified credential."
    );
    setTimeout(() => setCertNotification(null), 6000);
  };

  // Group lessons by module with explicit locked status
  const modules = [
    {
      id: "mod1",
      title: "Module 1: Foundational Syntax",
      isLocked: false,
      lessons: LESSONS.filter((l) => l.moduleId === "mod1"),
    },
    {
      id: "mod2",
      title: "Module 2: Sentence Architecture",
      isLocked: false,
      lessons: LESSONS.filter((l) => l.moduleId === "mod2"),
    },
    {
      id: "mod3",
      title: "Module 3: Complex Rhetoric",
      isLocked: true,
      lessons: LESSONS.filter((l) => l.moduleId === "mod3"),
    },
    {
      id: "mod4",
      title: "Module 4: Capstone Defense",
      isLocked: true,
      lessons: LESSONS.filter((l) => l.moduleId === "mod4"),
    },
  ];

  const totalLessons = LESSONS.length;
  const completedCount = completedLessonIds.length;
  const progressPercent = Math.min(100, Math.round((completedCount / totalLessons) * 100));

  return (
    <div className="max-w-[1480px] mx-auto space-y-6 pt-2 pb-10">
      {/* Top Header Section with Page Name on Left and Circular Profile Picture on Right */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 pt-2 border-b border-[var(--surface-border)]">
        <div className="space-y-1">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
            Learning Player
          </h1>
          <p className="font-serif text-base sm:text-lg text-[var(--text-muted)]">
            Active masterclass curriculum, lecture cadence notes, and interactive practice.
          </p>
        </div>

        {/* Top-Right Profile Display: Circular Profile Picture matching Dashboard */}
        <div className="shrink-0 self-start sm:self-center">
          <LmsProfileDropdown />
        </div>
      </section>

      {/* Main Learning Viewport (Curriculum Sidebar + Central Stage) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ================= LEFT CURRICULUM SIDEBAR ================= */}
        <aside className="w-full lg:w-92 shrink-0 rounded-2xl bg-white dark:bg-[#141418]/60 border border-[var(--surface-border)] p-5 shadow-xs space-y-5">
          {/* Header & Progress */}
          <div className="pb-4 border-b border-[var(--surface-border)]/60 space-y-3">
            <h2 className="font-display text-xl font-bold text-[var(--text-main)] tracking-tight">
              English Grammar Mastery — A1
            </h2>
            <div className="space-y-1.5">
              <div className="flex justify-between font-display text-xs text-[var(--text-muted)]">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Course Progress</span>
                <span className="font-bold text-[#d4af37]">
                  {progressPercent}% Complete ({completedCount}/{totalLessons})
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#f0eae0] dark:bg-[var(--surface-border)]/40 rounded-full overflow-hidden">
                <div
                  className="bg-[#d4af37] h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Module List Accordion with Vertical Scrollbar */}
          <div className="max-h-[580px] overflow-y-auto custom-scroll pr-1 space-y-2.5 font-display text-xs">
            {modules.map((mod) => {
              const isExpanded = !!expandedModules[mod.id];
              const modCompletedCount = mod.lessons.filter((l) => completedLessonIds.includes(l.id)).length;
              const isModAllCompleted = modCompletedCount === mod.lessons.length && !mod.isLocked;
              const hasActiveLesson = mod.lessons.some((l) => l.id === activeLessonId);

              return (
                <div
                  key={mod.id}
                  className={`rounded-xl transition-all overflow-hidden ${
                    mod.isLocked
                      ? "opacity-60 border border-[var(--surface-border)]/30 bg-[#f9f5ed]/40 dark:bg-[var(--surface-low)]/10"
                      : hasActiveLesson
                      ? "border border-[#d4af37]/60 bg-[#fdfaf3] dark:bg-[#16161b]"
                      : "border border-[var(--surface-border)]/40 bg-white dark:bg-[var(--surface-low)]/15"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className="w-full p-3 flex items-center justify-between cursor-pointer text-left select-none transition-colors hover:bg-[#f9f5ed]/60 dark:hover:bg-[var(--surface-low)]/40"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className={`material-symbols-outlined text-[18px] shrink-0 ${
                          mod.isLocked
                            ? "text-[var(--text-muted)]"
                            : isModAllCompleted
                            ? "text-emerald-500"
                            : hasActiveLesson
                            ? "text-[#d4af37]"
                            : "text-[var(--text-muted)]"
                        }`}
                        style={{ fontVariationSettings: isModAllCompleted ? "'FILL' 1" : undefined }}
                      >
                        {mod.isLocked ? "lock" : isModAllCompleted ? "check_circle" : hasActiveLesson ? "play_circle" : "folder"}
                      </span>
                      <span
                        className={`font-bold truncate ${
                          mod.isLocked
                            ? "text-[var(--text-muted)]"
                            : hasActiveLesson
                            ? "text-[#d4af37]"
                            : "text-[var(--text-main)]"
                        }`}
                      >
                        {mod.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {mod.isLocked ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-border)]/30 text-[var(--text-muted)] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">lock</span>
                          <span>Locked</span>
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isModAllCompleted
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : hasActiveLesson
                              ? "bg-[#d4af37] text-[#141416]"
                              : "bg-[var(--surface-border)]/40 text-[var(--text-muted)]"
                          }`}
                        >
                          {modCompletedCount}/{mod.lessons.length}
                        </span>
                      )}
                      <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)]">
                        {isExpanded ? "expand_less" : "expand_more"}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-1.5 space-y-1">
                      {mod.lessons.map((lesson) => {
                        const isActive = lesson.id === activeLessonId;
                        const isDone = completedLessonIds.includes(lesson.id);

                        if (mod.isLocked) {
                          return (
                            <div
                              key={lesson.id}
                              onClick={() => {
                                setLockedToast(`Module is locked. Complete preceding modules to unlock.`);
                                setTimeout(() => setLockedToast(null), 3000);
                              }}
                              className="p-2.5 rounded-lg flex items-center justify-between text-[var(--text-muted)]/60 cursor-not-allowed select-none"
                              title="Locked lesson"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="material-symbols-outlined text-[16px] shrink-0 text-[var(--text-muted)]/50">
                                  lock
                                </span>
                                <span className="font-serif text-xs truncate">
                                  {lesson.number}. {lesson.title}
                                </span>
                              </div>
                              <span className="text-[10px] uppercase font-serif italic text-[var(--text-muted)]/60">
                                Locked
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={lesson.id}
                            onClick={() => setActiveLessonId(lesson.id)}
                            className={`p-2.5 rounded-lg flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                              isActive
                                ? "bg-[#d4af37]/20 border-l-3 border-[#d4af37] text-[#141416] dark:text-[#d4af37] font-bold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)]/30"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`material-symbols-outlined text-[17px] shrink-0 ${
                                  isDone
                                    ? "text-emerald-500"
                                    : isActive
                                    ? "text-[#d4af37]"
                                    : "text-[var(--text-muted)]"
                                }`}
                                style={{ fontVariationSettings: isDone ? "'FILL' 1" : undefined }}
                              >
                                {isDone ? "check_circle" : isActive ? "play_arrow" : "radio_button_unchecked"}
                              </span>
                              <span className="font-serif text-xs truncate">
                                {lesson.number}. {lesson.title}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLessonCompletion(lesson.id);
                              }}
                              className="p-1 text-[var(--text-muted)] hover:text-[#d4af37] shrink-0 cursor-pointer"
                              title={isDone ? "Mark incomplete" : "Mark completed"}
                              aria-label={isDone ? "Mark incomplete" : "Mark completed"}
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                {isDone ? "done_all" : "check"}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Course Certificate (Locked) */}
            <div
              onClick={handleCertificateClick}
              className="rounded-xl border border-[var(--surface-border)]/40 bg-white dark:bg-[var(--surface-low)]/20 p-3 flex items-center justify-between cursor-pointer hover:border-[#d4af37]/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#d4af37]">workspace_premium</span>
                <span className="font-semibold text-[var(--text-muted)]">Course Certificate</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#d4af37]">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Locked</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ================= CENTRAL LEARNING STAGE ================= */}
        <main className="flex-1 min-w-0 space-y-6 w-full">
          {/* Toast Notification for Locked Modules */}
          {lockedToast && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-display font-semibold flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px]">lock</span>
              <span>{lockedToast}</span>
            </div>
          )}

          {/* Lesson Headline: Module Subheading & Lesson Title on Left; Back to Enrolled Courses & Enroll on Right */}
          <section className="space-y-3 pb-4 border-b border-[var(--surface-border)]/50">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                {/* Module Subheading: strictly a subheading, single line without unnecessary wrapping */}
                <div className="text-xs sm:text-sm font-display uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                  {currentLesson.moduleTitle} • Lesson {currentLesson.number}
                </div>

                {/* Main Lesson Heading (Appropriately sized and prominent without dominating the page) */}
                <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--text-main)] tracking-tight leading-snug">
                  {currentLesson.title}
                </h2>
              </div>

              {/* Back to Enrolled Courses navigation */}
              <div className="shrink-0 flex items-center self-start sm:self-center">
                <Link
                  href="/lms/courses"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs transition-all group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px] transition-transform group-hover:-translate-x-0.5 text-[#d4af37]">
                    arrow_back
                  </span>
                  <span>Enrolled Courses</span>
                </Link>
              </div>
            </div>

            {/* Lesson Description */}
            <p className="font-serif text-[15px] sm:text-base text-[var(--text-muted)] leading-relaxed max-w-3xl pt-0.5">
              {currentLesson.description}
            </p>

            {/* Clean Tab Pills: Video Masterclass, Lecture Notes, Interactive Practice (Properly enclosed rounded rectangular button shapes) */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setActiveTab("videos")}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-display uppercase tracking-wider font-bold transition-all cursor-pointer ${
                  activeTab === "videos"
                    ? "bg-[#d4af37] text-[#141416] shadow-xs"
                    : "bg-white dark:bg-[#141418] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">play_circle</span>
                <span>Video Masterclass</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-display uppercase tracking-wider font-bold transition-all cursor-pointer ${
                  activeTab === "notes"
                    ? "bg-[#d4af37] text-[#141416] shadow-xs"
                    : "bg-white dark:bg-[#141418] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">description</span>
                <span>Lecture Notes</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("practice")}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-display uppercase tracking-wider font-bold transition-all cursor-pointer ${
                  activeTab === "practice"
                    ? "bg-[#d4af37] text-[#141416] shadow-xs"
                    : "bg-white dark:bg-[#141418] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">assignment</span>
                <span>Interactive Practice</span>
              </button>
            </div>
          </section>

          {/* ================= VIEW 1: VIDEO MASTERCLASS ================= */}
          {activeTab === "videos" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* 16:9 Studio Video Player */}
              <SpeakUpVideoPlayer
                videoId={currentLesson.videoId}
                title={`${currentLesson.number}. ${currentLesson.title}`}
                poster="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80"
                onEnded={() => {
                  if (!isCurrentCompleted) {
                    toggleLessonCompletion(currentLesson.id);
                  }
                  if (autoplayNext) {
                    handleNextLesson();
                  }
                }}
              />

              {/* Progression Action Controls (Properly enclosed rounded rectangular buttons) */}
              <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141418]/50 border border-[var(--surface-border)] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => toggleLessonCompletion(currentLesson.id)}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                      isCurrentCompleted
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isCurrentCompleted ? "check_circle" : "check"}
                    </span>
                    <span>{isCurrentCompleted ? "Completed" : "Mark as Completed"}</span>
                  </button>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoplayNext}
                      onChange={(e) => setAutoplayNext(e.target.checked)}
                      className="w-4 h-4 text-[#d4af37] focus:ring-[#d4af37] rounded border-[var(--surface-border)] cursor-pointer"
                    />
                    <span className="font-display text-xs text-[var(--text-muted)] font-semibold">
                      Autoplay Next
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                  <button
                    type="button"
                    onClick={handlePrevLesson}
                    disabled={LESSONS.findIndex((l) => l.id === activeLessonId) === 0}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#141418] text-[var(--text-muted)] hover:text-[#d4af37] hover:border-[#d4af37] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextLesson}
                    disabled={
                      LESSONS.findIndex((l) => l.id === activeLessonId) === LESSONS.length - 1 ||
                      activeLessonId === "l06"
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* ================= VIEW 2: LECTURE NOTES (PRESERVED PARAGRAPH-STYLE, TEXT SIZE & COPY) ================= */}
          {activeTab === "notes" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-4">
                {/* Notes Action Header: Copy Button */}
                <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]/50">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                      Lecture {currentLesson.number} Notes
                    </h3>
                    <p className="font-serif text-xs text-[var(--text-muted)]">
                      Continuous document-style text area • Saved automatically
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyNotes}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-wider bg-white dark:bg-[#141418] hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] transition-all cursor-pointer shadow-xs"
                    title="Copy lecture notes to clipboard"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copied ? "check" : "content_copy"}
                    </span>
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>

                {/* Continuous, Editable Document-Style Text Area */}
                <div className="relative">
                  <textarea
                    rows={18}
                    value={notesContent}
                    onChange={(e) => {
                      setNotesContent(e.target.value);
                      const storageKey = `speakup_notes_${activeLessonId}`;
                      localStorage.setItem(storageKey, e.target.value);
                    }}
                    placeholder="Type or edit your lecture notes here..."
                    className="w-full bg-white dark:bg-[#141418]/50 border border-[var(--surface-border)] focus:border-[#d4af37] rounded-2xl p-6 sm:p-8 font-serif text-[17px] sm:text-[18px] text-[var(--text-main)] leading-[1.8] focus:outline-none transition-colors shadow-inner resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW 3: INTERACTIVE PRACTICE (READABLE STUDENT VIEW + COPY ACTION) ================= */}
          {activeTab === "practice" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-6">
                {/* Header with Title and Single-Click Copy Action */}
                <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]/50">
                  <div>
                    <h2 className="font-display text-xl font-bold text-[var(--text-main)]">
                      Instructor Practice Material
                    </h2>
                    <p className="font-serif text-sm text-[var(--text-muted)] mt-0.5">
                      Curated exercises, verbal cadence drills, and self-evaluation guidelines provided by your instructor.
                    </p>
                  </div>

                  {/* One-Click Copy Action */}
                  <button
                    type="button"
                    onClick={handleCopyPractice}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-wider bg-white dark:bg-[#141418] hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] transition-all cursor-pointer shadow-xs"
                    title="Copy complete practice material to clipboard"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copiedPractice ? "check" : "content_copy"}
                    </span>
                    <span>{copiedPractice ? "Copied!" : "Copy"}</span>
                  </button>
                </div>

                {/* Clean, Readable Student Content Area */}
                <div className="rounded-2xl bg-white dark:bg-[#141418]/50 border border-[var(--surface-border)] p-6 sm:p-9 shadow-xs space-y-6">
                  <div className="space-y-5 font-serif text-[17px] sm:text-[18px] text-[var(--text-main)] leading-[1.85] max-w-4xl">
                    {practiceContent.split("\n\n").map((paragraph, index) => {
                      if (
                        paragraph.startsWith("Instructor Practice Directives") ||
                        paragraph.startsWith("Pedagogical Objective") ||
                        paragraph.startsWith("Verbal Articulation Exercise") ||
                        paragraph.startsWith("Cadence Drill Steps") ||
                        paragraph.startsWith("Mentor Evaluation Guidelines") ||
                        paragraph.startsWith("Instructional Exercise")
                      ) {
                        const lines = paragraph.split("\n");
                        return (
                          <div key={index} className="space-y-2">
                            <h3 className="font-display text-lg font-bold text-[var(--text-main)] text-[#d4af37] tracking-tight">
                              {lines[0]}
                            </h3>
                            {lines.slice(1).map((line, lineIdx) => (
                              <p key={lineIdx} className="text-[var(--text-main)] leading-relaxed">
                                {line}
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <p key={index} className="text-[var(--text-main)] leading-relaxed">
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Polished Academic Certificate Notification Modal */}
      {certNotification && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cert-popup-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setCertNotification(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#151518] text-[var(--text-main)] border border-[#d4af37]/35 rounded-2xl p-6 sm:p-7 shadow-[0_12px_40px_-8px_rgba(212,175,55,0.18),0_10px_24px_-4px_rgba(0,0,0,0.3)] relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-[var(--surface-border)]/60">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#d4af37]/25 to-[#d4af37]/10 border border-[#d4af37]/45 text-[#d4af37] flex items-center justify-center shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
                </div>
                <div>
                  <h4 id="cert-popup-title" className="font-display text-base font-bold text-[var(--text-main)] leading-tight tracking-tight">
                    Certificate Notification
                  </h4>
                  <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#8a6d1b] dark:text-[#d4af37] font-bold">
                    SpeakUp Academic Credentials
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCertNotification(null)}
                aria-label="Close notification"
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-[var(--surface-low)] transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="bg-[#f9f5ed]/80 dark:bg-[var(--surface-low)]/70 border border-[var(--surface-border)] rounded-xl p-4.5 mb-5 shadow-inner">
              <p className="font-serif text-[13.5px] sm:text-[14px] text-[var(--text-main)] leading-relaxed">
                {certNotification}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCertNotification(null)}
                className="px-6 py-2.5 bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold rounded-xl shadow-xs hover:shadow transition-all cursor-pointer active:scale-95"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
