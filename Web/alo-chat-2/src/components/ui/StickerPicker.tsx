"use client";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { FaceSmileIcon } from "@heroicons/react/24/outline";

const StipopSearch = dynamic(
  () => import("stipop-react-sdk/dist/SearchComponent"),
  { ssr: false }
);

interface StickerPickerProps {
  onStickerSelect: (stickerUrl: string) => void;
  userId?: string;
}

export default function StickerPicker({
  onStickerSelect,
  userId = "chau",
}: StickerPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPicker]);

  return (
    <div className="relative" ref={pickerRef}>
      {/* Popup Sticker — nổi lên phía trên nút */}
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200" style={{ width: 'fit-content', height: 'fit-content' }}>
          <StipopSearch
            params={{
              apikey: process.env.NEXT_PUBLIC_STIPOP_API_KEY || "",
              userId: userId,
              lang: "en",
            }}
            stickerClick={(sticker: any) => {
              console.log("Đã lấy được sticker:", sticker.url);
              onStickerSelect(sticker.url);
              setShowPicker(false);
            }}
          />
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={`p-2 transition ${
          showPicker ? "text-blue-600" : "text-gray-500 hover:text-black"
        }`}
        title="Gửi sticker"
      >
        <FaceSmileIcon className="w-6 h-6" />
      </button>
    </div>
  );
}
