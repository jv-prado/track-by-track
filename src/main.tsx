import React from "react";
import ReactDOM from "react-dom/client";
import { AppProviders } from "./app/providers";
import "./i18n";
import "./index.css";

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
