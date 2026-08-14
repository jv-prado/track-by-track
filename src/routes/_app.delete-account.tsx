import { createFileRoute } from "@tanstack/react-router";
import { AccountDeletionPage } from "@/features/auth/components/AccountDeletionPage";

export const Route = createFileRoute("/_app/delete-account")({
  component: AccountDeletionPage,
});
