import { createFileRoute, redirect } from "@tanstack/react-router";
import { GeneratePostsPage } from "@/features/admin/components/GeneratePostsPage";

export const Route = createFileRoute("/_app/admin/generate-posts")({
  beforeLoad: ({ context }) => {
    if (context.auth.user?.role !== "admin") {
      throw redirect({ to: "/feed" });
    }
  },
  component: GeneratePostsPage,
});
