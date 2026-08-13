import { createFileRoute } from "@tanstack/react-router";
import PoliticaDePrivacidade from "@/componentes/PoliticaDePrivacidade";

export const Route = createFileRoute("/politica-de-privacidade")({
  component: PoliticaDePrivacidade,
});
