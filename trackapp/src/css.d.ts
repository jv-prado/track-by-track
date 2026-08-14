// Ambient declaration pro import de side-effect do global.css (nativewind-env.d.ts
// referencia "nativewind/types", mas o pacote não expõe isso de um jeito que o
// `tsc --noEmit` isolado resolva fora do Metro — esse arquivo cobre isso direto.
declare module "*.css";
