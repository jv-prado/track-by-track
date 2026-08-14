import { useLocalSearchParams } from "expo-router";
import { PublicProfilePage } from "@/features/discovery/components/PublicProfilePage";

// Equivalente de src/routes/_app.profile.$userId.tsx (web).
export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <PublicProfilePage userId={userId} />;
}
