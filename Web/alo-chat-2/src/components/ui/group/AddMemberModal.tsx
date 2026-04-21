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
import { contactService } from "@/services/contactService";
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
  
  // Phone search state
  const [phoneSearch, setPhoneSearch] = useState("");
  const [searchedUser, setSearchedUser] = useState<any>(null);
  const [searchingPhone, setSearchingPhone] = useState(false);

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

  const toggleSelect = (id: string, userObj?: any) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
    // If we're selecting the searched user, add them to the friends list temporarily so we can display them in selected preview
    if (userObj && !friends.find(f => f.displayId === id)) {
      setFriends(prev => [...prev, {
        displayId: userObj.userId,
        displayName: userObj.fullName,
        displayAvatar: userObj.avatarUrl,
        isStranger: userObj.relationStatus === "NOT_FRIEND" || userObj.relationStatus === "STRANGER"
      }]);
    }
  };

  const handlePhoneSearch = async () => {
    if (!phoneSearch.trim()) return;
    setSearchingPhone(true);
    setSearchedUser(null);
    try {
      const user = await contactService.searchUserByPhone(phoneSearch);
      if (user) {
        // Check if already in group
        const isMember = currentMembers.some(m => String(m.userId) === String(user.userId));
        if (isMember) {
          toast.info("Người dùng này đã là thành viên của nhóm");
        } else {
          setSearchedUser(user);
        }
      } else {
        toast.error("Không tìm thấy người dùng với số điện thoại này");
      }
    } catch (error) {
      toast.error("Lỗi khi tìm kiếm");
    } finally {
      setSearchingPhone(false);
    }
  };

  const handleAdd = async () => {
    if (selectedUserIds.length === 0) return toast.error("Vui lòng chọn thành viên để thêm!");

    try {
      setLoading(true);
      
      const results = await Promise.all(
        selectedUserIds.map(async userId => {
          const user = friends.find(f => f.displayId === userId);
          if (user?.isStranger) {
            return groupService.inviteToGroup(groupId, userId);
          } else {
            return groupService.addMember(groupId, userId);
          }
        })
      );
      
      const inviteCount = friends.filter(f => selectedUserIds.includes(f.displayId) && f.isStranger).length;
      const addCount = selectedUserIds.length - inviteCount;

      let msg = "";
      if (addCount > 0) msg += `Đã thêm ${addCount} thành viên. `;
      if (inviteCount > 0) msg += `Đã gửi lời mời tới ${inviteCount} người.`;
      
      toast.success(msg || "Thao tác thành công!");
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
        <div className="px-6 py-4 border-b border-gray-50 flex flex-col gap-3">
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

          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="Tìm theo SĐT để mời..."
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
              className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-black/10 transition"
            />
            <button 
              onClick={handlePhoneSearch}
              disabled={searchingPhone}
              className="px-4 py-2 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition disabled:bg-gray-200"
            >
              {searchingPhone ? "..." : "Tìm"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {/* Searched User Result */}
          {searchedUser && (
            <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-200 animate-in slide-in-from-top-2">
              <p className="text-[10px] font-black text-black uppercase tracking-widest mb-3">Kết quả tìm kiếm</p>
              <div
                onClick={() => toggleSelect(searchedUser.userId, searchedUser)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                  selectedUserIds.includes(searchedUser.userId) 
                    ? "bg-black text-white shadow-lg" 
                    : "bg-white hover:bg-gray-100 text-gray-700 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={searchedUser.avatarUrl || "/avt-mac-dinh.jpg"}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {selectedUserIds.includes(searchedUser.userId) && (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
                        <CheckCircleIcon className="w-4 h-4 text-black" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{searchedUser.fullName}</p>
                    <p className="text-[10px] opacity-70">{searchedUser.phone}</p>
                  </div>
                </div>
                {searchedUser.relationStatus === "NOT_FRIEND" && (
                  <span className="text-[10px] font-black uppercase bg-yellow-400 text-black px-2 py-0.5 rounded-md">Người lạ</span>
                )}
              </div>
            </div>
          )}
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
                  key={f.displayId}
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
