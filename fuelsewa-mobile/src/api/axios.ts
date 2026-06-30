import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Constants from "expo-constants";

const getBaseURL = () => {
  const envURL = Constants.expoConfig?.extra?.apiUrl;
  if (envURL) return envURL;
  return "http://192.168.1.84:3000/api";
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
