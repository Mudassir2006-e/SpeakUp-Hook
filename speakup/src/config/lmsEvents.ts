export interface LmsEvent {
  id: string;
  title: string;
  description: string;
  dayDate: string;
  time: string;
  essentialInfo?: string;
}

export const INITIAL_LMS_EVENTS: LmsEvent[] = [
  {
    id: "event-1",
    title: "Executive Articulation & Spoken Defense Masterclass",
    description:
      "An intensive live masterclass focusing on communicative authority, impromptu defense structuring, verbal cadence, and executive presence.",
    dayDate: "Saturday, 18 October 2026",
    time: "06:00 PM – 07:30 PM PKT",
    essentialInfo:
      "Review your capstone speaking notes and verify your audio configuration prior to entry.",
  },
  {
    id: "event-2",
    title: "Cross-Cultural Persuasion & Concession Seminar",
    description:
      "A specialized practical seminar analyzing diplomatic language patterns, tactful objection management, and executive concession phrasing.",
    dayDate: "Friday, 24 October 2026",
    time: "07:00 PM – 08:30 PM PKT",
    essentialInfo:
      "Prior review of Module 2 syntax patterns is recommended. Admission requires active student status.",
  },
];
