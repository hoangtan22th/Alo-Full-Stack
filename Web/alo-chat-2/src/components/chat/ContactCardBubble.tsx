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
    <div className="w-[320px] max-w-full bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200/60 hover:shadow-md transition-all duration-200 my-1">
      {/* Blue Header Info Pane */}
      <div className="bg-[#0068FF] p-4.5 pt-5 pb-5 flex items-center gap-3 text-white">
        {/* Avatar */}
        <div className="relative shrink-0">
          {contactAvatar ? (
            <img
              src={contactAvatar}
              alt={contactName}
              className="w-10 h-10 rounded-full object-cover border border-white/80 shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white text-[#0068FF] flex items-center justify-center font-bold text-sm border border-white/80 shadow-sm">
              {contactName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* User details */}
        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-semibold text-white truncate leading-tight">
            {contactName}
          </h4>
          <p className="text-[11px] text-white/80 truncate mt-0.5">
            {contactPhone ? contactPhone : "Số điện thoại bảo mật"}
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="bg-[#F1F6FC] hover:bg-[#E5EFFF] transition-colors border-t border-gray-100">
        <button
          onClick={handleStartChat}
          className="w-full py-3.5 text-[#0068FF] text-[14px] font-semibold text-center cursor-pointer block transition active:opacity-90"
        >
          Nhắn Tin
        </button>
      </div>
    </div>
  );
}
