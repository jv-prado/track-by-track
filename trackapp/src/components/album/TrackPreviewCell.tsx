import { useTrackPreviewQuery } from "@/queries/album-catalog";
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
  const isPlaying = preview.playingTrackId === track.spotifyId;
  const lazyPreview = useTrackPreviewQuery(albumId, track.spotifyId);
  const previewUrl = track.previewUrl ?? lazyPreview.data;

  const handleToggle = async () => {
    if (isPlaying) {
      await preview.toggle(track.spotifyId, previewUrl ?? "");
      return;
    }
    if (track.previewUrl) {
      await preview.toggle(track.spotifyId, track.previewUrl);
      return;
    }

    const result = lazyPreview.data !== undefined ? lazyPreview : await lazyPreview.refetch();
    if (result.data) await preview.toggle(track.spotifyId, result.data);
  };

  return (
    <TrackPreviewPlayer
      previewUrl={previewUrl}
      isLoading={lazyPreview.isFetching}
      isPlaying={isPlaying}
      currentTime={isPlaying ? preview.currentTime : 0}
      duration={isPlaying ? preview.duration : 0}
      onToggle={handleToggle}
      onSeek={preview.seek}
    />
  );
}
