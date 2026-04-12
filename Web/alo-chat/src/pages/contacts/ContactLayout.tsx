import Sidebar from "@/components/ui/Sidebar";
import { connectSocket, disconnectSocket } from "@/config/socketService";
import ContactSidebar from "@/pages/contacts/ContactSidebar";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";

export default function ContactLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  console.log(
    "📍 [BƯỚC 1 - ContactLayout] Bắt đầu render! Trạng thái đăng nhập:",
    isAuthenticated,
  );
  useEffect(() => {
    console.log("📍 [BƯỚC 2 - ContactLayout] Chạy useEffect để gắn Socket.");
    if (isAuthenticated) {
      connectSocket();
    }
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated]);
  return (
    
    <div className="flex h-screen w-full overflow-hidden text-gray-800 font-sans bg-white">
            {console.log("📍 [BƯỚC 3 - ContactLayout] Chuẩn bị render Sidebar và Nội dung chính (Outlet)...")}

      <Sidebar />
      <ContactSidebar />
      {/* Main content area */}
      <main className="flex-1 min-w-0 bg-[#fafafa]">
        <Outlet />
      </main>
    </div>
  );
}
