"use client";

import Sidebar from "@/components/ui/Sidebar";
import ConversationSidebar from "@/components/ui/ConversationSidebar";

import { usePathname } from "next/navigation";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isConversationActive = pathname !== "/chat" && pathname?.startsWith("/chat/");

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-white text-black relative">
      <Sidebar />
      
      {/* 
        Trên mobile: Ẩn ConversationSidebar nếu đang mở 1 cuộc trò chuyện.
        Trên md trở lên: Luôn hiện.
      */}
      <div className={`h-full shrink-0 flex-col md:flex ${isConversationActive ? 'hidden' : 'flex'} w-full md:w-auto`}>
        <ConversationSidebar />
      </div>

      {/* 
        Trên mobile: Ẩn children (Chat Area) nếu KHÔNG có cuộc trò chuyện nào active.
        Trên md trở lên: Luôn hiện (khi không active thường là màn hình rỗng).
      */}
      <div className={`flex-1 h-full flex-col min-w-0 ${!isConversationActive ? 'hidden md:flex' : 'flex'}`}>
        {children}
      </div>
    </div>
  );
}
