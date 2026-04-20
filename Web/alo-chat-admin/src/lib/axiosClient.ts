import axios from "axios";

const API_URL = "http://localhost:8888/api/v1/admin/management";

export const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

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
      if (token) {
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
  (error) => {
    if (error.response && error.response.status === 401) {
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        document.cookie = "admin_token=; Max-Age=0; path=/"; // clear invalid token
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
