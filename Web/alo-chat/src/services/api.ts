import axios from "axios";
import { useAuthStore } from "../store/useAuthStore"; // Giả định bạn có store này

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8888/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // 1. Lấy token từ Zustand thay vì localStorage trực tiếp (tuỳ cấu hình)
    // const { accessToken } = useAuthStore.getState();

    // Hoặc lấy từ localStorage nếu bạn persist store
    const accessToken = localStorage.getItem("accessToken");

    console.log("🚀 [REQUEST]", {
      url: config.baseURL + config.url,
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
    const originalRequest = error.config;

    // Lỗi mạng
    if (error.code === "ERR_NETWORK") {
      console.error("⚠️ [NETWORK ERROR] Không thể kết nối tới backend!");
      return Promise.reject(error);
    }

    // Xử lý hết hạn token (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Gọi API để làm mới token
        const response = await axios.post(`${BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } =
          response.data?.data || response.data;

        // Lưu vào localStorage
        localStorage.setItem("accessToken", accessToken);
        if (newRefreshToken) {
          localStorage.setItem("refreshToken", newRefreshToken);
        }

        // Cập nhật lại vào Zustand store nếu có hàm setUser/token
        // useAuthStore.getState().setTokens({ accessToken, refreshToken: newRefreshToken || refreshToken });

        // Cập nhật token cho request cũ và gửi lại
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.warn(
          "⚠️ Refresh token thất bại hoặc hết hạn, vui lòng đăng nhập lại.",
        );

        // Clear local storage
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        // Reset Zustand store
        const { logout } = useAuthStore.getState() as any;
        if (typeof logout === "function") {
          logout();
        } else {
          // fallback
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
