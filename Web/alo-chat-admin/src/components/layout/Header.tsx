"use client";

import {
  BellIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/useAuthStore";
import { useConfirmStore } from "@/store/useConfirmStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useEffect, useState } from "react";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function Header() {
  const { adminEmail, adminName, isSuperAdmin, logout, checkAuth } =
    useAuthStore();
  const { confirm } = useConfirmStore();
  const { isConnected } = useAdminSocket();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotificationStore();
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

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
          <div className="relative">
            <button 
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                setIsDropdownOpen(false);
              }}
              className="text-on-surface-variant hover:text-on-surface transition-colors duration-200 scale-95 active:opacity-80 p-2 rounded-full hover:bg-surface-container relative"
            >
              <BellIcon className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-surface-container-low">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {isConnected && unreadCount === 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full border-2 border-surface-container-low" />
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && mounted && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-surface-container-lowest border border-outline-variant/15 rounded-2xl shadow-xl overflow-hidden z-50 flex flex-col max-h-[480px]">
                <div className="px-4 py-3 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low/30">
                  <h4 className="font-bold text-sm text-on-surface">Thông báo</h4>
                  <div className="flex gap-2">
                    <button 
                      onClick={markAllAsRead}
                      className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tight"
                    >
                      Đọc hết
                    </button>
                    <button 
                      onClick={clearNotifications}
                      className="text-[10px] font-bold text-on-surface-variant hover:text-red-500 transition-colors"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 custom-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.link) window.location.href = n.link;
                        }}
                        className={cn(
                          "px-4 py-3 border-b border-outline-variant/5 cursor-pointer transition-colors hover:bg-surface-container-low flex gap-3",
                          !n.read && "bg-primary/5"
                        )}
                      >
                        <div className={cn(
                          "mt-1 p-1.5 rounded-lg shrink-0",
                          n.type === 'REPORT' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                        )}>
                          <ExclamationTriangleIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{n.title}</p>
                          <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">{n.description}</p>
                          <p className="text-[9px] text-on-surface-variant/60 mt-1">
                            {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                        {!n.read && (
                          <div className="mt-2 w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-10 text-center flex flex-col items-center justify-center opacity-40">
                      <BellIcon className="w-10 h-10 mb-2" />
                      <p className="text-xs italic">Không có thông báo mới</p>
                    </div>
                  )}
                </div>
                
                {notifications.length > 0 && (
                   <div className="p-2 border-t border-outline-variant/10 text-center bg-surface-container-low/10">
                      <button className="text-[10px] font-bold text-on-surface-variant hover:text-primary transition-colors">
                        Xem tất cả lịch sử
                      </button>
                   </div>
                )}
              </div>
            )}
          </div>

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
