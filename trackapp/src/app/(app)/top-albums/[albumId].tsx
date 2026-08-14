import { useLocalSearchParams } from "expo-router";
import { AlbumRatingView } from "@/components/album/AlbumRatingView";

// Equivalente de src/routes/_app.top-albums_.$albumId.tsx (web).
export default function TopAlbumsAlbumDetailScreen() {
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  return <AlbumRatingView albumId={albumId} />;
}
