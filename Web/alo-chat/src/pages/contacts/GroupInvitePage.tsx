// src/pages/contacts/GroupInvitePage.tsx
import { useState } from "react";
import {
  EnvelopeOpenIcon,
  CheckIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
  ShieldCheckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

// ================= DỮ LIỆU MẪU (MOCK DATA) =================
const initialInvites = [
  {
    id: "inv1",
    groupName: "Cộng đồng UI/UX Việt Nam",
    groupAvatar:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop",
    memberCount: 1204,
    groupType: "Công khai",
    inviterName: "Nguyễn Hoàng Tấn",
    inviterAvatar: "https://i.pravatar.cc/150?img=11",
    message: "Tham gia nhóm để cùng chia sẻ tài nguyên Figma nhé!",
    time: "2 giờ trước",
  },
  {
    id: "inv2",
    name: "Team DevOps Nội Bộ",
    groupName: "Team DevOps Nội Bộ",
    groupAvatar:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=200&auto=format&fit=crop",
    memberCount: 12,
    groupType: "Riêng tư",
    inviterName: "Trần Lê Minh",
    inviterAvatar: "https://i.pravatar.cc/150?img=33",
    message: "Anh em devops vào đây chém gió nha.",
    time: "Hôm qua",
  },
  {
    id: "inv3",
    groupName: "Startup & Công nghệ mới",
    groupAvatar:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=200&auto=format&fit=crop",
    memberCount: 450,
    groupType: "Công khai",
    inviterName: "Sarah Jenkins",
    inviterAvatar: "https://i.pravatar.cc/150?img=5",
    message: "Welcome to the group! We discuss new tech trends here.",
    time: "3 ngày trước",
  },
];

// ================= COMPONENT MODAL XEM CHI TIẾT =================
const InvitePreviewModal = ({ invite, onClose, onAccept, onDecline }: any) => {
  if (!invite) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-sm h-auto flex flex-col rounded-[28px] shadow-2xl overflow-hidden relative animate-in zoom-in-95"
      >
        {/* Cover Ảnh Nhóm (Làm mờ làm nền) */}
        <div className="h-24 relative bg-black shrink-0">
          <img
            src={invite.groupAvatar}
            className="w-full h-full object-cover opacity-50"
            alt="cover"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white transition backdrop-blur-md"
          >
            <XMarkIcon className="w-5 h-5 stroke-2" />
          </button>
        </div>

        <div className="px-6 pb-6 relative flex-1">
          {/* Avatar Nhóm (Hình vuông bo góc) & Avatar người mời (Hình tròn đè lên) */}
          <div className="flex justify-center -mt-12 mb-4 relative">
            <div className="relative">
              <div className="w-24 h-24 rounded-[24px] border-[4px] border-white overflow-hidden shadow-lg bg-white">
                <img
                  src={invite.groupAvatar}
                  className="w-full h-full object-cover"
                  alt="Group"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-[3px] border-white overflow-hidden shadow-md bg-gray-100">
                <img
                  src={invite.inviterAvatar}
                  className="w-full h-full object-cover"
                  alt="Inviter"
                />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="text-center mb-6">
            <h3 className="font-black text-[20px] text-gray-900 tracking-tight leading-tight mb-1">
              {invite.groupName}
            </h3>
            <div className="flex items-center justify-center gap-2 text-[12px] font-bold text-gray-400 uppercase tracking-wide">
              <UserGroupIcon className="w-4 h-4" />
              {invite.memberCount} thành viên
              <span>•</span>
              {invite.groupType === "Riêng tư" ? (
                <ShieldCheckIcon className="w-4 h-4 text-red-400" />
              ) : (
                <ShieldCheckIcon className="w-4 h-4 text-green-500" />
              )}
            </div>
          </div>

          <div className="bg-[#F8F9FA] p-4 rounded-2xl mb-6 relative">
            <div className="absolute -top-2.5 left-4 px-2 bg-[#F8F9FA] text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Lời nhắn từ {invite.inviterName}
            </div>
            <p className="text-[13px] font-medium text-gray-700 italic text-center">
              "{invite.message}"
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <button
              onClick={() => onAccept(invite.id)}
              className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-neutral-800 transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckIcon className="w-5 h-5 stroke-2" /> Tham gia nhóm
            </button>
            <button
              onClick={() => onDecline(invite.id)}
              className="w-full bg-white text-red-500 hover:bg-red-50 py-3 rounded-xl font-bold text-[14px] border border-red-100 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <TrashIcon className="w-5 h-5" /> Từ chối
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================= TRANG CHÍNH =================
export default function GroupInvitePage() {
  const [invites, setInvites] = useState(initialInvites);
  const [selectedInvite, setSelectedInvite] = useState<any>(null);

  const handleAccept = (id: string) => {
    setInvites((prev) => prev.filter((inv) => inv.id !== id));
    setSelectedInvite(null);
    toast.success("Đã tham gia nhóm thành công!");
  };

  const handleDecline = (id: string) => {
    setInvites((prev) => prev.filter((inv) => inv.id !== id));
    setSelectedInvite(null);
    toast("Đã từ chối lời mời vào nhóm");
  };

  return (
    <div className="flex-1 h-screen bg-[#fafafa] p-4 lg:p-6 overflow-y-auto scrollbar-hide">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pb-5 border-b border-gray-200/60">
          <div className="p-2.5 bg-black rounded-2xl text-white shadow-lg">
            <EnvelopeOpenIcon className="w-6 h-6 stroke-2" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-gray-900 tracking-tight">
              Lời mời vào nhóm
            </h1>
            <p className="text-[12px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
              Ông đang có {invites.length} lời mời chờ duyệt
            </p>
          </div>
        </div>

        {/* Empty State */}
        {invites.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-gray-200 shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <EnvelopeOpenIcon className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm font-bold">
              Chưa có ai mời ông vào nhóm nào cả.
            </p>
          </div>
        ) : (
          /* Grid Danh sách lời mời */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {invites.map((invite) => (
              <div
                key={invite.id}
                onClick={() => setSelectedInvite(invite)}
                className="bg-white border-2 border-transparent hover:border-black rounded-[28px] p-5 flex flex-col shadow-sm hover:shadow-xl transition-all cursor-pointer group"
              >
                {/* Dòng Header của Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="relative">
                    {/* Avatar Nhóm bo góc vuông */}
                    <div className="w-14 h-14 rounded-[14px] border border-gray-100 overflow-hidden shadow-sm">
                      <img
                        src={invite.groupAvatar}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    </div>
                    {/* Avatar Người mời bo tròn đè lên */}
                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full border-2 border-white overflow-hidden shadow-sm bg-gray-200">
                      <img
                        src={invite.inviterAvatar}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                    <ClockIcon className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500">
                      {invite.time}
                    </span>
                  </div>
                </div>

                {/* Thông tin */}
                <div className="flex-1">
                  <h3 className="font-black text-[16px] text-gray-900 leading-tight mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {invite.groupName}
                  </h3>
                  <p className="text-[12px] font-medium text-gray-500 mb-3">
                    Được mời bởi{" "}
                    <span className="font-bold text-black">
                      {invite.inviterName}
                    </span>
                  </p>
                  <p className="text-[13px] text-gray-600 italic line-clamp-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    "{invite.message}"
                  </p>
                </div>

                {/* Nút thao tác nhanh (Chặn nổi bọt onClick để không bật Modal) */}
                <div className="flex gap-2 mt-5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAccept(invite.id);
                    }}
                    className="flex-1 bg-black text-white py-2.5 rounded-xl font-bold text-[12px] hover:bg-neutral-800 transition active:scale-95"
                  >
                    Tham gia
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDecline(invite.id);
                    }}
                    className="flex-1 bg-white text-gray-600 py-2.5 rounded-xl font-bold text-[12px] border border-gray-200 hover:border-black hover:text-black transition active:scale-95"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tích hợp Modal ngay trong trang */}
      <InvitePreviewModal
        invite={selectedInvite}
        onClose={() => setSelectedInvite(null)}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </div>
  );
}
