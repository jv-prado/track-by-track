import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
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
          toast.success("Ranking resetado.");
        },
        onError: () => toast.error("Não foi possível resetar o ranking."),
      },
    );
  };

  const handleDelete = () => {
    deleteRanking.mutate(
      { rankingId, albumId },
      {
        onSuccess: () => {
          router.replace("/my-rankings");
          toast.success("Álbum removido dos seus rankings.");
        },
        onError: () => toast.error("Não foi possível remover o álbum."),
      },
    );
  };

  return (
    <View className={isCompact ? "flex-row items-center gap-2" : "flex-row flex-wrap justify-end gap-2"}>
      <Button
        variant="outline"
        size="sm"
        onPress={() => setConfirmingReset(true)}
        accessibilityLabel="Resetar avaliações"
      >
        <RotateCcw size={14} color="#ffffff" />
      </Button>

      <Button
        variant="danger"
        size="sm"
        onPress={() => setConfirmingDelete(true)}
        accessibilityLabel="Remover álbum"
      >
        <Trash2 size={14} color="#f87171" />
      </Button>

      <Modal
        open={confirmingReset}
        onOpenChange={setConfirmingReset}
        title="Resetar avaliações"
        description="Isso apaga todas as notas, review e faixa favorita/pior deste álbum. Não pode ser desfeito."
        footer={
          <>
            <Button variant="ghost" size="sm" onPress={() => setConfirmingReset(false)}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" onPress={handleReset} isLoading={resetRanking.isPending}>
              {resetRanking.isPending ? "Resetando..." : "Sim, resetar"}
            </Button>
          </>
        }
      />

      <Modal
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Remover álbum"
        description="Remover de vez?"
        footer={
          <>
            <Button variant="ghost" size="sm" onPress={() => setConfirmingDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" onPress={handleDelete} isLoading={deleteRanking.isPending}>
              {deleteRanking.isPending ? "Removendo..." : "Sim, remover"}
            </Button>
          </>
        }
      />
    </View>
  );
}
