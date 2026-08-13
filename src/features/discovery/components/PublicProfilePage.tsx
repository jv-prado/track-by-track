import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useProfileQuery } from "@/queries/discovery";
import { FeedCard } from "./FeedCard";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";

export function PublicProfilePage() {
  const { t } = useTranslation();
  const { usuarioId } = useParams({ from: "/_app/perfil/$usuarioId" });
  const { data, isLoading, isError, refetch } = useProfileQuery(usuarioId, {
    page: 1,
    perPage: 20,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={t("profile.error")} onRetry={() => refetch()} />;
  }

  if (!data || data.data.length === 0) {
    return <EmptyState title={t("profile.empty")} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-white text-xl font-bold mb-4">
        {data.data[0]?.userDisplayName ?? t("profile.fallbackTitle")}
      </h1>
      <div className="flex flex-col gap-3">
        {data.data.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
