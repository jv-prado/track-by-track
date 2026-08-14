export const albumCatalogKeys = {
  all: ["album-catalog"] as const,
  searchInfinite: (query: string) => [...albumCatalogKeys.all, "search", query] as const,
  detail: (albumId: string) => [...albumCatalogKeys.all, "detail", albumId] as const,
  trackPreview: (albumId: string, trackId: string) =>
    [...albumCatalogKeys.all, "track-preview", albumId, trackId] as const,
  genres: () => [...albumCatalogKeys.all, "genres"] as const,
  newReleasesInfinite: (genre?: string) =>
    [...albumCatalogKeys.all, "new-releases", genre ?? "all"] as const,
  newReleasesGenres: () => [...albumCatalogKeys.all, "new-releases-genres"] as const,
  topChartInfinite: (genre?: string) =>
    [...albumCatalogKeys.all, "top-chart", genre ?? "all"] as const,
  topChartGenres: () => [...albumCatalogKeys.all, "top-chart-genres"] as const,
};
