"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

interface TopicData {
  title: string;
  details: string;
  duration?: string;
}

interface ModuleData {
  number: string;
  title: string;
  badge?: string;
  duration: string;
  description: string;
  topics: TopicData[];
}

interface SyllabusData {
  id: string;
  name: string;
  level: string;
  overview: string;
  modules: ModuleData[];
}

// Complete authentic syllabi sourced from project data & Stitch design specifications
const syllabi: Record<string, SyllabusData> = {
  "german-a1": {
    id: "german-a1",
    name: "German Course — A1",
    level: "CEFR A1 • Foundational",
    overview:
      "Designed for rapid fluency and foundational mastery of the German language, covering case structures, sentence brackets, and everyday immersion.",
    modules: [
      {
        number: "01",
        title: "German Foundations & Phonetics",
        duration: "Weeks 1–2",
        description: "Orientation, German phonetics, umlauts, alphabet, and core subject-verb sentence syntax.",
        topics: [
          { title: "01. Introduction to German & Phonetics", details: "Mouth mechanics, vowel shifts, umlauts (ä, ö, ü) and consonant clarity.", duration: "30 mins" },
          { title: "02. Personal Pronouns & Greetings", details: "Formal (Sie) vs. informal (du) register etiquette and conversational greetings.", duration: "45 mins" },
          { title: "03. Basic Sentence Structure (Verb Position 2)", details: "The cardinal rule of German syntax: finite verb locked in second position.", duration: "50 mins" },
          { title: "04. Essential Everyday Lexical Core", details: "High-frequency vocabulary for daily orientation and numbers.", duration: "40 mins" },
        ],
      },
      {
        number: "02",
        title: "Building Sentences & Core Cases",
        duration: "Weeks 3–4",
        description: "Conjugations, grammatical genders, and mastering Nominative and Accusative case declensions.",
        topics: [
          { title: "05. Regular & Irregular Verb Conjugation", details: "Present tense endings, vowel stem changes (e -> i, a -> ä), and auxiliaries.", duration: "55 mins" },
          { title: "06. Definite & Indefinite Articles", details: "Grammatical gender (der, die, das) and gender recognition frameworks.", duration: "60 mins" },
          { title: "07. Nominative & Accusative Case Direct Objects", details: "Case triggers, article shifts (den, einen), and negation with 'nicht' vs 'kein'.", duration: "60 mins" },
        ],
      },
      {
        number: "03",
        title: "Everyday German & Immersion",
        duration: "Weeks 5–6",
        description: "Temporal expressions, conversational small talk, dining etiquette, and city navigation.",
        topics: [
          { title: "08. Time, Calendar & Scheduling", details: "Telling time, weekdays, seasons, and coordinating appointments.", duration: "45 mins" },
          { title: "09. Practical Food & Restaurant Etiquette", details: "Ordering, polite requests with 'möchte' / 'hätte gern', and currency transactions.", duration: "50 mins" },
          { title: "10. Modal Verbs & The Sentence Bracket", details: "Positioning infinitives at the clause end using können, müssen, wollen.", duration: "55 mins" },
        ],
      },
      {
        number: "04",
        title: "Conversational Competence & Oral Assessment",
        duration: "Weeks 7–8",
        description: "Accusative prepositions, situational dialogues, and Goethe-Institut A1 benchmark review.",
        topics: [
          { title: "11. Separable Verbs (trennbare Verben)", details: "Prefix separation dynamics in main clauses vs subordinate logic.", duration: "50 mins" },
          { title: "12. Simulated Dialogue & Self-Evaluation", details: "Live roleplay assessing spontaneous verbal reflex and pronunciation accuracy.", duration: "60 mins" },
        ],
      },
    ],
  },

  "german-a2": {
    id: "german-a2",
    name: "German Course — A2",
    level: "CEFR A2 • Elementary & Pre-Intermediate",
    overview:
      "Advance your German communication with past tenses, subordinate clauses, dative prepositions, and professional dialogue competencies.",
    modules: [
      {
        number: "01",
        title: "Past Tense & Narrative Storytelling",
        duration: "Weeks 1–3",
        description: "Perfekt tense formation with haben and sein, Partizip II rules, and Präteritum of modal verbs.",
        topics: [
          { title: "01. Perfekt Tense Formation & Partizip II", details: "Regular and irregular participles with ge- prefixes and vowel shifts.", duration: "55 mins" },
          { title: "02. Auxiliary Selection: haben vs. sein", details: "Movement and state change verbs in spoken retrospective accounts.", duration: "45 mins" },
          { title: "03. Präteritum of war, hatte and Modals", details: "Written narrative past vs everyday spoken Perfekt cadence.", duration: "50 mins" },
        ],
      },
      {
        number: "02",
        title: "Dative Case & Two-Way Prepositions",
        duration: "Weeks 4–6",
        description: "Wechselpräpositionen, indirect objects, and fixed dative prepositions in residential/office contexts.",
        topics: [
          { title: "04. Two-Way Prepositions (Wechselpräpositionen)", details: "An, auf, in, über, unter, vor, hinter: Motion (Akk) vs Location (Dat).", duration: "60 mins" },
          { title: "05. Dative Personal Pronouns (mir, dir, ihm, ihr)", details: "Mastering indirect object pronoun placement in conversational exchange.", duration: "50 mins" },
          { title: "06. Fixed Dative Triggers (mit, nach, von, zu)", details: "Automatic dative prepositions and practical directions.", duration: "45 mins" },
        ],
      },
      {
        number: "03",
        title: "Subordinate Clauses & Professional German",
        duration: "Weeks 7–8",
        description: "Subordinating conjunctions (weil, dass, wenn) and formal workplace communication protocols.",
        topics: [
          { title: "07. Subordinating Conjunctions: weil, dass, wenn", details: "Moving conjugated verbs to the terminal clause position effortlessly.", duration: "55 mins" },
          { title: "08. Office Communication & Email Protocols", details: "Standard business salutations, inquiries, and phone etiquette.", duration: "50 mins" },
        ],
      },
      {
        number: "04",
        title: "Nuance, Konjunktiv II & B1 Transition",
        duration: "Weeks 9–10",
        description: "Polite suggestions, hypothetical advice with sollte/könnte, and comprehensive assessment.",
        topics: [
          { title: "09. Expressing Opinions & Konjunktiv II", details: "Polite advice and recommendations with sollte, könnte, and müsste.", duration: "50 mins" },
          { title: "10. Comprehensive A2 Capstone Review", details: "Goethe/Telc A2 examination format simulation and verbal defense.", duration: "65 mins" },
        ],
      },
    ],
  },

  "german-b1": {
    id: "german-b1",
    name: "German Course — B1",
    level: "CEFR B1 • Intermediate",
    overview:
      "Bridge foundational knowledge into independent fluency. Master complex sentence subordination, passive voice, relative clauses, and nuanced workplace communication.",
    modules: [
      {
        number: "01",
        title: "Complex Subordination & Relative Clauses",
        duration: "Weeks 1–3",
        description: "Mastering relative pronouns in all four cases (der, die, das, dem, den, dessen) and causal connectors.",
        topics: [
          { title: "01. Relative Clauses in All Cases", details: "Integrating essential descriptive relative clauses into spoken discourse." },
          { title: "02. Genitive Case Structures & Prepositions", details: "Formal genitive prepositions (während, trotz, wegen) in professional context." },
          { title: "03. Two-Part Conjunctions (sowohl...als auch)", details: "Expanding rhetorical variety with sophisticated connectors." },
        ],
      },
      {
        number: "02",
        title: "Passive Voice & Modal Participles",
        duration: "Weeks 4–6",
        description: "Forming Vorgangspassiv with werden, Zustandspassiv with sein, and passive substitutes in workplace reporting.",
        topics: [
          { title: "04. Present & Past Passive Voice", details: "Action-oriented reporting without personal agent emphasis." },
          { title: "05. Passive with Modal Verbs", details: "Formulating formal regulations and obligations (muss erledigt werden)." },
          { title: "06. Infinitive Clauses with 'zu' and 'um...zu'", details: "Stating intentions, objectives, and prerequisites clearly." },
        ],
      },
      {
        number: "03",
        title: "Subjunctive II & Diplomatic German",
        duration: "Weeks 7–9",
        description: "Hypothetical conditions (wenn ich Zeit hätte), polite requests, and diplomatic negotiations.",
        topics: [
          { title: "07. Advanced Konjunktiv II for Hypotheticals", details: "Constructing unfulfilled past wishes and hypothetical workplace scenarios." },
          { title: "08. Workplace Inquiries & Conflict Resolution", details: "Expressing disagreement constructively and negotiating resolutions." },
        ],
      },
      {
        number: "04",
        title: "Goethe / Telc B1 Examination & Defense",
        duration: "Weeks 10–12",
        description: "Full exam simulation, structured oral presentation, and diagnostic faculty evaluation.",
        topics: [
          { title: "09. 3-Minute Prepared Oral Presentation", details: "Structuring an argumentative presentation with pros, cons, and personal stance." },
          { title: "10. Goethe/Telc B1 Benchmark Examination", details: "Full verbal examination simulation and personalized assessor feedback." },
        ],
      },
    ],
  },

  "german-c2": {
    id: "german-c2",
    name: "German Course — C2",
    level: "CEFR C2 • Mastery & Native Fluency",
    overview:
      "Attain native-level command, linguistic precision, idiomatic authority, and effortless command of German in academic, literary, and executive boardrooms.",
    modules: [
      {
        number: "01",
        title: "Stylistic Sophistication & Nominal Style",
        duration: "Weeks 1–3",
        description: "Transforming verbal phrases into elegant nominal expressions (Nominalstil) common in executive reports.",
        topics: [
          { title: "01. Nominalization & Attribute Placement", details: "Constructing dense, high-register syntactic units with precision." },
          { title: "02. Functional Verb Compounds (Funktionsverben)", details: "Using high-register verbal idioms (zur Sprache bringen, in Betracht ziehen)." },
        ],
      },
      {
        number: "02",
        title: "Subjunctive I & Indirect Speech",
        duration: "Weeks 4–6",
        description: "Konjunktiv I for neutral journalism, legal quotation, and boardroom documentation.",
        topics: [
          { title: "03. Konjunktiv I Formation & Distancing", details: "Reporting statements neutrally without taking subjective ownership." },
          { title: "04. Modal Particles & Conversational Nuance", details: "Mastering delicate nuances with doch, mal, ja, and eben." },
        ],
      },
      {
        number: "03",
        title: "Rhetoric, Debate & Philosophical Discourse",
        duration: "Weeks 7–9",
        description: "Spontaneous defense in contentious academic debate, subtle sarcasm, and rapid retorts.",
        topics: [
          { title: "05. Dialectical Debate & Counter-Argumentation", details: "Reframing adversary arguments with linguistic dexterity." },
          { title: "06. Idiomatic & Metaphorical Precision", details: "Integrating classical German idioms and literary metaphors effortlessly." },
        ],
      },
      {
        number: "04",
        title: "Goethe-Zertifikat C2 Oral Mastery",
        duration: "Weeks 10–12",
        description: "Capstone lecture delivery, spontaneous defense before faculty, and credential conferral.",
        topics: [
          { title: "07. 15-Minute Unscripted Academic Lecture", details: "Defending an intricate socio-economic thesis before examiners." },
          { title: "08. C2 Großes Deutsches Sprachdiplom Simulation", details: "Final diagnostic evaluation across all linguistic modalities." },
        ],
      },
    ],
  },

  "english-basic": {
    id: "english-basic",
    name: "English Basic — Grammar & Spoken Foundations",
    level: "CEFR A1–A2 • Foundational",
    overview:
      "Master standard English articulation, core sentence mechanics, conversational fluency, and clear daily expression through academic progression.",
    modules: [
      {
        number: "01",
        title: "Phonics, Alphabet & Acoustic Cadence",
        duration: "Weeks 1–2",
        description: "Mouth mechanics, vowel contrasts, syllable stress, and eliminating phonetic slurring.",
        topics: [
          { title: "01. English Vowel Sounds & Minimal Pairs", details: "Short vs long vowels (ship vs sheep, bit vs beat) and acoustic projection.", duration: "45 mins" },
          { title: "02. Consonant Blends & Digraphs", details: "Mastering 'th' (voiced/unvoiced), 'sh', 'ch', and syllable boundaries.", duration: "45 mins" },
          { title: "03. Syllable Stress & Word Rhythm", details: "Sentence rhythm, content word stress, and natural breathing cadence.", duration: "50 mins" },
        ],
      },
      {
        number: "02",
        title: "Essential Grammar & Sentence Architecture",
        duration: "Weeks 3–4",
        description: "Subject-verb agreement, present tenses, question inversions, and article placement.",
        topics: [
          { title: "04. Subject-Verb Agreement & Present Simple", details: "Habitual actions, third-person singular 's', and daily routines.", duration: "50 mins" },
          { title: "05. Present Continuous for Active Scenarios", details: "Dynamic action verbs vs stative verbs and real-time updates.", duration: "45 mins" },
          { title: "06. Question Formations & Do/Does Inversions", details: "Structuring informative Wh- questions without hesitation.", duration: "50 mins" },
        ],
      },
      {
        number: "03",
        title: "Daily Social & Professional Vocabulary",
        duration: "Weeks 5–6",
        description: "Social etiquette, workplace introductions, telephone dialogues, and survival phrases.",
        topics: [
          { title: "07. Introductions & Social Small Talk", details: "Polite inquiries, active listening cues, and conversational turn-taking.", duration: "45 mins" },
          { title: "08. Workplace & Office Navigation", details: "Basic business tools, role descriptions, and project status updates.", duration: "50 mins" },
        ],
      },
      {
        number: "04",
        title: "Speaking Drills & Diagnostic Assessment",
        duration: "Weeks 7–8",
        description: "Shadowing drills, 1-minute impromptu speeches, and oral foundation evaluation.",
        topics: [
          { title: "09. Shadowing & Controlled Repetition", details: "Accent neutralization through synchronized phrase repetition." },
          { title: "10. Oral Foundation Evaluation", details: "Assessor interview covering fluency, grammar accuracy, and vocabulary." },
        ],
      },
    ],
  },

  "english-b1": {
    id: "english-b1",
    name: "English Course — B1",
    level: "CEFR B1 • Intermediate Fluency",
    overview:
      "Transition from basic communication to confident independent English. Master past narratives, modal predictions, conversational fluency, and professional workplace discourse.",
    modules: [
      {
        number: "01",
        title: "Narrative Tenses & Past Time Discourse",
        duration: "Weeks 1–2",
        description: "Harmonizing past simple, past continuous, and present perfect without hesitation.",
        topics: [
          { title: "01. Past Simple vs. Present Perfect Distinction", details: "Clarifying finished vs unfinished time frames in daily communication." },
          { title: "02. Past Continuous for Background Context", details: "Setting the scene in stories and project retrospectives." },
          { title: "03. Used to & Would for Past Habits", details: "Expressing historical routines and personal background naturally." },
        ],
      },
      {
        number: "02",
        title: "Modals of Ability, Obligation & Probability",
        duration: "Weeks 3–4",
        description: "Calibrating firmness, advice, and likelihood in interpersonal and team collaboration.",
        topics: [
          { title: "04. Must, Have to & Should Nuances", details: "Distinguishing internal obligations from external institutional rules." },
          { title: "05. Modals of Deduction (Must be, Might)", details: "Expressing reasoned conclusions and possibilities under uncertainty." },
          { title: "06. First & Second Conditionals in Action", details: "Framing realistic plans vs hypothetical outcomes with confidence." },
        ],
      },
      {
        number: "03",
        title: "Workplace Dialogue & Connected Speech",
        duration: "Weeks 5–6",
        description: "Mastering phone calls, email etiquette, linking sounds, and natural reductions.",
        topics: [
          { title: "07. Connected Speech & Word Linking", details: "Smoothing transitions between consonant and vowel endings." },
          { title: "08. Effective Email Writing & Tone Calibration", details: "Drafting clear inquiries, updates, and polite requests." },
        ],
      },
      {
        number: "04",
        title: "Conversational Confidence & Oral Assessment",
        duration: "Weeks 7–8",
        description: "Engaging in spontaneous debates, expressing opinions, and CEFR B1 benchmark interview.",
        topics: [
          { title: "09. Agreeing, Disagreeing & Clarification", details: "Maintaining natural conversational turn-taking without awkward pauses." },
          { title: "10. CEFR B1 Oral Assessment & Feedback", details: "Structured interview simulation with actionable faculty recommendations." },
        ],
      },
    ],
  },

  "grammar-a1": {
    id: "grammar-a1",
    name: "English Grammar Mastery — A1",
    level: "Foundational Syntax • 6 Weeks",
    overview:
      "Designed to instill foundational grammatical precision, eliminate basic syntax confusion, and establish effortless spoken clarity.",
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
          { title: "10. Institutional Evaluation & Certification", details: "Final assessment feedback report and verified credential issuance.", duration: "45 mins" },
        ],
      },
    ],
  },

  "speak-30": {
    id: "speak-30",
    name: "Speak in 30 Days — Fluency & Cadence",
    level: "Accelerated Articulation • 4 Weeks",
    overview:
      "A rigorous, intensive training syllabus targeting subconscious spoken reflexes, phonetics clarity, and rapid articulation.",
    modules: [
      {
        number: "01",
        title: "Acoustic Articulation & Mouth Mechanics",
        duration: "Day 1–7",
        description: "Correcting mouth postures, consonant finishes, and phonetic resonance for global intelligibility.",
        topics: [
          { title: "01. Vocal Projection & Posture", details: "Grounding pitch to establish executive authority in meetings.", duration: "40 mins" },
          { title: "02. Consonant Clarity & Anti-Slurring", details: "Crisp syllable boundaries for telephone and conference speaking.", duration: "45 mins" },
        ],
      },
      {
        number: "02",
        title: "The Cadence Anchor & Elimination of Fillers",
        duration: "Day 8–15",
        description: "Replacing 'um', 'uh', and nervous repetition with authoritative micro-pauses.",
        topics: [
          { title: "03. The Cadence Anchor Technique", details: "Using silence as an intellectual punctuation mark before key points.", duration: "50 mins" },
          { title: "04. Impromptu Response Scaffolding", details: "Frameworks for answering unscripted questions under pressure.", duration: "50 mins" },
        ],
      },
      {
        number: "03",
        title: "Conversational Reflexes & Executive Idioms",
        duration: "Day 16–23",
        description: "Adopting natural colloquial and executive idioms used by native leadership teams.",
        topics: [
          { title: "05. Natural Colloquial Phrasing", details: "Breaking away from rigid textbook language into native executive flow.", duration: "45 mins" },
          { title: "06. Diplomatic Pushback & Dissent", details: "Politely dissenting in boardrooms without emotional friction.", duration: "50 mins" },
        ],
      },
      {
        number: "04",
        title: "Capstone Fluency Showcase",
        duration: "Day 24–30",
        description: "High-pressure simulation sessions, live debate drills, and speech telemetry analysis.",
        topics: [
          { title: "07. Live Pitch Simulation", details: "Presenting in front of an academic panel under strict time limits.", duration: "60 mins" },
          { title: "08. Fluency Graduation Diagnostic", details: "Telemetry review on spoken pace, cadence, and vocabulary density.", duration: "45 mins" },
        ],
      },
    ],
  },

  "strategic-negotiation": {
    id: "strategic-negotiation",
    name: "Strategic Negotiation & Persuasion",
    level: "Executive Leadership • 8 Weeks",
    overview:
      "Advanced rhetoric, tactical concession phrasing, and psychological linguistics for high-stakes dealmaking and cross-cultural transactions.",
    modules: [
      {
        number: "01",
        title: "Linguistic Positioning & Tactical Anchoring",
        duration: "Weeks 1–2",
        description: "Framing discussions, commanding conversational tempo, and establishing initial parameters.",
        topics: [
          { title: "01. Anchoring Phrases & Agenda Control", details: "Opening statements that dictate terms calmly and professionally.", duration: "50 mins" },
          { title: "02. Micro-Nuances of Concession Language", details: "Offering ground without signalling weakness or desperation.", duration: "50 mins" },
        ],
      },
      {
        number: "02",
        title: "Countering Resistance & Deadlock Breaking",
        duration: "Weeks 3–4",
        description: "Linguistic maneuvers to bypass objections, de-escalate tension, and refocus on mutual incentives.",
        topics: [
          { title: "03. The Socratic Probe in Negotiation", details: "Asking precision questions that guide counter-parties to agreement.", duration: "55 mins" },
          { title: "04. Reframing Hostile Proposals", details: "Turning hard ultimatums into exploratory shared discussions.", duration: "50 mins" },
        ],
      },
      {
        number: "03",
        title: "Cross-Cultural Influence & Closing Tactics",
        duration: "Weeks 5–6",
        description: "Nuanced closing rhetoric, high-stakes formal summaries, and consensus building.",
        topics: [
          { title: "05. Closing Rhetoric & Final Binding Phrasing", details: "Formal contractual transitions and sealing executive terms.", duration: "50 mins" },
          { title: "06. Cultural Etiquette & Multi-Party Dynamics", details: "Managing diplomatic sensitivity across diverse jurisdictions.", duration: "55 mins" },
        ],
      },
      {
        number: "04",
        title: "Live Cohort Defense & Advisory Capstone",
        duration: "Weeks 7–8",
        description: "Simulated multi-stakeholder dispute resolution with lead faculty feedback.",
        topics: [
          { title: "07. Multi-Party Dispute Simulation", details: "Live 30-minute high-pressure negotiation simulation.", duration: "60 mins" },
          { title: "08. Executive Telemetry Evaluation", details: "Personalized breakdown of tone calibration and rhetorical leverage.", duration: "45 mins" },
        ],
      },
    ],
  },

  "professional-mastery": {
    id: "professional-mastery",
    name: "Professional Executive Series",
    level: "Advanced Executive • 10 Weeks",
    overview:
      "Comprehensive curriculum integrating formal rhetoric, board reporting, articulate spontaneous replies, and boardroom influence.",
    modules: [
      {
        number: "01",
        title: "Boardroom Reporting & Rhetoric",
        duration: "Weeks 1–3",
        description: "Structuring high-density executive summaries, data narratives, and boardroom presentations.",
        topics: [
          { title: "01. Executive Synthesis & Bottom-Line Up Front", details: "Delivering core insights within the first 60 seconds of any address.", duration: "50 mins" },
          { title: "02. Financial & Strategic Data Storytelling", details: "Translating complex metrics into clear strategic imperatives.", duration: "55 mins" },
        ],
      },
      {
        number: "02",
        title: "Spontaneous Articulation & Q&A Defense",
        duration: "Weeks 4–6",
        description: "Mastering poise during aggressive cross-examination and stakeholder scrutiny.",
        topics: [
          { title: "03. The PREP Framework for Impromptu Replies", details: "Point, Reason, Example, Point: unshakeable spontaneous replies.", duration: "50 mins" },
          { title: "04. Deflecting Bad-Faith Questions with Grace", details: "Diplomatic pivots that protect institutional integrity.", duration: "50 mins" },
        ],
      },
      {
        number: "03",
        title: "Executive Presence & Vocal Projection",
        duration: "Weeks 7–8",
        description: "Acoustic resonance, stage presence, and commanding boardroom attention.",
        topics: [
          { title: "05. Vocal Gravitas & Pitch Pacing", details: "Lowering vocal strain and projecting natural authority.", duration: "45 mins" },
          { title: "06. Physical Poise & Non-Verbal Alignment", details: "Synchronizing posture, gaze, and verbal cadence.", duration: "50 mins" },
        ],
      },
      {
        number: "04",
        title: "Leadership Defense Capstone",
        duration: "Weeks 9–10",
        description: "Comprehensive oral defense in front of institutional mentors.",
        topics: [
          { title: "07. Keynote & Strategic Vision Defense", details: "Defending an institutional strategy before senior faculty.", duration: "65 mins" },
          { title: "08. Executive Certification & Credential", details: "Final transcript issuance and verified institutional seal.", duration: "45 mins" },
        ],
      },
    ],
  },

  "global-leadership": {
    id: "global-leadership",
    name: "Global Leadership Intensive",
    level: "Elite Capstone • 12 Weeks",
    overview:
      "Immersive capstone cohort program focused on keynote address delivery, speech crafting, and international diplomacy communication.",
    modules: [
      {
        number: "01",
        title: "Speechwriting & Classical Rhetoric",
        duration: "Weeks 1–3",
        description: "Crafting memorable speeches utilizing ethos, pathos, logos, and rhythmic triad repetition.",
        topics: [
          { title: "01. Aristotelian Triad in Modern Leadership", details: "Balancing intellectual proof, character credibility, and emotive resonance.", duration: "55 mins" },
          { title: "02. Metaphor, Cadence & Structural Triads", details: "Writing speeches that command universal attention.", duration: "55 mins" },
        ],
      },
      {
        number: "02",
        title: "Diplomatic & Transnational Discourse",
        duration: "Weeks 4–6",
        description: "International diplomacy protocols, multi-lingual considerations, and global treaty phrasing.",
        topics: [
          { title: "03. Diplomatic Ambiguity & Precision Calibration", details: "Drafting joint statements that bridge ideological impasses.", duration: "60 mins" },
          { title: "04. Navigating High-Stakes Geopolitical Dialogue", details: "De-escalating friction in multinational coalitions.", duration: "50 mins" },
        ],
      },
      {
        number: "03",
        title: "Crisis Communication & Media Scrutiny",
        duration: "Weeks 7–9",
        description: "Live press conference drills, crisis management statements, and interview composure.",
        topics: [
          { title: "05. The First 60 Minutes of Crisis Response", details: "Controlling narrative tempo without making premature admissions.", duration: "55 mins" },
          { title: "06. On-Camera Press Conference Simulation", details: "Handling hostile media inquiries with poise and calm.", duration: "60 mins" },
        ],
      },
      {
        number: "04",
        title: "Fellowship Graduation & Keynote Showcase",
        duration: "Weeks 10–12",
        description: "Live public keynote delivery and formal induction into SpeakUp Global Fellows.",
        topics: [
          { title: "07. Live Global Keynote Showcase", details: "Delivering a 15-minute original address to an international audience.", duration: "75 mins" },
          { title: "08. Capstone Fellowship Credentialing", details: "Conferral of the SpeakUp Executive Fellowship credential.", duration: "45 mins" },
        ],
      },
    ],
  },
};

// Course Outline Content Component that consumes useSearchParams safely inside Suspense
function CourseOutlineContent() {
  const searchParams = useSearchParams();
  const courseParam = searchParams.get("course")?.toLowerCase() || "";

  // Normalize aliases from URL query
  const resolveCourseKey = (param: string): string => {
    const p = param.toLowerCase();
    if (p.includes("c2") || p.includes("german-c2")) return "german-c2";
    if (p.includes("german-b1") || (p.includes("b1") && p.includes("german"))) return "german-b1";
    if (p.includes("german-a2") || (p.includes("german") && (p.includes("2") || p.includes("a2")))) return "german-a2";
    if (p.includes("german") || p.includes("a1")) return "german-a1";
    if (p.includes("english-b1") || (p.includes("b1") && p.includes("english"))) return "english-b1";
    if (p.includes("basic") || p.includes("english_basic")) return "english-basic";
    if (p.includes("30") || p.includes("speak")) return "speak-30";
    if (p.includes("negotiation")) return "strategic-negotiation";
    if (p.includes("professional") || p.includes("mastery")) return "professional-mastery";
    if (p.includes("global") || p.includes("leadership")) return "global-leadership";
    if (p.includes("grammar")) return "grammar-a1";
    return "german-a1";
  };

  const initialKey = courseParam ? resolveCourseKey(courseParam) : "german-a1";
  const [selectedCourseKey, setSelectedCourseKey] = useState<string>(initialKey);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({ "01": true, "02": true });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setDropdownOpen(false);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setDropdownOpen((prev) => !prev);
    }
  };

  // Sync state if query parameter changes in URL
  useEffect(() => {
    if (courseParam) {
      const resolved = resolveCourseKey(courseParam);
      setSelectedCourseKey(resolved);
    }
  }, [courseParam]);

  const activeSyllabus = syllabi[selectedCourseKey] || syllabi["german-a1"];

  const toggleModule = (moduleNum: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleNum]: !prev[moduleNum],
    }));
  };

  const germanCourses = [
    syllabi["german-a1"],
    syllabi["german-a2"],
    syllabi["german-b1"],
    syllabi["german-c2"],
  ].filter(Boolean);

  const englishCourses = [
    syllabi["english-basic"],
    syllabi["english-b1"],
    syllabi["grammar-a1"],
    syllabi["speak-30"],
    syllabi["strategic-negotiation"],
    syllabi["professional-mastery"],
    syllabi["global-leadership"],
  ].filter(Boolean);

  return (
    <div className="max-w-[1140px] mx-auto px-6 md:px-12">
      {/* Course Outline Rounded Container */}
      <section className="mb-10 bg-[var(--surface-lowest)] border border-[var(--surface-border)] dark:border-white/10 p-8 md:p-12 shadow-xs rounded-2xl relative z-20">
        {/* Ambient subtle light contained to rounded corners */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#d4af37]/5 dark:bg-[#d4af37]/10 rounded-full blur-3xl -mr-20 -mt-20" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center mb-6">
          {/* Main Heading: "Course Outline" enclosed in a stylish rectangular rounded box */}
          <div className="inline-flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-2xl shadow-[0_4px_24px_-6px_rgba(212,175,55,0.18)] mb-5">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-[var(--text-main)] font-extrabold tracking-[0.08em] uppercase">
              Course Panel
            </h1>
          </div>

          {/* Subheading: Active Course Name with stylish flanking accents */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2.5">
            <span className="h-px w-6 sm:w-12 bg-gradient-to-r from-transparent to-[#d4af37]/60" />
            <h2 className="font-display text-lg sm:text-xl md:text-2xl text-[#d4af37] font-semibold tracking-wide">
              {activeSyllabus.name}
            </h2>
            <span className="h-px w-6 sm:w-12 bg-gradient-to-l from-transparent to-[#d4af37]/60" />
          </div>

          {/* Level Tag (Removed specifically for German Course A1) */}
          {activeSyllabus.id !== "german-a1" && activeSyllabus.level && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/25 text-[11px] sm:text-xs font-display uppercase tracking-[0.16em] text-[#d4af37] font-semibold mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
              <span>{activeSyllabus.level}</span>
            </div>
          )}

          {/* Overview Description */}
          <p className="font-serif text-[15px] sm:text-[17px] text-[var(--text-muted)] max-w-2xl leading-relaxed mx-auto text-center">
            {activeSyllabus.overview}
          </p>
        </div>

        {/* Divider */}
        <div className="relative z-10 w-full h-px bg-[var(--surface-border)] my-6" />

        {/* Bottom Area: Interactive Course Selection Dropdown on Bottom-Left */}
        <div className="relative z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-auto" ref={dropdownRef}>
            <label
              htmlFor="course-selector-btn"
              className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 text-left"
            >
              Select Course Track
            </label>
            <button
              id="course-selector-btn"
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              onKeyDown={handleKeyDown}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
              className="w-full sm:w-[380px] bg-[var(--surface-low)] hover:bg-[var(--surface)] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] px-4 py-3 rounded-xl flex items-center justify-between shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
            >
              <div className="flex items-center gap-3 truncate text-left">
                <span className="w-8 h-8 rounded-lg bg-[#d4af37]/15 text-[#d4af37] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">school</span>
                </span>
                <div className="truncate">
                  <div className="font-display text-xs sm:text-sm font-bold text-[var(--text-main)] truncate">
                    {activeSyllabus.name}
                  </div>
                  <div className="font-serif text-[11px] text-[var(--text-muted)] truncate">
                    {activeSyllabus.level}
                  </div>
                </div>
              </div>
              <span
                className={`material-symbols-outlined text-[20px] text-[var(--text-muted)] transition-transform duration-200 shrink-0 ml-2 ${
                  dropdownOpen ? "rotate-180 text-[#d4af37]" : ""
                }`}
              >
                expand_more
              </span>
            </button>

            {/* Dropdown Menu Options */}
            {dropdownOpen && (
              <div
                role="listbox"
                className="absolute left-0 top-full mt-2 w-full sm:w-[440px] max-h-[380px] overflow-y-auto custom-scroll rounded-2xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 focus:outline-none"
              >
                {/* German Courses Group */}
                <div className="px-3 py-1.5 text-[10px] font-display uppercase tracking-widest font-bold text-[#d4af37] border-b border-[var(--surface-border)] mb-1">
                  German Language Programs
                </div>
                {germanCourses.map((c) => {
                  const isSel = selectedCourseKey === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onClick={() => {
                        setSelectedCourseKey(c.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                        isSel
                          ? "bg-[#d4af37]/15 text-[var(--text-main)] font-bold border border-[#d4af37]/40"
                          : "hover:bg-[var(--surface-low)] text-[var(--text-main)]"
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-display text-xs sm:text-[13px] font-bold text-[var(--text-main)]">
                          {c.name}
                        </div>
                        <div className="font-serif text-[11px] text-[var(--text-muted)]">
                          {c.level}
                        </div>
                      </div>
                      {isSel && (
                        <span className="material-symbols-outlined text-[#d4af37] text-[18px] shrink-0">
                          check
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* English & Executive Courses Group */}
                <div className="px-3 py-1.5 text-[10px] font-display uppercase tracking-widest font-bold text-[#d4af37] border-b border-[var(--surface-border)] mt-2 mb-1">
                  English &amp; Executive Programs
                </div>
                {englishCourses.map((c) => {
                  const isSel = selectedCourseKey === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onClick={() => {
                        setSelectedCourseKey(c.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                        isSel
                          ? "bg-[#d4af37]/15 text-[var(--text-main)] font-bold border border-[#d4af37]/40"
                          : "hover:bg-[var(--surface-low)] text-[var(--text-main)]"
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-display text-xs sm:text-[13px] font-bold text-[var(--text-main)]">
                          {c.name}
                        </div>
                        <div className="font-serif text-[11px] text-[var(--text-muted)]">
                          {c.level}
                        </div>
                      </div>
                      {isSel && (
                        <span className="material-symbols-outlined text-[#d4af37] text-[18px] shrink-0">
                          check
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Active Syllabus Indicator */}
          <div className="hidden sm:flex items-center gap-2 self-end mb-1">
            <span className="font-display text-xs text-[var(--text-muted)]">Selected Track:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-low)] text-xs font-display font-bold text-[#d4af37] border border-[#d4af37]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]"></span>
              <span>{activeSyllabus.name}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Module Syllabus Accordion */}
      <div className="space-y-5 mb-16">
        {activeSyllabus.modules.map((module) => {
          const isExpanded = !!expandedModules[module.number];

          return (
            <div
              key={module.number}
              className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] dark:border-white/10 rounded-2xl overflow-hidden shadow-xs hover:border-[#d4af37]/40 dark:hover:border-[#d4af37]/50 transition-colors"
            >
              {/* Module Header Bar */}
              <div
                onClick={() => toggleModule(module.number)}
                className="p-5 md:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none bg-[var(--surface-lowest)] hover:bg-[var(--surface-low)]/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] dark:border-white/10 text-[#d4af37] font-display font-bold text-lg flex items-center justify-center shrink-0">
                    {module.number}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--text-main)]">
                        {module.title}
                      </h3>
                    </div>
                    <p className="font-serif text-sm sm:text-[14.5px] text-[var(--text-muted)] max-w-xl leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:self-center self-end">
                  <span className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] bg-[var(--surface-low)] px-3.5 py-1 rounded-full border border-[var(--surface-border)] dark:border-white/10 font-semibold">
                    {module.duration}
                  </span>
                  <span className="material-symbols-outlined text-[22px] text-[var(--text-muted)] transition-transform duration-200">
                    {isExpanded ? "expand_less" : "expand_more"}
                  </span>
                </div>
              </div>

              {/* Collapsible Topics List */}
              {isExpanded && (
                <div className="px-5 md:px-7 pb-5 pt-3 border-t border-[var(--surface-border)]/50 dark:border-white/10 bg-[var(--surface-low)]/20 space-y-2.5">
                  <h4 className="font-display text-[11px] uppercase tracking-widest text-[#d4af37] font-bold mb-2">
                    Lessons &amp; Interactive Competencies
                  </h4>
                  {module.topics.map((topic, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#d4af37]/30 dark:hover:border-[#d4af37]/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-[#d4af37] text-[20px] mt-0.5 shrink-0">
                          play_circle
                        </span>
                        <div>
                          <div className="font-display text-sm sm:text-base font-bold text-[var(--text-main)]">
                            {topic.title}
                          </div>
                          <div className="font-serif text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed mt-0.5">
                            {topic.details}
                          </div>
                        </div>
                      </div>
                      {/* Session duration minutes removed per Section 6; LMS inclusion badge retained cleanly */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold bg-[var(--surface-low)] px-3 py-1 rounded-full border border-[var(--surface-border)]">
                          Included in LMS
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Call to Action */}
      <div className="text-center p-8 sm:p-10 rounded-2xl bg-[var(--surface-low)] border border-[#d4af37]/30 shadow-xs flex flex-col items-center">
        <h3 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)] mb-2">
          Ready to begin this curriculum?
        </h3>
        <p className="font-serif text-[14px] sm:text-[15px] text-[var(--text-muted)] max-w-lg mb-6 leading-relaxed">
          Enroll today to receive instant LMS portal access and official course study notes from administration upon verification.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/pricing"
            className="bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] font-display text-xs uppercase tracking-widest font-bold px-8 py-3.5 rounded-full shadow-sm hover:bg-[#d4af37] hover:text-white transition-all active:scale-95"
          >
            Proceed to Enrollment
          </Link>
          <Link
            href="/demo"
            className="border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-xs uppercase tracking-widest font-bold px-8 py-3.5 rounded-full transition-all bg-[var(--surface-lowest)] active:scale-95"
          >
            Watch Demo Preview
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CourseOutlinePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      <Navbar />

      <main className="flex-1 py-12 md:py-20">
        <Suspense
          fallback={
            <div className="max-w-[1140px] mx-auto px-6 py-20 text-center font-display text-sm uppercase tracking-widest text-[#d4af37]">
              Loading Academic Syllabus...
            </div>
          }
        >
          <CourseOutlineContent />
        </Suspense>
      </main>
    </div>
  );
}
