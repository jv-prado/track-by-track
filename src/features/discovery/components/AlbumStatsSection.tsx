import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoMdPodium } from "react-icons/io";
import { useAlbumStatsQuery } from "@/queries/discovery";
import { Card } from "@/shared/ui/Card";
import { Sheet } from "@/shared/ui/Sheet";

export function AlbumStatsSection({ albumId }: { albumId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useAlbumStatsQuery(albumId);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isLoading || !data || data.ratingsCount === 0) return null;

  const statsBody = (
    <>
      <p className="text-gray-500 text-xs mb-3">
        {t("communityStats.ratingsAndAverage", {
          count: data.ratingsCount,
          average: data.averageScore.toFixed(1),
        })}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </>
  );

  return (
    <div className="group relative inline-block">
      <button
        type="button"
        onClick={() => {
          // sm+ já tem o painel por hover — a sheet é só o substituto do hover no mobile
          if (window.innerWidth < 640) setSheetOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-gray-300 transition hover:border-dourado/60 hover:text-dourado"
      >
        <IoMdPodium size={14} className="text-dourado" />
        {t("communityStats.title")}
      </button>

      {/* desktop: painel por hover, sem precisar abrir a sheet */}
      <div className="hidden sm:invisible sm:absolute sm:left-0 sm:top-full sm:z-50 sm:mt-2 sm:block sm:w-80 sm:opacity-0 sm:transition group-hover:sm:visible group-hover:sm:opacity-100 group-focus-within:sm:visible group-focus-within:sm:opacity-100">
        <Card className="p-4 shadow-2xl shadow-black/50">{statsBody}</Card>
      </div>

      {/* mobile: sem hover, o toque abre a sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={
          <span className="flex items-center gap-2">
            <IoMdPodium size={16} className="text-dourado" /> {t("communityStats.title")}
          </span>
        }
      >
        {statsBody}
      </Sheet>
    </div>
  );
}
