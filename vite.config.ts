import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Impedir que o Vite tente ler o package.json pai
  root: resolve(__dirname),
  // Desabilitar a leitura de package.json do diretório pai
  server: {
    fs: {
      strict: true,
      allow: [".."],
    },
  },
  build: {
    rollupOptions: {
      external: ["typewriter-effect"],
    },
  },
});
