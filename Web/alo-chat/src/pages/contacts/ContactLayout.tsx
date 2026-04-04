import Sidebar from "@/components/ui/Sidebar";
import ContactSidebar from "@/pages/contacts/ContactSidebar";
import FriendRequestPage from "./FriendRequestPage";

export default function ContactLayout() {
  return (
    // Flexbox bọc ngoài cùng, ép chiều cao đúng bằng màn hình (h-screen)
    <div className="flex h-screen w-full overflow-hidden text-gray-800 font-sans">
      <Sidebar />
      <ContactSidebar />
      <FriendRequestPage />
    </div>
  );
}
