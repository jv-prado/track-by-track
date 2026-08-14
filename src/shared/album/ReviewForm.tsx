import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useSaveReviewMutation } from "@/queries/ranking";
import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/ui/toast-store";
import { Button } from "@/shared/ui/Button";
import { TextArea } from "@/shared/ui/TextArea";

interface ReviewFormProps {
  rankingId: string;
  albumId: string;
  initialText?: string;
  onSaved?: () => void;
}

export function ReviewForm({ rankingId, albumId, initialText, onSaved }: ReviewFormProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(initialText ?? "");
  const saveReview = useSaveReviewMutation();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <TextArea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("review.placeholder")}
        rows={3}
      />

      <Button type="submit" size="sm" disabled={saveReview.isPending} className="self-end">
        {saveReview.isPending ? t("common.saving") : t("review.save")}
      </Button>
    </form>
  );
}
