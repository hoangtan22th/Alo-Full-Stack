"use client";
// src/pages/groups/GroupListPage.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AdjustmentsHorizontalIcon,
  BellSlashIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  CameraIcon,
  EllipsisHorizontalIcon,
  ChatBubbleOvalLeftIcon,
  QrCodeIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import axiosClient from "@/services/api";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { useAuthStore } from "@/store/useAuthStore";
import CreateGroupModal from "@/components/ui/group/CreateGroupModal";
import ChatInfoPanel from "@/components/chat/ChatInfoPanel";
import { messageService, MessageDTO } from "@/services/messageService";

// ===========================
// API FUNCTIONS (KHÔNG DÙNG ZUSTAND)
// ===========================

// Lấy danh sách nhóm của tôi
const getMyGroups = async () => {
  try {
    const response: any = await axiosClient.get("/groups/me");
    const data = response?.data || response;
    return {
      data: Array.isArray(data) ? data : data?.data || data || [],
      error: null,
    };
  } catch (error: any) {
    console.error("getMyGroups error:", error);
    return { data: [], error: error.response?.data?.message || "Lỗi tải nhóm" };
  }
};

// Lấy chi tiết nhóm theo ID
const getGroupById = async (groupId: string) => {
  try {
    const response: any = await axiosClient.get(`/groups/${groupId}`);
    const data = response?.data || response;
    return { data: data?.data || data || null, error: null };
  } catch (error: any) {
    console.error("getGroupById error:", error);
    return {
      data: null,
      error: error.response?.data?.message || "Lỗi tải chi tiết",
    };
  }
};

// Rời nhóm
const leaveGroup = async (groupId: string) => {
  try {
    const response = await axiosClient.delete(`/groups/${groupId}/leave`);
    return { data: response, error: null };
  } catch (error: any) {
    console.error("leaveGroup error:", error);
    return {
      data: null,
      error: error.response?.data?.message || "Lỗi rời nhóm",
    };
  }
};

// Giải tán nhóm
const deleteGroup = async (groupId: string) => {
  try {
    const response = await axiosClient.delete(`/groups/${groupId}`);
    return { data: response, error: null };
  } catch (error: any) {
    console.error("deleteGroup error:", error);
    return {
      data: null,
      error: error.response?.data?.message || "Lỗi giải tán nhóm",
    };
  }
};

// Tạo nhóm
// Cập nhật cài đặt phê duyệt
const updateApprovalSetting = async (
  groupId: string,
  isApprovalRequired: boolean,
) => {
  try {
    const response: any = await axiosClient.put(
      `/groups/${groupId}/approval-setting`,
      {
        isApprovalRequired,
      },
    );
    const data = response?.data || response;
    return { data: data?.data || data, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: error.response?.data?.message || "Lỗi cập nhật",
    };
  }
};

// Cập nhật cài đặt link
const updateLinkSetting = async (groupId: string, isLinkEnabled: boolean) => {
  try {
    const response: any = await axiosClient.put(
      `/groups/${groupId}/link-setting`,
      {
        isLinkEnabled,
      },
    );
    const data = response?.data || response;
    return { data: data?.data || data, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: error.response?.data?.message || "Lỗi cập nhật",
    };
  }
};

// Cập nhật quyền thành viên
const updateMemberRole = async (
  groupId: string,
  userId: string,
  newRole: "LEADER" | "DEPUTY" | "MEMBER",
) => {
  try {
    const response: any = await axiosClient.put(
      `/groups/${groupId}/members/${userId}/role`,
      { newRole },
    );
    const data = response?.data || response;
    return { data: data?.data || data, error: null };
  } catch (error: any) {
    return {
      data: null,
      error:
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Lỗi cập nhật quyền",
    };
  }
};

// Xoá thành viên khỏi nhóm
const removeMember = async (groupId: string, userId: string) => {
  try {
    const response: any = await axiosClient.delete(
      `/groups/${groupId}/members/${userId}`,
    );
    const data = response?.data || response;
    return { data: data?.data || data, error: null };
  } catch (error: any) {
    return {
      data: null,
      error:
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Lỗi xoá thành viên",
    };
  }
};

// Lấy thông tin user hiện tại
const getCurrentUser = async () => {
  try {
    const response: any = await axiosClient.get("/auth/me");
    const data = response?.data || response;
    return { data: data?.data || data || null, error: null };
  } catch (error: any) {
    console.error("getCurrentUser error:", error);
    return { data: null, error: "Không thể lấy thông tin user" };
  }
};

// Cập nhật cấu hình nhóm (tổng hợp)
const updateGroupSettings = async (groupId: string, settings: any) => {
  try {
    const response: any = await axiosClient.put(
      `/groups/${groupId}/settings`,
      settings,
    );
    const data = response?.data || response;
    return { data: data?.data || data, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: error.response?.data?.message || "Lỗi cập nhật cấu hình",
    };
  }
};

// ===========================
// INTERFACE
// ===========================
interface IMember {
  userId: string;
  role: "LEADER" | "DEPUTY" | "MEMBER";
  joinedAt: string;
}

interface IGroup {
  _id: string;
  name: string;
  groupAvatar?: string;
  members: IMember[];
  isApprovalRequired: boolean;
  isLinkEnabled: boolean;
  isQuestionEnabled?: boolean;
  membershipQuestion?: string;
  createdAt: string;
  updatedAt: string;
}

interface Friend {
  id: string;
  fullName: string;
  avatar?: string;
  email?: string;
  phone?: string;
}

// ===========================
// SKELETON COMPONENT
// ===========================
const GroupListItemSkeleton = () => (
  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 animate-pulse border border-transparent">
    <div className="w-14 h-14 rounded-full bg-gray-200 shrink-0" />
    <div className="flex-1">
      <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-20 bg-gray-100 rounded" />
    </div>
  </div>
);

// ===========================
// TRANG CHÍNH
// ===========================
export default function GroupListPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<IGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<IGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeMemberMenuId, setActiveMemberMenuId] = useState<string | null>(
    null,
  );
  const [rightPanelMode, setRightPanelMode] = useState<"detail" | "members">(
    "detail",
  );
  const [groupMessages, setGroupMessages] = useState<MessageDTO[]>([]);
  const [userCache, setUserCache] = useState<Record<string, Friend>>({});
  const [showQrModal, setShowQrModal] = useState(false);
  const [joinLink, setJoinLink] = useState("");
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Normalization for ChatInfoPanel
  const normalizedGroup = useMemo(() => {
    if (!selectedGroup) return null;
    return {
      ...selectedGroup,
      id: selectedGroup._id,
      displayName: selectedGroup.name,
      displayAvatar: selectedGroup.groupAvatar,
      isGroup: true,
    };
  }, [selectedGroup]);

  // Load current user
  const { user: authUser } = useAuthStore();
  useEffect(() => {
    if (authUser) {
      const uId = authUser.id || authUser._id || authUser.userId || "";
      setCurrentUserId(uId);
      if (uId) {
        setUserCache((prev) => ({
          ...prev,
          [uId]: {
            id: uId,
            fullName: authUser.fullName || "Bạn",
            avatar: authUser.avatar,
            email: authUser.email,
          },
        }));
      }
    } else {
      getCurrentUser().then((res) => {
        const user = res.data;
        if (user) {
          const uId = user.id || user._id || user.userId || "";
          setCurrentUserId(uId);
          if (uId) {
            setUserCache((prev) => ({
              ...prev,
              [uId]: {
                id: uId,
                fullName: user.fullName || "Bạn",
                avatar: user.avatar,
                email: user.email,
              },
            }));
          }
        }
      });
    }
  }, [authUser]);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res: any = await getMyGroups();
      if (res.error) {
        setError(res.error);
        return;
      }
      const list = res.data || [];
      setGroups(list);
      setSelectedGroupId((prev) => {
        if (!prev && list.length > 0) return list[0]._id;
        return prev;
      });
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách nhóm.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (selectedGroup) {
      // Sử dụng định dạng https://alo.chat/g/{id} để app mobile có thể quét được
      setJoinLink(`https://alo.chat/g/${selectedGroup._id}`);
    }
  }, [selectedGroup]);

  // Load chi tiết nhóm và messages khi chọn
  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedGroupId) {
        setSelectedGroup(null);
        setGroupMessages([]);
        return;
      }

      setDetailLoading(true);
      const res = await getGroupById(selectedGroupId);
      if (res.data) {
        setSelectedGroup(res.data as any);
      }

      // Load messages để hiện Media/Files
      const msgs = await messageService.getMessageHistory(selectedGroupId, 100);
      setGroupMessages(msgs);

      setDetailLoading(false);
    };

    loadDetail();
  }, [selectedGroupId]);

  useEffect(() => {
    if (!selectedGroup) return;

    const fetchUsers = async () => {
      const missingUserIds = selectedGroup.members
        .map((m) => m.userId)
        .filter((id) => !userCache[id]);

      if (missingUserIds.length === 0) return;

      const newUserCache: Record<string, Friend> = {};

      try {
        const response: any = await axiosClient.post(
          "/users/by-ids",
          missingUserIds,
        );
        const data = response?.data || response;
        const usersArray = Array.isArray(data) ? data : data?.data || [];

        usersArray.forEach((user: any) => {
          const id = user.id || user._id;
          if (id) {
            newUserCache[id] = {
              id,
              fullName: user.fullName || "Người dùng ẩn",
              avatar: user.avatar,
              email: user.email,
            };
          }
        });
      } catch (error) {
        console.error(`Không thể lấy thông tin danh sách user`, error);
      }

      if (Object.keys(newUserCache).length > 0) {
        setUserCache((prev) => ({ ...prev, ...newUserCache }));
      }
    };

    fetchUsers();
  }, [selectedGroup, currentUserId]);

  const handleLeaveGroup = async () => {
    if (!selectedGroupId) return;
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận rời nhóm",
      message: "Bạn có chắc muốn rời khỏi nhóm này?",
      onConfirm: async () => {
        setLeaveLoading(true);
        try {
          const res: any = await leaveGroup(selectedGroupId);
          if (res.error) {
            toast.error(res.error);
            return;
          }
          toast.success("Đã rời nhóm");
          setSelectedGroupId(null);
          setSelectedGroup(null);
          loadGroups();
        } finally {
          setLeaveLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleLeaveGroupFromMenu = async (groupId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận rời nhóm",
      message: "Bạn có chắc muốn rời khỏi nhóm này?",
      onConfirm: async () => {
        setLeaveLoading(true);
        try {
          const res: any = await leaveGroup(groupId);
          if (res.error) {
            toast.error(res.error);
            return;
          }
          toast.success("Đã rời nhóm");
          if (selectedGroupId === groupId) {
            setSelectedGroupId(null);
            setSelectedGroup(null);
          }
          loadGroups();
        } finally {
          setLeaveLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận giải tán nhóm",
      message:
        "Bạn có chắc chắn muốn giải tán nhóm này? Hành động này không thể hoàn tác.",
      onConfirm: async () => {
        setLeaveLoading(true);
        try {
          const res: any = await deleteGroup(selectedGroupId);
          if (res.error) {
            toast.error(res.error);
            return;
          }
          toast.success("Đã giải tán nhóm thành công");
          setSelectedGroupId(null);
          setSelectedGroup(null);
          loadGroups();
        } finally {
          setLeaveLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleUpdateRole = async (
    userId: string,
    newRole: "LEADER" | "DEPUTY" | "MEMBER",
    userName: string,
  ) => {
    if (!selectedGroupId) return;

    let title = "";
    let message = "";
    let successMsg = "";

    if (newRole === "LEADER") {
      title = "Chuyển quyền trưởng nhóm";
      message = `Bạn có chắc muốn chuyển quyền trưởng nhóm cho ${userName}? Bạn sẽ trở thành thành viên thường.`;
      successMsg = "Đã chuyển quyền trưởng nhóm thành công";
    } else if (newRole === "DEPUTY") {
      title = "Trao quyền phó nhóm";
      message = `Bạn có chắc muốn trao quyền phó nhóm cho ${userName}?`;
      successMsg = "Đã trao quyền phó nhóm thành công";
    } else {
      title = "Thu hồi phó nhóm";
      message = `Bạn có chắc muốn thu hồi quyền phó nhóm của ${userName}?`;
      successMsg = "Đã thu hồi quyền phó nhóm";
    }

    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        setLeaveLoading(true);
        try {
          const res = await updateMemberRole(selectedGroupId, userId, newRole);
          if (res.error) {
            toast.error(res.error);
          } else {
            toast.success(successMsg);
            getGroupById(selectedGroupId).then(
              (r) => r.data && setSelectedGroup(r.data as any),
            );
            setActiveMemberMenuId(null);
          }
        } finally {
          setLeaveLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!selectedGroupId) return;
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận xoá",
      message: `Bạn có chắc muốn xoá ${userName} khỏi nhóm?`,
      onConfirm: async () => {
        setLeaveLoading(true);
        try {
          const res = await removeMember(selectedGroupId, userId);
          if (res.error) {
            toast.error(res.error);
          } else {
            toast.success(`Đã xoá ${userName} khỏi nhóm`);
            getGroupById(selectedGroupId).then(
              (r) => r.data && setSelectedGroup(r.data as any),
            );
            setActiveMemberMenuId(null);
          }
        } finally {
          setLeaveLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const myRole = selectedGroup?.members.find(
    (m) => m.userId === currentUserId,
  )?.role;

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      {/* LEFT PANEL - GROUP LIST */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 border-r border-gray-100 scrollbar-hide">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-black mb-1">
                Danh sách nhóm
              </h1>
              <p className="text-sm font-medium text-gray-500">
                {loading ? "Đang tải..." : `${groups.length} nhóm của bạn`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-full text-sm font-bold hover:bg-neutral-800 transition shadow-md"
              >
                <PlusIcon className="w-4 h-4" /> Tạo nhóm
              </button>
              <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <GroupListItemSkeleton key={i} />
              ))
            ) : groups.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-4xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 text-sm font-bold">
                  Bạn chưa tham gia nhóm nào.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-6 py-2.5 bg-black text-white rounded-full text-sm font-bold hover:bg-neutral-800 transition"
                >
                  Tạo nhóm đầu tiên
                </button>
              </div>
            ) : (
              groups.map((group) => {
                const isSelected = group._id === selectedGroupId;
                const myMember = group.members.find(
                  (m) => m.userId === currentUserId,
                );
                return (
                  <div
                    key={group._id}
                    onClick={() => setSelectedGroupId(group._id)}
                    className={`relative p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all duration-200 group/item ${
                      isSelected
                        ? "bg-gray-100 border border-gray-200"
                        : "bg-white hover:bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-white border border-gray-200 relative">
                      {group.groupAvatar ? (
                        <img
                          src={group.groupAvatar}
                          alt={group.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=F3F4F6&color=9CA3AF`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-black text-gray-400">
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[16px] text-gray-900 mb-0.5 truncate tracking-tight">
                        {group.name}
                      </h3>
                      <p className="text-[13px] text-gray-500 font-medium truncate">
                        {group.members.length} thành viên
                      </p>
                    </div>

                    <div className="relative flex shrink-0 items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/chat/${group._id}`);
                        }}
                        className="p-2 rounded-full text-gray-400 hover:text-blue-500 hover:bg-gray-100 transition-colors"
                        title="Nhắn tin"
                      >
                        <ChatBubbleOvalLeftIcon className="w-5 h-5" />
                      </button>
                      {/* <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(
                            activeMenuId === group._id ? null : group._id,
                          );
                        }}
                        className={`p-2 rounded-full transition-colors ${
                          activeMenuId === group._id
                            ? "bg-gray-200 text-black"
                            : "text-gray-400 hover:text-black hover:bg-gray-200"
                        }`}
                      >
                        <EllipsisHorizontalIcon className="w-6 h-6" />
                      </button> */}

                      {activeMenuId === group._id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                            }}
                          />
                          <div
                            className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                toast.info(
                                  "Chức năng Phân loại nhóm đang phát triển",
                                );
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition"
                            >
                              Phân loại nhóm
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                handleLeaveGroupFromMenu(group._id);
                              }}
                              className="w-full text-left px-4 py-2.5 text-[14px] font-medium text-red-600 hover:bg-red-50 transition"
                            >
                              Rời nhóm
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Replaced with ChatInfoPanel for consistency */}
      <div className="hidden lg:block">
        <ChatInfoPanel
          show={!!selectedGroup}
          conversationId={selectedGroup?._id || ""}
          conversationInfo={normalizedGroup}
          messages={groupMessages}
          currentUser={authUser}
          userCache={Object.entries(userCache).reduce(
            (acc, [id, f]) => ({
              ...acc,
              [id]: { name: f.fullName, avatar: f.avatar },
            }),
            {},
          )}
          onClose={() => setSelectedGroupId(null)}
          onClearHistory={() =>
            toast.info("Tính năng này chỉ khả dụng trong phòng chat")
          }
          onLeaveGroup={handleLeaveGroup}
          onDisbandGroup={handleDeleteGroup}
          onRemoveMember={(userId) =>
            handleRemoveMember(
              userId,
              userCache[userId]?.fullName || "Thành viên",
            )
          }
          onUpdateRole={(userId, role) =>
            handleUpdateRole(
              userId,
              role as any,
              userCache[userId]?.fullName || "Thành viên",
            )
          }
          onAssignLeader={(userId) =>
            handleUpdateRole(
              userId,
              "LEADER",
              userCache[userId]?.fullName || "Thành viên",
            )
          }
          onRefreshData={async () => {
            if (selectedGroupId) {
              const res = await getGroupById(selectedGroupId);
              if (res.data) setSelectedGroup(res.data as any);
            }
            loadGroups();
          }}
        />
      </div>

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadGroups}
        />
      )}

      {showQrModal && selectedGroup && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-4">
              <QrCodeIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">
              Mã QR tham gia nhóm
            </h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">
              Quét mã này bằng ứng dụng di động để tham gia nhóm{" "}
              <b>{selectedGroup.name}</b>
            </p>
            <div className="w-56 h-56 bg-white rounded-2xl border-2 border-gray-100 p-2 mb-6 flex items-center justify-center overflow-hidden">
              <QRCode
                size={256}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                value={joinLink || " "}
                viewBox={`0 0 256 256`}
              />
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-xl transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() =>
            !leaveLoading &&
            setConfirmModal((prev) => ({ ...prev, isOpen: false }))
          }
        >
          <div
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full flex flex-col text-center items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-gray-900 mb-2">
              {confirmModal.title}
            </h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">
              {confirmModal.message}
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                disabled={leaveLoading}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
              >
                Hủy
              </button>
              <button
                onClick={confirmModal.onConfirm}
                disabled={leaveLoading}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white transition disabled:opacity-50"
              >
                {leaveLoading ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
