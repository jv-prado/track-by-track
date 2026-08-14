import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Heart, Ban } from "lucide-react-native";
import { useSaveReviewMutation } from "@/queries/ranking";
import type { AlbumTrack } from "@/shared/api/types";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/toast-store";
import { toApiError } from "@/shared/api/errors";

const NONE_VALUE = "__none__";

export interface FavoriteWorstPickerProps {
  rankingId: string;
  albumId: string;
  tracks: AlbumTrack[];
  favoriteTrackId?: string;
  worstTrackId?: string;
}

// Porta 1:1 de src/shared/album/FavoriteWorstPicker.tsx (web).
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
    <View className="gap-4">
      <View>
        <View className="mb-1.5 flex-row items-center gap-1.5">
          <Heart size={14} color="#f87171" />
          <Text className="text-sm font-medium text-red-400">{t("review.favoriteTrack")}</Text>
          {saveFavorite.isPending && <Spinner size={14} />}
        </View>
        <Select
          value={favoriteValue}
          onChange={(value) =>
            saveFavorite.mutate(
              { rankingId, albumId, favoriteTrackId: value === NONE_VALUE ? null : value },
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
          placeholder={t("review.favoriteTrack")}
        />
      </View>

      <View>
        <View className="mb-1.5 flex-row items-center gap-1.5">
          <Ban size={14} color="#9ca3af" />
          <Text className="text-sm font-medium text-gray-400">{t("review.worstTrack")}</Text>
          {saveWorst.isPending && <Spinner size={14} />}
        </View>
        <Select
          value={worstValue}
          onChange={(value) =>
            saveWorst.mutate(
              { rankingId, albumId, worstTrackId: value === NONE_VALUE ? null : value },
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
          placeholder={t("review.worstTrack")}
        />
      </View>
    </View>
  );
}
