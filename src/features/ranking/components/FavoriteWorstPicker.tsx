import { Heart, Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSaveReviewMutation } from "@/queries/ranking";
import type { AlbumTrack } from "@/shared/api/types";
import { Select } from "@/shared/ui/Select";

const NONE_VALUE = "__none__";

interface FavoriteWorstPickerProps {
  rankingId: string;
  albumId: string;
  tracks: AlbumTrack[];
  favoriteTrackId?: string;
  worstTrackId?: string;
}

/**
 * Fica visível perto do topo (ver AlbumDetailPage) pra não exigir rolar até o
 * fim da página pra achar a faixa favorita/pior — salva sozinho a cada troca,
 * sem esperar o botão de review.
 */
export function FavoriteWorstPicker({
  rankingId,
  albumId,
  tracks,
  favoriteTrackId,
  worstTrackId,
}: FavoriteWorstPickerProps) {
  const { t } = useTranslation();
  const saveReview = useSaveReviewMutation();

  const favoriteValue = favoriteTrackId ?? NONE_VALUE;
  const worstValue = worstTrackId ?? NONE_VALUE;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-red-400 mb-1.5">
          <Heart size={14} /> {t("review.favoriteTrack")}
        </p>
        <Select
          value={favoriteValue}
          onChange={(value) =>
            saveReview.mutate({
              rankingId,
              albumId,
              favoriteTrackId: value === NONE_VALUE ? undefined : value,
            })
          }
          options={[
            { value: NONE_VALUE, label: t("common.notApplicable") },
            ...tracks.map((track) => ({
              value: track.spotifyId,
              label: `${track.trackNumber}. ${track.name}`,
              disabled: track.spotifyId === worstValue,
            })),
          ]}
        />
      </div>

      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-400 mb-1.5">
          <Ban size={14} /> {t("review.worstTrack")}
        </p>
        <Select
          value={worstValue}
          onChange={(value) =>
            saveReview.mutate({
              rankingId,
              albumId,
              worstTrackId: value === NONE_VALUE ? undefined : value,
            })
          }
          options={[
            { value: NONE_VALUE, label: t("common.notApplicable") },
            ...tracks.map((track) => ({
              value: track.spotifyId,
              label: `${track.trackNumber}. ${track.name}`,
              disabled: track.spotifyId === favoriteValue,
            })),
          ]}
        />
      </div>
    </div>
  );
}
