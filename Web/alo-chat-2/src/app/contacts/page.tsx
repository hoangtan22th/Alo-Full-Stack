"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import axiosClient from "@/services/api";
import AddFriendModal from "@/components/ui/AddFriendModal";
import {
  UserPlusIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import FriendProfileModal from "@/components/ui/FriendProfileModal";
import { useChatStore } from "@/store/useChatStore";
import { presenceService } from "@/services/presenceService";
import { useShallow } from "zustand/react/shallow";

export default function FriendListPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { onlineUsers, setBulkPresence } = useChatStore(
    useShallow((s) => ({
      onlineUsers: s.onlineUsers,
      setBulkPresence: s.setBulkPresence,
    }))
  );

  const getOfflineText = (lastActive?: number) => {
    if (!lastActive) return "Ngoại tuyến";
    const diff = Math.floor((Date.now() - lastActive) / 60000);
    if (diff < 1) return "Vừa truy cập";
    if (diff < 60) return `${diff} phút trước`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  };

  const lastFetchTime = useRef(0);
  const isFetching = useRef(false);

  const fetchFriends = async () => {
    // Chống loop: Không fetch quá 1 lần mỗi 2 giây
    const now = Date.now();
    if (isFetching.current || now - lastFetchTime.current < 2000) return;
    
    isFetching.current = true;
    lastFetchTime.current = now;

    try {
      setLoading(true);
      const meRes: any = await axiosClient.get("/auth/me");
      const userData = meRes?.data || meRes;
      const myId = userData?.id || userData?._id;

      const res: any = await axiosClient.get("/contacts/friends");
      const rawData = Array.isArray(res) ? res : res?.data || [];

      const formattedFriends = rawData.map((f: any) => {
        const isMeRequester = f.requesterId === myId;
        return {
          ...f,
          displayId: isMeRequester ? f.recipientId : f.requesterId,
          displayName: isMeRequester ? f.recipientName : f.requesterName,
          displayAvatar: isMeRequester ? f.recipientAvatar : f.requesterAvatar,
        };
      });

      setFriends(formattedFriends);

      // Fetch presence for all friends
      const userIds = formattedFriends.map((f) => String(f.displayId));
      if (userIds.length > 0) {
        presenceService.getBulkPresence(userIds).then((res) => {
          if (res) setBulkPresence(res);
        });
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách bạn bè:", err);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  useEffect(() => {
    fetchFriends();
    const handleUpdate = () => fetchFriends();
    window.addEventListener("friend_list_updated", handleUpdate);
    return () => window.removeEventListener("friend_list_updated", handleUpdate);
  }, []);

  const handleOpenProfile = (friend: any) => {
    setSelectedUserId(friend.displayId);
    setProfileModalOpen(true);
  };

  const groupedFriends = useMemo(() => {
    const filtered = friends.filter((f) =>
      (f.displayName || "").toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const sorted = filtered.sort((a, b) => {
      const nameA = (a.displayName || "").toLowerCase();
      const nameB = (b.displayName || "").toLowerCase();
      return sortOrder === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

    return sorted.reduce((acc: any, friend: any) => {
      const firstLetter = (friend.displayName || "#").charAt(0).toUpperCase();
      const key = /[A-Z]/.test(firstLetter) ? firstLetter : "#";
      if (!acc[key]) acc[key] = [];
      acc[key].push(friend);
      return acc;
    }, {});
  }, [friends, searchQuery, sortOrder, onlineUsers]);

  const groupKeys = Object.keys(groupedFriends).sort((a, b) =>
    sortOrder === "asc" ? a.localeCompare(b) : b.localeCompare(a),
  );

  if (loading) return <div className="p-6 text-center text-xs font-bold">Đang tải...</div>;

  return (
    <div className="flex-1 h-screen p-5 lg:p-6 overflow-y-auto bg-[#fafafa] scrollbar-hide">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black rounded-xl text-white shadow-lg">
              <UserPlusIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black tracking-tight">Danh sách bạn bè</h1>
          </div>
          <button onClick={() => setShowAddFriend(true)} className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-neutral-800 transition shadow-md">+ Thêm bạn mới</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
          <div className="md:col-span-3 flex items-center gap-3 bg-white border border-gray-100 px-4 py-2.5 rounded-xl shadow-sm">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Tìm kiếm tên..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent w-full outline-none text-[14px] font-medium" />
          </div>
          <button onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")} className="bg-white border border-gray-100 px-4 py-2.5 rounded-xl text-sm font-bold flex justify-between items-center shadow-sm">
            {sortOrder.toUpperCase()} <ArrowsUpDownIcon className="w-3 h-3 text-gray-400" />
          </button>
        </div>

        <div className="space-y-10">
          {groupKeys.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[24px] border-2 border-dashed border-gray-100 italic text-gray-400 text-xs">Trống</div>
          ) : (
            groupKeys.map((letter) => (
              <div key={letter}>
                <h2 className="text-[11px] font-black text-gray-300 mb-4 px-1 tracking-widest uppercase">{letter} ————————</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedFriends[letter].map((friend: any) => (
                    <div key={friend.id} onClick={() => handleOpenProfile(friend)} className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-transparent hover:border-black hover:shadow-lg transition-all cursor-pointer">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100 bg-black shrink-0">
                        <img src={friend.displayAvatar || "/avt-mac-dinh.jpg"} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[14px] text-gray-900 truncate">{friend.displayName}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          {onlineUsers[String(friend.displayId)]?.status === "online" ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                              <p className="text-[10px] text-green-500 font-bold uppercase">Trực tuyến</p>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                              <p className="text-[10px] text-gray-400 font-bold uppercase">
                                {getOfflineText(onlineUsers[String(friend.displayId)]?.last_active)}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {showAddFriend && <AddFriendModal onClose={() => setShowAddFriend(false)} />}
      <FriendProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} userId={selectedUserId} relationStatus="ACCEPTED" onActionSuccess={fetchFriends} />
    </div>
  );
}
