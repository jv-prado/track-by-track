import { createFileRoute } from "@tanstack/react-router";
import Sobre from "@/componentes/Sobre";

export const Route = createFileRoute("/sobre")({
  component: Sobre,
});
