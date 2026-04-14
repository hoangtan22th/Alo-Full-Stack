"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatBubbleOvalLeftIcon as ChatOutline,
  UserGroupIcon as GroupOutline,
  QuestionMarkCircleIcon,
  Cog8ToothIcon,
  UserIcon as UserOutline,
} from "@heroicons/react/24/outline";
import {
  UserIcon as UserSolid,
  ChatBubbleOvalLeftIcon as ChatSolid,
  UserGroupIcon as GroupSolid,
} from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";

// Import 2 component mới tách
import UserMenu from "./UserMenu";
import ProfileModal from "./ProfileModal";
import SettingsMenu from "./SettingsMenu";
import SettingsModal from "./SettingsModal";
import { useAuthStore } from "../../store/useAuthStore";

export default function Sidebar() {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  //Khi bấm nào nút cài đặt trong Setting Menu, nó sẽ quản lý việc bật cái Setting model
  // Nếu để cái này ở Setting menu thì khi menu tắt cái model không biết dựa vào đâu
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null); // Ref mới cho nút cài đặt

  // Hàm kiểm tra active link
  const isActive = (path: string) => pathname.includes(path);

  /* Đóng UserMenu khi click ra ngoài
    menuRef.current: Đảm bảo rằng phần tử Menu hiện đang tồn tại trên giao diện
    !menuRef.current.contains(event.target): Kiểm tra xem điểm mà người dùng vừa click (event.target) 
    không nằm trong vùng không gian của Menu.*/
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setShowSettingsMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sử dụng Zustand store lấy dữ liệu user
  const { user, fetchProfile } = useAuthStore();

  // Tính toán avatar trực tiếp từ state (Derived State) thay vì dùng useEffect để tránh lỗi ESLint
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

  // Fetch lại profile 1 lần lúc mới load app/mount Sidebar (để đảm bảo dữ liệu luôn mới)
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Nếu user chưa có, thử lấy lại từ localStorage (trường hợp reload F5)
  useEffect(() => {
    if (!user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  return (
    <div className="w-19 h-screen bg-[#f4f5f7] flex flex-col items-center py-6 justify-between shrink-0 border-r border-gray-200">
      {/* === PHẦN TRÊN === */}
      <div className="flex flex-col items-center gap-8 w-full">
        <Link
          href="/"
          className="w-10 h-10 rounded-full overflow-hidden mb-2 border-2 border-gray-100 shadow-sm hover:scale-110 transition-transform active:scale-95 bg-white flex items-center justify-center"
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

        {/* Danh Bạ */}
        <Link
          href="/contacts"
          className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isActive("/contacts") && !isActive("/contacts/groups") && !isActive("/contacts/group-invites") ? "bg-gray-200 text-black" : "text-gray-600 hover:text-black hover:bg-gray-100"}`}
          title="Danh bạ"
        >
          {isActive("/contacts") &&
            !isActive("/contacts/groups") &&
            !isActive("/contacts/group-invites") ? (
            <UserSolid className="w-6 h-6" />
          ) : (
            <UserOutline className="w-6 h-6" />
          )}
        </Link>

        {/* Quản lý nhóm */}
        <Link
          href="/contacts/groups"
          className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isActive("/contacts/groups") || isActive("/contacts/group-invites") ? "bg-gray-200 text-black" : "text-gray-600 hover:text-black hover:bg-gray-100"}`}
          title="Quản lý nhóm"
        >
          {isActive("/contacts/groups") ||
            isActive("/contacts/group-invites") ? (
            <GroupSolid className="w-6 h-6" />
          ) : (
            <GroupOutline className="w-6 h-6" />
          )}
        </Link>

        {/* <Link href="/archive" className="w-12 h-12 flex items-center justify-center rounded-full text-gray-600 hover:text-black hover:bg-gray-100 transition-all">
          <ArchiveOutline className="w-6 h-6" />
        </Link> */}
      </div>

      {/* === PHẦN DƯỚI === */}
      <div className="flex flex-col items-center gap-6 w-full">
        <button className="text-gray-600 hover:text-black transition-colors">
          <QuestionMarkCircleIcon className="w-6 h-6" />
        </button>

        {/* KHU VỰC RĂNG CƯA */}
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

        {/* KHU VỰC AVATAR */}
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
              onLogout={() => {
                useAuthStore.getState().logout();
                window.location.href = "/login";
              }}
            />
          )}
        </div>
      </div>

      {/* Cơ chế "Truyền tin" ngược dòng? */}
      {/* Cha đưa cho Con nhỏ một cái nút bấm điều khiển (onOpenGeneralSettings).
      Con nhỏ nhấn nút đó.
      Hành động nhấn nút chạy ngược lên Cha, làm thay đổi biến isSettingsModalOpen thành true.
      Cha thấy biến thay đổi, liền bảo Con lớn (SettingsModal đang đứng đợi ở cuối file): "Này, đến lúc hiển thị rồi!". */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* ProfileModal nên để ở cuối, ngoài các div flex để tránh lỗi hiển thị */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}
