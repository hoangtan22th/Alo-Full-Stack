import { useEffect, useState } from "react";
import axios from "axios";
import { UserPlusIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";

export default function FriendRequestPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("accessToken");

  const fetchRequests = async () => {
    try {
      const res = await axios.get(
        "http://localhost:8888/api-gateway/contact-service/api/contacts/pending",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // Backend trả về ApiResponse<List<FriendshipResponseDTO>>
      // nên phải lấy res.data.data
      setRequests(res.data.data || []);
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
      const baseUrl = `http://localhost:8888/api-gateway/contact-service/api/contacts/${requestId}`;
      if (actionType === "ACCEPT") {
        await axios.put(
          `${baseUrl}/accept`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } else {
        await axios.delete(`${baseUrl}/decline`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
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

      {/* Danh sách lời mời */}
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
              className="bg-white border border-gray-100 rounded-[32px] p-6 flex flex-col items-center shadow-sm hover:shadow-md transition-all border-b-4 border-b-gray-50 active:scale-[0.98]"
            >
              {/* Avatar thật lấy từ Auth Service */}
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#f3f3f3] shadow-inner">
                  <img
                    src={
                      req.requesterAvatar ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${req.requesterName}`
                    }
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute bottom-1 right-1 bg-blue-500 text-white p-1 rounded-full border-2 border-white">
                  <CheckBadgeIcon className="w-4 h-4" />
                </div>
              </div>

              {/* Tên người dùng đã được làm giàu dữ liệu */}
              <h3 className="font-extrabold text-[18px] text-gray-900 mb-1">
                {req.requesterName || "Người dùng ẩn danh"}
              </h3>

              <p className="text-[13px] text-gray-400 font-bold uppercase tracking-widest mb-4">
                Muốn kết nối với bạn
              </p>

              <div className="bg-[#f9f9f9] w-full rounded-2xl p-4 mb-6 relative">
                <p className="text-[14px] text-gray-600 leading-relaxed italic text-center">
                  "{req.greetingMessage || "Kết bạn nhé!"}"
                </p>
              </div>

              <div className="flex gap-3 w-full mt-auto">
                <button
                  onClick={() => handleAction(req.id, "ACCEPT")}
                  className="flex-1 bg-black text-white py-3.5 rounded-2xl font-bold text-[14px] hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                >
                  Chấp nhận
                </button>
                <button
                  onClick={() => handleAction(req.id, "DECLINE")}
                  className="flex-1 bg-[#f3f3f3] text-gray-500 py-3.5 rounded-2xl font-bold text-[14px] hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                >
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
