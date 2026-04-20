"use client";

import { BellIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState } from "react";

export function Header() {
  const { adminEmail } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lấy ký tự đầu làm Avatar
  const initial = adminEmail ? adminEmail.charAt(0).toUpperCase() : "A";
  const displayEmail = adminEmail ? adminEmail : "Loading...";

  return (
    <header className="flex justify-between items-center w-full px-8 h-16 bg-surface-container-low top-0 sticky z-40">
      <div className="md:hidden">
        <span className="text-lg font-bold text-on-surface">
          Alo-Chat Admin
        </span>
      </div>

      <button className="md:hidden text-on-surface">
        <Bars3Icon className="w-6 h-6" />
      </button>

      <div className="hidden md:flex flex-1 items-center justify-between">
        <div className="text-lg font-bold text-on-surface invisible">
          Alo-Chat Admin
        </div>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-on-surface transition-colors duration-200 scale-95 active:opacity-80 p-2 rounded-full hover:bg-surface-container">
            <BellIcon className="w-5 h-5" />
          </button>

          {/* User Info Container */}
          <div className="flex items-center gap-3 bg-surface-container hover:bg-surface-container-highest transition-colors px-3 py-1.5 rounded-full cursor-pointer">
            <span className="text-sm font-medium text-on-surface">
              {mounted ? displayEmail : "..."}
            </span>
            <Avatar className="h-8 w-8 bg-primary border-none cursor-pointer">
              <AvatarFallback className="bg-primary text-on-primary font-bold text-sm">
                {mounted ? initial : "A"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
