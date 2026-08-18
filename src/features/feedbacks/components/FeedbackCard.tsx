import { useTranslation } from "react-i18next";
import { MessageSquare, User as UserIcon, Calendar } from "lucide-react";
import { FeedbackStatusBadge } from "./FeedbackStatusBadge";
import { formatDate } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";
import type { FeedbackSummary } from "@/shared/api/types";

interface FeedbackCardProps {
  feedback: FeedbackSummary;
  isSelected?: boolean;
  onClick: () => void;
  isAdmin?: boolean;
}

export function FeedbackCard({
  feedback,
  isSelected,
  onClick,
  isAdmin,
}: FeedbackCardProps) {
  const { i18n, t } = useTranslation();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative flex flex-col gap-2.5 rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer select-none",
        isSelected
          ? "border-dourado/60 bg-white/10 shadow-lg shadow-black/30"
          : "border-white/10 bg-cinza-escuro/70 hover:border-white/20 hover:bg-white/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isAdmin && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
              {feedback.userAvatarUrl ? (
                <img
                  src={feedback.userAvatarUrl}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover shrink-0"
                />
              ) : (
                <UserIcon size={13} className="shrink-0 text-gray-400" />
              )}
              <span className="truncate font-medium text-gray-300">
                {feedback.userDisplayName}
              </span>
            </div>
          )}
          <h3 className="text-base font-semibold text-white truncate group-hover:text-dourado transition-colors">
            {feedback.subject || t("feedbacks.subject")}
          </h3>
        </div>

        <FeedbackStatusBadge status={feedback.status} size="sm" />
      </div>

      {feedback.lastMessage && (
        <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">
          {feedback.lastMessage}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1 mt-auto border-t border-white/5 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <Calendar size={13} className="shrink-0" />
          <span>{formatDate(feedback.updatedAt, i18n.language)}</span>
        </div>

        <div className="flex items-center gap-1 text-gray-400">
          <MessageSquare size={13} className="shrink-0" />
          <span>
            {t("feedbacks.messagesCount", { count: feedback.messageCount })}
          </span>
        </div>
      </div>
    </div>
  );
}
