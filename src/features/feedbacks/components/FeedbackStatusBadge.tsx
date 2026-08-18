import { useTranslation } from "react-i18next";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import type { FeedbackStatus } from "@/shared/api/types";

interface FeedbackStatusBadgeProps {
  status: FeedbackStatus;
  className?: string;
  size?: "sm" | "md";
}

export function FeedbackStatusBadge({ status, className, size = "md" }: FeedbackStatusBadgeProps) {
  const { t } = useTranslation();

  const config = {
    open: {
      label: t("feedbacks.status.open"),
      icon: Clock,
      classes: "bg-dourado/15 text-dourado border-dourado/30",
    },
    answered: {
      label: t("feedbacks.status.answered"),
      icon: CheckCircle2,
      classes: "bg-roxo-vivo/20 text-purple-300 border-purple-500/30",
    },
    closed: {
      label: t("feedbacks.status.closed"),
      icon: XCircle,
      classes: "bg-white/10 text-gray-400 border-white/10",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border shrink-0",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        config.classes,
        className,
      )}
    >
      <Icon size={size === "sm" ? 12 : 14} className="shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}
