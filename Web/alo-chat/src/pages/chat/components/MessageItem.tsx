// src/pages/chat/components/MessageItem.tsx
import type { Message } from '@/types';
import {
  DocumentIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  onContextMenu: (x: number, y: number) => void;
}

export default function MessageItem({
  message,
  isOwn,
  onContextMenu,
}: MessageItemProps) {
  // Handle deleted messages
  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[85%] lg:max-w-[70%]">
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[14px] font-medium italic text-center">
            This message was deleted
          </div>
          <span className={`text-[10px] font-bold text-gray-400 mt-1.5 block ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  // Render based on message type
  return (
    <div className={`flex items-end gap-3 ${isOwn ? 'justify-end' : 'max-w-[85%] lg:max-w-[70%]'}`}>
      {/* Avatar for other users */}
      {!isOwn && message.senderAvatar && (
        <img
          src={message.senderAvatar}
          alt={message.senderName}
          className="w-8 h-8 rounded-full mb-1 flex-shrink-0"
          title={message.senderName}
        />
      )}
      {!isOwn && !message.senderAvatar && (
        <div className="w-8 h-8 rounded-full bg-gray-300 mb-1 flex-shrink-0" />
      )}

      <div className={isOwn ? '' : 'w-full'}>
        {/* Show sender name only for group chats */}
        {!isOwn && message.senderName && (
          <p className="text-[12px] font-bold text-gray-500 mb-1 ml-1">
            {message.senderName}
          </p>
        )}

        {/* Message content based on type */}
        <div
          className={`flex gap-2 items-start ${isOwn ? 'flex-row-reverse' : ''}`}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e.clientX, e.clientY);
          }}
        >
          {/* Message bubble */}
          {message.type === 'text' ? (
            <div
              className={`p-4 rounded-2xl text-[14px] font-medium leading-relaxed ${
                isOwn
                  ? 'bg-black text-white rounded-br-sm shadow-md'
                  : 'bg-[#F5F5F5] text-gray-900 rounded-bl-sm'
              }`}
            >
              {message.content}
            </div>
          ) : message.type === 'image' ? (
            <div className="max-w-sm">
              <img
                src={message.content}
                alt="Shared image"
                className="rounded-2xl max-h-96 object-cover cursor-pointer hover:opacity-90 transition"
              />
            </div>
          ) : message.type === 'file' ? (
            <div
              className={`p-3 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition ${
                isOwn
                  ? 'bg-black/20 text-white hover:bg-black/30'
                  : 'bg-[#F5F5F5] text-gray-900 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isOwn ? 'bg-white/20' : 'bg-white'
                  } shadow-sm`}
                >
                  <DocumentIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[13px] font-bold line-clamp-1">
                    {message.metadata?.filename || 'File'}
                  </p>
                  <p className={`text-[11px] font-bold ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
                    {formatFileSize(message.metadata?.size || 0)}
                  </p>
                </div>
              </div>
              <button
                className={`p-2 rounded-full transition flex-shrink-0 ${
                  isOwn ? 'hover:bg-white/20' : 'hover:bg-white'
                }`}
              >
                <DocumentIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className={`p-4 rounded-2xl text-[14px] font-medium ${
                isOwn
                  ? 'bg-black text-white rounded-br-sm'
                  : 'bg-[#F5F5F5] text-gray-900 rounded-bl-sm'
              }`}
            >
              {message.content}
            </div>
          )}

          {/* Context menu icon on hover */}
          <button
            className="opacity-0 hover:opacity-100 transition p-1 flex-shrink-0"
            onClick={(e) => {
              e.preventDefault();
              onContextMenu(
                e.currentTarget.getBoundingClientRect().right,
                e.currentTarget.getBoundingClientRect().top
              );
            }}
          >
            <EllipsisHorizontalIcon
              className={`w-4 h-4 ${isOwn ? 'text-gray-400' : 'text-gray-500'}`}
            />
          </button>
        </div>

        {/* Timestamp and read status */}
        <div
          className={`flex items-center gap-1 mt-1.5 text-[10px] font-bold ${
            isOwn
              ? 'justify-end text-gray-400 mr-1'
              : 'text-gray-400 ml-1'
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && (
            <span className="text-gray-400">
              {message.isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Format timestamp to readable format
 */
function formatTime(date?: string): string {
  if (!date) return '';

  const msgDate = new Date(date);
  const now = new Date();

  // Check if message is from today
  if (
    msgDate.getDate() === now.getDate() &&
    msgDate.getMonth() === now.getMonth() &&
    msgDate.getFullYear() === now.getFullYear()
  ) {
    return msgDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return msgDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format file size to readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
