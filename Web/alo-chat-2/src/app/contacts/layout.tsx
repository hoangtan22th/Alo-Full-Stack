"use client";

import Sidebar from "@/components/ui/Sidebar";
import ContactSidebar from "@/components/ui/ContactSidebar";

export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden text-gray-800 font-sans bg-white">
      <Sidebar />
      <ContactSidebar />
      <main className="flex-1 min-w-0 bg-[#fafafa]">
        {children}
      </main>
    </div>
  );
}
