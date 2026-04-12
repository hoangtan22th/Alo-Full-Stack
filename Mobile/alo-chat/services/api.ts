import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { DeviceEventEmitter } from "react-native";

const IP_ADDRESS = process.env.EXPO_PUBLIC_IP_ADDRESS;

const api = axios.create({
  baseURL: `http://${IP_ADDRESS}:8888/api/v1`,
  timeout: 10000,
});

// Biến cờ để tránh gọi refresh nhiều lần cùng lúc
let isRefreshing = false;
// Hàng đợi: các request bị 401 sẽ chờ ở đây cho đến khi refresh xong
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

// REQUEST INTERCEPTOR: Gắn Access Token vào mỗi request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// RESPONSE INTERCEPTOR: Unwrap ApiResponse + Auto Refresh Token
api.interceptors.response.use(
  (response) => {
    // Unwrap ApiResponse
    if (response.data && response.data.status !== undefined && response.data.data !== undefined) {
      return response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Nếu gặp lỗi 401 (Token hết hạn) VÀ chưa từng thử refresh request này
    console.log("⚡ [API] Lỗi", error.response?.status, "từ:", originalRequest.url);
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log("🔄 [REFRESH] Phát hiện 401 → Bắt đầu refresh token...");
      // Không refresh cho chính API login hoặc refresh (tránh vòng lặp vô tận)
      if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/refresh")
      ) {
        return Promise.reject(error);
      }

      // Nếu đang refresh rồi thì xếp request này vào hàng đợi
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        console.log("🔑 [REFRESH] Refresh token tồn tại:", !!refreshToken);
        if (!refreshToken) {
          console.log("❌ [REFRESH] Không có refresh token → Dừng");
          throw new Error("No refresh token");
        }

        // Gọi API refresh bằng axios gốc (KHÔNG qua interceptor của api)
        const response = await axios.post(
          `http://${IP_ADDRESS}:8888/api/v1/auth/refresh`,
          { refreshToken }
        );

        console.log("✅ [REFRESH] API refresh trả về:", JSON.stringify(response.data).substring(0, 100));
        const newAccessToken = response.data?.data?.accessToken;
        if (!newAccessToken) {
          console.log("❌ [REFRESH] Không tìm thấy accessToken trong response");
          throw new Error("No access token in response");
        }
        console.log("✅ [REFRESH] Có access token mới!");

        // Lưu Access Token mới
        await AsyncStorage.setItem("accessToken", newAccessToken);
        DeviceEventEmitter.emit('token_refreshed');

        // Giải phóng hàng đợi với token mới
        processQueue(null, newAccessToken);

        // Gửi lại request gốc bằng axios gốc rồi tự unwrap
        // (để tránh bị interceptor unwrap 2 lần)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        const retryResponse = await axios(originalRequest);
        console.log("✅ [RETRY] Request gốc thành công! Status:", retryResponse.status);

        // Tự unwrap ApiResponse cho request retry
        if (retryResponse.data && retryResponse.data.status !== undefined && retryResponse.data.data !== undefined) {
          console.log("✅ [RETRY] Data unwrapped thành công");
          return retryResponse.data.data;
        }
        return retryResponse;
      } catch (refreshError: any) {
        console.log("❌ [REFRESH] THẤT BẠI:", refreshError?.message || refreshError?.response?.status || refreshError);
        processQueue(refreshError, null);

        // Xóa hết token -> Phát sự kiện force_logout để AuthContext cập nhật state
        await AsyncStorage.removeItem("accessToken");
        await AsyncStorage.removeItem("refreshToken");
        DeviceEventEmitter.emit('force_logout');

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
