"use client";

import { useState, useRef, useEffect } from "react";
import axiosClient from "@/services/api";

export default function TestBotPage() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>(
    [],
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");
    setLoading(true);

    try {
      // Hardcode sẵn cái ID test của ông lúc nãy để bỏ qua bước lấy Auth Profile luôn
      const payload = {
        message: userText,
        userId: "448207bf-e86b-4d70-98e4-8ee8beab8ddf",
      };

      console.log("🚀 Bắt đầu gửi Request lên API:", payload);

      const res = await axiosClient.post("/chatbot/ask", payload, {
        headers: {
          "X-User-Id": "448207bf-e86b-4d70-98e4-8ee8beab8ddf",
        },
        timeout: 60000, // Chờ 60s cho AI suy nghĩ
      });

      console.log("✅ API Trả về thành công:", res);

      const botText = res?.data?.data || res?.data || JSON.stringify(res);
      setMessages((prev) => [...prev, { role: "bot", text: botText }]);
    } catch (err: any) {
      console.error("❌ API Báo lỗi:", err);

      let errorMsg = "Lỗi không xác định";
      if (err.response) {
        errorMsg = `Server trả về mã ${err.response.status} - ${JSON.stringify(err.response.data)}`;
      } else if (err.request) {
        errorMsg =
          "Không thể kết nối đến server (Server sập hoặc sai cổng / sai URL).";
      } else {
        errorMsg = err.message;
      }

      setMessages((prev) => [
        ...prev,
        { role: "bot", text: `🚨 LỖI: ${errorMsg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-[80vh]">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 text-center font-bold text-lg">
          🤖 TRANG TEST CHATBOT ĐỘC LẬP
        </div>

        {/* Khung Chat */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-10">
              Gõ gì đó để test thử API xem có 503 nữa không...
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-xl ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm"
                }`}
              >
                {/* Dùng pre-wrap để giữ nguyên format xuống dòng */}
                <pre className="whitespace-pre-wrap font-sans text-[14px] m-0">
                  {msg.text}
                </pre>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 p-3 rounded-xl rounded-bl-none text-gray-500 text-sm shadow-sm animate-pulse">
                AI đang rặn chữ... (Mở F12 Console lên xem log)
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500"
            placeholder="Nhập câu hỏi test..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold disabled:bg-gray-400"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
