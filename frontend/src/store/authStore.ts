import { create } from 'zustand';
import api from '../services/api';

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  bio?: string;
  avatar?: string;
}

const isTokenExpired = (token: string): boolean => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return true;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    if (!decoded || !decoded.exp) {
      return true;
    }
    return decoded.exp < Date.now() / 1000;
  } catch {
    return true;
  }
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? (() => {
    const token = localStorage.getItem('auth_token');
    if (token && isTokenExpired(token)) {
      localStorage.removeItem('auth_token');
      return null;
    }
    return token;
  })() : null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('auth/login/', { username, password });
      const { access } = response.data;
      localStorage.setItem('auth_token', access);
      set({ token: access, isAuthenticated: true, error: null });
      await get().fetchProfile();
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Invalid username or password';
      set({ error: errorMsg, isLoading: false, isAuthenticated: false });
      return false;
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('auth/register/', userData);
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      const errorMsg = Object.values(err.response?.data || {}).flat().join(' ') || 'Registration failed';
      set({ error: errorMsg, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  fetchProfile: async () => {
    try {
      const response = await api.get('auth/me/');
      set({ user: response.data, isAuthenticated: true });
    } catch (err) {
      get().logout();
    }
  },

  initializeAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      if (isTokenExpired(token)) {
        get().logout();
        return;
      }
      set({ token, isLoading: true });
      try {
        await get().fetchProfile();
      } catch (err) {
        get().logout();
      } finally {
        set({ isLoading: false });
      }
    }
  }
}));

// Listen to global unauthorized event
if (typeof window !== 'undefined') {
  window.addEventListener('auth_unauthorized', () => {
    useAuthStore.getState().logout();
  });
}
