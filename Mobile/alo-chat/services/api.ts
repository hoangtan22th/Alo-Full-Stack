import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const IP_ADDRESS = process.env.EXPO_PUBLIC_IP_ADDRESS;

const api = axios.create({
  baseURL: `http://${IP_ADDRESS}:8888/api-gateway/auth-service`,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
