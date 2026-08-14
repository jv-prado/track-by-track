import { useTranslation } from "react-i18next";
import { Filter } from "lucide-react";
import { Select, type SelectOption, type SelectSize } from "./Select";
import { cn } from "@/shared/lib/cn";
import { genreLabel } from "@/shared/lib/genreLabel";

interface GenreFilterProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  /**
   * Vocabulário e ordem vêm de quem chama: o catálogo curado em Top Álbuns e
   * Meus Rankings, os gêneros presentes na lista em Descobrir. Componente não
   * busca nada — é `shared/ui` (ver seção 5.1 do CLAUDE.md).
   */
  genres: string[];
  className?: string;
  /** Mesmo default de `Input` e `Select` — o filtro divide linha com os dois. */
  size?: SelectSize;
  /** Abaixo de `sm`, mostra só o ícone (botão quadrado) — texto e chevron somem, dropdown continua igual. */
  mobileIconOnly?: boolean;
  /** Sempre só o ícone (botão quadrado), em qualquer breakpoint. */
  iconOnly?: boolean;
}

export function GenreFilter({
  value,
  onChange,
  genres,
  className,
  size = "md",
  mobileIconOnly = false,
  iconOnly = false,
}: GenreFilterProps) {
  const { t } = useTranslation();

  const options: SelectOption[] = [
    { value: "", label: t("discover.allGenres") },
    ...genres.map((genre) => ({ value: genre, label: genreLabel(genre) })),
  ];

  return (
    <Select
      value={value ?? ""}
      onChange={(next) => onChange(next || undefined)}
      options={options}
      placeholder={t("discover.allGenres")}
      size={size}
      icon={<Filter size={14} />}
      mobileIconOnly={mobileIconOnly}
      iconOnly={iconOnly}
      className={cn(iconOnly ? "w-10" : mobileIconOnly ? "w-10 sm:w-44" : "w-44", className)}
    />
  );
}
