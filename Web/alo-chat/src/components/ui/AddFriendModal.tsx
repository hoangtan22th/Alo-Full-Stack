import React, { useState } from "react";
// Đảm bảo import đúng tên từ bản v2
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

const AddFriendModal = ({ onClose }: { onClose: () => void }) => {
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState(
    "Chào Tú, mình là bạn của Tấn. Rất vui được kết nối!",
  );

  return (
    // Backdrop làm mờ nền
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      {/* Container Modal Chính - Chỉnh lại text-black để không bị thừa hưởng text-white từ ngoài */}
      <div className="bg-white rounded-[40px] p-8 max-w-[480px] w-full relative shadow-2xl text-black">
        {/* Nút Đóng (x) */}
        <button
          onClick={onClose}
          className="absolute top-6 right-8 text-gray-400 hover:text-black transition-colors"
        >
          <XMarkIcon className="w-7 h-7 stroke-2" />
        </button>

        {/* Tiêu đề Modal */}
        <h1 className="text-[22px] font-extrabold text-gray-900 mb-6">
          Thêm bạn mới
        </h1>

        {/* Phần Tìm kiếm */}
        <div className="mb-8">
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
            TÌM KIẾM THEO SỐ ĐIỆN THOẠI
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              {/* SỬA LỖI: Dùng đúng tên MagnifyingGlassIcon đã import */}
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Nhập số điện thoại..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                // text-gray-900 để chữ nhập vào hiện rõ trên nền xám
                className="w-full bg-[#f3f3f3] border-none rounded-2xl pl-12 pr-4 py-3.5 text-[15px] text-gray-900 focus:ring-2 focus:ring-black transition-all outline-none placeholder-gray-400"
              />
            </div>
            <button className="bg-black text-white px-8 py-3.5 rounded-2xl font-bold text-[15px] hover:bg-gray-800 transition-all active:scale-95">
              Tìm kiếm
            </button>
          </div>
        </div>

        {/* User Card (Hiển thị kết quả mẫu) */}
        <div className="bg-[#f3f3f3] rounded-[28px] p-5 flex items-center gap-4 mb-8 border border-transparent hover:border-gray-200 transition-all">
          <div className="relative shrink-0">
            <div className="w-16 h-16 bg-white rounded-full overflow-hidden flex items-center justify-center border-2 border-white shadow-sm font-bold text-gray-400">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Tu"
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-[17px] text-gray-900">
                Nguyễn Minh Tú
              </h3>
              <CheckBadgeIcon className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <UsersIcon className="w-4 h-4 text-gray-400" />
              <p className="text-[13px] text-gray-500 font-medium">
                3 bạn chung
              </p>
            </div>
          </div>
        </div>

        {/* Lời chào */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-3 px-1">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              LỜI CHÀO
            </label>
            <span className="text-[11px] text-gray-300 font-bold">
              {message.length}/150
            </span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 150))}
            className="w-full bg-[#f3f3f3] border-none rounded-[24px] p-5 text-[15px] text-gray-700 leading-relaxed h-28 outline-none focus:ring-2 focus:ring-black transition-all resize-none"
          ></textarea>
        </div>

        {/* Nút Action */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-[#e5e5e5] text-black font-bold py-4 rounded-full hover:bg-gray-300 transition-all active:scale-95"
          >
            Hủy
          </button>
          <button className="flex-1 bg-black text-white font-bold py-4 rounded-full hover:bg-gray-800 shadow-lg transition-all active:scale-95">
            Gửi yêu cầu
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddFriendModal;
