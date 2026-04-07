import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserIcon, PhoneIcon, EnvelopeIcon, LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline';
import axiosClient from "../../config/axiosClient";

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu nhập lại không khớp');
            return;
        }

        try {
            await axiosClient.post('/auth/register', {
                fullName: formData.fullName,
                email: formData.email,
                password: formData.password,
            });

            alert("Đăng ký thành công! Hãy đăng nhập.");
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Đăng ký thất bại');
        }
    };

    return (
        /* Nền ngoài cùng màu F3F3F4 */
        <div className="min-h-screen flex items-center justify-center bg-[#F3F3F4] p-6 font-sans">
            
            <div className="bg-white border border-gray-100 rounded-[40px] shadow-2xl max-w-[480px] w-full p-8 md:p-12 space-y-6">
                
                {/* Logo & Header */}
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <SparklesIcon className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Tạo tài khoản mới</h1>
                    <p className="text-gray-400 text-sm mt-2 font-medium">Hãy bắt đầu hành trình của bạn với HelvetiCore.</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4 text-left">
                    {error && (
                        <div className="bg-red-50 text-red-500 text-xs p-3 rounded-xl border border-red-100 text-center font-medium">
                            {error}
                        </div>
                    )}
                    
                    {/* Tên đầy đủ */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Tên đầy đủ</label>
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

                    {/* Số điện thoại */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Số điện thoại</label>
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

                    {/* Email */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Email</label>
                        <div className="relative">
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
                    </div>

                    {/* Mật khẩu & Nhập lại mật khẩu (Dùng Grid để thu ngắn form) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Mật khẩu</label>
                            <div className="relative">
                                <LockClosedIcon className="absolute left-4 top-3 text-gray-400 w-5 h-5 stroke-[1.5px]" />
                                <input 
                                    name="password"
                                    type="password" 
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all text-sm"
                                    placeholder="••••••••"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Nhập lại</label>
                            <div className="relative">
                                <LockClosedIcon className="absolute left-4 top-3 text-gray-400 w-5 h-5 stroke-[1.5px]" />
                                <input 
                                    name="confirmPassword"
                                    type="password" 
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all text-sm"
                                    placeholder="••••••••"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-1 py-2">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 accent-black" required />
                        <span className="text-[11px] text-gray-400 font-medium">Tôi đồng ý với các điều khoản dịch vụ</span>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full bg-black text-white py-4 rounded-full font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-[0.98]"
                    >
                        Đăng ký ngay
                    </button>
                </form>

                <p className="text-sm text-gray-500 text-center font-medium">
                    Đã có tài khoản? <span 
                        onClick={() => navigate('/login')} 
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