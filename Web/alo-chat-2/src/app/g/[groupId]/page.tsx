"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { groupService } from "@/services/groupService";
import { toast } from "sonner";
import { Loader2, Users, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface MemberInfo {
  userId: string;
  name: string;
  avatar?: string;
  role: string;
}

interface GroupInfo {
  _id: string;
  name: string;
  avatar?: string;
  members: MemberInfo[];
  isApprovalRequired?: boolean;
  isLinkEnabled?: boolean;
}

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params?.groupId as string;

  const { user, isAuthenticated, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinedStatus, setJoinedStatus] = useState<"none" | "joined" | "pending">("none");

  // Fetch user profile on mount to ensure auth state is sync'd
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token && !user) {
        fetchProfile().catch(() => {});
      }
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    if (!groupId) return;

    const loadGroupInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await groupService.getGroupInfoForLink(groupId);
        const groupData = res.data || res;
        
        if (groupData) {
          if (groupData.isLinkEnabled === false) {
            setError("Liên kết tham gia nhóm này đã bị vô hiệu hóa bởi Quản trị viên.");
          } else {
            setGroup(groupData);
            // Check if current user is already a member
            if (user) {
              const currentUserId = user.id || user._id;
              const isMember = groupData.members?.some(
                (m: any) => m.userId?.toString() === currentUserId?.toString()
              );
              if (isMember) {
                setJoinedStatus("joined");
              }
            }
          }
        } else {
          setError("Không tìm thấy thông tin nhóm.");
        }
      } catch (err: any) {
        console.error("Lỗi tải thông tin nhóm:", err);
        setError(err.response?.data?.error || "Không thể tải thông tin nhóm. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    loadGroupInfo();
  }, [groupId, user]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/g/${groupId}`);
      return;
    }

    try {
      setJoining(true);
      const res = await groupService.requestJoinGroup(groupId);
      const data = res.data || res;
      
      if (data?.joined) {
        toast.success("Tham gia nhóm thành công!");
        setJoinedStatus("joined");
        setTimeout(() => {
          router.push(`/chat/${groupId}`);
        }, 1500);
      } else {
        toast.success("Đã gửi yêu cầu tham gia nhóm, vui lòng chờ duyệt!");
        setJoinedStatus("pending");
      }
    } catch (err: any) {
      console.error("Lỗi tham gia nhóm:", err);
      toast.error(err.response?.data?.error || "Có lỗi xảy ra khi tham gia nhóm.");
    } finally {
      setJoining(false);
    }
  };

  const getGroupAvatar = () => {
    if (group?.avatar) {
      if (group.avatar.startsWith("http") || group.avatar.startsWith("data:")) {
        return group.avatar;
      }
      return `http://localhost:8888${group.avatar.startsWith("/") ? "" : "/"}${group.avatar}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-500 font-medium text-sm">Đang tải thông tin nhóm...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Không thể tham gia nhóm</h1>
            <p className="text-gray-500 text-sm leading-relaxed">{error}</p>
          </div>
          <Link
            href="/chat"
            className="inline-flex items-center justify-center w-full bg-gray-950 text-white py-3.5 px-6 rounded-full font-semibold hover:bg-gray-800 transition-colors shadow-lg active:scale-95 duration-150 text-sm"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const avatarUrl = getGroupAvatar();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white/95 border border-white/60 rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] backdrop-blur-md relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Decorative background gradients */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col items-center text-center space-y-6">
          {/* Logo badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5" />
            Lời mời tham gia nhóm
          </div>

          {/* Group Avatar */}
          <div className="relative">
            {avatarUrl ? (
              <div className="w-24 h-24 rounded-[24px] overflow-hidden shadow-md border-2 border-white ring-4 ring-blue-50">
                <img
                  src={avatarUrl}
                  alt={group?.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).onerror = null;
                    (e.target as HTMLImageElement).src =
                      "https://ui-avatars.com/api/?name=Group&background=E5E7EB&color=374151&rounded=true";
                  }}
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-[24px] flex items-center justify-center text-white text-3xl font-bold shadow-md border-2 border-white ring-4 ring-blue-50">
                {group?.name?.charAt(0).toUpperCase() || "G"}
              </div>
            )}
          </div>

          {/* Group Name & Members count */}
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight px-2 leading-tight">
              {group?.name}
            </h1>
            <p className="text-gray-500 text-sm font-semibold flex items-center justify-center gap-1.5">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{group?.members?.length || 0} thành viên</span>
            </p>
          </div>

          <div className="w-full border-t border-gray-100 my-2" />

          {/* Action buttons */}
          <div className="w-full space-y-3">
            {joinedStatus === "joined" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Bạn đã là thành viên của nhóm
                </div>
                <button
                  onClick={() => router.push(`/chat/${groupId}`)}
                  className="w-full bg-gray-950 text-white py-4 rounded-full font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 text-sm"
                >
                  Vào trò chuyện
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : joinedStatus === "pending" ? (
              <div className="flex items-center justify-center gap-2 p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 font-semibold text-sm">
                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                Đã gửi yêu cầu tham gia, vui lòng chờ duyệt
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 rounded-full font-bold transition-all shadow-lg shadow-blue-500/10 active:scale-98 flex items-center justify-center gap-2 text-sm"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tham gia...
                  </>
                ) : isAuthenticated ? (
                  group?.isApprovalRequired ? (
                    "Yêu cầu tham gia nhóm"
                  ) : (
                    "Tham gia nhóm ngay"
                  )
                ) : (
                  "Đăng nhập để tham gia nhóm"
                )}
                {!joining && <ArrowRight className="w-4 h-4" />}
              </button>
            )}

            {!isAuthenticated && (
              <p className="text-xs text-gray-400 font-medium">
                Bạn chưa đăng nhập?{" "}
                <Link
                  href={`/login?redirect=/g/${groupId}`}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Đăng nhập tại đây
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
