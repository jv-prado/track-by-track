import { createFileRoute } from "@tanstack/react-router";
import TermosDeUso from "@/componentes/TermosDeUso";

export const Route = createFileRoute("/terms-of-use")({
  component: TermosDeUso,
});
