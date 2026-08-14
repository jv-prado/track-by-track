import { useLocalSearchParams } from "expo-router";
import { UserAlbumRankingPage } from "@/features/ranking/components/UserAlbumRankingPage";

// Equivalente de src/routes/_app.profile.$userId_.album.$albumId.tsx (web).
export default function ProfileAlbumDetailScreen() {
  const { userId, albumId } = useLocalSearchParams<{ userId: string; albumId: string }>();
  return <UserAlbumRankingPage userId={userId} albumId={albumId} />;
}
