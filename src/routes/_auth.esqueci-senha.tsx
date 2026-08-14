import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const Route = createFileRoute("/_auth/esqueci-senha")({
  component: ForgotPasswordForm,
});
