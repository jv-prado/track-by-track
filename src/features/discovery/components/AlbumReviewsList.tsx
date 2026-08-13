import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { useAlbumReviewsInfiniteQuery } from "@/queries/discovery";
import { getInitials } from "@/shared/lib/initials";
import { Spinner } from "@/shared/ui/Spinner";

export function AlbumReviewsList({ albumId }: { albumId: string }) {
  const { t } = useTranslation();
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAlbumReviewsInfiniteQuery(albumId);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const items = data?.pages.flatMap((page) => page.data) ?? [];

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading || items.length === 0) return null;

  return (
    <div>
      <h2 className="text-white font-semibold flex items-center gap-2 mb-3">
        <Users size={16} className="text-dourado" /> {t("communityReviews.title")}
      </h2>

      <div className="columns-2 sm:columns-3 gap-3 [column-fill:_balance]">
        {items.map((review) => (
          <Link
            key={review.rankingId}
            to="/perfil/$usuarioId/album/$albumId"
            params={{ usuarioId: review.userId, albumId }}
            className="mb-3 flex flex-col break-inside-avoid bg-cinza-escuro border border-white/5 rounded-xl p-3 hover:border-dourado/30 hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-2 mb-1">
              {review.userAvatarUrl ? (
                <img src={review.userAvatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-cinza-medio flex items-center justify-center shrink-0">
                  <span className="text-gray-300 text-[10px] font-semibold leading-none">
                    {getInitials(review.userDisplayName)}
                  </span>
                </div>
              )}
              <span className="text-white text-sm font-medium truncate">{review.userDisplayName}</span>
            </div>
            <span className="text-dourado text-sm font-bold mb-1">{review.averageScore.toFixed(1)}</span>
            {review.reviewText ? (
              <p className="text-gray-300 text-sm">{review.reviewText}</p>
            ) : (
              <p className="text-gray-500 text-sm italic">{t("communityReviews.ratingOnly")}</p>
            )}
          </Link>
        ))}
      </div>

      {hasNextPage && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {isFetchingNextPage && <Spinner className="h-6 w-6" />}
        </div>
      )}
    </div>
  );
}
