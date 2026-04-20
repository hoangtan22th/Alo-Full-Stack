import React from "react";
import {
  PhoneIcon,
  VideoCameraIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";

function formatTime(iso: string | Date) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface CallSystemMessageProps {
  isMine: boolean;
  metadata: {
    callType: "video" | "audio";
    callStatus: "ended" | "canceled" | "declined";
    callDuration?: number;
  };
  createdAt: string | Date;
  onCallAgain: (isVideo: boolean) => void;
}

export const CallSystemMessage: React.FC<CallSystemMessageProps> = ({
  isMine,
  metadata,
  createdAt,
  onCallAgain,
}) => {
  const { callType, callStatus, callDuration } = metadata;
  const isVideo = callType === "video";
  const isSuccess = callStatus === "ended";

  const getStatusText = () => {
    if (callStatus === "ended")
      return isVideo ? "Cuộc gọi video" : "Cuộc gọi thoại";
    if (callStatus === "canceled")
      return isMine ? "Cuộc gọi đã hủy" : "Cuộc gọi nhỡ";
    if (callStatus === "declined")
      return isMine ? "Đã từ chối cuộc gọi" : "Không trả lời";
    return "Cuộc gọi";
  };

  const getSubText = () => {
    if (callStatus === "ended") {
      const sec = callDuration || 0;
      if (!sec) return "0 giây";
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
    }
    return formatTime(createdAt);
  };

  return (
    <div
      className={`w-[280px] sm:w-[320px] bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col`}
    >
      {/* Phần trên: Thông tin cuộc gọi */}
      <div className="flex items-center gap-3.5 p-4">
        {/* Icon bo tròn */}
        <div
          className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center ${
            isSuccess ? "bg-blue-50 text-blue-500" : "bg-red-50 text-red-500"
          }`}
        >
          {isVideo ? (
            <VideoCameraIcon className="w-6 h-6" />
          ) : (
            <PhoneIcon className="w-6 h-6" />
          )}
        </div>

        {/* Text nội dung */}
        <div className="flex-1 min-w-0 text-left">
          <p
            className={`font-bold text-[15px] truncate ${isSuccess ? "text-gray-900" : "text-red-500"}`}
          >
            {getStatusText()}
          </p>
          <p className="text-[13px] text-gray-500 font-medium mt-0.5">
            {getSubText()}
          </p>
        </div>
      </div>

      <div className="h-[1px] w-full bg-gray-100" />

      {/* Phần dưới: Nút gọi lại */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCallAgain(isVideo);
        }}
        className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-bold text-blue-600 hover:bg-blue-50 transition-colors active:bg-blue-100"
      >
        <ArrowPathIcon className="w-4 h-4" />
        Gọi lại
      </button>
    </div>
  );
};
