"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Squares2X2Icon,
  UsersIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  MegaphoneIcon,
  CommandLineIcon,
  Cog8ToothIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";

export function Sidebar() {
  const pathname = usePathname();

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
        </div>
      </div>
    </aside>
  );
}
