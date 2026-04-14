// src/pages/chat/components/ChatHeader.tsx
import {
  PhoneIcon,
  VideoCameraIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import type { Conversation } from '@/types';

interface ChatHeaderProps {
  conversation: Conversation | null;
  loading: boolean;
}

export default function ChatHeader({ conversation, loading }: ChatHeaderProps) {
  if (!conversation) {
    return (
      <div className="h-[76px] px-6 border-b border-gray-100 flex items-center justify-center bg-white">
        <p className="text-gray-400">Select a conversation</p>
      </div>
    );
  }

  const memberCount = conversation.members?.length || 0;

  return (
    <div className="h-[76px] px-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {conversation.avatar && (
          <img
            src={conversation.avatar}
            alt={conversation.name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          <h2 className="text-[16px] font-black tracking-tight truncate">
            {conversation.name}
          </h2>
          <p className="text-[12px] font-bold text-gray-400 mt-0.5">
            {loading ? 'Loading...' : `${memberCount} members`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-gray-400 flex-shrink-0">
        <button className="hover:text-black transition p-2 hover:bg-gray-100 rounded-lg">
          <PhoneIcon className="w-5 h-5" />
        </button>
        <button className="hover:text-black transition p-2 hover:bg-gray-100 rounded-lg">
          <VideoCameraIcon className="w-5 h-5" />
        </button>
        <button className="hover:text-black transition p-2 hover:bg-gray-100 rounded-lg">
          <MagnifyingGlassIcon className="w-5 h-5" />
        </button>
        <button className="hover:text-black transition p-2 hover:bg-gray-100 rounded-lg">
          <InformationCircleIcon className="w-5 h-5" />
        </button>
        <button className="hover:text-black transition p-2 hover:bg-gray-100 rounded-lg">
          <EllipsisVerticalIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
