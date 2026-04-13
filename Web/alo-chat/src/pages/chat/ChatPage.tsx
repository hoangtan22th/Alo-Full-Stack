import { useState, useEffect, useRef } from "react";
import axiosClient from "../../config/axiosClient";
import { getMessageHistory } from "../../services/message.service";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Bars3BottomRightIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  PaperClipIcon,
  FaceSmileIcon,
  PaperAirplaneIcon,
  BellIcon,
  UserIcon,
  EllipsisHorizontalIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  FolderIcon,
  NoSymbolIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

// ================= DỮ LIỆU MẪU DỰ PHÒNG =================

  // {
  //   id: "1",
  //   name: "Nguyễn Hoàng Tấn",
  //   message: "Can you review the latest Fi...",
  //   time: "12:45 PM",
  //   unread: false,
  //   online: true,
  //   avatar: "https://i.pravatar.cc/150?img=11",
  // },
 
export default function ChatPage() {
  const [activeTab, setActiveTab] = useState("Ưu tiên");
  const [activeChat, setActiveChat] = useState("1");
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (!activeChat || activeChat === "1") {
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      try {
        const data = await getMessageHistory(activeChat);
        if (data && data.messages) {
          setMessages(data.messages);
        } else if (Array.isArray(data)) {
          setMessages(data);
        }
      } catch (err) {
        console.error("Lỗi lấy lịch sử tin nhắn:", err);
      }
    };
    fetchMessages();
  }, [activeChat]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      // 1. Lấy user info
      const userRes: any = await axiosClient.get("/auth/me");
      const user = userRes?.data || userRes;
      if (user) setCurrentUser(user);
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
        
        // Tự động chọn chat đầu tiên nếu đang ở mặc định "1"
        if (formattedGroups.length > 0 && activeChat === "1") {
          setActiveChat(formattedGroups[0].id);
        }
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
      <div className="w-full md:w-[320px] lg:w-[340px] flex flex-col border-r border-gray-100 shrink-0 h-full">
        <div className="p-5 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight text-black">
              Messages
            </h1>
            <button className="w-8 h-8 bg-black rounded-full text-white flex items-center justify-center hover:bg-gray-800 transition shadow-md active:scale-95">
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
                    <span className="absolute -bottom-[9px] left-0 right-0 h-[2px] bg-black rounded-t-full" />
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
                onClick={() => setActiveChat(chat.id)}
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

      {/* ================= CỘT GIỮA: NỘI DUNG CHAT ===================================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-white relative">
        <div className="h-[76px] px-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md z-10">
          <div>
            <h2 className="text-[16px] font-black tracking-tight">
              {conversations.find((c) => String(c.id) === String(activeChat))?.name || "Nhóm trò chuyện"}
            </h2>
            <p className="text-[12px] font-bold text-gray-400 mt-0.5">
              {conversations.find((c) => String(c.id) === String(activeChat))?.online ? "Đang hoạt động" : "Ngoại tuyến"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <button className="hover:text-black transition">
              <PhoneIcon className="w-5 h-5" />
            </button>
            <button className="hover:text-black transition">
              <VideoCameraIcon className="w-5 h-5" />
            </button>
            <button className="hover:text-black transition">
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
            <button className="hover:text-black transition">
              <InformationCircleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <div className="flex justify-center">
            <span className="bg-[#F5F5F5] text-gray-500 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              Today
            </span>
          </div>

          {messages.map((msg, idx) => {
            const myId = currentUser?.id || currentUser?._id || currentUser?.userId;
            const senderId = msg.senderId || msg.sender || (typeof msg.sender === 'object' ? msg.sender?._id : null);
            
            // So sánh an toàn hơn bằng String()
            const isMe = String(senderId) === String(myId);
            const timeString = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
            
            if (isMe) {
              return (
                <div key={msg._id || msg.id || idx} className="flex justify-end">
                  <div className="max-w-[85%] lg:max-w-[70%]">
                    <div className="bg-black text-white p-4 rounded-2xl rounded-br-sm text-[14px] font-medium leading-relaxed shadow-md">
                      {msg.content || msg.text}
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-1.5 mr-1">
                      <span className="text-[10px] font-bold text-gray-400">
                        {timeString}
                      </span>
                      <span className="text-[10px] text-gray-400">✓✓</span>
                    </div>
                  </div>
                </div>
              );
            } else {
              const chatInfo = conversations.find((c) => String(c.id) === String(activeChat));
              const avatar = chatInfo?.avatar || "https://i.pravatar.cc/150?img=11";

              return (
                <div key={msg._id || msg.id || idx} className="flex items-end gap-3 max-w-[85%] lg:max-w-[70%]">
                  <img
                    src={avatar}
                    className="w-8 h-8 rounded-full mb-1"
                    alt=""
                  />
                  <div>
                    <div className="bg-[#F5F5F5] text-gray-900 p-4 rounded-2xl rounded-bl-sm text-[14px] font-medium leading-relaxed">
                      {msg.content || msg.text}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 mt-1.5 ml-1 block">
                      {timeString}
                    </span>
                  </div>
                </div>
              );
            }
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white shrink-0">
          <div className="flex items-center gap-3 bg-[#F5F5F5] p-2 rounded-full border border-transparent focus-within:border-gray-200 focus-within:bg-white transition-all">
            <button className="p-2 text-gray-400 hover:text-black transition">
              <PaperClipIcon className="w-5 h-5" />
            </button>
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium placeholder:text-gray-400"
            />
            <button className="p-2 text-gray-400 hover:text-black transition">
              <FaceSmileIcon className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition active:scale-95 shadow-md">
              <PaperAirplaneIcon className="w-4 h-4 -mr-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= CỘT PHẢI: THÔNG TIN CHI TIẾT ================= */}
      <div className="hidden lg:flex w-[320px] xl:w-[340px] flex-col shrink-0 border-l border-gray-100 bg-[#FAFAFA] h-full">
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Profile Section */}
          <div className="flex flex-col items-center pt-10 pb-8 border-b border-gray-100/60">
            <div className="relative mb-4">
              <img
                src="https://i.pravatar.cc/150?img=11"
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
            </div>
            <h2 className="text-[18px] font-black text-gray-900 tracking-tight">
              Nguyễn Hoàng Tấn
            </h2>
            <p className="text-[12px] font-bold text-gray-400 mt-1">
              Senior Product Designer
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 transition shadow-sm">
                <UserIcon className="w-4 h-4" />
              </button>
              <button className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 transition shadow-sm">
                <BellIcon className="w-4 h-4" />
              </button>
              <button className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 transition shadow-sm">
                <EllipsisHorizontalIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Shared Media */}
          <div className="p-6 border-b border-gray-100/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Shared Media
              </h3>
              <button className="text-[10px] font-black text-black hover:underline uppercase">
                See All
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square rounded-xl bg-gray-200 overflow-hidden shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=200&auto=format&fit=crop"
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
              <div className="aspect-square rounded-xl bg-gray-200 overflow-hidden shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=200&auto=format&fit=crop"
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
              <div className="aspect-square rounded-xl bg-gray-200 overflow-hidden shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=200&auto=format&fit=crop"
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
            </div>
          </div>

          {/* Shared Files */}
          <div className="p-6 border-b border-gray-100/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Shared Files
              </h3>
              <button className="text-[10px] font-black text-black hover:underline uppercase">
                See All
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 cursor-pointer group">
                <div className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 group-hover:bg-gray-50 transition">
                  <DocumentIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900">
                    Brand_Guidelines.pdf
                  </p>
                  <p className="text-[11px] font-bold text-gray-400">
                    12.5 MB • PDF
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 cursor-pointer group">
                <div className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 group-hover:bg-gray-50 transition">
                  <FolderIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900">
                    UI_Assets_v2.zip
                  </p>
                  <p className="text-[11px] font-bold text-gray-400">
                    85 MB • ZIP
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Actions */}
          <div className="p-6 space-y-4 pb-10">
            <button className="w-full flex items-center justify-between text-[13px] font-bold text-red-500 hover:bg-red-50 p-2 -mx-2 rounded-lg transition">
              Block User
              <NoSymbolIcon className="w-4 h-4" />
            </button>
            <button className="w-full flex items-center justify-between text-[13px] font-bold text-gray-500 hover:bg-gray-100 p-2 -mx-2 rounded-lg transition">
              Report Conversation
              <ExclamationCircleIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
