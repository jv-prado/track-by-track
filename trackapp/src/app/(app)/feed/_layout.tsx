import { Stack } from "expo-router";

// Stack aninhado dentro da tab "Feed" — mesma ideia do search/_layout.tsx.
export default function FeedStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
