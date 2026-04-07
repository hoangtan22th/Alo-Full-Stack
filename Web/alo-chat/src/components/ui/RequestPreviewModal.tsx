// src/components/ui/RequestPreviewModal.tsx
import {
  XMarkIcon,
  UserCircleIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";

export default function RequestPreviewModal({
  request,
  onClose,
  onAccept,
  onDecline,
  onViewProfile,
}: any) {
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative flex flex-col items-center text-center">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-black"
        >
          <XMarkIcon className="w-6 h-6 stroke-2" />
        </button>

        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner mt-4 mb-3">
          <img
            src={
              request.requesterAvatar ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${request.requesterName}`
            }
            alt="avatar"
            className="w-full h-full object-cover"
          />
        </div>

        <h3 className="font-extrabold text-[20px] text-gray-900">
          {request.requesterName}
        </h3>
        <p className="text-[13px] text-gray-500 mb-5">Đã gửi lời mời kết bạn</p>

        <div className="flex gap-2 w-full mb-6 border-b border-gray-100 pb-6">
          <button
            onClick={onViewProfile}
            className="flex-1 flex justify-center items-center gap-2 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-[13px] hover:bg-gray-200 transition"
          >
            <UserCircleIcon className="w-4 h-4" /> Xem hồ sơ
          </button>
          <button className="flex-1 flex justify-center items-center gap-2 bg-black-50 text-blue-600 py-2.5 rounded-xl font-bold text-[13px] hover:bg-blue-100 transition">
            <ChatBubbleLeftIcon className="w-4 h-4" /> Nhắn tin
          </button>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={() => onAccept(request.id)}
            className="w-full bg-black text-white py-3.5 rounded-2xl font-bold text-[15px] hover:bg-gray-800 transition shadow-lg"
          >
            Đồng ý kết bạn
          </button>
          <button
            onClick={() => onDecline(request.id)}
            className="w-full bg-[#f3f3f3] text-gray-600 py-3.5 rounded-2xl font-bold text-[15px] hover:bg-red-50 hover:text-red-500 transition"
          >
            Từ chối
          </button>
        </div>
      </div>
    </div>
  );
}
