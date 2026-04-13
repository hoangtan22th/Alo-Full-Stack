"use client";
// src/pages/groups/GroupListPage.tsx
import { useState, useEffect, useCallback } from "react";
import {
  AdjustmentsHorizontalIcon,
  BellSlashIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ArrowRightOnRectangleIcon,
  DocumentIcon,
  DocumentTextIcon,
  TableCellsIcon,
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
const createGroup = async (data: {
  name: string;
  memberIds: string[];
  avatarFile?: File;
}) => {
  try {
    const formData = new FormData();
    formData.append("name", data.name);
    data.memberIds.forEach((id) => formData.append("memberIds", id));
    if (data.avatarFile) formData.append("avatarFile", data.avatarFile);

    const response = await axiosClient.post("/groups", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data: response, error: null };
  } catch (error: any) {
    console.error("createGroup error:", error);
    return {
      data: null,
      error: error.response?.data?.message || error.message || "Lỗi tạo nhóm",
    };
  }
};

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

// Lấy danh sách bạn bè
const getFriends = async () => {
  try {
    const response: any = await axiosClient.get("/contacts/friends");
    const data = response?.data || response;
    return {
      data: Array.isArray(data) ? data : data?.data || data || [],
      error: null,
    };
  } catch (error: any) {
    console.error("getFriends error:", error);
    return { data: [], error: "Không thể tải danh sách bạn bè" };
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
    <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
  </div>
);

// ===========================
// MODAL TẠO NHÓM (FIXED)
// ===========================
const CreateGroupModal = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) => {
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Load current user và friends
  useEffect(() => {
    const loadData = async () => {
      setFriendsLoading(true);

      // Lấy current user
      const userRes: any = await getCurrentUser();
      const user = userRes.data;
      if (user) {
        setCurrentUserId(user.id || user._id || "");
      }

      // Lấy danh sách bạn bè
      const friendsRes = await getFriends();
      if (friendsRes.data && Array.isArray(friendsRes.data)) {
        const uId = user ? user.id || user._id : "";
        const formattedFriends: Friend[] = friendsRes.data.map((f: any) => {
          // Xử lý format mảng trả về (có thể là UserDTO hoặc FriendshipResponseDTO)
          if (f.requesterId && f.recipientId) {
            const isRequester = f.requesterId === uId;
            return {
              id: isRequester ? f.recipientId : f.requesterId,
              fullName: isRequester
                ? f.recipientName || "Người dùng ẩn"
                : f.requesterName || "Người dùng ẩn",
              avatar: isRequester ? f.recipientAvatar : f.requesterAvatar,
            };
          }

          return {
            id: f.id || f._id,
            fullName: f.fullName || f.name || "Unknown",
            avatar: f.avatar,
            email: f.email,
            phone: f.phone,
          };
        });
        setFriends(formattedFriends);
      } else {
        setFriends([]);
      }

      setFriendsLoading(false);
    };

    loadData();
  }, []);

  const toggleFriend = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không được quá 5MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Vui lòng nhập tên nhóm");
      return;
    }
    if (selectedIds.length < 2) {
      setError("Chọn ít nhất 2 bạn bè");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await createGroup({
        name: name.trim(),
        memberIds: selectedIds,
        avatarFile: avatarFile || undefined,
      });

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(`Đã tạo nhóm "${name}" thành công!`);
      onCreated();
      onClose();
    } catch (err: any) {
      console.error("Lỗi tạo nhóm:", err);
      setError(err.message || "Lỗi hệ thống");
      toast.error(err.message || "Lỗi tạo nhóm");
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (f.phone && f.phone.includes(search)),
  );

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden">
      <div className="bg-white rounded-[28px] shadow-2xl flex flex-col w-full max-w-xl max-h-[90vh] overflow-hidden relative">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0 transition-all">
          <h2 className="text-lg font-black text-gray-900">Tạo nhóm mới</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col px-6 py-5 space-y-5">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-3 rounded-xl font-medium shrink-0">
              {error}
            </p>
          )}

          <div className="flex flex-row items-center gap-4 border-b border-gray-100 pb-5 shrink-0">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <label className="cursor-pointer group">
                <div className="w-16 h-16 rounded-[20px] bg-gray-100 overflow-hidden border-2 border-dashed border-gray-300 group-hover:border-black transition flex items-center justify-center">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <CameraIcon className="w-6 h-6 text-gray-400 group-hover:text-black transition" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
              <span className="text-[10px] text-gray-400 font-medium tracking-wide">
                Ảnh nhóm
              </span>
            </div>

            <div className="flex-1">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2 block">
                Tên nhóm *
              </label>
              <input
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
                placeholder="VD: Nhóm bạn thân..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2 relative flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
                Chọn thành viên
              </label>
            </div>

            <div
              className={`flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 mb-3 focus-within:ring-2 focus-within:ring-black transition-all mt-1 relative z-10 shrink-0 ${
                selectedIds.length > 0 ? "w-[calc(50%-16px)]" : "w-full"
              }`}
            >
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                className="bg-transparent flex-1 text-sm font-medium focus:outline-none"
                placeholder="Tìm tên hoặc số điện thoại..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-1 flex-1 min-h-90 overflow-y-auto pr-1">
              {friendsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl animate-pulse transition-all ${
                      selectedIds.length > 0 ? "w-[calc(50%-16px)]" : "w-full"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-gray-200 shrink-0" />
                    <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                    <div className="h-4 w-32 bg-gray-100 rounded" />
                  </div>
                ))
              ) : filteredFriends.length === 0 ? (
                <p
                  className={`text-center text-gray-400 text-sm py-8 font-medium italic transition-all ${
                    selectedIds.length > 0 ? "w-[calc(50%-16px)]" : "w-full"
                  }`}
                >
                  {friends.length === 0
                    ? "Bạn chưa có bạn bè nào để mời."
                    : "Không tìm thấy."}
                </p>
              ) : (
                filteredFriends.map((f) => {
                  const isSelected = selectedIds.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => toggleFriend(f.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all select-none hover:bg-gray-50 text-gray-800 ${
                        selectedIds.length > 0 ? "w-[calc(50%-16px)]" : "w-full"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? "border-black bg-black"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <CheckIcon className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-gray-100">
                        <img
                          src={
                            f.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              f.fullName || "User",
                            )}&background=E5E7EB&color=374151&rounded=true`
                          }
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              f.fullName || "User",
                            )}&background=E5E7EB&color=374151&rounded=true`;
                          }}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      </div>
                      <span className="flex-1 font-bold text-sm truncate">
                        {f.fullName}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* === SLIDING PANEL FOR SELECTED FRIENDS === */}
            <div
              className={`absolute top-0 bottom-0 bg-white shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.05)] border-l border-gray-100 flex flex-col transition-all duration-300 rounded-l-2xl ${
                selectedIds.length > 0
                  ? "w-[calc(50%-16px)] opacity-100 translate-x-0 right-0"
                  : "w-[calc(50%-16px)] opacity-0 translate-x-[110%] absolute pointer-events-none -right-10"
              }`}
            >
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10 shrink-0">
                <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex justify-between items-center">
                  <span>Đã chọn</span>
                  <span className="bg-black text-white px-2.5 py-0.5 rounded-full text-[11px]">
                    {selectedIds.length}
                  </span>
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-gray-50/30">
                {selectedIds.map((id) => {
                  const f = friends.find((fr) => fr.id === id);
                  if (!f) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-3 bg-white p-2.5 rounded-[14px] shadow-sm border border-gray-200/60 group hover:border-red-100 transition-colors"
                    >
                      <img
                        src={
                          f.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            f.fullName || "User",
                          )}&background=E5E7EB&color=374151&rounded=true`
                        }
                        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-100"
                        alt=""
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[12px] text-gray-900 truncate">
                          {f.fullName}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFriend(id)}
                        className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-md transition-colors"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0 relative z-20 bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedIds.length < 2 || !name.trim()}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-black text-white hover:bg-neutral-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? "Đang tạo..."
              : `Tạo nhóm (${selectedIds.length + 1} người)`}
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [userCache, setUserCache] = useState<Record<string, Friend>>({});
  const [showQrModal, setShowQrModal] = useState(false);
  const [joinLink, setJoinLink] = useState("");
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const userRes: any = await getCurrentUser();
      const user = userRes.data;
      if (user) {
        const uId = user.id || user._id || "";
        setCurrentUserId(uId);
        if (uId) {
          setUserCache((prev) => ({
            ...prev,
            [uId]: {
              id: uId,
              fullName: user.fullName || user.name || "Bạn",
              avatar: user.avatar,
              email: user.email,
            },
          }));
        }
      }
    };
    loadUser();
  }, []);

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

  useEffect(() => {
    if (!selectedGroupId) return;

    setRightPanelMode("detail");
    setActiveMemberMenuId(null);
    setDetailLoading(true);
    getGroupById(selectedGroupId)
      .then((res) => {
        if (res.data) setSelectedGroup(res.data as any);
      })
      .finally(() => setDetailLoading(false));
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
          "/users/batch",
          missingUserIds,
        );
        const data = response?.data || response;
        const usersArray = Array.isArray(data) ? data : data?.data || [];

        usersArray.forEach((user: any) => {
          const id = user.id || user._id;
          if (id) {
            newUserCache[id] = {
              id,
              fullName: user.fullName || user.name || "Người dùng ẩn",
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
                      <button
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
                      </button>

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

      {/* RIGHT PANEL - GROUP DETAIL */}
      <div className="hidden lg:flex w-85 flex-col shrink-0 bg-[#F8F9FA] z-10">
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide pb-10">
          {detailLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !selectedGroup ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm font-medium text-center px-4">
              Chọn một nhóm để xem chi tiết
            </div>
          ) : rightPanelMode === "members" ? (
            <>
              {/* MEMBERS TAB */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setRightPanelMode("detail")}
                  className="p-2 hover:bg-gray-200 rounded-full transition text-gray-600"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-black text-gray-900">
                  Thành viên ({selectedGroup.members.length})
                </h2>
              </div>

              <div className="bg-white rounded-3xl p-4 shadow-sm space-y-2 relative">
                {[...selectedGroup.members]
                  .sort((a, b) => {
                    const roleWeights: Record<string, number> = {
                      LEADER: 1,
                      DEPUTY: 2,
                      MEMBER: 3,
                    };
                    const weightA = roleWeights[a.role] || 4;
                    const weightB = roleWeights[b.role] || 4;
                    if (weightA !== weightB) return weightA - weightB;

                    const nameA =
                      userCache[a.userId]?.fullName ||
                      (a.userId === currentUserId ? "Bạn" : "User");
                    const nameB =
                      userCache[b.userId]?.fullName ||
                      (b.userId === currentUserId ? "Bạn" : "User");
                    return nameA.localeCompare(nameB, "vi");
                  })
                  .map((m) => {
                    const userName =
                      m.userId === currentUserId
                        ? "Bạn"
                        : userCache[m.userId]?.fullName || m.userId.slice(-8);

                    // Quyền cho menu: LEADER chỉnh được phó/member; DEPUTY chỉnh được member; KHÔNG chỉnh bản thân
                    const canEdit =
                      m.userId !== currentUserId &&
                      (myRole === "LEADER" ||
                        (myRole === "DEPUTY" && m.role === "MEMBER"));

                    return (
                      <div
                        key={m.userId}
                        className="flex items-center gap-3 group relative p-2 hover:bg-gray-50 rounded-xl transition"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={
                              userCache[m.userId]?.avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=E5E7EB&color=374151&rounded=true`
                            }
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-gray-100 bg-gray-50"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=E5E7EB&color=374151&rounded=true`;
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[14px] font-bold text-gray-800 truncate">
                              {userName}
                            </span>
                          </div>
                          {m.role !== "MEMBER" && (
                            <span className="text-[11px] font-bold text-blue-600 mt-0.5 block">
                              {m.role === "LEADER" ? "Trưởng nhóm" : "Phó nhóm"}
                            </span>
                          )}
                        </div>

                        {canEdit && (
                          <div className="relative shrink-0 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMemberMenuId(
                                  activeMemberMenuId === m.userId
                                    ? null
                                    : m.userId,
                                );
                              }}
                              className={`p-1.5 rounded-full transition ${activeMemberMenuId === m.userId ? "bg-gray-200 text-gray-800" : "text-gray-400 hover:text-gray-800 hover:bg-gray-200 opacity-0 group-hover:opacity-100"}`}
                            >
                              <EllipsisHorizontalIcon className="w-5 h-5" />
                            </button>

                            {activeMemberMenuId === m.userId && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMemberMenuId(null);
                                  }}
                                />
                                <div
                                  className="absolute right-0 top-10 mt-1 w-52 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1 overflow-hidden"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {myRole === "LEADER" &&
                                    m.role === "MEMBER" && (
                                      <button
                                        onClick={() =>
                                          handleUpdateRole(
                                            m.userId,
                                            "DEPUTY",
                                            userName,
                                          )
                                        }
                                        className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50"
                                      >
                                        Trao quyền Phó nhóm
                                      </button>
                                    )}
                                  {myRole === "LEADER" &&
                                    m.role === "DEPUTY" && (
                                      <button
                                        onClick={() =>
                                          handleUpdateRole(
                                            m.userId,
                                            "MEMBER",
                                            userName,
                                          )
                                        }
                                        className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-orange-600 hover:bg-orange-50"
                                      >
                                        Thu hồi quyền Phó nhóm
                                      </button>
                                    )}
                                  {myRole === "LEADER" && (
                                    <button
                                      onClick={() =>
                                        handleUpdateRole(
                                          m.userId,
                                          "LEADER",
                                          userName,
                                        )
                                      }
                                      className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50"
                                    >
                                      Trao quyền Trưởng nhóm
                                    </button>
                                  )}

                                  <button
                                    onClick={() =>
                                      handleRemoveMember(m.userId, userName)
                                    }
                                    className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-red-600 hover:bg-red-50"
                                  >
                                    Xóa khỏi nhóm
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            <>
              {/* DETAIL TAB */}
              <div className="flex flex-col items-center mt-6 mb-8 text-center">
                <div className="w-24 h-24 rounded-3xl overflow-hidden mb-4 shadow-md bg-white p-1">
                  {selectedGroup.groupAvatar ? (
                    <img
                      src={selectedGroup.groupAvatar}
                      alt="avatar"
                      className="w-full h-full object-cover rounded-[20px]"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedGroup.name)}&background=F3F4F6&color=9CA3AF`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full rounded-[20px] bg-gray-100 flex items-center justify-center text-3xl font-black text-gray-400">
                      {selectedGroup.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  {selectedGroup.name}
                </h2>
                <p className="text-xs font-medium text-gray-500 mt-1.5 flex items-center gap-1.5 flex-wrap justify-center">
                  {selectedGroup.members.length} thành viên
                  {myRole && (
                    <span className="bg-black text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                      {myRole === "LEADER"
                        ? "Trưởng"
                        : myRole === "DEPUTY"
                          ? "Phó"
                          : "TV"}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex justify-center gap-3 mb-8">
                {[
                  { icon: BellSlashIcon, label: "Mute" },
                  { icon: MapPinIcon, label: "Pin" },
                  { icon: MagnifyingGlassIcon, label: "Search" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    className="flex flex-col items-center justify-center w-16 h-16 rounded-[20px] bg-gray-200/50 hover:bg-gray-200 transition"
                  >
                    <Icon className="w-5 h-5 text-gray-700 mb-1" />
                    <span className="text-[10px] font-bold text-gray-700">
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Settings - LEADER/DEPUTY only */}
              {(myRole === "LEADER" || myRole === "DEPUTY") && (
                <div className="mb-8 bg-white rounded-3xl p-5 shadow-sm space-y-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                    Cài đặt nhóm
                  </h3>
                  {[
                    {
                      label: "Yêu cầu phê duyệt",
                      value: selectedGroup.isApprovalRequired,
                      toggle: async () => {
                        const res: any = await updateApprovalSetting(
                          selectedGroup._id,
                          !selectedGroup.isApprovalRequired,
                        );
                        if (res.data) setSelectedGroup(res.data as any);
                        else toast.error(res.error || "Lỗi");
                      },
                    },
                    {
                      label: "Tham gia bằng link",
                      value: selectedGroup.isLinkEnabled,
                      toggle: async () => {
                        const res: any = await updateLinkSetting(
                          selectedGroup._id,
                          !selectedGroup.isLinkEnabled,
                        );
                        if (res.data) setSelectedGroup(res.data as any);
                        else toast.error(res.error || "Lỗi");
                      },
                    },
                  ].map(({ label, value, toggle }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-[13px] font-medium text-gray-700">
                        {label}
                      </span>
                      <button
                        onClick={toggle}
                        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                          value ? "bg-black" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                          style={{
                            left: 2,
                            transform: value
                              ? "translateX(20px)"
                              : "translateX(0)",
                          }}
                        />
                      </button>
                    </div>
                  ))}

                  {selectedGroup.isLinkEnabled && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex-1 truncate text-[13px] text-gray-500 font-medium select-all">
                        {joinLink}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(joinLink);
                            toast.success("Đã sao chép link tham gia!");
                          }}
                          className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 transition"
                          title="Sao chép link"
                        >
                          <DocumentDuplicateIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setShowQrModal(true)}
                          className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 transition"
                          title="Mã QR"
                        >
                          <QrCodeIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Members Preview */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-bold text-gray-900">
                    Thành viên ({selectedGroup.members.length})
                  </h3>
                  <button
                    onClick={() => setRightPanelMode("members")}
                    className="text-[12px] font-bold text-blue-600 hover:text-blue-700 transition"
                  >
                    Xem tất cả
                  </button>
                </div>
              </div>

              <button
                onClick={handleLeaveGroup}
                disabled={leaveLoading || myRole === "LEADER"}
                className="w-full border-2 border-red-50 hover:bg-red-50 text-red-500 py-4 rounded-3xl font-bold text-[14px] transition flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                {myRole === "LEADER"
                  ? "Chuyển quyền trước khi rời"
                  : leaveLoading
                    ? "Đang xử lý..."
                    : "Rời khỏi nhóm"}
              </button>

              {myRole === "LEADER" && (
                <button
                  onClick={handleDeleteGroup}
                  disabled={leaveLoading}
                  className="w-full border-2 border-red-100 hover:bg-red-500 hover:text-white text-red-600 mt-3 py-4 rounded-3xl font-bold text-[14px] transition flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <TrashIcon className="w-5 h-5" />
                  {leaveLoading ? "Đang xử lý..." : "Giải tán nhóm"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreated={loadGroups}
        />
      )}

      {showQrModal && selectedGroup && (
        <div
          className="fixed inset-0 z-130 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
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
          className="fixed inset-0 z-140 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
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
