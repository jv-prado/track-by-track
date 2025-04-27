import { useState, useEffect } from "react";
import {
  buscarFaixasPorAlbum,
  buscarDetalhesAlbum,
} from "../../services/spotify";
import Estrelas from "../Avaliacao/Estrelas";
import { MdReportProblem } from "react-icons/md";
import { IoMdHeart, IoMdHeartDislike } from "react-icons/io";
import { FaTrash, FaUndo } from "react-icons/fa";
import { notificarAvaliacoesAlteradas } from "../../services/sync";
import { useParams, useNavigate } from "react-router-dom";
import Carregamento from "../Feedback/Carregamento";
import ErroCarregamento from "../Feedback/ErroCarregamento";
import {
  calcularProgressoAvaliacao,
  registrarDataAvaliacao,
  obterDatasAvaliacao,
  formatarData,
  getAvaliacoesFaixas,
  setAvaliacoesFaixas,
  getMapaFaixasAlbuns,
  setMapaFaixasAlbuns,
} from "../../services/avaliacoes";
import { getUsuarioAtual, salvarAvaliacaoAlbum } from "../../services/firebase";

/**
 * Componente para exibir detalhes de um álbum e suas faixas
 * @param {Object} props - Propriedades do componente
 * @param {string} props.albumId - ID do álbum no Spotify (opcional)
 * @param {Function} props.onVoltar - Função para voltar à tela anterior (opcional)
 */
const DetalhesAlbum = ({ albumId: albumIdProp, onVoltar: onVoltarProp }) => {
  // Obter parâmetros da URL
  const { id: albumIdParam } = useParams();
  const navigate = useNavigate();

  // Usar albumId da prop se disponível, caso contrário usar da URL
  const albumId = albumIdProp || albumIdParam;

  // Função de voltar personalizada ou padrão
  const onVoltar = onVoltarProp || (() => navigate(-1));

  const [detalhesAlbum, setDetalhesAlbum] = useState(null);
  const [faixas, setFaixas] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [avaliacoes, setAvaliacoes] = useState({});
  const [faixaFavorita, setFaixaFavorita] = useState(null);
  const [piorFaixa, setPiorFaixa] = useState(null);
  const [progressoAvaliacao, setProgressoAvaliacao] = useState({
    avaliadas: 0,
    total: 0,
    percentual: 0,
  });
  const [erro, setErro] = useState(null);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(null);
  const [datasAvaliacao, setDatasAvaliacao] = useState({
    primeira: null,
    ultima: null,
    temRegistro: false,
  });

  // Verificação defensiva para garantir que progressoAvaliacao seja sempre válido
  useEffect(() => {
    if (!progressoAvaliacao || typeof progressoAvaliacao !== "object") {
      console.warn(
        "progressoAvaliacao inválido, resetando",
        progressoAvaliacao
      );
      setProgressoAvaliacao({
        avaliadas: 0,
        total: 0,
        percentual: 0,
      });
    }
  }, [progressoAvaliacao]);

  // Função para calcular o progresso das avaliações
  const calcularProgressoAvaliacao = (dadosFaixas, avaliacoesFaixas) => {
    if (!dadosFaixas || !dadosFaixas.items || dadosFaixas.items.length === 0) {
      return { avaliadas: 0, total: 0, percentual: 0 };
    }

    const total = dadosFaixas.items.length;
    const avaliadas = dadosFaixas.items.reduce((count, faixa) => {
      return (
        count +
        (avaliacoesFaixas[faixa.id] && avaliacoesFaixas[faixa.id] > 0 ? 1 : 0)
      );
    }, 0);

    const percentual = Math.round((avaliadas / total) * 100);

    return { avaliadas, total, percentual };
  };

  // Carregar avaliações e preferências do localStorage
  useEffect(() => {
    try {
      // Verificar se estamos em modo de demonstração
      const demoToken = localStorage.getItem("demo_token");
      const demoExpiry = localStorage.getItem("demo_token_expiry");
      const modoDemo =
        demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();
      const usuarioFirebase = getUsuarioAtual();

      // Apenas para usuários não logados ou em modo demo, carregar do localStorage
      if (!usuarioFirebase || modoDemo) {
        console.log(
          "Carregando avaliações do localStorage para álbum",
          albumId
        );

        // Inicializar as avaliações se não existirem
        if (!localStorage.getItem("avaliacoesFaixas")) {
          localStorage.setItem("avaliacoesFaixas", JSON.stringify({}));
        }

        // Inicializar o mapa se não existir
        if (!localStorage.getItem("mapaFaixasAlbuns")) {
          localStorage.setItem("mapaFaixasAlbuns", JSON.stringify({}));
        }

        // Carregar as avaliações
        const avaliacoesSalvas = localStorage.getItem("avaliacoesFaixas");
        if (avaliacoesSalvas) {
          try {
            const dados = JSON.parse(avaliacoesSalvas);
            setAvaliacoes(dados);
          } catch (e) {
            console.error("Erro ao analisar avaliacoesFaixas:", e);
            setAvaliacoes({});
          }
        }

        // Carregar preferências de faixas favoritas/piores
        try {
          const prefsFaixas = JSON.parse(
            localStorage.getItem(`preferencias_${albumId}`) || "{}"
          );

          if (prefsFaixas.favorita) {
            setFaixaFavorita(prefsFaixas.favorita);
          } else if (prefsFaixas.faixaFavorita) {
            setFaixaFavorita(prefsFaixas.faixaFavorita);
          }

          if (prefsFaixas.pior) {
            setPiorFaixa(prefsFaixas.pior);
          } else if (prefsFaixas.piorFaixa) {
            setPiorFaixa(prefsFaixas.piorFaixa);
          }
        } catch (e) {
          console.error("Erro ao analisar preferências:", e);
        }

        // Carregar datas de avaliação
        const datas = obterDatasAvaliacao(albumId);
        setDatasAvaliacao(datas);
      }
    } catch (erro) {
      console.error("Erro ao carregar avaliações do localStorage:", erro);
    }
  }, [albumId]);

  // Função para tentar carregar os dados novamente
  const tentarNovamente = () => {
    setErro(null);
    setCarregando(true);
    buscarDados();
  };

  // Buscar detalhes do álbum e suas faixas
  const buscarDados = async () => {
    if (!albumId) return;

    try {
      setCarregando(true);
      setErro(null);

      // Buscar em paralelo para melhorar a performance
      const [detalhes, dadosFaixas] = await Promise.all([
        buscarDetalhesAlbum(albumId),
        buscarFaixasPorAlbum(albumId),
      ]);

      setDetalhesAlbum(detalhes);
      setFaixas(dadosFaixas);

      const usuarioFirebase = getUsuarioAtual();
      if (!usuarioFirebase) {
        // Apenas para usuários não logados, usar localStorage
        // Obter avaliações existentes do localStorage
        const avaliacoesExistentes = JSON.parse(
          localStorage.getItem("avaliacoesFaixas") || "{}"
        );

        // Inicializar avaliações para novas faixas, mantendo as existentes
        const novasAvaliacoes = { ...avaliacoesExistentes };
        dadosFaixas.items.forEach((faixa) => {
          if (!novasAvaliacoes[faixa.id]) {
            novasAvaliacoes[faixa.id] = 0;
          }
        });
        setAvaliacoes(novasAvaliacoes);

        // Calcular o progresso de avaliação
        setProgressoAvaliacao(
          calcularProgressoAvaliacao(dadosFaixas, novasAvaliacoes)
        );

        // Salvar mapeamento de faixas para álbuns
        const mapaFaixasAlbuns = JSON.parse(
          localStorage.getItem("mapaFaixasAlbuns") || "{}"
        );
        dadosFaixas.items.forEach((faixa) => {
          mapaFaixasAlbuns[faixa.id] = albumId;
        });
        localStorage.setItem(
          "mapaFaixasAlbuns",
          JSON.stringify(mapaFaixasAlbuns)
        );
      } else {
        // Para usuários Firebase, carregar dados do Firebase
        import("../../services/firebase").then(async (firebaseModule) => {
          try {
            const albunsFirebase = await firebaseModule.obterAlbunsAvaliados();
            const albumAtual = albunsFirebase.find(
              (album) => album.id === albumId
            );

            if (albumAtual) {
              // Usar avaliações do Firebase
              setAvaliacoes(albumAtual.avaliacoes || {});

              // Carregar preferências de faixa favorita e pior faixa
              if (albumAtual.preferencias) {
                if (albumAtual.preferencias.faixaFavorita) {
                  setFaixaFavorita(albumAtual.preferencias.faixaFavorita);
                }
                if (albumAtual.preferencias.piorFaixa) {
                  setPiorFaixa(albumAtual.preferencias.piorFaixa);
                }
              }

              // Carregar datas de avaliação do Firebase
              if (
                albumAtual.data_primeira_avaliacao ||
                albumAtual.data_avaliacao
              ) {
                try {
                  const datasDoFirebase = {
                    primeira: albumAtual.data_primeira_avaliacao
                      ? new Date(
                          albumAtual.data_primeira_avaliacao.seconds * 1000
                        )
                      : new Date(albumAtual.data_avaliacao.seconds * 1000),
                    ultima: new Date(albumAtual.data_avaliacao.seconds * 1000),
                    temRegistro: true,
                  };
                  setDatasAvaliacao(datasDoFirebase);
                } catch (error) {
                  console.error("Erro ao converter datas do Firebase:", error);
                }
              }

              // Calcular progresso
              setProgressoAvaliacao(
                calcularProgressoAvaliacao(
                  dadosFaixas,
                  albumAtual.avaliacoes || {}
                )
              );
            } else {
              // Inicializar com valores vazios se o álbum não existir no Firebase
              const avaliacoesVazias = {};
              dadosFaixas.items.forEach((faixa) => {
                avaliacoesVazias[faixa.id] = 0;
              });
              setAvaliacoes(avaliacoesVazias);
              setProgressoAvaliacao(
                calcularProgressoAvaliacao(dadosFaixas, avaliacoesVazias)
              );
            }
          } catch (error) {
            console.error("Erro ao carregar avaliações do Firebase:", error);
          }
        });
      }
    } catch (erro) {
      console.error("Erro ao buscar detalhes do álbum:", erro);
      setErro(
        "Não foi possível carregar os detalhes do álbum. Por favor, verifique sua conexão e tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  };

  // Iniciar busca de dados quando o componente carregar
  useEffect(() => {
    buscarDados();
  }, [albumId]);

  // Função para formatar duração em minutos:segundos
  const formatarDuracao = (ms) => {
    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    return `${minutos}:${segundos < 10 ? "0" : ""}${segundos}`;
  };

  // Função para calcular duração total do álbum
  const calcularDuracaoTotal = () => {
    if (!faixas || !faixas.items || faixas.items.length === 0) {
      return "0:00";
    }

    const totalMs = faixas.items.reduce((total, faixa) => {
      return total + faixa.duration_ms;
    }, 0);

    const minutos = Math.floor(totalMs / 60000);
    const segundos = Math.floor((totalMs % 60000) / 1000);

    return `${minutos}:${segundos < 10 ? "0" : ""}${segundos}`;
  };

  // Função para avaliar uma faixa
  const avaliarFaixa = async (faixaId, nota) => {
    if (!faixas) return;

    // Verificar se o usuário está logado no Firebase
    const usuarioFirebase = getUsuarioAtual();

    // Atualiza as avaliações localmente
    let novasAvaliacoes = { ...avaliacoes };

    // Se a nota for a mesma já dada, remove a avaliação (toggle)
    if (novasAvaliacoes[faixaId] === nota) {
      delete novasAvaliacoes[faixaId];
    } else {
      novasAvaliacoes[faixaId] = nota;
    }

    setAvaliacoes(novasAvaliacoes);

    // Calcular progresso corretamente considerando apenas as faixas do álbum atual
    setProgressoAvaliacao(calcularProgressoAvaliacao(faixas, novasAvaliacoes));

    if (usuarioFirebase) {
      // Para usuário logado, salvar diretamente no Firebase
      try {
        if (detalhesAlbum) {
          await salvarAvaliacaoAlbum(
            albumId,
            novasAvaliacoes,
            detalhesAlbum.name,
            detalhesAlbum.artists[0].name,
            detalhesAlbum.images[0]?.url || "",
            {
              faixaFavorita,
              piorFaixa,
            }
          );
        }
      } catch (error) {
        console.error("Erro ao salvar avaliação no Firebase:", error);
      }
    } else {
      // Para usuário não logado, usar localStorage
      localStorage.setItem(
        `avaliacoes_${albumId}`,
        JSON.stringify(novasAvaliacoes)
      );

      // Notificar que as avaliações foram alteradas
      notificarAvaliacoesAlteradas();
    }

    // Registrar data da avaliação (passando o ID da faixa e a avaliação)
    if (nota > 0) {
      registrarDataAvaliacao(faixaId, nota);
    }

    // Atualizar datas de avaliação no componente
    setDatasAvaliacao(obterDatasAvaliacao(albumId));
  };

  // Função para marcar uma faixa como favorita
  const marcarFaixaFavorita = async (faixaId) => {
    if (!faixas || !faixas.items) return;

    // Verificar se o usuário está logado no Firebase
    const usuarioFirebase = getUsuarioAtual();

    // Se já for favorita, remove a marcação
    const novaFaixaFavorita = faixaFavorita === faixaId ? null : faixaId;
    setFaixaFavorita(novaFaixaFavorita);

    // Salvar nas preferências do álbum
    const preferencias = {
      faixaFavorita: novaFaixaFavorita,
      piorFaixa: piorFaixa,
    };

    if (usuarioFirebase) {
      // Para usuário logado, salvar diretamente no Firebase
      try {
        if (detalhesAlbum) {
          await salvarAvaliacaoAlbum(
            albumId,
            avaliacoes,
            detalhesAlbum.name,
            detalhesAlbum.artists[0].name,
            detalhesAlbum.images[0]?.url || "",
            preferencias
          );
        }
      } catch (error) {
        console.error("Erro ao salvar faixa favorita no Firebase:", error);
      }
    } else {
      // Para usuário não logado, usar localStorage
      localStorage.setItem(
        `preferencias_${albumId}`,
        JSON.stringify(preferencias)
      );

      // Notificar que as avaliações foram alteradas para acionar a sincronização
      notificarAvaliacoesAlteradas();
    }

    // Atualizar datas de avaliação no componente
    setDatasAvaliacao(obterDatasAvaliacao(albumId));
  };

  // Função para marcar uma faixa como a pior
  const marcarPiorFaixa = async (faixaId) => {
    if (!faixas || !faixas.items) return;

    // Verificar se o usuário está logado no Firebase
    const usuarioFirebase = getUsuarioAtual();

    // Se já for a pior, remove a marcação
    const novaPiorFaixa = piorFaixa === faixaId ? null : faixaId;
    setPiorFaixa(novaPiorFaixa);

    // Salvar nas preferências do álbum
    const preferencias = {
      faixaFavorita: faixaFavorita,
      piorFaixa: novaPiorFaixa,
    };

    if (usuarioFirebase) {
      // Para usuário logado, salvar diretamente no Firebase
      try {
        if (detalhesAlbum) {
          await salvarAvaliacaoAlbum(
            albumId,
            avaliacoes,
            detalhesAlbum.name,
            detalhesAlbum.artists[0].name,
            detalhesAlbum.images[0]?.url || "",
            preferencias
          );
        }
      } catch (error) {
        console.error("Erro ao salvar pior faixa no Firebase:", error);
      }
    } else {
      // Para usuário não logado, usar localStorage
      localStorage.setItem(
        `preferencias_${albumId}`,
        JSON.stringify(preferencias)
      );

      // Notificar que as avaliações foram alteradas para acionar a sincronização
      notificarAvaliacoesAlteradas();
    }

    // Atualizar datas de avaliação no componente
    setDatasAvaliacao(obterDatasAvaliacao(albumId));
  };

  // Função para calcular média de avaliações do álbum
  const calcularMediaAvaliacoes = () => {
    if (!faixas || !faixas.items || faixas.items.length === 0) {
      return 0;
    }

    const soma = faixas.items.reduce((total, faixa) => {
      return total + (avaliacoes[faixa.id] || 0);
    }, 0);

    // Convertendo para escala de 0 a 10
    const mediaEm5 = soma / faixas.items.length;
    // Usar parseFloat para garantir que retornamos um número, não uma string
    return parseFloat((mediaEm5 * 2).toFixed(1));
  };

  // Função para resetar as avaliações do álbum atual
  const resetarAvaliacoesAlbum = async () => {
    if (!faixas || !faixas.items) return;

    // Confirmar a ação se necessário
    if (mostrarConfirmacao !== "resetar") {
      setMostrarConfirmacao("resetar");
      return;
    }

    // Verificar se o usuário está logado no Firebase
    const usuarioFirebase = getUsuarioAtual();

    // Criar novas avaliações zerando apenas as faixas deste álbum
    const novasAvaliacoes = { ...avaliacoes };
    faixas.items.forEach((faixa) => {
      novasAvaliacoes[faixa.id] = 0;
    });

    // Atualizar estado local
    setAvaliacoes(novasAvaliacoes);

    // Resetar faixa favorita e pior
    setFaixaFavorita(null);
    setPiorFaixa(null);

    if (usuarioFirebase) {
      // Usuário logado no Firebase - resetar diretamente no Firebase
      try {
        if (detalhesAlbum) {
          await salvarAvaliacaoAlbum(
            albumId,
            novasAvaliacoes,
            detalhesAlbum.name,
            detalhesAlbum.artists[0].name,
            detalhesAlbum.images[0]?.url || ""
          );
        }
      } catch (error) {
        console.error("Erro ao resetar avaliações no Firebase:", error);
      }
    } else {
      // Apenas para usuário não logado, usar localStorage
      localStorage.removeItem(`preferencias_${albumId}`);

      // Obter avaliações existentes
      const avaliacoesExistentes = JSON.parse(
        localStorage.getItem("avaliacoesFaixas") || "{}"
      );

      // Atualizar avaliações existentes
      const novasAvaliacoesStorage = { ...avaliacoesExistentes };
      faixas.items.forEach((faixa) => {
        if (novasAvaliacoesStorage[faixa.id]) {
          novasAvaliacoesStorage[faixa.id] = 0;
        }
      });

      // Salvar no localStorage
      localStorage.setItem(
        "avaliacoesFaixas",
        JSON.stringify(novasAvaliacoesStorage)
      );

      // Notificar que as avaliações foram alteradas para acionar a sincronização
      notificarAvaliacoesAlteradas();
    }

    // Recalcular progresso
    setProgressoAvaliacao(calcularProgressoAvaliacao(faixas, novasAvaliacoes));

    // Esconder confirmação
    setMostrarConfirmacao(null);
  };

  // Função para remover o álbum das minhas avaliações
  const removerAlbum = async () => {
    if (!faixas || !faixas.items) return;

    // Confirmar a ação se necessário
    if (mostrarConfirmacao !== "remover") {
      setMostrarConfirmacao("remover");
      return;
    }

    // Verificar se o usuário está logado no Firebase
    const usuarioFirebase = getUsuarioAtual();

    // Criar avaliações vazias para o álbum
    const novasAvaliacoes = { ...avaliacoes };
    faixas.items.forEach((faixa) => {
      novasAvaliacoes[faixa.id] = 0;
    });

    // Atualizar estados
    setAvaliacoes({});

    // Resetar faixa favorita e pior
    setFaixaFavorita(null);
    setPiorFaixa(null);

    // Recalcular progresso (será zero porque removemos todas)
    setProgressoAvaliacao({
      avaliadas: 0,
      total: faixas.items.length,
      percentual: 0,
    });

    if (usuarioFirebase) {
      // Usuário logado no Firebase - remover diretamente no Firebase
      try {
        if (detalhesAlbum) {
          // Para remover no Firebase, salvamos com avaliações vazias/zeradas
          await salvarAvaliacaoAlbum(
            albumId,
            {}, // Objeto vazio para remover todas as avaliações
            detalhesAlbum.name,
            detalhesAlbum.artists[0].name,
            detalhesAlbum.images[0]?.url || ""
          );
        }
      } catch (error) {
        console.error("Erro ao remover álbum no Firebase:", error);
      }
    } else {
      // Apenas para usuário não logado, usar localStorage
      localStorage.removeItem(`preferencias_${albumId}`);

      // Obter avaliações e mapeamento de faixas
      const avaliacoesExistentes = JSON.parse(
        localStorage.getItem("avaliacoesFaixas") || "{}"
      );
      const mapaFaixasAlbuns = JSON.parse(
        localStorage.getItem("mapaFaixasAlbuns") || "{}"
      );

      // Remover avaliações das faixas deste álbum
      const novoMapaFaixas = { ...mapaFaixasAlbuns };
      const novasAvaliacoesStorage = { ...avaliacoesExistentes };

      faixas.items.forEach((faixa) => {
        // Remover da avaliação
        if (novasAvaliacoesStorage[faixa.id]) {
          delete novasAvaliacoesStorage[faixa.id];
        }

        // Remover do mapeamento
        if (novoMapaFaixas[faixa.id]) {
          delete novoMapaFaixas[faixa.id];
        }
      });

      // Salvar no localStorage
      localStorage.setItem(
        "avaliacoesFaixas",
        JSON.stringify(novasAvaliacoesStorage)
      );
      localStorage.setItem("mapaFaixasAlbuns", JSON.stringify(novoMapaFaixas));

      // Notificar que as avaliações foram alteradas para acionar a sincronização
      notificarAvaliacoesAlteradas();
    }

    // Esconder confirmação e voltar à lista de álbuns
    setMostrarConfirmacao(null);
    onVoltar();
  };

  // Função para cancelar a ação de confirmação
  const cancelarAcao = () => {
    setMostrarConfirmacao(null);
  };

  // Exibir indicador de carregamento
  if (carregando) {
    return <Carregamento />;
  }

  // Exibir mensagem de erro
  if (erro) {
    return (
      <ErroCarregamento mensagem={erro} onTentarNovamente={tentarNovamente} />
    );
  }

  if (!detalhesAlbum || !faixas) {
    return (
      <div className="p-3 md:p-6 overflow-hidden">
        <button
          onClick={onVoltar}
          className="mb-4 bg-cinza py-2 px-4 rounded-lg hover:bg-cinza-escuro transition-colors text-sm cursor-pointer"
        >
          Voltar
        </button>
        <p className="text-center text-gray-400 text-base md:text-lg">
          Não foi possível carregar os detalhes do álbum
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={onVoltar}
          className="bg-cinza py-2 px-4 rounded-lg hover:bg-cinza-escuro transition-colors text-sm cursor-pointer"
        >
          Voltar
        </button>

        {/* Botões de ação para o álbum */}
        <div className="flex gap-2">
          <button
            onClick={resetarAvaliacoesAlbum}
            className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg transition-colors text-sm flex items-center gap-1 cursor-pointer"
            title="Resetar avaliações deste álbum"
          >
            <FaUndo className="text-xs" />
            <span className="hidden sm:inline">Resetar</span>
          </button>

          <button
            onClick={removerAlbum}
            className="bg-red-900 hover:bg-red-800 text-white py-2 px-3 rounded-lg transition-colors text-sm flex items-center gap-1 cursor-pointer"
            title="Remover álbum das avaliações"
          >
            <FaTrash className="text-xs" />
            <span className="hidden sm:inline">Remover</span>
          </button>
        </div>
      </div>

      {/* Modal de confirmação */}
      {mostrarConfirmacao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] px-4">
          <div className="bg-cinza-escuro rounded-xl p-5 max-w-md w-full">
            <h3 className="text-lg font-bold text-verde-destaque mb-3">
              {mostrarConfirmacao === "resetar"
                ? "Resetar avaliações?"
                : "Remover álbum?"}
            </h3>
            <p className="text-gray-300 mb-5">
              {mostrarConfirmacao === "resetar"
                ? "Isso vai zerar todas as suas avaliações para este álbum. Esta ação não pode ser desfeita."
                : "Isso vai remover este álbum das suas avaliações e apagar todas as notas das faixas. Esta ação não pode ser desfeita."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelarAcao}
                className="bg-gray-700 py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={
                  mostrarConfirmacao === "resetar"
                    ? resetarAvaliacoesAlbum
                    : removerAlbum
                }
                className={`py-2 px-4 rounded-lg transition-colors cursor-pointer ${
                  mostrarConfirmacao === "resetar"
                    ? "bg-yellow-700 hover:bg-yellow-600"
                    : "bg-red-700 hover:bg-red-600"
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 md:gap-8 mb-4 md:mb-8">
        {/* Capa do álbum */}
        <div className="flex-shrink-0 mx-auto md:mx-0">
          {detalhesAlbum.images && detalhesAlbum.images.length > 0 && (
            <img
              src={detalhesAlbum.images[0].url}
              alt={`Capa do álbum ${detalhesAlbum.name}`}
              className="w-48 h-48 md:w-64 md:h-64 object-cover rounded-lg shadow-lg"
            />
          )}
        </div>

        {/* Informações do álbum */}
        <div className="flex flex-col mt-4 md:mt-0">
          <h2 className="text-xl md:text-3xl font-bold text-verde-destaque mb-1 md:mb-2 text-center md:text-left">
            {detalhesAlbum.name}
          </h2>
          <p className="text-lg md:text-xl mb-1 md:mb-2 text-center md:text-left">
            {detalhesAlbum.artists.map((a) => a.name).join(", ")}
          </p>
          <p className="text-gray-400 text-center md:text-left text-sm md:text-base">
            {detalhesAlbum.release_date.substring(0, 4)} • {faixas.items.length}{" "}
            faixas • {calcularDuracaoTotal()}
          </p>
          <div className="mt-3 md:mt-4 flex items-center justify-center md:justify-start">
            <span className="text-xl md:text-2xl font-bold mr-2 text-verde-destaque">
              {calcularMediaAvaliacoes()}
            </span>
            <span className="text-xs md:text-sm text-gray-400">/10</span>
          </div>

          {/* Barra de progresso de avaliação */}
          <div className="mt-3 md:mt-4">
            <div className="flex justify-between mb-1 gap-1">
              <span className="text-xs md:text-sm text-gray-400">
                Progresso da avaliação
              </span>
              <span className="text-xs md:text-sm text-gray-400">
                {progressoAvaliacao?.avaliadas || 0}/
                {progressoAvaliacao?.total || 0} (
                {progressoAvaliacao?.percentual || 0}%)
              </span>
            </div>
            <div className="w-full h-2 md:h-3 bg-cinza rounded-full overflow-hidden">
              <div
                className="h-full bg-verde-destaque transition-all duration-300 ease-in-out"
                style={{ width: `${progressoAvaliacao?.percentual || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Exibição da música favorita e pior música */}
        <div className="flex flex-col justify-start gap-4 mt-4 md:mt-0 text-center md:text-left md:ml-auto md:min-w-[180px]">
          {/* Seletores para música favorita e pior música */}
          <div className="bg-gray-800 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-red-500 flex items-center gap-2 mb-2">
              <IoMdHeart className="inline" /> Música Favorita:
            </h4>
            <select
              className="w-full bg-gray-700 text-white py-2 px-3 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              value={faixaFavorita || ""}
              onChange={(e) =>
                marcarFaixaFavorita(
                  e.target.value === "" ? null : e.target.value
                )
              }
            >
              <option value="">Selecione a música favorita...</option>
              {faixas.items.map((faixa) => (
                <option key={`fav-${faixa.id}`} value={faixa.id}>
                  {faixa.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-gray-800 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-500 flex items-center gap-2 mb-2">
              <IoMdHeartDislike className="inline" /> Pior Música:
            </h4>
            <select
              className="w-full bg-gray-700 text-white py-2 px-3 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
              value={piorFaixa || ""}
              onChange={(e) =>
                marcarPiorFaixa(e.target.value === "" ? null : e.target.value)
              }
            >
              <option value="">Selecione a pior música...</option>
              {faixas.items.map((faixa) => (
                <option key={`worst-${faixa.id}`} value={faixa.id}>
                  {faixa.name}
                </option>
              ))}
            </select>
          </div>

          {/* Datas de avaliação */}
          <div className="bg-gray-800 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-blue-400 flex items-center gap-2 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 inline"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Histórico de Avaliação:
            </h4>

            <div className="text-xs text-gray-400 mb-2">
              <span className="font-medium">Primeira avaliação:</span>
              <div className="mt-1 text-gray-300">
                {datasAvaliacao.temRegistro
                  ? formatarData(datasAvaliacao.primeira)
                  : "Sem registro"}
              </div>
            </div>

            <div className="text-xs text-gray-400">
              <span className="font-medium">Última modificação:</span>
              <div className="mt-1 text-gray-300">
                {datasAvaliacao.temRegistro
                  ? formatarData(datasAvaliacao.ultima)
                  : "Sem registro"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de faixas */}
      <div className="bg-cinza-escuro rounded-xl p-3 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Faixas</h3>

        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 md:gap-x-4 gap-y-1 md:gap-y-2 text-sm md:text-base">
          <div className="font-bold text-gray-400">#</div>
          <div className="font-bold text-gray-400">Título</div>
          <div className="font-bold text-gray-400">Duração</div>
          <div className="font-bold text-gray-400">Avaliação</div>

          {faixas.items.map((faixa, index) => (
            <>
              <div className="text-gray-400">{index + 1}</div>
              <div className="truncate pr-2">{faixa.name}</div>
              <div className="text-gray-400">
                {formatarDuracao(faixa.duration_ms)}
              </div>
              <div>
                <Estrelas
                  avaliacao={avaliacoes[faixa.id] || 0}
                  onChange={(estrelas) => avaliarFaixa(faixa.id, estrelas)}
                  tamanho="pequeno"
                />
              </div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DetalhesAlbum;
