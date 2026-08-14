import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageDown } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { toast } from "@/shared/ui/toast-store";
import { renderShareCard, type ShareCardData } from "./share-card";

/**
 * Gera o card e entrega pelo caminho que o aparelho aceita: no celular, o menu
 * nativo de compartilhamento; no desktop, download. `canShare({ files })` é o
 * teste certo — `navigator.share` existe em browsers que recusam arquivo.
 */
export function ShareCardButton({ data }: { data: ShareCardData }) {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleClick = async () => {
    setIsGenerating(true);
    try {
      const blob = await renderShareCard(data);
      const file = new File([blob], `${data.albumName}.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: data.albumName });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t("share.downloaded"));
    } catch (error) {
      // Cancelar o menu nativo não é erro — não vira toast.
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(t("share.error"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={isGenerating}>
      <ImageDown size={16} />
      {isGenerating ? t("share.generating") : t("share.image")}
    </Button>
  );
}
