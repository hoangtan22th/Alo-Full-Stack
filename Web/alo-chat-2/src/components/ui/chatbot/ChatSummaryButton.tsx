// src/components/ui/chatbot/ChatSummaryButton.tsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { SparklesIcon, XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { chatbotApi } from "@/api/chatbot.api";
import { toast } from "sonner";

interface Props {
  conversationId: string;
  userId: string;
}

export default function ChatSummaryButton({ conversationId, userId }: Props) {
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

    const res = await chatbotApi.getSummary(conversationId, userId);
    
    if (res.error) {
      setSummary(`❌ ${res.error}`);
    } else {
      setSummary(res.data);
    }
    setLoading(false);
  };

  // Hàm render nội dung tóm tắt đẹp mắt
  const renderSummary = (text: string) => {
    const lines = text.split('\n');
    
    return (
      <div className="space-y-4">
        {lines.map((line, idx) => {
          if (!line.trim()) return null;

          // Xử lý in đậm
          let cleanContent = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 font-bold">$1</strong>');

          // Header (Bắt đầu bằng ### hoặc ##)
          if (cleanContent.startsWith('### ') || cleanContent.startsWith('## ')) {
            cleanContent = cleanContent.replace(/^#+\s*/, '');
            return (
              <h3 key={idx} className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mt-4 mb-2" dangerouslySetInnerHTML={{ __html: cleanContent }} />
            );
          }

          // List item
          const isListItem = line.trim().startsWith('-') || line.trim().startsWith('*');
          if (isListItem) {
            cleanContent = cleanContent.replace(/^[-*]\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-3 group">
                <div className="mt-1 shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                </div>
                <span 
                  className="flex-1 text-[15px] text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: cleanContent }} 
                />
              </div>
            );
          }

          // Normal paragraph
          return (
            <p 
              key={idx} 
              className="text-[15px] text-gray-700 leading-relaxed bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50"
              dangerouslySetInnerHTML={{ __html: cleanContent }}
            />
          );
        })}
      </div>
    );
  };

  const modalContent = isOpen && isMounted ? (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg relative animate-in zoom-in-95 duration-300 slide-in-from-bottom-4">
        
        {/* Glow behind modal */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-[34px] blur-xl opacity-20"></div>

        {/* Modal Container */}
        <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative border border-white/50">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100/80 flex justify-between items-center bg-white/80 backdrop-blur-xl shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border border-blue-200/50">
                <SparklesIcon className="w-5 h-5 text-blue-600" />
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
                  {/* Outer spinning ring */}
                  <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-l-purple-500 rounded-full animate-spin"></div>
                  {/* Inner pulsing orb */}
                  <div className="absolute inset-2 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full animate-pulse opacity-80 blur-sm"></div>
                  {/* Center icon */}
                  <SparklesIcon className="w-8 h-8 text-white relative z-10 animate-bounce" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-gray-900 animate-pulse">AI đang phân tích...</h3>
                  <p className="text-sm text-gray-500 font-medium">Việc này có thể mất vài giây, vui lòng đợi nhé.</p>
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
      <div className="relative group/btn z-50">
        {/* Glow effect under button */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full blur-md opacity-30 group-hover/btn:opacity-60 transition duration-300"></div>
        
        <button 
          onClick={handleSummarize}
          className="relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:scale-105 transition-all duration-300 border border-white/20 overflow-hidden"
          title="Tóm tắt đoạn chat bằng AI"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-in-out"></div>
          <SparklesIcon className="w-5 h-5 relative z-10 group-hover/btn:animate-pulse" />
          <span className="font-bold text-sm tracking-wide relative z-10">Tóm tắt AI</span>
        </button>
      </div>

      {isMounted && createPortal(modalContent, document.body)}
    </>
  );
}