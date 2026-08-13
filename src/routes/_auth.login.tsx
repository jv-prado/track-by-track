import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const Route = createFileRoute("/_auth/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: LoginForm,
});
