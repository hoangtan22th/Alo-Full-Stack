"use client";
import {
  Cog8ToothIcon,
  LanguageIcon,
  QuestionMarkCircleIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";

// 1. Khai báo Interface (Xóa bớt cái trùng lặp ở trên đi nhé)
interface SettingsMenuProps {
  onClose: () => void;
  onOpenGeneralSettings: () => void;
}

export default function SettingsMenu({
  onClose,
  onOpenGeneralSettings,
}: SettingsMenuProps) {
  const menuItems = [
    { name: "Cài đặt", icon: Cog8ToothIcon, color: "text-gray-700" },
    { name: "Ngôn ngữ", icon: LanguageIcon, color: "text-gray-700" },
    { name: "Hỗ trợ", icon: QuestionMarkCircleIcon, color: "text-gray-700" },
    {
      name: "Đăng xuất",
      icon: ArrowLeftOnRectangleIcon,
      color: "text-red-500",
    },
  ];

  return (
    <div className="absolute left-15 bottom-0 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-left-2 duration-200">
      <div className="px-4 py-2 border-b border-gray-100 mb-1">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Tùy chỉnh
        </span>
      </div>

      {menuItems.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            // LOGIC QUAN TRỌNG Ở ĐÂY:
            if (item.name === "Cài đặt") {
              onOpenGeneralSettings(); // Mở Modal to
            }

            if (item.name === "Đăng xuất") {
              // Bạn có thể thêm logic đăng xuất ở đây sau này
              console.log("Đang đăng xuất...");
            }

            onClose(); // Luôn đóng cái menu nhỏ này lại sau khi chọn
          }}
          className="flex items-center w-full px-4 py-3 text-[14px] hover:bg-gray-50 transition-colors group"
        >
          <item.icon
            className={`w-5 h-5 mr-3 ${item.color} group-hover:scale-110 transition-transform`}
          />
          <span className={`font-medium ${item.color}`}>{item.name}</span>
        </button>
      ))}
    </div>
  );
}
