import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquarePlus } from "lucide-react";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { TextArea } from "@/shared/ui/TextArea";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { toast } from "@/shared/ui/toast-store";
import { useCreateFeedbackMutation } from "@/queries/feedbacks";
import type { FeedbackDetail } from "@/shared/api/types";

interface CreateFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (feedback: FeedbackDetail) => void;
}

export function CreateFeedbackModal({ open, onOpenChange, onCreated }: CreateFeedbackModalProps) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [messageError, setMessageError] = useState("");

  const createMutation = useCreateFeedbackMutation();

  const resetForm = () => {
    setSubject("");
    setMessage("");
    setSubjectError("");
    setMessageError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    let hasError = false;
    if (!subject.trim()) {
      setSubjectError(t("feedbacks.subjectPlaceholder"));
      hasError = true;
    } else {
      setSubjectError("");
    }

    if (!message.trim()) {
      setMessageError(t("feedbacks.messagePlaceholder"));
      hasError = true;
    } else {
      setMessageError("");
    }

    if (hasError) return;

    try {
      const created = await createMutation.mutateAsync({
        subject: subject.trim(),
        message: message.trim(),
      });
      toast.success(t("feedbacks.createSuccess"));
      resetForm();
      onOpenChange(false);
      onCreated?.(created);
    } catch {
      toast.error(t("feedbacks.createError"));
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
      title={
        <div className="flex items-center gap-2">
          <MessageSquarePlus size={20} className="text-dourado shrink-0" />
          <span>{t("feedbacks.newFeedback")}</span>
        </div>
      }
      description={t("feedbacks.subtitle")}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("feedbacks.subject")} htmlFor="feedback-subject" error={subjectError}>
          <Input
            id="feedback-subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              if (subjectError) setSubjectError("");
            }}
            placeholder={t("feedbacks.subjectPlaceholder")}
            maxLength={120}
          />
        </FormField>

        <FormField label={t("feedbacks.message")} htmlFor="feedback-message" error={messageError}>
          <TextArea
            id="feedback-message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (messageError) setMessageError("");
            }}
            placeholder={t("feedbacks.messagePlaceholder")}
            rows={5}
            maxLength={5000}
          />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={createMutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="accent"
            isLoading={createMutation.isPending}
          >
            {t("feedbacks.sendFeedback")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
