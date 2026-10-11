"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  getCentralCoursesAction,
  saveCentralCourseAction,
  deleteCentralCourseAction,
  getCourseCurriculumAction,
  addCourseModuleAction,
  updateCourseModuleAction,
  deleteCourseModuleAction,
  saveCourseLessonAction,
  deleteCourseLessonAction,
  uploadWebsiteAssetAction,
  uploadLearningMaterialAction,
} from "@/app/admin/cms-actions";
import {
  getFreeDemoConfigAction,
  saveFreeDemoAction,
  deleteFreeDemoAction,
  FreeDemoEntry,
} from "@/app/admin/free-demo-actions";
import { CentralCourse, getAllCentralCourses } from "@/config/unifiedCourses";
import ExpandableImageViewer from "@/components/ExpandableImageViewer";
import A4MaterialPreview, { LearningMaterialItem } from "@/components/A4MaterialPreview";
import SpeakUpVideoPlayer from "@/components/SpeakUpVideoPlayer";

const LANGUAGE_LEVEL_MAP: Record<string, string[]> = {
  German: ["A1", "A2", "B1", "B2", "C1", "C2"],
  English: ["Basic", "Basic Plus", "Intermediate", "Advanced"],
};

interface LessonItem {
  id: string;
  title: string;
  order_index?: number;
  video_url?: string;
  video_source?: "youtube" | "upload" | "drive" | "hosted" | "other";
  notes?: string;
  notes_image?: string;
  notes_pages?: string[];
  notes_materials?: LearningMaterialItem[];
  practice?: string;
  practice_image?: string;
  reading_title?: string;
  reading_content?: string;
  reading_materials?: LearningMaterialItem[];
}

interface ModuleItem {
  id: string;
  title: string;
  description?: string;
  order_index?: number;
  lessons: LessonItem[];
}

export default function AddCourseWorkspace() {
  const [courses, setCourses] = useState<CentralCourse[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Form State (Course Meta)
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [coursePrice, setCoursePrice] = useState<number | "">("");
  const [coursePriceUsd, setCoursePriceUsd] = useState<number | "">("");
  const [courseAvailability, setCourseAvailability] = useState<"available" | "upcoming">("available");
  const [durationWeeks, setDurationWeeks] = useState<number>(4);
  const [courseLevel, setCourseLevel] = useState("A1");
  const [courseLanguage, setCourseLanguage] = useState("German");
  const [uploadingCourseImage, setUploadingCourseImage] = useState(false);
  const [courseImage, setCourseImage] = useState(
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80"
  );

  // Free Demo Feature State (Requirements 8, 9, 10)
  const [mainWorkspaceTab, setMainWorkspaceTab] = useState<"courses" | "free-demo">("courses");
  const [freeDemoConfig, setFreeDemoConfig] = useState<Record<string, FreeDemoEntry>>({});
  const [selectedDemoCourseId, setSelectedDemoCourseId] = useState<string | null>(null);
  const [demoCurriculum, setDemoCurriculum] = useState<ModuleItem[]>([]);
  const [loadingDemoCurriculum, setLoadingDemoCurriculum] = useState<boolean>(false);
  const [demoSelectedModuleId, setDemoSelectedModuleId] = useState<string>("");
  const [demoSelectedLessonId, setDemoSelectedLessonId] = useState<string>("");
  const [previewDemoVideoUrl, setPreviewDemoVideoUrl] = useState<string | null>(null);
  const [demoPickerOpen, setDemoPickerOpen] = useState<boolean>(false);
  const [savingDemo, setSavingDemo] = useState<boolean>(false);
  const [deletingDemo, setDeletingDemo] = useState<boolean>(false);

  // Deletion Modal State
  const [courseToDelete, setCourseToDelete] = useState<CentralCourse | null>(null);
  const [deletingCourse, setDeletingCourse] = useState(false);

  // Course LMS Management Workspace State (Parts 5, 6, 7)
  const [managingCourseId, setManagingCourseId] = useState<string | null>(null);
  const [curriculum, setCurriculum] = useState<ModuleItem[]>([]);
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Module Modal / Inline State
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingModule, setAddingModule] = useState(false);

  // Video / Content Editor State (Video, Notes, Practice Materials, Reading Session tabs)
  const [activeContentTab, setActiveContentTab] = useState<"video" | "notes" | "practice" | "reading">("video");
  const [editingLessonTitle, setEditingLessonTitle] = useState("");
  const [editingLessonModuleId, setEditingLessonModuleId] = useState("");
  const [editingVideoUrl, setEditingVideoUrl] = useState("");
  const [editingVideoSource, setEditingVideoSource] = useState<"youtube" | "upload" | "drive" | "hosted" | "other">("youtube");
  const [editingNotes, setEditingNotes] = useState("");
  const [editingNotesImage, setEditingNotesImage] = useState("");
  const [editingNotesPages, setEditingNotesPages] = useState<string[]>([]);
  const [notesPageInputUrl, setNotesPageInputUrl] = useState("");
  const [previewNotesPageIndex, setPreviewNotesPageIndex] = useState(0);
  const [editingNotesMaterials, setEditingNotesMaterials] = useState<LearningMaterialItem[]>([]);
  const [uploadingNotesMaterial, setUploadingNotesMaterial] = useState(false);
  const [notesMaterialInputUrl, setNotesMaterialInputUrl] = useState("");
  const [notesMaterialInputName, setNotesMaterialInputName] = useState("");
  const [notesMaterialInputType, setNotesMaterialInputType] = useState<"image" | "pdf" | "video" | "document" | "url">("image");
  const [editingPractice, setEditingPractice] = useState("");
  const [editingPracticeImage, setEditingPracticeImage] = useState("");
  // Reading Session State (Requirement 6)
  const [editingReadingTitle, setEditingReadingTitle] = useState("");
  const [editingReadingContent, setEditingReadingContent] = useState("");
  const [editingReadingMaterials, setEditingReadingMaterials] = useState<LearningMaterialItem[]>([]);
  const [uploadingReadingMaterial, setUploadingReadingMaterial] = useState(false);
  const [readingMaterialInputUrl, setReadingMaterialInputUrl] = useState("");
  const [readingMaterialInputName, setReadingMaterialInputName] = useState("");
  const [savingLesson, setSavingLesson] = useState(false);

  // UI feedback
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Load existing courses & Free Demo config
  const loadFreeDemos = async () => {
    try {
      const res = await getFreeDemoConfigAction();
      if (res.success && res.data) {
        setFreeDemoConfig(res.data);
      }
    } catch {}
  };

  const loadCourses = async () => {
    try {
      const res = await getCentralCoursesAction();
      if (res.success && Array.isArray(res.data)) {
        const filtered = res.data.filter((c: any) => !/executive\s*speech/i.test(c.title));
        setCourses(filtered);
        if (typeof window !== "undefined") {
          localStorage.setItem("speakup_central_courses", JSON.stringify(filtered));
          window.dispatchEvent(new Event("speakup-central-courses-updated"));
        }
      } else {
        const local = getAllCentralCourses().filter((c: any) => !/executive\s*speech/i.test(c.title));
        setCourses(local);
      }
    } catch {
      const local = getAllCentralCourses().filter((c: any) => !/executive\s*speech/i.test(c.title));
      setCourses(local);
    }
  };

  useEffect(() => {
    loadCourses();
    loadFreeDemos();
  }, []);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const resetForm = () => {
    setSelectedCourseId(null);
    setCourseName("");
    setCourseDescription("");
    setCoursePrice("");
    setCoursePriceUsd("");
    setCourseAvailability("available");
    setDurationWeeks(4);
    setCourseLanguage("German");
    setCourseLevel("A1");
    setCourseImage("https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80");
    setPriceError(null);
  };

  const handleOpenNewCourse = () => {
    resetForm();
    setIsFormOpen(true);
    if (typeof window !== "undefined") {
      const el = document.getElementById("add-course-frame");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleEditCourse = (course: CentralCourse) => {
    setSelectedCourseId(course.id);
    setCourseName(course.title);
    setCourseDescription(course.description);
    setCoursePrice(course.price ?? "");
    setCoursePriceUsd(course.price_usd ?? "");
    setCourseAvailability(course.availability === "upcoming" ? "upcoming" : "available");
    setDurationWeeks(course.duration_weeks || 4);
    const detectedLang =
      (course.title && /german/i.test(course.title)) || ["A1", "A2", "B1", "B2", "C1", "C2"].includes(course.level || "")
        ? "German"
        : "English";
    setCourseLanguage(detectedLang);
    setCourseLevel(course.level || (detectedLang === "English" ? "Basic" : "A1"));
    setCourseImage(course.image || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80");
    setPriceError(null);
    setIsFormOpen(true);

    if (typeof window !== "undefined") {
      const el = document.getElementById("add-course-frame");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleUploadCourseImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCourseImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadWebsiteAssetAction(formData);
      if (res.success && res.data) {
        setCourseImage(res.data.url);
        showNotification("success", "Course thumbnail uploaded successfully.");
      } else {
        showNotification("error", res.error || "Failed to upload image.");
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to upload image.");
    } finally {
      setUploadingCourseImage(false);
    }
  };

  // Safe Course Deletion (Part 2 & Part 9)
  const handleConfirmDeleteCourse = async () => {
    if (!courseToDelete) return;
    setDeletingCourse(true);
    try {
      const res = await deleteCentralCourseAction(courseToDelete.id);
      if (res.success) {
        showNotification("success", `Course "${courseToDelete.title}" and its associated LMS content deleted successfully.`);
        if (selectedCourseId === courseToDelete.id) {
          resetForm();
          setIsFormOpen(false);
        }
        if (managingCourseId === courseToDelete.id) {
          setManagingCourseId(null);
        }
        await loadCourses();
      } else {
        showNotification("error", res.error || "Failed to delete course.");
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to delete course.");
    } finally {
      setDeletingCourse(false);
      setCourseToDelete(null);
    }
  };

  // Save or Publish Course Meta (Part 4)
  const handleSave = async (targetStatus: "draft" | "published") => {
    setPriceError(null);

    const trimmedTitle = courseName.trim();
    if (!trimmedTitle) {
      showNotification("error", "Course Name is mandatory.");
      return;
    }

    if (targetStatus === "published") {
      if (coursePrice === "" || Number(coursePrice) <= 0 || isNaN(Number(coursePrice))) {
        setPriceError("A valid price greater than 0 PKR is required to publish this course.");
        showNotification("error", "Please provide a valid Course Price before publishing.");
        return;
      }
    }

    const priceNum = coursePrice === "" ? 0 : Number(coursePrice);
    const priceUsd = coursePriceUsd === "" ? 0 : Number(coursePriceUsd);
    const resolvedSlug = trimmedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `course-${Date.now()}`;

    setSaving(true);
    try {
      const courseId = selectedCourseId || trimmedTitle.replace(/\s+/g, "-") || `course_${Date.now()}`;
      const existing = courses.find((c) => c.id === courseId);
      const payload: CentralCourse = {
        id: courseId,
        title: trimmedTitle,
        slug: selectedCourseId ? (existing?.slug || resolvedSlug) : resolvedSlug,
        description: courseDescription.trim(),
        price: priceNum,
        price_usd: priceUsd,
        availability: courseAvailability,
        status: targetStatus,
        duration_weeks: durationWeeks,
        level: courseLevel,
        image: courseImage,
        created_at: existing?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const res = await saveCentralCourseAction(payload);
      if (res.success) {
        showNotification(
          "success",
          targetStatus === "published"
            ? `Course "${trimmedTitle}" published successfully across the platform!`
            : `Course "${trimmedTitle}" saved as draft.`
        );
        setIsFormOpen(false);
        resetForm();
        await loadCourses();
      } else {
        showNotification("error", res.error || "Failed to save course.");
      }
    } catch (err: any) {
      showNotification("error", err?.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // ================= FREE DEMO ACTIONS & HANDLERS (Reqs 8, 9, 10) =========
  // =========================================================================
  const handleSelectDemoCourse = async (courseId: string) => {
    setSelectedDemoCourseId(courseId);
    setDemoPickerOpen(false);
    setPreviewDemoVideoUrl(null);
    setLoadingDemoCurriculum(true);
    try {
      const res = await getCourseCurriculumAction(courseId);
      if (res.success && res.data?.modules) {
        setDemoCurriculum(res.data.modules);
        const firstMod = res.data.modules[0];
        setDemoSelectedModuleId(firstMod?.id || "");
        const firstLes = firstMod?.lessons?.[0];
        setDemoSelectedLessonId(firstLes?.id || "");
      } else {
        setDemoCurriculum([]);
        setDemoSelectedModuleId("");
        setDemoSelectedLessonId("");
      }
    } catch {
      setDemoCurriculum([]);
    } finally {
      setLoadingDemoCurriculum(false);
    }
  };

  const handleOpenDemoPicker = async () => {
    if (!selectedDemoCourseId) return;
    setLoadingDemoCurriculum(true);
    try {
      const res = await getCourseCurriculumAction(selectedDemoCourseId);
      if (res.success && res.data?.modules) {
        setDemoCurriculum(res.data.modules);
        const activeDemo = freeDemoConfig[selectedDemoCourseId];
        if (activeDemo && activeDemo.moduleId) {
          setDemoSelectedModuleId(activeDemo.moduleId);
          setDemoSelectedLessonId(activeDemo.lessonId || "");
        } else {
          const firstMod = res.data.modules[0];
          setDemoSelectedModuleId(firstMod?.id || "");
          const firstLes = firstMod?.lessons?.[0];
          setDemoSelectedLessonId(firstLes?.id || "");
        }
      }
      setDemoPickerOpen(true);
    } catch {
      showNotification("error", "Failed to load course modules for Free Demo.");
    } finally {
      setLoadingDemoCurriculum(false);
    }
  };

  const handleSaveFreeDemo = async () => {
    if (!selectedDemoCourseId) return;
    const selectedCourse = courses.find((c) => c.id === selectedDemoCourseId);
    if (!selectedCourse) return;

    const mod = demoCurriculum.find((m) => m.id === demoSelectedModuleId);
    const les = mod?.lessons?.find((l) => l.id === demoSelectedLessonId);

    if (!mod || !les) {
      showNotification("error", "Please select an existing module and lesson with a video.");
      return;
    }

    if (!les.video_url) {
      showNotification("error", `Lesson "${les.title}" does not have a video attached yet. Please select a lesson with an existing video.`);
      return;
    }

    setSavingDemo(true);
    try {
      const res = await saveFreeDemoAction({
        courseId: selectedDemoCourseId,
        courseTitle: selectedCourse.title,
        moduleId: mod.id,
        moduleTitle: mod.title,
        lessonId: les.id,
        lessonTitle: les.title,
        videoUrl: les.video_url,
        videoSource: les.video_source || "youtube",
      });

      if (res.success && res.data) {
        setFreeDemoConfig((prev) => ({
          ...prev,
          [selectedDemoCourseId]: res.data!,
        }));
        setDemoPickerOpen(false);
        showNotification("success", `Free Demo saved for "${selectedCourse.title}"! Public website updated.`);
      } else {
        showNotification("error", res.error || "Failed to save Free Demo.");
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to save Free Demo.");
    } finally {
      setSavingDemo(false);
    }
  };

  const handleDeleteFreeDemo = async () => {
    if (!selectedDemoCourseId) return;
    const selectedCourse = courses.find((c) => c.id === selectedDemoCourseId);
    if (!confirm(`Are you sure you want to remove the Free Demo for "${selectedCourse?.title || "this course"}"? The public website will no longer display a free demo for this course.`)) {
      return;
    }

    setDeletingDemo(true);
    try {
      const res = await deleteFreeDemoAction(selectedDemoCourseId);
      if (res.success) {
        setFreeDemoConfig((prev) => {
          const next = { ...prev };
          delete next[selectedDemoCourseId];
          return next;
        });
        showNotification("success", `Free Demo removed for "${selectedCourse?.title || "course"}". Public website updated.`);
      } else {
        showNotification("error", res.error || "Failed to delete Free Demo.");
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to delete Free Demo.");
    } finally {
      setDeletingDemo(false);
    }
  };

  // Open Course LMS Management Workspace (Parts 5, 6, 7)
  const handleOpenCourseLMS = async (courseId: string) => {
    setManagingCourseId(courseId);
    setCurriculumLoading(true);
    setSelectedLessonId(null);
    setSelectedModuleId(null);

    try {
      const res = await getCourseCurriculumAction(courseId);
      if (res.success && res.data) {
        setCurriculum(res.data.modules || []);
        if (res.data.modules && res.data.modules.length > 0) {
          setSelectedModuleId(res.data.modules[0].id);
          if (res.data.modules[0].lessons && res.data.modules[0].lessons.length > 0) {
            handleSelectLesson(res.data.modules[0].id, res.data.modules[0].lessons[0]);
          }
        }
      }
    } catch {
      setCurriculum([]);
    } finally {
      setCurriculumLoading(false);
    }
  };

  const handleSelectLesson = (moduleId: string, lesson: LessonItem) => {
    setSelectedModuleId(moduleId);
    setSelectedLessonId(lesson.id);
    setEditingLessonModuleId(moduleId);
    setEditingLessonTitle(lesson.title);
    setEditingVideoUrl(lesson.video_url || "");
    setEditingVideoSource(lesson.video_source || "youtube");
    setEditingNotes(lesson.notes || "");
    setEditingNotesImage(lesson.notes_image || "");

    const initialPages =
      lesson.notes_pages && lesson.notes_pages.length > 0
        ? lesson.notes_pages
        : lesson.notes_image
        ? [lesson.notes_image]
        : [];
    setEditingNotesPages(initialPages);
    setPreviewNotesPageIndex(0);

    const mats =
      lesson.notes_materials && lesson.notes_materials.length > 0
        ? lesson.notes_materials
        : lesson.notes_image
        ? [
            {
              id: `mat_${Date.now()}`,
              url: lesson.notes_image,
              name: "Lecture Notes Document",
              type: "image" as const,
            },
          ]
        : [];
    setEditingNotesMaterials(mats);
    setNotesMaterialInputUrl("");
    setNotesMaterialInputName("");

    setEditingPractice(lesson.practice || "");
    setEditingPracticeImage(lesson.practice_image || "");

    setEditingReadingTitle(lesson.reading_title || "");
    setEditingReadingContent(lesson.reading_content || "");
    setEditingReadingMaterials(lesson.reading_materials || []);
    setReadingMaterialInputUrl("");
    setReadingMaterialInputName("");

    setActiveContentTab("video");
  };

  const handleCreateNewLessonDraft = (targetModuleId?: string) => {
    const modId = targetModuleId || selectedModuleId || (curriculum[0]?.id ?? "");
    if (!modId) {
      showNotification("error", "Please add a module first before adding a video.");
      return;
    }
    const modLessons = curriculum.find((m) => m.id === modId)?.lessons || [];
    setSelectedModuleId(modId);
    setSelectedLessonId("new");
    setEditingLessonModuleId(modId);
    setEditingLessonTitle(`Video ${modLessons.length + 1}`);
    setEditingVideoUrl("");
    setEditingVideoSource("youtube");
    setEditingNotes("");
    setEditingNotesImage("");
    setEditingNotesMaterials([]);
    setNotesMaterialInputUrl("");
    setNotesMaterialInputName("");
    setEditingPractice("");
    setEditingPracticeImage("");
    setEditingReadingTitle("");
    setEditingReadingContent("");
    setEditingReadingMaterials([]);
    setReadingMaterialInputUrl("");
    setReadingMaterialInputName("");
    setActiveContentTab("video");
  };

  const handleUploadNotesMaterial = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingNotesMaterial(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadLearningMaterialAction(formData);
      if (res.success && res.data) {
        const newItem: LearningMaterialItem = {
          id: `mat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          url: res.data.url,
          name: res.data.fileName || "Lecture Material",
          type: res.data.fileType,
          size: res.data.size,
        };
        setEditingNotesMaterials((prev) => [...prev, newItem]);
        if (!editingNotesImage && newItem.type === "image") {
          setEditingNotesImage(newItem.url);
        }
        showNotification("success", `File "${res.data.fileName}" uploaded to learning storage!`);
      } else {
        showNotification("error", res.error || "Failed to upload file.");
      }
    } catch {
      showNotification("error", "Error uploading file.");
    } finally {
      setUploadingNotesMaterial(false);
      e.target.value = "";
    }
  };

  const handleAddNotesMaterialUrl = () => {
    if (!notesMaterialInputUrl.trim()) return;
    const url = notesMaterialInputUrl.trim();
    const name = notesMaterialInputName.trim() || `Material ${editingNotesMaterials.length + 1}`;
    const newItem: LearningMaterialItem = {
      id: `mat_${Date.now()}`,
      url,
      name,
      type: notesMaterialInputType,
    };
    setEditingNotesMaterials((prev) => [...prev, newItem]);
    if (!editingNotesImage && newItem.type === "image") {
      setEditingNotesImage(url);
    }
    setNotesMaterialInputUrl("");
    setNotesMaterialInputName("");
    showNotification("success", "Material link added.");
  };

  const handleUploadNotesPagesFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        showNotification("error", `File "${file.name}" is not a supported image.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const resultUrl = loadEvt.target?.result as string;
        if (resultUrl) {
          setEditingNotesPages((prev) => [...prev, resultUrl]);
          if (!editingNotesImage) setEditingNotesImage(resultUrl);
        }
      };
      reader.readAsDataURL(file);
    });

    showNotification("success", `${files.length} page(s) added to A4 notes.`);
    e.target.value = "";
  };

  const handleAddNotePageUrl = () => {
    const url = notesPageInputUrl.trim();
    if (!url) return;
    setEditingNotesPages((prev) => [...prev, url]);
    if (!editingNotesImage) setEditingNotesImage(url);
    setNotesPageInputUrl("");
    showNotification("success", "Note page URL added.");
  };

  const handleMoveNotePage = (index: number, direction: "up" | "down") => {
    setEditingNotesPages((prev) => {
      const copy = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleReplaceNotePageFile = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const resultUrl = loadEvt.target?.result as string;
      if (resultUrl) {
        setEditingNotesPages((prev) => {
          const copy = [...prev];
          copy[index] = resultUrl;
          return copy;
        });
        showNotification("success", `Page ${index + 1} replaced successfully.`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveNotePage = (index: number) => {
    setEditingNotesPages((prev) => prev.filter((_, i) => i !== index));
    if (previewNotesPageIndex >= index && previewNotesPageIndex > 0) {
      setPreviewNotesPageIndex((prev) => prev - 1);
    }
    showNotification("success", `Page ${index + 1} removed.`);
  };

  const handleClearAllNotesPages = () => {
    setEditingNotesPages([]);
    setEditingNotesImage("");
    setPreviewNotesPageIndex(0);
    showNotification("success", "All note pages cleared.");
  };

  const handleRemoveNotesMaterial = (id: string) => {
    setEditingNotesMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUploadReadingMaterial = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReadingMaterial(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadLearningMaterialAction(formData);
      if (res.success && res.data) {
        const newItem: LearningMaterialItem = {
          id: `read_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          url: res.data.url,
          name: res.data.fileName || "Reading Material",
          type: res.data.fileType,
          size: res.data.size,
        };
        setEditingReadingMaterials((prev) => [...prev, newItem]);
        showNotification("success", `Reading document "${res.data.fileName}" uploaded!`);
      } else {
        showNotification("error", res.error || "Failed to upload reading file.");
      }
    } catch {
      showNotification("error", "Error uploading reading document.");
    } finally {
      setUploadingReadingMaterial(false);
      e.target.value = "";
    }
  };

  const handleAddReadingMaterialUrl = () => {
    if (!readingMaterialInputUrl.trim()) return;
    const url = readingMaterialInputUrl.trim();
    const name = readingMaterialInputName.trim() || `Reading Resource ${editingReadingMaterials.length + 1}`;
    const newItem: LearningMaterialItem = {
      id: `read_${Date.now()}`,
      url,
      name,
      type: url.toLowerCase().endsWith(".pdf") ? "pdf" : "document",
    };
    setEditingReadingMaterials((prev) => [...prev, newItem]);
    setReadingMaterialInputUrl("");
    setReadingMaterialInputName("");
    showNotification("success", "Reading link attached.");
  };

  const handleRemoveReadingMaterial = (id: string) => {
    setEditingReadingMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSaveLessonContent = async () => {
    if (!managingCourseId || !editingLessonModuleId) return;
    if (!editingLessonTitle.trim()) {
      showNotification("error", "Video Title is required.");
      return;
    }

    setSavingLesson(true);
    try {
      const isNew = selectedLessonId === "new" || !selectedLessonId;
      const res = await saveCourseLessonAction(managingCourseId, editingLessonModuleId, {
        id: isNew ? undefined : selectedLessonId,
        title: editingLessonTitle.trim(),
        video_url: editingVideoUrl.trim(),
        video_source: editingVideoSource,
        notes: editingNotes,
        notes_image: editingNotesPages[0] || editingNotesMaterials[0]?.url || editingNotesImage.trim(),
        notes_pages: editingNotesPages,
        notes_materials: editingNotesMaterials,
        practice: editingPractice,
        practice_image: editingPracticeImage.trim(),
        reading_title: editingReadingTitle.trim(),
        reading_content: editingReadingContent,
        reading_materials: editingReadingMaterials,
      });

      if (res.success && res.data?.lesson) {
        showNotification("success", `Video "${editingLessonTitle}" saved successfully!`);
        // Refresh curriculum
        const curRes = await getCourseCurriculumAction(managingCourseId);
        if (curRes.success && curRes.data) {
          setCurriculum(curRes.data.modules || []);
        }
        setSelectedLessonId(res.data.lesson.id);
      } else {
        showNotification("error", res.error || "Failed to save video.");
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to save video.");
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!managingCourseId) return;
    if (!confirm("Delete this lesson from the module?")) return;

    try {
      const res = await deleteCourseLessonAction(managingCourseId, moduleId, lessonId);
      if (res.success) {
        showNotification("success", "Lesson deleted successfully.");
        const curRes = await getCourseCurriculumAction(managingCourseId);
        if (curRes.success && curRes.data) {
          setCurriculum(curRes.data.modules || []);
        }
        if (selectedLessonId === lessonId) {
          setSelectedLessonId(null);
        }
      } else {
        showNotification("error", res.error || "Failed to delete lesson.");
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to delete lesson.");
    }
  };

  const handleCreateModule = async () => {
    if (!managingCourseId) return;
    const title = newModuleTitle.trim();
    if (!title) {
      showNotification("error", "Module title cannot be empty.");
      return;
    }

    setAddingModule(true);
    try {
      const res = await addCourseModuleAction(managingCourseId, title);
      if (res.success && res.data?.module) {
        showNotification("success", `Module "${title}" created successfully!`);
        setShowAddModuleModal(false);
        setNewModuleTitle("");
        const curRes = await getCourseCurriculumAction(managingCourseId);
        if (curRes.success && curRes.data) {
          setCurriculum(curRes.data.modules || []);
        }
        setSelectedModuleId(res.data.module.id);
      } else {
        showNotification("error", res.error || "Failed to create module.");
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to create module.");
    } finally {
      setAddingModule(false);
    }
  };

  const handleDeleteModule = async (moduleId: string, moduleTitle: string) => {
    if (!managingCourseId) return;
    if (!confirm(`Delete "${moduleTitle}" and all its lessons?`)) return;

    try {
      const res = await deleteCourseModuleAction(managingCourseId, moduleId);
      if (res.success) {
        showNotification("success", `Module "${moduleTitle}" deleted.`);
        const curRes = await getCourseCurriculumAction(managingCourseId);
        if (curRes.success && curRes.data) {
          setCurriculum(curRes.data.modules || []);
        }
        if (selectedModuleId === moduleId) {
          setSelectedModuleId(null);
          setSelectedLessonId(null);
        }
      } else {
        showNotification("error", res.error || "Failed to delete module.");
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to delete module.");
    }
  };

  const managingCourse = courses.find((c) => c.id === managingCourseId);

  // Helper to extract YouTube embed URL for preview
  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px]">
              {notification.type === "success" ? "check_circle" : "error"}
            </span>
            <span className="font-serif text-sm font-medium">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL (Part 2 & Part 9) ================= */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-lowest)] border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                  Delete this course?
                </h3>
                <p className="font-serif text-xs text-[var(--text-muted)]">
                  Safe deletion confirmation
                </p>
              </div>
            </div>

            <div className="font-serif text-sm text-[var(--text-muted)] leading-relaxed space-y-2">
              <p>
                Are you sure you want to permanently delete <strong className="text-[var(--text-main)]">{courseToDelete.title}</strong>?
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                This will remove the course entity and cascade delete all associated modules, lessons, notes, and videos. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                disabled={deletingCourse}
                className="px-5 py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCourse}
                disabled={deletingCourse}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {deletingCourse ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Delete Course</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD MODULE MODAL (Part 5) ================= */}
      {showAddModuleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d4af37]">folder</span>
                <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                  Add New Module
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModuleModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                Module Title <span className="text-[#d4af37]">*</span>
              </label>
              <input
                type="text"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                placeholder="e.g. Module 1: Foundational Syntax & Tenses"
                className="w-full px-4 py-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-sm focus:outline-hidden focus:border-[#d4af37] transition-colors"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setShowAddModuleModal(false)}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-[var(--text-main)] font-display text-xs uppercase font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateModule}
                disabled={addingModule}
                className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase font-bold shadow-xs flex items-center gap-1.5"
              >
                {addingModule ? "Creating..." : "Create Module"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ================= IF IN LMS MANAGEMENT WORKSPACE MODE (Parts 5, 6, 7) ===== */}
      {/* ========================================================================= */}
      {managingCourse ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Breadcrumb & Actions Bar */}
          <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setManagingCourseId(null)}
                className="p-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                title="Back to All Courses"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-[10px] uppercase font-bold tracking-widest text-[#d4af37]">
                    LMS Content Workspace
                  </span>
                  <span className="text-[var(--text-muted)] text-xs">•</span>
                  <span className="font-display text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    {managingCourse.status === "published" ? "Published" : "Draft"}
                  </span>
                </div>
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[var(--text-main)]">
                  {managingCourse.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/lms/learn?course=${managingCourse.id}&preview=admin`}
                target="_blank"
                className="px-4 py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)] hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <span>View in Student LMS</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </Link>
            </div>
          </div>

          {/* TWO-COLUMN COURSE MANAGEMENT (Part 6: Course-Specific Left Panel) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / COURSE PANEL (4 cols) */}
            <div className="lg:col-span-4 bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl p-5 space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
                <div className="space-y-0.5">
                  <span className="font-display text-[10px] uppercase font-bold tracking-widest text-[#d4af37]">
                    Structure
                  </span>
                  <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                    Curriculum Hierarchy
                  </h3>
                </div>
                <span className="font-mono text-[11px] text-[var(--text-muted)] bg-[var(--surface-low)] px-2 py-0.5 rounded-md border border-[var(--surface-border)]">
                  {curriculum.length} Modules
                </span>
              </div>

              {/* Quick Actions Panel */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewModuleTitle(`Module ${curriculum.length + 1}`);
                    setShowAddModuleModal(true);
                  }}
                  className="py-2.5 px-3 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)] hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
                  <span>+ Module</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateNewLessonDraft()}
                  className="py-2.5 px-3 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>+ Video</span>
                </button>
              </div>

              {/* Content Tree */}
              {curriculumLoading ? (
                <div className="py-8 text-center space-y-2">
                  <span className="inline-block w-5 h-5 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></span>
                  <p className="font-serif text-xs text-[var(--text-muted)]">Loading curriculum...</p>
                </div>
              ) : curriculum.length === 0 ? (
                <div className="py-8 px-4 text-center border border-dashed border-[var(--surface-border)] rounded-xl space-y-2">
                  <span className="material-symbols-outlined text-3xl text-[var(--text-muted)] block">folder_open</span>
                  <p className="font-serif text-xs text-[var(--text-muted)]">
                    No modules yet. Click <strong>+ Module</strong> to create the first module for {managingCourse.title}.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {curriculum.map((mod, mIdx) => (
                    <div key={mod.id} className="space-y-1.5">
                      {/* Module Header */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)]">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="material-symbols-outlined text-[16px] text-[#d4af37] shrink-0">folder</span>
                          <span className="font-display text-xs font-bold text-[var(--text-main)] truncate">
                            {mod.title || `Module ${mIdx + 1}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCreateNewLessonDraft(mod.id)}
                            className="px-2 py-1 rounded-md text-[11px] font-display uppercase font-bold text-[#d4af37] hover:bg-[#d4af37]/15 cursor-pointer flex items-center gap-0.5"
                            title="Add Video to this module"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                            <span>Video</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteModule(mod.id, mod.title)}
                            className="p-1 text-[var(--text-muted)] hover:text-red-500 cursor-pointer rounded-md"
                            title="Delete Module"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Video List under Module (Flexible Number of Videos) */}
                      <div className="pl-3 space-y-1 border-l-2 border-[var(--surface-border)] ml-3">
                        {mod.lessons && mod.lessons.length > 0 ? (
                          mod.lessons.map((les, vIdx) => {
                            const isSelected = selectedLessonId === les.id;
                            const hasVideo = Boolean(les.video_url);
                            const hasNotes = Boolean(les.notes && les.notes.length > 0);
                            const hasPractice = Boolean(les.practice && les.practice.length > 0);
                            const hasImages = Boolean(les.notes_image || les.practice_image);

                            return (
                              <div
                                key={les.id}
                                onClick={() => handleSelectLesson(mod.id, les)}
                                className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? "bg-[#d4af37]/20 border border-[#d4af37] text-[var(--text-main)] font-semibold shadow-2xs"
                                    : "hover:bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-transparent"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="material-symbols-outlined text-[15px] text-[#d4af37] shrink-0">
                                    videocam
                                  </span>
                                  <span className="font-serif text-xs truncate">
                                    Video {vIdx + 1}: {les.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {hasVideo && (
                                    <span className="material-symbols-outlined text-[13px] text-emerald-500" title="Has Video">
                                      play_circle
                                    </span>
                                  )}
                                  {hasNotes && (
                                    <span className="material-symbols-outlined text-[13px] text-amber-500" title="Has Lecture Notes">
                                      description
                                    </span>
                                  )}
                                  {hasPractice && (
                                    <span className="material-symbols-outlined text-[13px] text-sky-500" title="Has Practice Materials">
                                      assignment
                                    </span>
                                  )}
                                  {hasImages && (
                                    <span className="material-symbols-outlined text-[13px] text-[#d4af37]" title="Has Attached Document/Image">
                                      photo_library
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div
                            onClick={() => handleCreateNewLessonDraft(mod.id)}
                            className="p-2.5 rounded-lg text-[11px] font-serif text-[var(--text-muted)] hover:text-[#d4af37] cursor-pointer italic"
                          >
                            + Add first video
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT WORKSPACE: CONTENT ITEM EDITOR (8 cols) */}
            <div className="lg:col-span-8 bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
              {selectedLessonId ? (
                <div className="space-y-6">
                  {/* Editor Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--surface-border)]">
                    <div>
                      <span className="font-display text-[10px] uppercase font-bold tracking-widest text-[#d4af37]">
                        {selectedLessonId === "new" ? "New Video Item Draft" : "Editing Video Content Item"}
                      </span>
                      <h2 className="font-display text-xl font-bold text-[var(--text-main)]">
                        {editingLessonTitle || "Untitled Video"}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedLessonId !== "new" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteLesson(editingLessonModuleId, selectedLessonId)}
                          className="px-3 py-2 rounded-xl border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-display text-xs uppercase font-bold transition-all cursor-pointer flex items-center gap-1.5"
                          title="Delete this video from module"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          <span>Delete Video</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveLessonContent}
                        disabled={savingLesson}
                        className="px-6 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {savingLesson ? "Saving..." : "Save Content"}
                      </button>
                    </div>
                  </div>

                  {/* 3 CLEAR TABS: [ Video ] [ Notes ] [ Practice Materials ] (Requirement 10) */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-[var(--surface-border)] pb-3">
                    <button
                      type="button"
                      onClick={() => setActiveContentTab("video")}
                      className={`px-4 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeContentTab === "video"
                          ? "bg-[#d4af37] text-[#141416] shadow-xs"
                          : "border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[17px]">videocam</span>
                      <span>Video</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveContentTab("notes")}
                      className={`px-4 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeContentTab === "notes"
                          ? "bg-[#d4af37] text-[#141416] shadow-xs"
                          : "border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[17px]">description</span>
                      <span>Notes</span>
                      {editingNotesImage && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" title="Has image" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveContentTab("practice")}
                      className={`px-4 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeContentTab === "practice"
                          ? "bg-[#d4af37] text-[#141416] shadow-xs"
                          : "border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[17px]">assignment</span>
                      <span>Practice Materials</span>
                      {editingPracticeImage && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" title="Has image" />
                      )}
                    </button>
                  </div>

                  {/* Basic Metadata (Always visible above tabs or inside Video tab) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                        Video Title <span className="text-[#d4af37]">*</span>
                      </label>
                      <input
                        type="text"
                        value={editingLessonTitle}
                        onChange={(e) => setEditingLessonTitle(e.target.value)}
                        placeholder="e.g. Video 1: Master Subject-Verb Concord"
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-sm focus:outline-hidden focus:border-[#d4af37] transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                        Belongs to Module
                      </label>
                      <select
                        value={editingLessonModuleId}
                        onChange={(e) => setEditingLessonModuleId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-sm focus:outline-hidden focus:border-[#d4af37] transition-colors cursor-pointer"
                      >
                        {curriculum.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ================= TAB 1: VIDEO ================= */}
                  {activeContentTab === "video" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Video Source Selection (Requirement 8) */}
                      <div className="space-y-2 p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)]">
                        <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                          Video Source Type
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[
                            { id: "youtube", label: "YouTube URL", icon: "smart_display" },
                            { id: "upload", label: "Uploaded / Local Video", icon: "cloud_upload" },
                            { id: "drive", label: "Google Drive / External", icon: "folder_shared" },
                          ].map((src) => (
                            <button
                              key={src.id}
                              type="button"
                              onClick={() => setEditingVideoSource(src.id as any)}
                              className={`p-2.5 rounded-xl border font-display text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                editingVideoSource === src.id
                                  ? "bg-[#d4af37] text-[#141416] border-[#d4af37] shadow-xs"
                                  : "border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#d4af37]"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[16px]">{src.icon}</span>
                              <span>{src.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Video URL Input */}
                        <div className="space-y-1.5 pt-2">
                          <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                            {editingVideoSource === "youtube"
                              ? "YouTube Video URL or Video ID"
                              : editingVideoSource === "upload"
                              ? "Uploaded Video Stream URL / Path (MP4, WebM)"
                              : "Google Drive or Hosted Preview Link"}
                          </label>
                          <input
                            type="url"
                            value={editingVideoUrl}
                            onChange={(e) => setEditingVideoUrl(e.target.value)}
                            placeholder={
                              editingVideoSource === "youtube"
                                ? "https://www.youtube.com/watch?v=... or direct 11-char ID"
                                : editingVideoSource === "upload"
                                ? "https://your-storage.com/lesson-01.mp4 or /videos/lesson-01.mp4"
                                : "https://drive.google.com/file/d/.../preview"
                            }
                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-sm focus:outline-hidden focus:border-[#d4af37] transition-colors"
                          />
                          <p className="font-serif text-[11px] text-[var(--text-muted)]">
                            {editingVideoSource === "youtube"
                              ? "Embedded securely with custom SpeakUp learning controls; external YouTube clutter is cleanly suppressed."
                              : editingVideoSource === "upload"
                              ? "Direct MP4 streams play natively with full SpeakUp custom playback controls."
                              : "Supports Google Drive preview frames or external hosted player streams."}
                          </p>
                        </div>

                        {/* Video Preview */}
                        {editingVideoUrl && (
                          <div className="pt-2">
                            <span className="font-display text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] block mb-1.5">
                              Player Preview
                            </span>
                            <div className="aspect-video w-full rounded-xl overflow-hidden border border-[var(--surface-border)] bg-black flex items-center justify-center">
                              {editingVideoSource === "upload" || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(editingVideoUrl) ? (
                                <video src={editingVideoUrl} controls className="w-full h-full object-contain" />
                              ) : editingVideoSource === "drive" || editingVideoUrl.includes("drive.google.com") ? (
                                <iframe
                                  src={
                                    editingVideoUrl.includes("/preview")
                                      ? editingVideoUrl
                                      : editingVideoUrl.replace(/\/view(\?.*)?$/, "/preview")
                                  }
                                  className="w-full h-full border-0"
                                  title="Drive Preview"
                                  allow="autoplay"
                                />
                              ) : getEmbedUrl(editingVideoUrl) ? (
                                <iframe
                                  src={getEmbedUrl(editingVideoUrl)!}
                                  className="w-full h-full border-0"
                                  allowFullScreen
                                  title="Video preview"
                                />
                              ) : (
                                <div className="p-4 text-center text-white/60 font-serif text-xs">
                                  Preview unavailable for this format. Saved video source will play in the Student LMS player.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ================= TAB 2: NOTES ================= */}
                  {activeContentTab === "notes" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px] text-[#d4af37]">description</span>
                            <span>Lecture Notes &amp; Academic Summary</span>
                          </label>
                          <span className="font-serif text-[11px] text-[var(--text-muted)]">
                            Students have READ-ONLY and COPY permissions
                          </span>
                        </div>
                        <textarea
                          rows={8}
                          value={editingNotes}
                          onChange={(e) => setEditingNotes(e.target.value)}
                          placeholder="Enter comprehensive lecture notes, grammar rules, vocabulary lists, and reference guidelines for this video..."
                          className="w-full px-4 py-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-sm focus:outline-hidden focus:border-[#d4af37] transition-colors"
                        />
                      </div>

                      {/* Multi-Page A4 Notes Manager (Phase 9) */}
                      <div className="space-y-4 p-5 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-low)]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--surface-border)]">
                          <div className="flex items-center gap-2 text-[#d4af37]">
                            <span className="material-symbols-outlined text-[20px]">menu_book</span>
                            <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                              A4 Study Notes &amp; Document Pages (Multi-Page Manager)
                            </label>
                          </div>
                          {editingNotesPages.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAllNotesPages}
                              className="text-xs font-display uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-colors cursor-pointer self-start sm:self-auto"
                            >
                              Clear All ({editingNotesPages.length})
                            </button>
                          )}
                        </div>

                        <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                          Upload one or multiple note images (A4 portrait scans, handwritten lecture notes, infographics, or grammar summaries). No 1-page or 5-page limits. Students can browse all pages smoothly in an A4 portrait reader.
                        </p>

                        {/* Upload & Add Controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* Device File Picker (Screenshots, gallery, local folders) */}
                          <div>
                            <label className="block text-[11px] font-display uppercase tracking-wider font-bold text-[var(--text-muted)] mb-1">
                              Upload From Device (Multi-Image)
                            </label>
                            <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-lowest)] hover:bg-[#d4af37]/5 text-xs font-display font-bold uppercase tracking-wider text-[var(--text-main)] transition-colors cursor-pointer text-center">
                              <span className="material-symbols-outlined text-[18px] text-[#d4af37]">upload_file</span>
                              <span>Select Images from Device</span>
                              <input
                                type="file"
                                multiple
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleUploadNotesPagesFiles}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {/* Add via URL */}
                          <div>
                            <label className="block text-[11px] font-display uppercase tracking-wider font-bold text-[var(--text-muted)] mb-1">
                              Add By Image URL
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={notesPageInputUrl}
                                onChange={(e) => setNotesPageInputUrl(e.target.value)}
                                placeholder="https://... image link"
                                className="flex-1 px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-xs focus:outline-hidden focus:border-[#d4af37]"
                              />
                              <button
                                type="button"
                                onClick={handleAddNotePageUrl}
                                disabled={!notesPageInputUrl.trim()}
                                className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-40 text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer shrink-0"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Staged Pages List with Reordering & Replacement */}
                        {editingNotesPages.length > 0 ? (
                          <div className="space-y-4 pt-3">
                            <div className="flex items-center justify-between">
                              <h5 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                                Uploaded Pages ({editingNotesPages.length})
                              </h5>
                              <span className="font-serif text-[11px] text-[var(--text-muted)]">
                                Use arrows to reorder pages in chronological reading sequence
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {editingNotesPages.map((pageUrl, idx) => (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-xl border transition-all ${
                                    previewNotesPageIndex === idx
                                      ? "border-[#d4af37] bg-[#d4af37]/5 shadow-xs"
                                      : "border-[var(--surface-border)] bg-[var(--surface-lowest)]"
                                  }`}
                                >
                                  <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border)] mb-2">
                                    <span className="font-mono text-xs font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                                      Page {idx + 1}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleMoveNotePage(idx, "up")}
                                        disabled={idx === 0}
                                        className="p-1 rounded hover:bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 cursor-pointer"
                                        title="Move Up"
                                      >
                                        <span className="material-symbols-outlined text-[15px]">arrow_upward</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleMoveNotePage(idx, "down")}
                                        disabled={idx === editingNotesPages.length - 1}
                                        className="p-1 rounded hover:bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 cursor-pointer"
                                        title="Move Down"
                                      >
                                        <span className="material-symbols-outlined text-[15px]">arrow_downward</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveNotePage(idx)}
                                        className="p-1 rounded hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                                        title="Delete Page"
                                      >
                                        <span className="material-symbols-outlined text-[15px]">delete</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Thumbnail */}
                                  <div
                                    onClick={() => setPreviewNotesPageIndex(idx)}
                                    className="aspect-[1/1.414] w-full rounded-lg bg-[var(--surface-low)] overflow-hidden cursor-pointer relative group flex items-center justify-center border border-[var(--surface-border)]/60"
                                  >
                                    <img
                                      src={pageUrl}
                                      alt={`Note Page ${idx + 1}`}
                                      className="w-full h-full object-contain"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-display uppercase tracking-wider font-bold">
                                      Click to Preview
                                    </div>
                                  </div>

                                  {/* Replace individual page file */}
                                  <div className="mt-2 pt-2 border-t border-[var(--surface-border)] flex items-center justify-between">
                                    <label className="text-[10px] font-display uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37] hover:underline cursor-pointer flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[13px]">swap_horiz</span>
                                      <span>Replace Page</span>
                                      <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={(e) => handleReplaceNotePageFile(idx, e)}
                                        className="hidden"
                                      />
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Live Interactive A4 Frame Preview */}
                            <div className="pt-4 border-t border-[var(--surface-border)]">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
                                  <span>Student A4 Viewer Live Preview</span>
                                  <span className="text-[#d4af37] font-mono">
                                    (Page {previewNotesPageIndex + 1} of {editingNotesPages.length})
                                  </span>
                                </h5>
                                {editingNotesPages.length > 1 && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewNotesPageIndex((p) => Math.max(0, p - 1))}
                                      disabled={previewNotesPageIndex === 0}
                                      className="px-2.5 py-1 rounded-lg border border-[var(--surface-border)] text-xs font-display font-bold disabled:opacity-30 cursor-pointer"
                                    >
                                      &larr; Prev
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewNotesPageIndex((p) => Math.min(editingNotesPages.length - 1, p + 1))}
                                      disabled={previewNotesPageIndex === editingNotesPages.length - 1}
                                      className="px-2.5 py-1 rounded-lg border border-[var(--surface-border)] text-xs font-display font-bold disabled:opacity-30 cursor-pointer"
                                    >
                                      Next &rarr;
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="max-w-md mx-auto aspect-[1/1.414] rounded-2xl bg-white dark:bg-[#18181c] border-2 border-[var(--surface-border)] shadow-md overflow-hidden flex items-center justify-center p-3 relative">
                                <img
                                  src={editingNotesPages[previewNotesPageIndex] || editingNotesPages[0]}
                                  alt="Note Page Preview"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-6 text-center text-[var(--text-muted)] border border-dashed border-[var(--surface-border)] rounded-xl">
                            <span className="material-symbols-outlined text-3xl text-[var(--text-muted)] mb-1">
                              description
                            </span>
                            <p className="font-display text-xs font-bold text-[var(--text-main)]">
                              No note document pages uploaded
                            </p>
                            <p className="font-serif text-[11px] mt-0.5">
                              Upload one or multiple note images to provide comprehensive visual study notes to students.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ================= TAB 3: PRACTICE MATERIALS ================= */}
                  {activeContentTab === "practice" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Notice: Strict Learning Directives Only (No AI checking/assignment submission in this phase) */}
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-serif flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-amber-600 dark:text-amber-400 shrink-0">
                          info
                        </span>
                        <span>
                          <strong>Practice Materials Notice:</strong> Practice materials are strictly learning drills and practice directives provided by the administrator. AI assignment submission and checking are scheduled for a separate future phase.
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px] text-[#d4af37]">assignment</span>
                            <span>Practice Directives &amp; Drills</span>
                          </label>
                          <span className="font-serif text-[11px] text-[var(--text-muted)]">
                            Students can view and practice the provided directives
                          </span>
                        </div>
                        <textarea
                          rows={6}
                          value={editingPractice}
                          onChange={(e) => setEditingPractice(e.target.value)}
                          placeholder="Describe verbal cadence drills, oral exercises, speech prompts, and self-evaluation guidelines..."
                          className="w-full px-4 py-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-sm focus:outline-hidden focus:border-[#d4af37] transition-colors"
                        />
                      </div>

                      {/* Image inside Practice Materials (Requirement 13 & 14) */}
                      <div className="space-y-2 p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)]">
                        <div className="flex items-center gap-2 text-[#d4af37]">
                          <span className="material-symbols-outlined text-[18px]">photo_library</span>
                          <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                            Practice Worksheet / Document Image URL (Optional)
                          </label>
                        </div>
                        <input
                          type="url"
                          value={editingPracticeImage}
                          onChange={(e) => setEditingPracticeImage(e.target.value)}
                          placeholder="https://... worksheet image link, Google Drive image link, or uploaded drill sheet"
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-sm focus:outline-hidden focus:border-[#d4af37] transition-colors"
                        />
                        <p className="font-serif text-[11px] text-[var(--text-muted)]">
                          A4 practice sheets and worksheets can be inspected in full-size high-resolution view by students.
                        </p>

                        {/* Image Preview */}
                        {editingPracticeImage && (
                          <div className="pt-2">
                            <ExpandableImageViewer
                              src={editingPracticeImage}
                              alt="Practice Drill Worksheet"
                              caption="Practice Worksheet Preview"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center space-y-4 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-3xl">smart_display</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                      Select or Create a Video
                    </h3>
                    <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                      Choose an existing video from the module hierarchy on the left to edit its video source, lecture notes, and practice materials, or click below to add a new video.
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleCreateNewLessonDraft()}
                      className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>+ Create New Video</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* ================= DEFAULT VIEW: CLEAN COURSES CATALOG =================== */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Top Level Section Switcher: Academic Courses vs Free Demo Management */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--surface-border)]">
            <div className="flex items-center gap-2 p-1 bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => setMainWorkspaceTab("courses")}
                className={`px-4 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  mainWorkspaceTab === "courses"
                    ? "bg-[#d4af37] text-[#141416] shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">menu_book</span>
                <span>Courses ({courses.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMainWorkspaceTab("free-demo");
                  if (!selectedDemoCourseId && courses.length > 0) {
                    handleSelectDemoCourse(courses[0].id);
                  }
                }}
                className={`px-4 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  mainWorkspaceTab === "free-demo"
                    ? "bg-[#d4af37] text-[#141416] shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">smart_display</span>
                <span>Free Demo</span>
              </button>
            </div>

            {mainWorkspaceTab === "courses" && (
              <button
                type="button"
                onClick={handleOpenNewCourse}
                className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 shrink-0 self-start sm:self-center"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>+ Add Course</span>
              </button>
            )}
          </div>

          {mainWorkspaceTab === "courses" ? (
            /* ================= COURSES CATALOG VIEW ================= */
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#d4af37]"></span>
                  <span className="font-display text-xs uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                    Academic Catalog
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text-muted)] bg-[var(--surface-low)] px-2.5 py-0.5 rounded-full border border-[var(--surface-border)] ml-1">
                    {courses.length} {courses.length === 1 ? "Course" : "Courses"}
                  </span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                  Courses
                </h2>
                <p className="font-serif text-xs sm:text-sm text-[var(--text-muted)]">
                  Manage institutional courses, structure curriculum modules, and manage learning content.
                </p>
              </div>

              {/* Courses List / Cards */}
              {courses.length === 0 ? (
                <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-3xl">school</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-lg font-bold text-[var(--text-main)] uppercase tracking-wide">
                      No courses available
                    </h3>
                    <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                      No courses have been added yet. Click Add Course to create your first authentic course.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenNewCourse}
                    className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Add Course</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {courses.map((course) => {
                    return (
                      <div
                        key={course.id}
                        className="p-5 sm:p-6 rounded-2xl border border-[var(--surface-border)] hover:border-[#d4af37]/60 bg-[var(--surface-lowest)] shadow-xs flex flex-col justify-between gap-4 transition-all duration-200 group"
                      >
                        <div className="space-y-3">
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] border border-[#d4af37]/30 font-display text-xs font-bold uppercase tracking-wider">
                              {course.level || "Course"}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-display text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                                  course.status === "published"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                                }`}
                              >
                                {course.status === "published" ? "Published" : "Draft"}
                              </span>
                              <span
                                className={`font-display text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                                  course.availability === "available"
                                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25"
                                    : "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/25"
                                }`}
                              >
                                {course.availability === "available" ? "Available" : "Upcoming"}
                              </span>
                            </div>
                          </div>

                          {/* Course Title and Meta */}
                          <div>
                            <h3 className="font-display text-lg font-bold text-[var(--text-main)] group-hover:text-[#d4af37] transition-colors leading-snug">
                              {course.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs font-serif text-[var(--text-muted)] mt-1">
                              <span className="font-mono font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                                {course.price && course.price > 0 ? `Rs ${course.price.toLocaleString()} PKR` : "Rs 0 PKR"}
                                {course.price_usd ? ` • $${course.price_usd} USD` : ""}
                              </span>
                              <span>•</span>
                              <span>{course.duration_weeks || 4} Weeks</span>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="font-serif text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                            {course.description || "Comprehensive academic program and curriculum."}
                          </p>
                        </div>

                        {/* Card Actions: Primary Manage Content + Subtle Edit and Delete */}
                        <div className="pt-4 border-t border-[var(--surface-border)] flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenCourseLMS(course.id)}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">menu_book</span>
                            <span>Manage Content</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditCourse(course)}
                            className="p-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                            title="Edit Course Parameters"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDemoCourseId(course.id);
                              setMainWorkspaceTab("free-demo");
                              handleSelectDemoCourse(course.id);
                            }}
                            className="p-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[#d4af37] transition-colors cursor-pointer"
                            title="Manage Course Free Demo"
                          >
                            <span className="material-symbols-outlined text-[16px]">smart_display</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCourseToDelete(course)}
                            className="p-2 rounded-xl border border-red-500/20 hover:border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                            title="Delete Course"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ================= FREE DEMO MANAGEMENT VIEW (Requirements 8, 9, 10) ================= */
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#d4af37]"></span>
                  <span className="font-display text-xs uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                    Manage Content
                  </span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                  Free Demo Management
                </h2>
                <p className="font-serif text-xs sm:text-sm text-[var(--text-muted)]">
                  Select which LMS video is displayed as the free demo for each course on the public website.
                </p>
              </div>

              {/* Requirement 8: Course Selection Cards (Clean rounded rectangular selectors) */}
              <div className="space-y-3">
                <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Select Course
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {courses.map((c) => {
                    const isSelected = selectedDemoCourseId === c.id;
                    const demo = freeDemoConfig[c.id];
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectDemoCourse(c.id)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                          isSelected
                            ? "border-[#d4af37] bg-[var(--surface-low)] shadow-md ring-2 ring-[#d4af37]/30"
                            : "border-[var(--surface-border)] bg-[var(--surface-lowest)] hover:border-[#d4af37]/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] border border-[#d4af37]/30">
                            {c.level || "Course"}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              demo
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {demo ? "Demo Configured" : "No Demo"}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-display text-sm font-bold text-[var(--text-main)]">
                            {c.title}
                          </h4>
                          <p className="font-serif text-xs text-[var(--text-muted)] mt-1 truncate">
                            {demo ? `${demo.moduleTitle} → ${demo.lessonTitle}` : "Click to select and configure free demo"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Requirement 10: Free Demo Controls for selected course */}
              {selectedDemoCourseId && (() => {
                const selCourse = courses.find((c) => c.id === selectedDemoCourseId);
                const activeDemo = freeDemoConfig[selectedDemoCourseId];

                return (
                  <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--surface-border)]">
                      <div>
                        <span className="text-[10px] font-display font-bold uppercase tracking-wider text-[#d4af37]">
                          Course Free Demo
                        </span>
                        <h3 className="font-display text-xl font-bold text-[var(--text-main)]">
                          {selCourse?.title || "Selected Course"}
                        </h3>
                      </div>
                    </div>

                    {loadingDemoCurriculum ? (
                      <div className="py-8 text-center text-xs font-serif text-[var(--text-muted)] flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></span>
                        <span>Loading course curriculum modules...</span>
                      </div>
                    ) : activeDemo ? (
                      /* Active Demo Details & Controls */
                      <div className="space-y-4">
                        <div className="p-5 rounded-xl border border-[#d4af37]/30 bg-[var(--surface-low)] space-y-2">
                          <span className="text-[10px] font-display uppercase tracking-widest text-[#8a6d1b] dark:text-[#d4af37] font-bold">
                            Current Free Demo
                          </span>
                          <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base font-bold text-[var(--text-main)] font-display">
                            <span>{activeDemo.moduleTitle}</span>
                            <span className="text-[var(--text-muted)]">→</span>
                            <span className="text-[#8a6d1b] dark:text-[#d4af37]">{activeDemo.lessonTitle}</span>
                          </div>
                          {activeDemo.videoUrl && (
                            <p className="text-xs font-mono text-[var(--text-muted)] truncate pt-1">
                              LMS Video: {activeDemo.videoUrl} ({activeDemo.videoSource || "youtube"})
                            </p>
                          )}
                        </div>

                        {/* Buttons: [Preview] [Change] [Delete] */}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setPreviewDemoVideoUrl(activeDemo.videoUrl)}
                            className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[16px]">play_circle</span>
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenDemoPicker}
                            className="px-5 py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                            <span>Change</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleDeleteFreeDemo}
                            disabled={deletingDemo}
                            className="px-5 py-2.5 rounded-xl border border-red-500/30 hover:border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            <span>{deletingDemo ? "Deleting..." : "Delete"}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* No Free Demo Selected */
                      <div className="py-10 text-center space-y-4 max-w-md mx-auto">
                        <div className="w-14 h-14 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] flex items-center justify-center mx-auto">
                          <span className="material-symbols-outlined text-3xl">smart_display</span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-display text-lg font-bold text-[var(--text-main)]">
                            No Free Demo Selected
                          </h4>
                          <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                            No LMS video has been assigned as the Free Demo for {selCourse?.title}. Choose an existing video from this course's curriculum to showcase on the public website.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenDemoPicker}
                          className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">add_circle</span>
                          <span>Select Video</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ================= ADD / EDIT COURSE MODAL DIALOG ======================== */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--surface-border)]">
              <div className="space-y-0.5">
                <span className="font-display text-[10px] font-bold uppercase tracking-widest text-[#d4af37] block">
                  {selectedCourseId ? "Update Academic Program" : "New Academic Program"}
                </span>
                <h3 className="font-display text-xl font-bold text-[var(--text-main)]">
                  {selectedCourseId ? "Edit Course Parameters" : "Add Course"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Form Fields */}
            <div className="space-y-5">
              {/* Course Name */}
              <div className="space-y-1.5">
                <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Course Name <span className="text-[#d4af37]">*</span>
                </label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. German A1 or English Grammar Mastery"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-sm focus:outline-hidden focus:border-[#d4af37] transition-colors"
                  autoFocus
                />
              </div>

              {/* Language / Course Category & Course Level Selector (Reqs 10 & 11) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Language / Track <span className="text-[#d4af37]">*</span>
                  </label>
                  <select
                    value={courseLanguage}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setCourseLanguage(newLang);
                      const availableLevels = LANGUAGE_LEVEL_MAP[newLang] || LANGUAGE_LEVEL_MAP.German;
                      if (!availableLevels.includes(courseLevel)) {
                        setCourseLevel(availableLevels[0]);
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-sm focus:outline-hidden focus:border-[#d4af37] transition-colors cursor-pointer"
                  >
                    <option value="German">German</option>
                    <option value="English">English</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Level Options ({courseLanguage})
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(LANGUAGE_LEVEL_MAP[courseLanguage] || LANGUAGE_LEVEL_MAP.German).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setCourseLevel(lvl)}
                        className={`py-2 px-3 rounded-lg font-display text-xs uppercase tracking-wider font-semibold border transition-all cursor-pointer text-center ${
                          courseLevel === lvl
                            ? "bg-[#d4af37] text-[#141416] border-[#d4af37] font-bold shadow-2xs"
                            : "border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-muted)] hover:border-[#d4af37]/50"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Course-Specific Image / Thumbnail (Reqs 8 & 9) */}
              <div className="space-y-2 p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)]">
                <div className="flex items-center justify-between">
                  <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[#d4af37]">photo_camera</span>
                    <span>Course Image / Thumbnail</span>
                  </label>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--surface-border)]/40 px-2 py-0.5 rounded">
                    16:9 Aspect Ratio • Cover Fit
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* Aspect-Ratio Frame Fit Preview */}
                  <div className="sm:col-span-5 relative aspect-video w-full rounded-xl overflow-hidden border border-[var(--surface-border)] bg-black/40 group">
                    {courseImage ? (
                      <img
                        src={courseImage}
                        alt="Course thumbnail preview"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-1">
                        <span className="material-symbols-outlined text-[24px]">image</span>
                        <span className="font-serif text-[11px]">No image</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-mono text-[#d4af37] font-semibold">
                      Course Card Frame
                    </div>
                  </div>

                  {/* Upload Controls & URL */}
                  <div className="sm:col-span-7 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="px-3.5 py-2 rounded-xl bg-[var(--surface-lowest)] hover:border-[#d4af37] border border-[var(--surface-border)] text-[var(--text-main)] font-display text-xs uppercase font-bold cursor-pointer inline-flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs">
                        <span className="material-symbols-outlined text-[16px] text-[#d4af37]">upload</span>
                        <span>{uploadingCourseImage ? "Uploading..." : "Upload Picture"}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleUploadCourseImage}
                          disabled={uploadingCourseImage}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs font-serif text-[var(--text-muted)]">or specify URL:</span>
                    </div>

                    <input
                      type="url"
                      value={courseImage}
                      onChange={(e) => setCourseImage(e.target.value)}
                      placeholder="https://images.unsplash.com/... or /uploads/..."
                      className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-xs focus:outline-hidden focus:border-[#d4af37] transition-colors"
                    />

                    <p className="font-serif text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Displayed on public course cards. Preserves 16:9 ratio with no stretching or distortion on desktop, tablet, and mobile.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dual Price: USD + PKR simultaneously (Req 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)]">
                {/* Course Price (PKR) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                      PKR Price (Rs) <span className="text-[#d4af37]">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">Pakistan Currency</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                      Rs
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={coursePrice}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : Number(e.target.value);
                        setCoursePrice(val);
                        if (val && val > 0) setPriceError(null);
                      }}
                      placeholder="7000"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                        priceError ? "border-red-500 focus:border-red-500" : "border-[var(--surface-border)] focus:border-[#d4af37]"
                      } bg-[var(--surface-lowest)] text-[var(--text-main)] font-mono text-sm focus:outline-hidden transition-colors`}
                    />
                  </div>
                  {priceError && (
                    <p className="font-serif text-[10px] text-red-500 font-medium">{priceError}</p>
                  )}
                </div>

                {/* Course Price (USD) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                      USD Price ($) <span className="text-[#d4af37]">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">Global Currency</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={coursePriceUsd}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : Number(e.target.value);
                        setCoursePriceUsd(val);
                      }}
                      placeholder="25"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[var(--surface-border)] focus:border-[#d4af37] bg-[var(--surface-lowest)] text-[var(--text-main)] font-mono text-sm focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Availability & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Course Availability (Available / Upcoming) */}
                <div className="space-y-1.5">
                  <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Availability Status
                  </label>
                  <select
                    value={courseAvailability}
                    onChange={(e) => setCourseAvailability(e.target.value as "available" | "upcoming")}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-sm focus:outline-hidden focus:border-[#d4af37] transition-colors cursor-pointer"
                  >
                    <option value="available">Available</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                </div>

                {/* Course Duration */}
                <div className="space-y-1.5">
                  <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Duration
                  </label>
                  <select
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-sm focus:outline-hidden focus:border-[#d4af37] transition-colors cursor-pointer"
                  >
                    <option value={4}>4 Weeks</option>
                    <option value={6}>6 Weeks</option>
                    <option value={8}>8 Weeks</option>
                    <option value={10}>10 Weeks</option>
                    <option value={12}>12 Weeks</option>
                    <option value={16}>16 Weeks</option>
                  </select>
                </div>
              </div>

              {/* Course Description */}
              <div className="space-y-1.5">
                <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  placeholder="Academic program overview and learning objectives..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-sm focus:outline-hidden focus:border-[#d4af37] transition-colors"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-[var(--surface-border)] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
                className="px-5 py-2.5 rounded-xl border border-[var(--surface-border)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold hover:border-[#d4af37] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSave("published")}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? "Publishing..." : "Publish Course"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* ================= FREE DEMO SELECTION MODAL (Reqs 9 & 10) =============== */}
      {/* ========================================================================= */}
      {demoPickerOpen && selectedDemoCourseId && (() => {
        const selCourse = courses.find((c) => c.id === selectedDemoCourseId);
        const selModule = demoCurriculum.find((m) => m.id === demoSelectedModuleId);
        const selLesson = selModule?.lessons?.find((l) => l.id === demoSelectedLessonId);

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150 my-8">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--surface-border)]">
                <div>
                  <span className="font-display text-[10px] font-bold uppercase tracking-widest text-[#d4af37] block">
                    LMS Video Selection
                  </span>
                  <h3 className="font-display text-xl font-bold text-[var(--text-main)]">
                    Free Demo for {selCourse?.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDemoPickerOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-low)] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                  Choose a video from the existing LMS curriculum for this course. The selected video will immediately be featured as the interactive Free Demo on the public website.
                </p>

                {demoCurriculum.length === 0 ? (
                  <div className="p-6 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-center space-y-2">
                    <span className="material-symbols-outlined text-amber-500 text-3xl">warning</span>
                    <p className="font-serif text-xs text-[var(--text-muted)]">
                      This course does not have any modules or lessons in its LMS curriculum yet. Please add modules and lessons with videos in Manage Content first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Step 1: Module Selector */}
                    <div className="space-y-1.5">
                      <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                        1. Select Module <span className="text-[#d4af37]">*</span>
                      </label>
                      <select
                        value={demoSelectedModuleId}
                        onChange={(e) => {
                          const modId = e.target.value;
                          setDemoSelectedModuleId(modId);
                          const chosenMod = demoCurriculum.find((m) => m.id === modId);
                          if (chosenMod?.lessons?.length) {
                            setDemoSelectedLessonId(chosenMod.lessons[0].id);
                          } else {
                            setDemoSelectedLessonId("");
                          }
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-sm focus:outline-hidden focus:border-[#d4af37] transition-colors cursor-pointer"
                      >
                        {demoCurriculum.map((m, idx) => (
                          <option key={m.id} value={m.id}>
                            Module {idx + 1}: {m.title} ({m.lessons?.length || 0} lessons)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Step 2: Lesson / Video Selector */}
                    <div className="space-y-1.5">
                      <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                        2. Select Lesson Video <span className="text-[#d4af37]">*</span>
                      </label>
                      {selModule && selModule.lessons?.length > 0 ? (
                        <select
                          value={demoSelectedLessonId}
                          onChange={(e) => setDemoSelectedLessonId(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-sm focus:outline-hidden focus:border-[#d4af37] transition-colors cursor-pointer"
                        >
                          {selModule.lessons.map((les, idx) => (
                            <option key={les.id} value={les.id}>
                              Lesson {idx + 1}: {les.title} {les.video_url ? "✓ (Video attached)" : "⚠️ (No video)"}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400 text-xs font-serif">
                          No lessons found inside this module.
                        </div>
                      )}
                    </div>

                    {/* Video Attachment Details */}
                    {selLesson && (
                      <div className="p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Selected Video Source
                          </span>
                          {selLesson.video_url ? (
                            <span className="font-display text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Ready for Demo
                            </span>
                          ) : (
                            <span className="font-display text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Missing Video
                            </span>
                          )}
                        </div>

                        {selLesson.video_url ? (
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="font-mono text-xs text-[var(--text-main)] truncate">
                              {selLesson.video_url}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPreviewDemoVideoUrl(selLesson.video_url || null)}
                              className="px-3 py-1 rounded-lg bg-[var(--surface-lowest)] border border-[var(--surface-border)] hover:border-[#d4af37] text-xs font-display font-bold uppercase tracking-wider text-[var(--text-main)] transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                              <span>Preview</span>
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs font-serif text-amber-600 dark:text-amber-400">
                            Please attach a video to this lesson in the course content editor before using it as a Free Demo.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-[var(--surface-border)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDemoPickerOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[var(--surface-border)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold hover:border-[#d4af37] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFreeDemo}
                  disabled={savingDemo || !selLesson?.video_url}
                  className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingDemo ? "Saving Demo..." : "Save Free Demo"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* ================= FREE DEMO VIDEO PREVIEW MODAL ========================= */}
      {/* ========================================================================= */}
      {previewDemoVideoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setPreviewDemoVideoUrl(null)}
        >
          <div
            className="bg-[#141416] border border-white/20 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 text-white bg-[#1a1a1e]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d4af37]">play_circle</span>
                <h4 className="font-display text-sm font-bold">Free Demo Video Preview</h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDemoVideoUrl(null)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="w-full bg-black aspect-video">
              <SpeakUpVideoPlayer
                videoId={previewDemoVideoUrl}
                title="Free Demo Video Preview"
                autoPlay={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
