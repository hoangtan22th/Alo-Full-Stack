"use client";

import { useState, useEffect, useRef } from "react";
import axiosClient from "@/services/api";
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
  name: "Trợ lý Alo Chat",
  avatar: "/alochat.png",
};

const SUGGESTED_PROMPTS = [
  "Thời tiết Hồ Chí Minh hôm nay thế nào?",
  "Tôi có những ai là bạn bè?",
  "Có những ai đã gửi kết bạn cho tôi?",
  "Tìm xem số 0987654321 có trên hệ thống không",
];

export default function BotChatArea({ currentUser }: { currentUser: any }) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: "welcome-msg",
        role: "bot",
        content: `Chào **${currentUser?.fullName || currentUser?.name || "bạn"}**, mình là AI của Alo Chat! 🤖\n\nBạn cần mình giúp gì nào?`,
        createdAt: new Date().toISOString(),
      },
    ]);
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
      const res: any = await axiosClient.post(
        "/chatbot/ask",
        {
          message: text,
          userId: myId,
        },
        {
          headers: {
            "X-User-Id": myId,
          },
          timeout: 60000,
        },
      );

      let botContent = "Không có phản hồi từ AI";
      if (typeof res === "string") {
        botContent = res;
      } else if (res?.data?.data) {
        botContent = res.data.data;
      } else if (res?.data) {
        botContent =
          typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      } else if (res?.message) {
        botContent = res.message;
      } else if (res) {
        botContent = JSON.stringify(res);
      }

      const botMsg: AIMessage = {
        id: `bot_${Date.now()}`,
        role: "bot",
        content: botContent,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error("Lỗi gọi AI chi tiết:", err);
      let errorMsg = "❌ *Đã có lỗi xảy ra khi kết nối máy chủ.*";
      if (err.code === "ECONNABORTED") {
        errorMsg = "❌ *Máy chủ AI suy nghĩ quá lâu (Timeout).*";
      } else if (err.response) {
        errorMsg = `❌ *Lỗi từ Backend: ${err.response.data?.message || err.response.status}*`;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "bot",
          content: errorMsg,
          createdAt: new Date().toISOString(),
        },
      ]);
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
              <img
                src={BOT_INFO.avatar}
                className="w-10 h-10 rounded-full object-cover p-0.5 border border-blue-200"
                alt="AI"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <h2 className="text-[16px] font-black tracking-tight">
                {BOT_INFO.name}
              </h2>
              <p className="text-[12px] font-bold text-blue-500 mt-0.5">
                Trí tuệ nhân tạo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <button
              onClick={() => setMessages([])}
              className="hover:text-red-500 transition"
              title="Xóa lịch sử trò chuyện"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
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
                    <img
                      src={BOT_INFO.avatar}
                      className="w-8 h-8 rounded-full mr-2 self-end shadow-sm"
                      alt="AI"
                    />
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[14px] shadow-sm ${isUser ? "bg-black text-white rounded-br-sm" : "bg-white border border-gray-100 rounded-bl-sm"}`}
                  >
                    {isUser ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-blue-600 prose-a:text-blue-500">
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
                <img
                  src={BOT_INFO.avatar}
                  className="w-8 h-8 rounded-full mr-2 self-end"
                  alt="AI"
                />
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></span>
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 bg-white border-t border-gray-100 shrink-0 relative">
          {messages.length <= 1 && !isTyping && (
            <div className="flex flex-wrap gap-2 mb-3 max-w-3xl mx-auto">
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
          <div className="max-w-3xl mx-auto flex items-center gap-3 bg-[#F5F5F5] p-2 rounded-full focus-within:bg-white focus-within:shadow-sm border border-transparent focus-within:border-gray-200 transition-all">
            <input
              ref={inputRef}
              type="text"
              placeholder={isTyping ? "AI đang trả lời..." : "Hỏi AI..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              className="flex-1 bg-transparent outline-none text-[14px] px-3 disabled:opacity-50"
            />
            <button
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim() || isTyping}
              className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 disabled:opacity-40"
            >
              {isTyping ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <PaperAirplaneIcon className="w-4 h-4 -mr-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`hidden lg:flex flex-col shrink-0 bg-[#FAFAFA] h-full transition-all duration-300 ease-in-out overflow-hidden ${showInfoPanel ? "w-[320px] opacity-100 border-l border-gray-100" : "w-0 opacity-0 border-l-0"}`}
      >
        <div className="flex flex-col items-center pt-10 pb-8 border-b border-gray-100/60">
          <img
            src={BOT_INFO.avatar}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg bg-blue-50 p-2"
          />
          <h2 className="text-[18px] font-black text-gray-900 tracking-tight mt-4">
            {BOT_INFO.name}
          </h2>
          <p className="text-[12px] font-bold text-blue-500 mt-1">
            Sẵn sàng hỗ trợ 24/7
          </p>
        </div>
        <div className="p-6">
          <div className="bg-blue-50 text-blue-700 text-[13px] p-4 rounded-2xl font-medium leading-relaxed">
            <SparklesIcon className="w-5 h-5 mb-2" />
            Trợ lý ảo thông minh được tích hợp trực tiếp vào ứng dụng. Có khả
            năng tìm kiếm người dùng, quản lý bạn bè và cung cấp thông tin thời
            tiết.
          </div>
        </div>
      </div>
    </>
  );
}
