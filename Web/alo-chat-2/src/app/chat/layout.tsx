"use client";

import Sidebar from "@/components/ui/Sidebar";
import ConversationSidebar from "@/components/ui/ConversationSidebar";

import { usePathname } from "next/navigation";
import { useChatStore } from "@/store/useChatStore";
import { useShallow } from "zustand/react/shallow";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isConversationActive = pathname !== "/chat" && pathname?.startsWith("/chat/");

  const { showInfoPanel } = useChatStore(
    useShallow((s) => ({
      showInfoPanel: s.showInfoPanel,
    }))
  );

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-white text-black relative">
      <div className={`${isConversationActive ? 'hidden md:block' : 'block'} shrink-0 relative z-50`}>
        <Sidebar />
      </div>
      
      {/* 
        Trên mobile: Ẩn ConversationSidebar nếu đang mở 1 cuộc trò chuyện.
        Trên md đến xl: Ẩn ConversationSidebar nếu Right Info Panel (Bảng thông tin) đang bật để tránh choáng chỗ (thu bớt bên trái như Zalo).
        Trên xl trở lên: Luôn hiển thị song song.
      */}
      <div className={
        isConversationActive 
          ? `hidden md:flex h-full shrink-0 flex-col w-full md:w-auto ${showInfoPanel ? 'xl:flex hidden' : ''}` 
          : "flex h-full shrink-0 flex-col w-full md:w-auto"
      }>
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
