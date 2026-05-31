"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatBubbleOvalLeftIcon as ChatOutline,
  UserGroupIcon as GroupOutline,
  QuestionMarkCircleIcon,
  Cog8ToothIcon,
  UserIcon as UserOutline,
  NewspaperIcon as NewspaperOutline,
  BellIcon as BellOutline,
} from "@heroicons/react/24/outline";
import {
  UserIcon as UserSolid,
  ChatBubbleOvalLeftIcon as ChatSolid,
  UserGroupIcon as GroupSolid,
  NewspaperIcon as NewspaperSolid,
  BellIcon as BellSolid,
} from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";

// Import components
import UserMenu from "./UserMenu";
import ProfileModal from "./ProfileModal";
import SettingsMenu from "./SettingsMenu";
import SettingsModal from "./SettingsModal";
import NotificationMenu from "./NotificationMenu";
import YearInReviewModal from "./YearInReviewModal";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { useNotificationStore } from "../../store/useNotificationStore";

export default function Sidebar() {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  // Management of settings modal open state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null); // Ref for settings button
  const notificationRef = useRef<HTMLDivElement>(null); // Ref for notifications

  // Helper to check active link
  const isActive = (path: string) => pathname.includes(path);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setShowSettingsMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        if (target instanceof Element && !target.closest(".notification-menu-container")) {
          setShowNotificationMenu(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auth & Chat states
  const { user, fetchProfile } = useAuthStore();
  const { unreadNotifsCount } = useChatStore();
  const { friendRequestCount, groupInviteCount } = useNotificationStore();

  const getAvatarUrl = () => {
    if (!user)
      return "https://ui-avatars.com/api/?name=U&background=E5E7EB&color=374151&rounded=true";

    const avatarStr = user.avatar;
    if (avatarStr) {
      if (avatarStr.startsWith("http") || avatarStr.startsWith("data:")) {
        return avatarStr;
      }
      return `http://localhost:8888${avatarStr.startsWith("/") ? "" : "/"}${avatarStr}`;
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.email || "User")}&background=E5E7EB&color=374151&rounded=true`;
  };

  const avatarUrl = getAvatarUrl();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  return (
    <div className="fixed md:relative bottom-0 left-0 w-full md:w-auto md:flex h-16 md:h-screen shrink-0 z-50 md:z-40">
      {/* Thin Sidebar Bar */}
      <div className="w-full md:w-19 h-full bg-[#f4f5f7] flex flex-row md:flex-col items-center py-2 md:py-6 px-2 md:px-0 justify-around md:justify-between shrink-0 border-t md:border-t-0 md:border-r border-gray-200 relative pb-safe">
        {/* === MAIN NAV SECTION === */}
        <div className="flex flex-row md:flex-col items-center justify-around md:justify-start gap-1 md:gap-8 w-full md:w-auto flex-1 md:flex-none">
          <Link
            href="/"
            className="hidden md:flex w-10 h-10 rounded-full overflow-hidden mb-2 border-2 border-gray-100 shadow-sm hover:scale-110 transition-transform active:scale-95 bg-white items-center justify-center"
          >
            <img
              src="/alochat.svg"
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </Link>

          <Link
            href="/chat"
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isActive("/chat") ? "bg-gray-200 text-black" : "text-gray-600 hover:text-black hover:bg-gray-100"}`}
          >
            {isActive("/chat") ? (
              <ChatSolid className="w-6 h-6" />
            ) : (
              <ChatOutline className="w-6 h-6" />
            )}
          </Link>

          {/* Contacts */}
          <Link
            href="/contacts"
            className={`relative w-12 h-12 flex items-center justify-center rounded-full transition-all ${isActive("/contacts") && !isActive("/contacts/groups") && !isActive("/contacts/group-invites") ? "bg-gray-200 text-black" : "text-gray-600 hover:text-black hover:bg-gray-100"}`}
            title="Danh bạ"
          >
            {isActive("/contacts") &&
              !isActive("/contacts/groups") &&
              !isActive("/contacts/group-invites") ? (
              <UserSolid className="w-6 h-6" />
            ) : (
              <UserOutline className="w-6 h-6" />
            )}
            
            {friendRequestCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center border border-white">
                {friendRequestCount > 9 ? "9+" : friendRequestCount}
              </span>
            )}
          </Link>

          {/* Group Management */}
          <Link
            href="/contacts/groups"
            className={`relative w-12 h-12 flex items-center justify-center rounded-full transition-all ${isActive("/contacts/groups") || isActive("/contacts/group-invites") ? "bg-gray-200 text-black" : "text-gray-600 hover:text-black hover:bg-gray-100"}`}
            title="Quản lý nhóm"
          >
            {isActive("/contacts/groups") ||
              isActive("/contacts/group-invites") ? (
              <GroupSolid className="w-6 h-6" />
            ) : (
              <GroupOutline className="w-6 h-6" />
            )}
            
            {groupInviteCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center border border-white">
                {groupInviteCount > 9 ? "9+" : groupInviteCount}
              </span>
            )}
          </Link>

          {/* Timeline / News Feed */}
          <Link
            href="/feed"
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isActive("/feed") ? "bg-gray-200 text-black" : "text-gray-600 hover:text-black hover:bg-gray-100"}`}
            title="Nhật ký"
          >
            {isActive("/feed") ? (
              <NewspaperSolid className="w-6 h-6" />
            ) : (
              <NewspaperOutline className="w-6 h-6" />
            )}
          </Link>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotificationMenu(!showNotificationMenu)}
              className={`w-12 h-12 flex items-center justify-center rounded-full transition-all relative ${showNotificationMenu ? "bg-gray-200 text-black" : "text-gray-600 hover:text-black hover:bg-gray-100"}`}
              title="Thông báo"
            >
              {showNotificationMenu ? (
                <BellSolid className="w-6 h-6 text-blue-600" />
              ) : (
                <BellOutline className="w-6 h-6" />
              )}
              
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center border border-white">
                  {unreadNotifsCount > 9 ? "9+" : unreadNotifsCount}
                </span>
              )}
            </button>
          </div>

          {/* USER AVATAR - Mobile only (moved to bottom on desktop) */}
          <div className="relative md:hidden flex items-center" ref={menuRef}>
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 cursor-pointer rounded-full overflow-hidden border border-gray-300 active:scale-90 transition-transform"
            >
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).onerror = null;
                  (e.target as HTMLImageElement).src =
                    "https://ui-avatars.com/api/?name=U&background=E5E7EB&color=374151&rounded=true";
                }}
              />
            </div>
          </div>
        </div>

        {/* === BOTTOM SECTION (Desktop Only) === */}
        <div className="hidden md:flex flex-col items-center gap-6 w-full">
          <button className="text-gray-600 hover:text-black transition-colors">
            <QuestionMarkCircleIcon className="w-6 h-6" />
          </button>

          {/* SETTINGS GEAR */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className={`transition-colors ${showSettingsMenu ? "text-black" : "text-gray-600 hover:text-black"}`}
            >
              <Cog8ToothIcon className="w-6 h-6" />
            </button>

            {/* Render SettingsMenu */}
            {showSettingsMenu && (
              <SettingsMenu
                onClose={() => setShowSettingsMenu(false)}
                onOpenGeneralSettings={() => setIsSettingsModalOpen(true)}
              />
            )}
          </div>

          {/* USER AVATAR */}
          <div className="relative" ref={menuRef}>
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 mt-2 cursor-pointer rounded-full overflow-hidden border border-gray-300 active:scale-90 transition-transform"
            >
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).onerror = null;
                  (e.target as HTMLImageElement).src =
                    "https://ui-avatars.com/api/?name=U&background=E5E7EB&color=374151&rounded=true";
                }}
              />
            </div>

            {showUserMenu && (
              <UserMenu
                onClose={() => setShowUserMenu(false)}
                onOpenProfile={() => setIsProfileOpen(true)}
                onOpenWrapped={() => setIsWrappedOpen(true)}
                onLogout={() => {
                  useAuthStore.getState().logout();
                  window.location.href = "/login";
                }}
              />
            )}
          </div>
        </div>

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />

        {/* ProfileModal */}
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />

        {/* Year in Review (Alo-Chat Wrapped) Modal */}
        <YearInReviewModal
          isOpen={isWrappedOpen}
          onClose={() => setIsWrappedOpen(false)}
        />
      </div>

      {showNotificationMenu && (
        <NotificationMenu onClose={() => setShowNotificationMenu(false)} />
      )}
    </div>
  );
}
