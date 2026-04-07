// Popup khi nhấn vào avatar
import { UserIcon as UserOutline } from '@heroicons/react/24/outline';

interface UserMenuProps {
  onOpenProfile: () => void;
  onLogout: () => void;
}

export default function UserMenu({ onOpenProfile, onLogout }: UserMenuProps) {
    const handleLogout = async () => {
    try {
        await fetch("http://localhost:8888/api/v1/auth/logout", {
        method: "POST",
        credentials: "include", // gửi cookie (refresh token)
        });

        // Xóa access token
        localStorage.removeItem("accessToken");

        // Redirect
        window.location.href = "/login";
    } catch (error) {
        console.error("Logout error:", error);
    }
    };

  return (
    <div className="absolute bottom-0 left-full ml-4 w-56 bg-white border border-gray-200 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-left-2">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs text-gray-500 font-medium">Tài khoản</p>
      </div>
      
      <div className="p-1">
        <button 
          onClick={onOpenProfile}
          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors flex items-center gap-3"
        >
          <UserOutline className="w-5 h-5" />
          Hồ sơ của bạn
        </button>
        
        <button 
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}