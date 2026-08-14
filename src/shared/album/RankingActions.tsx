import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RotateCcw, Trash2 } from "lucide-react";
import { useResetRankingMutation, useDeleteRankingMutation } from "@/queries/ranking";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { toast } from "@/shared/ui/toast-store";
import { cn } from "@/shared/lib/cn";

interface RankingActionsProps {
  rankingId: string;
  albumId: string;
  /** "compact": só ícone, pra ficar ao lado do botão Voltar no mobile. "full": ícone + texto. */
  variant?: "full" | "compact";
}

export function RankingActions({ rankingId, albumId, variant = "full" }: RankingActionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const resetRanking = useResetRankingMutation();
  const deleteRanking = useDeleteRankingMutation();
  const isCompact = variant === "compact";

  const handleReset = () => {
    resetRanking.mutate(
      { rankingId, albumId },
      {
        onSuccess: () => {
          setConfirmingReset(false);
          toast.success(t("rankingActions.resetSuccess"));
        },
        onError: () => toast.error(t("rankingActions.resetError")),
      },
    );
  };

  const handleDelete = () => {
    deleteRanking.mutate(
      { rankingId, albumId },
      {
        onSuccess: () => {
          navigate({ to: "/my-rankings" });
          toast.success(t("rankingActions.removeSuccess"));
        },
        onError: () => toast.error(t("rankingActions.removeError")),
      },
    );
  };

  return (
    <div
      className={cn(
        "flex gap-2",
        isCompact ? "sm:hidden items-center" : "hidden flex-wrap sm:flex sm:justify-end",
      )}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirmingReset(true)}
        aria-label={t("rankingActions.reset")}
        className={isCompact ? "p-2" : "whitespace-nowrap"}
      >
        <RotateCcw size={14} />
        {!isCompact && t("rankingActions.reset")}
      </Button>

      <Button
        variant="danger"
        size="sm"
        onClick={() => setConfirmingDelete(true)}
        aria-label={t("rankingActions.removeAlbum")}
        className={isCompact ? "p-2" : "whitespace-nowrap"}
      >
        <Trash2 size={14} />
        {!isCompact && t("rankingActions.removeAlbum")}
      </Button>

      <Modal
        open={confirmingReset}
        onOpenChange={setConfirmingReset}
        title={t("rankingActions.reset")}
        description={t("rankingActions.resetConfirm")}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingReset(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleReset}
              isLoading={resetRanking.isPending}
            >
              {resetRanking.isPending
                ? t("rankingActions.resetting")
                : t("rankingActions.resetConfirmYes")}
            </Button>
          </>
        }
      />

      <Modal
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={t("rankingActions.removeAlbum")}
        description={t("rankingActions.removeConfirm")}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={deleteRanking.isPending}
            >
              {deleteRanking.isPending
                ? t("rankingActions.removing")
                : t("rankingActions.removeConfirmYes")}
            </Button>
          </>
        }
      />
    </div>
  );
}
