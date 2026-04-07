import { useState } from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import axiosClient from '../../../config/axiosClient';
import { toast } from 'sonner'; 

interface ResetPasswordViewProps {
  onBack: () => void;
}

export default function ResetPasswordView({ onBack }: ResetPasswordViewProps) {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChangePassword = async () => {
    // 1. Kiểm tra để trống tại Client
    if (!formData.oldPassword || !formData.newPassword) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // 2. Gọi API khớp với @RequestBody ChangePasswordRequest
      // Backend của bạn dùng request.oldPassword() và request.newPassword()
      await axiosClient.post("/auth/change-password", {
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword
      });

      toast.success("Đổi mật khẩu thành công!");
      
      // Đợi 1s rồi quay lại trang danh sách cài đặt
      setTimeout(() => onBack(), 1000);

    } catch (err: any) {
      // 3. Xử lý lỗi từ Backend (Ví dụ: "Mật khẩu hiện tại không chính xác")
      const serverMessage = err.response?.data?.message || "Lỗi khi đổi mật khẩu";
      setError(serverMessage);
      toast.error(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in slide-in-from-right-5 duration-300">
      {/* Header */}
      <div className="flex items-center mb-8 px-2">
        <button 
          onClick={onBack} 
          className="p-1.5 hover:bg-gray-100 rounded-full mr-2 transition-colors"
        >
          <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
        </button>
        <h3 className="text-xl font-bold text-gray-950">Đổi mật khẩu</h3>
      </div>

      <div className="space-y-6 max-w-sm ml-2">
        {/* Vùng hiển thị lỗi */}
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
            {error}
          </div>
        )}

        {/* Trường 1: Mật khẩu hiện tại */}
        <div className="space-y-1.5">
          <label className="text-[14px] font-semibold text-gray-700">Mật khẩu hiện tại</label>
          <input 
            type="password" 
            placeholder="Nhập mật khẩu đang dùng"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            value={formData.oldPassword}
            onChange={(e) => setFormData({...formData, oldPassword: e.target.value})}
          />
        </div>

        {/* Trường 2: Mật khẩu mới */}
        <div className="space-y-1.5">
          <label className="text-[14px] font-semibold text-gray-700">Mật khẩu mới</label>
          <input 
            type="password" 
            placeholder="Nhập mật khẩu mới"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            value={formData.newPassword}
            onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
          />
        </div>

        {/* Nút bấm */}
        <div className="pt-4">
          <button 
            disabled={isSubmitting}
            onClick={handleChangePassword}
            className={`w-full py-3 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 ${
              isSubmitting ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          Sau khi đổi thành công, hệ thống sẽ gửi email thông báo cho bạn.
        </p>
      </div>
    </div>
  );
}