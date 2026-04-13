// src/config/axiosClient.ts
import axios from "axios";
import type { InternalAxiosRequestConfig, AxiosResponse } from "axios";

// ✅ QUAN TRỌNG: Thay đổi baseURL nếu backend chạy port khác
const BASE_URL = "http://localhost:8888/api/v1"; // ← Đảm bảo đúng port

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // Tăng timeout lên 30s
  withCredentials: false, // Tắt credentials nếu không cần
});

// Log mỗi request
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("accessToken");

    // Log chi tiết request
    console.log("🚀 [REQUEST]", {
      url: config.baseURL + config.url,
      method: config.method,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : null,
    });

    if (
      token &&
      token !== "undefined" &&
      token !== "null" &&
      token.trim() !== ""
    ) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  },
);

// Log response chi tiết
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log("✅ [RESPONSE]", {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });

    // Xử lý response theo cấu trúc backend của bạn
    if (
      response.data &&
      response.data.status !== undefined &&
      response.data.data !== undefined
    ) {
      return response.data.data;
    }
    return response.data;
  },
  (error: any) => {
    // Log chi tiết lỗi
    console.error("❌ [RESPONSE ERROR]", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      code: error.code,
      data: error.response?.data,
    });

    if (error.response?.status === 401) {
      console.warn("⚠️ Token hết hạn hoặc không hợp lệ, đang đăng xuất...");
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }

    // Xử lý các loại lỗi
    if (error.code === "ERR_NETWORK") {
      console.error("⚠️ KHÔNG THỂ KẾT NỐI BACKEND!");
      console.error(`   → Đang cố gắng kết nối tới: ${BASE_URL}`);
      console.error("   → Hãy kiểm tra:");
      console.error("     1. Backend có đang chạy không?");
      console.error("     2. Port có đúng không? (hiện tại: 8888)");
      console.error("     3. Có CORS error không? (xem Console)");
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
