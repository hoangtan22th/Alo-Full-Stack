"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axiosClient from "@/services/api";
import { groupService } from "@/services/groupService";
import NewDirectChatModal from "@/components/ui/NewDirectChatModal";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Bars3BottomRightIcon,
  FaceSmileIcon,
  EllipsisHorizontalIcon,
  TagIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
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

// --- Main Component: ChatPage ---
export default function ChatPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Ưu tiên");
  const [activeChat, setActiveChat] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Labels states
  const [labels, setLabels] = useState<any[]>([]);
  const [labelAssignments, setLabelAssignments] = useState<Record<string, any>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuView, setMenuView] = useState<"main" | "labels">("main");
  const [showManageLabelsModal, setShowManageLabelsModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Click outside to close menu
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

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchGroups(), fetchLabelsInfo()]);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLabelsInfo = async () => {
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
  };

  const fetchGroups = async () => {
    try {
      const userRes: any = await axiosClient.get("/auth/me");
      const user = userRes?.data || userRes;
      const currentUserId = user?.id || user?._id || user?.userId;

      let groups: any = await axiosClient.get("/groups/me", {
        params: { type: "all" },
      });

      if (groups?.data?.data) {
        groups = groups.data.data;
      } else if (groups?.data) {
        groups = groups.data;
      }

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
              message: "Chưa có tin nhắn",
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
    }
  };

  const handleAssignLabel = async (e: React.MouseEvent, conversationId: string, labelId: string | null) => {
    e.stopPropagation();
    try {
      await groupService.assignLabel(conversationId, labelId);
      
      const newAssignments = { ...labelAssignments };
      if (!labelId) {
        delete newAssignments[conversationId];
      } else {
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
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all group relative ${
                  activeChat === chat.id ? "bg-[#F5F5F5]" : "hover:bg-gray-50 border border-transparent hover:border-gray-100"
                }`}
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
                  {chat.online && (
                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <h3 className="font-bold text-[14px] truncate text-gray-900">
                        {chat.name}
                      </h3>
                      {labelAssignments[chat.id] && (
                        <span 
                          className="px-1.5 py-0.5 rounded-full text-[9px] font-black text-white shrink-0 uppercase tracking-tighter shadow-sm"
                          style={{ backgroundColor: labelAssignments[chat.id].color }}
                        >
                          {labelAssignments[chat.id].name}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 shrink-0">
                      {chat.time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center h-5">
                    <p className="text-[13px] text-gray-500 truncate font-medium flex-1">
                      {chat.message}
                    </p>
                    
                    {/* Menu Trigger */}
                    <button
                      onClick={(e) => toggleMenu(e, chat.id)}
                      className="md:opacity-0 group-hover:opacity-100 p-1 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400 hover:text-black"
                    >
                      <EllipsisHorizontalIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Dropdown Menu - Refined multi-level */}
                {openMenuId === chat.id && (
                  <div 
                    ref={menuRef}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-3 top-13 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-[60] animate-in fade-in zoom-in duration-150"
                  >
                    {menuView === "main" ? (
                      <div className="flex flex-col p-1">
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
                        <div className="mt-1 pt-1 border-t border-gray-50">
                           <button className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] font-bold text-gray-300 cursor-not-allowed italic">
                            <div className="w-5 h-5 rounded-full border border-gray-200 border-dashed" />
                            Tính năng khác...
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="px-2 py-1 flex items-center gap-1 border-b border-gray-50 mb-1">
                           <button 
                            onClick={() => setMenuView("main")}
                            className="p-1 px-2 hover:bg-gray-50 rounded-lg text-gray-400"
                           >
                              <ChevronLeftIcon className="w-4 h-4" />
                           </button>
                           <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Chọn nhãn</span>
                        </div>
                        <div className="max-h-56 overflow-y-auto p-1 scrollbar-hide">
                          {labels.map((label) => (
                            <button
                              key={label._id || label.id}
                              onClick={(e) => handleAssignLabel(e, chat.id, label._id || label.id)}
                              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-[13px] hover:bg-gray-50 rounded-xl transition-colors group/label"
                            >
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                                  style={{ backgroundColor: label.color }}
                                />
                                <span className={`${labelAssignments[chat.id]?._id === (label._id || label.id) ? "font-black text-black" : "text-gray-600 font-bold"}`}>
                                  {label.name}
                                </span>
                              </div>
                              {labelAssignments[chat.id]?._id === (label._id || label.id) && (
                                <div className="w-1.5 h-1.5 bg-black rounded-full" />
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-50 mt-1 p-1">
                          <button
                            onClick={(e) => handleAssignLabel(e, chat.id, null)}
                            className="w-full text-left px-3 py-2 text-[12px] font-bold text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"
                          >
                            Gỡ nhãn hiện tại
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowManageLabelsModal(true); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-black text-blue-600 hover:bg-blue-50 rounded-xl transition-colors mt-0.5"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            Phân loại trò chuyện
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

      {/* Modal Quản lý nhãn */}
      <ManageLabelsModal 
        isOpen={showManageLabelsModal}
        onClose={() => setShowManageLabelsModal(false)}
        labels={labels}
        onRefresh={fetchLabelsInfo}
      />
    </div>
  );
}
