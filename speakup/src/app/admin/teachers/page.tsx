"use client";

import React, { useState, useEffect, useRef } from "react";
import AdminTopHeader from "@/components/admin/AdminTopHeader";
import {
  CentralTeacherItem,
  getCentralTeachersAction,
  saveCentralTeacherAction,
  deleteCentralTeacherAction,
  reorderCentralTeachersAction,
  uploadTeacherAvatarAction,
} from "@/app/admin/teachers-actions";
import InitialsAvatar from "@/components/InitialsAvatar";

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<CentralTeacherItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTeacher, setEditingTeacher] = useState<CentralTeacherItem | null>(null);

  // Form State
  const [name, setName] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [initials, setInitials] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [featuredOnAboutBanner, setFeaturedOnAboutBanner] = useState<boolean>(false);
  const [avatarFitMode, setAvatarFitMode] = useState<"cover" | "contain">("cover");
  const [avatarPosition, setAvatarPosition] = useState<string>("center");

  // Picture Upload & Editing State
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [teacherToDelete, setTeacherToDelete] = useState<CentralTeacherItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const res = await getCentralTeachersAction();
      if (res.success && Array.isArray(res.data)) {
        setTeachers(res.data);
      }
    } catch {
      showToast("error", "Failed to load teachers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const openAddModal = () => {
    setEditingTeacher(null);
    setName("");
    setTitle("");
    setSubject("");
    setDescription("");
    setInitials("");
    setAvatarUrl("");
    setFeaturedOnAboutBanner(false);
    setAvatarFitMode("cover");
    setAvatarPosition("center");
    setIsModalOpen(true);
  };

  const openEditModal = (t: CentralTeacherItem) => {
    setEditingTeacher(t);
    setName(t.name);
    setTitle(t.title);
    setSubject(t.subject || "");
    setDescription(t.description);
    setInitials(t.initials || "");
    setAvatarUrl(t.avatarUrl || "");
    setFeaturedOnAboutBanner(Boolean(t.featuredOnAboutBanner));
    setAvatarFitMode(t.avatarFitMode || "cover");
    setAvatarPosition(t.avatarPosition || "center");
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadTeacherAvatarAction(formData);

      if (res.success && res.url) {
        setAvatarUrl(res.url);
        showToast("success", "Picture uploaded successfully!");
      } else {
        showToast("error", res.error || "Failed to upload picture.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Error uploading picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("error", "Teacher name is required.");
      return;
    }
    if (!title.trim()) {
      showToast("error", "Teacher role/title is required.");
      return;
    }
    if (!description.trim()) {
      showToast("error", "Teacher experience summary is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveCentralTeacherAction({
        id: editingTeacher?.id,
        name: name.trim(),
        title: title.trim(),
        subject: subject.trim() || undefined,
        description: description.trim(),
        initials: initials.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        featuredOnAboutBanner,
        avatarFitMode,
        avatarPosition,
        order: editingTeacher?.order,
      });

      if (res.success) {
        showToast("success", "Teacher details saved & published successfully!");
        setIsModalOpen(false);
        loadTeachers();
      } else {
        showToast("error", res.error || "Failed to save teacher.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Error saving teacher.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteCentralTeacherAction(teacherToDelete.id);
      if (res.success) {
        showToast("success", "Teacher removed successfully.");
        setTeacherToDelete(null);
        loadTeachers();
      } else {
        showToast("error", res.error || "Failed to delete teacher.");
      }
    } catch {
      showToast("error", "Error deleting teacher.");
    } finally {
      setDeleting(false);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= teachers.length) return;

    const reordered = [...teachers];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setTeachers(reordered);

    try {
      const res = await reorderCentralTeachersAction(reordered.map((t) => t.id));
      if (res.success) {
        showToast("success", "Faculty order updated!");
      }
    } catch {
      showToast("error", "Failed to save reorder.");
      loadTeachers();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AdminTopHeader
        title="Teachers & Faculty"
        subtitle="Manage academic educators, linguistic mentors, and optional About page banner showcase"
        actions={
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-extrabold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Teacher</span>
          </button>
        }
      />

      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      <main className="p-6 sm:p-8 max-w-5xl space-y-6">
        {toast && (
          <div
            className={`p-3.5 rounded-xl text-xs font-serif flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {toast.type === "success" ? "check_circle" : "error"}
            </span>
            <span>{toast.message}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm font-serif text-[var(--text-muted)]">
            Loading faculty mentors...
          </div>
        ) : teachers.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] space-y-3">
            <span className="material-symbols-outlined text-4xl text-[var(--text-muted)]">badge</span>
            <p className="font-serif text-sm text-[var(--text-muted)]">No faculty members found.</p>
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#141416] font-display text-xs uppercase tracking-wider font-bold cursor-pointer"
            >
              Add First Teacher
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {teachers.map((teacher, index) => (
              <div
                key={teacher.id}
                className="p-4 sm:p-5 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] hover:border-[#d4af37]/60 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Avatar / Initials Frame Preview */}
                  <div className="w-14 h-14 rounded-2xl bg-[var(--surface-low)] border border-[var(--surface-border)] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {teacher.avatarUrl ? (
                      <img
                        src={teacher.avatarUrl}
                        alt={teacher.name}
                        className="w-full h-full"
                        style={{
                          objectFit: teacher.avatarFitMode || "cover",
                          objectPosition: teacher.avatarPosition || "center",
                        }}
                      />
                    ) : (
                      <InitialsAvatar
                        name={teacher.name}
                        sizeClass="w-14 h-14"
                        className="rounded-2xl"
                      />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-base font-bold text-[var(--text-main)] truncate">
                        {teacher.name}
                      </h3>
                      <span className="font-mono text-[10px] text-[#8a6d1b] dark:text-[#d4af37] bg-[#d4af37]/15 px-2 py-0.5 rounded-md font-semibold">
                        #{teacher.order}
                      </span>
                      {teacher.featuredOnAboutBanner && (
                        <span className="font-display text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                          ★ About Banner
                        </span>
                      )}
                    </div>
                    <p className="font-display text-xs text-[#d4af37] font-semibold">
                      {teacher.title} {teacher.subject ? `• ${teacher.subject}` : ""}
                    </p>
                    <p className="font-serif text-xs text-[var(--text-muted)] line-clamp-2 max-w-2xl leading-relaxed">
                      {teacher.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {/* Reorder Buttons */}
                  <div className="flex items-center border border-[var(--surface-border)] rounded-xl overflow-hidden bg-[var(--surface-low)]">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, "up")}
                      className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                    </button>
                    <button
                      type="button"
                      disabled={index === teachers.length - 1}
                      onClick={() => handleMove(index, "down")}
                      className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditModal(teacher)}
                    className="px-3.5 py-1.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-xs font-display font-semibold cursor-pointer transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherToDelete(teacher)}
                    className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 hover:border-rose-500 text-rose-600 dark:text-rose-400 text-xs font-display font-semibold cursor-pointer transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit Teacher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)] shrink-0">
              <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                {editingTeacher ? "Edit Teacher & Faculty Details" : "Add Faculty Member"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-4 flex-1 overflow-y-auto custom-scroll pr-1">
              {/* Teacher Picture Management Section */}
              <div className="p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] space-y-3">
                <span className="block text-[11px] font-display uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                  Teacher Profile Picture
                </span>

                <div className="flex items-center gap-4">
                  {/* Actual Display Frame Preview */}
                  <div className="w-18 h-18 rounded-2xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Teacher Preview"
                        className="w-full h-full"
                        style={{
                          objectFit: avatarFitMode,
                          objectPosition: avatarPosition,
                        }}
                      />
                    ) : (
                      <InitialsAvatar
                        name={name || "Teacher"}
                        sizeClass="w-full h-full"
                        textSizeClass="text-2xl"
                        className="rounded-2xl"
                      />
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="px-3 py-1.5 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-lowest)] text-xs font-display uppercase tracking-wider font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[#d4af37]">upload</span>
                        <span>{uploadingAvatar ? "Uploading..." : avatarUrl ? "Replace Picture" : "Upload Picture"}</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl("")}
                          className="px-2.5 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500 text-red-600 dark:text-red-400 text-xs font-display uppercase font-bold cursor-pointer"
                          title="Remove picture and restore initials fallback"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Or enter direct image URL..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-xs text-[var(--text-main)] font-serif focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                {/* Picture Frame Adjustment (Fit vs Fill, Centering) */}
                {avatarUrl && (
                  <div className="pt-2 border-t border-[var(--surface-border)]/60 flex flex-wrap items-center gap-2 text-[10px] font-display uppercase font-bold">
                    <span className="text-[var(--text-muted)]">Fit:</span>
                    <button
                      type="button"
                      onClick={() => setAvatarFitMode("cover")}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        avatarFitMode === "cover" ? "bg-[#d4af37] text-[#141416]" : "bg-[var(--surface-lowest)] text-[var(--text-muted)]"
                      }`}
                    >
                      Fill
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarFitMode("contain")}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        avatarFitMode === "contain" ? "bg-[#d4af37] text-[#141416]" : "bg-[var(--surface-lowest)] text-[var(--text-muted)]"
                      }`}
                    >
                      Fit
                    </button>

                    <span className="text-[var(--text-muted)] ml-2">Position:</span>
                    <button
                      type="button"
                      onClick={() => setAvatarPosition("center")}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        avatarPosition === "center" ? "bg-[#d4af37]/30 text-[#8a6d1b] dark:text-[#d4af37]" : "bg-[var(--surface-lowest)] text-[var(--text-muted)]"
                      }`}
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarPosition("top")}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        avatarPosition === "top" ? "bg-[#d4af37]/30 text-[#8a6d1b] dark:text-[#d4af37]" : "bg-[var(--surface-lowest)] text-[var(--text-muted)]"
                      }`}
                    >
                      Top
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarPosition("bottom")}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        avatarPosition === "bottom" ? "bg-[#d4af37]/30 text-[#8a6d1b] dark:text-[#d4af37]" : "bg-[var(--surface-lowest)] text-[var(--text-muted)]"
                      }`}
                    >
                      Bottom
                    </button>
                  </div>
                )}
              </div>

              {/* Name & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Teacher Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Eleanor Vance"
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Designation / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Linguistics Mentor"
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              {/* Subject & Initials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Subject / Courses Taught
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. German A1–B2, Oral Cadence"
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Initials Badge
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={initials}
                    onChange={(e) => setInitials(e.target.value)}
                    placeholder="e.g. EV"
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              {/* Short Experience Summary */}
              <div className="space-y-1">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Short Experience Summary (2–3 Lines) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Concise overview of vocal coaching specialty and executive communication background..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              {/* About Banner Feature Toggle */}
              <div className="p-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-display text-xs font-bold text-[var(--text-main)] block">
                    Display on About Page Banner
                  </span>
                  <span className="font-serif text-[11px] text-[var(--text-muted)] block">
                    Showcases this teacher in a compact highlight frame on the public About page hero
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={featuredOnAboutBanner}
                  onChange={(e) => setFeaturedOnAboutBanner(e.target.checked)}
                  className="w-4 h-4 accent-[#d4af37] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-extrabold shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save & Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-lowest)] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
              Remove {teacherToDelete.name}?
            </h3>
            <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
              This action will permanently delete this faculty mentor from the database and public site.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTeacherToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTeacher}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-display text-xs uppercase tracking-wider font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
