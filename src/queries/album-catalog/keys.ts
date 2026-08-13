export const albumCatalogKeys = {
  all: ["album-catalog"] as const,
  search: (query: string, filters: { page: number; perPage: number }) =>
    [...albumCatalogKeys.all, "search", query, filters] as const,
  detail: (albumId: string) => [...albumCatalogKeys.all, "detail", albumId] as const,
};
