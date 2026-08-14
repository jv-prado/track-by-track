import { createFileRoute, redirect } from "@tanstack/react-router";

// "/" só existe pra não quebrar link/bookmark antigo — o feed de verdade mora em /feed.
export const Route = createFileRoute("/_app/")({
  beforeLoad: () => {
    throw redirect({ to: "/feed" });
  },
});
