import { useEffect, useState } from "react";
import axios from "axios";
import { UserPlusIcon } from "@heroicons/react/24/outline";

export default function FriendRequestPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("accessToken");

  // Hàm lấy danh sách đang chờ (giữ nguyên)
  const fetchRequests = async () => {
    try {
      const res = await axios.get(
        "http://localhost:8888/api-gateway/contact-service/api/contacts/pending",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setRequests(res.data.data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách lời mời:", err);
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý Đồng ý / Từ chối gọi theo API mới
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
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        alert("Đã trở thành bạn bè!");
      } else {
        await axios.delete(`${baseUrl}/decline`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Đã từ chối lời mời.");
      }

      // Ảo thuật UI: Lọc cái thẻ vừa bấm ra khỏi danh sách để nó biến mất ngay lập tức
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      console.error("Lỗi thao tác:", err);
      alert("Có lỗi xảy ra, vui lòng thử lại sau!");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) return <div className="p-8">Đang tải...</div>;

  return (
    <div className="flex-1 h-screen bg-[#fafafa] p-8 overflow-y-auto">
      <div className="flex items-center gap-4 mb-8 pb-4 border-b">
        <div className="p-2.5 bg-gray-100 rounded-full text-black">
          <UserPlusIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-[20px] font-bold">Lời mời kết bạn</h2>
          <p className="text-sm text-gray-500">
            Bạn có {requests.length} yêu cầu đang chờ
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {requests.map((req: any) => (
          <div
            key={req.id}
            className="bg-white border rounded-[2rem] p-6 flex flex-col items-center text-center shadow-sm"
          >
            <div className="w-20 h-20 bg-blue-50 rounded-full mb-4 flex items-center justify-center font-bold text-gray-400 border border-dashed border-gray-300">
              Avatar
            </div>
            <h3 className="font-bold text-[13px] mb-2">
              Người gửi: {req.requesterId}
            </h3>
            <p className="text-[14px] text-gray-600 mb-6 italic">
              "{req.greetingMessage || "Kết bạn nhé!"}"
            </p>
            <div className="flex gap-3 w-full mt-auto">
              <button
                onClick={() => handleAction(req.id, "ACCEPT")}
                className="flex-1 bg-black text-white py-2.5 rounded-full font-semibold hover:bg-gray-800 transition-transform active:scale-95"
              >
                Đồng ý
              </button>
              <button
                onClick={() => handleAction(req.id, "DECLINE")}
                className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-full font-semibold hover:bg-gray-200 transition-transform active:scale-95"
              >
                Từ chối
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
