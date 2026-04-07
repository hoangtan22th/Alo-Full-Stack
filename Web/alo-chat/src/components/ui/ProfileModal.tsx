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

const FormInput = ({
  label,
  value,
  onChange,
  type = "text",
  isEditing,
  loading,
}: any) => (
  <div className="w-full text-left">
    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={!isEditing || loading}
      className={`w-full px-5 py-3 rounded-2xl text-[14px] transition-all outline-none border-2 font-medium ${
        isEditing
          ? "bg-white border-gray-100 text-gray-900 focus:border-black shadow-sm"
          : "bg-[#f9f9f9] border-transparent text-gray-500 cursor-not-allowed"
      }`}
    />
  </div>
);

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<Gender>("Nam");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("/avt-mac-dinh.jpg"); // Đồng bộ ảnh mặc định
  const [coverImageUrl, setCoverImageUrl] = useState("/black.jpg"); // Nền đen mặc định

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // UX: Bắt phím ESC và Khóa cuộn trang (Giống các modal khác)
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
      const res: any = await axiosClient.get("/auth/me"); // Không xài localhost nữa
      const userData = res?.data || res;

      if (userData) {
        setFullName(userData.fullName || "");
        setPhone(userData.phoneNumber || "");
        setEmail(userData.email || "");
        setAvatarUrl(userData.avatar || "/avt-mac-dinh.jpg");
        setCoverImageUrl(userData.coverImage || "/black.jpg");

        const genderMap: Record<number, Gender> = {
          0: "Nam",
          1: "Nữ",
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

      // Cập nhật thông tin cơ bản
      await axiosClient.put("/auth/me", {
        fullName,
        gender: genderRevMap[gender],
        phoneNumber: phone,
        email,
      });

      // Upload ảnh nếu có thay đổi
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        await axiosClient.post("/auth/me/avatar", formData);
      }

      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);
        await axiosClient.post("/auth/me/cover", formData);
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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-black/20 bg-black/10 rounded-full z-30 text-white transition-all"
        >
          <XMarkIcon className="w-5 h-5 stroke-2" />
        </button>

        {/* COVER: Đen mặc định */}
        <div className="h-40 relative group bg-black">
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
              className="absolute bottom-3 right-3 p-2.5 bg-white/90 rounded-full shadow-lg text-gray-800 hover:bg-white transition-all active:scale-90"
            >
              <CameraIcon className="w-5 h-5 stroke-2" />
            </button>
          )}
        </div>

        <div className="px-8 py-6 relative bg-white">
          <div className="flex flex-col items-center -mt-20 mb-8">
            <div className="relative">
              <div className="w-28 h-28 rounded-full border-[5px] border-white overflow-hidden shadow-xl bg-black">
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
                  className="absolute bottom-1 right-1 p-2 bg-black text-white rounded-full shadow-lg border-2 border-white hover:bg-gray-800 transition-all active:scale-90"
                >
                  <CameraIcon className="w-4 h-4 stroke-2" />
                </button>
              )}
            </div>
            <h1 className="text-[22px] font-extrabold text-gray-900 mt-4 tracking-tight">
              {isEditing ? "Chỉnh sửa hồ sơ" : fullName || "Người dùng Alo"}
            </h1>
          </div>

          <div className="space-y-6">
            <FormInput
              label="Họ và tên"
              value={fullName}
              onChange={setFullName}
              isEditing={isEditing}
              loading={loading}
            />

            <div className="w-full text-left">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                Giới tính
              </label>
              <div
                className={`grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl border-2 transition-all ${isEditing ? "bg-gray-50 border-gray-100" : "bg-[#f9f9f9] border-transparent"}`}
              >
                {(["Nam", "Nữ", "Khác"] as Gender[]).map((option) => (
                  <button
                    key={option}
                    disabled={!isEditing}
                    onClick={() => setGender(option)}
                    className={`py-2 rounded-xl text-[13px] font-bold transition-all ${
                      gender === option
                        ? "bg-black text-white shadow-md"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
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

          <div className="mt-10 flex items-center justify-end gap-4 border-t border-gray-100 pt-8">
            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  fetchUserData();
                }}
                className="text-[13px] font-bold text-gray-400 hover:text-red-500 transition-colors mr-2"
              >
                Hủy bỏ
              </button>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className={`flex items-center justify-center gap-2 px-10 py-3.5 rounded-2xl font-bold text-[14px] transition-all active:scale-95 shadow-lg ${
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
                <PencilSquareIcon className="w-5 h-5" />
              )}
              {isEditing && !loading && <CheckIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
