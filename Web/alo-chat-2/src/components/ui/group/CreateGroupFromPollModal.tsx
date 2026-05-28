"use client";
import React, { useEffect, useState } from "react";
import { XMarkIcon, CheckIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import api from "@/services/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CreateGroupFromPollModalProps {
  voterIds: string[];
  optionText: string;
  pollQuestion: string;
  onClose: () => void;
}

export default function CreateGroupFromPollModal({
  voterIds,
  optionText,
  pollQuestion,
  onClose,
}: CreateGroupFromPollModalProps) {
  const router = useRouter();
  const [groupName, setGroupName] = useState(`Nhóm - ${optionText}`);
  const [selectedIds, setSelectedIds] = useState<string[]>(voterIds);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      const results: Record<string, any> = {};
      await Promise.all(
        voterIds.map(async (id) => {
          try {
            const res: any = await api.get(`/users/${id}`);
            results[id] = res?.data || res;
          } catch {
            results[id] = { fullName: "Người dùng" };
          }
        })
      );
      setProfiles(results);
      setLoading(false);
    };
    fetchProfiles();
  }, [voterIds]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (selectedIds.length < 2) {
      toast.error("Cần ít nhất 2 người để tạo nhóm");
      return;
    }
    setCreating(true);
    try {
      const result = await api.post<any, any>(`/groups`, {
        name: groupName.trim() || `Nhóm - ${optionText}`,
        userIds: selectedIds,
        fromPoll: true,
      });
      const newGroupId = result?.data?._id || result?._id;
      toast.success("Đã tạo nhóm thành công!");
      onClose();
      if (newGroupId) {
        router.push(`/chat/${newGroupId}`);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Không thể tạo nhóm");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-lg font-black text-gray-900">Tạo nhóm từ bình chọn</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              {optionText}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Group name input */}
          <div className="mb-5">
            <label className="text-sm font-bold text-gray-700 mb-2 block">Tên nhóm</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nhập tên nhóm..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            />
          </div>

          {/* Member list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-700">
                Thành viên ({selectedIds.length}/{voterIds.length})
              </label>
              <button
                onClick={() => setSelectedIds(selectedIds.length === voterIds.length ? [] : [...voterIds])}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                {selectedIds.length === voterIds.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {voterIds.map((id) => {
                  const profile = profiles[id];
                  const isSelected = selectedIds.includes(id);
                  return (
                    <div
                      key={id}
                      onClick={() => toggleMember(id)}
                      className={`flex items-center p-3 rounded-xl cursor-pointer transition-all border-2 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/50"
                          : "border-transparent bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-3 transition-colors ${
                        isSelected ? "bg-blue-500 text-white" : "border-2 border-gray-300"
                      }`}>
                        {isSelected && <CheckIcon className="w-3.5 h-3.5" />}
                      </div>
                      
                      {/* Avatar */}
                      {profile?.avatar ? (
                        <img src={profile.avatar} alt="" className="w-10 h-10 rounded-full object-cover mr-3" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">
                            {(profile?.fullName || "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      
                      <span className={`text-sm font-medium ${isSelected ? "text-gray-900 font-semibold" : "text-gray-600"}`}>
                        {profile?.fullName || profile?.username || "Người dùng"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <button
            onClick={handleCreate}
            disabled={creating || selectedIds.length < 2}
            className={`w-full py-3.5 rounded-xl font-bold text-[15px] shadow-sm transition-all flex items-center justify-center gap-2 ${
              selectedIds.length >= 2
                ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {creating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <UserGroupIcon className="w-5 h-5" />
                Tạo nhóm ({selectedIds.length} thành viên)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
