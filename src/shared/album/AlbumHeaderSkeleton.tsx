import { Skeleton } from "@/shared/ui/Skeleton";

/** Nº de linhas de faixa no skeleton — não dá pra saber quantas o álbum real tem antes de carregar. */
export const TRACK_SKELETON_COUNT = 10;

/**
 * Aproxima o cabeçalho de AlbumRatingView/PublicAlbumRankingView: capa, título/artista, botões de
 * streaming, nota/progresso e o painel lateral de 3 blocos — mesmos breakpoints do real (ver
 * AlbumRatingView.tsx), senão o salto do skeleton pro conteúdo pula de layout.
 */
export function AlbumHeaderSkeleton({ showReviewerRow = false }: { showReviewerRow?: boolean }) {
  return (
    <div className="relative pb-4 sm:pb-6">
      {showReviewerRow && (
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/10 sm:gap-3">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="min-w-0 flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-6">
        <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:items-start sm:gap-6 min-w-0">
          <Skeleton className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl shrink-0" />

          <div className="min-w-0 flex w-full flex-col items-center gap-3 sm:items-start">
            <div className="flex w-full flex-col items-center gap-2 sm:items-start">
              <Skeleton className="h-6 sm:h-8 w-48 sm:w-64" />
              <Skeleton className="h-4 w-32" />
            </div>

            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-9 sm:w-20 rounded-lg" />
              <Skeleton className="h-9 w-9 sm:w-20 rounded-lg" />
              <Skeleton className="h-9 w-9 sm:w-20 rounded-lg" />
            </div>

            <div className="flex w-full max-w-md flex-col gap-4 mt-2 sm:mt-4">
              <Skeleton className="h-10 sm:h-14 w-32 mx-auto sm:mx-0" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-96 shrink-0">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Uma linha de faixa: número + botão de prévia + título/duração + estrelas. */
export function TrackRowSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-cinza-escuro border border-white/5 rounded-xl p-3">
      <Skeleton className="h-4 w-4 shrink-0 rounded" />
      <Skeleton className="w-7 h-7 rounded-full shrink-0" />
      <div className="min-w-0 flex-1 flex flex-col gap-1.5">
        <Skeleton className="h-4 w-2/3 max-w-48" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="h-5 w-24 shrink-0 rounded" />
    </div>
  );
}
