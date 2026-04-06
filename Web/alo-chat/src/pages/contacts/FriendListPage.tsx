import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import AddFriendModal from "../../components/ui/AddFriendModal";
import {
  UserPlusIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

export default function FriendListPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // THÊM DÒNG NÀY ĐỂ FIX LỖI: State quản lý ẩn/hiện Modal Thêm Bạn
  const [showAddFriend, setShowAddFriend] = useState(false);

  // State cho Tìm kiếm và Sắp xếp
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const token = localStorage.getItem("accessToken");

  // Fetch API lấy danh sách bạn bè
  const fetchFriends = async () => {
    try {
      const res = await axios.get(
        "http://localhost:8888/api-gateway/contact-service/api/contacts/friends",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setFriends(res.data.data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách bạn bè:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  // Hàm Toggle Sắp xếp
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // Logic Lọc, Sắp xếp và Nhóm
  const groupedFriends = useMemo(() => {
    // 1. Lọc theo tên (Search)
    const filtered = friends.filter((f) => {
      const name = f.friendName || f.requesterId || f.recipientId || "Unknown";
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // 2. Sắp xếp (Sort A-Z hoặc Z-A)
    const sorted = filtered.sort((a, b) => {
      const nameA = (a.friendName || a.requesterId || "").toLowerCase();
      const nameB = (b.friendName || b.requesterId || "").toLowerCase();
      return sortOrder === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

    // 3. Nhóm theo chữ cái đầu tiên
    const grouped = sorted.reduce((acc: any, friend: any) => {
      const name = friend.friendName || friend.requesterId || "Unknown";
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

  if (loading) return <div className="p-8">Đang tải danh sách...</div>;

  const groupKeys = Object.keys(groupedFriends).sort((a, b) => {
    if (sortOrder === "asc") return a.localeCompare(b);
    return b.localeCompare(a);
  });

  return (
    <div className="flex-1 h-screen bg-white p-8 overflow-y-auto text-gray-800">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <UserPlusIcon className="w-7 h-7 text-black font-bold" />
          <h1 className="text-2xl font-bold">Danh sách bạn bè</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Nút Thêm Bạn trên giao diện chính */}
          <button
            onClick={() => setShowAddFriend(true)}
            className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full font-semibold hover:bg-gray-800 transition"
          >
            <span className="text-lg">+</span>
            Thêm bạn
          </button>

          {/* Hiển thị Modal khi showAddFriend là true */}
          {showAddFriend && (
            <AddFriendModal onClose={() => setShowAddFriend(false)} />
          )}

          <button className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 transition">
            <InformationCircleIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>
      </div>

      <p className="text-gray-600 font-semibold mb-4">
        Bạn bè ({friends.length})
      </p>

      {/* SEARCH & SORT CONTROLS */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 flex items-center gap-2 bg-gray-100/80 px-4 py-2.5 rounded-full">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm bạn bè"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent w-full outline-none text-[15px] placeholder-gray-400"
          />
        </div>

        <button
          onClick={toggleSortOrder}
          className="flex items-center gap-2 bg-gray-100/80 px-4 py-2.5 rounded-full text-[15px] font-medium hover:bg-gray-200 transition"
        >
          Tên ({sortOrder === "asc" ? "A-Z" : "Z-A"})
          <ArrowsUpDownIcon className="w-4 h-4 text-gray-500" />
        </button>

        <button className="bg-gray-100/80 p-2.5 rounded-full hover:bg-gray-200 transition">
          <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* LIST BẠN BÈ ĐÃ ĐƯỢC NHÓM */}
      <div className="space-y-8">
        {groupKeys.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            Không tìm thấy bạn bè nào.
          </div>
        ) : (
          groupKeys.map((letter) => (
            <div key={letter}>
              <h2 className="text-[15px] font-bold text-gray-400 mb-4">
                {letter}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {groupedFriends[letter].map((friend: any) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-4 group cursor-pointer"
                  >
                    <div className="w-14 h-14 bg-blue-100 rounded-full flex shrink-0 items-center justify-center font-bold text-blue-600">
                      {(friend.friendName || friend.requesterId || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold text-[16px] text-gray-900 group-hover:text-blue-600 transition-colors">
                        {friend.friendName ||
                          friend.requesterId ||
                          "Tên Bạn Bè"}
                      </h3>
                      <p className="text-[13px] text-gray-500 mt-0.5">
                        Đang hoạt động
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
