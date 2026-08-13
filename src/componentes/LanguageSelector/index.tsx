import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const LANGUAGES = [
  { code: "pt-BR", short: "pt", label: "Português", flag: "/images/flags/brazil.svg" },
  { code: "en-US", short: "en", label: "English", flag: "/images/flags/usa.svg" },
  { code: "es-ES", short: "es", label: "Español", flag: "/images/flags/spain.svg" },
] as const;

interface LanguageSelectorProps {
  direction?: "up" | "down";
  className?: string;
  /** Só a bandeira no gatilho, sem o nome do idioma — usado no topbar mobile, onde espaço é curto. */
  compact?: boolean;
}

export default function LanguageSelector({
  direction = "down",
  className,
  compact = false,
}: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current =
    LANGUAGES.find((lang) => i18n.language?.startsWith(lang.short)) ?? LANGUAGES[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Idioma"
        className={cn(
          "flex items-center gap-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition cursor-pointer",
          compact ? "p-2" : "px-3 py-2 w-full",
        )}
      >
        <img src={current.flag} alt="" className="w-5 h-3.5 object-cover rounded-[2px] shrink-0" />
        {!compact && <span className="truncate">{current.label}</span>}
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 w-full min-w-40 rounded-lg border border-white/10 bg-cinza-escuro shadow-lg shadow-black/40 overflow-hidden z-50",
            direction === "up" ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => changeLanguage(lang.code)}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-white/5 transition cursor-pointer",
                lang.code === current.code ? "text-dourado" : "text-gray-300",
              )}
            >
              <img src={lang.flag} alt="" className="w-5 h-3.5 object-cover rounded-[2px] shrink-0" />
              <span className="flex-1">{lang.label}</span>
              {lang.code === current.code && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
