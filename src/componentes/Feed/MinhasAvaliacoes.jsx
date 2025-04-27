import { MdReportProblem } from "react-icons/md";
import React, { useEffect, useState } from "react";
import DetalhesAlbum from "./DetalhesAlbum";
import FiltroAvaliacoes from "./Filtros/FiltroAvaliacoes";
import CardAlbumAvaliado from "./Cards/CardAlbumAvaliado";
import useAvaliacoes from "../../hooks/useAvaliacoes";
import Carregamento from "../Feedback/Carregamento";
import ErroCarregamento from "../Feedback/ErroCarregamento";
import { isAuthenticated, recuperarAutenticacao } from "../../services/auth";
import { loginWithClientCredentials } from "../../services/api";
import { configurarSincronizacaoAutomatica } from "../../services/avaliacoes";
import { useNavigate } from "react-router-dom";

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
 * Componente que envolve outro para capturar erros
 */
class TratadorErros extends React.Component {
  constructor(props) {
    super(props);
    this.state = { temErro: false, mensagemErro: "" };
  }

  static getDerivedStateFromError(erro) {
    return {
      temErro: true,
      mensagemErro: erro.message || "Ocorreu um erro inesperado",
    };
  }

  componentDidCatch(erro, infoErro) {
    console.error("Erro no componente:", erro, infoErro);
  }

  render() {
    if (this.state.temErro) {
      return (
        <div className="p-8 text-center">
          <div className="text-red-500 mb-4">
            <MdReportProblem size={48} className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">
            Ops! Algo deu errado
          </h2>
          <p className="text-gray-400 mb-6">
            Ocorreu um erro ao tentar exibir suas avaliações. Tente atualizar a
            página.
          </p>
          <p className="text-gray-500 text-sm mt-3 mb-6">
            Detalhes: {this.state.mensagemErro}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-verde-destaque hover:bg-verde-destaque/80 text-white font-bold py-2 px-6 rounded-full focus:outline-none focus:shadow-outline transition-all cursor-pointer"
          >
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Componente para exibir álbuns avaliados pelo usuário
 * @returns {JSX.Element} Componente de álbuns avaliados
 */
const MinhasAvaliacoes = () => {
  const [autenticado, setAutenticado] = useState(isAuthenticated());
  const [carregandoAuth, setCarregandoAuth] = useState(false);
  const [tentouRecuperar, setTentouRecuperar] = useState(false);
  const [carregandoTela, setCarregandoTela] = useState(true);
  const [estavaNaTelaDetalhes, setEstavaNaTelaDetalhes] = useState(false);
  const navigate = useNavigate();

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

  // Recarregar a lista quando o usuário voltar da tela de detalhes de álbum
  useEffect(() => {
    if (albumSelecionado) {
      // O usuário está indo para a tela de detalhes
      setEstavaNaTelaDetalhes(true);
    } else if (estavaNaTelaDetalhes) {
      // O usuário estava na tela de detalhes e agora voltou
      console.log("Usuário voltou da tela de detalhes, recarregando álbuns...");
      recarregarListaAlbuns();
      setEstavaNaTelaDetalhes(false);
    }
  }, [albumSelecionado]);

  // Tentar recuperar autenticação automaticamente ao montar o componente
  useEffect(() => {
    const tentarRecuperarAutenticacao = async () => {
      try {
        console.log(
          "Estado de autenticação:",
          isAuthenticated() ? "Autenticado" : "Não autenticado"
        );

        // Verificar se existe um usuário de demonstração
        const demoToken = localStorage.getItem("demo_token");
        const demoExpiry = localStorage.getItem("demo_token_expiry");
        const demoAtivo =
          demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

        if (demoAtivo) {
          console.log("Usuário demo detectado e válido");
          setAutenticado(true);
          setCarregandoTela(false);
          return;
        }

        if (!isAuthenticated() && !tentouRecuperar) {
          setCarregandoAuth(true);
          setTentouRecuperar(true);
          console.log("Tentando recuperar autenticação automaticamente...");

          const recuperado = await recuperarAutenticacao();
          console.log(
            "Resultado da recuperação automática:",
            recuperado ? "Sucesso" : "Falha"
          );

          if (recuperado) {
            console.log("Autenticação recuperada com sucesso!");
            setAutenticado(true);
            tentarNovamente();
          }
        }
      } catch (erro) {
        console.error("Erro na recuperação automática:", erro);
      } finally {
        setCarregandoAuth(false);
        setCarregandoTela(false);
      }
    };

    tentarRecuperarAutenticacao();
  }, [tentouRecuperar]);

  // Verificar autenticação quando o componente é montado
  useEffect(() => {
    const verificarAuth = () => {
      try {
        // Verificar se existe um usuário de demonstração
        const demoToken = localStorage.getItem("demo_token");
        const demoExpiry = localStorage.getItem("demo_token_expiry");
        const demoAtivo =
          demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

        // Verificar autenticação normal ou modo de demonstração
        const estadoAuth = isAuthenticated() || demoAtivo;
        console.log(
          "Verificação periódica - autenticado:",
          estadoAuth,
          demoAtivo ? "(modo demo)" : ""
        );
        setAutenticado(estadoAuth);
        setCarregandoTela(false);
      } catch (erro) {
        console.error("Erro ao verificar autenticação:", erro);
        setCarregandoTela(false);
      }
    };

    verificarAuth();

    // Verificar periodicamente o estado de autenticação para atualizar a UI
    const intervalo = setInterval(verificarAuth, 2000);

    return () => clearInterval(intervalo);
  }, []);

  const fazerLoginDemo = async () => {
    setCarregandoAuth(true);
    try {
      console.log("Iniciando login no modo demonstração...");

      // Criar um "usuário demo" no localStorage
      const usuarioDemo = {
        id: "usuario-demo-" + Date.now(),
        nome: "Usuário Demo",
        email: "demo@example.com",
        tipo: "demo",
      };

      // Salvar token demo com validade de 7 dias
      const dataExpiracao = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem("demo_usuario", JSON.stringify(usuarioDemo));
      localStorage.setItem("demo_token", "demo_" + Date.now());
      localStorage.setItem("demo_token_expiry", dataExpiracao.toString());

      // Inicializar estruturas de dados para avaliações se não existirem
      localStorage.setItem("avaliacoesFaixas", JSON.stringify({}));
      localStorage.setItem("mapaFaixasAlbuns", JSON.stringify({}));
      localStorage.setItem("datasAvaliacoes", JSON.stringify({}));
      localStorage.setItem("preferenciasAlbuns", JSON.stringify({}));

      // Sinalizar que o modo de demonstração está ativo
      localStorage.setItem("modo_demo_ativo", "true");

      // Configurar sincronização automática entre localStorage e memória
      configurarSincronizacaoAutomatica();

      // Forçar uma recarga completa da página para garantir que o
      // usuário demo seja reconhecido por todos os componentes
      window.location.href = window.location.href;
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

  // Exibir indicador de carregamento enquanto verificamos a autenticação
  if (carregandoTela) {
    return <Carregamento />;
  }

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
          className="bg-verde-destaque hover:bg-verde-destaque/80 text-white font-bold py-2 px-6 rounded-full focus:outline-none focus:shadow-outline transition-all cursor-pointer"
          disabled={carregandoAuth}
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
          className="text-sm bg-verde-destaque/20 hover:bg-verde-destaque/30 text-verde-destaque px-3 py-1 rounded-full transition-colors hover:cursor-pointer"
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

// Componente MinhasAvaliacoes envolvido pelo TratadorErros
const MinhasAvaliacoesComTratamentoErro = () => (
  <TratadorErros>
    <MinhasAvaliacoes />
  </TratadorErros>
);

export default MinhasAvaliacoesComTratamentoErro;
