import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const IP_ADDRESS = "192.168.1.8";

const api = axios.create({
  baseURL: `http://${IP_ADDRESS}:8080/auth-service`,
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
