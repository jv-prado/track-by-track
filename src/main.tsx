import React from "react";
import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { AppProviders } from "./app/providers";
import "./index.css";

const SUPPORTED_LANGUAGES = ["pt-BR", "en-US", "es-ES"] as const;
const I18N_STORAGE_KEY = "i18nextLng";

/**
 * No app nativo (Capacitor), navigator.language do WebView nem sempre reflete
 * o idioma do sistema operacional de forma confiável. Antes do i18next rodar
 * seu detector (que lê localStorage → navigator), semeamos o localStorage com
 * o idioma real do dispositivo via @capacitor/device — só no primeiro acesso
 * (localStorage ainda vazio). Na web, navigator já é confiável, então pulamos.
 */
async function seedNativeLanguage() {
  if (!Capacitor.isNativePlatform() || localStorage.getItem(I18N_STORAGE_KEY)) {
    return;
  }

  try {
    const { Device } = await import("@capacitor/device");
    const { value } = await Device.getLanguageCode();
    const match = SUPPORTED_LANGUAGES.find((lang) =>
      lang.toLowerCase().startsWith(value.toLowerCase())
    );
    localStorage.setItem(I18N_STORAGE_KEY, match ?? "pt-BR");
  } catch {
    // Falha na leitura do idioma nativo: deixa o detector do i18next cair
    // no fallback normal (navigator do WebView).
  }
}

async function bootstrap() {
  await seedNativeLanguage();
  await import("./i18n");

  // Limpar service workers que podem estar interferindo
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }

  // Calcular a altura real da viewport em dispositivos móveis
  const setViewportHeight = () => {
    // Primeiro obtemos a altura real da viewport
    const vh = window.innerHeight * 0.01;
    // Então definimos o valor em uma variável CSS
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  };

  // Calcular no carregamento inicial
  setViewportHeight();

  // Recalcular quando a janela é redimensionada ou quando ocorre mudança de orientação
  window.addEventListener("resize", setViewportHeight);
  window.addEventListener("orientationchange", setViewportHeight);

  // Script para prevenir zoom em dispositivos móveis, especialmente iOS
  document.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  // Prevenir zoom de duplo toque
  let lastTapTime = 0;
  document.addEventListener(
    "touchend",
    (event) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapTime;
      if (tapLength < 300 && tapLength > 0) {
        event.preventDefault();
      }
      lastTapTime = currentTime;
    },
    { passive: false }
  );

  // Renderização básica do React
  const rootElement = document.getElementById("root");
  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <AppProviders />
      </React.StrictMode>
    );
  }
}

bootstrap();
