import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import LanguageSelector from "@/componentes/LanguageSelector";

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/feed" });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-3 sm:p-4">
      <LanguageSelector direction="down" className="absolute top-3 right-3 sm:top-4 sm:right-4 w-auto" />
      <Outlet />
    </div>
  );
}
