import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Search, Music, X } from "lucide-react";
import { useSearchAlbumsQuery } from "@/queries/album-catalog";
import { Input } from "@/shared/ui/Input";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Pagination } from "@/shared/ui/Pagination";

const PER_PAGE = 24;

export function SearchPage() {
  const { t } = useTranslation();
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // debounce: espera parar de digitar antes de bater na API
  useEffect(() => {
    const timeout = setTimeout(() => setQuery(queryInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [queryInput]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const { data, isLoading, isError, refetch } = useSearchAlbumsQuery(query, {
    page,
    perPage: PER_PAGE,
  });

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold flex items-center gap-2">
            <Search size={22} className="text-dourado" />
            {t("search.title")}
          </h1>
          <p className="text-gray-400 text-base mt-1">{t("search.subtitle")}</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Input
          icon={<Search size={16} />}
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder={t("search.placeholder")}
          autoFocus
        />
        {queryInput && (
          <button
            onClick={() => setQueryInput("")}
            aria-label={t("search.clearAria")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-dourado cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {!query.trim() && (
        <EmptyState title={t("search.startTitle")} description={t("search.startDescription")} />
      )}

      {query.trim() && isLoading && !data && (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {query.trim() && isError && (
        <ErrorState message={t("search.error")} onRetry={() => refetch()} />
      )}

      {query.trim() && data && data.data.length === 0 && (
        <EmptyState title={t("search.emptyTitle")} description={t("search.emptyDescription")} />
      )}

      {query.trim() && data && data.data.length > 0 && (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {data.data.map((album) => (
              <Link
                key={album.spotifyId}
                to="/album/$albumId"
                params={{ albumId: album.spotifyId }}
                className="flex flex-col bg-cinza-escuro border border-white/5 rounded-xl hover:border-dourado/30 hover:bg-white/5 transition"
              >
                {album.imageUrlSmall ?? album.imageUrl ? (
                  <img
                    // card de 160px: capa de 300px basta e pesa ~1/4 da de 640px
                    src={album.imageUrlSmall ?? album.imageUrl}
                    alt=""
                    className="w-full aspect-square rounded-t-xl object-cover bg-cinza-medio"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-t-xl bg-cinza-medio flex items-center justify-center">
                    <Music size={32} className="text-gray-500" />
                  </div>
                )}
                <div className="p-3 min-w-0">
                  <p className="text-white font-medium truncate">{album.name}</p>
                  <p className="text-gray-400 text-sm truncate">{album.artist}</p>
                </div>
              </Link>
            ))}
          </div>

          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
