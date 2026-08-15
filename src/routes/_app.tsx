import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/shared/layout/AppSidebar";
import { AppHeader } from "@/shared/layout/AppHeader";
import { PullToRefresh } from "@/shared/ui/PullToRefresh";

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
      <PullToRefresh />
      <AppSidebar />
      {/* sem overflow-y-auto: scroller aninhado quebra o lazy nativo de <img> (só reavalia no scroll) */}
      {/* z-0 (não só relative) é o que importa aqui: sem z-index explícito `main` não forma
          stacking context próprio, e o -z-10 do glow escapa pra trás de TUDO no root (sidebar,
          header, conteúdo — tudo isso é conteúdo normal sem position, pintado ANTES de
          descendente com z-index negativo na ordem de pintura do CSS). Com z-0, o glow fica
          confinado dentro de `main` e só passa atrás dos filhos diretos dela. */}
      <main className="relative z-0 min-w-0 flex-1 flex flex-col">
        {/* glow roxo padrão do app — mesmo em toda tela por trás do outlet, não cada
            página desenhando o próprio gradiente (era assim em AlbumRatingView/
            PublicAlbumRankingView, ver histórico). -z-10 garante que fica atrás do
            header e do conteúdo sem precisar tocar na stacking de nenhum dos dois. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 sm:h-96 bg-gradient-to-b from-roxo-vivo/15 via-roxo-escuro/10 to-transparent"
        />
        <AppHeader />
        <div className="min-w-0 flex-1 px-4 pt-4 pb-24 sm:px-10 md:px-6 md:pt-4 md:pb-6 lg:px-10 lg:pt-6 lg:pb-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
