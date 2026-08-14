import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export const Route = createFileRoute("/_auth/redefinir-senha")({
  validateSearch: z.object({ token: z.string().optional() }),
  component: ResetPasswordForm,
});
