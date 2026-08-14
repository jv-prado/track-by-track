import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [text, setText] = useState(initialText ?? "");
  const saveReview = useSaveReviewMutation();

  const handleSubmit = () => {
    saveReview.mutate(
      { rankingId, albumId, text: text.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t("review.saveSuccess"));
          onSaved?.();
        },
        onError: (error) => {
          toast.error(isApiError(error) ? error.message : t("review.saveError"));
        },
      },
    );
  };

  return (
    <View className="gap-3">
      <TextArea value={text} onChangeText={setText} placeholder={t("review.placeholder")} rows={3} />

      <Button onPress={handleSubmit} size="sm" isLoading={saveReview.isPending} className="self-end">
        {saveReview.isPending ? t("common.saving") : t("review.save")}
      </Button>
    </View>
  );
}
