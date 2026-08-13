import { createFileRoute } from "@tanstack/react-router";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const Route = createFileRoute("/_auth/registro")({
  component: RegisterForm,
});
