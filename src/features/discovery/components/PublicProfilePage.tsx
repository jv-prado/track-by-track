import { useEffect, useState } from "react";
import { useParams, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  Filter,
  ListMusic,
  Music2,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useProfileInfiniteQuery, useUserStatsQuery, type ProfileSort } from "@/queries/discovery";
import { useFollowStatsQuery } from "@/queries/follows";
import { useGenresQuery } from "@/queries/album-catalog";
import { useAuthStore } from "@/shared/auth/auth.store";
import { useInfiniteScroll } from "@/shared/lib/use-infinite-scroll";
import { getInitials } from "@/shared/lib/initials";
import { FeedCard } from "./FeedCard";
import { FeedCardSkeleton } from "@/shared/ui/FeedCardSkeleton";
import { ProfileHeaderSkeleton } from "./ProfileHeaderSkeleton";
import { FollowButton } from "@/shared/social/FollowButton";
import { FollowListModal } from "@/shared/social/FollowListModal";
import { GenreFilter } from "@/shared/ui/GenreFilter";
import { genreLabel } from "@/shared/lib/genreLabel";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { StatCard } from "@/shared/ui/StatCard";
import { AddAlbumCard } from "@/shared/ui/AddAlbumCard";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import { cn } from "@/shared/lib/cn";

const GRID_CLASSES =
  "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5";
const SKELETON_COUNT = 10;

export function PublicProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userId } = useParams({ from: "/_app/profile/$userId" });
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isOwnProfile = currentUserId === userId;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<ProfileSort>("recent");
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [followListKind, setFollowListKind] = useState<"followers" | "following" | null>(null);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [genreSheetOpen, setGenreSheetOpen] = useState(false);
  const { data: genres } = useGenresQuery();

  const sortOptions = [
    { value: "recent" as const, label: t("myRankings.sortRecent") },
    { value: "score-desc" as const, label: t("myRankings.sortScoreDesc") },
    { value: "score-asc" as const, label: t("myRankings.sortScoreAsc") },
  ];

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Perfil público só mostra álbum 100% avaliado — mesmo critério do feed
  // global (backend: completedAt). "Meus rankings" continua mostrando
  // rascunho em progresso, por isso não usa completedOnly.
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProfileInfiniteQuery(userId, {
      search: search || undefined,
      sort: sortOrder,
      genre,
      completedOnly: true,
    });
  const statsQuery = useUserStatsQuery(userId, true);
  const followStats = useFollowStatsQuery(userId);

  const items = data?.pages.flatMap((page) => page.data) ?? [];
  const sentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    fetchNextPage,
  });

  // não temos endpoint de usuário isolado — nome/avatar só existem junto de um
  // ranking dele. Sem nenhuma avaliação pública, não há como exibir o cabeçalho.
  const first = data?.pages[0]?.data[0];
  const hasActiveFilters = searchInput !== "" || sortOrder !== "recent" || genre !== undefined;

  const clearFilters = () => {
    setSearchInput("");
    setSortOrder("recent");
    setGenre(undefined);
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <ProfileHeaderSkeleton />
        <div className={GRID_CLASSES}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <FeedCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={t("profile.error")} onRetry={() => refetch()} />;
  }

  if (!first) {
    if (isOwnProfile) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <AddAlbumCard label={t("myRankings.emptyAddCta")} />
          <div>
            <p className="text-white font-medium">{t("profile.empty")}</p>
            <p className="text-gray-400 text-sm">{t("profile.emptyOwnDescription")}</p>
          </div>
        </div>
      );
    }
    return <EmptyState title={t("profile.empty")} />;
  }

  return (
    <div className="w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (window.history.length > 1) router.history.back();
          else router.navigate({ to: "/feed" });
        }}
        className="mb-4"
      >
        <ArrowLeft size={16} /> {t("common.back")}
      </Button>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          {first.userAvatarUrl ? (
            <img
              src={first.userAvatarUrl}
              alt=""
              className="w-14 h-14 rounded-full object-cover shrink-0 ring-1 ring-white/10"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-cinza-medio flex items-center justify-center shrink-0 ring-1 ring-white/10">
              <span className="text-gray-300 text-lg font-semibold leading-none">
                {getInitials(first.userDisplayName)}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-white text-xl sm:text-2xl font-bold truncate">
              {first.userDisplayName}
            </h1>
            <p className="text-gray-400 text-sm">
              <button
                type="button"
                onClick={() => setFollowListKind("followers")}
                className="hover:text-white hover:underline cursor-pointer"
              >
                {t("follow.followers", { count: followStats.data?.followers ?? 0 })}
              </button>{" "}
              ·{" "}
              <button
                type="button"
                onClick={() => setFollowListKind("following")}
                className="hover:text-white hover:underline cursor-pointer"
              >
                {t("follow.followingCount", { count: followStats.data?.following ?? 0 })}
              </button>
            </p>
          </div>
        </div>
        <FollowButton userId={userId} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          accent="roxo"
          icon={<ListMusic size={18} />}
          value={statsQuery.data?.total ?? "–"}
          label={t("myRankings.statAlbums")}
        />
        <StatCard
          accent="roxo"
          icon={<Music2 size={18} />}
          value={statsQuery.data?.tracksRated ?? "–"}
          label={t("myRankings.statTracksRated")}
        />
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 sm:flex-wrap sm:justify-between sm:gap-3">
          <Input
            icon={<Search size={16} />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("myRankings.searchPlaceholder")}
            containerClassName="flex-1 min-w-0 sm:w-64 sm:flex-none"
          />

          <div className="flex shrink-0 items-center gap-2 sm:flex-wrap sm:gap-3">
            {/* mobile: ícone abre bottom sheet (mesmo componente do modal de confirmação) */}
            <button
              type="button"
              onClick={() => setSortSheetOpen(true)}
              aria-label={t("myRankings.sortLabel")}
              className="sm:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cinza-medio/40 border border-white/10 text-gray-300 hover:text-dourado transition cursor-pointer"
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              type="button"
              onClick={() => setGenreSheetOpen(true)}
              aria-label={t("discover.allGenres")}
              className="sm:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cinza-medio/40 border border-white/10 text-gray-300 hover:text-dourado transition cursor-pointer"
            >
              <Filter size={16} />
            </button>

            {/* sm+: selects normais */}
            <Select
              value={sortOrder}
              onChange={(v) => setSortOrder(v as ProfileSort)}
              className="hidden sm:block sm:w-auto sm:min-w-40 sm:flex-none"
              options={sortOptions}
              icon={<ArrowUpDown size={14} />}
            />

            <GenreFilter
              value={genre}
              onChange={setGenre}
              genres={genres ?? []}
              className="hidden sm:block"
            />
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={t("myRankings.emptyFilterTitle")}
          description={t("myRankings.emptyFilterDescription")}
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                {t("common.clearFilters")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className={GRID_CLASSES}>
            {items.map((item) => (
              <FeedCard key={item.id} item={item} variant="grid" />
            ))}
          </div>

          {hasNextPage && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              {isFetchingNextPage && <Spinner className="h-6 w-6" />}
            </div>
          )}
        </>
      )}

      <FollowListModal
        userId={userId}
        kind={followListKind}
        onOpenChange={(open) => setFollowListKind(open ? followListKind : null)}
      />

      <BottomSheet open={sortSheetOpen} onOpenChange={setSortSheetOpen} title={t("myRankings.sortLabel")}>
        <div className="flex flex-col gap-1">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setSortOrder(option.value);
                setSortSheetOpen(false);
              }}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-base sm:text-sm transition cursor-pointer",
                sortOrder === option.value ? "bg-dourado/10 text-dourado" : "text-gray-200 hover:bg-white/5",
              )}
            >
              {option.label}
              {sortOrder === option.value && <Check size={16} />}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={genreSheetOpen} onOpenChange={setGenreSheetOpen} title={t("discover.allGenres")}>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => {
              setGenre(undefined);
              setGenreSheetOpen(false);
            }}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-base sm:text-sm transition cursor-pointer",
              genre === undefined ? "bg-dourado/10 text-dourado" : "text-gray-200 hover:bg-white/5",
            )}
          >
            {t("discover.allGenres")}
            {genre === undefined && <Check size={16} />}
          </button>
          {(genres ?? []).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGenre(g);
                setGenreSheetOpen(false);
              }}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-base sm:text-sm transition cursor-pointer",
                genre === g ? "bg-dourado/10 text-dourado" : "text-gray-200 hover:bg-white/5",
              )}
            >
              {genreLabel(g)}
              {genre === g && <Check size={16} />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
