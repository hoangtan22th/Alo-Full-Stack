import axios from "axios";
import type { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { useAuthStore } from "../store/useAuthStore"; 

const axiosClient = axios.create({
  // Nhớ đổi thành link Tunnel nếu ông đang test mạng ngoài nhé
  baseURL: "http://localhost:8888/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // LẤY TOKEN TỪ ZUSTAND STORE
    const token = useAuthStore.getState().token;

    if (token && token.trim() !== "") {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  (error: any) => Promise.reject(error),
);

axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (
      response.data &&
      response.data.status !== undefined &&
      response.data.data !== undefined
    ) {
      return response.data.data;
    }
    return response;
  },
  (error: any) => {
    // Nếu Gateway báo lỗi 401 (Token sai hoặc hết hạn)
    if (error.response && error.response.status === 401) {
      console.error("Token hết hạn, bắt buộc đăng nhập lại!");
      useAuthStore.getState().logout(); // Reset store
      window.location.href = "/login"; // Đá văng ra trang login
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
