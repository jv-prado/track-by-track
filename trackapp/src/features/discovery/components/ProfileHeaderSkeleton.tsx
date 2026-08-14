import { View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";

// Porta 1:1 de src/features/discovery/components/ProfileHeaderSkeleton.tsx (web).
export function ProfileHeaderSkeleton() {
  return (
    <View className="px-4">
      <Skeleton className="mb-4 h-9 w-20 rounded-lg" />
      <View className="mb-6 flex-row items-center justify-between gap-4">
        <View className="flex-row items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <View className="gap-1.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </View>
        </View>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </View>
      <View className="mb-6 flex-row gap-3">
        <Skeleton className="h-16 flex-1 rounded-xl" />
        <Skeleton className="h-16 flex-1 rounded-xl" />
      </View>
      <Skeleton className="h-10 w-full rounded-lg" />
    </View>
  );
}
