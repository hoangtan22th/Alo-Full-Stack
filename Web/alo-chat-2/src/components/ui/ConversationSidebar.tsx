"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import axiosClient from "@/services/api";
import { groupService } from "@/services/groupService";
import { socketService } from "@/services/socketService";
import NewDirectChatModal from "@/components/ui/NewDirectChatModal";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Bars3BottomRightIcon,
  EllipsisHorizontalIcon,
  TagIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

// --- Sub-component: ManageLabelsModal ---
function ManageLabelsModal({ 
  isOpen, 
  onClose, 
  labels, 
  onRefresh 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  labels: any[]; 
  onRefresh: () => void;
}) {
  const [editingLabel, setEditingLabel] = useState<any>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [loading, setLoading] = useState(false);

  const colors = [
    "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", 
    "#ec4899", "#6b7280", "#000000", "#14b8a6", "#f97316"
  ];

  const handleCreateOrUpdate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (editingLabel) {
        await groupService.updateLabel(editingLabel._id || editingLabel.id, name, color);
      } else {
        await groupService.createLabel(name, color);
      }
      setName("");
      setColor("#3b82f6");
      setEditingLabel(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa thẻ này sẽ gỡ nhãn khỏi tất cả các hội thoại liên quan. Tiếp tục?")) return;
    try {
      await groupService.deleteLabel(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">Quản lý thẻ phân loại</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <XMarkIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
          {/* Form */}
          <div className="mb-8 p-4 bg-gray-50 rounded-2xl flex flex-col gap-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {editingLabel ? "Chỉnh sửa thẻ" : "Thêm thẻ mới"}
            </p>
            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="Tên thẻ..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-all"
              />
              <button 
                onClick={handleCreateOrUpdate}
                disabled={loading || !name.trim()}
                className="px-5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition disabled:bg-gray-300"
              >
                {editingLabel ? "Lưu" : "Thêm"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {colors.map(c => (
                <button 
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? "border-black scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            {editingLabel && (
              <button onClick={() => { setEditingLabel(null); setName(""); setColor("#3b82f6"); }} className="text-[12px] font-bold text-gray-400 hover:text-black self-start">
                Hủy chỉnh sửa
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Danh sách thẻ</p>
            {labels.length === 0 ? (
              <p className="text-sm text-gray-400 italic px-1">Chưa có thẻ nào...</p>
            ) : (
              labels.map(l => (
                <div key={l._id || l.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-2xl hover:border-gray-200 transition-colors group/item shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="text-sm font-bold text-gray-700">{l.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingLabel(l); setName(l.name); setColor(l.color); }}
                      className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(l._id || l.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const BOT_ID = "alo-bot";
const BOT_INFO = {
  id: BOT_ID,
  name: "Trợ lý Alo Chat",
  avatar: "/alochat.png",
  isGroup: false,
  message: "Sẵn sàng hỗ trợ bạn 24/7...",
  online: true,
};

export default function ConversationSidebar() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params?.conversationId as string;

  const [activeTab, setActiveTab] = useState("Ưu tiên");
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const { user: currentUser } = useAuthStore();

  // Labels & Pin states
  const [labels, setLabels] = useState<any[]>([]);
  const [labelAssignments, setLabelAssignments] = useState<Record<string, any>>({});
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuView, setMenuView] = useState<"main" | "labels">("main");
  const [showManageLabelsModal, setShowManageLabelsModal] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const { typingUsers } = useChatStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef(conversationId);
  const userFetchCache = useRef<Record<string, any>>({});

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const fetchPinnedInfo = useCallback(async () => {
    try {
      const res = await groupService.getPinnedConversations();
      const ids = res?.data || res || [];
      setPinnedIds(new Set(ids));
    } catch (err) {
      console.error("Lỗi tải danh sách ghim:", err);
    }
  }, []);

  const fetchLabelsInfo = useCallback(async () => {
    try {
      const [labelsRes, assignmentsRes]: any = await Promise.all([
        groupService.getLabels(),
        groupService.getConversationLabels(),
      ]);

      const labelsData = labelsRes?.data || labelsRes || [];
      const assignmentsData = assignmentsRes?.data || assignmentsRes || [];
      setLabels(labelsData);

      const assignmentMap: Record<string, any> = {};
      assignmentsData.forEach((as: any) => {
        if (as.conversationId && as.labelId) {
          assignmentMap[as.conversationId] = as.labelId;
        }
      });
      setLabelAssignments(assignmentMap);
    } catch (err) {
      console.error("Lỗi tải thông tin nhãn:", err);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const currentUserId = currentUser?.id || currentUser?._id || currentUser?.userId;

      let groups: any = await axiosClient.get("/groups/me", {
        params: { type: "all" },
      });

      if (groups?.data?.data) groups = groups.data.data;
      else if (groups?.data) groups = groups.data;

      if (Array.isArray(groups)) {
        const formattedGroups = await Promise.all(
          groups.map(async (g: any) => {
            const date = new Date(g.updatedAt);
            const timeString = date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            let chatName = g.name;
            let chatAvatar = g.groupAvatar;

            if (!g.isGroup && currentUserId && g.members) {
              const otherMember = g.members.find((m: any) => m.userId !== currentUserId);
              if (otherMember) {
                try {
                  let otherUser = userFetchCache.current[otherMember.userId];
                  if (!otherUser) {
                    const uRes: any = await axiosClient.get(`/users/${otherMember.userId}`);
                    otherUser = uRes?.data?.data || uRes?.data || uRes;
                    if (otherUser) userFetchCache.current[otherMember.userId] = otherUser;
                  }
                  if (otherUser) {
                    chatName = otherUser.fullName || otherUser.username || otherUser.name || "Người dùng";
                    chatAvatar = otherUser.avatar || chatAvatar;
                  }
                } catch {}
              }
            }

            const otherMember = g.isGroup ? null : g.members?.find((m: any) => m.userId !== currentUserId);

            return {
              id: g._id || g.id,
              name: chatName || "Nhóm trò chuyện",
              avatar: chatAvatar || "",
              isGroup: g.isGroup,
              membersCount: g.members?.length,
              message: g.lastMessageContent || "Chưa có tin nhắn",
              time: timeString,
              unreadCount: (currentUserId && g.unreadCount?.[currentUserId]) || 0,
              updatedAt: g.updatedAt,
              otherMemberUserId: otherMember?.userId,
            };
          }),
        );
        
        const currentTime = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        setConversations([{ ...BOT_INFO, time: currentTime, updatedAt: new Date().toISOString() }, ...formattedGroups]);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách nhóm:", error);
    }
  }, [currentUser]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchGroups(), fetchLabelsInfo(), fetchPinnedInfo()]);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchGroups, fetchLabelsInfo, fetchPinnedInfo]);

  useEffect(() => {
    fetchData();

    const unsubs = [
      socketService.onPinUpdated((data: { conversationId: string; isPinned: boolean }) => {
        setPinnedIds(prev => {
          const next = new Set(prev);
          if (data.isPinned) next.add(data.conversationId);
          else next.delete(data.conversationId);
          return next;
        });
      }),
      socketService.onLabelUpdated((data: { conversationId: string; label: any }) => {
        setLabelAssignments(prev => {
          const next = { ...prev };
          if (data.label) next[data.conversationId] = data.label;
          else delete next[data.conversationId];
          return next;
        });
      }),
      socketService.onConversationCreated((newConvo: any) => {
        setConversations(prev => {
          const exists = prev.some(c => (c._id || c.id) === (newConvo._id || newConvo.id));
          if (exists) return prev;
          return [newConvo, ...prev];
        });
      }),
      socketService.onConversationRemoved((data: { conversationId: string }) => {
        setConversations(prev => prev.filter(c => (c._id || c.id) !== data.conversationId));
        if (conversationIdRef.current === data.conversationId) {
          router.push('/chat');
        }
      }),
      socketService.onConversationUpdated((data: any) => {
        console.log("📡 [Socket] Conversation updated:", data.conversationId);
        fetchGroups();
      }),
      socketService.onMessageReceived((msg: any) => {
        const convoId = msg.conversationId || msg.roomId;
        if (!convoId) return;

        setConversations((prev) => {
          const index = prev.findIndex((c) => (c.id || c._id) === convoId);
          if (index === -1) {
            fetchGroups();
            return prev;
          }

          const next = [...prev];
          const convo = { ...next[index] };
          
          convo.message = msg.type === "file" ? `[File] ${msg.metadata?.fileName || msg.content}` : msg.content;
          convo.updatedAt = msg.createdAt || new Date().toISOString();
          convo.time = new Date(convo.updatedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          const currentUserId = currentUser?.id || currentUser?._id || currentUser?.userId;
          if (msg.senderId !== currentUserId && conversationIdRef.current !== convoId) {
            convo.unreadCount = (convo.unreadCount || 0) + 1;
          }

          next.splice(index, 1);
          return [convo, ...next];
        });
      }),
      socketService.onMessagesRead((data: { conversationId: string; userId: string }) => {
        const currentUserId = currentUser?.id || currentUser?._id || currentUser?.userId;
        if (data.userId === currentUserId) {
          setConversations((prev) => 
            prev.map((c) => 
              (c.id || c._id) === data.conversationId 
                ? { ...c, unreadCount: 0 } 
                : c
            )
          );
        }
      }),
      socketService.onUserOnline((data: { userId: string }) => {
        setOnlineUsers((prev) => ({ ...prev, [data.userId]: true }));
      }),
      socketService.onUserOffline((data: { userId: string }) => {
        setOnlineUsers((prev) => ({ ...prev, [data.userId]: false }));
      }),
      socketService.onUserStatusResult((data: { userId: string; status: string }) => {
        setOnlineUsers((prev) => ({
          ...prev,
          [data.userId]: data.status === "online",
        }));
      }),
    ];

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [fetchData, router, currentUser]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
        setMenuView("main");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTogglePin = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    try {
      await groupService.togglePinConversation(conversationId);
      const newPinned = new Set(pinnedIds);
      if (newPinned.has(conversationId)) newPinned.delete(conversationId);
      else newPinned.add(conversationId);
      setPinnedIds(newPinned);
      setOpenMenuId(null);
    } catch (err) {
      console.error("Lỗi ghim hội thoại:", err);
    }
  };

  const handleAssignLabel = async (e: React.MouseEvent, conversationId: string, labelId: string | null) => {
    e.stopPropagation();
    try {
      await groupService.assignLabel(conversationId, labelId);
      const newAssignments = { ...labelAssignments };
      if (!labelId) delete newAssignments[conversationId];
      else {
        const selectedLabel = labels.find(l => (l._id || l.id) === labelId);
        newAssignments[conversationId] = selectedLabel;
      }
      setLabelAssignments(newAssignments);
      setOpenMenuId(null);
      setMenuView("main");
    } catch (err) {
      console.error("Lỗi gán nhãn:", err);
    }
  };

  const handleClearHistory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xoá lịch sử trò chuyện này? Các tin nhắn cũ sẽ biến mất đối với bạn.")) return;
    try {
      await groupService.clearConversation(id);
      setOpenMenuId(null);
      // Refresh list
      fetchGroups();
      // Nếu đang mở chính conversation đó thì chuyển hướng
      if (conversationId === id) {
        router.push("/chat");
      }
    } catch (err) {
      console.error("Lỗi xoá lịch sử:", err);
    }
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuView("main");
    } else {
      setOpenMenuId(id);
      setMenuView("main");
    }
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    const aPinned = pinnedIds.has(a.id);
    const bPinned = pinnedIds.has(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const filteredConversations = sortedConversations.filter((chat) =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      <div className="w-full md:w-[320px] lg:w-85 flex flex-col border-r border-gray-100 shrink-0 h-full">
        <div className="p-5 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight text-black">Messages</h1>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="w-8 h-8 bg-black rounded-full text-white flex items-center justify-center hover:bg-gray-800 transition shadow-md active:scale-95"
            >
              <PlusIcon className="w-5 h-5 stroke-2" />
            </button>
          </div>

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

          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex gap-5">
              {["Ưu tiên", "Khác"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-[13px] font-bold relative ${
                    activeTab === tab ? "text-black" : "text-gray-400 hover:text-gray-600"
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

        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm font-medium">
              Đang tải danh sách...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm font-medium">
              Không có cuộc trò chuyện nào
            </div>
          ) : (
            filteredConversations.map((chat) => (
              <div
                key={chat.id}
                onClick={() => router.push(`/chat/${chat.id}`)}
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-[background-color] duration-150 group relative select-none outline-none border ${
                  conversationId === chat.id 
                    ? "bg-[#F5F5F5] border-[#F5F5F5]" 
                    : "hover:bg-gray-50 border-transparent hover:border-gray-100"
                } ${pinnedIds.has(chat.id) ? "bg-blue-50/30 shadow-sm" : ""}`}
              >
                <div className="relative shrink-0">
                  {chat.avatar ? (
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-12 h-12 rounded-full object-cover shadow-sm border border-gray-100"
                    />
                  ) : chat.isGroup ? (
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold shadow-sm">
                      {chat.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 font-bold shadow-sm">
                      {chat.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Unread Count Badge on Top Right of Avatar */}
                  {chat.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white shadow-sm scale-100 animate-in fade-in zoom-in duration-300">
                      {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                    </span>
                  )}
                  {(chat.otherMemberUserId && onlineUsers[chat.otherMemberUserId]) && (
                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                  {chat.id === BOT_ID && (
                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {pinnedIds.has(chat.id) && (
                        <MapPinIcon className="w-3.5 h-3.5 text-blue-500 shrink-0 fill-blue-500" />
                      )}
                      <h3 className="font-bold text-[14px] truncate text-gray-900">{chat.name}</h3>
                      {labelAssignments[chat.id] && (
                        <span 
                          className="px-1.5 py-0.5 rounded-full text-[9px] font-black text-white shrink-0 uppercase tracking-tighter shadow-sm"
                          style={{ backgroundColor: labelAssignments[chat.id].color }}
                        >
                          {labelAssignments[chat.id].name}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 shrink-0">{chat.time}</span>
                  </div>
                  <div className="flex justify-between items-center h-5">
                    <p className={`text-[13px] truncate font-medium flex-1 ${typingUsers[chat.id]?.length > 0 ? "text-green-500 italic" : "text-gray-500"}`}>
                      {typingUsers[chat.id]?.length > 0 ? "Đang soạn tin..." : chat.message}
                    </p>
                    <button
                      onClick={(e) => toggleMenu(e, chat.id)}
                      className="md:opacity-0 group-hover:opacity-100 p-1 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400 hover:text-black"
                    >
                      <EllipsisHorizontalIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {openMenuId === chat.id && (
                  <div 
                    ref={menuRef}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-3 top-13 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-[60] animate-in fade-in zoom-in duration-150"
                  >
                    {menuView === "main" ? (
                      <div className="flex flex-col p-1">
                        <button 
                          onClick={(e) => handleTogglePin(e, chat.id)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors group/item"
                        >
                          <MapPinIcon className={`w-5 h-5 ${pinnedIds.has(chat.id) ? "text-blue-500 fill-blue-500" : "text-gray-400 group-hover/item:text-black"}`} />
                          {pinnedIds.has(chat.id) ? "Bỏ ghim" : "Ghim hội thoại"}
                        </button>
                        <button 
                          onClick={() => setMenuView("labels")}
                          className="flex items-center justify-between w-full px-3 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors group/item"
                        >
                          <div className="flex items-center gap-3">
                            <TagIcon className="w-5 h-5 text-gray-400 group-hover/item:text-black" />
                            Phân loại
                          </div>
                          <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                        </button>

                        <button 
                          onClick={(e) => handleClearHistory(e, chat.id)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors group/item"
                        >
                          <TrashIcon className="w-5 h-5 text-red-400 group-hover/item:text-red-500" />
                          Xoá lịch sử
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="px-2 py-1 flex items-center gap-1 border-b border-gray-50 mb-1">
                          <button onClick={() => setMenuView("main")} className="p-1 px-2 hover:bg-gray-50 rounded-lg text-gray-400">
                            <ChevronLeftIcon className="w-4 h-4" />
                          </button>
                          <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Phân loại</span>
                        </div>
                        <div className="p-1 flex flex-col gap-0.5">
                          <button 
                            onClick={(e) => handleAssignLabel(e, chat.id, null)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <div className="w-2 h-2 rounded-full bg-gray-200" />
                            Không có nhãn
                          </button>
                          {labels.map(l => (
                            <button 
                              key={l._id || l.id}
                              onClick={(e) => handleAssignLabel(e, chat.id, l._id || l.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                              {l.name}
                            </button>
                          ))}
                          <button 
                            onClick={() => { setShowManageLabelsModal(true); setOpenMenuId(null); }}
                            className="mt-1 flex items-center justify-center gap-2 w-full px-3 py-2 text-[11px] font-black text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-dashed border-blue-100"
                          >
                            <PlusIcon className="w-3 h-3" />
                            QUẢN LÝ THẺ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <ManageLabelsModal 
        isOpen={showManageLabelsModal} 
        onClose={() => setShowManageLabelsModal(false)}
        labels={labels}
        onRefresh={fetchLabelsInfo}
      />

      <NewDirectChatModal 
        isOpen={showNewChatModal} 
        onClose={() => setShowNewChatModal(false)} 
        onChatCreated={fetchGroups}
      />
    </>
  );
}
