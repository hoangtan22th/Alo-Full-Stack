"use client";

import Sidebar from "@/components/ui/Sidebar";
import ConversationSidebar from "@/components/ui/ConversationSidebar";

import { usePathname } from "next/navigation";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isConversationActive = pathname !== "/chat" && pathname?.startsWith("/chat/");

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-white text-black relative">
      <div className={`${isConversationActive ? 'hidden md:block' : 'block'} shrink-0 z-50`}>
        <Sidebar />
      </div>
      
      {/* 
        Trên mobile: Ẩn ConversationSidebar nếu đang mở 1 cuộc trò chuyện.
        Trên md trở lên: Luôn hiện.
      */}
      <div className={isConversationActive ? "hidden md:flex h-full shrink-0 flex-col w-full md:w-auto" : "flex h-full shrink-0 flex-col w-full md:w-auto"}>
        <ConversationSidebar />
      </div>

      {/* 
        Trên mobile: Ẩn children (Chat Area) nếu KHÔNG có cuộc trò chuyện nào active.
        Trên md trở lên: Luôn hiện (khi không active thường là màn hình rỗng).
      */}
      <div className={!isConversationActive ? "hidden md:flex flex-1 h-full flex-row min-w-0" : "flex flex-1 h-full flex-row min-w-0"}>
        {children}
      </div>
    </div>
  );
}
