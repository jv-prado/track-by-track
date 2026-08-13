import { createFileRoute } from "@tanstack/react-router";
import { MyRankingsPage } from "@/features/discovery/components/MyRankingsPage";

export const Route = createFileRoute("/_app/minhas-avaliacoes")({
  component: MyRankingsPage,
});
