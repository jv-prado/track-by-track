/**
 * Fonte única dos valores hex dos tokens (1:1 com src/index.css do web, @theme).
 * `tailwind.config.js` importa daqui pras classNames (bg-dourado, text-roxo,
 * etc); componentes que precisam de cor crua (ícone SVG, sombra, etc — onde
 * className não chega) importam daqui também, nunca reescrevem o hex.
 */
export const colors = {
  roxo: "#5d1f89",
  roxoEscuro: "#341e49",
  roxoVivo: "#7c3aed",
  dourado: "#ffba08",
  douradoClaro: "#f0c878",
  grafite: "#01080e",
  cinzaEscuro: "#171d1f",
  cinza: "#3e3e3f",
  cinzaMedio: "#888888",
  cinzaClaro: "#bcbcbc",
  offwhite: "#e1e1e1",
  branco: "#ffffff",
} as const;
