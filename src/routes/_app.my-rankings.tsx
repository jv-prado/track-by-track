import { createFileRoute } from "@tanstack/react-router";
import { MyRankingsPage } from "@/features/discovery/components/MyRankingsPage";

export const Route = createFileRoute("/_app/my-rankings")({
  component: MyRankingsPage,
});
