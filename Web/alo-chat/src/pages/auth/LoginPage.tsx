import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserIcon,
  LockClosedIcon,
  EyeSlashIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { QRCodeSVG } from "qrcode.react";
import axiosClient from "../../config/axiosClient";
import { toast } from "sonner";
import { GoogleLogin } from "@react-oauth/google";

// IMPORT ZUSTAND STORE VÀO ĐÂY (Nhớ check lại đường dẫn nếu máy ông để khác nhé)
import { useAuthStore } from "../../store/useAuthStore";

// Định nghĩa các bước hiển thị cho Form bên trái
type ViewState = "LOGIN" | "FORGOT_EMAIL" | "FORGOT_RESET";

const LoginPage = () => {
  // LẤY HÀM SET TOKEN TỪ ZUSTAND ĐỂ ĐỒNG BỘ AUTH
  const setToken = useAuthStore((state) => state.setToken);

  // --- STATE CHO LOGIN ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // --- STATE CHO QUÊN MẬT KHẨU ---
  const [view, setView] = useState<ViewState>("LOGIN");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATE CHO QR CODE ---
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<
    "PENDING" | "SCANNED" | "CONFIRMED" | "EXPIRED"
  >("PENDING");
  const navigate = useNavigate();

  //  STATE NÀY ĐỂ QUẢN LÝ ẨN/HIỆN MẬT KHẨU
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // 1. Fetch QR Token on mount
  useEffect(() => {
    fetchQrToken();
  }, []);

  const fetchQrToken = async () => {
    try {
      const data: any = await axiosClient.get("/auth/qr/generate");
      if (data) {
        setQrToken(data.qrToken);
        setQrStatus(data.status);
      }
    } catch (err) {
      console.error("Failed to fetch QR token", err);
    }
  };

  // 2. Poll for QR status
  useEffect(() => {
    if (!qrToken || qrStatus === "CONFIRMED" || qrStatus === "EXPIRED") return;

    const interval = setInterval(async () => {
      try {
        const data: any = await axiosClient.get(`/auth/qr/status/${qrToken}`);
        if (data) {
          setQrStatus(data.status);

          if (data.status === "CONFIRMED") {
            clearInterval(interval);
            const token = data.accessToken || data; // Fix hờ phòng trường hợp backend trả thẳng token
            if (token) {
              setToken(token); // XÀI ZUSTAND Ở ĐÂY
              toast.success("Đăng nhập bằng mã QR thành công!");
              navigate("/contacts/friends");
            } else {
              console.error("Không tìm thấy token trong response", data);
            }
          } else if (data.status === "EXPIRED") {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Polling QR status failed", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [qrToken, qrStatus, navigate, setToken]);

  // --- HANDLERS CHO LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res: any = await axiosClient.post("/auth/login", {
        email,
        password,
      });
      const token = res.accessToken || res; // Fix hờ phòng trường hợp backend trả thẳng token
      if (token) {
        setToken(token); // XÀI ZUSTAND Ở ĐÂY
        toast.success("Đăng nhập thành công!");
        navigate("/contacts/friends");
      } else {
        console.error("Không tìm thấy token trong response", res);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  // --- HANDLERS CHO GOOGLE LOGIN ---
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError("");
    try {
      const idToken = credentialResponse.credential;
      const res: any = await axiosClient.post("/auth/google", { idToken });
      const token = res.accessToken || res;
      if (token) {
        setToken(token); // XÀI ZUSTAND Ở ĐÂY
        toast.success("Đăng nhập bằng Google thành công!");
        navigate("/contacts/friends");
      } else {
        console.error("Không tìm thấy token trong response", res);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Đăng nhập Google thất bại");
    }
  };

  const handleGoogleError = () => {
    setError("Hủy đăng nhập Google hoặc có lỗi xảy ra");
  };

  // --- HANDLERS CHO QUÊN MẬT KHẨU (Của Team) ---
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return setError("Vui lòng nhập email đăng ký");

    setIsSubmitting(true);
    setError("");
    try {
      await axiosClient.post("/auth/forgot-password/send-otp", {
        email: forgotEmail,
      });
      toast.success("Mã xác nhận đã được gửi!", {
        description: `Vui lòng kiểm tra hộp thư ${forgotEmail}`,
      });
      setView("FORGOT_RESET"); // Chuyển sang bước nhập OTP
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi gửi mã OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword)
      return setError("Vui lòng nhập đầy đủ OTP và mật khẩu mới");

    setIsSubmitting(true);
    setError("");
    try {
      await axiosClient.post("/auth/forgot-password/reset", {
        email: forgotEmail,
        otp: otp,
        newPassword: newPassword,
      });
      toast.success("Mật khẩu đã được đặt lại thành công!");

      // Reset form và quay về màn hình Login
      setForgotEmail("");
      setOtp("");
      setNewPassword("");
      setView("LOGIN");
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi cập nhật mật khẩu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    setView("LOGIN");
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F3F4] p-4 font-sans">
      <div className="bg-white border border-gray-100 rounded-[40px] shadow-2xl max-w-5xl w-full p-8 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center min-h-[600px]">
        {/* ================= CỘT BÊN TRÁI ================= */}
        <div className="space-y-8 relative h-full flex flex-col justify-center">
          {/* ----- VIEW: ĐĂNG NHẬP ----- */}
          {view === "LOGIN" && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">
                  Chào mừng trở lại
                </h1>
                <p className="text-gray-500 font-medium">
                  Đăng nhập vào tài khoản của bạn để tiếp tục.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg border border-red-100 animate-shake">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">
                    Email hoặc Phone
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-3.5 text-gray-400 h-5 w-5 stroke-1.5" />
                    <input
                      type="text"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2 px-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Mật khẩu
                    </label>
                    <span
                      onClick={() => {
                        setView("FORGOT_EMAIL");
                        setError("");
                      }}
                      className="text-[10px] font-bold text-gray-400 hover:text-black transition-colors underline decoration-gray-200 underline-offset-4 cursor-pointer"
                    >
                      Quên mật khẩu?
                    </span>
                  </div>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-4 top-3.5 text-gray-400 h-5 w-5 stroke-1.5" />

                    <input
                      type={showLoginPassword ? "text" : "password"}
                      className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-4 top-3.5 text-gray-400 hover:text-black transition-colors"
                    >
                      {showLoginPassword ? (
                        <EyeIcon className="h-5 w-5 stroke-1.5" />
                      ) : (
                        <EyeSlashIcon className="h-5 w-5 stroke-1.5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-black text-white py-4 rounded-full font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-[0.98]"
                >
                  Đăng nhập
                </button>
              </form>

              <div className="relative flex items-center justify-center mt-8 mb-6">
                <div className="border-t w-full border-gray-100"></div>
                <span className="bg-white px-4 text-[10px] font-bold text-gray-400 uppercase absolute tracking-widest">
                  Hoặc tiếp tục với
                </span>
              </div>

              {/* NÚT GOOGLE LOGIN XỊN CỦA BẠN */}
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  shape="pill"
                  theme="outline"
                  size="large"
                  text="continue_with"
                />
              </div>
            </div>
          )}

          {/* ----- VIEW: QUÊN MẬT KHẨU BƯỚC 1 (NHẬP EMAIL) ----- */}
          {view === "FORGOT_EMAIL" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 w-full max-w-sm mx-auto">
              <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                <h2 className="text-2xl font-extrabold text-gray-900">
                  Khôi phục mật khẩu
                </h2>
                <button
                  onClick={handleBackToLogin}
                  className="text-[#EF4444] font-bold text-sm hover:opacity-80 transition-opacity"
                >
                  Thoát
                </button>
              </div>

              <form onSubmit={handleSendForgotOtp} className="space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg border border-red-100 animate-shake">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 ml-1 tracking-widest">
                    Email Đăng Ký
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0f172a] transition-all text-gray-900"
                    placeholder="example@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-3xl font-bold transition-all shadow-md active:scale-[0.98] text-white ${isSubmitting ? "bg-gray-400" : "bg-[#0f172a] hover:bg-gray-800"}`}
                >
                  {isSubmitting ? "Đang gửi..." : "Gửi Mã Xác Nhận"}
                </button>
              </form>
            </div>
          )}

          {/* ----- VIEW: QUÊN MẬT KHẨU BƯỚC 2 (NHẬP OTP & MẬT KHẨU MỚI) ----- */}
          {view === "FORGOT_RESET" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 w-full max-w-sm mx-auto">
              <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                <h2 className="text-2xl font-extrabold text-gray-900">
                  Khôi phục mật khẩu
                </h2>
                <button
                  onClick={handleBackToLogin}
                  className="text-[#EF4444] font-bold text-sm hover:opacity-80 transition-opacity"
                >
                  Thoát
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-5">
                {error && (
                  <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg border border-red-100 animate-shake">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 ml-1 tracking-widest">
                    Mã OTP (6 Số Từ Email)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    className="w-full px-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0f172a] transition-all text-center tracking-[0.5em] text-lg font-bold text-gray-900"
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 ml-1 tracking-widest">
                    Mật Khẩu Mới
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className="w-full px-4 pr-12 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0f172a] transition-all text-gray-900"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-4 text-gray-400 hover:text-black transition-colors"
                    >
                      {showNewPassword ? (
                        <EyeIcon className="h-5 w-5 stroke-1.5" />
                      ) : (
                        <EyeSlashIcon className="h-5 w-5 stroke-1.5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-4 mt-2 rounded-3xl font-bold transition-all shadow-md active:scale-[0.98] text-white ${isSubmitting ? "bg-gray-400" : "bg-[#0f172a] hover:bg-gray-800"}`}
                >
                  {isSubmitting ? "Đang xử lý..." : "Cập Nhật Mật Khẩu"}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ================= CỘT BÊN PHẢI (QR CODE) ================= */}
        <div className="hidden md:flex flex-col items-center justify-center bg-gray-50/50 rounded-[35px] p-12 aspect-square border border-gray-50 relative">
          {qrStatus === "EXPIRED" && (
            <div className="absolute inset-0 bg-white/80 rounded-[35px] z-10 flex flex-col items-center justify-center backdrop-blur-sm shadow-sm transition-all duration-300">
              <p className="text-red-500 font-bold mb-4 text-sm bg-red-50 px-4 py-2 rounded-full border border-red-100">
                Mã QR đã hết hạn
              </p>
              <button
                onClick={fetchQrToken}
                className="bg-black text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg hover:bg-gray-800 transition-all active:scale-[0.98]"
              >
                Tạo mã mới
              </button>
            </div>
          )}

          {qrStatus === "SCANNED" && (
            <div className="absolute inset-0 bg-white/90 rounded-[35px] z-10 flex flex-col items-center justify-center backdrop-blur-sm shadow-sm transition-all duration-300">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 shadow-sm border border-blue-100">
                <svg
                  className="w-8 h-8 animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
              </div>
              <p className="text-gray-900 font-extrabold text-lg">
                Đã quét thành công
              </p>
              <p className="text-gray-500 text-sm font-medium tracking-wide mt-1">
                Vui lòng xác nhận trên điện thoại...
              </p>
            </div>
          )}

          <div className="bg-white p-6 rounded-[30px] shadow-xl mb-6 border border-gray-100/50">
            <div className="w-44 h-44 flex items-center justify-center rounded-2xl overflow-hidden relative group">
              {qrToken ? (
                <QRCodeSVG
                  value={`alo-chat://login?token=${qrToken}`}
                  size={176}
                  level="H"
                  includeMargin={false}
                  className={`transition-all duration-500 ${qrStatus === "SCANNED" ? "blur-sm scale-95 opacity-50" : "scale-100 opacity-100 group-hover:scale-[1.02]"}`}
                />
              ) : (
                <div className="text-gray-400 text-xs font-medium animate-pulse">
                  Đang tạo mã...
                </div>
              )}
            </div>
          </div>
          <h2 className="text-xl font-extrabold mb-2 text-gray-900">
            Đăng nhập với QR Code
          </h2>
          <p className="text-gray-400 text-center text-sm max-w-[250px] mb-8 font-medium leading-relaxed">
            Quét mã này bằng ứng dụng{" "}
            <span className="text-gray-900 font-bold">Alo-Chat</span> trên điện
            thoại của bạn.
          </p>
          <p className="text-sm text-gray-400 font-medium">
            Không có tài khoản?{" "}
            <span
              onClick={() => navigate("/register")}
              className="text-black font-bold cursor-pointer hover:underline underline-offset-4"
            >
              Đăng ký ngay
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
