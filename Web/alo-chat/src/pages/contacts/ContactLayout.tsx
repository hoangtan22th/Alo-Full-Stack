import Sidebar from "@/components/ui/Sidebar";
import ContactSidebar from "@/pages/contacts/ContactSidebar";
import { Outlet } from "react-router-dom";

export default function ContactLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden text-gray-800 font-sans bg-white">
      <Sidebar />
      <ContactSidebar />
      {/* Main content area */}
      <main className="flex-1 min-w-0 bg-[#fafafa]">
        <Outlet />
      </main>
    </div>
  );
}
