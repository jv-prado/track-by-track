import { type ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Inbox className="h-10 w-10 text-gray-500" />
      <p className="text-white font-medium">{title}</p>
      {description && <p className="text-gray-400 text-sm">{description}</p>}
      {action}
    </div>
  );
}
