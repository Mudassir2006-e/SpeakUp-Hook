export interface LessonLinkButton {
  enabled: boolean;
  text: string;
  url: string;
  description?: string;
}

export interface LessonLinkItemRecord extends LessonLinkButton {
  courseId: string;
  moduleId: string;
  lessonId: string;
  updatedAt?: string;
}
