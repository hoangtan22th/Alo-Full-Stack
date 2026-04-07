import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const IP_ADDRESS = process.env.EXPO_PUBLIC_IP_ADDRESS;

const api = axios.create({
  baseURL: `http://${IP_ADDRESS}:8888/api/v1`,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ADD RESPONSE INTERCEPTOR TO UNWRAP ApiResponse
api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.status !== undefined && response.data.data !== undefined) {
      return response.data.data;
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
