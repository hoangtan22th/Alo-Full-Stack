import {
  UserPlusIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";

// Data giả lập để test giao diện
const mockData = [
  {
    id: 1,
    name: "Em Trang không thuộc về tôi",
    time: "2 giờ trước",
    message: "Xin lỗi em chỉ coi anh là bạn.",
    avatar: "../../public/z7692626459332_4bcadb4046a562f0e5da2cbcfe7e3391.jpg",
  },
  {
    id: 2,
    name: "Lê Thị Mai",
    time: "5 giờ trước",
    message: "Rất ấn tượng với portfolio của bạn, kết nối nhé!",
    avatar: "https://i.pravatar.cc/150?img=5",
  },
  {
    id: 3,
    name: "Trần Minh Hoàng",
    time: "Hôm qua",
    message:
      "Mình là PM tại TechGlobal, muốn mời bạn tham gia cộng đồng design.",
    avatar: "https://i.pravatar.cc/150?img=8",
  },
  {
    id: 4,
    name: "Phạm Ngọc Ánh",
    time: "Hôm qua",
    message: "Đã lâu không gặp, kết bạn lại nhé!",
    avatar: "https://i.pravatar.cc/150?img=3",
  },
];

export default function FriendRequestPage() {
  return (
    <div className="flex-1 h-screen bg-[#fafafa] p-8 overflow-y-auto">
      {/* Header khu vực */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200/60">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gray-100 rounded-full text-black">
            <UserPlusIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-[20px] font-bold">Lời mời kết bạn</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Bạn có 12 yêu cầu đang chờ xử lý
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-gray-200/60 text-gray-800 rounded-full text-sm font-semibold hover:bg-gray-200 transition-colors">
            Đánh dấu đã đọc
          </button>
          <button className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors">
            <EllipsisHorizontalIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Grid chứa thẻ (Responsive: 1 cột -> 2 cột -> 3 cột) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockData.map((user) => (
          <div
            key={user.id}
            className="bg-white border border-gray-100 rounded-[2rem] p-6 flex flex-col items-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow"
          >
            {/* Avatar */}
            <div className="w-20 h-20 bg-blue-50 rounded-full mb-4 overflow-hidden border border-gray-100">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Tên & Thời gian */}
            <h3 className="font-bold text-[17px] text-gray-900">{user.name}</h3>
            <p className="text-[13px] text-gray-400 mb-4">{user.time}</p>

            {/* Lời nhắn */}
            <p className="text-[14px] text-gray-600 mb-6 px-2 h-10 line-clamp-2">
              "{user.message}"
            </p>

            {/* Nút thao tác */}
            <div className="flex gap-3 w-full mt-auto">
              <button className="flex-1 bg-black text-white py-2.5 rounded-full font-semibold text-[15px] hover:bg-gray-800 transition-colors">
                Đồng ý
              </button>
              <button className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-full font-semibold text-[15px] hover:bg-gray-200 transition-colors">
                Từ chối
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
