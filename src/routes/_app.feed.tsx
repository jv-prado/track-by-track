import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { FeedPage } from "@/features/discovery/components/FeedPage";

export const Route = createFileRoute("/_app/feed")({
  // Aba escolhida vive na URL: recarregar (ou compartilhar o link) mantém o feed
  // que o usuário estava vendo.
  validateSearch: z.object({
    scope: z.enum(["global", "following"]).default("global"),
    genre: z.string().min(1).optional(),
  }),
  component: FeedPage,
});
