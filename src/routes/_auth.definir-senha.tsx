import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DirectPasswordResetForm } from "@/features/auth/components/DirectPasswordResetForm";

export const Route = createFileRoute("/_auth/definir-senha")({
  validateSearch: z.object({ email: z.string().optional() }),
  component: DirectPasswordResetForm,
});
