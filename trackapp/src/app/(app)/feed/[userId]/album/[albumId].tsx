import { useLocalSearchParams } from "expo-router";
import { UserAlbumRankingPage } from "@/features/ranking/components/UserAlbumRankingPage";

// Equivalente de src/routes/_app.feed_.$userId.album.$albumId.tsx (web).
export default function FeedAlbumDetailScreen() {
  const { userId, albumId } = useLocalSearchParams<{ userId: string; albumId: string }>();
  return <UserAlbumRankingPage userId={userId} albumId={albumId} />;
}
