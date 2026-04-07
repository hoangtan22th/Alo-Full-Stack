import { Link, useLocation } from 'react-router-dom';
import {
  ChatBubbleOvalLeftIcon as ChatOutline,
  UserGroupIcon as GroupOutline,
  ArchiveBoxArrowDownIcon as ArchiveOutline,
  QuestionMarkCircleIcon,
  Cog8ToothIcon,
  UserIcon as UserOutline
} from '@heroicons/react/24/outline';
import { 
  UserIcon as UserSolid,
  ChatBubbleOvalLeftIcon as ChatSolid 
} from '@heroicons/react/24/solid';
import { useEffect, useRef, useState } from 'react';

// Import 2 component mới tách
import UserMenu from './UserMenu'; 
import ProfileModal from './ProfileModal';

export default function Sidebar() {
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hàm kiểm tra active link
  const isActive = (path: string) => location.pathname.includes(path);

  /* Đóng UserMenu khi click ra ngoài
    menuRef.current: Đảm bảo rằng phần tử Menu hiện đang tồn tại trên giao diện
    !menuRef.current.contains(event.target): Kiểm tra xem điểm mà người dùng vừa click (event.target) 
    không nằm trong vùng không gian của Menu.*/
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  

  return (
    <div className="w-[76px] h-screen bg-[#f4f5f7] flex flex-col items-center py-6 justify-between shrink-0 border-r border-gray-200">
      
      {/* === PHẦN TRÊN === */}
      <div className="flex flex-col items-center gap-8 w-full">
        <div className="w-10 h-10 rounded-full border-[2.5px] border-black flex items-center justify-center mb-2">
          <div className="w-4 h-4 rounded-full border-[2.5px] border-black"></div>
        </div>
        
        <Link to="/chat" className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isActive('/chat') ? 'bg-gray-200 text-black' : 'text-gray-600 hover:text-black hover:bg-gray-100'}`}>
          {isActive('/chat') ? <ChatSolid className="w-6 h-6" /> : <ChatOutline className="w-6 h-6" />}
        </Link>

        <Link to="/contacts" className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isActive('/contacts') ? 'bg-gray-200 text-black' : 'text-gray-600 hover:text-black hover:bg-gray-100'}`}>
          {isActive('/contacts') ? <UserSolid className="w-6 h-6" /> : <UserOutline className="w-6 h-6" />}
        </Link>

        <Link to="/groups" className="w-12 h-12 flex items-center justify-center rounded-full text-gray-600 hover:text-black hover:bg-gray-100 transition-all">
          <GroupOutline className="w-6 h-6" />
        </Link>

        <Link to="/archive" className="w-12 h-12 flex items-center justify-center rounded-full text-gray-600 hover:text-black hover:bg-gray-100 transition-all">
          <ArchiveOutline className="w-6 h-6" />
        </Link>
      </div>

      {/* === PHẦN DƯỚI === */}
      <div className="flex flex-col items-center gap-6 w-full">
        <button className="text-gray-600 hover:text-black transition-colors">
          <QuestionMarkCircleIcon className="w-6 h-6" />
        </button>

        <button className="text-gray-600 hover:text-black transition-colors">
          <Cog8ToothIcon className="w-6 h-6" />
        </button>

        {/* KHU VỰC AVATAR */}
        <div className="relative" ref={menuRef}>
          <div 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-10 h-10 mt-2 cursor-pointer rounded-full overflow-hidden border border-gray-300 active:scale-90 transition-transform"
          >
            <img src="https://i.pravatar.cc/150?img=11" alt="Avatar" className="w-full h-full object-cover" />
          </div>

          {/* Render UserMenu nhỏ */}
          {showUserMenu && (
            <UserMenu 
              onOpenProfile={() => {
                setIsProfileOpen(true);
                setShowUserMenu(false);
              }}
              onLogout={() => console.log("Logout action")}
            />
          )}
        </div>
      </div>

      {/* ProfileModal nên để ở cuối, ngoài các div flex để tránh lỗi hiển thị */}
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </div> 
  );
}