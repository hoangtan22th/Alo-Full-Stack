"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import axiosClient from "@/services/api";
import { groupService } from "@/services/groupService";
import { socketService } from "@/services/socketService";
import NewDirectChatModal from "@/components/ui/NewDirectChatModal";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { contactService } from "@/services/contactService";
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
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  BellIcon,
} from "@heroicons/react/24/outline";
import { MapPinIcon as MapPinSolidIcon } from "@heroicons/react/24/solid";
import CreateGroupModal from "@/components/ui/group/CreateGroupModal";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// --- Sub-component: ManageLabelsModal ---
function ManageLabelsModal({
  isOpen,
  onClose,
  labels,
  onRefresh,
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
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#6b7280",
    "#000000",
    "#14b8a6",
    "#f97316",
  ];

  const handleCreateOrUpdate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (editingLabel) {
        await groupService.updateLabel(
          editingLabel._id || editingLabel.id,
          name,
          color,
        );
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
    if (
      !confirm(
        "Xóa thẻ này sẽ gỡ nhãn khỏi tất cả các hội thoại liên quan. Tiếp tục?",
      )
    )
      return;
    try {
      await groupService.deleteLabel(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900">
            Quản lý thẻ phân loại
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
          {/* Form */}
          <div className="mb-8 p-5 bg-gray-50/80 border border-gray-100 rounded-2xl flex flex-col gap-4">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              {editingLabel ? "Chỉnh sửa thẻ" : "Thêm thẻ mới"}
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Nhập tên thẻ..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <button
                onClick={handleCreateOrUpdate}
                disabled={loading || !name.trim()}
                className="px-5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
              >
                {editingLabel ? "Lưu" : "Thêm"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                    color === c
                      ? "border-gray-900 scale-110 shadow-md"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            {editingLabel && (
              <button
                onClick={() => {
                  setEditingLabel(null);
                  setName("");
                  setColor("#3b82f6");
                }}
                className="text-[13px] font-medium text-gray-500 hover:text-gray-900 self-start transition-colors"
              >
                Hủy chỉnh sửa
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1 mb-1">
              Danh sách thẻ
            </p>
            {labels.length === 0 ? (
              <p className="text-sm text-gray-500 italic px-1 bg-gray-50 py-4 rounded-xl text-center border border-dashed border-gray-200">
                Chưa có thẻ nào...
              </p>
            ) : (
              labels.map((l) => (
                <div
                  key={l._id || l.id}
                  className="flex items-center justify-between p-3.5 bg-white border border-gray-100 rounded-xl hover:border-blue-100 hover:shadow-sm transition-all group/item"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-full shadow-sm"
                      style={{ backgroundColor: l.color }}
                    />
                    <span className="text-sm font-medium text-gray-800">
                      {l.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingLabel(l);
                        setName(l.name);
                        setColor(l.color);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(l._id || l.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
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
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const { user: currentUser } = useAuthStore();

  const [labels, setLabels] = useState<any[]>([]);
  const [labelAssignments, setLabelAssignments] = useState<Record<string, any>>(
    {},
  );
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuView, setMenuView] = useState<"main" | "labels">("main");
  const [showManageLabelsModal, setShowManageLabelsModal] = useState(false);

  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const { typingUsers, friendIds, setFriendIds } = useChatStore();

  const menuRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef(conversationId);
  const userFetchCache = useRef<Record<string, any>>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
        setMenuView("main");
      }
      if (
        plusMenuRef.current &&
        !plusMenuRef.current.contains(event.target as Node)
      ) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      const currentUserId = (currentUser?.id ||
        currentUser?._id ||
        currentUser?.userId ||
        "") as string;

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
              const otherMember = g.members.find(
                (m: any) => m.userId !== currentUserId,
              );
              if (otherMember) {
                try {
                  let otherUser = userFetchCache.current[otherMember.userId];
                  if (!otherUser) {
                    const uRes: any = await axiosClient.get(
                      `/users/${otherMember.userId}`,
                    );
                    otherUser = uRes?.data?.data || uRes?.data || uRes;
                    if (otherUser)
                      userFetchCache.current[otherMember.userId] = otherUser;
                  }
                  if (otherUser) {
                    chatName =
                      otherUser.fullName ||
                      otherUser.username ||
                      otherUser.name ||
                      "Người dùng";
                    chatAvatar = otherUser.avatar || chatAvatar;
                  }
                } catch {}
              }
            }

            const otherMember = g.isGroup
              ? null
              : g.members?.find((m: any) => m.userId !== currentUserId);

            return {
              id: g._id || g.id,
              name: chatName || "Nhóm trò chuyện",
              avatar: chatAvatar || "",
              isGroup: g.isGroup,
              membersCount: g.members?.length,
              message: g.lastMessageContent || "Chưa có tin nhắn",
              time: timeString,
              unreadCount:
                (currentUserId && g.unreadCount?.[currentUserId]) || 0,
              updatedAt: g.updatedAt,
              otherMemberUserId: otherMember?.userId,
              folder: (currentUserId && g.folders?.[currentUserId]) || "priority",
            };
          }),
        );

        const currentTime = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        setConversations([
          {
            ...BOT_INFO,
            time: currentTime,
            updatedAt: new Date().toISOString(),
          },
          ...formattedGroups,
        ]);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách nhóm:", error);
    }
  }, [currentUser]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const friends = await contactService.getFriendsList();
      const myId = String(
        currentUser?.id || currentUser?._id || currentUser?.userId,
      );
      const fIds = new Set(
        friends.map((f) =>
          String(f.requesterId) === myId
            ? String(f.recipientId)
            : String(f.requesterId),
        ),
      );
      setFriendIds(fIds);
      await Promise.all([fetchGroups(), fetchLabelsInfo(), fetchPinnedInfo()]);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  }, [
    fetchGroups,
    fetchLabelsInfo,
    fetchPinnedInfo,
    currentUser,
    setFriendIds,
  ]);

  useEffect(() => {
    fetchData();

    const unsubs = [
      socketService.onPinUpdated(
        (data: { conversationId: string; isPinned: boolean }) => {
          setPinnedIds((prev) => {
            const next = new Set(prev);
            if (data.isPinned) next.add(data.conversationId);
            else next.delete(data.conversationId);
            return next;
          });
        },
      ),
      socketService.onLabelUpdated(
        (data: { conversationId: string; label: any }) => {
          setLabelAssignments((prev) => {
            const next = { ...prev };
            if (data.label) next[data.conversationId] = data.label;
            else delete next[data.conversationId];
            return next;
          });
        },
      ),
      socketService.onConversationCreated(async () => fetchGroups()),
      socketService.onConversationRemoved(
        (data: { conversationId: string }) => {
          setConversations((prev) =>
            prev.filter((c) => (c._id || c.id) !== data.conversationId),
          );
          if (conversationIdRef.current === data.conversationId)
            router.push("/chat");
        },
      ),
      socketService.onConversationUpdated(() => fetchGroups()),
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
          convo.message =
            msg.type === "file"
              ? `[File] ${msg.metadata?.fileName || msg.content}`
              : msg.content;
          convo.updatedAt = msg.createdAt || new Date().toISOString();
          convo.time = new Date(convo.updatedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          const currentUserId =
            currentUser?.id || currentUser?._id || currentUser?.userId;
          if (
            msg.senderId !== currentUserId &&
            conversationIdRef.current !== convoId
          ) {
            convo.unreadCount = (convo.unreadCount || 0) + 1;
          }

          next.splice(index, 1);
          return [convo, ...next];
        });
      }),
      socketService.onMessagesRead(
        (data: { conversationId: string; userId: string }) => {
          const currentUserId =
            currentUser?.id || currentUser?._id || currentUser?.userId;
          if (data.userId === currentUserId) {
            setConversations((prev) =>
              prev.map((c) =>
                (c.id || c._id) === data.conversationId
                  ? { ...c, unreadCount: 0 }
                  : c,
              ),
            );
          }
        },
      ),
      socketService.onUserOnline((data: { userId: string }) => {
        setOnlineUsers((prev) => ({ ...prev, [data.userId]: true }));
      }),
      socketService.onUserOffline((data: { userId: string }) => {
        setOnlineUsers((prev) => ({ ...prev, [data.userId]: false }));
      }),
      socketService.onUserStatusResult(
        (data: { userId: string; status: string }) => {
          setOnlineUsers((prev) => ({
            ...prev,
            [data.userId]: data.status === "online",
          }));
        },
      ),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [fetchData, router, currentUser, fetchGroups]);

  const handleTogglePin = async (
    e: React.MouseEvent,
    conversationId: string,
  ) => {
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

  const handleAssignLabel = async (
    e: React.MouseEvent,
    conversationId: string,
    labelId: string | null,
  ) => {
    e.stopPropagation();
    try {
      await groupService.assignLabel(conversationId, labelId);
      const newAssignments = { ...labelAssignments };
      if (!labelId) delete newAssignments[conversationId];
      else {
        const selectedLabel = labels.find((l) => (l._id || l.id) === labelId);
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
    if (
      !confirm(
        "Bạn có chắc chắn muốn xoá lịch sử trò chuyện này? Các tin nhắn cũ sẽ biến mất đối với bạn.",
      )
    )
      return;
    try {
      await groupService.clearConversation(id);
      setOpenMenuId(null);
      fetchGroups();
      if (conversationId === id) router.push("/chat");
    } catch (err) {
      console.error("Lỗi xoá lịch sử:", err);
    }
  };

  const handleMoveFolder = async (
    e: React.MouseEvent,
    id: string,
    folder: "priority" | "other",
  ) => {
    e.stopPropagation();
    try {
      await groupService.updateConversationFolder(id, folder);
      setConversations((prev) =>
        prev.map((c) => ((c.id || c._id) === id ? { ...c, folder } : c)),
      );
      setOpenMenuId(null);
      toast.success(
        folder === "other"
          ? "Đã chuyển vào tab Khác"
          : "Đã chuyển vào tab Ưu tiên",
      );
    } catch (err) {
      console.error("Lỗi chuyển danh mục:", err);
      toast.error("Không thể chuyển danh mục");
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

    if (activeTab === "Khác") {
      const aIsStranger =
        !a.isGroup &&
        a.id !== BOT_ID &&
        a.otherMemberUserId &&
        !friendIds.has(a.otherMemberUserId);
      const bIsStranger =
        !b.isGroup &&
        b.id !== BOT_ID &&
        b.otherMemberUserId &&
        !friendIds.has(b.otherMemberUserId);
      if (aIsStranger && !bIsStranger) return -1;
      if (!aIsStranger && bIsStranger) return 1;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const filteredConversations = sortedConversations.filter((chat) => {
    if (!chat.name?.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;

    const folder = chat.folder;
    const isStrangerConvo =
      !chat.isGroup &&
      chat.id !== BOT_ID &&
      chat.otherMemberUserId &&
      !friendIds.has(chat.otherMemberUserId);

    let tabMatch = false;
    if (activeTab === "Ưu tiên") {
      tabMatch =
        folder === "priority" ||
        (!folder && !isStrangerConvo) ||
        chat.isGroup === true ||
        chat.id === BOT_ID;
    } else if (activeTab === "Khác") {
      tabMatch =
        (folder === "other" ||
          folder === "stranger" ||
          (!folder && isStrangerConvo)) &&
        chat.isGroup !== true &&
        chat.id !== BOT_ID;
    } else {
      return false;
    }

    if (!tabMatch) return false;

    if (selectedLabelId) {
      if (selectedLabelId === "none") return !labelAssignments[chat.id];
      if (selectedLabelId === "stranger") return isStrangerConvo;
      const chatLabelId =
        labelAssignments[chat.id]?._id || labelAssignments[chat.id]?.id;
      return chatLabelId === selectedLabelId;
    }
    return true;
  });

  const { priorityUnreadCount, otherUnreadCount } = useMemo(() => {
    let pCount = 0;
    let oCount = 0;
    conversations.forEach((chat) => {
      if (chat.unreadCount > 0) {
        const folder = chat.folder;
        const isStrangerConvo =
          !chat.isGroup &&
          chat.id !== BOT_ID &&
          chat.otherMemberUserId &&
          !friendIds.has(chat.otherMemberUserId);
        const isPriority =
          folder === "priority" ||
          (!folder && !isStrangerConvo) ||
          chat.isGroup === true ||
          chat.id === BOT_ID;
        const isOther =
          (folder === "other" ||
            folder === "stranger" ||
            (!folder && isStrangerConvo)) &&
          chat.isGroup !== true &&
          chat.id !== BOT_ID;

        if (isPriority) pCount++;
        else if (isOther) oCount++;
      }
    });
    return { priorityUnreadCount: pCount, otherUnreadCount: oCount };
  }, [conversations, friendIds]);

  return (
    <>
      <div className="w-full md:w-[320px] lg:w-[340px] flex flex-col border-r border-gray-200/80 shrink-0 h-full bg-white">
        {/* Header Section */}
        <div className="px-4 pt-5 pb-2 flex flex-col gap-4 bg-white relative z-30">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Đoạn chat
            </h1>
            <div className="relative" ref={plusMenuRef}>
              <button
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 outline-none ${
                  showPlusMenu
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100/80 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <PlusIcon
                  className={`w-5 h-5 stroke-2 transition-transform duration-300 ${showPlusMenu ? "rotate-45" : ""}`}
                />
              </button>

              <AnimatePresence>
                {showPlusMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-11 right-0 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[80]"
                  >
                    <div className="p-1.5 flex flex-col gap-0.5">
                      <button
                        onClick={() => {
                          setShowNewChatModal(true);
                          setShowPlusMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                      >
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        Tạo chat cá nhân
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateGroupModal(true);
                          setShowPlusMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                      >
                        <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
                          <UserGroupIcon className="w-4 h-4" />
                        </div>
                        Tạo nhóm chat
                      </button>
                      <button
                        onClick={() => {
                          router.push("/contacts/groups");
                          setShowPlusMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                      >
                        <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                          <UserGroupIcon className="w-4 h-4" />
                        </div>
                        Danh sách nhóm
                      </button>
                      <button
                        onClick={() => {
                          router.push("/contacts/group-invites");
                          setShowPlusMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                      >
                        <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
                          <BellIcon className="w-4 h-4" />
                        </div>
                        Lời mời vào nhóm
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Tìm kiếm đoạn chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100/80 border border-transparent rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:font-normal"
            />
          </div>
        </div>

        {/* Tabs & Filter */}
        <div className="flex border-b border-gray-100 bg-white relative px-2 z-20">
          {["Ưu tiên", "Khác"].map((tab) => {
            const isActive = activeTab === tab;
            const unreadCount =
              tab === "Ưu tiên" ? priorityUnreadCount : otherUnreadCount;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 py-3 text-[13px] transition-colors ${
                  isActive
                    ? "text-blue-600 font-semibold"
                    : "text-gray-500 font-medium hover:text-gray-700"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  {tab}
                  {unreadCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-t-full mx-6"
                  />
                )}
              </button>
            );
          })}

          {/* Filter Icon */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 group/filter">
            <button
              className={`p-1.5 rounded-lg transition-colors ${selectedLabelId ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"}`}
            >
              <Bars3BottomRightIcon className="w-5 h-5" />
            </button>

            <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover/filter:block z-[90]">
              <div className="absolute -top-2 left-0 right-0 h-4 bg-transparent" />
              <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 overflow-hidden">
                <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">
                  Lọc theo danh mục
                </p>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => setSelectedLabelId(null)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium rounded-xl transition-colors ${!selectedLabelId ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full ring-2 ring-gray-300" />
                    </div>
                    Tất cả tin nhắn
                  </button>
                  <button
                    onClick={() => setSelectedLabelId("stranger")}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium rounded-xl transition-colors ${selectedLabelId === "stranger" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                  >
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    Từ người lạ
                  </button>
                  <button
                    onClick={() => setSelectedLabelId("none")}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium rounded-xl transition-colors ${selectedLabelId === "none" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                    </div>
                    Chưa gắn thẻ
                  </button>
                  {labels.length > 0 && (
                    <div className="h-px bg-gray-100 my-1 mx-2" />
                  )}
                  {labels.map((l) => (
                    <button
                      key={l._id || l.id}
                      onClick={() => setSelectedLabelId(l._id || l.id)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium rounded-xl transition-colors ${selectedLabelId === (l._id || l.id) ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                      <div className="w-4 h-4 flex items-center justify-center">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: l.color }}
                        />
                      </div>
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-2 pb-4">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <ChatBubbleLeftRightIcon className="w-10 h-10 opacity-20" />
              <p className="text-sm">Không tìm thấy đoạn chat nào</p>
            </div>
          ) : (
            filteredConversations.map((chat) => {
              const isSelected = conversationId === (chat.id || chat._id);
              const isPinned = pinnedIds.has(chat.id || chat._id);

              return (
                <div
                  key={chat.id || chat._id}
                  onClick={() => router.push(`/chat/${chat.id || chat._id}`)}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 group relative select-none outline-none mb-1 ${
                    isSelected ? "bg-blue-50/80" : "hover:bg-gray-50/80"
                  } ${isPinned && !isSelected ? "bg-gray-50/40" : ""}`}
                >
                  {/* Avatar Section */}
                  <div className="relative shrink-0">
                    {chat.avatar ? (
                      <img
                        src={chat.avatar}
                        alt={chat.name}
                        className="w-12 h-12 rounded-full object-cover shadow-sm ring-1 ring-black/5"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-sm ring-1 ring-black/5 ${chat.isGroup ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}
                      >
                        {chat.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Unread Badge */}
                    {chat.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-[22px] min-w-[22px] px-1 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white border-2 border-white shadow-sm">
                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                      </span>
                    )}

                    {/* Online Status */}
                    {(chat.otherMemberUserId &&
                      onlineUsers[chat.otherMemberUserId as string]) ||
                    chat.id === BOT_ID ? (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                    ) : null}
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {isPinned && (
                          <MapPinSolidIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        )}
                        <h3
                          className={`text-[15px] truncate ${isSelected ? "font-bold text-blue-900" : "font-semibold text-gray-900"}`}
                        >
                          {chat.name}
                        </h3>
                        {chat.id && labelAssignments[chat.id as string] && (
                          <span
                            className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold text-white shrink-0 tracking-wide shadow-sm"
                            style={{
                              backgroundColor: labelAssignments[chat.id as string].color,
                            }}
                          >
                            {labelAssignments[chat.id as string].name}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs whitespace-nowrap shrink-0 ${chat.unreadCount > 0 ? "font-bold text-blue-600" : "font-medium text-gray-400"}`}
                      >
                        {chat.time}
                      </span>
                    </div>

                    <div className="flex justify-between items-center h-5">
                      <p
                        className={`text-[13px] truncate flex-1 ${
                          chat.id && typingUsers[chat.id as string]?.length > 0
                            ? "text-blue-500 italic font-medium"
                            : chat.unreadCount > 0
                              ? "text-gray-900 font-semibold"
                              : "text-gray-500"
                        }`}
                      >
                        {chat.id && typingUsers[chat.id as string]?.length > 0
                          ? "Đang soạn tin..."
                          : chat.message}
                      </p>

                      {/* Menu Button */}
                      <button
                        onClick={(e) => toggleMenu(e, chat.id)}
                        className={`md:opacity-0 group-hover:opacity-100 p-1 rounded-full transition-all text-gray-400 hover:text-gray-800 hover:bg-white shadow-sm ${openMenuId === chat.id ? "opacity-100 bg-white" : ""}`}
                      >
                        <EllipsisHorizontalIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Context Menu Dropdown */}
                  {openMenuId === chat.id && (
                    <div
                      ref={menuRef}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-4 top-12 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl py-1.5 z-[60]"
                    >
                      {menuView === "main" ? (
                        <div className="flex flex-col px-1.5">
                          <button
                            onClick={(e) => handleTogglePin(e, chat.id)}
                            className="flex items-center gap-3 w-full px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                          >
                            <MapPinIcon
                              className={`w-4 h-4 ${isPinned ? "text-blue-600" : "text-gray-400"}`}
                            />
                            {isPinned ? "Bỏ ghim" : "Ghim hội thoại"}
                          </button>
                          <button
                            onClick={() => setMenuView("labels")}
                            className="flex items-center justify-between w-full px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <TagIcon className="w-4 h-4 text-gray-400" /> Phân
                              loại
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                          </button>
                          <button
                            onClick={(e) =>
                              handleMoveFolder(
                                e,
                                chat.id,
                                chat.folder === "other" ? "priority" : "other",
                              )
                            }
                            className="flex items-center gap-3 w-full px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                          >
                            <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-400" />
                            {chat.folder === "other"
                              ? "Chuyển sang Ưu tiên"
                              : "Chuyển sang Khác"}
                          </button>
                          <div className="h-px bg-gray-100 my-1 mx-1" />
                          <button
                            onClick={(e) => handleClearHistory(e, chat.id)}
                            className="flex items-center gap-3 w-full px-3 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <TrashIcon className="w-4 h-4 text-red-500" />
                            Xoá lịch sử
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <div className="px-2 py-1 flex items-center gap-1 border-b border-gray-100 mb-1">
                            <button
                              onClick={() => setMenuView("main")}
                              className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                            >
                              <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Phân loại
                            </span>
                          </div>
                          <div className="px-1.5 flex flex-col gap-0.5 max-h-48 overflow-y-auto scrollbar-hide">
                            <button
                              onClick={(e) =>
                                handleAssignLabel(e, chat.id, null)
                              }
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />{" "}
                              Không có nhãn
                            </button>
                            {labels.map((l) => (
                              <button
                                key={l._id || l.id}
                                onClick={(e) =>
                                  handleAssignLabel(e, chat.id, l._id || l.id)
                                }
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: l.color }}
                                />{" "}
                                {l.name}
                              </button>
                            ))}
                          </div>
                          <div className="px-1.5 mt-1 border-t border-gray-100 pt-1">
                            <button
                              onClick={() => {
                                setShowManageLabelsModal(true);
                                setOpenMenuId(null);
                              }}
                              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-[12px] font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                            >
                              <PlusIcon className="w-3.5 h-3.5" /> QUẢN LÝ THẺ
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
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

      {showCreateGroupModal && (
        <CreateGroupModal
          onClose={() => setShowCreateGroupModal(false)}
          onSuccess={fetchGroups}
        />
      )}
    </>
  );
}
