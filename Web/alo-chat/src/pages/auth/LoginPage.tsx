import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('http://localhost:8080/auth-service/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('accessToken', data.accessToken);
                alert("Đăng nhập thành công!");
                navigate('/contacts');
            } else {
                setError(data.message || 'Đăng nhập thất bại');
            }
        } catch (err) {
            setError('Không thể kết nối đến server');
        }
    };

    return (
        /* Ngoài cùng màu F3F3F4 */
        <div className="min-h-screen flex items-center justify-center bg-[#F3F3F4] p-4 font-sans">
            
            <div className="bg-white border border-gray-100 rounded-[40px] shadow-2xl max-w-5xl w-full p-8 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                
                {/* Cột bên trái: Form đăng nhập */}
                <div className="space-y-8">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Chào mừng trở lại</h1>
                        <p className="text-gray-500 font-medium">Đăng nhập vào tài khoản của bạn để tiếp tục.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">Email hoặc Phone</label>
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
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mật khẩu</label>
                                <a href="#" className="text-[10px] font-bold text-gray-400 hover:text-black transition-colors underline decoration-gray-200 underline-offset-4">Quên mật khẩu?</a>
                            </div>
                            <div className="relative">
                                <LockClosedIcon className="absolute left-4 top-3.5 text-gray-400 h-5 w-5 stroke-1.5" />
                                <input 
                                    type="password" 
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="w-full bg-black text-white py-4 rounded-full font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-[0.98]"
                        >
                            Đăng nhập
                        </button>
                    </form>

                    <div className="relative flex items-center justify-center">
                        <div className="border-t w-full border-gray-100"></div>
                        <span className="bg-white px-4 text-[10px] font-bold text-gray-400 uppercase absolute tracking-widest">Hoặc tiếp tục với</span>
                    </div>

                    <button className="w-full flex items-center justify-center gap-3 py-3.5 border border-gray-100 rounded-full hover:bg-gray-50 transition-all font-semibold text-gray-700">
                        <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-black">G</span>
                        Tiếp tục với Google
                    </button>
                </div>

                {/* Cột bên phải: QR Code */}
                <div className="hidden md:flex flex-col items-center justify-center bg-gray-50/50 rounded-[35px] p-12 aspect-square border border-gray-50">
                    <div className="bg-white p-6 rounded-[30px] shadow-xl mb-6 border border-gray-100/50">
                        <div className="w-44 h-44 bg-gray-900 flex items-center justify-center rounded-2xl overflow-hidden shadow-inner">
                             {/* Thay bằng ảnh QR thực tế sau */}
                            <div className="text-white text-[10px] text-center p-6 italic opacity-40 leading-relaxed">
                                QR Code <br/> Processing...
                            </div>
                        </div>
                    </div>
                    <h2 className="text-xl font-extrabold mb-2 text-gray-900">Đăng nhập với QR Code</h2>
                    <p className="text-gray-400 text-center text-sm max-w-[250px] mb-8 font-medium leading-relaxed">
                        Quét mã này bằng ứng dụng trên điện thoại của bạn để đăng nhập nhanh.
                    </p>
                    <p className="text-sm text-gray-400 font-medium">
                        Không có tài khoản? <span 
                            onClick={() => navigate('/register')}
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