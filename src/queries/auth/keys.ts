export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
  /** Reidratação da sessão no boot — ver useSessionQuery. */
  session: () => [...authKeys.all, "session"] as const,
};
