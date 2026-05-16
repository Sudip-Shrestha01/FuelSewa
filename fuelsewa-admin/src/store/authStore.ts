import { create } from "zustand";
import api from "../api/axios";

interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface AuthState {
  admin: Admin | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  token: localStorage.getItem("token"),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, data } = res.data;

      if (data.role !== "admin") {
        set({ loading: false, error: "Access denied. Admins only." });
        return;
      }

      localStorage.setItem("token", token);
      set({ token, admin: data, loading: false });
    } catch (err: any) {
      set({
        loading: false,
        error: err.response?.data?.message || "Login failed",
      });
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ admin: null, token: null });
  },
}));
