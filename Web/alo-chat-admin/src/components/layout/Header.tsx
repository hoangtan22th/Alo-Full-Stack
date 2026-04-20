"use client";

import {
  BellIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/useAuthStore";
import { useConfirmStore } from "@/store/useConfirmStore";
import { useEffect, useState } from "react";

export function Header() {
  const { adminEmail, adminName, isSuperAdmin, logout, checkAuth } =
    useAuthStore();
  const { confirm } = useConfirmStore();
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    setMounted(true);
  }, [checkAuth]);

  // Lấy ký tự đầu làm Avatar
  const displayName = adminName || adminEmail || "Loading...";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="flex justify-between items-center w-full px-8 h-16 bg-surface-container-low top-0 sticky z-40">
      <div className="md:hidden">
        <span className="text-lg font-bold text-on-surface">
          Alo-Chat Admin
        </span>
      </div>

      <button className="md:hidden text-on-surface">
        <Bars3Icon className="w-6 h-6" />
      </button>

      <div className="hidden md:flex flex-1 items-center justify-between">
        <div className="text-lg font-bold text-on-surface invisible">
          Alo-Chat Admin
        </div>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-on-surface transition-colors duration-200 scale-95 active:opacity-80 p-2 rounded-full hover:bg-surface-container">
            <BellIcon className="w-5 h-5" />
          </button>

          {/* User Info Container */}
          <div className="relative">
            <div
              className="flex items-center gap-3 bg-surface-container hover:bg-surface-container-highest transition-colors px-3 py-1.5 rounded-full cursor-pointer"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="text-sm font-medium text-on-surface">
                {mounted ? displayName : "..."}
              </span>
              <Avatar className="h-8 w-8 bg-primary border-none cursor-pointer">
                <AvatarFallback className="bg-primary text-on-primary font-bold text-sm">
                  {mounted ? initial : "A"}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Dropdown Profile Info */}
            {isDropdownOpen && mounted && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-surface-container-lowest border border-[#ebeef0] rounded-xl shadow-lg overflow-hidden py-2 z-50">
                <div className="px-4 py-3 border-b border-[#ebeef0]">
                  <p className="text-sm font-bold text-on-surface truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate mt-0.5">
                    {adminEmail}
                  </p>
                  <div className="mt-2 inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                    {isSuperAdmin ? "Super Admin" : "System Admin"}
                  </div>
                </div>

                <div className="py-1">
                  <button className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-on-surface-variant" />
                    Account Settings
                  </button>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      confirm({
                        title: "Đăng xuất",
                        message:
                          "Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?",
                        confirmText: "Đăng xuất",
                        destructive: true,
                        onConfirm: () => {
                          logout();
                        },
                      });
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 mt-1 border-t border-[#ebeef0] pt-2"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4 text-red-500" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
