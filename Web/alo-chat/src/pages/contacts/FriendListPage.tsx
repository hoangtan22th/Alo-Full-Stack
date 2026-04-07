import { useEffect, useState, useMemo } from "react";
import axiosClient from "../../config/axiosClient";
import AddFriendModal from "../../components/ui/AddFriendModal";
import {
  UserPlusIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import FriendProfileModal from "@/components/ui/FriendProfileModal";

export default function FriendListPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleOpenProfile = (friend: any) => {
    // SỬA LỖI 3: Chờ ông thêm targetId ở Backend thì nó sẽ lấy chuẩn.
    // Tạm thời fallback để code không gãy.
    const idToOpen = friend.targetId || friend.recipientId;
    setSelectedUserId(idToOpen);
    setProfileModalOpen(true);
  };

  const fetchFriends = async () => {
    try {
      const res: any = await axiosClient.get("/contacts/friends");
      // SỬA LỖI 2: Rút trích data an toàn xuyên qua các lớp ApiResponse
      const friendData = res?.data?.data || res?.data || res || [];
      setFriends(Array.isArray(friendData) ? friendData : []);
    } catch (err) {
      console.error("Lỗi lấy danh sách bạn bè:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const groupedFriends = useMemo(() => {
    const filtered = friends.filter((f) => {
      const name = f.requesterName || "Người dùng Alo";
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const sorted = filtered.sort((a, b) => {
      const nameA = (a.requesterName || "").toLowerCase();
      const nameB = (b.requesterName || "").toLowerCase();
      return sortOrder === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

    const grouped = sorted.reduce((acc: any, friend: any) => {
      const name = friend.requesterName || "Unknown";
      const firstLetter = name.charAt(0).toUpperCase();
      const groupKey = /[A-Z]/.test(firstLetter) ? firstLetter : "#";

      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(friend);
      return acc;
    }, {});

    return grouped;
  }, [friends, searchQuery, sortOrder]);

  if (loading)
    return (
      <div className="p-8 text-center font-bold">
        Đang tải danh sách bạn bè...
      </div>
    );

  const groupKeys = Object.keys(groupedFriends).sort((a, b) => {
    if (sortOrder === "asc") return a.localeCompare(b);
    return b.localeCompare(a);
  });

  return (
    <div className="flex-1 h-screen bg-[#fafafa] p-4 md:p-8 overflow-y-auto text-black font-sans">
      {/* HEADER (Giữ nguyên) */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black rounded-xl text-white">
            <UserPlusIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Danh sách bạn bè
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddFriend(true)}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-800 transition active:scale-95 shadow-lg"
          >
            <span className="text-xl">+</span>
            Thêm bạn
          </button>

          {showAddFriend && (
            <AddFriendModal onClose={() => setShowAddFriend(false)} />
          )}

          <button className="p-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition shadow-sm">
            <InformationCircleIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>
      </div>

      <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px] mb-6">
        BẠN BÈ HIỆN TẠI ({friends.length})
      </p>

      {/* SEARCH & SORT (Giữ nguyên) */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
        <div className="flex-1 w-full flex items-center gap-3 bg-white border border-gray-100 px-5 py-3.5 rounded-[20px] shadow-sm focus-within:ring-2 focus-within:ring-black transition-all">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm trong danh sách..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent w-full outline-none text-[15px] font-medium"
          />
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={toggleSortOrder}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-100 px-5 py-3.5 rounded-[20px] text-[14px] font-bold shadow-sm hover:bg-gray-50 transition"
          >
            Tên ({sortOrder === "asc" ? "A-Z" : "Z-A"})
            <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />
          </button>

          <button className="bg-white border border-gray-100 p-3.5 rounded-[20px] shadow-sm hover:bg-gray-50 transition">
            <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* LIST BẠN BÈ */}
      <div className="space-y-10">
        {groupKeys.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-medium italic">
              Không tìm thấy ai trong danh sách này, Tấn ơi!
            </p>
          </div>
        ) : (
          groupKeys.map((letter) => (
            <div key={letter}>
              <h2 className="text-[13px] font-black text-gray-300 mb-6 px-2 tracking-tighter">
                {letter} ————————
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedFriends[letter].map((friend: any) => (
                  <div
                    key={friend.id}
                    onClick={() => handleOpenProfile(friend)} // SỬA LỖI 1: Bọc onClick ở thẻ ngoài cùng này
                    className="flex items-center gap-4 p-4 bg-white rounded-[24px] border border-transparent hover:border-gray-100 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-50 shrink-0 shadow-inner">
                      <img
                        src={
                          friend.requesterAvatar ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${friend.requesterName}`
                        }
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-[16px] text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {friend.requesterName || "Người dùng ẩn danh"}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <p className="text-[12px] text-gray-400 font-bold uppercase tracking-tight">
                          Trực tuyến
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <FriendProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        userId={selectedUserId}
        relationStatus="ACCEPTED"
      />
    </div>
  
  );
}
