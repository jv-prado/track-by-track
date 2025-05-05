import React from "react";
import { FaSpotify } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const BotaoSpotify = ({ detalhesAlbum }) => {
  const { t } = useTranslation();
  return (
    <a
      href={detalhesAlbum?.external_urls?.spotify}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-lg transition-colors font-medium mb-1"
      title={t("spotify.openTitle")}
    >
      <FaSpotify className="inline text-base" />
      {t("spotify.listenButton")}
    </a>
  );
};

export default BotaoSpotify;
