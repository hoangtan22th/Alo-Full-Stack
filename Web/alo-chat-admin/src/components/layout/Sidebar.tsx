"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authService } from "@/services/authService";
import {
  Squares2X2Icon,
  UsersIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  MegaphoneIcon,
  CommandLineIcon,
  Cog8ToothIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

export function Sidebar() {
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    // Check if user is SUPER_ADMIN
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return null;
    };

    const token = getCookie("admin_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        // Often roles are stored in the "roles" array or "role" string in JWT payload
        // Let's assume authorities or roles claim is an array
        const roles = payload.roles || payload.authorities || [];
        if (
          roles.includes("ROLE_SUPER_ADMIN") ||
          roles === "ROLE_SUPER_ADMIN"
        ) {
          setIsSuperAdmin(true);
        }
      } catch (e) {
        console.error("Failed to decode token", e);
      }
    }
  }, []);

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `flex items-center gap-3 py-2 px-4 rounded-lg transition-all duration-200 ${
      isActive
        ? "text-on-surface font-bold bg-white/50"
        : "text-on-surface-variant hover:bg-white/30"
    }`;
  };

  return (
    <aside className="hidden md:flex h-screen w-72 flex-col fixed left-0 top-0 bg-surface-container-low border-r border-[#ebeef0] z-50">
      <div className="flex flex-col h-full py-8 px-6 space-y-2">
        <div className="mb-8">
          <h1 className="text-xl font-extrabold tracking-tighter text-on-surface">
            Alo-Chat
          </h1>
          <p className="text-sm font-medium text-on-surface-variant">
            Management Suite
          </p>
        </div>

        <nav className="flex-1 space-y-1">
          <Link href="/" className={getLinkClass("/")}>
            <Squares2X2Icon className="w-5 h-5" />
            <span>Overview</span>
          </Link>
          <Link href="/users" className={getLinkClass("/users")}>
            <UsersIcon className="w-5 h-5" />
            <span>User Management</span>
          </Link>
          <Link href="/groups" className={getLinkClass("/groups")}>
            <UserGroupIcon className="w-5 h-5" />
            <span>Group Management</span>
          </Link>
          {isSuperAdmin && (
            <Link href="/admins" className={getLinkClass("/admins")}>
              <ShieldCheckIcon className="w-5 h-5" />
              <span>Admin Management</span>
            </Link>
          )}
          <Link href="/reports" className={getLinkClass("/reports")}>
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span>Reports & Moderation</span>
          </Link>
          <Link href="/broadcast" className={getLinkClass("/broadcast")}>
            <MegaphoneIcon className="w-5 h-5" />
            <span>Global Broadcast</span>
          </Link>
          <Link href="/logs" className={getLinkClass("/logs")}>
            <CommandLineIcon className="w-5 h-5" />
            <span>System Logs</span>
          </Link>
        </nav>

        <div className="mt-auto space-y-1 pt-4 border-t border-[#ebeef0]">
          <Link href="/settings" className={getLinkClass("/settings")}>
            <Cog8ToothIcon className="w-5 h-5" />
            <span>Settings</span>
          </Link>
          <Link href="/support" className={getLinkClass("/support")}>
            <QuestionMarkCircleIcon className="w-5 h-5" />
            <span>Support</span>
          </Link>

          <button
            onClick={() => authService.logout()}
            className="w-full mt-4 flex items-center gap-3 py-2 px-4 rounded-lg transition-all duration-200 text-red-500 font-semibold hover:bg-red-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
