export const chartsKeys = {
  all: ["charts"] as const,
  billboard200Infinite: () => [...chartsKeys.all, "billboard-200"] as const,
  billboard200History: (albumId: string) =>
    [...chartsKeys.all, "billboard-200", "history", albumId] as const,
};
