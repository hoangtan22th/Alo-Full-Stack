"use client";
import React from "react";
import Sidebar from "@/components/ui/Sidebar";

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 text-gray-800">
      <Sidebar />
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
