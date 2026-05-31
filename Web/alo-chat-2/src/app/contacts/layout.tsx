"use client";

import Sidebar from "@/components/ui/Sidebar";
import ContactSidebar from "@/components/ui/ContactSidebar";

import { usePathname } from "next/navigation";

export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Nếu ở trang con (ví dụ /contacts/groups), ta có thể cân nhắc ẩn ContactSidebar
  // Tuy nhiên, đối với trang contacts, có thể danh mục nằm trong ContactSidebar.
  // Ở đây ta đơn giản thêm flex-col cho mobile và padding bottom 16 (64px) để không bị Sidebar che khuất.
  
  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden text-gray-800 font-sans bg-white relative pb-16 md:pb-0">
      <div className="relative z-50 shrink-0">
        <Sidebar />
      </div>
      
      <div className="hidden md:flex h-full shrink-0">
        <ContactSidebar />
      </div>
      {/* Trên mobile ta có thể hiển thị ContactSidebar dạng tab hoặc top nav, nhưng tạm thời ẩn nó nếu không cần thiết, hoặc biến nó thành menu.
          Thực ra, nếu người dùng cần bấm các mục trong Contacts, ta cần giữ ContactSidebar. */}
          
      <main className="flex-1 min-w-0 bg-[#fafafa] h-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
