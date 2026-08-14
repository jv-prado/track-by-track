import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { router } from "expo-router";
import { env } from "@/app/env";
import { authStore } from "@/shared/auth/auth.store";
import { secureTokenStorage } from "@/shared/auth/secure-storage";
import { toApiError } from "./errors";
import type { RefreshResponse } from "./types";

/**
 * Porta de src/shared/api/http.ts (web) — mesma lógica de single-flight
 * refresh, adaptada pra quem não tem cookie jar de browser:
 * - web manda o refresh token via cookie httpOnly automático;
 * - mobile manda no CORPO (secureTokenStorage), e por isso todo request sai
 *   com `X-Client: mobile` — é o sinal que a API usa (auth.controller.ts) pra
 *   devolver o refresh token no corpo em vez de só setar cookie.
 */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export const http = axios.create({
  baseURL: env.EXPO_PUBLIC_API_URL,
  timeout: 20_000,
  headers: { "X-Client": "mobile" },
});

/** Instância crua, sem interceptors — evita loop infinito ao chamar /auth/refresh. */
const rawHttp = axios.create({
  baseURL: env.EXPO_PUBLIC_API_URL,
  timeout: 20_000,
  headers: { "X-Client": "mobile" },
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
 * Single-flight: mesma razão do web (ver comentário lá) — dois refresh
 * concorrentes com o mesmo refresh token fazem o servidor detectar reuso e
 * revogar a família inteira, deslogando o usuário. Nunca chamar
 * rawHttp.post("/auth/refresh") fora daqui.
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await secureTokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error("Sem refresh token salvo.");
      }
      const { data } = await rawHttp.post<RefreshResponse>("/auth/refresh", {
        refreshToken,
      });
      if (data.refreshToken) {
        await secureTokenStorage.setRefreshToken(data.refreshToken);
      }
      return data.accessToken;
    })().finally(() => {
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
      await secureTokenStorage.clearRefreshToken();
      router.replace("/login");
      throw toApiError(refreshError);
    }
  },
);
