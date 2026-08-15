import { useTranslation } from "react-i18next";
import { dayKey, formatDiaryDay } from "@/shared/lib/date";
import { FeedCard } from "./FeedCard";
import type { FeedItem } from "@/shared/api/types";

interface DiaryGroup {
  key: string;
  iso: string;
  items: FeedItem[];
}

/**
 * Data do log: `firstCompletedAt` (dia em que a avaliação nasceu completa) quando existe,
 * senão `createdAt` (rascunho em progresso não tem `firstCompletedAt` ainda, mas ainda
 * assim aparece no diário — mesmo critério de "meus rankings" já mostra draft com progresso).
 */
function logDateOf(item: FeedItem): string {
  return item.firstCompletedAt ?? item.createdAt;
}

/** Agrupa por dia local, já ordenado (o backend entrega `sort=recent` desc). */
function groupByDay(items: FeedItem[]): DiaryGroup[] {
  const groups: DiaryGroup[] = [];
  for (const item of items) {
    const iso = logDateOf(item);
    const key = dayKey(iso);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, iso, items: [item] });
    }
  }
  return groups;
}

export function DiaryView({
  items,
  onOpen,
}: {
  items: FeedItem[];
  onOpen: (item: FeedItem) => void;
}) {
  const { i18n } = useTranslation();
  const groups = groupByDay(items);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const { day, month, year } = formatDiaryDay(group.iso, i18n.language);
        return (
          <div key={group.key} className="flex gap-4">
            <div className="flex w-11 shrink-0 flex-col items-center pt-1 text-center">
              <span className="text-dourado text-xl font-bold leading-none">{day}</span>
              <span className="text-gray-400 text-[11px] uppercase leading-tight mt-0.5">
                {month}
              </span>
              {year && <span className="text-gray-500 text-[10px] leading-tight">{year}</span>}
            </div>
            <div className="flex flex-1 min-w-0 flex-col gap-2 border-l border-white/10 pl-4">
              {group.items.map((item) => (
                <FeedCard key={item.id} item={item} variant="list" showProgress onOpen={onOpen} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
