import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ptBR from "./locales/pt-BR.json";
import enUS from "./locales/en-US.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "pt-BR": {
        translation: ptBR,
      },
      "en-US": {
        translation: enUS,
      },
      pt: {
        translation: ptBR,
      },
      en: {
        translation: enUS,
      },
    },
    fallbackLng: "pt-BR",
    debug: process.env.NODE_ENV === "development",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
    react: {
      useSuspense: false,
    },
  });

i18n.on("initialized", () => {
  console.log("i18n initialized with language:", i18n.language);
});

i18n.on("languageChanged", (lng) => {
  console.log("Language changed to:", lng);
  document.documentElement.lang = lng;
});

export default i18n;
