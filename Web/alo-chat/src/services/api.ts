import axios, { type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/useAuthStore";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8888/api/v1";

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config: CustomAxiosRequestConfig) => {
    // Luôn lấy token mới nhất từ store
    const { accessToken } = useAuthStore.getState();

    console.log("🚀 [REQUEST]", {
      url: config.baseURL + (config.url || ""),
      method: config.method,
      hasToken: !!accessToken,
    });

    if (accessToken) {
      config.headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Tùy chỉnh việc bóc tách data
    if (response.data && response.data.data !== undefined) {
      return response.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    // Lỗi mạng
    if (error.code === "ERR_NETWORK") {
      console.error("⚠️ [NETWORK ERROR] Không thể kết nối tới backend!");
      return Promise.reject(error);
    }

    // Xử lý hết hạn token (401)
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const { refreshToken, updateTokens, logout } = useAuthStore.getState();

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Gọi API để làm mới token
        const response = await axios.post(`${BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } =
          response.data?.data || response.data;

        // Cập nhật lại vào Zustand store
        updateTokens(accessToken, newRefreshToken || refreshToken);

        // Cập nhật token cho request cũ và gửi lại
        if (originalRequest.headers) {
          originalRequest.headers.set("Authorization", `Bearer ${accessToken}`);
        }
        return api(originalRequest);
      } catch (refreshError) {
        console.warn(
          "⚠️ Refresh token thất bại hoặc hết hạn, vui lòng đăng nhập lại.",
        );

        // Gọi hàm logout trong store để dọn dẹp sạch sẽ
        useAuthStore.getState().logout();
        window.location.href = "/login"; // Force redirect

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
