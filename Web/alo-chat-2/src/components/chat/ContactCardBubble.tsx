"use client";
import { MessageDTO } from "@/services/messageService";
import { groupService } from "@/services/groupService";
import { ChatBubbleLeftRightIcon, UserIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/store/useAuthStore";

interface ContactCardBubbleProps {
  msg: MessageDTO;
}

export default function ContactCardBubble({ msg }: ContactCardBubbleProps) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const contactId = msg.metadata?.contactId || msg.content;
  const contactName = msg.metadata?.contactName || "Người dùng";
  const contactAvatar = msg.metadata?.contactAvatar;
  const contactPhone = msg.metadata?.contactPhone;

  const myId = currentUser?.id || currentUser?._id || currentUser?.userId;

  const handleStartChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!contactId) return;
    if (myId && String(contactId) === String(myId)) {
      return;
    }
    try {
      const res = await groupService.findDirectConversation(contactId);
      if (res?.exists && res?.conversation?._id) {
        router.push(`/chat/${res.conversation._id}`);
      } else {
        router.push(`/chat/new-${contactId}`);
      }
    } catch (err) {
      console.error("Lỗi khi tìm cuộc hội thoại:", err);
      router.push(`/chat/new-${contactId}`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 w-[260px] max-w-full my-1 border-b-[3px] border-b-gray-200/80 hover:shadow-md transition duration-200">
      {/* Top Header */}
      <div className="flex items-center gap-1 mb-2.5">
        <span className="text-[10px] text-blue-600 font-black uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md">
          Danh thiếp
        </span>
      </div>

      {/* Main Info */}
      <div className="flex items-center gap-3.5 mb-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          {contactAvatar ? (
            <img
              src={contactAvatar}
              alt={contactName}
              className="w-12 h-12 rounded-full object-cover border border-gray-100"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              {contactName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* User details */}
        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-black text-gray-900 truncate leading-snug">
            {contactName}
          </h4>
          <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
            {contactPhone ? `SĐT: ${contactPhone}` : "Số điện thoại bảo mật"}
          </p>
        </div>
      </div>

      <div className="h-px bg-gray-100 mb-3" />

      {/* Action Footer */}
      <button
        onClick={handleStartChat}
        className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-[13px] font-black flex items-center justify-center gap-1.5 transition active:opacity-90 cursor-pointer"
      >
        <ChatBubbleLeftRightIcon className="w-4 h-4 stroke-[2.5]" />
        Nhắn tin
      </button>
    </div>
  );
}
