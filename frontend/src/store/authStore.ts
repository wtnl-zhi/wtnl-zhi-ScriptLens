import { create } from "zustand";
import { api, User } from "@/lib/api";

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

const storedToken: string | null =
  typeof window !== "undefined" ? localStorage.getItem("token") : null;

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  user: null,
  loading: false,

  login: async (email: string, password: string) => {
    const res = await api.login(email, password);
    api.setToken(res.access_token);
    set({ token: res.access_token, user: res.user });
  },

  register: async (email: string, password: string, name: string) => {
    const res = await api.register(email, password, name);
    api.setToken(res.access_token);
    set({ token: res.access_token, user: res.user });
  },

  logout: () => {
    api.setToken(null);
    set({ token: null, user: null });
  },

  loadUser: async () => {
    try {
      set({ loading: true });
      const user = await api.getMe();
      set({ user, loading: false });
    } catch {
      api.setToken(null);
      set({ token: null, user: null, loading: false });
    }
  },
}));
