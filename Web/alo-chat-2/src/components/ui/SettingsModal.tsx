"use client";
import { useEffect, useState } from "react";
import {
  XMarkIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  SwatchIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  CommandLineIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import ResetPasswordView from "./viewmodels/ResetPasswordView";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState("general");
  // quản lý trạng thái của trang view Security
  const [securityView, setSecurityView] = useState<"list" | "changePassword">(
    "list",
  );
  // Mỗi khi đổi Tab lớn, hãy reset view con về 'list'
  useEffect(() => {
    setSecurityView("list");
  }, [activeTab]);

  if (!isOpen) return null;

  const menuItems = [
    { id: "general", name: "Cài đặt chung", icon: Cog6ToothIcon },
    { id: "security", name: "Tài khoản và bảo mật", icon: ShieldCheckIcon },
    { id: "privacy", name: "Quyền riêng tư", icon: LockClosedIcon },
    { id: "appearance", name: "Giao diện", icon: SwatchIcon },
    { id: "notifications", name: "Thông báo", icon: BellIcon },
    { id: "messages", name: "Tin nhắn", icon: ChatBubbleLeftRightIcon },
    { id: "calls", name: "Cài đặt cuộc gọi", icon: PhoneIcon },
    { id: "utilities", name: "Tiện ích", icon: CommandLineIcon },
  ];

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* 1. Sửa bg-[#1a1d21] -> bg-white
         2. Sửa text-white -> text-gray-900 (màu chữ chính tối đi)
         3. Sửa border-gray-700 -> border-gray-200 (viền nhẹ hơn)
      */}
      <div className="flex w-212.5 h-150 bg-white text-gray-900 rounded-lg overflow-hidden shadow-2xl border border-gray-200">
        {/* SIDEBAR BÊN TRÁI */}
        {/* 4. Sửa bg-[#24272b] -> bg-[#f4f5f7] (nền sidebar xám nhẹ)
           5. Sửa border-gray-700 -> border-gray-200
        */}
        <div className="w-70 bg-[#f4f5f7] border-r border-gray-200 p-4">
          <h2 className="text-xl font-bold mb-6 px-2 text-gray-950">Cài đặt</h2>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center w-full px-3 py-2.5 rounded-md text-sm transition-all ${
                  activeTab === item.id
                    ? "bg-blue-100 text-blue-700 font-semibold" // 6. Màu khi Active (xanh dương nhẹ)
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-950" // 7. Màu thường & hover
                }`}
              >
                <item.icon
                  className={`w-5 h-5 mr-3 ${activeTab === item.id ? "text-blue-600" : "text-gray-500"}`}
                />
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        {/* NỘI DUNG BÊN PHẢI */}
        {/* 8. Sửa bg-[#1a1d21] -> bg-white */}
        <div className="flex-1 flex flex-col bg-white relative">
          {/* Nút đóng */}
          <button
            onClick={onClose}
            // 9. Sửa hover:bg-gray-700 -> hover:bg-gray-100
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-full transition-colors group"
          >
            {/* 10. Sửa text-gray-400 -> text-gray-500 */}
            <XMarkIcon className="w-5 h-5 text-gray-500 group-hover:text-gray-800" />
          </button>

          <div className="p-8 overflow-y-auto">
            {activeTab === "general" && (
              <div className="space-y-8">
                <section>
                  <h3 className="text-lg font-semibold mb-4 text-gray-950">
                    Danh bạ
                  </h3>
                  {/* 11. Sửa bg-[#24272b] -> bg-white, thêm border border-gray-200 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 shadow-sm">
                    <label className="flex items-center justify-between cursor-pointer group py-1">
                      <span className="text-gray-800 group-hover:text-gray-950">
                        Hiển thị tất cả bạn bè
                      </span>
                      <input
                        type="radio"
                        name="contacts"
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer group py-1">
                      <span className="text-gray-800 group-hover:text-gray-950">
                        Chỉ hiển thị bạn bè đang sử dụng Z-Chat
                      </span>
                      <input
                        type="radio"
                        name="contacts"
                        defaultChecked
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-4 text-gray-950">
                    Ngôn ngữ
                  </h3>
                  {/* 12. Sửa màu tương tự section trên */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
                    <span className="text-gray-800">Thay đổi ngôn ngữ</span>
                    {/* 13. Sửa bg-[#1a1d21] -> bg-white, text-gray-600 -> gray-200 */}
                    <select className="bg-white border border-gray-300 text-gray-900 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                      <option>Tiếng Việt</option>
                      <option>English</option>
                    </select>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "security" && (
              <div className="h-full">
                {securityView === "list" ? (
                  <div className="animate-in fade-in duration-300">
                    <h3 className="text-lg font-semibold mb-4 text-gray-950 px-2">
                      Mật khẩu
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                      <button
                        onClick={() => setSecurityView("changePassword")}
                        className="flex items-center justify-between w-full px-5 py-5 hover:bg-gray-50 transition-colors group rounded-xl"
                      >
                        <div className="text-left">
                          <p className="text-[15px] text-gray-800 font-bold group-hover:text-blue-600 transition-colors">
                            Đổi mật khẩu
                          </p>
                          <p className="text-sm text-gray-500">
                            Thay đổi mật khẩu định kỳ để bảo mật tài khoản
                          </p>
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // GỌI COMPONENT ĐÃ TÁCH Ở ĐÂY
                  <ResetPasswordView onBack={() => setSecurityView("list")} />
                )}
              </div>
            )}

            {activeTab !== "general" && (
              // 14. Sửa text-gray-500 -> text-gray-400
              <div className="flex items-center justify-center h-full text-gray-400">
                Đang phát triển tính năng{" "}
                {menuItems.find((i) => i.id === activeTab)?.name}...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
