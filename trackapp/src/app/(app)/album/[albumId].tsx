import { useLocalSearchParams } from "expo-router";
import { AlbumRatingView } from "@/components/album/AlbumRatingView";

// Equivalente de src/routes/_app.album.$albumId.tsx (web) — reached a partir
// do botão "Avaliar agora" de PublicAlbumRankingView, ou (Fase 6+) do card
// "continuar avaliando" quando existir na tab bar.
export default function AlbumDetailScreen() {
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  return <AlbumRatingView albumId={albumId} />;
}
