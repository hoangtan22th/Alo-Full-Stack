"use client";
import { useState } from "react";
import NewDirectChatModal from "@/components/ui/NewDirectChatModal";
import { FaceSmileIcon } from "@heroicons/react/24/outline";


export default function ChatPage() {
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-w-0 h-full bg-[#FAFAFA]">
      <div className="w-24 h-24 bg-black/5 rounded-3xl flex items-center justify-center mb-6">
        <FaceSmileIcon className="w-12 h-12 text-black/40" />
      </div>
      <h2 className="text-2xl font-black tracking-tight text-gray-900 mb-2">
        Chào mừng đến với Alo Chat
      </h2>
      <p className="text-sm font-medium text-gray-500 max-w-md text-center">
        Chọn một cuộc trò chuyện từ danh sách bên trái hoặc bắt đầu một cuộc
        trò chuyện mới để kết nối với mọi người.
      </p>
      <button
        onClick={() => setShowNewChatModal(true)}
        className="mt-6 px-5 py-2.5 bg-black text-white text-[13px] font-bold rounded-full hover:bg-gray-800 transition active:scale-95 shadow-md"
      >
        + Cuộc trò chuyện mới
      </button>

      {/* Modal tạo chat 1-1 */}
      <NewDirectChatModal
        isOpen={showNewChatModal}
        onClose={() => {
          setShowNewChatModal(false);
          // fetchGroups(); // reload list sau khi tạo - handle by Sidebar now via window event or ref if needed, 
          // but Sidebar will also have this modal or can be notified.
          // Actually, Sidebar should probably handle this modal too if it's triggerable from there.
        }}
      />
    </div>
  );
}
