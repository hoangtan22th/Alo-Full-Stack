"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

interface UpdateDefaultEmojiModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmoji: string;
  onConfirm: (emoji: string) => void;
}

const EMOJIS = ["👍", "😆", "😮", "😭", "❤️", "😡"];

export const UpdateDefaultEmojiModal: React.FC<UpdateDefaultEmojiModalProps> = ({
  isOpen,
  onClose,
  currentEmoji,
  onConfirm,
}) => {
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji || "👍");

  useEffect(() => {
    if (isOpen) {
      setSelectedEmoji(currentEmoji || "👍");
    }
  }, [isOpen, currentEmoji]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Box */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">
            Cập nhật biểu tượng cảm xúc
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-600 text-sm font-semibold mb-6">
            Chọn emoji mặc định cho hội thoại này
          </p>

          <div className="grid grid-cols-6 gap-2">
            {EMOJIS.map((emoji) => {
              const isSelected = selectedEmoji === emoji;
              return (
                <div
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`flex flex-col items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-blue-100 border border-blue-200"
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <span className="text-3xl mb-4 select-none animate-bounce-short">
                    {emoji}
                  </span>
                  
                  {/* Radio button simulation/native */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "border-blue-600 bg-white"
                        : "border-slate-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-white transition-colors text-sm cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={() => onConfirm(selectedEmoji)}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 text-sm cursor-pointer"
          >
            Cập nhật
          </button>
        </div>
      </div>
    </div>
  );
};
