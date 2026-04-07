// src/pages/contacts/GroupListPage.tsx
import { useState } from "react";
import {
  Bars3BottomRightIcon,
  AdjustmentsHorizontalIcon,
  BellSlashIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  DocumentIcon,
  DocumentTextIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";

// Dữ liệu mock bám sát bản Figma
const mockGroups = [
  {
    id: "g1",
    name: "Thiết kế Sản phẩm",
    memberCount: 24,
    avatar:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop",
    lastActive: "Hoạt động 2 giờ trước",
  },
  {
    id: "g2",
    name: "Team DevOps",
    memberCount: 12,
    avatar:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=200&auto=format&fit=crop",
    lastActive: "Hoạt động 5 phút trước",
    isStarred: true,
  },
  {
    id: "g3",
    name: "Cộng đồng UI/UX",
    memberCount: 1204,
    avatar:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop",
    lastActive: "Hoạt động 1 ngày trước",
  },
  {
    id: "g4",
    name: "Data Analytics",
    memberCount: 8,
    avatar:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=200&auto=format&fit=crop",
    lastActive: "Hoạt động vừa xong",
  },
  {
    id: "g5",
    name: "Góc Trà Chiều",
    memberCount: 56,
    avatar:
      "https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=200&auto=format&fit=crop",
    lastActive: "Hoạt động 3 ngày trước",
  },
  {
    id: "g6",
    name: "R&D Innovation",
    memberCount: 15,
    avatar:
      "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=200&auto=format&fit=crop",
    lastActive: "Hoạt động 1 tuần trước",
  },
];

const mockFiles = [
  {
    id: 1,
    name: "deployment_flow.pdf",
    size: "2.4 MB",
    time: "2 giờ trước",
    type: "pdf",
  },
  {
    id: 2,
    name: "api_docs_v2.docx",
    size: "1.1 MB",
    time: "Hôm qua",
    type: "doc",
  },
  {
    id: 3,
    name: "infrastructure_costs.xlsx",
    size: "850 KB",
    time: "3 ngày trước",
    type: "xls",
  },
];

export default function GroupListPage() {
  // Mặc định chọn Team DevOps như trong hình
  const [selectedGroupId, setSelectedGroupId] = useState<string>("g2");

  const selectedGroup =
    mockGroups.find((g) => g.id === selectedGroupId) || mockGroups[0];

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      {/* VÙNG DANH SÁCH NHÓM (TRÁI) */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 border-r border-gray-100 scrollbar-hide">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-black mb-1">
                Danh sách nhóm
              </h1>
              <p className="text-sm font-medium text-gray-500">
                Quản lý các không gian làm việc của bạn
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-600" />
              </button>
              <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <Bars3BottomRightIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Grid Nhóm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {mockGroups.map((group) => {
              const isSelected = group.id === selectedGroupId;
              return (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`relative p-6 rounded-[32px] flex flex-col items-center text-center cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? "bg-white border-2 border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] scale-[1.02]"
                      : "bg-transparent hover:bg-gray-50 border-2 border-transparent"
                  }`}
                >
                  {/* Dấu sao cho nhóm nổi bật */}
                  {group.isStarred && isSelected && (
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100">
                      <StarIcon className="w-3.5 h-3.5 text-black" />
                    </div>
                  )}

                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-full overflow-hidden mb-4 shadow-sm">
                    <img
                      src={group.avatar}
                      alt={group.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <h3 className="font-bold text-[17px] text-gray-900 mb-1 tracking-tight">
                    {group.name}
                  </h3>
                  <p className="text-[13px] text-gray-500 font-medium mb-5">
                    {group.memberCount} thành viên
                  </p>

                  <button
                    className={`w-3/4 py-2.5 rounded-full font-bold text-[13px] transition-all ${
                      isSelected
                        ? "bg-black text-white"
                        : "bg-gray-200/60 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {isSelected ? "Đang xem" : "Xem nhóm"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* VÙNG THÔNG TIN CHI TIẾT (PHẢI) */}
      <div className="hidden lg:flex w-[340px] flex-col shrink-0 bg-[#F8F9FA] shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-10">
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide pb-10">
          {/* Header Info */}
          <div className="flex flex-col items-center mt-6 mb-8 text-center">
            <div className="w-24 h-24 rounded-3xl overflow-hidden mb-4 shadow-md bg-white p-1">
              <img
                src={selectedGroup.avatar}
                alt="avatar"
                className="w-full h-full object-cover rounded-[20px]"
              />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              {selectedGroup.name}
            </h2>
            <p className="text-xs font-medium text-gray-500 mt-1">
              {selectedGroup.lastActive}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-3 mb-10">
            <button className="flex flex-col items-center justify-center w-16 h-16 rounded-[20px] bg-gray-200/50 hover:bg-gray-200 transition">
              <BellSlashIcon className="w-5 h-5 text-gray-700 mb-1" />
              <span className="text-[10px] font-bold text-gray-700">Mute</span>
            </button>
            <button className="flex flex-col items-center justify-center w-16 h-16 rounded-[20px] bg-gray-200/50 hover:bg-gray-200 transition">
              <MapPinIcon className="w-5 h-5 text-gray-700 mb-1" />
              <span className="text-[10px] font-bold text-gray-700">Pin</span>
            </button>
            <button className="flex flex-col items-center justify-center w-16 h-16 rounded-[20px] bg-gray-200/50 hover:bg-gray-200 transition">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-700 mb-1" />
              <span className="text-[10px] font-bold text-gray-700">
                Search
              </span>
            </button>
          </div>

          {/* Members Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-gray-900">
                Thành viên ({selectedGroup.memberCount})
              </h3>
              <button className="text-[12px] font-medium text-gray-500 hover:text-black transition">
                Xem tất cả
              </button>
            </div>

            {/* Avatar Stack */}
            <div className="flex items-center mb-5 px-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full border-2 border-[#F8F9FA] bg-gray-300 overflow-hidden ${i > 1 ? "-ml-3" : ""}`}
                >
                  <img
                    src={`https://i.pravatar.cc/100?img=${i + 10}`}
                    alt="member"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-[#F8F9FA] bg-gray-800 text-white flex items-center justify-center text-[10px] font-bold -ml-3 z-10">
                +8
              </div>
            </div>

            {/* Online Members */}
            <div className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[13px] font-bold text-gray-900">
                  Nguyễn An (Trưởng nhóm)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[13px] font-medium text-gray-700">
                  Lê Minh
                </span>
              </div>
            </div>
          </div>

          {/* Shared Files Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 cursor-pointer group">
              <h3 className="text-[14px] font-bold text-gray-900">
                Tài liệu đã chia sẻ
              </h3>
              <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-black transition" />
            </div>

            <div className="space-y-3">
              {mockFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition cursor-pointer"
                >
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-opacity-10 shrink-0 ${
                      file.type === "pdf"
                        ? "bg-red-500 text-red-500"
                        : file.type === "doc"
                          ? "bg-blue-500 text-blue-500"
                          : "bg-green-500 text-green-500"
                    }`}
                  >
                    {file.type === "pdf" && (
                      <DocumentIcon className="w-5 h-5" />
                    )}
                    {file.type === "doc" && (
                      <DocumentTextIcon className="w-5 h-5" />
                    )}
                    {file.type === "xls" && (
                      <TableCellsIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-bold text-gray-900 truncate mb-0.5">
                      {file.name}
                    </h4>
                    <p className="text-[11px] font-medium text-gray-400">
                      {file.size} • {file.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leave Group Button */}
          <button className="w-full mt-4 bg-transparent border-2 border-red-50 hover:bg-red-50 text-red-600 py-4 rounded-3xl font-bold text-[14px] transition flex justify-center items-center gap-2">
            <ArrowRightOnRectangleIcon className="w-5 h-5" /> Rời khỏi nhóm
          </button>
        </div>
      </div>
    </div>
  );
}
