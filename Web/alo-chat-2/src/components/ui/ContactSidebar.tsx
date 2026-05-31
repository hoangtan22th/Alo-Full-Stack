"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IdentificationIcon,
  UserGroupIcon,
  UserPlusIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { useNotificationStore } from "../../store/useNotificationStore";

export default function ContactSidebar() {
  const pathname = usePathname();
  const { friendRequestCount, groupInviteCount } = useNotificationStore();
  const navItemClass = (isActive: boolean) =>
    `p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all text-[14px] ${
      isActive
        ? "bg-gray-100 text-gray-900 font-bold"
        : "hover:bg-gray-50 text-gray-600 font-medium"
    }`;

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col shrink-0 transition-all">
      <div className="p-5 pb-3">
        <h2 className="text-lg font-black tracking-tight text-gray-900">
          {pathname?.includes("groups") || pathname?.includes("group-invites")
            ? "Quản lý nhóm"
            : "Danh bạ"}
        </h2>
      </div>

      <div className="flex-1 px-3 space-y-1 mt-2">
        {!(
          pathname?.includes("groups") || pathname?.includes("group-invites")
        ) ? (
          <>
            <Link
              href="/contacts/friends"
              className={navItemClass(
                pathname === "/contacts/friends" || pathname === "/contacts",
              )}
            >
              <IdentificationIcon className="w-5 h-5" />
              Danh sách bạn bè
            </Link>

            <Link
              href="/contacts/requests"
              className={`${navItemClass(pathname === "/contacts/requests")} justify-between`}
            >
              <div className="flex items-center gap-3">
                <UserPlusIcon className="w-5 h-5" />
                Lời mời kết bạn
              </div>
              {friendRequestCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {friendRequestCount > 99 ? "99+" : friendRequestCount}
                </span>
              )}
            </Link>
            <Link
              href="/contacts/sent-requests"
              className={navItemClass(pathname === "/contacts/sent-requests")}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
              Yêu cầu đã gửi
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/contacts/groups"
              className={navItemClass(pathname === "/contacts/groups")}
            >
              <UserGroupIcon className="w-5 h-5" />
              Danh sách nhóm
            </Link>
            <Link
              href="/contacts/group-invites"
              className={`${navItemClass(pathname === "/contacts/group-invites")} justify-between`}
            >
              <div className="flex items-center gap-3">
                <EnvelopeIcon className="w-5 h-5" />
                Lời mời vào nhóm
              </div>
              {groupInviteCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {groupInviteCount > 99 ? "99+" : groupInviteCount}
                </span>
              )}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
