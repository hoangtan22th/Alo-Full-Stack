"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axiosClient from "@/services/api";
import NewDirectChatModal from "@/components/ui/NewDirectChatModal";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Bars3BottomRightIcon,
  FaceSmileIcon,
} from "@heroicons/react/24/outline";

export default function ChatPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Ưu tiên");
  const [activeChat, setActiveChat] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      // 1. Lấy user info
      const userRes: any = await axiosClient.get("/auth/me");
      const user = userRes?.data || userRes;
      const currentUserId = user?.id || user?._id || user?.userId;

      // 2. Lấy groups
      let groups: any = await axiosClient.get("/groups/me", {
        params: { type: "all" },
      });

      // Axios interceptor của bạn có thể trả về array hoặc object chứa data
      if (groups?.data?.data) {
        groups = groups.data.data;
      } else if (groups?.data) {
        groups = groups.data;
      }

      if (Array.isArray(groups)) {
        // Map thông tin nhóm & người dùng
        const formattedGroups = await Promise.all(
          groups.map(async (g: any) => {
            const date = new Date(g.updatedAt);
            const timeString = date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            let chatName = g.name;
            let chatAvatar = g.groupAvatar;

            // Nếu là chat 1-1
            if (!g.isGroup && currentUserId && g.members) {
              const otherMember = g.members.find(
                (m: any) => m.userId !== currentUserId,
              );
              if (otherMember) {
                try {
                  const userRes: any = await axiosClient.get(
                    `/users/${otherMember.userId}`,
                  );
                  const otherUser =
                    userRes?.data?.data || userRes?.data || userRes;
                  if (otherUser) {
                    chatName =
                      otherUser.fullName ||
                      otherUser.username ||
                      otherUser.name ||
                      "Người dùng";
                    chatAvatar = otherUser.avatar || chatAvatar;
                  }
                } catch (err) {
                  console.log("Không lấy được info user", err);
                }
              }
            }

            return {
              id: g._id || g.id,
              name: chatName || "Nhóm trò chuyện",
              avatar: chatAvatar || "",
              isGroup: g.isGroup,
              membersCount: g.members?.length,
              message: "Chưa có tin nhắn", // Placeholder nếu backend chưa trả lastMessage
              time: timeString,
              unread: false,
              online: false,
            };
          }),
        );
        setConversations(formattedGroups);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách nhóm:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((chat) =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 font-sans overflow-hidden">
      {/* ================= CỘT TRÁI: DANH SÁCH CHAT ================= */}
      <div className="w-full md:w-[320px] lg:w-85 flex flex-col border-r border-gray-100 shrink-0 h-full">
        <div className="p-5 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight text-black">
              Messages
            </h1>
            <button
              onClick={() => setShowNewChatModal(true)}
              title="Tạo cuộc hội thoại mới"
              className="w-8 h-8 bg-black rounded-full text-white flex items-center justify-center hover:bg-gray-800 transition shadow-md active:scale-95"
            >
              <PlusIcon className="w-5 h-5 stroke-2" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F5F5F5] border-transparent rounded-xl pl-10 pr-4 py-2.5 text-[13px] font-medium outline-none focus:bg-white focus:border-black border transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex gap-5">
              {["Ưu tiên", "Khác"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-[13px] font-bold relative ${
                    activeTab === tab
                      ? "text-black"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute -bottom-2.25 left-0 right-0 h-0.5 bg-black rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
            <button className="text-gray-400 hover:text-black">
              <Bars3BottomRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Đang tải danh sách...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Không có cuộc trò chuyện nào
            </div>
          ) : (
            filteredConversations.map((chat) => (
              <div
                key={chat.id}
                onClick={() => router.push(`/chat/${chat.id}`)}
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                  activeChat === chat.id ? "bg-[#F5F5F5]" : "hover:bg-gray-50"
                }`}
              >
                <div className="relative shrink-0">
                  {chat.avatar ? (
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : chat.isGroup ? (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                      {chat.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      {chat.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {chat.online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className="font-bold text-[14px] truncate">
                      {chat.name}
                    </h3>
                    <span className="text-[11px] font-medium text-gray-400 shrink-0">
                      {chat.time}
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-500 truncate font-medium">
                    {chat.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ================= CỘT GIỮA: MÀN HÌNH CHÀO MỪNG ================= */}
      <div className="flex-1 flex flex-col items-center justify-center min-w-0 h-full bg-[#FAFAFA]">
        <div className="w-24 h-24 bg-black/5 rounded-3xl flex items-center justify-center mb-6">
          <FaceSmileIcon className="w-12 h-12 text-black/40" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-gray-900 mb-2">
          Chào mừng đến với Alo Chat
        </h2>
        <p className="text-sm font-medium text-gray-500 max-w-md text-center">
          Chọn một cuộc trò chuyện từ danh sách bên trái hoặc bắt đầu một cuộc
          trò chuyện mới để kết nối với mọi người.
        </p>
        <button
          onClick={() => setShowNewChatModal(true)}
          className="mt-6 px-5 py-2.5 bg-black text-white text-[13px] font-bold rounded-full hover:bg-gray-800 transition active:scale-95 shadow-md"
        >
          + Cuộc trò chuyện mới
        </button>
      </div>

      {/* Modal tạo chat 1-1 */}
      <NewDirectChatModal
        isOpen={showNewChatModal}
        onClose={() => {
          setShowNewChatModal(false);
          fetchGroups(); // reload list sau khi tạo
        }}
      />
    </div>
  );
}
