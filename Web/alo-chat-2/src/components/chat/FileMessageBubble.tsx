import React, { useEffect, useState } from "react";
import {
  ArrowDownTrayIcon,
  EyeIcon,
  DocumentIcon,
  ClockIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

export interface MessageDTO {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  type: "text" | "image" | "file" | "system" | "poll";
  content: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    [key: string]: any;
  };
  createdAt: string;
}

interface Props {
  msg: MessageDTO;
  isMultiSelectMode: boolean;
  getMediaUrl: (url: string) => string;
  handleDownload: (url: string, fileName: string) => void;
  onPreviewTxt: (fileName: string, content: string) => void;
  senderName?: string;
  senderAvatar?: string;
}

interface FileTypeConfig {
  bgClass: string;
  text: string;
}

// Helper to resolve colors and text label based on extension
const getFileTypeConfig = (fileName: string): FileTypeConfig => {
  if (!fileName) return { bgClass: "bg-gray-400", text: "FILE" };
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "pdf":
      return { bgClass: "bg-red-500", text: "PDF" };
    case "doc":
    case "docx":
      return { bgClass: "bg-blue-600", text: "W" };
    case "xls":
    case "xlsx":
      return { bgClass: "bg-emerald-600", text: "X" };
    case "txt":
      return { bgClass: "bg-sky-500", text: "TXT" };
    case "mp4":
    case "mov":
    case "webm":
    case "avi":
    case "mkv":
      // webm could be audio too, but we will handle audio separately below
      return { bgClass: "bg-purple-500", text: "▶" };
    case "mp3":
    case "wav":
    case "ogg":
    case "m4a":
      return { bgClass: "bg-pink-500", text: "🎵" };
    default:
      return { bgClass: "bg-gray-400", text: ext.toUpperCase().slice(0, 3) || "FILE" };
  }
};

export default function FileMessageBubble({
  msg,
  isMultiSelectMode,
  getMediaUrl,
  handleDownload,
  onPreviewTxt,
  senderName,
  senderAvatar,
}: Props) {
  const [txtContent, setTxtContent] = useState<string>("");
  const [loadingTxt, setLoadingTxt] = useState<boolean>(false);
  const [isPreviewingVideo, setIsPreviewingVideo] = useState<boolean>(false);

  const fileName = msg.metadata?.fileName || "Tệp đính kèm";
  const fileSize = msg.metadata?.fileSize;
  const fileUrl = getMediaUrl(msg.content);
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const isTxt = ext === "txt";
  const isAudio = msg.metadata?.fileType?.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "webm"].includes(ext);
  const isVideo = ["mp4", "mov", "webm", "avi", "mkv"].includes(ext) && !isAudio;
  const config = getFileTypeConfig(fileName);

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Fetch text content for inline preview of txt files
  useEffect(() => {
    if (isTxt && fileUrl) {
      setLoadingTxt(true);
      fetch(`${fileUrl}?t=${new Date().getTime()}`, {
        method: "GET",
        cache: "no-cache",
      })
        .then((res) => {
          if (!res.ok) throw new Error("Không thể tải tệp");
          return res.text();
        })
        .then((text) => {
          setTxtContent(text);
        })
        .catch((err) => {
          console.error("Lỗi khi tải nội dung text tệp:", err);
          setTxtContent("Lỗi khi tải nội dung tệp.");
        })
        .finally(() => {
          setLoadingTxt(false);
        });
    }
  }, [isTxt, fileUrl]);

  // Extract first 2-3 lines of text for inline preview
  const previewLines = txtContent ? txtContent.split("\n").slice(0, 2) : [];

  return (
    <div className="flex flex-col gap-2 w-full p-3 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow transition-shadow duration-200">

      {/* 1. Inline content preview for .txt files */}
      {isTxt && (
        <div className="border border-blue-100 rounded-xl bg-gray-50/50 text-[12px] font-mono overflow-hidden flex flex-col select-none">
          <div className="flex bg-white/70 border-b border-blue-50/40 text-[11px]">
            {/* Line numbers column */}
            <div className="py-2 px-3 text-right bg-gray-100/50 border-r border-gray-100 text-gray-400 font-medium w-8">
              {previewLines.map((_, idx) => (
                <div key={idx}>{idx + 1}</div>
              ))}
            </div>
            {/* Text content lines column */}
            <div className="py-2 px-3 text-gray-700 flex-1 whitespace-pre truncate font-medium">
              {loadingTxt ? (
                <div className="text-gray-400 italic">Đang tải...</div>
              ) : previewLines.length > 0 ? (
                previewLines.map((line, idx) => (
                  <div key={idx} className="truncate">
                    {line || <span className="opacity-0">.</span>}
                  </div>
                ))
              ) : (
                <div className="text-gray-400 italic">Tệp trống</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1.5. Inline content preview for video files */}
      {isVideo && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (isMultiSelectMode) return;
            setIsPreviewingVideo(true);
          }}
          className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center cursor-pointer group w-full mb-1 shadow-inner border border-gray-150"
        >
          <video
            src={fileUrl}
            className="w-full h-full object-cover"
            preload="metadata"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/45 transition-colors">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 shadow-md transform group-hover:scale-110 transition-transform duration-200">
              {/* Play Icon */}
              <svg className="w-6 h-6 fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* 1.8. Inline content preview for audio files */}
      {isAudio && (
        <div className="w-[280px] bg-gray-50 rounded-2xl p-3 border border-gray-100 shadow-sm">
          <audio
            src={fileUrl}
            controls
            className="w-full h-10 custom-audio-player"
            preload="metadata"
          />
        </div>
      )}

      {/* 2. File Card (Only if not audio) */}
      {!isAudio && (
        <div className="flex items-center gap-3 w-full py-1 px-1">

        {/* Customized File Icon with characteristic color and label */}
        <div className={`relative w-11 h-13 ${config.bgClass} rounded-xl flex flex-col justify-end p-1 shrink-0 shadow-sm overflow-hidden`}>
          <div className="absolute top-0 right-0 w-4 h-4 bg-white/25 rounded-bl-md" />
          <span className="text-[11px] font-black text-white leading-none tracking-tight mb-1 select-none text-center block w-full">
            {config.text}
          </span>
        </div>

        {/* File Metadata */}
        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <p className="text-[14px] font-bold text-gray-800 truncate leading-tight select-all">
            {fileName}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
            <span>{formatSize(fileSize)}</span>
            <div className="flex items-center gap-0.5 text-blue-500 whitespace-nowrap shrink-0">
              <ClockIcon className="w-3.5 h-3.5" />
              <span>Tải về để xem lâu dài</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">

          {/* Eye Icon (Preview) - For TXT and Video files */}
          {(isTxt || isVideo) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isMultiSelectMode) return;
                if (isTxt) {
                  onPreviewTxt(fileName, txtContent);
                } else if (isVideo) {
                  setIsPreviewingVideo(true);
                }
              }}
              className="w-8 h-8 bg-white border border-gray-150 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 active:bg-gray-100 hover:text-gray-800 transition shadow-sm"
              title="Xem trước"
            >
              <EyeIcon className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Download Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(fileUrl, fileName);
            }}
            className="w-8 h-8 bg-white border border-gray-150 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 active:bg-gray-100 hover:text-gray-800 transition shadow-sm"
            title="Tải về máy"
          >
            <ArrowDownTrayIcon className="w-4.5 h-4.5" />
          </button>

        </div>

      </div>
      )}

      {/* 3. Video Preview Modal */}
      {isPreviewingVideo && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col justify-between bg-black/95 animate-in fade-in duration-200 text-white select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Row: Filename and Close Button */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent z-10">
            <span className="w-6 h-6" /> {/* Spacer */}
            <div className="flex-1 text-center font-bold text-[16px] truncate max-w-xl">
              {fileName}
            </div>
            <button
              className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition"
              onClick={() => setIsPreviewingVideo(false)}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Middle: Video Player */}
          <div className="flex-1 flex items-center justify-center p-4">
            <video
              src={fileUrl}
              className="max-h-[75vh] max-w-full rounded-lg shadow-2xl"
              controls
              autoPlay
            />
          </div>

          {/* Bottom Row: Sender Info & Actions */}
          <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-t from-black/60 to-transparent z-10">
            {/* Left: Sender Info */}
            <div className="flex items-center gap-3">
              {senderAvatar ? (
                <img
                  src={getMediaUrl(senderAvatar)}
                  alt={senderName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/20">
                  {senderName ? senderName.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="font-bold text-sm">{senderName || "Người dùng"}</span>
                <span className="text-xs text-white/60">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} Hôm nay
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownload(fileUrl, fileName)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-bold transition"
              >
                <ArrowDownTrayIcon className="w-4.5 h-4.5" />
                <span>Tải về</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
