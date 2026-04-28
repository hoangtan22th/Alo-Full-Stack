import React, { useCallback } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useChatStore } from "@/store/useChatStore";

export type MessageDTO = {
  _id: string;
  senderId: string;
  content: string;
  createdAt?: string;
};

interface Props {
  message: MessageDTO;
  currentUserId?: string;
}

export default function MessageBubble({ message, currentUserId }: Props) {
  const {
    isReportSelectionMode,
    selectedMessagesForReport,
    toggleMessageForReport,
  } = useChatStore((s) => ({
    isReportSelectionMode: s.isReportSelectionMode,
    selectedMessagesForReport: s.selectedMessagesForReport,
    toggleMessageForReport: s.toggleMessageForReport,
  }));

  const isSelected = selectedMessagesForReport.includes(message._id);
  const isMine = String(message.senderId) === String(currentUserId);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleMessageForReport(message._id);
    },
    [message._id, toggleMessageForReport],
  );

  return (
    <div className={`flex items-start gap-3 ${isMine ? "justify-end" : "justify-start"}`}>
      {isReportSelectionMode && (
        <div className="flex items-center">
          <button
            aria-pressed={isSelected}
            onClick={handleToggle}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
              isSelected
                ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300"
                : "bg-white border-gray-200 hover:bg-gray-50"
            }`}
            title={isSelected ? "Unselect message" : "Select message as evidence"}
          >
            {isSelected ? <CheckIcon className="w-4 h-4" /> : null}
          </button>
        </div>
      )}

      <div
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm transition-all relative
          ${isMine ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-gray-100 rounded-bl-sm"}
          ${isReportSelectionMode && !isSelected ? "opacity-50 filter grayscale" : ""}
          ${isSelected ? "ring-2 ring-blue-300" : ""}
        `}
      >
        <div className="text-sm leading-relaxed break-words">{message.content}</div>
        {message.createdAt && (
          <div className="text-[10px] text-gray-400 mt-1 text-right">{new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        )}
      </div>
    </div>
  );
}
