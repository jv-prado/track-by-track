import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
import { toast } from "@/shared/ui/toast-store";
import { type ShareCardData } from "./share-card";
import { shareCardImage } from "./share-image";

interface ShareCardOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShareCardData;
}

/**
 * Escolha do que entra na imagem antes de gerar. Bottom sheet no mobile e
 * drawer lateral no desktop vêm do `BottomSheet` — é o mesmo componente.
 */
export function ShareCardOptionsSheet({ open, onOpenChange, data }: ShareCardOptionsSheetProps) {
  const { t } = useTranslation();
  const [includeReview, setIncludeReview] = useState(true);
  const [includeFavorite, setIncludeFavorite] = useState(true);
  const [includeWorst, setIncludeWorst] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Reabrir a sheet volta pro padrão "tudo marcado": desmarcar algo é decisão
  // daquele compartilhamento, não preferência salva.
  useEffect(() => {
    if (!open) return;
    setIncludeReview(true);
    setIncludeFavorite(true);
    setIncludeWorst(true);
  }, [open]);

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      const result = await shareCardImage({
        ...data,
        reviewText: includeReview ? data.reviewText : undefined,
        favoriteTrack: includeFavorite ? data.favoriteTrack : undefined,
        worstTrack: includeWorst ? data.worstTrack : undefined,
      });
      if (result === "downloaded") toast.success(t("share.downloaded"));
      onOpenChange(false);
    } catch (error) {
      // Cancelar o menu nativo não é erro — não vira toast.
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(t("share.error"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={t("share.options.title")}>
      <p className="text-sm text-gray-400">{t("share.options.description")}</p>

      <div className="mt-4 flex flex-col gap-2">
        {data.reviewText && (
          <Checkbox
            checked={includeReview}
            onChange={(event) => setIncludeReview(event.target.checked)}
            label={t("share.options.review")}
          />
        )}
        {data.favoriteTrack && (
          <Checkbox
            checked={includeFavorite}
            onChange={(event) => setIncludeFavorite(event.target.checked)}
            label={data.favoriteTrack.label}
          />
        )}
        {data.worstTrack && (
          <Checkbox
            checked={includeWorst}
            onChange={(event) => setIncludeWorst(event.target.checked)}
            label={data.worstTrack.label}
          />
        )}
      </div>

      <Button className="mt-5 w-full" onClick={handleShare} isLoading={isGenerating}>
        <Share2 size={16} />
        {isGenerating ? t("share.generating") : t("share.image")}
      </Button>
    </BottomSheet>
  );
}
