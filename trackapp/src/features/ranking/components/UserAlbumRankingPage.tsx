import { AlbumRatingView } from "@/components/album/AlbumRatingView";
import { useAuthStore } from "@/shared/auth/auth.store";
import { PublicAlbumRankingView } from "./PublicAlbumRankingView";

// Porta 1:1 de src/features/ranking/components/UserAlbumRankingPage.tsx (web).
export function UserAlbumRankingPage({ userId, albumId }: { userId: string; albumId: string }) {
  const currentUser = useAuthStore((s) => s.user);

  if (currentUser?.id === userId) {
    return <AlbumRatingView albumId={albumId} />;
  }

  return <PublicAlbumRankingView userId={userId} albumId={albumId} />;
}
