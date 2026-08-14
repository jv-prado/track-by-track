import { Text, View } from "react-native";
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
  const saveFavorite = useSaveReviewMutation();
  const saveWorst = useSaveReviewMutation();

  const favoriteValue = favoriteTrackId ?? NONE_VALUE;
  const worstValue = worstTrackId ?? NONE_VALUE;

  return (
    <View className="gap-4">
      <View>
        <View className="mb-1.5 flex-row items-center gap-1.5">
          <Heart size={14} color="#f87171" />
          <Text className="text-sm font-medium text-red-400">Faixa favorita</Text>
          {saveFavorite.isPending && <Spinner size={14} />}
        </View>
        <Select
          value={favoriteValue}
          onChange={(value) =>
            saveFavorite.mutate(
              { rankingId, albumId, favoriteTrackId: value === NONE_VALUE ? null : value },
              {
                onSuccess: () => toast.success("Faixa favorita salva"),
                onError: (error) => toast.error(toApiError(error).message),
              },
            )
          }
          options={[
            { value: NONE_VALUE, label: "Não se aplica" },
            ...tracks.map((track) => ({
              value: track.spotifyId,
              label: `${track.trackNumber}. ${track.name}`,
              disabled: track.spotifyId === worstValue,
            })),
          ]}
          placeholder="Faixa favorita"
        />
      </View>

      <View>
        <View className="mb-1.5 flex-row items-center gap-1.5">
          <Ban size={14} color="#9ca3af" />
          <Text className="text-sm font-medium text-gray-400">Pior faixa</Text>
          {saveWorst.isPending && <Spinner size={14} />}
        </View>
        <Select
          value={worstValue}
          onChange={(value) =>
            saveWorst.mutate(
              { rankingId, albumId, worstTrackId: value === NONE_VALUE ? null : value },
              {
                onSuccess: () => toast.success("Pior faixa salva"),
                onError: (error) => toast.error(toApiError(error).message),
              },
            )
          }
          options={[
            { value: NONE_VALUE, label: "Não se aplica" },
            ...tracks.map((track) => ({
              value: track.spotifyId,
              label: `${track.trackNumber}. ${track.name}`,
              disabled: track.spotifyId === favoriteValue,
            })),
          ]}
          placeholder="Pior faixa"
        />
      </View>
    </View>
  );
}
