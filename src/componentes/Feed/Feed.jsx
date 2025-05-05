import MostrarTopArtistas from "./MostrarTopArtistas";
import MostrarTopAlbuns from "./MostrarTopAlbuns";
import MinhasAvaliacoes from "./MinhasAvaliacoes";
import FeedGlobal from "./FeedGlobal";
import DetalhesAlbum from "../DetalhesAlbum/DetalhesAlbum";
import Pesquisar from "./Pesquisar";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

/**
 * Componente Feed para exibir o conteúdo principal com base na visão ativa
 * @param {Object} props - Propriedades do componente
 * @param {string} props.activeView - Visão ativa ("albuns", "artistas", "classificacoes", "feed", "album", "descubra")
 * @param {string} props.termoPesquisa - Termo de pesquisa inserido pelo usuário
 * @returns {JSX.Element} Componente de feed
 */
export default function Feed({ activeView, termoPesquisa }) {
  // Obter o ID do álbum da URL se estiver na rota /album/:id
  const { id: albumId } = useParams();

  return (
    <div className="w-full bg-quase-preto rounded-xl overflow-hidden">
      {activeView === "albuns" && (
        <MostrarTopAlbuns termoPesquisa={termoPesquisa} />
      )}
      {activeView === "artistas" && (
        <MostrarTopArtistas termoPesquisa={termoPesquisa} />
      )}
      {activeView === "pesquisar" && (
        <Pesquisar termoPesquisa={termoPesquisa} />
      )}
      {activeView === "classificacoes" && <MinhasAvaliacoes />}
      {activeView === "feed" && <FeedGlobal />}
      {activeView === "album" && albumId && <DetalhesAlbum albumId={albumId} />}
      {!activeView && (
        <div className="flex justify-center items-center h-64 text-gray-400">
          <p>Selecione uma opção no menu lateral</p>
        </div>
      )}
    </div>
  );
}
