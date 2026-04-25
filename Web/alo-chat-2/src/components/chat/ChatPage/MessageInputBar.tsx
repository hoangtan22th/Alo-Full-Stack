import React from "react";
import {
  PhotoIcon,
  PaperClipIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import StickerPicker from "@/components/ui/StickerPicker";
import { MessageDTO } from "@/services/messageService";

interface MessageInputBarProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSendSticker: (sticker: any) => void;
  handleImageButtonClick: () => void;
  handleFileButtonClick: () => void;
  replyingTo: MessageDTO | null;
  setReplyingTo: (val: MessageDTO | null) => void;
  getSenderDisplayName: (id: string, msg?: any) => string;
  userCache: any;
  mentionSearch: string | null;
  filteredMentions: any[];
  mentionIndex: number;
  setMentionIndex: (val: number) => void;
  handleSelectMention: (item: any) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  messageText: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleSend: () => void;
  sending: boolean;
}

export default function MessageInputBar({
  fileInputRef,
  imageInputRef,
  handleFileChange,
  handleSendSticker,
  handleImageButtonClick,
  handleFileButtonClick,
  replyingTo,
  setReplyingTo,
  getSenderDisplayName,
  userCache,
  mentionSearch,
  filteredMentions,
  mentionIndex,
  setMentionIndex,
  handleSelectMention,
  inputRef,
  messageText,
  handleInputChange,
  handleKeyDown,
  handleSend,
  sending,
}: MessageInputBarProps) {
  return (
    <div className="bg-white border-t border-gray-200 shrink-0">
      {/* Hidden file input — chỉ chọn file (không phải ảnh) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept="application/*,text/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.mp3,.mp4,.avi,.mov,.mkv"
      />
      {/* Hidden image input — chỉ chọn ảnh */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept="image/*"
      />
      {/* Toolbar Section */}
      <div className="flex items-center gap-1 px-4 py-2">
        <StickerPicker onStickerSelect={handleSendSticker} />
        {/* 3. Đính kèm ảnh */}
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
          onClick={handleImageButtonClick}
          title="Gửi ảnh"
        >
          <PhotoIcon className="w-5 h-5" />
        </button>
        {/* 4. Đính kèm file */}
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
          onClick={handleFileButtonClick}
          title="Gửi file"
        >
          <PaperClipIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Reply Preview Section */}
      {replyingTo && (
        <div className="mx-4 mb-2 p-3 bg-[#F0F2F5] border-l-[3px] border-blue-600 rounded-sm flex items-center gap-3 animate-in slide-in-from-bottom-1 duration-200 w-fit max-w-[75%]">
          {replyingTo.type === "image" && (
            <img
              src={replyingTo.content}
              alt="reply"
              className="w-10 h-10 object-cover rounded-md shrink-0 border border-gray-200"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-3.5 h-3.5 text-gray-500"
              >
                <path d="M14.017 21L14.017 18C14.017 16.8954 14.9125 16 16.0171 16H19.0171C20.1217 16 21.0171 16.8954 21.0171 18V21M14.017 21H21.0171M14.017 21C12.9125 21 12.017 20.1046 12.017 19V15M3.01709 21H10.0171M10.0171 21V18C10.0171 16.8954 10.9125 16 12.0171 16H15.0171M10.0171 21C8.91253 21 8.01709 20.1046 8.01709 19V15M12.017 15V13C12.017 11.8954 12.9125 11 14.0171 11H17.0171C18.1217 11 19.0171 11.8954 19.0171 13V15M12.017 15C10.9125 15 10.0171 14.1046 10.0171 13V9M3.01709 15H10.0171M10.0171 15V12C10.0171 10.8954 10.9125 10 12.0171 10H15.0171M10.0171 15C8.91253 15 8.01709 14.1046 8.01709 13V9" />
                <path
                  d="M11.1892 5.07107C10.0175 3.8994 8.11805 3.8994 6.94639 5.07107C5.77473 6.24274 5.77473 8.14224 6.94639 9.31391L11.1892 13.5567L15.432 9.31391C16.6037 8.14224 16.6037 6.24274 15.432 5.07107C14.2603 3.8994 12.3608 3.8994 11.1892 5.07107Z"
                  fill="currentColor"
                />
              </svg>
              <span className="text-[14px] text-gray-500 font-medium">
                Trả lời{" "}
                <span className="font-bold text-gray-800">
                  {getSenderDisplayName(
                    replyingTo.senderId,
                    replyingTo,
                  )}
                </span>
              </span>
            </div>
            <p className="text-[13px] text-gray-600 truncate ml-1">
              {replyingTo.type === "image"
                ? "[Hình ảnh]"
                : replyingTo.type === "file"
                  ? replyingTo.metadata?.fileName || "[Tệp tin]"
                  : replyingTo.content}
            </p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Input section */}
      <div className="px-4 pb-4 relative">
        {/* Mention Suggestion List */}
        {mentionSearch !== null && filteredMentions.length > 0 && (
          <div className="absolute bottom-full left-4 mb-2 w-64 max-h-60 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-y-auto z-[2000] animate-in slide-in-from-bottom-2 duration-200">
            <div className="p-2 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nhắc tên thành viên</span>
            </div>
            {filteredMentions.map((item: any, idx: number) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${idx === mentionIndex ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                onMouseEnter={() => setMentionIndex(idx)}
                onClick={() => handleSelectMention(item)}
              >
                {item.id === "all" ? (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <span className="text-[10px] font-black italic">@</span>
                  </div>
                ) : item.avatar ? (
                  <img
                    src={item.avatar}
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-100 shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-[12px] shrink-0 border border-gray-100 shadow-sm">
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-bold truncate ${item.id === "all" ? "text-blue-600" : "text-gray-800"}`}>
                    {item.id === "all" ? item.name : item.name}
                  </p>
                  {item.id === "all" && (
                    <p className="text-[10px] text-blue-500 font-medium">Nhắc cả nhóm</p>
                  )}
                </div>
                {idx === mentionIndex && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-glow animate-pulse" />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={
              replyingTo
                ? `Nhập @, tin nhắn tới ${userCache[replyingTo.senderId]?.name || "người dùng"}`
                : "Nhập tin nhắn..."
            }
            value={messageText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-[15px] font-medium placeholder:text-gray-400 py-2"
          />
          <div className="flex items-center gap-1">
            {messageText.trim() ? (
              <button
                onClick={handleSend}
                disabled={sending}
                className="p-2 text-blue-600 hover:text-blue-700 transition active:scale-95 disabled:opacity-40"
              >
                <PaperAirplaneIcon className="w-6 h-6" />
              </button>
            ) : (
              <button className="p-2 text-yellow-500 hover:text-yellow-600 transition active:scale-90">
                {/* This matches the Like/Thumb icon in the image */}
                <span className="text-2xl">👍</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
