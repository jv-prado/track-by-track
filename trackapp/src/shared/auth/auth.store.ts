import { create } from "zustand";

// Porta 1:1 de src/shared/auth/auth.store.ts (web) — mesma forma, mesma regra:
// só sessão em memória aqui. O refresh token NÃO mora nesta store (mora no
// secure-storage.ts, equivalente ao cookie httpOnly do web).

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (session: { accessToken: string; user: AuthUser }) => void;
  updateUser: (user: AuthUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  setSession: ({ accessToken, user }) => set({ accessToken, user, isAuthenticated: true }),
  updateUser: (user) => set({ user }),
  clearSession: () => set({ accessToken: null, user: null, isAuthenticated: false }),
}));

/** Fora de componentes React (ex: interceptor do axios) — leitura/escrita direta da store. */
export const authStore = {
  getAccessToken: () => useAuthStore.getState().accessToken,
  getUser: () => useAuthStore.getState().user,
  setSession: (session: { accessToken: string; user: AuthUser }) =>
    useAuthStore.getState().setSession(session),
  setAccessToken: (accessToken: string) => {
    const user = useAuthStore.getState().user;
    if (user) useAuthStore.getState().setSession({ accessToken, user });
  },
  clearSession: () => useAuthStore.getState().clearSession(),
};
