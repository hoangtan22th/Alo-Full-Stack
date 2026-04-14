import axios, { type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/useAuthStore";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8888/api/v1";

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

// Biến cờ và hàng đợi xử lý refresh y hệt Mobile
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Request interceptor
api.interceptors.request.use(
  (config: CustomAxiosRequestConfig) => {
    // Luôn lấy token mới nhất từ localStorage hoặc store
    const storeToken = useAuthStore.getState().accessToken;
    const localToken = localStorage.getItem("accessToken");
    const accessToken = storeToken || localToken;

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
    // Unwrap ApiResponse y hệt Mobile
    if (response.data && response.data.data !== undefined) {
      return response.data.data;
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
      console.log("🔄 [REFRESH WEB] Phát hiện 401 → Bắt đầu refresh token...");

      // Không tự lặp lại vô tận cho API refresh/login
      if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/refresh")
      ) {
        return Promise.reject(error);
      }

      // Đang refresh thì đưa vào queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.set("Authorization", `Bearer ${token}`);
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storeRefreshToken = useAuthStore.getState().refreshToken;
        const refreshToken =
          storeRefreshToken || localStorage.getItem("refreshToken");

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Dùng axios cơ bản (ko qua api interceptor)
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        // Bóc tách API Response
        const newAccessToken =
          response.data?.data?.accessToken || response.data?.accessToken;
        const newRefreshToken =
          response.data?.data?.refreshToken || response.data?.refreshToken;

        if (!newAccessToken) {
          throw new Error("No access token in response");
        }

        console.log(
          "✅ [REFRESH WEB] Đã lấy được Access Token mới thành công!",
        );

        // Lưu Store & LocalStorage
        useAuthStore
          .getState()
          .updateTokens(newAccessToken, newRefreshToken || refreshToken);
        localStorage.setItem("accessToken", newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem("refreshToken", newRefreshToken);
        }

        // Xử lý queue
        processQueue(null, newAccessToken);

        // Retry lại request bị lỗi
        originalRequest.headers.set(
          "Authorization",
          `Bearer ${newAccessToken}`,
        );
        const retryResponse = await axios(originalRequest);

        // Unwrap retry response
        if (retryResponse.data && retryResponse.data.data !== undefined) {
          return retryResponse.data.data;
        }
        return retryResponse;
      } catch (refreshError) {
        console.warn(
          "⚠️ Refresh token thất bại hoặc hết hạn, chuẩn bị dọn phòng...",
          refreshError,
        );

        processQueue(refreshError, null);
        // Thay vì ép chuyển trang gây giật cục, báo hiệu cho layout xử lý hiển thị thông báo
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("force_logout"));
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
