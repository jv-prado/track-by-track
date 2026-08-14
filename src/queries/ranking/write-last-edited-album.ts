import type { QueryClient } from "@tanstack/react-query";
import type { AlbumDetail, LastEditedAlbum, RankingView } from "@/shared/api/types";
import { albumCatalogKeys } from "@/queries/album-catalog/keys";
import { discoveryKeys } from "@/queries/discovery/keys";

/**
 * Evita o GET de `/discovery/me/last-edited-album` a cada nota: o álbum já está no cache
 * (é a própria página de rating) e a resposta do PATCH já tem tudo que o card precisa.
 *
 * Só escreve otimista quando `rated > 0` — espelha `HAS_RATED_TRACK_MATCH` em
 * discovery.service.ts (só faixa avaliada conta como "editado", ignorar não conta). Zerar
 * a última faixa avaliada tira o álbum de "editado" e só um fetch real sabe qual é o
 * segundo colocado, por isso o fallback pra invalidate nesse caso.
 */
export function writeLastEditedAlbum(
  queryClient: QueryClient,
  userId: string,
  albumId: string,
  ranking: RankingView,
): void {
  const album = queryClient.getQueryData<AlbumDetail>(albumCatalogKeys.detail(albumId));

  if (ranking.progress.rated > 0 && album) {
    queryClient.setQueryData<LastEditedAlbum>(discoveryKeys.lastEditedAlbum(userId), {
      albumId,
      albumName: album.name,
      albumArtist: album.artist,
      albumImageUrl: album.imageUrl,
      averageScore: ranking.averageScore,
      progress: {
        rated: ranking.progress.rated,
        total: ranking.progress.total,
        percentage: ranking.progress.percentage,
      },
      updatedAt: ranking.updatedAt,
    });
    return;
  }

  queryClient.invalidateQueries({ queryKey: discoveryKeys.lastEditedAlbum(userId) });
}
