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

export default function Sidebar() {
  const location = useLocation();

  // Hàm kiểm tra xem đường dẫn hiện tại có khớp với menu không
  const isActive = (path: string) => location.pathname.includes(path);

  return (
    <div className="w-[76px] h-screen bg-[#f4f5f7] flex flex-col items-center py-6 justify-between shrink-0 border-r border-gray-200">
      
      {/* === PHẦN TRÊN: Logo & Menu Chính === */}
      <div className="flex flex-col items-center gap-8 w-full">
        
        {/* Logo (Hai vòng tròn đồng tâm) */}
        <div className="w-10 h-10 rounded-full border-[2.5px] border-black flex items-center justify-center mb-2">
          <div className="w-4 h-4 rounded-full border-[2.5px] border-black"></div>
        </div>
        
        {/* 1. Nút Chat */}
        <Link 
          to="/chat" 
          className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${
            isActive('/chat') ? 'bg-gray-200 text-black' : 'text-gray-600 hover:text-black hover:bg-gray-100'
          }`}
        >
          {isActive('/chat') ? <ChatSolid className="w-6 h-6" /> : <ChatOutline className="w-6 h-6" />}
        </Link>

        {/* 2. Nút Danh bạ (User) */}
        <Link 
          to="/contacts" 
          className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${
            isActive('/contacts') ? 'bg-gray-200 text-black' : 'text-gray-600 hover:text-black hover:bg-gray-100'
          }`}
        >
          {isActive('/contacts') ? <UserSolid className="w-6 h-6" /> : <UserOutline className="w-6 h-6" />}
        </Link>

        {/* 3. Nút Nhóm */}
        <Link 
          to="/groups" 
          className="w-12 h-12 flex items-center justify-center rounded-full text-gray-600 hover:text-black hover:bg-gray-100 transition-all"
        >
          <GroupOutline className="w-6 h-6" />
        </Link>

        {/* 4. Nút Lưu trữ */}
        <Link 
          to="/archive" 
          className="w-12 h-12 flex items-center justify-center rounded-full text-gray-600 hover:text-black hover:bg-gray-100 transition-all"
        >
          <ArchiveOutline className="w-6 h-6" />
        </Link>
      </div>

      {/* === PHẦN DƯỚI: Công cụ & Avatar === */}
      <div className="flex flex-col items-center gap-6 w-full">
        
        {/* Nút Trợ giúp */}
        <button className="text-gray-600 hover:text-black transition-colors">
          <QuestionMarkCircleIcon className="w-6 h-6" />
        </button>

        {/* Nút Cài đặt */}
        <button className="text-gray-600 hover:text-black transition-colors">
          <Cog8ToothIcon className="w-6 h-6" />
        </button>

        {/* Avatar User */}
        <div className="w-10 h-10 mt-2 cursor-pointer rounded-full overflow-hidden border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
          <img 
            src="https://i.pravatar.cc/150?img=11" 
            alt="Avatar" 
            className="w-full h-full object-cover"
          />
        </div>

      </div>
    </div>
  );
}