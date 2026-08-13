import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { env } from "@/app/env";
import { authStore } from "@/shared/auth/auth.store";
import { toApiError } from "./errors";

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export const http = axios.create({
  baseURL: env.VITE_API_URL,
  withCredentials: true,
  timeout: 20_000,
});

/** Instância crua, sem interceptors — evita loop infinito ao chamar /auth/refresh. */
const rawHttp = axios.create({
  baseURL: env.VITE_API_URL,
  withCredentials: true,
  timeout: 20_000,
});

http.interceptors.request.use((config) => {
  const token = authStore.getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

/**
 * Single-flight: chamado tanto pelo interceptor 401 quanto pelo bootstrap
 * (useAuthBootstrap). Se ambos disparassem POST /auth/refresh cru e
 * concorrente, a rotação no servidor detecta reuso e revoga a família
 * inteira do refresh token — deslogando o usuário. Nunca chamar
 * rawHttp.post("/auth/refresh") fora daqui.
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = rawHttp
      .post<{ accessToken: string }>("/auth/refresh")
      .then((response) => response.data.accessToken)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!(error instanceof AxiosError)) {
      throw toApiError(error);
    }

    const status = error.response?.status;
    const config = error.config as RetriableConfig | undefined;
    const isRefreshCall = config?.url?.includes("/auth/refresh") ?? false;

    if (status !== 401 || !config || config._retried || isRefreshCall) {
      throw toApiError(error);
    }
    config._retried = true;

    try {
      const newAccessToken = await refreshAccessToken();
      authStore.setAccessToken(newAccessToken);
      config.headers.set("Authorization", `Bearer ${newAccessToken}`);
      return await http.request(config);
    } catch (refreshError) {
      authStore.clearSession();
      if (typeof window !== "undefined") {
        window.location.assign("/login");
      }
      throw toApiError(refreshError);
    }
  },
);
