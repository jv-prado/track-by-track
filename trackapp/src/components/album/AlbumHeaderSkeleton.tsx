import { View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";

/** Porta 1:1 de src/shared/album/AlbumHeaderSkeleton.tsx (web). */
export const TRACK_SKELETON_COUNT = 10;

export function AlbumHeaderSkeleton() {
  return (
    <View className="gap-4 pb-4">
      <View className="items-center gap-4">
        <Skeleton className="h-28 w-28 rounded-2xl" />
        <View className="w-full items-center gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </View>
        <View className="flex-row items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </View>
        <View className="mt-2 w-full max-w-md gap-4">
          <Skeleton className="mx-auto h-10 w-32" />
          <Skeleton className="h-3 w-full rounded-full" />
        </View>
      </View>

      <View className="gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </View>
    </View>
  );
}

/** Uma linha de faixa: número + botão de prévia + título/duração + estrelas. */
export function TrackRowSkeleton() {
  return (
    <View className="flex-row flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/5 bg-cinza-escuro p-3">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-7 w-7 rounded-full" />
      <View className="min-w-0 flex-1 gap-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-10" />
      </View>
      <Skeleton className="h-5 w-24 rounded" />
    </View>
  );
}
