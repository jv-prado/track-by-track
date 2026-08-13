import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  // Impedir que o Vite tente ler o package.json pai
  root: resolve(__dirname),
  // Desabilitar a leitura de package.json do diretório pai
  server: {
    fs: {
      strict: true,
      allow: [".."],
    },
  },
});
