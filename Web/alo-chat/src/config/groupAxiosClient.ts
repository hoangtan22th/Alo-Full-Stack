// src/config/axiosClient.ts
import axios from "axios";
import type { InternalAxiosRequestConfig, AxiosResponse } from "axios";

// Cấu hình Gateway và Group Local
const GATEWAY_URL = "http://localhost:8888/api/v1";
const GROUP_LOCAL_URL = "http://localhost:8082/api/v1"; // Tạm thời trỏ thẳng local Group Service

// Factory function để dùng chung config & interceptors
const createAxiosInstance = (baseURL: string) => {
  const instance = axios.create({
    baseURL: baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 30000,
    withCredentials: false,
  });

  // Request Interceptor
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem("accessToken");

      console.log("🚀 [REQUEST]", {
        url: config.baseURL + (config.url || ""),
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

  // Response Interceptor
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      console.log("✅ [RESPONSE]", {
        url: response.config.url,
        status: response.status,
        data: response.data,
      });

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
      console.error("❌ [RESPONSE ERROR]", {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        code: error.code,
        data: error.response?.data,
      });

      if (error.code === "ERR_NETWORK") {
        console.error("⚠️ KHÔNG THỂ KẾT NỐI BACKEND!");
        console.error(`   → Đang cố gắng kết nối tới: ${baseURL}`);
      }
      return Promise.reject(error);
    },
  );

  return instance;
};

// Instance mặc định (Đi qua Gateway)
const axiosClient = createAxiosInstance(GATEWAY_URL);

// Instance RIÊNG cho Group Service (Bypass Gateway) - BẮT BUỘC PHẢI CÓ EXPORT
export const groupAxiosClient = createAxiosInstance(GROUP_LOCAL_URL);

export default axiosClient;
