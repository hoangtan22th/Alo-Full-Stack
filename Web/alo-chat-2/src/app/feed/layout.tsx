"use client";
import React from "react";
import Sidebar from "@/components/ui/Sidebar";

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-gray-50 text-gray-800 relative pb-16 md:pb-0">
      <div className="relative z-50 shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-hidden relative h-full">
        {children}
      </main>
    </div>
  );
}
