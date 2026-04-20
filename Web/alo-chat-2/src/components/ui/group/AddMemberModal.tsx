"use client";
import { useAuthStore } from "@/store/useAuthStore";
import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import axiosClient from "@/services/api";
import { groupService } from "@/services/groupService";
import { toast } from "sonner";

interface AddMemberModalProps {
  groupId: string;
  currentMembers: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddMemberModal({ 
  groupId, 
  currentMembers, 
  onClose, 
  onSuccess 
}: AddMemberModalProps) {
  const [friends, setFriends] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load danh sách bạn bè, lọc bỏ những người đã có trong nhóm
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const res: any = await axiosClient.get("/contacts/friends");
        // axiosClient unwrap data.data, nên res có thể là []
        const allFriendships = Array.isArray(res) ? res : res.data || [];
        const myId = useAuthStore.getState().userId || "";

        // Chuyển đổi từ FriendshipRelationship sang User-like object
        const normalizedFriends = allFriendships.map((f: any) => {
          const isRequesterMe = String(f.requesterId) === String(myId);
          return {
            displayId: isRequesterMe ? f.recipientId : f.requesterId,
            displayName: isRequesterMe ? (f.recipientName || "Người dùng") : (f.requesterName || "Người dùng"),
            displayAvatar: isRequesterMe ? f.recipientAvatar : f.requesterAvatar,
          };
        });
        
        // Lọc bỏ những người đã là thành viên
        const memberIds = currentMembers.map((m: any) => m.userId?.toString());
        const filteredFriends = normalizedFriends.filter((f: any) => 
          !memberIds.includes(f.displayId?.toString())
        );
        
        setFriends(filteredFriends);
      } catch (err) {
        console.error("Lỗi tải bạn bè:", err);
        toast.error("Không thể tải danh sách bạn bè");
      }
    };
    loadFriends();
  }, [currentMembers]);

  const toggleSelect = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleAdd = async () => {
    if (selectedUserIds.length === 0) return toast.error("Vui lòng chọn thành viên để thêm!");

    try {
      setLoading(true);
      // Backend hiện tại chỉ hỗ trợ thêm từng người một, thực hiện vòng lặp
      await Promise.all(
        selectedUserIds.map(userId => groupService.addMember(groupId, userId))
      );
      
      toast.success(`Đã thêm ${selectedUserIds.length} thành viên vào nhóm!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi khi thêm thành viên!");
    } finally {
      setLoading(false);
    }
  };

  const filteredFriendsList = friends.filter(f => 
    f.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-black text-gray-900">Thêm thành viên</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Mời bạn bè vào nhóm</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-50">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Tìm bạn bè theo tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-black/5 transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {/* Selected Preview (Horizontal Scroll if many) */}
          {selectedUserIds.length > 0 && (
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {selectedUserIds.map(id => {
                const friend = friends.find(f => f.displayId === id);
                return (
                  <div key={id} className="relative shrink-0">
                    <img 
                      src={friend?.displayAvatar || "/avt-mac-dinh.jpg"} 
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-black"
                    />
                    <button 
                      onClick={() => toggleSelect(id)}
                      className="absolute -top-1 -right-1 bg-black text-white rounded-full p-0.5 shadow-md"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Friends List */}
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-3">
              Danh sách bạn bè ({filteredFriendsList.length})
            </p>
            {filteredFriendsList.length > 0 ? (
              filteredFriendsList.map((f) => (
                <div
                  key={f.id}
                  onClick={() => toggleSelect(f.displayId)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition ${
                    selectedUserIds.includes(f.displayId) 
                      ? "bg-black text-white shadow-lg scale-[1.02]" 
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={f.displayAvatar || "/avt-mac-dinh.jpg"}
                        className="w-10 h-10 rounded-full object-cover shadow-sm"
                        alt={f.displayName}
                      />
                      {selectedUserIds.includes(f.displayId) && (
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
                          <CheckCircleIcon className="w-4 h-4 text-black" />
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-sm">{f.displayName}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-gray-400 italic">Không tìm thấy bạn bè phù hợp</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-6 border-t border-gray-100 bg-gray-50/50">
          <button
            disabled={loading || selectedUserIds.length === 0}
            onClick={handleAdd}
            className="w-full bg-black text-white py-4 rounded-2xl font-black shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:bg-gray-300 disabled:shadow-none disabled:translate-y-0"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>ĐANG THỰC HIỆN...</span>
              </div>
            ) : (
              `THÊM ${selectedUserIds.length > 0 ? selectedUserIds.length : ""} THÀNH VIÊN`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
