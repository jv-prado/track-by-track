import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquare, Plus, MessageSquareDashed } from "lucide-react";
import { useFeedbacksQuery, useUnansweredFeedbacksCountQuery } from "@/queries/feedbacks";
import { useAuthStore } from "@/shared/auth/auth.store";
import { FeedbackCard } from "./FeedbackCard";
import { FeedbackConversation } from "./FeedbackConversation";
import { CreateFeedbackModal } from "./CreateFeedbackModal";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Spinner } from "@/shared/ui/Spinner";
import { cn } from "@/shared/lib/cn";
import type { FeedbackStatus } from "@/shared/api/types";

export function FeedbacksPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data, isLoading, isError, refetch } = useFeedbacksQuery({
    page,
    perPage,
    status: statusFilter,
  });

  const { data: unansweredCount } = useUnansweredFeedbacksCountQuery(isAdmin);

  const filterTabs: Array<{ id: FeedbackStatus | "all"; label: string; badge?: number }> = [
    { id: "all", label: t("feedbacks.filters.all") },
    {
      id: "open",
      label: t("feedbacks.filters.open"),
      badge: isAdmin ? unansweredCount : undefined,
    },
    { id: "answered", label: t("feedbacks.filters.answered") },
    { id: "closed", label: t("feedbacks.filters.closed") },
  ];

  const feedbacks = data?.data ?? [];
  const meta = data?.meta;

  const handleFilterChange = (tabId: FeedbackStatus | "all") => {
    setStatusFilter(tabId === "all" ? undefined : tabId);
    setPage(1);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <MessageSquare size={24} className="text-dourado shrink-0" />
            <span>{t("feedbacks.title")}</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base mt-1">
            {isAdmin ? t("feedbacks.adminSubtitle") : t("feedbacks.subtitle")}
          </p>
        </div>

        <Button
          variant="accent"
          size="md"
          onClick={() => setCreateModalOpen(true)}
          className="shadow-lg shadow-dourado/10"
        >
          <Plus size={18} />
          <span>{t("feedbacks.sendFeedback")}</span>
        </Button>
      </div>

      {/* Filter Tabs (Admin view or multi-status view) */}
      {isAdmin && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-white/10 scrollbar-none">
          {filterTabs.map((tab) => {
            const isActive = tab.id === "all" ? statusFilter === undefined : statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleFilterChange(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition cursor-pointer shrink-0",
                  isActive
                    ? "bg-dourado/15 text-dourado font-semibold"
                    : "text-gray-400 hover:text-white hover:bg-white/5",
                )}
              >
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span className="min-w-4.5 h-4.5 px-1.5 rounded-full bg-dourado text-grafite text-xs font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <ErrorState
          message={t("common.error") || "Erro ao carregar feedbacks."}
          onRetry={() => refetch()}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      )}

      {/* Content Area */}
      {!isLoading && !isError && (
        <>
          {feedbacks.length === 0 ? (
            <EmptyState
              title={isAdmin ? t("feedbacks.emptyAdminTitle") : t("feedbacks.emptyTitle")}
              description={isAdmin ? t("feedbacks.emptyAdminDescription") : t("feedbacks.emptyDescription")}
              action={
                !isAdmin ? (
                  <Button variant="accent" size="sm" onClick={() => setCreateModalOpen(true)}>
                    <Plus size={16} />
                    <span>{t("feedbacks.sendFeedback")}</span>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Feedbacks List */}
              <div
                className={cn(
                  "flex flex-col gap-3",
                  selectedId
                    ? "hidden lg:flex lg:col-span-5 max-h-[calc(100vh-200px)] overflow-y-auto pr-1"
                    : "col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
                )}
              >
                {feedbacks.map((item) => (
                  <FeedbackCard
                    key={item.id}
                    feedback={item}
                    isSelected={selectedId === item.id}
                    onClick={() => setSelectedId(item.id)}
                    isAdmin={isAdmin}
                  />
                ))}

                {/* Simple pagination footer if multiple pages */}
                {meta && meta.totalPages > 1 && (
                  <div className="col-span-full flex items-center justify-between gap-2 pt-4 border-t border-white/10 text-xs text-gray-400">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Anterior
                    </Button>
                    <span>
                      Página {page} de {meta.totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                      disabled={page >= meta.totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>

              {/* Conversation Area */}
              {selectedId ? (
                <div className="col-span-12 lg:col-span-7 h-full">
                  <FeedbackConversation
                    feedbackId={selectedId}
                    onBack={() => setSelectedId(null)}
                    isAdmin={isAdmin}
                  />
                </div>
              ) : (
                <div className="hidden lg:col-span-7 h-96 border border-white/5 rounded-xl bg-cinza-escuro/30 lg:flex flex-col items-center justify-center text-gray-500 gap-2 p-8 text-center">
                  <MessageSquareDashed size={36} className="text-gray-600" />
                  <p className="text-sm">Selecione um feedback para visualizar a conversa.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal to Create Feedback */}
      <CreateFeedbackModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={(created) => {
          setSelectedId(created.id);
        }}
      />
    </div>
  );
}
