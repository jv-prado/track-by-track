import { createFileRoute } from "@tanstack/react-router";
import PoliticaDePrivacidade from "@/componentes/PoliticaDePrivacidade";

export const Route = createFileRoute("/privacy-policy")({
  component: PoliticaDePrivacidade,
});
