import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/shared/layout/AppSidebar";
import { AppHeader } from "@/shared/layout/AppHeader";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AppShell,
});

function AppShell() {
  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-grafite">
      <AppSidebar />
      {/* sem overflow-y-auto: scroller aninhado quebra o lazy nativo de <img> (só reavalia no scroll) */}
      <main className="min-w-0 flex-1 flex flex-col">
        <AppHeader />
        <div className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-10 md:p-6 md:pb-6 lg:p-10 lg:pb-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
