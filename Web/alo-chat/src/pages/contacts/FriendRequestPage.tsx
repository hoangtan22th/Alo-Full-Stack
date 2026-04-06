import { useEffect, useState } from "react";
import axios from "axios";
import { UserPlusIcon } from "@heroicons/react/24/outline";

export default function FriendRequestPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token"); 

  const fetchRequests = async () => {
    try {
      // URL PHẢI CÓ /api-gateway/ THÌ GATEWAY MỚI NHẬN DIỆN ĐƯỢC
      const res = await axios.get("http://localhost:8888/api-gateway/contact-service/api/contacts/pending", {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Backend của Tấn bọc trong ApiResponse nên phải là .data.data
      setRequests(res.data.data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách lời mời:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  if (loading) return <div className="p-8">Đang tải...</div>;

  return (
    <div className="flex-1 h-screen bg-[#fafafa] p-8 overflow-y-auto">
      <div className="flex items-center gap-4 mb-8 pb-4 border-b">
        <div className="p-2.5 bg-gray-100 rounded-full text-black"><UserPlusIcon className="w-6 h-6" /></div>
        <div>
          <h2 className="text-[20px] font-bold">Lời mời kết bạn</h2>
          <p className="text-sm text-gray-500">Bạn có {requests.length} yêu cầu đang chờ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {requests.map((req: any) => (
          <div key={req.id} className="bg-white border rounded-[2rem] p-6 flex flex-col items-center text-center shadow-sm">
            <div className="w-20 h-20 bg-blue-50 rounded-full mb-4 flex items-center justify-center font-bold">Avatar</div>
            {/* Vì DTO chưa có senderName nên tạm hiện requesterId để check data */}
            <h3 className="font-bold text-[13px] mb-2">Người gửi: {req.requesterId}</h3>
            <p className="text-[14px] text-gray-600 mb-6 italic">"{req.greetingMessage || "Kết bạn nhé!"}"</p>
            <div className="flex gap-3 w-full mt-auto">
              <button className="flex-1 bg-black text-white py-2.5 rounded-full font-semibold">Đồng ý</button>
              <button className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-full font-semibold">Từ chối</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}