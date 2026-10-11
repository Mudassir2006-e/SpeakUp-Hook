"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  saveCmsPageDraftAction,
  publishCmsPageAction,
  revertCmsPageDraftAction,
  getCmsDraftAction,
  uploadWebsiteAssetAction,
  getCmsPageRevisionsAction,
  restoreCmsPageRevisionAction,
  CmsRevision,
} from "@/app/admin/cms-actions";
import HomeVideoEditorModal from "@/components/admin/HomeVideoEditorModal";
import MethodologyMediaEditorModal from "@/components/admin/MethodologyMediaEditorModal";
import MethodologyVideoEditorModal from "@/components/admin/MethodologyVideoEditorModal";
import LmsWorkingVideoEditorModal from "@/components/admin/LmsWorkingVideoEditorModal";
import TermsSectionsEditorModal from "@/components/admin/TermsSectionsEditorModal";
import PrivacySectionsEditorModal from "@/components/admin/PrivacySectionsEditorModal";
import AboutTeacherPhotoModal from "@/components/admin/AboutTeacherPhotoModal";

export interface PageOption {
  id: string;
  name: string;
  route: string;
  slug: string;
  section?: string;
  category?: string;
}

interface LivePageVisualEditorProps {
  pageKey: string;
  pageName: string;
  pageRoute: string;
  pageSection?: string;
  pageCategory?: string;
  availablePages?: PageOption[];
  onSwitchPage?: (slug: string) => void;
  isCourseSpecific?: boolean;
}

type ViewportMode = "desktop" | "tablet" | "mobile";
type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface DraftEditItem {
  selector: string;
  type: "text" | "image";
  value: string;
  originalValue: string;
  elementTag?: string;
  label?: string;
  objectFit?: string;
}

export default function LivePageVisualEditor({
  pageKey,
  pageName,
  pageRoute,
  pageSection = "Public Website",
  pageCategory = "General",
  availablePages = [],
  onSwitchPage,
  isCourseSpecific = false,
}: LivePageVisualEditorProps) {
  // Viewport mode
  const [viewport, setViewport] = useState<ViewportMode>("desktop");

  // Tool modes
  const [isPencilActive, setIsPencilActive] = useState<boolean>(true);
  const [isImageActive, setIsImageActive] = useState<boolean>(false);

  // Persistence state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Draft edits map: selector -> DraftEditItem
  const [draftEdits, setDraftEdits] = useState<Record<string, DraftEditItem>>({});
  const draftEditsRef = useRef<Record<string, DraftEditItem>>({});
  draftEditsRef.current = draftEdits;

  // Selected element for inline text editing
  const [selectedTextElement, setSelectedTextElement] = useState<{
    selector: string;
    tag: string;
    currentText: string;
    originalText: string;
    label: string;
  } | null>(null);

  // Selected image for frame replacement
  const [selectedImageElement, setSelectedImageElement] = useState<{
    selector: string;
    src: string;
    originalSrc: string;
    width: number;
    height: number;
    aspectRatio: string;
    borderRadius: string;
    objectFit: string;
  } | null>(null);

  // Image upload modal state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageFitMode, setImageFitMode] = useState<string>("cover");
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Publish modal state
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [showHomeVideoModal, setShowHomeVideoModal] = useState<boolean>(false);
  const [showMethodologyMediaModal, setShowMethodologyMediaModal] = useState<boolean>(false);
  const [showMethodologyVideoModal, setShowMethodologyVideoModal] = useState<boolean>(false);
  const [showLmsWorkingVideoModal, setShowLmsWorkingVideoModal] = useState<boolean>(false);
  const [showTermsSectionsModal, setShowTermsSectionsModal] = useState<boolean>(false);
  const [showPrivacySectionsModal, setShowPrivacySectionsModal] = useState<boolean>(false);
  const [showAboutTeacherPhotoModal, setShowAboutTeacherPhotoModal] = useState<boolean>(false);
  const [showRevertModal, setShowRevertModal] = useState<boolean>(false);
  const [isReverting, setIsReverting] = useState<boolean>(false);

  // Version history modal state
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [revisions, setRevisions] = useState<CmsRevision[]>([]);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState<boolean>(false);
  const [isRestoringRevision, setIsRestoringRevision] = useState<string | null>(null);

  // Iframe reference
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load existing draft from Supabase / server on mount or page change
  useEffect(() => {
    let isMounted = true;
    getCmsDraftAction(pageKey).then((res) => {
      if (isMounted && res.success && res.data?.draftData) {
        const loadedDraft = res.data.draftData as Record<string, DraftEditItem>;
        if (Object.keys(loadedDraft).length > 0) {
          setDraftEdits(loadedDraft);
          setSaveStatus("saved");
          setLastSavedTime("Restored saved draft");
        }
      }
    });

    return () => {
      isMounted = false;
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [pageKey]);

  // Compute unique CSS selector path for a DOM element
  const getUniqueSelector = (el: HTMLElement): string => {
    if (el.id) return `#${el.id}`;
    if (el.getAttribute("data-cms-key")) {
      return `[data-cms-key="${el.getAttribute("data-cms-key")}"]`;
    }

    const path: string[] = [];
    let current: HTMLElement | null = el;

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== current.ownerDocument.body) {
      if (current.tagName.toLowerCase() === "main") {
        path.unshift("main");
        break;
      }
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      } else {
        let sibling = current;
        let nth = 1;
        while (sibling.previousElementSibling) {
          sibling = sibling.previousElementSibling as HTMLElement;
          if (sibling.tagName === current.tagName) nth++;
        }
        if (nth > 1) selector += `:nth-of-type(${nth})`;
      }
      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(" > ");
  };

  // Re-apply draft edits onto the iframe DOM
  const applyDraftToIframe = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    Object.entries(draftEditsRef.current).forEach(([sel, item]) => {
      try {
        const el = doc.querySelector(sel) as HTMLElement | null;
        if (el) {
          if (item.type === "text") {
            el.textContent = item.value;
          } else if (item.type === "image" && el.tagName === "IMG") {
            (el as HTMLImageElement).src = item.value;
            if (item.objectFit) el.style.objectFit = item.objectFit;
          }
        }
      } catch {
        // Selector may be page-specific
      }
    });
  }, []);

  // Save draft helper (called explicitly or via debounced autosave)
  const saveDraft = useCallback(
    async (editsToSave: Record<string, DraftEditItem>) => {
      setSaveStatus("saving");
      setErrorMessage(null);

      try {
        const res = await saveCmsPageDraftAction(pageKey, editsToSave);
        if (res.success) {
          setSaveStatus("saved");
          const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setLastSavedTime(`Saved at ${nowStr}`);
        } else {
          setSaveStatus("error");
          setErrorMessage(res.error || "Failed to save draft to Supabase.");
        }
      } catch (err: any) {
        setSaveStatus("error");
        setErrorMessage(err?.message || "Network error saving draft.");
      }
    },
    [pageKey]
  );

  // Trigger debounced autosave whenever draftEdits changes
  const triggerAutosave = useCallback(
    (newEdits: Record<string, DraftEditItem>) => {
      setSaveStatus("unsaved");
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

      autosaveTimerRef.current = setTimeout(() => {
        saveDraft(newEdits);
      }, 2500); // 2.5s debounced autosave
    },
    [saveDraft]
  );

  // Handle iframe load and inject inspector scripts
  const handleIframeLoad = () => {
    setIframeLoaded(true);
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // Apply any previously saved draft edits
    applyDraftToIframe();

    // Inject editor highlight CSS into iframe
    let styleTag = doc.getElementById("speakup-editor-styles") as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = doc.createElement("style");
      styleTag.id = "speakup-editor-styles";
      styleTag.innerHTML = `
        .speakup-hover-text {
          outline: 2px dashed #d4af37 !important;
          outline-offset: 3px !important;
          background-color: rgba(212, 175, 55, 0.09) !important;
          border-radius: 4px !important;
          cursor: text !important;
          transition: background-color 0.15s ease !important;
        }
        .speakup-selected-text {
          outline: 2.5px solid #d4af37 !important;
          outline-offset: 3px !important;
          box-shadow: 0 0 16px rgba(212, 175, 55, 0.45) !important;
          border-radius: 4px !important;
        }
        .speakup-hover-image {
          outline: 2.5px dashed #3b82f6 !important;
          outline-offset: 3px !important;
          cursor: pointer !important;
          transition: outline 0.15s ease !important;
        }
        .speakup-selected-image {
          outline: 3px solid #3b82f6 !important;
          outline-offset: 3px !important;
          box-shadow: 0 0 16px rgba(59, 130, 246, 0.5) !important;
        }
      `;
      doc.head.appendChild(styleTag);
    }

    // Attach interaction handlers to iframe body
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target === doc.body || target === doc.documentElement) return;

      if (target.tagName === "IMG") {
        if (isImageActive || isPencilActive) {
          target.classList.add("speakup-hover-image");
        }
      } else if (isPencilActive) {
        // Text editable elements
        const validTextTags = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "SPAN", "A", "BUTTON", "LI", "LABEL", "BLOCKQUOTE", "STRONG", "EM"];
        if (validTextTags.includes(target.tagName) && target.innerText?.trim()) {
          target.classList.add("speakup-hover-text");
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      target.classList.remove("speakup-hover-text");
      target.classList.remove("speakup-hover-image");
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target === doc.body || target === doc.documentElement) return;

      // Check if image click
      if (target.tagName === "IMG") {
        e.preventDefault();
        e.stopPropagation();

        doc.querySelectorAll(".speakup-selected-image").forEach((el) => el.classList.remove("speakup-selected-image"));
        target.classList.add("speakup-selected-image");

        const rect = target.getBoundingClientRect();
        const sel = getUniqueSelector(target);
        const computed = doc.defaultView?.getComputedStyle(target);

        setSelectedImageElement({
          selector: sel,
          src: (target as HTMLImageElement).src,
          originalSrc: (target as HTMLImageElement).src,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          aspectRatio: rect.height > 0 ? (rect.width / rect.height).toFixed(2) : "1",
          borderRadius: computed?.borderRadius || "8px",
          objectFit: computed?.objectFit || "cover",
        });
        setImageFitMode(computed?.objectFit || "cover");
        setImageFile(null);
        setImagePreviewUrl(null);
        setImageUploadError(null);
        return;
      }

      // Check if pencil text click
      if (isPencilActive) {
        const validTextTags = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "SPAN", "A", "BUTTON", "LI", "LABEL", "BLOCKQUOTE", "STRONG", "EM"];
        if (validTextTags.includes(target.tagName) && target.innerText?.trim()) {
          e.preventDefault();
          e.stopPropagation();

          doc.querySelectorAll(".speakup-selected-text").forEach((el) => el.classList.remove("speakup-selected-text"));
          target.classList.add("speakup-selected-text");

          const sel = getUniqueSelector(target);
          const rawText = target.textContent || "";

          let friendlyLabel = "Content Text";
          if (target.tagName.startsWith("H")) friendlyLabel = `Headline (${target.tagName})`;
          else if (target.tagName === "BUTTON") friendlyLabel = "Button Text";
          else if (target.tagName === "A") friendlyLabel = "Navigation / Link Label";
          else if (target.tagName === "P") friendlyLabel = "Paragraph Description";

          setSelectedTextElement({
            selector: sel,
            tag: target.tagName,
            currentText: rawText,
            originalText: draftEditsRef.current[sel]?.originalValue || rawText,
            label: friendlyLabel,
          });
        }
      }
    };

    doc.body.addEventListener("mouseover", handleMouseOver);
    doc.body.addEventListener("mouseout", handleMouseOut);
    doc.body.addEventListener("click", handleClick, true); // Use capture to intercept links/buttons!
  };

  // Live text update handler: updates iframe in real-time as admin types
  const handleLiveTextChange = (newVal: string) => {
    if (!selectedTextElement) return;

    setSelectedTextElement((prev) => (prev ? { ...prev, currentText: newVal } : null));

    // Update inside iframe live
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      try {
        const el = doc.querySelector(selectedTextElement.selector) as HTMLElement | null;
        if (el) {
          el.textContent = newVal;
        }
      } catch {
        // Element may not match selector
      }
    }

    // Update draft edits state and trigger autosave
    const updatedEdits = {
      ...draftEditsRef.current,
      [selectedTextElement.selector]: {
        selector: selectedTextElement.selector,
        type: "text" as const,
        value: newVal,
        originalValue: selectedTextElement.originalText,
        elementTag: selectedTextElement.tag,
        label: selectedTextElement.label,
      },
    };

    setDraftEdits(updatedEdits);
    triggerAutosave(updatedEdits);
  };

  // Close text editor dock
  const closeTextEditor = () => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      doc.querySelectorAll(".speakup-selected-text").forEach((el) => el.classList.remove("speakup-selected-text"));
    }
    setSelectedTextElement(null);
  };

  // Handle image file selection
  const handleImageFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setImageUploadError("Only JPEG, PNG, and WebP images are supported.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError(`File "${file.name}" exceeds the 5MB size limit.`);
      return;
    }

    setImageFile(file);
    setImageUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Save image replacement to frame
  const applyImageReplacement = async () => {
    if (!selectedImageElement || !imageFile) return;

    setIsUploadingImage(true);
    setImageUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", imageFile);

      const res = await uploadWebsiteAssetAction(formData);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to upload image.");
      }

      const uploadedUrl = res.data.url;

      // Update iframe image live
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        const el = doc.querySelector(selectedImageElement.selector) as HTMLImageElement | null;
        if (el) {
          el.src = uploadedUrl;
          el.style.objectFit = imageFitMode;
        }
      }

      // Update draft state
      const updatedEdits = {
        ...draftEditsRef.current,
        [selectedImageElement.selector]: {
          selector: selectedImageElement.selector,
          type: "image" as const,
          value: uploadedUrl,
          originalValue: selectedImageElement.originalSrc,
          objectFit: imageFitMode,
          label: `Image Frame (${res.data.fileName})`,
        },
      };

      setDraftEdits(updatedEdits);
      triggerAutosave(updatedEdits);
      setSelectedImageElement(null);
      setImageFile(null);
      setImagePreviewUrl(null);
      setSuccessToast(`Image "${res.data.fileName}" applied to frame.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setImageUploadError(err?.message || "Failed to upload image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Close image replacement modal
  const closeImageModal = () => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      doc.querySelectorAll(".speakup-selected-image").forEach((el) => el.classList.remove("speakup-selected-image"));
    }
    setSelectedImageElement(null);
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageUploadError(null);
  };

  // Handle Publish Action
  const handlePublish = async () => {
    setIsPublishing(true);
    setErrorMessage(null);

    try {
      const res = await publishCmsPageAction(pageKey, draftEditsRef.current);
      if (res.success) {
        setShowPublishModal(false);
        setSaveStatus("saved");
        setSuccessToast(`"${pageName}" successfully published to live website!`);
        setTimeout(() => setSuccessToast(null), 5000);
      } else {
        setErrorMessage(res.error || "Failed to publish page.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Network error publishing page.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle Revert Action (Req 16)
  const handleRevertDraft = async () => {
    setIsReverting(true);
    setErrorMessage(null);

    try {
      const res = await revertCmsPageDraftAction(pageKey);
      if (res.success && res.data) {
        const revertedEdits = res.data.draftData || {};
        setDraftEdits(revertedEdits);
        draftEditsRef.current = revertedEdits;
        setSaveStatus("saved");
        setShowRevertModal(false);

        // Re-apply reverted state into iframe DOM
        if (iframeRef.current?.contentDocument) {
          const doc = iframeRef.current.contentDocument;
          // Reload iframe src to clear visual modifications
          iframeRef.current.src = `${pageRoute}${pageRoute.includes("?") ? "&" : "?"}t=${Date.now()}`;
        }

        setSuccessToast(`Draft successfully reverted to published version.`);
        setTimeout(() => setSuccessToast(null), 4000);
      } else {
        setErrorMessage(res.error || "Failed to revert draft.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Network error reverting draft.");
    } finally {
      setIsReverting(false);
    }
  };

  // Handle Restore Revision
  const handleRestoreRevision = async (revId: string) => {
    setIsRestoringRevision(revId);
    try {
      const res = await restoreCmsPageRevisionAction(pageKey, revId);
      if (res.success && res.data) {
        setDraftEdits(res.data.restoredData || {});
        draftEditsRef.current = res.data.restoredData || {};
        setSaveStatus("saved");
        setShowHistoryModal(false);
        if (iframeRef.current) {
          iframeRef.current.src = `${pageRoute}${pageRoute.includes("?") ? "&" : "?"}t=${Date.now()}`;
        }
        setSuccessToast(`Restored to version ${res.data.version}!`);
        setTimeout(() => setSuccessToast(null), 4000);
      } else {
        setErrorMessage(res.error || "Failed to restore revision.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Error restoring revision.");
    } finally {
      setIsRestoringRevision(null);
    }
  };

  // Handle switching page safely
  const handlePageSelectChange = (newSlug: string) => {
    if (newSlug === pageKey) return;
    if (saveStatus === "unsaved") {
      saveDraft(draftEditsRef.current);
    }
    if (onSwitchPage) {
      onSwitchPage(newSlug);
    }
  };

  const editsCount = Object.keys(draftEdits).length;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-emerald-700 text-white font-display text-xs uppercase tracking-wider font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>{successToast}</span>
        </div>
      )}

      {/* ================= TOP EDITOR WORKSPACE TOOLBAR ================= */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#141416]/95 backdrop-blur-md border-b border-[var(--surface-border)] px-3 sm:px-6 py-2.5 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Back Link & Page Selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={isCourseSpecific ? "/admin/courses" : "/admin/edit"}
              className="px-3 py-1.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#1a1a1e] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>{isCourseSpecific ? "Courses Hub" : "Edit Website"}</span>
            </Link>

            {/* Page Title & Selector */}
            {availablePages.length > 0 ? (
              <div className="relative">
                <select
                  value={pageKey}
                  onChange={(e) => handlePageSelectChange(e.target.value)}
                  className="pl-3 pr-8 py-1.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#1a1a1e] text-[var(--text-main)] font-display text-xs font-bold uppercase tracking-wider cursor-pointer appearance-none hover:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                >
                  {availablePages.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} ({p.route})
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-[16px] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                  arrow_drop_down
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] text-xs font-display font-bold uppercase tracking-wider text-[var(--text-main)]">
                <span>{pageName}</span>
                <span className="font-mono text-[10px] text-[#d4af37]">({pageRoute})</span>
              </div>
            )}

            <span className="hidden lg:inline-flex text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[var(--surface-low)] text-[var(--text-muted)] border border-[var(--surface-border)] uppercase tracking-wider font-bold">
              {pageSection}
            </span>
          </div>

          {/* Center: Viewport & Tool Toggles */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* Viewport Toggles (Desktop, Tablet, Mobile) */}
            <div className="flex items-center bg-[var(--surface-low)] p-0.5 rounded-xl border border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setViewport("desktop")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider font-semibold transition-all inline-flex items-center gap-1 cursor-pointer ${
                  viewport === "desktop"
                    ? "bg-[#d4af37] text-black font-bold shadow-2xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
                title="Desktop View (100% Full Width)"
              >
                <span className="material-symbols-outlined text-[16px]">desktop_windows</span>
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setViewport("tablet")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider font-semibold transition-all inline-flex items-center gap-1 cursor-pointer ${
                  viewport === "tablet"
                    ? "bg-[#d4af37] text-black font-bold shadow-2xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
                title="Tablet View (768px)"
              >
                <span className="material-symbols-outlined text-[16px]">tablet_mac</span>
                <span className="hidden sm:inline">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setViewport("mobile")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider font-semibold transition-all inline-flex items-center gap-1 cursor-pointer ${
                  viewport === "mobile"
                    ? "bg-[#d4af37] text-black font-bold shadow-2xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
                title="Mobile View (375px)"
              >
                <span className="material-symbols-outlined text-[16px]">phone_iphone</span>
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            {/* Pencil Tool Button */}
            <button
              type="button"
              onClick={() => {
                setIsPencilActive(!isPencilActive);
                if (isImageActive) setIsImageActive(false);
              }}
              className={`px-3 py-1.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                isPencilActive
                  ? "bg-[#d4af37] text-black ring-2 ring-[#d4af37]/40 shadow-xs"
                  : "border border-[var(--surface-border)] bg-white dark:bg-[#1a1a1e] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#d4af37]"
              }`}
              title="Click existing text in preview to edit inline"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Pencil Tool {isPencilActive ? "Active" : "Off"}</span>
              {isPencilActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>}
            </button>

            {/* Image Tool Button */}
            <button
              type="button"
              onClick={() => {
                setIsImageActive(!isImageActive);
                if (isPencilActive) setIsPencilActive(false);
              }}
              className={`px-3 py-1.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                isImageActive
                  ? "bg-blue-600 text-white ring-2 ring-blue-500/40 shadow-xs"
                  : "border border-[var(--surface-border)] bg-white dark:bg-[#1a1a1e] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-blue-500"
              }`}
              title="Click any image in preview to replace in frame"
            >
              <span className="material-symbols-outlined text-[16px]">image</span>
              <span>Images {isImageActive ? "Active" : "Off"}</span>
            </button>
          </div>

          {/* Right: Autosave Status, Save Draft, Publish, Open Live */}
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {/* Status indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] text-[11px] font-mono">
              {saveStatus === "saving" && (
                <>
                  <span className="material-symbols-outlined text-[14px] animate-spin text-[#d4af37]">
                    progress_activity
                  </span>
                  <span className="text-[#8a6d1b] dark:text-[#d4af37] font-semibold">Saving Draft...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    {lastSavedTime || "Draft Saved"}
                  </span>
                </>
              )}
              {saveStatus === "unsaved" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">Unsaved Draft</span>
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">Save Failed</span>
                </>
              )}
            </div>

            {/* Home Video Control Button (When editing Home) */}
            {(pageKey === "home" || pageRoute === "/") && (
              <button
                type="button"
                onClick={() => setShowHomeVideoModal(true)}
                className="px-3.5 py-1.5 rounded-xl border border-[#d4af37] bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
                title="Manage Promotional Home Video"
              >
                <span className="material-symbols-outlined text-[16px]">smart_display</span>
                <span>Home Video</span>
              </button>
            )}

            {/* Methodology Media Control Button (When editing Methodology) */}
            {(pageKey === "methodology" || pageRoute === "/methodology") && (
              <>
                <button
                  type="button"
                  onClick={() => setShowMethodologyMediaModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-[#d4af37] bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Manage LMS Showcase Screenshots"
                >
                  <span className="material-symbols-outlined text-[16px]">psychology</span>
                  <span>Methodology Media</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMethodologyVideoModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-[#d4af37] bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Manage Guided LMS Walkthrough Video"
                >
                  <span className="material-symbols-outlined text-[16px]">smart_display</span>
                  <span>Methodology Video</span>
                </button>
              </>
            )}

            {/* LMS Working Video Control Button (When editing How LMS Works / LMS Journey) */}
            {(pageKey === "lms-journey" || pageRoute === "/lms-journey") && (
              <button
                type="button"
                onClick={() => setShowLmsWorkingVideoModal(true)}
                className="px-3 py-1.5 rounded-xl border border-[#d4af37] bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
                title="Manage LMS Working Video"
              >
                <span className="material-symbols-outlined text-[16px]">laptop_mac</span>
                <span>LMS Video</span>
              </button>
            )}

            {/* Terms Sections Management Button */}
            {(pageKey === "terms" || pageRoute === "/terms" || pageKey === "privacy" || pageRoute === "/privacy") && (
              <button
                type="button"
                onClick={() => setShowTermsSectionsModal(true)}
                className="px-3 py-1.5 rounded-xl border border-[#d4af37] bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
                title="Manage Terms & Conditions Dynamic Sections"
              >
                <span className="material-symbols-outlined text-[16px]">gavel</span>
                <span>Terms Sections</span>
              </button>
            )}

            {/* Privacy Policy Management Button */}
            {(pageKey === "privacy" || pageRoute === "/privacy" || pageKey === "terms" || pageRoute === "/terms") && (
              <button
                type="button"
                onClick={() => setShowPrivacySectionsModal(true)}
                className="px-3 py-1.5 rounded-xl border border-[#d4af37] bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
                title="Manage Privacy Policy Dynamic Sections"
              >
                <span className="material-symbols-outlined text-[16px]">policy</span>
                <span>Privacy Policy</span>
              </button>
            )}

            {/* About Page Teacher Photo & Framing Button (Section 8) */}
            {(pageKey === "about" || pageRoute === "/about") && (
              <button
                type="button"
                onClick={() => setShowAboutTeacherPhotoModal(true)}
                className="px-3 py-1.5 rounded-xl border border-[#d4af37] bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
                title="Manage About Page Teacher Photo & Framing"
              >
                <span className="material-symbols-outlined text-[16px]">badge</span>
                <span>Teacher Photo</span>
              </button>
            )}

            {/* Revert Button (Req 16) */}
            <button
              type="button"
              onClick={() => setShowRevertModal(true)}
              className="px-3 py-1.5 rounded-xl border border-amber-500/30 hover:border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
              title="Revert draft back to current published version"
            >
              <span className="material-symbols-outlined text-[16px]">undo</span>
              <span>Revert</span>
            </button>

            {/* Version History Button */}
            <button
              type="button"
              onClick={async () => {
                setShowHistoryModal(true);
                setIsLoadingRevisions(true);
                try {
                  const res = await getCmsPageRevisionsAction(pageKey);
                  if (res.success && res.data) setRevisions(res.data);
                } catch {
                } finally {
                  setIsLoadingRevisions(false);
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#1a1a1e] hover:border-[#d4af37] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
              title="View published version history and restore past states"
            >
              <span className="material-symbols-outlined text-[16px] text-[#d4af37]">history</span>
              <span>History</span>
            </button>

            {/* Save Draft Button */}
            <button
              type="button"
              onClick={() => saveDraft(draftEditsRef.current)}
              className="px-3.5 py-1.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#1a1a1e] hover:border-[#d4af37] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[16px] text-[#d4af37]">save</span>
              <span>Save Draft</span>
            </button>

            {/* Publish Button */}
            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
              className="px-4 py-1.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-extrabold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">publish</span>
              <span>Publish</span>
              {editsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#141416] text-[#d4af37] text-[10px] flex items-center justify-center font-mono">
                  {editsCount}
                </span>
              )}
            </button>

            {/* Open Live Page */}
            <Link
              href={pageRoute}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-xl border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#d4af37] transition-all cursor-pointer"
              title="Open Live Website in New Tab"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            </Link>
          </div>
        </div>

        {/* Informative Guidance Banner */}
        <div className="max-w-[1600px] mx-auto mt-2 pt-2 border-t border-[var(--surface-border)]/60 flex flex-wrap items-center justify-between text-[11px] font-serif text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[15px] text-[#d4af37]">tips_and_updates</span>
            <span>
              {isPencilActive
                ? "Pencil Active: Move cursor over any heading, paragraph, or button label in the preview and click to edit text inline."
                : isImageActive
                ? "Image Mode Active: Click any image in the preview to replace it with a computer image inside its frame."
                : "Select Pencil Tool or Images from the toolbar to begin editing content in the live preview."}
            </span>
          </div>

          <span className="font-mono text-[10px] text-[#d4af37]">
            {editsCount} active edit{editsCount !== 1 ? "s" : ""} in draft
          </span>
        </div>
      </header>

      {/* ================= WORKSPACE PREVIEW CANVAS ================= */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 overflow-x-hidden bg-[var(--surface-lowest)]">
        <div
          className={`transition-all duration-300 ease-out ${
            viewport === "desktop"
              ? "w-full max-w-[1500px]"
              : viewport === "tablet"
              ? "w-[768px] my-4 p-3 bg-[#1e1e24] rounded-[36px] shadow-2xl border-4 border-[#333]"
              : "w-[375px] my-4 p-3 bg-[#1e1e24] rounded-[48px] shadow-2xl border-4 border-[#333]"
          }`}
        >
          {/* Mobile / Tablet Bezel Notch */}
          {viewport !== "desktop" && (
            <div className="w-full flex items-center justify-center pb-2 select-none">
              <div className="w-16 h-4 bg-black/60 rounded-full flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                <span className="w-2.5 h-1 rounded-full bg-white/20"></span>
              </div>
            </div>
          )}

          {/* Actual Live Iframe Frame */}
          <div className="relative rounded-2xl overflow-hidden border border-[var(--surface-border)] bg-white shadow-xs">
            <iframe
              ref={iframeRef}
              src={`${pageRoute}${pageRoute.includes("?") ? "&" : "?"}preview=admin&cms_editor=1`}
              title={`Visual Editor Preview: ${pageName}`}
              onLoad={handleIframeLoad}
              className={`w-full bg-white transition-all ${
                viewport === "desktop"
                  ? "min-h-[820px] h-[82vh]"
                  : viewport === "tablet"
                  ? "h-[850px]"
                  : "h-[740px]"
              }`}
            />

            {/* Loading Overlay */}
            {!iframeLoaded && (
              <div className="absolute inset-0 bg-white/80 dark:bg-[#141416]/80 backdrop-blur-xs flex items-center justify-center z-10">
                <div className="space-y-3 text-center">
                  <span className="material-symbols-outlined text-3xl animate-spin text-[#d4af37]">
                    progress_activity
                  </span>
                  <p className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Loading Live Page Preview ({pageRoute})...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ================= INLINE TEXT EDITOR DRAWER / DOCK ================= */}
      {selectedTextElement && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-150">
          <div className="bg-white dark:bg-[#18181b] rounded-2xl border-2 border-[#d4af37] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#d4af37]/20 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </div>
                <div>
                  <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                    Inline Pencil Editor: {selectedTextElement.label}
                  </h4>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    Target tag: &lt;{selectedTextElement.tag.toLowerCase()}&gt; • Real-time live typography preview
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeTextEditor}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                title="Close Editor"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Live Text Area */}
            <div className="space-y-1.5">
              <textarea
                rows={selectedTextElement.currentText.length > 80 ? 4 : 2}
                value={selectedTextElement.currentText}
                onChange={(e) => handleLiveTextChange(e.target.value)}
                placeholder="Type new text..."
                autoFocus
                className="w-full p-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-sm focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all leading-relaxed"
              />
              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                <span>{selectedTextElement.currentText.length} characters</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ Updates in live frame as you type
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  handleLiveTextChange(selectedTextElement.originalText);
                }}
                className="text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] hover:text-rose-500 font-semibold cursor-pointer"
              >
                Reset to Original
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeTextEditor}
                  className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold cursor-pointer transition-all shadow-xs"
                >
                  Done Editing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= IMAGE FRAME REPLACEMENT MODAL ================= */}
      {selectedImageElement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-[#16161a] rounded-2xl border border-[var(--surface-border)] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">image</span>
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-main)]">
                    Frame-Based Image Replacement
                  </h3>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    Preserves original frame dimensions and layout
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeImageModal}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Frame Specs Pill */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] text-center text-xs">
              <div>
                <span className="text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] block font-semibold">
                  Frame Dimensions
                </span>
                <span className="font-mono font-bold text-[var(--text-main)]">
                  {selectedImageElement.width} × {selectedImageElement.height} px
                </span>
              </div>
              <div>
                <span className="text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] block font-semibold">
                  Aspect Ratio
                </span>
                <span className="font-mono font-bold text-[#d4af37]">
                  {selectedImageElement.aspectRatio} : 1
                </span>
              </div>
              <div>
                <span className="text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] block font-semibold">
                  Border Radius
                </span>
                <span className="font-mono font-bold text-[var(--text-main)]">
                  {selectedImageElement.borderRadius}
                </span>
              </div>
            </div>

            {/* Frame Preview Area */}
            <div className="space-y-2">
              <span className="text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                Original Frame Preview
              </span>
              <div
                className="relative overflow-hidden border-2 border-dashed border-[#d4af37]/40 bg-black/5 dark:bg-black/30 flex items-center justify-center mx-auto"
                style={{
                  width: "100%",
                  maxHeight: "220px",
                  borderRadius: selectedImageElement.borderRadius || "8px",
                }}
              >
                <img
                  src={imagePreviewUrl || selectedImageElement.src}
                  alt="Frame preview"
                  style={{ objectFit: imageFitMode as any }}
                  className="w-full h-48 rounded"
                />
                {imageFile && (
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-mono text-white">
                    📷 New: {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
            </div>

            {/* Fit / Crop Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                Frame Fit Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["cover", "contain", "fill"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setImageFitMode(mode)}
                    className={`py-1.5 rounded-lg text-xs font-display uppercase tracking-wider font-semibold capitalize cursor-pointer border ${
                      imageFitMode === mode
                        ? "bg-[#d4af37] text-black border-[#d4af37] font-bold"
                        : "border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-muted)]"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* File Picker from Computer */}
            <div className="space-y-2">
              <label className="text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                Select Replacement Image (Computer / Device)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageFilePicked}
                className="w-full text-xs font-serif file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-display file:font-bold file:uppercase file:tracking-wider file:bg-[#d4af37] file:text-black hover:file:bg-[#b08e2b] file:cursor-pointer cursor-pointer border border-[var(--surface-border)] p-2 rounded-xl"
              />
              <span className="text-[10px] font-serif text-[var(--text-muted)] block">
                Supported formats: JPEG, PNG, WebP (Max 5 MB). Uploads persistently to Supabase Storage.
              </span>
            </div>

            {/* Error Message */}
            {imageUploadError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                {imageUploadError}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={closeImageModal}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!imageFile || isUploadingImage}
                onClick={applyImageReplacement}
                className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isUploadingImage ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Apply Replacement to Frame</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EXPLICIT PUBLISH CONFIRMATION MODAL ================= */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-[#16161a] rounded-2xl border border-[var(--surface-border)] shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--surface-border)]">
              <div className="w-10 h-10 rounded-2xl bg-[#d4af37]/20 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">publish</span>
              </div>
              <div>
                <h3 className="font-display text-base font-extrabold uppercase tracking-tight text-[var(--text-main)]">
                  Publish Changes to Live Website
                </h3>
                <p className="font-serif text-xs text-[var(--text-muted)]">
                  Target Destination: <code className="font-mono font-bold text-[#d4af37]">{pageName} ({pageRoute})</code>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] space-y-2">
                <div className="flex items-center justify-between text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  <span>Pending Edits in Draft</span>
                  <span className="font-mono text-[#d4af37]">{editsCount} item{editsCount !== 1 ? "s" : ""}</span>
                </div>

                {editsCount > 0 ? (
                  <div className="max-h-40 overflow-y-auto custom-scroll space-y-1.5 pt-1">
                    {Object.values(draftEdits).map((edit, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-white dark:bg-[#1e1e24] border border-[var(--surface-border)] text-xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-[var(--text-main)] block truncate">
                            {edit.label || edit.selector}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--text-muted)] block truncate">
                            {edit.type === "text" ? `"${edit.value}"` : `Image replacement`}
                          </span>
                        </div>
                        <span className="text-[10px] font-display uppercase tracking-wider px-2 py-0.5 rounded bg-[#d4af37]/10 text-[#d4af37] font-bold shrink-0">
                          {edit.type}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-serif text-[var(--text-muted)] italic">
                    No custom draft edits recorded. Current page content will be affirmed and published.
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 font-serif leading-relaxed">
                ⚠️ <strong>Publishing Confirmation:</strong> This action will update the live public route <code className="font-mono">{pageRoute}</code> and make changes immediately visible to all site visitors and students.
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                {errorMessage}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[var(--surface-border)]">
              <button
                type="button"
                disabled={isPublishing}
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPublishing}
                onClick={handlePublish}
                className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-extrabold shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isPublishing ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Publishing Live...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                    <span>Confirm &amp; Publish Live</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Home Video Management Modal */}
      <HomeVideoEditorModal
        isOpen={showHomeVideoModal}
        onClose={() => setShowHomeVideoModal(false)}
      />

      {/* Methodology Media Management Modal (Req 1) */}
      <MethodologyMediaEditorModal
        isOpen={showMethodologyMediaModal}
        onClose={() => setShowMethodologyMediaModal(false)}
        onSuccess={(msg) => {
          setSuccessToast(msg);
          setTimeout(() => setSuccessToast(null), 4000);
        }}
      />

      {/* Methodology Guided Video Modal */}
      <MethodologyVideoEditorModal
        isOpen={showMethodologyVideoModal}
        onClose={() => setShowMethodologyVideoModal(false)}
        onSaved={() => {
          setSuccessToast("Methodology guided video saved & published successfully!");
          setTimeout(() => setSuccessToast(null), 4000);
        }}
      />

      {/* LMS Working Video Management Modal (Req 2) */}
      <LmsWorkingVideoEditorModal
        isOpen={showLmsWorkingVideoModal}
        onClose={() => setShowLmsWorkingVideoModal(false)}
        onSaved={() => {
          setSuccessToast("LMS Working video saved successfully!");
          setTimeout(() => setSuccessToast(null), 4000);
        }}
      />

      {/* Revert Confirmation Modal (Req 16) */}
      {showRevertModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-500">
              <span className="material-symbols-outlined text-[28px]">history</span>
              <div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                  Revert draft changes?
                </h3>
                <p className="font-serif text-xs text-[var(--text-muted)]">
                  Safe draft rollback confirmation
                </p>
              </div>
            </div>

            <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
              Your unpublished changes will be discarded and the draft will return to the current published version.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setShowRevertModal(false)}
                disabled={isReverting}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevertDraft}
                disabled={isReverting}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isReverting ? "Reverting..." : "Revert"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 flex items-center justify-center text-[#d4af37] border border-[#d4af37]/30">
                  <span className="material-symbols-outlined text-[22px]">history</span>
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                    Published Version History
                  </h3>
                  <p className="font-serif text-xs text-[var(--text-muted)]">
                    Review and restore past published snapshots for &ldquo;{pageName}&rdquo;
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
              {isLoadingRevisions ? (
                <div className="py-12 text-center text-sm font-serif text-[var(--text-muted)] flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg animate-spin text-[#d4af37]">progress_activity</span>
                  <span>Loading version history...</span>
                </div>
              ) : revisions.length === 0 ? (
                <div className="py-12 text-center text-sm font-serif text-[var(--text-muted)]">
                  No previous published revisions recorded yet for this page. Revisions are created automatically whenever you click Publish.
                </div>
              ) : (
                revisions.map((rev) => {
                  const editCount = rev.data ? Object.keys(rev.data).length : 0;
                  const dateStr = new Date(rev.timestamp).toLocaleString();
                  const isCurrentRestoring = isRestoringRevision === rev.id;

                  return (
                    <div
                      key={rev.id}
                      className="p-4 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#d4af37]/40 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[#d4af37]/20 text-[#8a6d1b] dark:text-[#d4af37] font-mono text-xs font-bold">
                            v{rev.version}
                          </span>
                          <span className="text-xs font-display font-semibold text-[var(--text-main)]">
                            {dateStr}
                          </span>
                        </div>
                        <p className="font-serif text-xs text-[var(--text-muted)]">
                          {editCount} content edit{editCount === 1 ? "" : "s"} &bull; {rev.notes || "Published version"}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={!!isRestoringRevision}
                        onClick={() => handleRestoreRevision(rev.id)}
                        className="self-end sm:self-center px-4 py-1.5 rounded-xl border border-[#d4af37] bg-[#d4af37]/10 hover:bg-[#d4af37] text-[#8a6d1b] dark:text-[#d4af37] hover:text-black font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
                      >
                        {isCurrentRestoring ? (
                          <>
                            <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                            <span>Restoring...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[14px]">restore</span>
                            <span>Restore Version</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 flex items-center justify-end border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms Sections Dynamic Editor Modal (Section 6) */}
      <TermsSectionsEditorModal
        isOpen={showTermsSectionsModal}
        onClose={() => setShowTermsSectionsModal(false)}
        onSaved={() => {
          if (iframeRef.current) {
            iframeRef.current.src = `${pageRoute}${pageRoute.includes("?") ? "&" : "?"}t=${Date.now()}`;
          }
        }}
      />

      {/* Privacy Policy Dynamic Editor Modal */}
      <PrivacySectionsEditorModal
        isOpen={showPrivacySectionsModal}
        onClose={() => setShowPrivacySectionsModal(false)}
        onSaved={() => {
          if (iframeRef.current) {
            iframeRef.current.src = `${pageRoute}${pageRoute.includes("?") ? "&" : "?"}t=${Date.now()}`;
          }
        }}
      />

      {/* About Page Teacher Photo Modal (Section 8) */}
      <AboutTeacherPhotoModal
        isOpen={showAboutTeacherPhotoModal}
        onClose={() => setShowAboutTeacherPhotoModal(false)}
        onSaved={() => {
          if (iframeRef.current) {
            iframeRef.current.src = `${pageRoute}${pageRoute.includes("?") ? "&" : "?"}t=${Date.now()}`;
          }
        }}
      />
    </div>
  );
}
