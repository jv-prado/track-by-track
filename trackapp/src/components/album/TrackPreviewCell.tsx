import { useTranslation } from "react-i18next";
import { useTrackPreviewQuery } from "@/queries/album-catalog";
import { toast } from "@/components/ui/toast-store";
import { TrackPreviewPlayer } from "./TrackPreviewPlayer";
import type { useTrackPreviewPlayer } from "@/lib/use-track-preview-player";

type PreviewPlayer = ReturnType<typeof useTrackPreviewPlayer>;

// Porta 1:1 de src/shared/album/TrackPreviewCell.tsx (web).
export function TrackPreviewCell({
  albumId,
  track,
  preview,
}: {
  albumId: string;
  track: { spotifyId: string; name: string; previewUrl?: string };
  preview: PreviewPlayer;
}) {
  const { t } = useTranslation();
  const isPlaying = preview.playingTrackId === track.spotifyId;
  const lazyPreview = useTrackPreviewQuery(albumId, track.spotifyId);
  const previewUrl = track.previewUrl ?? lazyPreview.data;

  const play = async (url: string) => {
    const started = await preview.toggle(track.spotifyId, url);
    if (!started) toast.error(t("albumDetail.previewPlaybackError"));
  };

  const handleToggle = async () => {
    if (isPlaying) {
      await preview.toggle(track.spotifyId, previewUrl ?? "");
      return;
    }
    if (track.previewUrl) {
      await play(track.previewUrl);
      return;
    }

    const result = lazyPreview.data !== undefined ? lazyPreview : await lazyPreview.refetch();
    if (result.isError) {
      toast.error(t("albumDetail.previewLookupError"));
      return;
    }
    if (!result.data) {
      toast.error(t("albumDetail.previewUnavailable"));
      return;
    }
    await play(result.data);
  };

  return (
    <TrackPreviewPlayer
      previewUrl={previewUrl}
      isLoading={lazyPreview.isFetching}
      isPlaying={isPlaying}
      currentTime={isPlaying ? preview.currentTime : 0}
      duration={isPlaying ? preview.duration : 0}
      volume={preview.volume}
      onToggle={handleToggle}
      onSeek={preview.seek}
      onVolumeChange={preview.setVolume}
      onToggleMute={preview.toggleMute}
    />
  );
}
