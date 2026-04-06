import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:8888/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && token !== "undefined" && token !== "null" && token.trim() !== "") {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.data && response.data.status !== undefined && response.data.data !== undefined) {
      return response.data.data;
    }
    return response;
  },
  (error: any) => Promise.reject(error)
);

export default axiosClient;
