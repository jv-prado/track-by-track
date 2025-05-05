import React from "react";
import { FaSpotify } from "react-icons/fa";

const BotaoSpotify = ({ detalhesAlbum }) => (
  <a
    href={detalhesAlbum?.external_urls?.spotify}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1 bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-lg transition-colors font-medium mb-1"
    title="Abrir no Spotify"
  >
    <FaSpotify className="inline text-base" />
    Ouvir no Spotify
  </a>
);

export default BotaoSpotify;
