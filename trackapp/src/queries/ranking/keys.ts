export const rankingsKeys = {
  all: ["rankings"] as const,
  byAlbum: (albumId: string) => [...rankingsKeys.all, "album", albumId] as const,
  detail: (rankingId: string) => [...rankingsKeys.all, "detail", rankingId] as const,
  byUserAndAlbum: (userId: string, albumId: string) =>
    [...rankingsKeys.all, "user", userId, "album", albumId] as const,
  rateTrack: () => [...rankingsKeys.all, "rate-track"] as const,
  setTrackIgnored: () => [...rankingsKeys.all, "set-track-ignored"] as const,
};
