import { AlbumRatingView } from "@/shared/album/AlbumRatingView";
import { useAuthStore } from "@/shared/auth/auth.store";
import { PublicAlbumRankingView } from "./PublicAlbumRankingView";

// Recebe userId/albumId por prop (não useParams) pra poder ser montado a partir
// de rotas diferentes (/profile/$userId/album/$albumId, /feed/$userId/album/$albumId)
// sem ficar preso ao id de uma rota específica — mesmo truque do AlbumRatingView.
export function UserAlbumRankingPage({
  userId,
  albumId,
}: {
  userId: string;
  albumId: string;
}) {
  const currentUser = useAuthStore((s) => s.user);

  if (currentUser?.id === userId) {
    return <AlbumRatingView albumId={albumId} />;
  }

  return <PublicAlbumRankingView userId={userId} albumId={albumId} />;
}
