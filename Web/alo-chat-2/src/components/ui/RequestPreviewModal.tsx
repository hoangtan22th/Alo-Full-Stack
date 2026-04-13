"use client";
// src/components/ui/RequestPreviewModal.tsx
import {
  XMarkIcon,
  UserCircleIcon,
  ChatBubbleLeftIcon,
  CheckIcon,
  TrashIcon,
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
    <div
      onClick={onClose}
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-sm h-auto max-h-[85vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom-10"
      >
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-[15px] font-black text-gray-900 tracking-tight">
            Lời mời kết bạn
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 stroke-2" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide pb-8">
          <div className="flex flex-col items-center mt-4 mb-6">
            <div className="w-20 h-20 rounded-full border-2 border-gray-50 overflow-hidden shadow-xl bg-black mb-3">
              <img
                src={request.requesterAvatar || "/avt-mac-dinh.jpg"}
                className="w-full h-full object-cover"
                alt=""
              />
            </div>
            <h3 className="font-black text-[18px] text-gray-900">
              {request.requesterName}
            </h3>
            <p className="text-gray-400 font-bold text-[11px] mt-0.5 uppercase tracking-widest italic">
              Yêu cầu kết nối
            </p>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl italic text-gray-700 text-sm font-medium text-center mb-8">
            "{request.greetingMessage || "Chào bạn, kết bạn với mình nhé!"}"
          </div>

          <div className="space-y-2.5 px-2">
            <button
              onClick={() => onAccept(request.id)}
              className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-sm hover:bg-neutral-800 transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckIcon className="w-4 h-4" /> Chấp nhận lời mời
            </button>
            <button
              onClick={() => onDecline(request.id)}
              className="w-full bg-white text-gray-600 py-3 rounded-xl font-bold text-sm border border-gray-100 hover:border-black transition flex items-center justify-center gap-2 active:scale-95"
            >
              <TrashIcon className="w-4 h-4" /> Từ chối
            </button>
            <div className="pt-4 border-t border-gray-50 mt-4">
              <button
                onClick={onViewProfile}
                className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-black transition-colors font-bold text-xs uppercase tracking-widest"
              >
                <UserCircleIcon className="w-4 h-4" /> Xem hồ sơ chi tiết
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
