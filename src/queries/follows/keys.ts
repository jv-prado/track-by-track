export const followsKeys = {
  all: ["follows"] as const,
  stats: (userId: string) => [...followsKeys.all, "stats", userId] as const,
  followers: (userId: string) =>
    [...followsKeys.all, "followers", userId] as const,
  following: (userId: string) =>
    [...followsKeys.all, "following", userId] as const,
};
