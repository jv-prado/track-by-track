import { Filter } from "lucide-react-native";
import { Select, type SelectOption, type SelectSize } from "./Select";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/colors";
import { genreLabel } from "@/lib/genreLabel";

// Porta 1:1 de src/shared/ui/GenreFilter.tsx (web). i18n do mobile ainda não
// existe (gap registrado no plan.md) — "Todos os gêneros" hardcoded (mesmo
// valor de discover.allGenres no pt-BR.json).
export interface GenreFilterProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  genres: string[];
  className?: string;
  size?: SelectSize;
  mobileIconOnly?: boolean;
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
  const options: SelectOption[] = [
    { value: "", label: "Todos os gêneros" },
    ...genres.map((genre) => ({ value: genre, label: genreLabel(genre) })),
  ];

  return (
    <Select
      value={value ?? ""}
      onChange={(next) => onChange(next || undefined)}
      options={options}
      placeholder="Todos os gêneros"
      size={size}
      icon={<Filter size={14} color={colors.cinzaMedio} />}
      mobileIconOnly={mobileIconOnly}
      iconOnly={iconOnly}
      className={cn(iconOnly ? "w-10" : "w-44", className)}
    />
  );
}
