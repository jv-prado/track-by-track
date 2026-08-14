import * as SecureStore from "expo-secure-store";

/**
 * Equivalente mobile do cookie httpOnly do web (ver CLAUDE.md seção 4.4): RN
 * não tem cookie jar de browser, então o refresh token vive aqui — Keychain no
 * iOS, Keystore no Android via expo-secure-store, não AsyncStorage puro.
 */
const REFRESH_TOKEN_KEY = "trackbytrack.refreshToken";

export const secureTokenStorage = {
  getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string): Promise<void> {
    return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },
  clearRefreshToken(): Promise<void> {
    return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};
