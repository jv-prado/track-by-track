import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Send,
  User as UserIcon,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { FeedbackStatusBadge } from "./FeedbackStatusBadge";
import { Button } from "@/shared/ui/Button";
import { TextArea } from "@/shared/ui/TextArea";
import { Select } from "@/shared/ui/Select";
import { Spinner } from "@/shared/ui/Spinner";
import { toast } from "@/shared/ui/toast-store";
import {
  useFeedbackDetailQuery,
  useSendFeedbackMessageMutation,
  useUpdateFeedbackStatusMutation,
} from "@/queries/feedbacks";
import { formatDate } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";
import type { FeedbackStatus } from "@/shared/api/types";

interface FeedbackConversationProps {
  feedbackId: string;
  onBack?: () => void;
  isAdmin?: boolean;
}

export function FeedbackConversation({
  feedbackId,
  onBack,
  isAdmin,
}: FeedbackConversationProps) {
  const { t, i18n } = useTranslation();
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: feedback, isLoading, isError, refetch } = useFeedbackDetailQuery(feedbackId);
  const sendMessageMutation = useSendFeedbackMessageMutation(feedbackId);
  const updateStatusMutation = useUpdateFeedbackStatusMutation(feedbackId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (feedback?.messages) {
      scrollToBottom();
    }
  }, [feedback?.messages]);

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = replyText.trim();
    if (!text || sendMessageMutation.isPending) return;

    try {
      await sendMessageMutation.mutateAsync({
        feedbackId,
        message: text,
      });
      setReplyText("");
      toast.success(t("feedbacks.replySuccess"));
    } catch {
      toast.error(t("feedbacks.replyError"));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        feedbackId,
        status: newStatus as FeedbackStatus,
      });
      toast.success(t("feedbacks.statusUpdateSuccess"));
    } catch {
      toast.error(t("feedbacks.statusUpdateError"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-white/10 bg-cinza-escuro/60 p-8">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError || !feedback) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-cinza-escuro/60 p-8 text-center">
        <p className="text-red-400 text-sm">{t("common.error") || "Erro ao carregar conversa."}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const statusOptions = [
    { value: "open", label: t("feedbacks.status.open") },
    { value: "answered", label: t("feedbacks.status.answered") },
    { value: "closed", label: t("feedbacks.status.closed") },
  ];

  return (
    <div className="flex flex-col h-full rounded-xl border border-white/10 bg-cinza-escuro/80 shadow-xl shadow-black/40 overflow-hidden min-h-[500px] max-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-cinza-escuro p-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={t("feedbacks.backToList")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white truncate">
              {feedback.subject || t("feedbacks.subject")}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
              <span className="flex items-center gap-1 font-medium text-gray-300">
                <UserIcon size={12} />
                {feedback.userDisplayName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDate(feedback.createdAt, i18n.language)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <FeedbackStatusBadge status={feedback.status} />

          {isAdmin && (
            <div className="w-44">
              <Select
                value={feedback.status}
                onChange={handleStatusChange}
                options={statusOptions}
                size="sm"
                aria-label={t("feedbacks.changeStatus")}
              />
            </div>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {feedback.messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col gap-1.5 max-w-[85%] sm:max-w-[75%]",
              msg.isAdmin ? "ml-auto items-end" : "mr-auto items-start",
            )}
          >
            {/* Header info above bubble */}
            <div className="flex items-center gap-1.5 px-1 text-xs text-gray-400">
              {msg.isAdmin ? (
                <>
                  <span className="font-semibold text-dourado-claro flex items-center gap-1">
                    <ShieldCheck size={13} className="text-dourado" />
                    {t("feedbacks.adminLabel")}
                  </span>
                  <span>•</span>
                  <span>{formatDate(msg.createdAt, i18n.language)}</span>
                </>
              ) : (
                <>
                  {msg.authorAvatarUrl ? (
                    <img
                      src={msg.authorAvatarUrl}
                      alt=""
                      className="w-3.5 h-3.5 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon size={12} />
                  )}
                  <span className="font-medium text-gray-300">{msg.authorDisplayName}</span>
                  <span>•</span>
                  <span>{formatDate(msg.createdAt, i18n.language)}</span>
                </>
              )}
            </div>

            {/* Bubble */}
            <div
              className={cn(
                "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words",
                msg.isAdmin
                  ? "bg-gradient-to-br from-roxo/60 to-roxo-escuro/80 text-purple-100 border border-roxo-vivo/30 rounded-tr-sm shadow-md"
                  : "bg-white/10 text-gray-100 border border-white/10 rounded-tl-sm shadow-sm",
              )}
            >
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input Box */}
      <form
        onSubmit={handleSend}
        className="border-t border-white/10 bg-cinza-escuro p-3 sm:p-4 flex flex-col gap-2"
      >
        <div className="flex items-end gap-2">
          <TextArea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("feedbacks.replyPlaceholder")}
            rows={2}
            className="flex-1 max-h-32"
            maxLength={5000}
          />
          <Button
            type="submit"
            variant="accent"
            size="md"
            className="shrink-0 h-10 px-4"
            disabled={!replyText.trim()}
            isLoading={sendMessageMutation.isPending}
          >
            <Send size={16} />
            <span className="hidden sm:inline">{t("feedbacks.send")}</span>
          </Button>
        </div>
        <span className="text-[11px] text-gray-400 px-1 hidden sm:block">
          Ctrl + Enter para enviar
        </span>
      </form>
    </div>
  );
}
