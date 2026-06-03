import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/axios";
import { useNotificationStore } from "./notificationStore";

export type UserRole = "customer" | "driver";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  contactNumber?: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<UserRole | null>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
  clearError: () => void;
}

export interface RegisterData {
  firstName: string;
  middleName?: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  loadToken: async () => {
    const token = await AsyncStorage.getItem("token");
    const userStr = await AsyncStorage.getItem("user");
    if (token && userStr) {
      set({ token, user: JSON.parse(userStr) });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, data } = res.data;
      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(data));
      // Clear previous notifications from a different role
      useNotificationStore.getState().clear();
      set({ token, user: data, loading: false });
      return data.role as UserRole;
    } catch (err: any) {
      set({
        loading: false,
        error: err.response?.data?.message || "Login failed. Check your credentials.",
      });
      return null;
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      await api.post("/auth/register", data);
      set({ loading: false });
    } catch (err: any) {
      set({
        loading: false,
        error: err.response?.data?.message || "Registration failed.",
      });
      throw err;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    // Clear notifications on logout
    useNotificationStore.getState().clear();
    set({ user: null, token: null });
  },

  clearError: () => set({ error: null }),
}));
