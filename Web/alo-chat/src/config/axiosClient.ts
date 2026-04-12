// src/config/axiosClient.ts
import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

const axiosClient = axios.create({
  baseURL: "http://localhost:8888/api/v1",
  headers: { "Content-Type": "application/json" },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosClient.interceptors.response.use(
  (response) => {
    if (
      response.data?.status !== undefined &&
      response.data?.data !== undefined
    ) {
      return response.data.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.error("Token invalid/expired!");

      // BƯỚC QUAN TRỌNG: Xóa sạch token trong Zustand và LocalStorage
      useAuthStore.getState().logout();

      // CHỈ REDIRECT nếu không phải đang ở trang login để tránh loop
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
