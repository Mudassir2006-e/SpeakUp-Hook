"use client";

import React from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import AddCourseWorkspace from "@/components/admin/AddCourseWorkspace";

export default function AdminCoursesPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#faf8f5] dark:bg-[#0c0c0e]">
      <AdminHeader
        title="Courses"
        subtitle="Centralized academic course management, curriculum modules, and lesson content"
      />
      <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
        <AddCourseWorkspace />
      </main>
    </div>
  );
}
