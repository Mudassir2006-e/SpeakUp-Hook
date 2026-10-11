"use client";

import React, { useState, useEffect } from "react";
import AdminTopHeader from "@/components/admin/AdminTopHeader";
import {
  FreeDemoEntry,
  getFreeDemoConfigAction,
  saveGeneralDemoAction,
  deleteGeneralDemoAction,
  deleteFreeDemoAction,
  saveFreeDemoAction,
} from "@/app/admin/free-demo-actions";
import { getCentralCoursesAction } from "@/app/admin/cms-actions";

export default function AdminDemosPage() {
  const [courseDemos, setCourseDemos] = useState<Record<string, FreeDemoEntry>>({});
  const [generalDemos, setGeneralDemos] = useState<FreeDemoEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [courses, setCourses] = useState<any[]>([]);

  // Modals state
  const [showGeneralModal, setShowGeneralModal] = useState<boolean>(false);
  const [editingGeneralDemo, setEditingGeneralDemo] = useState<FreeDemoEntry | null>(null);
  const [previewVideo, setPreviewVideo] = useState<{ title: string; url: string } | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // General Demo Form fields
  const [genTitle, setGenTitle] = useState<string>("");
  const [genDescription, setGenDescription] = useState<string>("");
  const [genVideoUrl, setGenVideoUrl] = useState<string>("");
  const [genDuration, setGenDuration] = useState<string>("4:15 • Platform Demo");
  const [genInstructor, setGenInstructor] = useState<string>("SpeakUp Academic Team");
  const [genThumbnail, setGenThumbnail] = useState<string>("https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80");

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [demoRes, coursesRes] = await Promise.all([
        getFreeDemoConfigAction(),
        getCentralCoursesAction(),
      ]);

      if (demoRes.success) {
        setCourseDemos(demoRes.data || {});
        setGeneralDemos(demoRes.generalDemos || []);
      }
      if (coursesRes.success && Array.isArray(coursesRes.data)) {
        setCourses(coursesRes.data);
      }
    } catch {
      showToast("error", "Failed to load demo configurations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openAddGeneralModal = () => {
    setEditingGeneralDemo(null);
    setGenTitle("");
    setGenDescription("");
    setGenVideoUrl("");
    setGenDuration("4:15 • Platform Demo");
    setGenInstructor("SpeakUp Academic Team");
    setGenThumbnail("https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80");
    setShowGeneralModal(true);
  };

  const openEditGeneralModal = (demo: FreeDemoEntry) => {
    setEditingGeneralDemo(demo);
    setGenTitle(demo.title);
    setGenDescription(demo.description || "");
    setGenVideoUrl(demo.videoUrl);
    setGenDuration(demo.duration || "4:15 • Platform Demo");
    setGenInstructor(demo.instructor || "SpeakUp Academic Team");
    setGenThumbnail(demo.thumbnail || "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80");
    setShowGeneralModal(true);
  };

  const handleSaveGeneralDemo = async () => {
    if (!genTitle.trim() || !genVideoUrl.trim()) {
      showToast("error", "Title and video URL are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveGeneralDemoAction({
        id: editingGeneralDemo?.id,
        title: genTitle,
        description: genDescription,
        videoUrl: genVideoUrl,
        duration: genDuration,
        instructor: genInstructor,
        thumbnail: genThumbnail,
      });

      if (res.success) {
        showToast("success", "General demo video saved and published!");
        setShowGeneralModal(false);
        loadAll();
      } else {
        showToast("error", res.error || "Failed to save demo.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Error saving demo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGeneralDemo = async (id: string) => {
    if (!confirm("Are you sure you want to delete this general demonstration video?")) return;
    try {
      const res = await deleteGeneralDemoAction(id);
      if (res.success) {
        showToast("success", "General demo video deleted.");
        loadAll();
      } else {
        showToast("error", res.error || "Failed to delete demo.");
      }
    } catch {
      showToast("error", "Error deleting demo.");
    }
  };

  const handleDeleteCourseDemo = async (courseId: string) => {
    if (!confirm("Are you sure you want to remove the Free Demo for this course?")) return;
    try {
      const res = await deleteFreeDemoAction(courseId);
      if (res.success) {
        showToast("success", "Course demo removed.");
        loadAll();
      } else {
        showToast("error", res.error || "Failed to remove course demo.");
      }
    } catch {
      showToast("error", "Error removing course demo.");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AdminTopHeader
          title="Demo Videos Management"
          subtitle="Manage general demonstration videos and course-linked previews displayed on the public Demo page"
          actions={
            <button
              type="button"
              onClick={openAddGeneralModal}
              className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-extrabold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Add General Demo</span>
            </button>
          }
        />

        <main className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
          {toast && (
            <div
              className={`p-4 rounded-xl text-xs font-display font-semibold flex items-center gap-2 ${
                toast.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {toast.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{toast.message}</span>
            </div>
          )}

          {/* Section 1: General Demonstration Videos */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border)]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d4af37]">smart_display</span>
                <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
                  General Demonstration Videos
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] font-mono text-xs font-bold">
                  {generalDemos.length}
                </span>
              </div>
              <p className="font-serif text-xs text-[var(--text-muted)] hidden sm:block">
                Videos demonstrating the overall SpeakUp methodology without course attachment
              </p>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm font-serif text-[var(--text-muted)]">
                Loading demonstrations...
              </div>
            ) : generalDemos.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[var(--surface-low)] border border-[var(--surface-border)] text-center space-y-3">
                <p className="font-serif text-sm text-[var(--text-muted)]">
                  No general demonstration videos added yet. Click &ldquo;Add General Demo&rdquo; to add a platform overview.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {generalDemos.map((demo) => (
                  <div
                    key={demo.id}
                    className="p-5 rounded-2xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] hover:border-[#d4af37]/40 shadow-xs flex flex-col justify-between space-y-4 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black group">
                        <img
                          src={demo.thumbnail || "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80"}
                          alt={demo.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewVideo({ title: demo.title, url: demo.videoUrl })}
                          className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center text-white transition-all cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[20px] ml-0.5">play_arrow</span>
                          </div>
                        </button>
                        <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-[#d4af37] text-black font-display text-[10px] uppercase font-bold tracking-wider">
                          General Demo
                        </span>
                      </div>

                      <div>
                        <h3 className="font-display text-sm font-bold text-[var(--text-main)] line-clamp-2">
                          {demo.title}
                        </h3>
                        <p className="font-serif text-xs text-[var(--text-muted)] line-clamp-2 mt-1">
                          {demo.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-[var(--text-muted)]">
                          <span>{demo.duration}</span>
                          <span>&bull;</span>
                          <span>{demo.instructor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--surface-border)]">
                      <button
                        type="button"
                        onClick={() => openEditGeneralModal(demo)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] text-xs font-display font-semibold cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGeneralDemo(demo.id)}
                        className="px-3 py-1.5 rounded-lg border border-rose-500/30 hover:border-rose-500 text-rose-600 dark:text-rose-400 text-xs font-display font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Course-Linked Demos */}
          <section className="space-y-4 pt-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border)]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d4af37]">school</span>
                <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
                  Course-Linked Demonstrations
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] font-mono text-xs font-bold">
                  {Object.keys(courseDemos).length}
                </span>
              </div>
              <p className="font-serif text-xs text-[var(--text-muted)] hidden sm:block">
                Previews attached to specific course modules and lessons
              </p>
            </div>

            {Object.keys(courseDemos).length === 0 ? (
              <div className="p-8 rounded-2xl bg-[var(--surface-low)] border border-[var(--surface-border)] text-center space-y-2">
                <p className="font-serif text-sm text-[var(--text-muted)]">
                  No course-linked demos configured yet. You can attach a free demo lesson to any course inside the Courses section.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Object.entries(courseDemos).map(([cId, demo]) => (
                  <div
                    key={cId}
                    className="p-5 rounded-2xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] hover:border-[#d4af37]/40 shadow-xs flex flex-col justify-between space-y-4 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black group">
                        <img
                          src={demo.thumbnail || "https://images.unsplash.com/photo-1527866959252-deab85ef7d1b?auto=format&fit=crop&w=1200&q=80"}
                          alt={demo.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewVideo({ title: demo.title, url: demo.videoUrl })}
                          className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center text-white transition-all cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[20px] ml-0.5">play_arrow</span>
                          </div>
                        </button>
                        <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-display text-[10px] uppercase font-bold tracking-wider">
                          {demo.courseTitle || cId}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-display text-sm font-bold text-[var(--text-main)] line-clamp-2">
                          {demo.title}
                        </h3>
                        <p className="font-serif text-xs text-[var(--text-muted)] mt-1">
                          {demo.moduleTitle} &bull; {demo.lessonTitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--surface-border)]">
                      <button
                        type="button"
                        onClick={() => handleDeleteCourseDemo(cId)}
                        className="px-3 py-1.5 rounded-lg border border-rose-500/30 hover:border-rose-500 text-rose-600 dark:text-rose-400 text-xs font-display font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

      {/* General Demo Add/Edit Modal */}
      {showGeneralModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
              <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                {editingGeneralDemo ? "Edit General Demo Video" : "Add General Demonstration Video"}
              </h3>
              <button
                type="button"
                onClick={() => setShowGeneralModal(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Demo Title *
                </label>
                <input
                  type="text"
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  placeholder="e.g. SpeakUp Executive Defense Masterclass Overview"
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs text-[var(--text-main)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Video URL (YouTube, Vimeo, or Direct MP4) *
                </label>
                <input
                  type="text"
                  value={genVideoUrl}
                  onChange={(e) => setGenVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-mono text-[var(--text-main)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Duration Badge
                  </label>
                  <input
                    type="text"
                    value={genDuration}
                    onChange={(e) => setGenDuration(e.target.value)}
                    placeholder="4:15 • Platform Demo"
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs text-[var(--text-main)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Instructor / Faculty
                  </label>
                  <input
                    type="text"
                    value={genInstructor}
                    onChange={(e) => setGenInstructor(e.target.value)}
                    placeholder="SpeakUp Academic Team"
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs text-[var(--text-main)]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={genDescription}
                  onChange={(e) => setGenDescription(e.target.value)}
                  placeholder="Short description of this demonstration session..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs text-[var(--text-main)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Thumbnail Image URL
                </label>
                <input
                  type="text"
                  value={genThumbnail}
                  onChange={(e) => setGenThumbnail(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-mono text-[var(--text-main)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setShowGeneralModal(false)}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGeneralDemo}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-extrabold shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save & Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div
          onClick={() => setPreviewVideo(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[#141416] border-b border-white/10 text-white">
              <span className="font-display text-xs uppercase tracking-wider font-bold truncate">
                {previewVideo.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="relative w-full aspect-video">
              <iframe
                src={
                  previewVideo.url.includes("watch?v=")
                    ? `https://www.youtube-nocookie.com/embed/${previewVideo.url.split("watch?v=")[1]?.split("&")[0]}?autoplay=1`
                    : previewVideo.url
                }
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
