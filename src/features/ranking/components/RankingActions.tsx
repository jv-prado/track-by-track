import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RotateCcw, Trash2 } from "lucide-react";
import { useResetRankingMutation, useDeleteRankingMutation } from "@/queries/ranking";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
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
      { onSuccess: () => setConfirmingReset(false) },
    );
  };

  const handleDelete = () => {
    deleteRanking.mutate(
      { rankingId, albumId },
      { onSuccess: () => navigate({ to: "/" }) },
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
        variant="secondary"
        size="sm"
        onClick={() => setConfirmingReset(true)}
        aria-label={t("rankingActions.reset")}
        className={isCompact ? "p-2" : "whitespace-nowrap"}
      >
        <RotateCcw size={14} />
        {!isCompact && t("rankingActions.reset")}
      </Button>

      <Button
        variant="outline"
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
            <Button variant="danger" size="sm" onClick={handleReset} disabled={resetRanking.isPending}>
              {t("rankingActions.resetConfirmYes")}
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
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleteRanking.isPending}>
              {t("rankingActions.removeConfirmYes")}
            </Button>
          </>
        }
      />
    </div>
  );
}
