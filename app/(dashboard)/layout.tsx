"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts();

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto overscroll-none">
          {children}
        </main>
      </div>
    </div>
  );
}
