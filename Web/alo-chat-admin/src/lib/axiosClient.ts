import axios from "axios";

const API_URL = "http://localhost:8888/api/v1/admin/management";
const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8888";

export const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosClient.interceptors.request.use(
  (config) => {
    // Only access document.cookie if running on the client side
    if (typeof window !== "undefined") {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift();
        return null;
      };

      const token = getCookie("admin_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// You can add response interceptors to handle global 401s here if needed
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const bodyValue: Record<string, string> = {};
        if (typeof window !== "undefined") {
          const rt = localStorage.getItem("admin_refresh_token");
          if (rt) {
            bodyValue["refreshToken"] = rt;
          }
        }

        // Send request to Gateway to get new access token using HttpOnly Cookie
        const res = await axios.post(
          `${GATEWAY_URL}/api/v1/auth/refresh`,
          bodyValue,
          {
            withCredentials: true,
          },
        );

        // Extract token
        const newAccessToken =
          res.data?.data?.accessToken ||
          res.data?.data?.token ||
          res.data?.accessToken;

        const newRefreshToken = res.data?.data?.refreshToken;
        if (typeof window !== "undefined" && newRefreshToken) {
          localStorage.setItem("admin_refresh_token", newRefreshToken);
        }

        if (newAccessToken) {
          // Update cookie
          if (typeof window !== "undefined") {
            document.cookie = `admin_token=${newAccessToken}; path=/; max-age=604800; samesite=Lax`;
          }

          if (axiosClient.defaults.headers.common) {
            axiosClient.defaults.headers.common["Authorization"] =
              `Bearer ${newAccessToken}`;
          }
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          processQueue(null, newAccessToken);
          isRefreshing = false;

          // Retry the original failing request
          return axiosClient(originalRequest);
        } else {
          throw new Error("Failed to get new token");
        }
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;

        // If refresh fails, log out basically
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login"
        ) {
          localStorage.removeItem("admin_refresh_token");
          document.cookie = "admin_token=; Max-Age=0; path=/";
          window.location.href = "/login";
        }
        return Promise.reject(error); // Reject with original 401 error
      }
    }

    return Promise.reject(error);
  },
);
