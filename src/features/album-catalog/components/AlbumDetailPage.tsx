import { useParams } from "@tanstack/react-router";
import { AlbumRatingView } from "@/shared/album/AlbumRatingView";

export function AlbumDetailPage() {
  const { albumId } = useParams({ from: "/_app/album/$albumId" });
  return <AlbumRatingView albumId={albumId} />;
}
