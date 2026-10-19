export type PracticeType = "reading" | "writing";

export type AssignmentStatus =
  | "Not Submitted"
  | "Submitted"
  | "Checking"
  | "Checked"
  | "Needs Review"
  | "Under Review"
  | "Reviewed"
  | "Revision Requested";

export interface Assignment {
  id: string; // e.g., "asgn_a1g_1_writing"
  courseId: string; // "A1G"
  moduleId: string; // "mod_a1g_1"
  lessonId: string; // "les_a1g_2"
  practiceType: PracticeType; // "reading" | "writing"
  title: string;
  contextText?: string;
  instructions: string;
  questionTask?: string;
  writingRequirements?: string;
  exampleReference?: string;
  referenceFileUrl?: string;
  maxMarks: number;
  rubric: string;
  timeGuidance?: string;
  wordCountGuidance?: string;
  language?: "German" | "English" | string;
  courseLevel?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Basic" | "Advanced" | string;
  resubmissionAllowed: boolean;
  isLocked?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionPage {
  pageNumber: number;
  originalUrl: string;
  optimizedUrl: string;
  storagePath?: string;
  fileSize: number; // in bytes
  width?: number;
  height?: number;
  fileName?: string;
  qualityWarning?: string | null;
}

export interface AiEvaluation {
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  strengths: string[];
  mistakes: string[];
  improvements: string[];
  grammarNotes?: string[];
  spellingNotes?: string[];
  vocabularyNotes?: string[];
  sentenceStructureNotes?: string[];
  taskCompletionNotes?: string[];
  confidence: number; // 0 - 100
  needsReview: boolean;
  reviewReason?: string;
  checkedAt: string;
  modelUsed?: string;
}

export interface SubmissionAttempt {
  attemptNumber: number;
  submittedAt: string;
  studentTextAnswer?: string;
  pages: SubmissionPage[];
  aiEvaluation?: AiEvaluation | null;
  aiScore?: number | null;
  aiFeedback?: string | null;
  finalScore?: number | null;
  finalFeedback?: string | null;
  adminReviewedAt?: string | null;
  adminReviewedBy?: string | null;
  status: AssignmentStatus;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  practiceType: PracticeType;
  studentId: string;
  studentEmail: string;
  studentName: string;
  studentNumber?: string;
  studentTextAnswer?: string;
  attemptNumber: number;
  status: AssignmentStatus;
  pages: SubmissionPage[];
  aiEvaluation?: AiEvaluation | null;
  aiScore?: number | null;
  aiFeedback?: string | null;
  finalScore?: number | null;
  finalFeedback?: string | null;
  adminReviewedAt?: string | null;
  adminReviewedBy?: string | null;
  history?: SubmissionAttempt[];
  submittedAt: string;
  updatedAt: string;
}

export interface AssignmentFilter {
  studentQuery?: string;
  courseId?: string;
  practiceType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}
