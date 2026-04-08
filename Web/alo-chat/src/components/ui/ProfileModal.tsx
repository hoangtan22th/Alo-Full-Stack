// src/components/Sidebar/ProfileModal.tsx
import {
  XMarkIcon,
  CameraIcon,
  PencilSquareIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { toast } from "sonner"; // Đã chuyển sang dùng sonner
import axiosClient from "../../config/axiosClient"; // Dùng axiosClient thay cho fetch localhost

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Gender = "Nam" | "Nữ" | "Khác";

// UI: Đã thu gọn padding, giảm size text cho màn 13 inch
const FormInput = ({
  label,
  value,
  onChange,
  type = "text",
  isEditing,
  loading,
}: any) => (
  <div className="w-full text-left">
    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={!isEditing || loading}
      className={`w-full px-4 py-2.5 rounded-xl text-[13px] transition-all outline-none border-2 font-semibold ${
        isEditing
          ? "bg-white border-gray-200 text-gray-900 focus:border-black shadow-sm"
          : "bg-[#f9f9f9] border-transparent text-gray-500 cursor-not-allowed"
      }`}
    />
  </div>
);

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  // ==========================================
  // LOGIC ĐƯỢC GIỮ NGUYÊN 100% THEO YÊU CẦU
  // ==========================================
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<Gender>("Nam");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("/avt-mac-dinh.jpg");
  const [coverImageUrl, setCoverImageUrl] = useState("/black.jpg");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
      fetchUserData();
      return () => {
        window.removeEventListener("keydown", handleEsc);
        document.body.style.overflow = "unset";
      };
    } else {
      resetStates();
    }
  }, [isOpen]);

  const resetStates = () => {
    setIsEditing(false);
    setAvatarFile(null);
    setCoverFile(null);
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const res: any = await axiosClient.get("/auth/me");
      const userData = res?.data || res;

      if (userData) {
        setFullName(userData.fullName || "");
        setPhone(userData.phoneNumber || "");
        setEmail(userData.email || "");
        setAvatarUrl(userData.avatar || "/avt-mac-dinh.jpg");
        setCoverImageUrl(userData.coverImage || "/black.jpg");

        const genderMap: Record<number, Gender> = {
          1: "Nam",
          0: "Nữ",
          2: "Khác",
        };
        setGender(genderMap[userData.gender] || "Nam");
      }
    } catch (error) {
      console.error("Fetch profile error:", error);
      toast.error("Không thể tải thông tin cá nhân");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>,
    type: "avatar" | "cover",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    if (type === "avatar") {
      setAvatarUrl(previewUrl);
      setAvatarFile(file);
    } else {
      setCoverImageUrl(previewUrl);
      setCoverFile(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    setLoading(true);
    try {
      const genderRevMap = { Nam: 0, Nữ: 1, Khác: 2 };

      await axiosClient.put("/auth/me", {
        fullName,
        gender: genderRevMap[gender],
        phoneNumber: phone,
        email,
      });

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        await axiosClient.post("/auth/me/avatar", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);
        await axiosClient.post("/auth/me/cover", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast.success("Cập nhật thành công!", {
        description: "Thông tin của ông đã được lưu.",
      });
      setIsEditing(false);
      setAvatarFile(null);
      setCoverFile(null);
    } catch (error) {
      toast.error("Có lỗi xảy ra khi cập nhật!");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // ==========================================
  // UI: ĐÃ TỐI ƯU CSS CHO MÀN 13 INCH VÀ RESPONSIVE
  // ==========================================
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      {/* Box chính: Bóp w-full max-w-[400px], thêm max-h-[85vh] và flex-col */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-[400px] h-auto max-h-[85vh] flex flex-col rounded-[28px] shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden"
      >
        {/* Nút Close an toàn trên góc phải */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full z-30 text-white transition-all"
        >
          <XMarkIcon className="w-5 h-5 stroke-2" />
        </button>

        {/* Nội dung có thanh cuộn bên trong */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* COVER: Thu chiều cao còn h-32 */}
          <div className="h-32 relative group bg-black shrink-0">
            <img
              src={coverImageUrl}
              onError={(e) => (e.currentTarget.src = "/black.jpg")}
              className="w-full h-full object-cover opacity-90"
              alt="cover"
            />
            <input
              type="file"
              ref={coverInputRef}
              onChange={(e) => handleFileChange(e, "cover")}
              accept="image/*"
              className="hidden"
            />

            {isEditing && (
              <button
                onClick={() => coverInputRef.current?.click()}
                className="absolute bottom-3 right-3 p-2 bg-white/90 rounded-full shadow-lg text-gray-800 hover:bg-white transition-all active:scale-90"
              >
                <CameraIcon className="w-4 h-4 stroke-2" />
              </button>
            )}
          </div>

          <div className="px-6 py-5 relative bg-white flex-1">
            <div className="flex flex-col items-center -mt-16 mb-6">
              <div className="relative">
                {/* AVATAR: Thu size w-24 h-24 */}
                <div className="w-24 h-24 rounded-full border-[4px] border-white overflow-hidden shadow-lg bg-black">
                  <img
                    src={avatarUrl}
                    onError={(e) => (e.currentTarget.src = "/avt-mac-dinh.jpg")}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={(e) => handleFileChange(e, "avatar")}
                  accept="image/*"
                  className="hidden"
                />
                {isEditing && (
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-black text-white rounded-full shadow-md border-2 border-white hover:bg-gray-800 transition-all active:scale-90"
                  >
                    <CameraIcon className="w-4 h-4 stroke-2" />
                  </button>
                )}
              </div>
              <h1 className="text-[18px] font-extrabold text-gray-900 mt-3 tracking-tight">
                {isEditing ? "Chỉnh sửa hồ sơ" : fullName || "Người dùng Alo"}
              </h1>
            </div>

            <div className="space-y-4">
              <FormInput
                label="Họ và tên"
                value={fullName}
                onChange={setFullName}
                isEditing={isEditing}
                loading={loading}
              />

              <div className="w-full text-left">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                  Giới tính
                </label>
                <div
                  className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border-2 transition-all ${
                    isEditing
                      ? "bg-gray-50 border-gray-100"
                      : "bg-[#f9f9f9] border-transparent"
                  }`}
                >
                  {(["Nam", "Nữ", "Khác"] as Gender[]).map((option) => (
                    <button
                      key={option}
                      disabled={!isEditing}
                      onClick={() => setGender(option)}
                      className={`py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                        gender === option
                          ? "bg-black text-white shadow-sm"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormInput
                  label="Số điện thoại"
                  value={phone}
                  onChange={setPhone}
                  type="tel"
                  isEditing={isEditing}
                  loading={loading}
                />
                <FormInput
                  label="Email liên hệ"
                  value={email}
                  onChange={setEmail}
                  type="email"
                  isEditing={isEditing}
                  loading={loading}
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3 border-t border-gray-50 pt-5">
              {isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    fetchUserData();
                  }}
                  className="text-[12px] font-bold text-gray-400 hover:text-red-500 transition-colors mr-1"
                >
                  Hủy bỏ
                </button>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-[13px] transition-all active:scale-95 shadow-sm ${
                  isEditing
                    ? "bg-black text-white hover:bg-gray-800"
                    : "bg-white border-2 border-gray-100 text-gray-900 hover:bg-gray-50"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {loading
                  ? "Đang xử lý..."
                  : isEditing
                    ? "Lưu thay đổi"
                    : "Chỉnh sửa hồ sơ"}
                {!isEditing && !loading && (
                  <PencilSquareIcon className="w-4 h-4" />
                )}
                {isEditing && !loading && <CheckIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
