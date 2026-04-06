import Sidebar from "@/components/ui/Sidebar";
import ContactSidebar from "@/pages/contacts/ContactSidebar";
import { Outlet } from "react-router-dom";

export default function ContactLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden text-gray-800 font-sans">
      <Sidebar />
      <ContactSidebar />

      <Outlet />
    </div>
  );
}
