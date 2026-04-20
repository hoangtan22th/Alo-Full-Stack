"use client";

import Sidebar from "@/components/ui/Sidebar";
import ConversationSidebar from "@/components/ui/ConversationSidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-black">
      <Sidebar />
      <ConversationSidebar />
      {children}
    </div>
  );
}
