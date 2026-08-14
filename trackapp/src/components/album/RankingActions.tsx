import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { RotateCcw, Trash2 } from "lucide-react-native";
import { useResetRankingMutation, useDeleteRankingMutation } from "@/queries/ranking";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/toast-store";

export interface RankingActionsProps {
  rankingId: string;
  albumId: string;
  variant?: "full" | "compact";
}

/**
 * Porta de src/shared/album/RankingActions.tsx (web). Web tem variante
 * "compact" (só ícone, ao lado do botão Voltar) visível só em telas
 * estreitas (`sm:hidden`) e "full" (ícone+texto) só em `sm:flex` — RN só
 * roda em telefone, então aqui é sempre a variante "compact" na prática de
 * layout (ambas ficam disponíveis via prop, quem chama decide, igual web).
 */
export function RankingActions({ rankingId, albumId, variant = "full" }: RankingActionsProps) {
  const { t } = useTranslation();
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
          router.replace("/my-rankings");
          toast.success(t("rankingActions.removeSuccess"));
        },
        onError: () => toast.error(t("rankingActions.removeError")),
      },
    );
  };

  return (
    <View className={isCompact ? "flex-row items-center gap-2" : "flex-row flex-wrap justify-end gap-2"}>
      <Button
        variant="outline"
        size="sm"
        onPress={() => setConfirmingReset(true)}
        accessibilityLabel={t("rankingActions.reset")}
      >
        <RotateCcw size={14} color="#ffffff" />
      </Button>

      <Button
        variant="danger"
        size="sm"
        onPress={() => setConfirmingDelete(true)}
        accessibilityLabel={t("rankingActions.removeAlbum")}
      >
        <Trash2 size={14} color="#f87171" />
      </Button>

      <Modal
        open={confirmingReset}
        onOpenChange={setConfirmingReset}
        title={t("rankingActions.reset")}
        description={t("rankingActions.resetConfirm")}
        footer={
          <>
            <Button variant="ghost" size="sm" onPress={() => setConfirmingReset(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" size="sm" onPress={handleReset} isLoading={resetRanking.isPending}>
              {resetRanking.isPending ? t("rankingActions.resetting") : t("rankingActions.resetConfirmYes")}
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
            <Button variant="ghost" size="sm" onPress={() => setConfirmingDelete(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" size="sm" onPress={handleDelete} isLoading={deleteRanking.isPending}>
              {deleteRanking.isPending ? t("rankingActions.removing") : t("rankingActions.removeConfirmYes")}
            </Button>
          </>
        }
      />
    </View>
  );
}
