import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import { Button, type ButtonProps } from "@/shared/ui/Button";
import { toast } from "@/shared/ui/toast-store";
import { ShareCardOptionsSheet } from "./ShareCardOptionsSheet";
import { type ShareCardData } from "./share-card";
import { shareCardImage } from "./share-image";

interface ShareCardButtonProps {
  data: ShareCardData;
  size?: ButtonProps["size"];
  className?: string;
}

export function ShareCardButton({ data, size = "md", className }: ShareCardButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const hasOptions = Boolean(data.reviewText || data.favoriteTrack || data.worstTrack);

  const handleClick = async () => {
    // Card mostra a nota do álbum como resultado final — com faixa sem avaliar
    // a nota ainda muda, então não é isso que deve circular num story.
    if (!data.isScoreComplete) {
      toast.error(t("share.incomplete"));
      return;
    }

    // Sem review nem faixa favorita/pior não há o que escolher: abrir a sheet
    // só pra mostrar um botão seria um clique a mais por nada.
    if (hasOptions) {
      setIsOpen(true);
      return;
    }

    setIsGenerating(true);
    try {
      const result = await shareCardImage(data);
      if (result === "downloaded") toast.success(t("share.downloaded"));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(t("share.error"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        className={className}
        onClick={handleClick}
        isLoading={isGenerating}
      >
        <Share2 size={16} />
        {isGenerating ? t("share.generating") : t("share.image")}
      </Button>

      <ShareCardOptionsSheet open={isOpen} onOpenChange={setIsOpen} data={data} />
    </>
  );
}
