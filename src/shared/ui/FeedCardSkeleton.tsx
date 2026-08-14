import { Skeleton } from "@/shared/ui/Skeleton";

export function FeedCardSkeleton() {
  return (
    <div className="bg-cinza-escuro border border-white/5 rounded-xl flex flex-col">
      <Skeleton className="w-full aspect-square rounded-t-xl rounded-b-none" />
      <div className="p-3 sm:p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2 mt-2" />
        <div className="flex items-center gap-1.5 mt-2">
          <Skeleton className="w-5 h-5 rounded-full shrink-0" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-16 mt-2" />
      </div>
    </div>
  );
}
