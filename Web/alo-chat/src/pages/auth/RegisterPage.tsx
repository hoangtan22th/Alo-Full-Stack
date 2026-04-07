import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  LockClosedIcon,
  SparklesIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import axiosClient from "../../config/axiosClient";
import { toast } from "sonner";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });

  const [error, setError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Thêm state quản lý ẩn/hiện mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOtp = async () => {
    if (!formData.email) {
      setError("Vui lòng nhập email trước khi gửi mã OTP");
      return;
    }
    setIsSendingOtp(true);
    setError("");
    try {
      await axiosClient.post("/auth/send-otp", { email: formData.email });
      setOtpSent(true);
      toast.success("Mã xác nhận đã được gửi!", {
        description: `Vui lòng kiểm tra hộp thư ${formData.email}`,
        duration: 7000,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi gửi OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }
    if (!formData.otp) {
      setError("Vui lòng nhập mã OTP");
      return;
    }

    try {
      await axiosClient.post("/auth/register", {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        otp: formData.otp,
      });
      toast.success("Đăng ký thành công!", {
        description: "Hãy đăng nhập",
      });
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.message || "Đăng ký thất bại");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F3F4] p-6 font-sans">
      <div className="bg-white border border-gray-100 rounded-[40px] shadow-2xl max-w-[480px] w-full p-8 md:p-12 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4 shadow-lg">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Tạo tài khoản mới
          </h1>
          <p className="text-gray-400 text-sm mt-2 font-medium">
            Hãy bắt đầu những cuộc trò chuyện của bạn với Alo Chat.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 text-left">
          {error && (
            <div className="bg-red-50 text-red-500 text-xs p-3 rounded-xl border border-red-100 text-center font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">
              Tên đầy đủ
            </label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-3 text-gray-400 w-5 h-5 stroke-[1.5px]" />
              <input
                name="fullName"
                type="text"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all text-sm"
                placeholder="Nguyễn Văn A"
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">
              Số điện thoại
            </label>
            <div className="relative">
              <PhoneIcon className="absolute left-4 top-3 text-gray-400 w-5 h-5 stroke-[1.5px]" />
              <input
                name="phoneNumber"
                type="text"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all text-sm"
                placeholder="0123 456 789"
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">
              Email
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <EnvelopeIcon className="absolute left-4 top-3 text-gray-400 w-5 h-5 stroke-[1.5px]" />
                <input
                  name="email"
                  type="email"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all text-sm"
                  placeholder="name@example.com"
                  onChange={handleChange}
                  required
                />
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp}
                className="bg-black text-white px-4 rounded-2xl font-bold text-xs hover:bg-gray-800 transition active:scale-95 whitespace-nowrap"
              >
                {isSendingOtp ? "Đang gửi..." : otpSent ? "Gửi lại" : "Gửi OTP"}
              </button>
            </div>
          </div>

          {otpSent && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">
                Mã xác nhận (OTP)
              </label>
              <div className="relative">
                <KeyIcon className="absolute left-4 top-3 text-gray-400 w-5 h-5 stroke-[1.5px]" />
                <input
                  name="otp"
                  type="text"
                  maxLength={6}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all text-sm tracking-widest font-bold"
                  placeholder="123456"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ô Mật khẩu */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">
                Mật khẩu
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-4 top-3 text-gray-400 w-5 h-5 stroke-[1.5px]" />
                {/* Đổi type dựa trên state showPassword và thêm pr-12 để text không đè lên icon */}
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all text-sm"
                  placeholder="••••••••"
                  onChange={handleChange}
                  required
                />
                {/* Nút bật tắt con mắt */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3 text-gray-400 hover:text-black transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5 stroke-[1.5px]" />
                  ) : (
                    <EyeIcon className="w-5 h-5 stroke-[1.5px]" />
                  )}
                </button>
              </div>
            </div>

            {/* Ô Nhập lại mật khẩu */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">
                Nhập lại
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-4 top-3 text-gray-400 w-5 h-5 stroke-[1.5px]" />
                {/* Đổi type dựa trên state showConfirmPassword */}
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all text-sm"
                  placeholder="••••••••"
                  onChange={handleChange}
                  required
                />
                {/* Nút bật tắt con mắt */}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-3 text-gray-400 hover:text-black transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-5 h-5 stroke-[1.5px]" />
                  ) : (
                    <EyeIcon className="w-5 h-5 stroke-[1.5px]" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white py-4 mt-2 rounded-full font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-[0.98]"
          >
            Đăng ký ngay
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center font-medium">
          Đã có tài khoản?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-black font-bold cursor-pointer hover:underline underline-offset-4"
          >
            Đăng nhập ngay
          </span>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
