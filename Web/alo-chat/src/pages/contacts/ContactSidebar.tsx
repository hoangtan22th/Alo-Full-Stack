import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  IdentificationIcon,
  UserGroupIcon,
  UserPlusIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

export default function ContactSidebar() {
  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all text-[14px] ${
      isActive
        ? "bg-black text-white font-bold shadow-md"
        : "hover:bg-gray-100 text-gray-600 font-medium"
    }`;

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col shrink-0 transition-all">
      <div className="p-5 pb-3">
        <h2 className="text-lg font-black tracking-tight text-gray-900">
          Danh bạ
        </h2>
      </div>

      <div className="flex-1 px-3 space-y-1 mt-2">
        <NavLink to="/contacts/friends" className={navItemClass}>
          <IdentificationIcon className="w-5 h-5" />
          Danh sách bạn bè
        </NavLink>

        <NavLink to="/contacts/groups" className={navItemClass}>
          <UserGroupIcon className="w-5 h-5" />
          Danh sách nhóm
        </NavLink>

        <NavLink to="/contacts/requests" className={navItemClass}>
          <UserPlusIcon className="w-5 h-5" />
          Lời mời kết bạn
        </NavLink>

        <NavLink to="/contacts/group-invites" className={navItemClass}>
          <EnvelopeIcon className="w-5 h-5" />
          Lời mời vào nhóm
        </NavLink>
      </div>
    </div>
  );
}
