import React, { useState } from 'react';

// Giả lập Component Modal cho giao diện Thêm Bạn Mới
const AddFriendModal = ({ onClose }) => {
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 font-sans text-white">
      {/* Container Modal Chính */}
      <div className="bg-black border border-white rounded-[32px] p-8 max-w-[500px] w-full relative">
        {/* Nút Đóng (x) ở góc trên bên phải */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-8 text-white hover:text-gray-400 text-3xl font-light"
        >
          &times;
        </button>

        {/* Tiêu đề Modal */}
        <h1 className="text-3xl font-extrabold mb-4">THÊM BẠN MỚI</h1>
        
        {/* Mô tả nhỏ */}
        <p className="text-gray-400 mb-8 text-[15px]">
          Nhập số điện thoại hoặc email để tìm bạn bè.
        </p>

        {/* Ô nhập thông tin chính (Số điện thoại/Email) */}
        <div className="relative mb-3">
          <input 
            type="text" 
            placeholder="SỐ ĐIỆN THOẠI / EMAIL" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-black border border-white rounded-[24px] px-6 py-4.5 text-[15px] placeholder-gray-500 outline-none focus:border-gray-300"
          />
          {/* Icon Thêm Bạn */}
          <span className="absolute right-6 top-1/2 transform -translate-y-1/2 text-white text-3xl font-light">
            +<span className='font-mono'>👤</span>
          </span>
        </div>

        {/* Dòng thông báo đang chờ API */}
        <p className="text-gray-500 text-[13px] mb-8">
          Hệ thống đang chờ API...
        </p>

        {/* Phần Lời nhắn tùy chọn */}
        <h2 className="text-lg font-extrabold mb-3">LỜI NHẮN (TÙY CHỌN)</h2>
        <textarea 
          placeholder={`Ví dụ: Mình là Tấn, rất vui được làm quen!`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-black border border-white rounded-[24px] p-6 text-[15px] placeholder-gray-600 h-[140px] mb-12 outline-none focus:border-gray-300 resize-none"
        ></textarea>

        {/* Nhóm Nút Hành Động ở dưới cùng */}
        <div className="space-y-4">
          <button className="w-full bg-white text-black text-center font-bold text-[16px] py-4.5 rounded-[32px] hover:bg-gray-200 transition">
            GỬI LỜI MỜI
          </button>
          <button 
            onClick={onClose} 
            className="w-full bg-black border border-white text-white text-center font-bold text-[16px] py-4.5 rounded-[32px] hover:bg-gray-800 transition"
          >
            HỦY
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddFriendModal;