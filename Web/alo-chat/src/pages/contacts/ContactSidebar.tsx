import { useState } from "react";
import axios from "axios";
import { NavLink } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  IdentificationIcon,
  UserGroupIcon,
  UserPlusIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

export default function ContactSidebar() {
  const [searchPhone, setSearchPhone] = useState("");
  const token = localStorage.getItem("accessToken");

  const handleSearch = async (e: any) => {
    if (e.key === "Enter" && searchPhone) {
      try {
        const res = await axios.get(
          `http://localhost:8888/api/v1/contacts/search?phone=${searchPhone}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const userFound = res.data.data;
        if (userFound) {
          alert(
            `Tìm thấy: ${userFound.fullName}. Giờ ông code thêm cái modal hiện ra để bấm kết bạn nhé!`,
          );
        } else {
          alert("Không tìm thấy số này Tấn ơi!");
        }
      } catch (err) {
        alert("Lỗi tìm kiếm rồi!");
      }
    }
  };

  // Tách class dùng chung ra một hàm riêng cho code sạch, NavLink tự truyền tham số isActive vào
  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `p-3 rounded-2xl cursor-pointer flex items-center gap-3 transition-colors text-[15px] ${
      isActive
        ? "bg-gray-100 text-black font-semibold"
        : "hover:bg-gray-50 text-gray-600 font-medium"
    }`;

  return (
    <div className="w-80 h-screen bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="p-6 pb-4">
        <h2 className="text-[22px] font-bold mb-5">Danh bạ</h2>
        <div className="bg-gray-100/80 rounded-full px-4 py-2.5 flex items-center gap-2">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm số điện thoại + Enter..."
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            onKeyDown={handleSearch}
            className="bg-transparent w-full outline-none text-[15px] placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 px-4 space-y-1">
        {/* Nút 1: Danh sách bạn bè */}
        <NavLink to="/contacts/friends" className={navItemClass}>
          <IdentificationIcon className="w-6 h-6" />
          Danh sách bạn bè
        </NavLink>

        {/* Nút 2: Danh sách nhóm (Để tạm url groups để sau này ông code) */}
        <NavLink to="/contacts/groups" className={navItemClass}>
          <UserGroupIcon className="w-6 h-6" />
          Danh sách nhóm
        </NavLink>

        {/* Nút 3: Lời mời kết bạn */}
        <NavLink to="/contacts/requests" className={navItemClass}>
          <UserPlusIcon className="w-6 h-6" />
          Lời mời kết bạn
        </NavLink>

        {/* Nút 4: Lời mời vào nhóm (Để tạm url group-invites) */}
        <NavLink to="/contacts/group-invites" className={navItemClass}>
          <EnvelopeIcon className="w-6 h-6" />
          Lời mời vào nhóm
        </NavLink>
      </div>
    </div>
  );
}
