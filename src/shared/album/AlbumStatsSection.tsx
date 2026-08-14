import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trophy, ChevronRight } from "lucide-react";
import { useAlbumStatsQuery } from "@/queries/discovery";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { cn } from "@/shared/lib/cn";

export function AlbumStatsSection({ albumId }: { albumId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useAlbumStatsQuery(albumId);
  const [open, setOpen] = useState(false);

  if (isLoading || !data || data.ratingsCount === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "rounded-xl border border-white/10 bg-cinza-escuro p-4 text-left cursor-pointer",
          "hover:border-white/20 hover:bg-white/5 transition",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-gray-300">
            <Trophy size={14} className="text-dourado" />
            {t("communityStats.title")}
          </p>
          <ChevronRight size={16} className="text-gray-500 shrink-0" />
        </div>
        <p className="text-gray-500 text-xs mt-1">
          {t("communityStats.ratingsAndAverage", {
            count: data.ratingsCount,
            average: data.averageScore.toFixed(1),
          })}
        </p>
      </button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={
          <span className="flex items-center gap-2">
            <Trophy size={16} className="text-dourado" /> {t("communityStats.title")}
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-gray-500 text-xs">
            {t("communityStats.ratingsAndAverage", {
              count: data.ratingsCount,
              average: data.averageScore.toFixed(1),
            })}
          </p>

          <div>
            <p className="text-gray-400 text-xs mb-1">{t("communityStats.favoriteTracks")}</p>
            <ol className="text-sm text-gray-200 list-decimal pl-5">
              {data.topFavoriteTracks.map((track) => (
                <li key={track.trackId}>
                  {track.trackName} <span className="text-gray-500">({track.percentage}%)</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">{t("communityStats.worstTracks")}</p>
            <ol className="text-sm text-gray-200 list-decimal pl-5">
              {data.topWorstTracks.map((track) => (
                <li key={track.trackId}>
                  {track.trackName} <span className="text-gray-500">({track.percentage}%)</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
