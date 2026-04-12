import { useEffect, useState, useMemo } from "react";
import axiosClient from "../../config/axiosClient";
import AddFriendModal from "../../components/ui/AddFriendModal";
import {
  UserPlusIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import FriendProfileModal from "@/components/ui/FriendProfileModal";
import { toast } from "sonner";
import { socket } from "../../config/socketService";

export default function FriendListPage() {
  console.log(
    "📍 [BƯỚC 4 - FriendListPage] Đã vào trang. Chuẩn bị chạy logic...",
  );
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // State quản lý danh sách user đang online
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const fetchFriends = async () => {
    try {
      console.log(
        "⏳ [BƯỚC 5 - FriendListPage] Bắt đầu gọi API lấy dữ liệu...",
      );
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
      console.log(
        "✅ [BƯỚC 6 - FriendListPage] Xử lý dữ liệu xong! Lưu vào State.",
      );
      setFriends(formattedFriends);
    } catch (err) {
      console.error("Lỗi lấy danh sách bạn bè:", err);
    } finally {
      console.log(
        "🛑 [BƯỚC 7 - FriendListPage] Tắt trạng thái Loading (Loading = false).",
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Load data
    fetchFriends();

    // 2. Lắng nghe sự kiện Socket
    if (socket) {
      // Có người chấp nhận lời mời -> tự động chèn vào danh sách bạn bè
      socket.on("FRIEND_ACCEPTED", (newFriendData) => {
        setFriends((prev) => [...prev, newFriendData]);
        toast.success(`${newFriendData.displayName} đã trở thành bạn bè!`);
      });

      // User vừa online
      socket.on("USER_ONLINE", ({ userId }) => {
        setOnlineUsers((prev) => [...new Set([...prev, userId])]);
      });

      // User vừa offline
      socket.on("USER_OFFLINE", ({ userId }) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== userId));
      });
    }

    // 3. Dọn dẹp
    return () => {
      if (socket) {
        socket.off("FRIEND_ACCEPTED");
        socket.off("USER_ONLINE");
        socket.off("USER_OFFLINE");
      }
    };
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
  }, [friends, searchQuery, sortOrder]);

  const groupKeys = Object.keys(groupedFriends).sort((a, b) =>
    sortOrder === "asc" ? a.localeCompare(b) : b.localeCompare(a),
  );

  if (loading)
    return (
      <div className="p-6 text-center text-sm font-bold">
        Đang tải dữ liệu...
      </div>
    );

  return (
    <div className="flex-1 h-screen p-5 lg:p-6 overflow-y-auto bg-[#fafafa] scrollbar-hide">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black rounded-xl text-white shadow-lg">
              <UserPlusIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black tracking-tight">
              Danh sách bạn bè
            </h1>
          </div>
          <button
            onClick={() => setShowAddFriend(true)}
            className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-neutral-800 transition shadow-md"
          >
            + Thêm bạn mới
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
          <div className="md:col-span-3 flex items-center gap-3 bg-white border border-gray-100 px-4 py-2.5 rounded-xl shadow-sm focus-within:ring-1 focus-within:ring-black">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent w-full outline-none text-[14px] font-medium"
            />
          </div>
          <button
            onClick={() =>
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
            }
            className="bg-white border border-gray-100 px-4 py-2.5 rounded-xl text-sm font-bold flex justify-between items-center shadow-sm"
          >
            {sortOrder.toUpperCase()}{" "}
            <ArrowsUpDownIcon className="w-3 h-3 text-gray-400" />
          </button>
        </div>

        <div className="space-y-10">
          {groupKeys.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[24px] border-2 border-dashed border-gray-100">
              <p className="text-gray-400 text-sm font-medium italic">
                Danh sách bạn bè hiện tại trống.
              </p>
            </div>
          ) : (
            groupKeys.map((letter) => (
              <div key={letter}>
                <h2 className="text-[11px] font-black text-gray-300 mb-4 px-1 tracking-widest uppercase">
                  {letter} ————————
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedFriends[letter].map((friend: any) => {
                    // Logic check online từ mảng onlineUsers của Socket
                    const isOnline = onlineUsers.includes(friend.displayId);

                    return (
                      <div
                        key={friend.id}
                        onClick={() => handleOpenProfile(friend)}
                        className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-transparent hover:border-black hover:shadow-lg transition-all cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100 bg-black shrink-0 relative">
                          <img
                            src={friend.displayAvatar || "/avt-mac-dinh.jpg"}
                            onError={(e) =>
                              (e.currentTarget.src = "/avt-mac-dinh.jpg")
                            }
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[14px] text-gray-900 truncate">
                            {friend.displayName}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-300"}`}
                            />
                            <p
                              className={`text-[10px] font-bold uppercase ${isOnline ? "text-gray-400" : "text-gray-300"}`}
                            >
                              {isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {showAddFriend && (
        <AddFriendModal onClose={() => setShowAddFriend(false)} />
      )}
      <FriendProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        userId={selectedUserId}
        relationStatus="ACCEPTED"
        onActionSuccess={fetchFriends}
      />
    </div>
  );
}
