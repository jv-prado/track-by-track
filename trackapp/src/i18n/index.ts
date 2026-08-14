import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import ptBR from "./locales/pt-BR.json";
import enUS from "./locales/en-US.json";
import esES from "./locales/es-ES.json";

/**
 * Porta de src/i18n/index.ts (web) — mesmos recursos/fallback/interpolation.
 * `i18next-browser-languagedetector` é web-only (usa `localStorage`/
 * `navigator`); RN troca por `expo-localization` (locale do SO) +
 * `AsyncStorage` (preferência salva, equivalente ao `caches: ["localStorage"]`
 * do web).
 */
const STORAGE_KEY = "i18nextLng";

const resources = {
  "pt-BR": { translation: ptBR },
  "en-US": { translation: enUS },
  "es-ES": { translation: esES },
  pt: { translation: ptBR },
  en: { translation: enUS },
  es: { translation: esES },
};

async function detectLanguage(): Promise<string> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  return Localization.getLocales()[0]?.languageTag ?? "pt-BR";
}

let initPromise: Promise<typeof i18n> | null = null;

export function initI18n(): Promise<typeof i18n> {
  if (!initPromise) {
    initPromise = (async () => {
      const lng = await detectLanguage();
      await i18n.use(initReactI18next).init({
        resources,
        lng,
        fallbackLng: "pt-BR",
        debug: false,
        interpolation: { escapeValue: false },
        react: { useSuspense: false },
      });

      i18n.on("languageChanged", (nextLng) => {
        void AsyncStorage.setItem(STORAGE_KEY, nextLng);
      });

      return i18n;
    })();
  }
  return initPromise;
}

export default i18n;
