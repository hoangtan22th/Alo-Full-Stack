"use client";
import { useEffect, useState } from "react";
import axiosClient from "@/services/api";
import { PaperAirplaneIcon, TrashIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import FriendProfileModal from "@/components/ui/FriendProfileModal";

export default function FriendSentRequestPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(
    null,
  );

  const fetchSentRequests = async () => {
    try {
      setLoading(true);
      const res: any = await axiosClient.get("/contacts/sent");
      setRequests(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải lời mời đã gửi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentRequests();
  }, []);

  const handleRevoke = async (recipientId: string) => {
    try {
      await axiosClient.delete(`/contacts/request/revoke/${recipientId}`);
      setRequests((prev) =>
        prev.filter((req) => req.recipientId !== recipientId),
      );
      toast.success("Đã thu hồi lời mời kết bạn");
    } catch (err) {
      toast.error("Thu hồi thất bại");
    }
  };

  if (loading)
    return (
      <div className="p-6 text-center text-xs font-bold uppercase text-gray-400">
        Đang tải...
      </div>
    );

  return (
    <div className="flex-1 h-screen bg-[#fafafa] p-4 lg:p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="p-2 bg-black rounded-xl text-white shadow-lg">
            <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900">Lời mời đã gửi</h2>
            <p className="text-[11px] text-gray-500 font-bold uppercase text-gray-400">
              Ông đang chờ {requests.length} người phản hồi
            </p>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[24px] border border-dashed border-gray-200 shadow-sm">
            <p className="text-gray-400 text-xs italic">
              Ông chưa gửi lời mời nào gần đây.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {requests.map((req: any) => (
              <div
                key={req.id}
                className="bg-white border border-gray-100 hover:border-black rounded-[24px] p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all group"
              >
                <div
                  onClick={() => setProfileModalUserId(req.recipientId)}
                  className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-gray-100 bg-gray-50 shrink-0">
                    <img
                      src={req.recipientAvatar || "/avt-mac-dinh.jpg"}
                      className="w-full h-full object-cover"
                      alt=""
                      onError={(e) =>
                        (e.currentTarget.src = "/avt-mac-dinh.jpg")
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[14px] text-gray-900 truncate">
                      {req.recipientName}
                    </h3>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">
                      Đang chờ phản hồi...
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRevoke(req.recipientId);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
                  title="Thu hồi lời mời"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <FriendProfileModal
        isOpen={!!profileModalUserId}
        onClose={() => setProfileModalUserId(null)}
        userId={profileModalUserId}
        relationStatus="I_SENT_REQUEST" // ✅ Truyền I_SENT_REQUEST để Modal hiện nút Huỷ
        onActionSuccess={fetchSentRequests}
      />
    </div>
  );
}
