import MostrarTopArtistas from "./MostrarTopArtistas";
import MostrarTopAlbuns from "./MostrarTopAlbuns";
import MinhasAvaliacoes from "./MinhasAvaliacoes";
import FeedGlobal from "./FeedGlobal";
import { useEffect } from "react";

/**
 * Componente Feed para exibir o conteúdo principal com base na visão ativa
 * @param {Object} props - Propriedades do componente
 * @param {string} props.activeView - Visão ativa ("albuns", "artistas", "classificacoes" ou "feed")
 * @param {string} props.termoPesquisa - Termo de pesquisa inserido pelo usuário
 * @returns {JSX.Element} Componente de feed
 */
export default function Feed({ activeView, termoPesquisa }) {
  return (
    <div className="w-full bg-quase-preto rounded-xl overflow-hidden">
      {activeView === "albuns" && (
        <MostrarTopAlbuns termoPesquisa={termoPesquisa} />
      )}
      {activeView === "artistas" && (
        <MostrarTopArtistas termoPesquisa={termoPesquisa} />
      )}
      {activeView === "classificacoes" && <MinhasAvaliacoes />}
      {activeView === "feed" && <FeedGlobal />}
      {!activeView && (
        <div className="flex justify-center items-center h-64 text-gray-400">
          <p>Selecione uma opção no menu lateral</p>
        </div>
      )}
    </div>
  );
}
