import { useEffect, useState } from "react";
import axiosClient from "../../config/axiosClient";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import RequestPreviewModal from "@/components/ui/RequestPreviewModal";
import FriendProfileModal from "@/components/ui/FriendProfileModal";
import { toast } from "sonner";

export default function FriendRequestPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(
    null,
  );

  const fetchRequests = async () => {
    try {
      const data: any = await axiosClient.get("/contacts/pending");
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (
    requestId: string,
    actionType: "ACCEPT" | "DECLINE",
  ) => {
    try {
      // FIX: Khớp với endpoint /{friendshipId}/accept và /{friendshipId}/decline
      if (actionType === "ACCEPT")
        await axiosClient.put(`/contacts/${requestId}/accept`);
      else await axiosClient.delete(`/contacts/${requestId}/decline`);

      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      setSelectedRequest(null);
      toast.success(
        actionType === "ACCEPT" ? "Đã chấp nhận kết bạn" : "Đã từ chối lời mời",
      );
    } catch (err) {
      toast.error("Thao tác thất bại");
    }
  };

  if (loading)
    return <div className="p-6 text-center text-xs font-bold">Đang tải...</div>;

  return (
    <div className="flex-1 h-screen bg-[#fafafa] p-4 lg:p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="p-2 bg-black rounded-xl text-white shadow-lg">
            <UserPlusIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900">
              Lời mời kết bạn
            </h2>
            <p className="text-[11px] text-gray-500 font-bold uppercase">
              Bạn có {requests.length} yêu cầu chờ duyệt
            </p>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[20px] border border-dashed border-gray-200 shadow-sm">
            <p className="text-gray-400 text-xs italic">
              Hiện tại không có lời mời nào mới.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {requests.map((req: any) => (
              <div
                key={req.id}
                onClick={() => setSelectedRequest(req)}
                className="bg-white border border-gray-50 hover:border-black rounded-[20px] p-3.5 flex items-center gap-3 shadow-sm hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100 bg-black shrink-0">
                  <img
                    src={req.requesterAvatar || "/avt-mac-dinh.jpg"}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[14px] text-gray-900 truncate">
                    {req.requesterName}
                  </h3>
                  <p className="text-[11px] text-gray-400 truncate italic">
                    "{req.greetingMessage || "Muốn kết bạn"}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RequestPreviewModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onAccept={(id: string) => handleAction(id, "ACCEPT")}
        onDecline={(id: string) => handleAction(id, "DECLINE")}
        onViewProfile={() => {
          setProfileModalUserId(selectedRequest.requesterId);
          setSelectedRequest(null);
        }}
      />
      <FriendProfileModal
        isOpen={!!profileModalUserId}
        onClose={() => setProfileModalUserId(null)}
        userId={profileModalUserId}
        relationStatus="THEY_SENT_REQUEST"
        onActionSuccess={fetchRequests}
      />
    </div>
  );
}
