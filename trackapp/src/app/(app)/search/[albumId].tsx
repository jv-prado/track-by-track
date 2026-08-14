import { useLocalSearchParams } from "expo-router";
import { AlbumRatingView } from "@/components/album/AlbumRatingView";

// Equivalente de src/routes/_app.search_.$albumId.tsx (web).
export default function SearchAlbumDetailScreen() {
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  return <AlbumRatingView albumId={albumId} />;
}
