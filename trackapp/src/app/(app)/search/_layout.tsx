import { Stack } from "expo-router";

/**
 * Stack aninhado dentro da tab "Buscar" — o detalhe do álbum
 * (`search/[albumId]`) abre por cima mantendo a tab bar visível, igual ao
 * web (`_app.search_.$albumId.tsx` é filho do mesmo `_app.tsx` persistente
 * que renderiza a sidebar/tab bar).
 */
export default function SearchStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
