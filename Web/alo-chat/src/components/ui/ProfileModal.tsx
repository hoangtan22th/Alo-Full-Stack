// src/components/Sidebar/ProfileModal.tsx
import { XMarkIcon, CameraIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { useState, useRef, useEffect, type ChangeEvent } from 'react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Gender = 'Nam' | 'Nữ' | 'Khác';


// ✅ CHỈ SỬA: tách ra ngoài (giữ nguyên CSS)
const FormInput = ({ label, value, onChange, type = "text", isEditing, loading }: any) => (
  <div className="w-full text-left">
    <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={!isEditing || loading}
      className={`w-full px-4 py-2.5 rounded-lg text-xs transition-all outline-none border ${
        isEditing
          ? 'bg-white border-gray-200 text-gray-900 focus:border-black'
          : 'bg-gray-50 border-transparent text-gray-500'
      }`}
    />
  </div>
);

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const BASE_URL = "http://localhost:8888/api/v1/auth";

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>('Nam');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [avatarUrl, setAvatarUrl] = useState('https://i.pravatar.cc/150?u=default');
    const [coverImageUrl, setCoverImageUrl] = useState('https://images.unsplash.com/photo-1557683316-973673baf926?q=80');

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUserData();
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
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const result = await response.json(); // Đổi tên từ data thành result cho đỡ nhầm
      
      // ✅ TRUY CẬP VÀO result.data
      const userData = result.data; 

      if (userData) {
        setFullName(userData.fullName || '');
        setPhone(userData.phoneNumber || '');
        setEmail(userData.email || '');
        setAvatarUrl(userData.avatar || 'https://i.pravatar.cc/150?u=default');
        setCoverImageUrl(userData.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80');

        const genderMap: Record<number, Gender> = { 0: 'Nam', 1: 'Nữ', 2: 'Khác' };
        setGender(genderMap[userData.gender] || 'Nam');
      }

    } catch (error) {
      console.error("Fetch profile error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    if (type === 'avatar') {
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

    const token = localStorage.getItem('accessToken');
    setLoading(true);

    try {
      const genderRevMap = { 'Nam': 0, 'Nữ': 1, 'Khác': 2 };

      await fetch(`${BASE_URL}/me`, {
        method: 'PUT',
       headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName,
          gender: genderRevMap[gender],
          phoneNumber: phone,
          email
        }),
      });

      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        await fetch(`${BASE_URL}/me/avatar`, {
          method: 'POST',
          headers: { 
                Authorization: `Bearer ${token}`
            },
          body: formData,
        });
      }

      if (coverFile) {
        const formData = new FormData();
        formData.append('file', coverFile);
        await fetch(`${BASE_URL}/me/cover`, {
          method: 'POST',
         headers: { 
            Authorization: `Bearer ${token}`
        },
          body: formData,
        });
      }

      alert("Cập nhật hồ sơ thành công!");
      setIsEditing(false);
      setAvatarFile(null);
      setCoverFile(null);

    } catch (error) {
      console.error("Update error:", error);
      alert("Có lỗi xảy ra khi lưu!");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative transition-all">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-black/10 rounded-full z-30 text-white md:text-gray-400">
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* COVER */}
        <div className="h-36 relative group bg-gray-100">
          <img src={coverImageUrl} className="w-full h-full object-cover" alt="cover" />
          <input type="file" ref={coverInputRef} onChange={(e) => handleFileChange(e, 'cover')} accept="image/*" className="hidden" />

          {isEditing && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <button 
                onClick={() => coverInputRef.current?.click()} 
                className="absolute bottom-3 right-3 p-2 bg-white/70 rounded-full shadow-lg border border-white/50 text-gray-800 hover:bg-white transition-colors"
              >
                <CameraIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="px-8 py-6 relative bg-white">
          <div className="flex items-end gap-5 mb-8">
            <div className="relative -mt-16 ml-2">
              <div className="w-28 h-28 rounded-full border-[5px] border-white overflow-hidden shadow-md bg-gray-200 ring-1 ring-gray-100">
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <input type="file" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} accept="image/*" className="hidden" />
              {isEditing && (
                <button onClick={() => avatarInputRef.current?.click()} className="absolute bottom-1 right-1 p-2 bg-white rounded-full shadow-lg border border-gray-100 text-gray-500 hover:text-black transition-all">
                  <CameraIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="pb-1 text-left">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                {isEditing ? 'Chỉnh sửa hồ sơ' : 'Thông tin cá nhân'}
              </h1>
            </div>
          </div>

          <div className="space-y-5">
            <FormInput label="Họ và tên" value={fullName} onChange={setFullName} isEditing={isEditing} loading={loading} />

            <div className="w-full text-left">
              <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">Giới tính</label>
              <div className={`grid grid-cols-3 gap-1 p-1 rounded-full border transition-all ${isEditing ? 'bg-neutral-100 border-gray-100' : 'bg-gray-50 border-transparent'}`}>
                {(['Nam', 'Nữ', 'Khác'] as Gender[]).map((option) => (
                  <button
                    key={option}
                    disabled={!isEditing}
                    onClick={() => setGender(option)}
                    className={`px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                      gender === option ? 'bg-black text-white shadow' : 'text-gray-400'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Số điện thoại" value={phone} onChange={setPhone} type="tel" isEditing={isEditing} loading={loading} />
              <FormInput label="Email" value={email} onChange={setEmail} type="email" isEditing={isEditing} loading={loading} />
            </div>
          </div>

          <div className="mt-10 flex items-center justify-end gap-4 border-t pt-6">
            {isEditing && (
              <button 
                onClick={() => {
                  setIsEditing(false);
                  fetchUserData();
                  setAvatarFile(null);
                  setCoverFile(null);
                }} 
                className="text-xs font-semibold text-gray-400 hover:text-gray-600"
              >
                Hủy
              </button>
            )}

            <button 
              onClick={handleSaveProfile}
              disabled={loading}
              className={`flex items-center gap-2 px-8 py-2.5 text-xs font-semibold rounded-full transition-all active:scale-95 ${
                isEditing
                  ? 'bg-black text-white hover:bg-neutral-800'
                  : 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 shadow-sm'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Đang lưu...' : (isEditing ? 'Lưu thay đổi' : 'Chỉnh sửa hồ sơ')}
              {!isEditing && !loading && <PencilSquareIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}