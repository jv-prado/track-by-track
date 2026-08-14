import { Skeleton } from "@/shared/ui/Skeleton";

/**
 * Aproxima o cabeçalho de PublicProfilePage: avatar + nome/seguidores + os 2 StatCard —
 * mesmo layout do real (ver PublicProfilePage.tsx), pra não pular de forma quando os dados
 * chegam. A grade de cards usa FeedCardSkeleton (mesma do Feed/Top Álbuns/Meus Rankings).
 */
export function ProfileHeaderSkeleton() {
  return (
    <div className="w-full">
      <Skeleton className="h-9 w-20 rounded-lg mb-4" />

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Skeleton className="w-14 h-14 rounded-full shrink-0" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 rounded-lg shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Skeleton className="h-16 sm:h-[68px] rounded-xl" />
        <Skeleton className="h-16 sm:h-[68px] rounded-xl" />
      </div>

      <div className="mb-4">
        <Skeleton className="h-10 w-full sm:w-64 rounded-lg" />
      </div>
    </div>
  );
}
