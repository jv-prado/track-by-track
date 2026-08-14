import { View } from "react-native";
import { Skeleton } from "./Skeleton";

// Porta 1:1 de src/shared/ui/FeedCardSkeleton.tsx (web).
export function FeedCardSkeleton() {
  return (
    <View className="flex-1 gap-2 rounded-xl border border-white/5 bg-cinza-escuro p-3">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <View className="flex-row items-center gap-1.5">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </View>
      <Skeleton className="h-4 w-16" />
    </View>
  );
}
