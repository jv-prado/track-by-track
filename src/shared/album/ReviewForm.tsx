import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Check } from "lucide-react";
import { useSaveReviewMutation } from "@/queries/ranking";
import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/ui/toast-store";
import { Button } from "@/shared/ui/Button";
import { TextArea } from "@/shared/ui/TextArea";
import { Modal } from "@/shared/ui/Modal";

interface ReviewFormProps {
  rankingId: string;
  albumId: string;
  initialText?: string;
  onSaved?: () => void;
}

export function ReviewForm({ rankingId, albumId, initialText, onSaved }: ReviewFormProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(initialText ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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

  const handleDelete = () => {
    saveReview.mutate(
      { rankingId, albumId, text: null },
      {
        onSuccess: () => {
          setConfirmingDelete(false);
          setText("");
          toast.success(t("review.deleteSuccess"));
        },
        onError: (error) => {
          toast.error(isApiError(error) ? error.message : t("review.deleteError"));
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

      <div className="flex items-center justify-end gap-2">
        {initialText && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setConfirmingDelete(true)}
            aria-label={t("review.delete")}
          >
            <Trash2 size={14} />
            {t("review.delete")}
          </Button>
        )}

        <Button type="submit" size="sm" isLoading={saveReview.isPending}>
          <Check size={14} />
          {saveReview.isPending ? t("common.saving") : t("review.save")}
        </Button>
      </div>

      <Modal
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={t("review.delete")}
        description={t("review.deleteConfirm")}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={saveReview.isPending}
            >
              {saveReview.isPending ? t("review.deleting") : t("review.deleteConfirmYes")}
            </Button>
          </>
        }
      />
    </form>
  );
}
