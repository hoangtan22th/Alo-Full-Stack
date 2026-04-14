"use client";
// src/pages/contacts/GroupInvitePage.tsx
import { useEffect, useState } from "react";
import { EnvelopeOpenIcon, CheckIcon, TrashIcon, UserGroupIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import axiosClient from "@/services/api";

export default function GroupInvitePage() {
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      // Giả sử ông có endpoint lấy lời mời cho user hiện tại
      const res: any = await axiosClient.get("/api/v1/groups/invites/me"); 
      setInvites(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleAction = async (groupId: string, action: "approve" | "reject") => {
    try {
      // Dùng endpoint phê duyệt/từ chối từ routes của ông
      if (action === "approve") {
        await axiosClient.post(`/api/v1/groups/${groupId}/join-requests/me/approve`);
        toast.success("Đã tham gia nhóm!");
      } else {
        await axiosClient.delete(`/api/v1/groups/${groupId}/join-requests/me/reject`);
        toast("Đã từ chối lời mời");
      }
      setInvites(prev => prev.filter(inv => inv.groupId !== groupId));
    } catch (err) {
      toast.error("Thao tác thất bại");
    }
  };

  if (loading) return <div className="p-6 text-center text-xs font-bold uppercase text-gray-400">Đang kiểm tra lời mời...</div>;

  return (
    <div className="flex-1 h-screen bg-[#fafafa] p-4 lg:p-6 overflow-y-auto scrollbar-hide">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8 pb-5 border-b border-gray-200">
          <div className="p-2.5 bg-black rounded-2xl text-white shadow-lg">
            <EnvelopeOpenIcon className="w-6 h-6 stroke-2" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-gray-900 tracking-tight">Lời mời vào nhóm</h1>
            <p className="text-[12px] text-gray-500 font-bold uppercase mt-0.5">Ông có {invites.length} lời mời</p>
          </div>
        </div>

        {invites.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-gray-200 shadow-sm flex flex-col items-center">
            <p className="text-gray-400 text-sm font-bold">Không có lời mời nào mới.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {invites.map((invite) => (
              <div key={invite._id} className="bg-white border-2 border-transparent hover:border-black rounded-[28px] p-5 flex flex-col shadow-sm transition-all group">
                <div className="w-14 h-14 rounded-[14px] border border-gray-100 overflow-hidden mb-4 bg-gray-50">
                   <img src={invite.groupAvatar || "/group-default.png"} className="w-full h-full object-cover" alt="" />
                </div>
                <h3 className="font-black text-[16px] text-gray-900 mb-1">{invite.groupName}</h3>
                <p className="text-[12px] text-gray-500 mb-4 italic">"{invite.message || "Mời ông tham gia nhóm"}"</p>
                <div className="flex gap-2">
                  <button onClick={() => handleAction(invite.groupId, "approve")} className="flex-1 bg-black text-white py-2.5 rounded-xl font-bold text-[12px]">Tham gia</button>
                  <button onClick={() => handleAction(invite.groupId, "reject")} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-bold text-[12px]">Từ chối</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}