"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminRouteGuard from "@/components/admin/AdminRouteGuard";
import AdminInactivityWatcher from "@/components/admin/AdminInactivityWatcher";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  return (
    <AdminRouteGuard onAdminResolved={setAdminEmail}>
      {/* Automatic Inactivity Watcher (2 continuous minutes timeout) */}
      <AdminInactivityWatcher />

      <div className="min-h-screen flex bg-[var(--bg-main)] text-[var(--text-main)] font-serif antialiased">
        {/* Dedicated Admin Sidebar */}
        <AdminSidebar adminEmail={adminEmail} />

        {/* Main Admin Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminRouteGuard>
  );
}
