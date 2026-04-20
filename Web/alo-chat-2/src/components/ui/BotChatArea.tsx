"use client";

import { useState, useEffect, useRef } from "react";
import { chatbotApi } from "@/api/chatbot.api"; // Dùng chatbotApi thay vì axios trực tiếp
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  SparklesIcon,
  PaperAirplaneIcon,
  TrashIcon,
  InformationCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface AIMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  createdAt: string;
}

const BOT_INFO = {
  name: "Alo Bot (AI Assistant)",
  avatar: "/alochat.png",
};

const SUGGESTED_PROMPTS = [
  "Hướng dẫn sử dụng các tính năng của Alo Chat",
  "Thời tiết hôm nay thế nào?",
  "Danh sách bạn bè của mình",
  "Có ai gửi lời mời kết bạn cho mình không?",
];

export default function BotChatArea({ currentUser }: { currentUser: any }) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Tải lịch sử tin nhắn khi component mount
  useEffect(() => {
    const fetchHistory = async () => {
      const myId = currentUser?.id || currentUser?._id || currentUser?.userId;
      if (!myId) return;

      setLoadingHistory(true);
      const res = await chatbotApi.getHistory(myId);
      
      if (res.data && Array.isArray(res.data)) {
        const historyMessages: AIMessage[] = res.data.map((h: any) => ({
          id: h.id.toString(),
          role: h.role === "assistant" ? "bot" : "user",
          content: h.content,
          createdAt: h.createdAt
        }));

        if (historyMessages.length > 0) {
          setMessages(historyMessages);
        } else {
          // Nếu không có lịch sử, hiện tin nhắn chào mừng
          setMessages([
            {
              id: "welcome-msg",
              role: "bot",
              content: `Chào **${currentUser?.fullName || currentUser?.name || "bạn"}**, mình là **Alo Bot**! 🤖\n\nMình đã được thiết lập để hỗ trợ riêng cho hệ thống Alo Chat. Bạn cần mình giúp gì nào?`,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      }
      setLoadingHistory(false);
    };

    fetchHistory();
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (textToSend: string = inputText) => {
    const text = textToSend.trim();
    if (!text || isTyping || !currentUser) return;

    const myId = currentUser.id || currentUser._id || currentUser.userId;

    const userMsg: AIMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      const res = await chatbotApi.ask(text, myId);
      
      const botMsg: AIMessage = {
        id: `bot_${Date.now()}`,
        role: "bot",
        content: res.data || res.error || "Xin lỗi, mình gặp chút trục trặc.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Lỗi gọi AI:", err);
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col min-w-0 h-full bg-white relative">
        <div className="h-19 px-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden">
                <img 
                  src={BOT_INFO.avatar} 
                  alt="Alo Bot" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <h2 className="text-[16px] font-black tracking-tight">
                {BOT_INFO.name}
              </h2>
              <p className="text-[12px] font-bold text-blue-500 mt-0.5">
                Chuyên gia hỗ trợ Alo Chat
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            {loadingHistory && <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-500" />}
            <button
              onClick={() => setShowInfoPanel(!showInfoPanel)}
              className={`transition ${showInfoPanel ? "text-black" : "hover:text-gray-600"}`}
            >
              <InformationCircleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide bg-[#FAFAFA]">
          <div className="flex flex-col gap-4 max-w-3xl mx-auto">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-2 self-end shadow-sm border border-gray-100 overflow-hidden shrink-0">
                       <img 
                         src={BOT_INFO.avatar} 
                         alt="Bot" 
                         className="w-full h-full object-cover" 
                       />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[14px] shadow-sm ${isUser ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-gray-100 rounded-bl-sm"}`}
                  >
                    {isUser ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-blue-600 prose-strong:font-bold">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-2 self-end shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                   <img src={BOT_INFO.avatar} alt="Bot" className="w-full h-full object-cover grayscale opacity-50" />
                </div>
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                  <span
                    className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></span>
                  <span
                    className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 bg-white border-t border-gray-100 shrink-0 relative">
          {messages.length <= 1 && !isTyping && !loadingHistory && (
            <div className="flex flex-wrap gap-2 mb-3 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2">
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-4 py-2 rounded-full hover:bg-blue-600 hover:text-white transition-all duration-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
          <div className="max-w-3xl mx-auto flex items-center gap-3 bg-gray-50 p-1.5 rounded-full focus-within:bg-white focus-within:shadow-md border border-transparent focus-within:border-blue-100 transition-all duration-300">
            <input
              ref={inputRef}
              type="text"
              placeholder={isTyping ? "AI đang trả lời..." : "Hỏi Alo Bot về ứng dụng..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              className="flex-1 bg-transparent outline-none text-[14px] px-4 disabled:opacity-50"
            />
            <button
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim() || isTyping}
              className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              {isTyping ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <PaperAirplaneIcon className="w-5 h-5 -mr-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`hidden lg:flex flex-col shrink-0 bg-[#FAFAFA] h-full transition-all duration-300 ease-in-out overflow-hidden ${showInfoPanel ? "w-[320px] opacity-100 border-l border-gray-100" : "w-0 opacity-0 border-l-0"}`}
      >
        <div className="flex flex-col items-center pt-10 pb-8 border-b border-gray-100/60">
           <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
              <img src={BOT_INFO.avatar} alt="Alo Bot" className="w-full h-full object-cover" />
           </div>
          <h2 className="text-[18px] font-black text-gray-900 tracking-tight mt-4">
            {BOT_INFO.name}
          </h2>
          <p className="text-[12px] font-bold text-blue-500 mt-1 uppercase tracking-wider">
            Guardrails Protected
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div className="bg-blue-600 text-white text-[13px] p-5 rounded-[24px] font-medium leading-relaxed shadow-lg shadow-blue-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
                <SparklesIcon className="w-12 h-12" />
            </div>
            <p className="relative z-10">
              Chào bạn! Mình là AI được huấn luyện đặc biệt để hỗ trợ riêng cho <strong>Alo Chat</strong>.
            </p>
          </div>
          
          <div className="space-y-4">
             <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-widest px-1">Quy tắc bảo vệ</h4>
             <div className="space-y-3">
                {[
                  "Chỉ trả lời về Alo Chat",
                  "Từ chối các chủ đề ngoài lề",
                  "Bảo mật thông tin người dùng",
                  "Hỗ trợ tính năng thời tiết"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-1">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                     <span className="text-[13px] font-bold text-gray-700">{item}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
