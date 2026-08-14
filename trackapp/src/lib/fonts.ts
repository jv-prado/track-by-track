/**
 * SF Pro Display — mesmos 6 arquivos do app web (src/assets/fonts no repo web),
 * copiados pra trackapp/assets/fonts. RN carrega cada peso como família própria
 * (não sintetiza negrito de uma única família Regular), por isso o mapa aqui —
 * usar essas chaves como fontFamily nas classNames/estilos que pedem peso
 * específico (title/heading/subtitle/etc na escala do global.css).
 */
// Metro resolve asset por `require()` estático — precisa ser literal, não dá pra
// trocar por import()/variável. eslint-disable é o padrão aceito nesse caso em RN.
/* eslint-disable @typescript-eslint/no-require-imports */
export const FONT_ASSETS = {
  "SFProDisplay-Regular": require("../../assets/fonts/SFProDisplay-Regular.otf"),
  "SFProDisplay-RegularItalic": require("../../assets/fonts/SFProDisplay-RegularItalic.otf"),
  "SFProDisplay-Medium": require("../../assets/fonts/SFProDisplay-Medium.otf"),
  "SFProDisplay-Semibold": require("../../assets/fonts/SFProDisplay-Semibold.otf"),
  "SFProDisplay-Bold": require("../../assets/fonts/SFProDisplay-Bold.otf"),
  "SFProDisplay-Heavy": require("../../assets/fonts/SFProDisplay-Heavy.otf"),
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */

export type FontFamily = keyof typeof FONT_ASSETS;
