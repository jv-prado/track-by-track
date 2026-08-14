import { useState } from "react";
import { View } from "react-native";
import { useSaveReviewMutation } from "@/queries/ranking";
import { isApiError } from "@/shared/api/errors";
import { toast } from "@/components/ui/toast-store";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";

export interface ReviewFormProps {
  rankingId: string;
  albumId: string;
  initialText?: string;
  onSaved?: () => void;
}

// Porta 1:1 de src/shared/album/ReviewForm.tsx (web).
export function ReviewForm({ rankingId, albumId, initialText, onSaved }: ReviewFormProps) {
  const [text, setText] = useState(initialText ?? "");
  const saveReview = useSaveReviewMutation();

  const handleSubmit = () => {
    saveReview.mutate(
      { rankingId, albumId, text: text.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Review salva com sucesso.");
          onSaved?.();
        },
        onError: (error) => {
          toast.error(isApiError(error) ? error.message : "Não foi possível salvar a review.");
        },
      },
    );
  };

  return (
    <View className="gap-3">
      <TextArea
        value={text}
        onChangeText={setText}
        placeholder="O que você achou desse álbum?"
        rows={3}
      />

      <Button onPress={handleSubmit} size="sm" isLoading={saveReview.isPending} className="self-end">
        {saveReview.isPending ? "Salvando..." : "Salvar review"}
      </Button>
    </View>
  );
}
