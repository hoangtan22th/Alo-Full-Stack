// src/components/ui/chatbot/ChatSummaryButton.tsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  SparklesIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { chatbotApi } from "@/api/chatbot.api";
import { toast } from "sonner";
import { MessageDTO } from "@/services/messageService";

interface Props {
  conversationId: string;
  userId: string;
  messages: MessageDTO[];
  conversationName?: string;
  userCache?: Record<string, { name: string; avatar: string }>;
}

export default function ChatSummaryButton({
  conversationId,
  userId,
  messages,
  conversationName,
  userCache,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSummarize = async () => {
    if (!conversationId || !userId) {
      toast.error("Không thể xác định phòng chat.");
      return;
    }

    setIsOpen(true);
    setLoading(true);
    setSummary("");

    // 1. Tạo context từ những tin nhắn "thực sự nhìn thấy"
    const visibleMessages = messages.filter(
      (msg) => !msg.isRevoked && msg.type !== "system",
    );

    // 2. Chuyển đổi thành chuỗi văn bản để AI dễ đọc
    let chatContext = `Tên hội thoại: ${conversationName || "Trò chuyện"}\n`;
    chatContext += `Danh sách tin nhắn:\n`;

    chatContext += visibleMessages
      .map((msg) => {
        let sender = msg.senderName;

        // Nếu không có senderName, thử lấy từ cache
        if (!sender && userCache && userCache[msg.senderId]) {
          sender = userCache[msg.senderId].name;
        }

        // Fallback cuối cùng
        if (!sender) {
          sender =
            msg.senderId === userId
              ? "Tôi"
              : "Người dùng " + msg.senderId.slice(-4);
        }

        let content = msg.content;

        // Nếu là file hoặc ảnh thì tóm tắt loại nội dung
        if (msg.type === "image") content = "[Hình ảnh]";
        if (msg.type === "file")
          content = `[Tệp tin: ${msg.metadata?.fileName || "không rõ"}]`;

        return `${sender}: ${content}`;
      })
      .join("\n");

    // 3. Gọi API với ngữ cảnh đã lọc
    const res = await chatbotApi.getSummary(
      conversationId,
      userId,
      chatContext,
    );

    if (res.error) {
      setSummary(`❌ ${res.error}`);
    } else {
      setSummary(res.data);
    }
    setLoading(false);
  };

  // Hàm render nội dung tóm tắt đẹp mắt
  const renderSummary = (text: string) => {
    const lines = text.split("\n");

    return (
      <div className="space-y-5">
        {lines.map((line, idx) => {
          if (!line.trim()) return null;

          // Xử lý in đậm
          let cleanContent = line.replace(
            /\*\*(.*?)\*\*/g,
            '<strong class="text-blue-700 font-extrabold">$1</strong>',
          );

          // Header (Bắt đầu bằng ### hoặc ##)
          if (
            cleanContent.startsWith("### ") ||
            cleanContent.startsWith("## ")
          ) {
            cleanContent = cleanContent.replace(/^#+\s*/, "");
            return (
              <div
                key={idx}
                className="flex items-center gap-2 mt-6 mb-3 first:mt-0"
              >
                <div className="w-1.5 h-6 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
                <h3
                  className="text-[18px] font-black text-gray-900 tracking-tight"
                  dangerouslySetInnerHTML={{ __html: cleanContent }}
                />
              </div>
            );
          }

          // List item
          const isListItem =
            line.trim().startsWith("-") || line.trim().startsWith("*");
          if (isListItem) {
            cleanContent = cleanContent.replace(/^[-*]\s*/, "");
            return (
              <div key={idx} className="flex items-start gap-3.5 group pl-1">
                <div className="mt-1 shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm border border-blue-100">
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                </div>
                <span
                  className="flex-1 text-[15px] text-gray-700 leading-relaxed font-medium"
                  dangerouslySetInnerHTML={{ __html: cleanContent }}
                />
              </div>
            );
          }

          // Normal paragraph
          return (
            <p
              key={idx}
              className="text-[15px] text-gray-600 leading-relaxed bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50 shadow-sm font-medium"
              dangerouslySetInnerHTML={{ __html: cleanContent }}
            />
          );
        })}
      </div>
    );
  };

  const modalContent =
    isOpen && isMounted ? (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="w-full max-w-lg relative animate-in zoom-in-95 duration-300 slide-in-from-bottom-4">
          {/* Glow behind modal */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-[34px] blur-xl opacity-20"></div>

          {/* Modal Container */}
          <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative border border-white/50">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100/80 flex justify-between items-center bg-white/80 backdrop-blur-xl shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden">
                  <img
                    src="/alochat.png"
                    alt="Bot"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-[17px] font-black tracking-tight text-gray-900">
                  AI Tóm Tắt
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900 active:scale-95"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 scrollbar-hide min-h-[250px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
                  <div className="relative flex items-center justify-center w-24 h-24">
                    <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-l-purple-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 bg-white rounded-full shadow-inner overflow-hidden flex items-center justify-center">
                      <img
                        src="/alochat.png"
                        alt="Bot"
                        className="w-12 h-12 object-cover animate-pulse"
                      />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-gray-900 animate-pulse">
                      AI đang phân tích...
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      Đang tóm tắt dựa trên các tin nhắn đang hiển thị.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {renderSummary(summary)}
                </div>
              )}
            </div>

            {/* Footer */}
            {!loading && (
              <div className="p-5 bg-gray-50/80 border-t border-gray-100 flex justify-end shrink-0">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-gray-800 hover:shadow-lg active:scale-95 transition-all duration-200"
                >
                  Đã hiểu
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <div className="relative group/btn z-10">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full blur-md opacity-30 group-hover/btn:opacity-60 transition duration-300"></div>

        <button
          onClick={handleSummarize}
          className="relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:scale-105 transition-all duration-300 border border-white/20 overflow-hidden"
          title="Tóm tắt đoạn chat bằng AI"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-in-out"></div>
          <SparklesIcon className="w-5 h-5 relative z-10 group-hover/btn:animate-pulse" />
          <span className="font-bold text-sm tracking-wide relative z-10">
            Tóm tắt AI
          </span>
        </button>
      </div>

      {isMounted && createPortal(modalContent, document.body)}
    </>
  );
}
