"use client";

import React, { useRef, useEffect, useState } from "react";

import { uploadEmailAssetAction } from "@/app/admin/email-actions";

interface VisualEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onInsertPlaceholder?: (tag: string) => void;
  onAttachFile?: (file: File) => void;
  minHeight?: string;
}

export default function VisualEmailEditor({
  value,
  onChange,
  placeholder = "Write your email message here. Use formatting tools above...",
  onInsertPlaceholder,
  onAttachFile,
  minHeight = "280px",
}: VisualEmailEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isInternalUpdate = useRef(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Sync external value to contentEditable when not triggered by local typing
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, arg);
      handleInput();
    }
  };

  const handleInsertLink = () => {
    const url = prompt("Enter hyperlink URL (e.g. https://speakup.edu):");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  // Safe Image insertion that preserves composition width and filename
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(`File "${file.name}" exceeds the 5MB image size limit.`);
      return;
    }

    setUploadStatus(`Uploading image "${file.name}"...`);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadEmailAssetAction(formData);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to upload image.");
      }

      const imageUrl = res.data.url;
      const fileName = res.data.fileName || file.name;
      const sizeKb = (file.size / 1024).toFixed(1);

      // Notify parent to track as attachment/asset
      if (onAttachFile) {
        onAttachFile(file);
      }

      if (editorRef.current) {
        editorRef.current.focus();

        // Build constrained image block that never breaks email layout
        const imageFigureHtml = `
          <figure class="speakup-email-image" data-filename="${fileName}" style="margin: 16px 0; max-width: 100%; display: block; clear: both; user-select: text;">
            <div style="position: relative; display: inline-block; max-width: 100%;">
              <img src="${imageUrl}" alt="${fileName}" style="max-width: 100%; max-height: 380px; width: auto; height: auto; object-fit: contain; border-radius: 8px; border: 1px solid rgba(212,175,55,0.3); display: block;" />
            </div>
            <figcaption style="font-family: sans-serif; font-size: 11px; color: #737373; margin-top: 5px; display: block;">
              📷 ${fileName} (${sizeKb} KB)
            </figcaption>
          </figure>
          <p><br></p>
        `;

        document.execCommand("insertHTML", false, imageFigureHtml);
        handleInput();
        setUploadStatus(`Image "${fileName}" inserted successfully.`);
        setTimeout(() => setUploadStatus(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || "Image upload failed. Please try again.");
      setUploadStatus(null);
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      // Forward to safe image upload
      const dummyEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleImageUpload(dummyEvent);
      return;
    }

    if (onAttachFile) {
      onAttachFile(file);
    }

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      // PDF Certificate / attachment insertion workflow
      if (editorRef.current) {
        editorRef.current.focus();
        const certificateHtml = `<div style="margin: 14px 0; padding: 12px 16px; border: 1.5px solid #d4af37; border-radius: 10px; background-color: #fbf8f1; display: inline-flex; align-items: center; gap: 12px;"><span style="font-size: 24px;">📜</span><div><div style="font-family: sans-serif; font-size: 13px; font-weight: bold; color: #141416;">Attached PDF: ${file.name}</div><div style="font-family: sans-serif; font-size: 11px; color: #737373;">Official Attachment (${(file.size / 1024).toFixed(1)} KB)</div></div></div><p><br></p>`;
        document.execCommand("insertHTML", false, certificateHtml);
        handleInput();
      }
    } else {
      // General safe attachment
      if (editorRef.current) {
        editorRef.current.focus();
        const attachmentHtml = `<div style="margin: 10px 0; padding: 8px 14px; border: 1px solid #e5e5e5; border-radius: 8px; background-color: #f5f5f5; display: inline-flex; align-items: center; gap: 8px;"><span style="font-size: 16px;">📎</span><span style="font-family: sans-serif; font-size: 12px; font-weight: 600; color: #141416;">Attached File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)</span></div><p><br></p>`;
        document.execCommand("insertHTML", false, attachmentHtml);
        handleInput();
      }
    }
    setShowFileModal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleInsertTag = (tag: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      executeCommand("insertText", tag);
      if (onInsertPlaceholder) {
        onInsertPlaceholder(tag);
      }
    }
  };

  return (
    <div className="w-full rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-[#141416] overflow-hidden shadow-xs focus-within:border-[#d4af37] transition-all">
      {/* Visual Email Formatting Toolbar */}
      <div className="px-3 py-2 bg-[#f9f5ed] dark:bg-[var(--surface-low)] border-b border-[var(--surface-border)] flex flex-wrap items-center gap-1 text-xs select-none">
        {/* Text Styles */}
        <div className="flex items-center gap-0.5 bg-white dark:bg-[#141416] p-0.5 rounded-lg border border-[var(--surface-border)]">
          <button
            type="button"
            onClick={() => executeCommand("bold")}
            className="w-7 h-7 flex items-center justify-center font-bold text-xs hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer"
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => executeCommand("italic")}
            className="w-7 h-7 flex items-center justify-center italic font-serif text-xs hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer"
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => executeCommand("underline")}
            className="w-7 h-7 flex items-center justify-center underline text-xs hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer"
            title="Underline (Ctrl+U)"
          >
            U
          </button>
          <button
            type="button"
            onClick={() => executeCommand("strikeThrough")}
            className="w-7 h-7 flex items-center justify-center line-through text-xs hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer"
            title="Strikethrough"
          >
            S
          </button>
        </div>

        {/* Headings / Block Types */}
        <div className="flex items-center gap-0.5 bg-white dark:bg-[#141416] p-0.5 rounded-lg border border-[var(--surface-border)]">
          <button
            type="button"
            onClick={() => executeCommand("formatBlock", "<h2>")}
            className="px-2 h-7 flex items-center justify-center font-bold text-[11px] font-display hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer"
            title="Heading"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => executeCommand("formatBlock", "<h3>")}
            className="px-2 h-7 flex items-center justify-center font-bold text-[11px] font-display hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer"
            title="Subheading"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => executeCommand("formatBlock", "<p>")}
            className="px-2 h-7 flex items-center justify-center text-[11px] font-display hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer"
            title="Normal Paragraph"
          >
            Normal
          </button>
        </div>

        {/* Text Alignment */}
        <div className="flex items-center gap-0.5 bg-white dark:bg-[#141416] p-0.5 rounded-lg border border-[var(--surface-border)]">
          <button
            type="button"
            onClick={() => executeCommand("justifyLeft")}
            className="w-7 h-7 flex items-center justify-center hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer"
            title="Align Left"
          >
            <span className="material-symbols-outlined text-[16px]">format_align_left</span>
          </button>
          <button
            type="button"
            onClick={() => executeCommand("justifyCenter")}
            className="w-7 h-7 flex items-center justify-center hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer"
            title="Align Center"
          >
            <span className="material-symbols-outlined text-[16px]">format_align_center</span>
          </button>
          <button
            type="button"
            onClick={() => executeCommand("justifyRight")}
            className="w-7 h-7 flex items-center justify-center hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer"
            title="Align Right"
          >
            <span className="material-symbols-outlined text-[16px]">format_align_right</span>
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 bg-white dark:bg-[#141416] p-0.5 rounded-lg border border-[var(--surface-border)]">
          <button
            type="button"
            onClick={() => executeCommand("insertUnorderedList")}
            className="w-7 h-7 flex items-center justify-center hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer"
            title="Bullet List"
          >
            <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
          </button>
          <button
            type="button"
            onClick={() => executeCommand("insertOrderedList")}
            className="w-7 h-7 flex items-center justify-center hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer"
            title="Numbered List"
          >
            <span className="material-symbols-outlined text-[16px]">format_list_numbered</span>
          </button>
        </div>

        {/* Links & File Attachments */}
        <div className="flex items-center gap-0.5 bg-white dark:bg-[#141416] p-0.5 rounded-lg border border-[var(--surface-border)]">
          <button
            type="button"
            onClick={handleInsertLink}
            className="w-7 h-7 flex items-center justify-center hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer"
            title="Insert Link"
          >
            <span className="material-symbols-outlined text-[16px]">link</span>
          </button>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="px-2.5 h-7 flex items-center justify-center gap-1 hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer text-[11px] font-display font-bold uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37]"
            title="Insert Constrained Image (JPEG, PNG, WebP)"
          >
            <span className="material-symbols-outlined text-[16px]">image</span>
            <span>Image</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 h-7 flex items-center justify-center gap-1.5 hover:bg-[#d4af37]/20 hover:text-[#d4af37] rounded transition-colors cursor-pointer text-[11px] font-display font-bold uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37]"
            title="Upload Files (PDFs, Documents)"
          >
            <span className="material-symbols-outlined text-[16px]">upload_file</span>
            <span>Attach File</span>
          </button>
        </div>

        {/* Hidden image picker input */}
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleImageUpload}
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
        />

        {/* Hidden file picker input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleLocalFileUpload}
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
        />

        {/* Clear formatting */}
        <button
          type="button"
          onClick={() => executeCommand("removeFormat")}
          className="w-7 h-7 flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-500 rounded transition-colors cursor-pointer"
          title="Clear Formatting"
        >
          <span className="material-symbols-outlined text-[16px]">format_clear</span>
        </button>

        {/* Placeholder Quick Insert Pill (Phase 7 Part 2) */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold hidden md:inline">
            Insert Tag:
          </span>
          <button
            type="button"
            onClick={() => handleInsertTag("{{full_name}}")}
            className="px-2 py-1 rounded-md bg-[#d4af37]/15 hover:bg-[#d4af37]/30 text-[#8a6d1b] dark:text-[#d4af37] border border-[#d4af37]/30 text-[10px] font-display uppercase tracking-wider font-bold cursor-pointer transition-colors"
            title="Insert student's complete name"
          >
            + {"{{full_name}}"}
          </button>
          <button
            type="button"
            onClick={() => handleInsertTag("{{course_name}}")}
            className="px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[var(--text-main)] border border-[var(--surface-border)] text-[10px] font-mono cursor-pointer transition-colors"
            title="Insert course name"
          >
            + {"{{course_name}}"}
          </button>
        </div>
      </div>

      {/* Uploading / Success Status Banner */}
      {uploadStatus && (
        <div className="px-4 py-2 bg-[#d4af37]/15 border-b border-[#d4af37]/30 flex items-center justify-between text-xs text-[#8a6d1b] dark:text-[#d4af37]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            <span className="font-display font-semibold">{uploadStatus}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadStatus(null)}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Scoped CSS for email composition images to never overflow or disrupt typing */}
      <style jsx global>{`
        .email-visual-content .speakup-email-image {
          margin: 14px 0 !important;
          max-width: 100% !important;
          display: block !important;
          clear: both !important;
        }
        .email-visual-content .speakup-email-image img {
          max-width: 100% !important;
          max-height: 380px !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
          border-radius: 8px !important;
          display: inline-block !important;
        }
      `}</style>

      {/* Visual Content Editable Area (No raw HTML exposed!) */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        style={{ minHeight }}
        data-placeholder={placeholder}
        className="w-full p-5 text-sm font-serif text-[var(--text-main)] focus:outline-none overflow-y-auto custom-scroll leading-relaxed email-visual-content empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-muted)] empty:before:italic"
      />

      {/* Insert / Upload File Modal */}
      {showFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#d4af37]">attach_file</span>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-main)]">
                  Insert / Upload File
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFileModal(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 1: Select File from Computer / Device */}
              <div className="p-4 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl text-[#d4af37]">upload_file</span>
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                    Local Device / Computer
                  </span>
                </div>
                <p className="text-xs font-serif text-[var(--text-muted)] leading-relaxed">
                  Select an image (PNG, JPG, WEBP) or an official PDF Certificate to embed directly into the email.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full mt-2 py-2 px-3 rounded-lg bg-[#d4af37] hover:bg-[#c29d2b] text-black text-xs font-display uppercase tracking-wider font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">folder_open</span>
                  <span>Choose File From Computer</span>
                </button>
              </div>

              {/* Option 2: PDF Certificate Workflow */}
              <div className="p-3.5 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-display uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Student Certificate Workflow (PDF)</span>
                </div>
                <p className="text-[11px] font-serif text-[var(--text-muted)] leading-relaxed">
                  Uploading a PDF creates a verifiable SpeakUp Certificate attachment block linked to <code className="font-mono text-[#d4af37]">{"{{full_name}}"}</code>.
                </p>
              </div>

              {/* Option 3: Cloud / Drive Connector Status */}
              <div className="p-3.5 rounded-xl border border-[var(--surface-border)] bg-black/5 dark:bg-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">cloud_queue</span>
                    Google Drive / Cloud Storage
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-muted)]">
                    Connector Ready
                  </span>
                </div>
                <p className="text-[11px] font-serif text-[var(--text-muted)]">
                  Connect your Google Drive API or cloud bucket for instant cloud asset selection without downloading locally.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFileModal(false)}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
