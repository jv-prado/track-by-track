import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, Search, Music, Download, X } from "lucide-react";
import { useSearchAlbumsInfiniteQuery } from "@/queries/album-catalog";
import type { AlbumSummary } from "@/shared/api/types";
import { AlbumCoverCard } from "@/features/album-catalog/components/AlbumCoverCard";
import { Input } from "@/shared/ui/Input";
import { TextArea } from "@/shared/ui/TextArea";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { FormField } from "@/shared/ui/FormField";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { FeedCardSkeleton } from "@/shared/ui/FeedCardSkeleton";
import { useInfiniteScroll } from "@/shared/lib/use-infinite-scroll";
import { toast } from "@/shared/ui/toast-store";
import {
  DEFAULT_ANNOUNCEMENT_COPY,
  POST_TEMPLATES,
  renderAlbumAnnouncementPost,
} from "@/shared/album/post-templates";
import { deliverImageBlob } from "@/shared/album/deliver-image";

// mesma grade do Discover/Feed/Search (ver SearchPage.tsx) — resultado de busca
// de álbum é sempre o mesmo tamanho de cartão em todo o app.
const GRID_CLASSES =
  "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5";
const SKELETON_COUNT = 10;

export function GeneratePostsPage() {
  const { t } = useTranslation();
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumSummary | null>(null);
  const [copyText, setCopyText] = useState(DEFAULT_ANNOUNCEMENT_COPY);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setQuery(queryInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [queryInput]);

  // objectURL de uma geração anterior nunca deve sobreviver a uma nova — só existe um preview
  // por vez, e sem revoke ele vaza até o reload da página.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const albums = useSearchAlbumsInfiniteQuery(selectedAlbum ? "" : query);
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    albums;
  const sentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    fetchNextPage,
  });
  const items = data?.pages.flatMap((page) => page.data) ?? [];

  function resetPreview() {
    setPreviewBlob(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function selectAlbum(album: AlbumSummary) {
    setSelectedAlbum(album);
    setCopyText(DEFAULT_ANNOUNCEMENT_COPY);
    resetPreview();
  }

  function changeAlbum() {
    setSelectedAlbum(null);
    resetPreview();
    setQueryInput("");
    setQuery("");
  }

  async function handleGenerate() {
    if (!selectedAlbum) return;
    setIsGenerating(true);
    try {
      const blob = await renderAlbumAnnouncementPost({
        albumId: selectedAlbum.spotifyId,
        albumName: selectedAlbum.name,
        artist: selectedAlbum.artist,
        copyText,
      });
      setPreviewBlob(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch {
      toast.error(t("admin.generatePosts.generateError"));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownload() {
    if (!previewBlob || !selectedAlbum) return;
    await deliverImageBlob(previewBlob, `${selectedAlbum.name}-instagram-post.png`, selectedAlbum.name);
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-white text-xl sm:text-2xl font-bold flex items-center gap-2">
          <ImagePlus size={22} className="text-dourado" />
          {t("admin.generatePosts.title")}
        </h1>
        <p className="text-gray-400 text-base mt-1">{t("admin.generatePosts.subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
        <div className="flex flex-col gap-4">
          {!selectedAlbum && (
            <>
              <div className="relative max-w-sm">
                <Input
                  icon={<Search size={16} />}
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder={t("admin.generatePosts.searchPlaceholder")}
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
                <EmptyState
                  title={t("admin.generatePosts.searchEmptyTitle")}
                  description={t("admin.generatePosts.searchEmptyDescription")}
                />
              )}

              {query.trim() && isLoading && !data && (
                <div className={GRID_CLASSES}>
                  {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                    <FeedCardSkeleton key={i} />
                  ))}
                </div>
              )}

              {query.trim() && isError && (
                <ErrorState message={t("search.error")} onRetry={() => refetch()} />
              )}

              {query.trim() && data && items.length === 0 && (
                <EmptyState title={t("search.emptyTitle")} description={t("search.emptyDescription")} />
              )}

              {query.trim() && data && items.length > 0 && (
                <>
                  <div className={GRID_CLASSES}>
                    {items.map((album) => (
                      <button
                        key={album.spotifyId}
                        type="button"
                        onClick={() => selectAlbum(album)}
                        className="bg-cinza-escuro border border-white/5 rounded-xl hover:border-dourado/30 hover:bg-white/5 transition flex flex-col text-left cursor-pointer"
                      >
                        <AlbumCoverCard album={album} />
                      </button>
                    ))}
                  </div>

                  {hasNextPage && (
                    <div ref={sentinelRef} className="flex justify-center py-4">
                      {isFetchingNextPage && <Spinner className="h-6 w-6" />}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {selectedAlbum && (
            <Card className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {selectedAlbum.imageUrl ?? selectedAlbum.imageUrlSmall ? (
                  <img
                    src={selectedAlbum.imageUrl ?? selectedAlbum.imageUrlSmall}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-cinza-medio flex items-center justify-center shrink-0">
                    <Music size={22} className="text-gray-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    {t("admin.generatePosts.selectedLabel")}
                  </p>
                  <p className="text-white font-semibold truncate">{selectedAlbum.name}</p>
                  <p className="text-gray-400 text-sm truncate">{selectedAlbum.artist}</p>
                </div>
                <Button variant="outline" size="sm" onClick={changeAlbum}>
                  {t("admin.generatePosts.changeAlbum")}
                </Button>
              </div>

              <FormField label={t("admin.generatePosts.templateLabel")} htmlFor="post-template">
                <div className="flex flex-wrap gap-2">
                  {POST_TEMPLATES.map((template) => (
                    <span
                      key={template.id}
                      className="inline-flex items-center rounded-lg border border-dourado/40 bg-dourado/10 px-3 py-1.5 text-sm font-semibold text-dourado"
                    >
                      {t(template.labelKey)}
                    </span>
                  ))}
                  <span className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-500">
                    {t("admin.generatePosts.moreTemplatesSoon")}
                  </span>
                </div>
              </FormField>

              <FormField label={t("admin.generatePosts.copyLabel")} htmlFor="post-copy">
                <TextArea
                  id="post-copy"
                  value={copyText}
                  onChange={(e) => setCopyText(e.target.value)}
                  rows={2}
                />
                <p className="mt-1 text-xs text-gray-500">{t("admin.generatePosts.copyHint")}</p>
              </FormField>

              <Button onClick={handleGenerate} isLoading={isGenerating} className="self-start">
                {isGenerating ? t("admin.generatePosts.generating") : t("admin.generatePosts.generate")}
              </Button>
            </Card>
          )}
        </div>

        <div className="lg:sticky lg:top-6 flex flex-col gap-3">
          <p className="text-gray-400 text-sm font-medium">{t("admin.generatePosts.previewTitle")}</p>
          <div className="w-full max-w-[380px] aspect-[3/4] rounded-xl border border-white/10 bg-cinza-escuro overflow-hidden flex items-center justify-center">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={t("admin.generatePosts.previewAlt")}
                className="w-full h-full object-cover"
              />
            ) : (
              <p className="text-gray-500 text-sm text-center px-6">
                {t("admin.generatePosts.previewEmpty")}
              </p>
            )}
          </div>
          <Button
            variant="accent"
            disabled={!previewBlob}
            onClick={handleDownload}
            className="w-full max-w-[380px]"
          >
            <Download size={16} />
            {t("admin.generatePosts.download")}
          </Button>
        </div>
      </div>
    </div>
  );
}
