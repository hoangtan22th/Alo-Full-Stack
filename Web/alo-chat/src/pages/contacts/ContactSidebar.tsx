import { useState } from "react";
import axios from "axios";
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
          `http://localhost:8888/api-gateway/contact-service/api/contacts/search?phone=${searchPhone}`,
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
        <div className="p-3 hover:bg-gray-50 text-gray-600 rounded-2xl cursor-pointer font-medium text-[15px] flex items-center gap-3 transition-colors">
          <IdentificationIcon className="w-6 h-6" />
          Danh sách bạn bè
        </div>
        <div className="p-3 hover:bg-gray-50 text-gray-600 rounded-2xl cursor-pointer font-medium text-[15px] flex items-center gap-3 transition-colors">
          <UserGroupIcon className="w-6 h-6" />
          Danh sách nhóm
        </div>
        <div className="p-3 bg-gray-50 text-black rounded-2xl cursor-pointer font-semibold text-[15px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserPlusIcon className="w-6 h-6" />
            Lời mời kết bạn
          </div>
        </div>
        <div className="p-3 hover:bg-gray-50 text-gray-600 rounded-2xl cursor-pointer font-medium text-[15px] flex items-center gap-3 transition-colors">
          <EnvelopeIcon className="w-6 h-6" />
          Lời mời vào nhóm
        </div>
      </div>
    </div>
  );
}
