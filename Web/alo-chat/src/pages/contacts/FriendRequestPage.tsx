import { useEffect, useState } from "react";
import axiosClient from "../../config/axiosClient";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import RequestPreviewModal from "@/components/ui/RequestPreviewModal";
import FriendProfileModal from "@/components/ui/FriendProfileModal";

export default function FriendRequestPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State quản lý Modal Preview (Đồng ý/Từ chối)
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // State quản lý Modal Profile chi tiết
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(
    null,
  );

  const fetchRequests = async () => {
    try {
      // Gọi API lấy danh sách lời mời đang chờ
      const res: any = await axiosClient.get("/contacts/pending");
      // Rút trích data an toàn từ ApiResponse
      const data = res?.data?.data || res?.data || res || [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Lỗi lấy danh sách lời mời:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    requestId: string,
    actionType: "ACCEPT" | "DECLINE",
  ) => {
    try {
      const baseUrl = `/contacts/${requestId}`;
      if (actionType === "ACCEPT") {
        // Gọi API chấp nhận kết bạn
        await axiosClient.put(`${baseUrl}/accept`);
      } else {
        // Gọi API từ chối (xóa) lời mời
        await axiosClient.delete(`${baseUrl}/decline`);
      }
      // Cập nhật lại danh sách tại chỗ và đóng Modal
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      setSelectedRequest(null);
    } catch (err) {
      alert("Thao tác thất bại, Tấn kiểm tra lại log nhé!");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading)
    return <div className="p-8 text-center font-bold">Đang tải lời mời...</div>;

  return (
    <div className="flex-1 min-h-screen bg-[#fafafa] p-4 md:p-8 overflow-y-auto font-sans text-black">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10 pb-6 border-b border-gray-200">
        <div className="p-3 bg-black rounded-2xl text-white shadow-lg">
          <UserPlusIcon className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-[24px] font-extrabold tracking-tight">
            Lời mời kết bạn
          </h2>
          <p className="text-sm text-gray-500 font-medium">
            Bạn đang có{" "}
            <span className="text-black font-bold">{requests.length}</span> yêu
            cầu kết nối
          </p>
        </div>
      </div>

      {/* Danh sách lời mời (Dạng danh sách rút gọn) */}
      {requests.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-medium">
            Hiện không có lời mời nào mới, Tấn ơi!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {requests.map((req: any) => (
            <div
              key={req.id}
              onClick={() => setSelectedRequest(req)} // Bấm vào để mở Preview Modal
              className="bg-white border border-gray-100 rounded-[32px] p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
            >
              {/* Avatar lấy từ dữ liệu đã làm giàu */}
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-50 shrink-0 shadow-inner">
                <img
                  src={
                    req.requesterAvatar ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${req.requesterName}`
                  }
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-[16px] text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {req.requesterName || "Người dùng ẩn danh"}
                </h3>
                <p className="text-[13px] text-gray-400 font-medium line-clamp-1 mt-0.5">
                  "{req.greetingMessage || "Muốn kết nối với bạn"}"
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 1. Modal Preview (Đồng ý/Từ chối + Nút Xem Profile phụ) */}
      <RequestPreviewModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onAccept={(id: string) => handleAction(id, "ACCEPT")}
        onDecline={(id: string) => handleAction(id, "DECLINE")}
        onViewProfile={() => {
          setProfileModalUserId(selectedRequest.requesterId);
          setSelectedRequest(null); // Đóng Preview để mở Profile chính
        }}
      />

      {/* 2. Modal Profile chi tiết (Chỉ hiện khi bấm "Xem hồ sơ" từ Preview) */}
      <FriendProfileModal
        isOpen={!!profileModalUserId}
        onClose={() => setProfileModalUserId(null)}
        userId={profileModalUserId}
        relationStatus="THEY_SENT_REQUEST" // Status cố định cho trang này
      />
    </div>
  );
}
