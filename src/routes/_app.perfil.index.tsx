import { createFileRoute } from "@tanstack/react-router";
import { OwnProfilePage } from "@/features/auth/components/OwnProfilePage";

export const Route = createFileRoute("/_app/perfil/")({
  component: OwnProfilePage,
});
