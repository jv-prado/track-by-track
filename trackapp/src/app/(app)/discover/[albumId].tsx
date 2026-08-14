import { useLocalSearchParams } from "expo-router";
import { AlbumRatingView } from "@/components/album/AlbumRatingView";

// Equivalente de src/routes/_app.discover_.$albumId.tsx (web).
export default function DiscoverAlbumDetailScreen() {
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  return <AlbumRatingView albumId={albumId} />;
}
