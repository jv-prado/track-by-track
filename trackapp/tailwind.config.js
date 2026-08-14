/**
 * Tokens 1:1 com src/index.css (@theme) do app web — NÃO inventar valor novo aqui.
 * Qualquer token novo precisa nascer no web primeiro (fonte da verdade é o web).
 */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        roxo: "#5d1f89",
        "roxo-escuro": "#341e49",
        "roxo-vivo": "#7c3aed",
        dourado: "#ffba08",
        "dourado-claro": "#f0c878",
        grafite: "#01080e",
        "cinza-escuro": "#171d1f",
        cinza: "#3e3e3f",
        "cinza-medio": "#888888",
        "cinza-claro": "#bcbcbc",
        offwhite: "#e1e1e1",
        branco: "#ffffff",
      },
      fontFamily: {
        // Regular é o peso default de `font-sans`; pesos específicos (bold,
        // semibold, etc) vêm de src/lib/fonts.ts via style/fontFamily direto —
        // RN não sintetiza negrito de uma família custom carregada só como Regular.
        sans: ["SFProDisplay-Regular"],
      },
      fontSize: {
        // mesmos valores de tamanho/leading do web (rem -> número, 1rem = 16px)
        heading: ["2.75rem", { lineHeight: "120%" }],
        "heading-small": ["2.313rem", { lineHeight: "120%" }],
        "subtitle-large": ["1.938rem", { lineHeight: "150%" }],
        subtitle: ["1.625rem", { lineHeight: "150%" }],
        "paragraph-large": ["1.375rem", { lineHeight: "150%" }],
        paragraph: ["1.125rem", { lineHeight: "150%" }],
        "paragraph-small": ["0.938rem", { lineHeight: "150%" }],
        label: ["0.781rem", { lineHeight: "150%" }],
      },
    },
  },
  plugins: [],
};
