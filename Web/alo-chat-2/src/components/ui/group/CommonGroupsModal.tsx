"use client";
import React, { useState, useEffect } from "react";
import { XMarkIcon, MagnifyingGlassIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { groupService } from "@/services/groupService";
import { getMediaUrl } from "@/utils/media";

interface CommonGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  otherUserId: string;
  friendName: string;
}

export default function CommonGroupsModal({
  isOpen,
  onClose,
  otherUserId,
  friendName,
}: CommonGroupsModalProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen && otherUserId) {
      fetchCommonGroups();
    }
  }, [isOpen, otherUserId]);

  const fetchCommonGroups = async () => {
    setLoading(true);
    try {
      const response = await groupService.getCommonGroups(otherUserId);
      setGroups(response?.data || response || []);
    } catch (error) {
      console.error("Error fetching common groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter((g) =>
    g.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[70vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-black text-gray-900">Nhóm chung</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Bạn và {friendName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-50 bg-white">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nhóm chung..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-black/10 transition"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Đang tải...</p>
            </div>
          ) : filteredGroups.length > 0 ? (
            <div className="flex flex-col gap-1">
              {filteredGroups.map((group) => (
                <div
                  key={group._id}
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition group cursor-pointer border border-transparent hover:border-gray-100"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm transition-transform group-hover:scale-105">
                    {group.groupAvatar ? (
                      <img
                        src={getMediaUrl(group.groupAvatar)}
                        className="w-full h-full object-cover"
                        alt={group.name}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <span className="text-white font-black text-lg">
                          {group.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-black text-gray-900 truncate group-hover:text-black transition-colors">
                      {group.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <UserGroupIcon className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                        {group.members?.length || 0} thành viên
                      </span>
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="px-3 py-1 bg-black text-white text-[10px] font-black uppercase rounded-lg tracking-widest">
                      Xem
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <UserGroupIcon className="w-8 h-8 text-gray-200" />
              </div>
              <p className="text-[14px] font-black text-gray-400 italic">Không có nhóm chung</p>
              <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mt-1">Bạn và người này chưa tham gia nhóm nào cùng nhau</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white text-[12px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition shadow-lg shadow-black/10 active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
