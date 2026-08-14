import { Stack } from "expo-router";

// Layout público — equivalente de src/routes/_auth.tsx (web).
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
