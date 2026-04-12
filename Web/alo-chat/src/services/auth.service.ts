import axiosClient from '../config/axiosClient';

export const authService = {
  // Hàm đăng nhập thông thường (Email/Pass)
  login: async (credentials: any) => {
    // Nó sẽ gọi đến: http://localhost:8888/api/v1/auth/login
    const response = await axiosClient.post('/auth/login', credentials);
    return response; 
  },

  // Hàm lấy mã QR (mà lúc nãy ông đang bị lỗi CORS đó)
  getQrToken: async () => {
    const response = await axiosClient.get('/auth/qr/generate');
    return response;
  }
};