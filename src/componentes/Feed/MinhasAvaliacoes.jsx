import { MdReportProblem } from "react-icons/md";
import { useEffect, useState } from "react";
import DetalhesAlbum from "./DetalhesAlbum";
import FiltroAvaliacoes from "./Filtros/FiltroAvaliacoes";
import CardAlbumAvaliado from "./Cards/CardAlbumAvaliado";
import useAvaliacoes from "../../hooks/useAvaliacoes";
import Carregamento from "../Feedback/Carregamento";
import ErroCarregamento from "../Feedback/ErroCarregamento";
import { isAuthenticated } from "../../services/auth";
import { loginWithClientCredentials } from "../../services/api";

/**
 * Componente de barra de progresso para carregamento
 * @param {Object} props - Propriedades do componente
 * @param {number} props.progresso - Valor atual do progresso (0-100)
 * @returns {JSX.Element} Componente de barra de progresso
 */
const BarraProgresso = ({ progresso }) => {
  // Se o progresso for 0, não exibir a barra
  if (progresso <= 0) return null;

  return (
    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-4">
      <div
        className="bg-verde-destaque h-full transition-all duration-300 ease-out"
        style={{ width: `${progresso}%` }}
      ></div>
    </div>
  );
};

/**
 * Componente para exibir álbuns avaliados pelo usuário
 * @returns {JSX.Element} Componente de álbuns avaliados
 */
const MinhasAvaliacoes = () => {
  const [autenticado, setAutenticado] = useState(isAuthenticated());
  const [carregandoAuth, setCarregandoAuth] = useState(false);

  const {
    albunsExibidos,
    carregando,
    albumSelecionado,
    setAlbumSelecionado,
    filtroNota,
    setFiltroNota,
    termoPesquisa,
    setTermoPesquisa,
    ordenacao,
    alternarOrdenacao,
    erro,
    tentarNovamente,
    albunsAvaliados,
    progressoCarregamento,
    carregamentoProgressivo,
    setCarregamentoProgressivo,
    recarregarListaAlbuns,
  } = useAvaliacoes();

  useEffect(() => {
    setAutenticado(isAuthenticated());
  }, []);

  const fazerLoginDemo = async () => {
    setCarregandoAuth(true);
    try {
      const sucesso = await loginWithClientCredentials();
      if (sucesso) {
        setAutenticado(true);
        window.location.reload(); // Recarregar a página para atualizar o estado de autenticação
      } else {
        console.error("Falha ao fazer login no modo de demonstração");
      }
    } catch (erro) {
      console.error("Erro ao tentar fazer login:", erro);
    } finally {
      setCarregandoAuth(false);
    }
  };

  const atualizarListaAlbuns = () => {
    // Recarregar álbuns, mantendo a indicação de progresso visível
    recarregarListaAlbuns();
  };

  // Se não estiver autenticado, mostrar mensagem e botão para fazer login no modo demo
  if (!autenticado) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-verde-destaque mb-4">
          Sessão Expirada
        </h2>
        <p className="text-gray-400 mb-6">
          Sua sessão expirou ou você não está autenticado. Para continuar usando
          o aplicativo, faça login novamente.
        </p>
        <button
          onClick={fazerLoginDemo}
          disabled={carregandoAuth}
          className="bg-verde-destaque hover:bg-verde-destaque/80 text-white font-bold py-2 px-6 rounded-full focus:outline-none focus:shadow-outline transition-all"
        >
          {carregandoAuth ? "Carregando..." : "Entrar no Modo Demonstração"}
        </button>
      </div>
    );
  }

  // Exibir o indicador de carregamento
  if (carregando && !carregamentoProgressivo) {
    return <Carregamento />;
  }

  // Exibir mensagem de erro se houver
  if (erro) {
    return (
      <ErroCarregamento mensagem={erro} onTentarNovamente={tentarNovamente} />
    );
  }

  // Exibir detalhes do álbum selecionado
  if (albumSelecionado) {
    return (
      <DetalhesAlbum
        albumId={albumSelecionado}
        onVoltar={() => setAlbumSelecionado(null)}
      />
    );
  }

  // Exibir mensagem se não houver álbuns avaliados
  if (!albunsAvaliados || albunsAvaliados.length === 0) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-verde-destaque mb-4">
          Minhas Avaliações
        </h2>
        <p className="text-gray-400">
          Você ainda não avaliou nenhum álbum. Explore álbuns e avalie suas
          faixas para vê-los aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-verde-destaque">
          Meus Álbuns Avaliados
        </h2>

        <button
          onClick={atualizarListaAlbuns}
          className="text-sm bg-verde-destaque/20 hover:bg-verde-destaque/30 text-verde-destaque px-3 py-1 rounded-full transition-colors"
        >
          Atualizar
        </button>
      </div>

      {/* Barra de progresso */}
      {progressoCarregamento > 0 && (
        <div className="mb-4">
          <BarraProgresso progresso={progressoCarregamento} />
          <p className="text-xs text-gray-400 text-right">
            Carregando álbuns ({progressoCarregamento}%)...
          </p>
        </div>
      )}

      {/* Componente de filtros e ordenação */}
      <FiltroAvaliacoes
        termoPesquisa={termoPesquisa}
        setTermoPesquisa={setTermoPesquisa}
        filtroNota={filtroNota}
        setFiltroNota={setFiltroNota}
        ordenacao={ordenacao}
        alternarOrdenacao={alternarOrdenacao}
      />

      {/* Exibir mensagem se nenhum álbum corresponder aos filtros */}
      {!albunsExibidos || albunsExibidos.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm md:text-base">
          Nenhum álbum corresponde aos filtros selecionados.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          {/* Mapear cada álbum para um componente de cartão */}
          {albunsExibidos.map((album) => (
            <CardAlbumAvaliado
              key={album.id}
              album={album}
              setAlbumSelecionado={setAlbumSelecionado}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MinhasAvaliacoes;
