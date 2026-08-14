import { Heart, Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSaveReviewMutation } from "@/queries/ranking";
import type { AlbumTrack } from "@/shared/api/types";
import { Select } from "@/shared/ui/Select";
import { Spinner } from "@/shared/ui/Spinner";
import { toast } from "@/shared/ui/toast-store";
import { toApiError } from "@/shared/api/errors";

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
 *
 * Favorita e pior faixa são dois POSTs independentes (cada Select tem sua própria
 * mutation): o payload de cada troca só carrega o campo alterado, e o servidor faz
 * merge na review existente — trocar uma não pode apagar a outra que já estava salva.
 */
export function FavoriteWorstPicker({
  rankingId,
  albumId,
  tracks,
  favoriteTrackId,
  worstTrackId,
}: FavoriteWorstPickerProps) {
  const { t } = useTranslation();
  const saveFavorite = useSaveReviewMutation();
  const saveWorst = useSaveReviewMutation();

  const favoriteValue = favoriteTrackId ?? NONE_VALUE;
  const worstValue = worstTrackId ?? NONE_VALUE;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-red-400 mb-1.5">
          <Heart size={14} /> {t("review.favoriteTrack")}
          {saveFavorite.isPending && <Spinner className="size-3.5" />}
        </p>
        <Select
          value={favoriteValue}
          onChange={(value) =>
            saveFavorite.mutate(
              {
                rankingId,
                albumId,
                favoriteTrackId: value === NONE_VALUE ? null : value,
              },
              {
                onSuccess: () => toast.success(t("review.favoriteTrackSaved")),
                onError: (error) => toast.error(toApiError(error).message),
              },
            )
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
          {saveWorst.isPending && <Spinner className="size-3.5" />}
        </p>
        <Select
          value={worstValue}
          onChange={(value) =>
            saveWorst.mutate(
              {
                rankingId,
                albumId,
                worstTrackId: value === NONE_VALUE ? null : value,
              },
              {
                onSuccess: () => toast.success(t("review.worstTrackSaved")),
                onError: (error) => toast.error(toApiError(error).message),
              },
            )
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
