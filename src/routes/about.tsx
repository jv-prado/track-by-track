import { createFileRoute } from "@tanstack/react-router";
import Sobre from "@/componentes/Sobre";

export const Route = createFileRoute("/about")({
  component: Sobre,
});
