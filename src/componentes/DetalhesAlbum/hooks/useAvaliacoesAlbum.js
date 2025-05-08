import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "../../../services/firebase";
import {
  getUsuarioAtual,
  salvarAvaliacaoAlbum,
} from "../../../services/firebase";
import {
  registrarDataAvaliacao,
  obterDatasAvaliacao,
  getAvaliacoesFaixas,
  setAvaliacoesFaixas,
  getMapaFaixasAlbuns,
  setMapaFaixasAlbuns,
  calcularProgressoAvaliacao,
  recarregarAvaliacoes,
} from "../../../services/avaliacoes";
import { notificarAvaliacoesAlteradas } from "../../../services/sync";
import { calcularMediaAvaliacoes as calcularMediaTodasFaixas } from "../utils";

export default function useAvaliacoesAlbum(
  albumId,
  detalhesAlbum,
  faixas,
  avaliacoes,
  setAvaliacoes,
  faixaFavorita,
  setFaixaFavorita,
  piorFaixa,
  setPiorFaixa,
  setProgressoAvaliacao,
  setDatasAvaliacao,
  review
) {
  const navigate = useNavigate();
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(null);

  // Função auxiliar para salvar tudo no banco
  const salvarEstadoAlbumNoBanco = async (
    preferenciasExtras = {},
    avaliacoesAtualizadas = null
  ) => {
    if (!detalhesAlbum || !faixas) return;
    const usuarioFirebase = getUsuarioAtual();
    if (!usuarioFirebase) return;

    // Use avaliacoesAtualizadas se fornecidas (estado mais recente), senão use avaliacoes do estado
    const avaliacoesParaUsar = avaliacoesAtualizadas || avaliacoes;

    // Checagem para garantir que faixas estão completas
    let faixasParaSalvar = faixas;
    if (
      detalhesAlbum.total_tracks &&
      (!faixas.items || faixas.items.length < detalhesAlbum.total_tracks)
    ) {
      const { buscarFaixasPorAlbum } = await import(
        "../../../services/spotify"
      );
      faixasParaSalvar = await buscarFaixasPorAlbum(albumId);
    }

    // Calcular progresso e média atuais
    const progressoAtual = calcularProgressoAvaliacao(
      faixasParaSalvar,
      avaliacoesParaUsar
    );
    const mediaAtual = calcularMediaTodasFaixas(
      faixasParaSalvar,
      avaliacoesParaUsar
    );

    // Preferências finais
    const preferencias = {
      faixaFavorita,
      piorFaixa,
      ...preferenciasExtras,
    };

    // Flags de atualização
    const isAtualizado = progressoAtual.percentual === 100;
    const isPrimeiraAvaliacaoConcluida = progressoAtual.percentual === 100; // Não temos histórico aqui, mas não afeta o fluxo

    await salvarAvaliacaoAlbum(
      albumId,
      avaliacoesParaUsar,
      detalhesAlbum.name,
      detalhesAlbum.artists[0].name,
      detalhesAlbum.images[0]?.url || "",
      preferencias,
      faixasParaSalvar,
      isAtualizado,
      isPrimeiraAvaliacaoConcluida,
      mediaAtual
    );
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

    // Atualizar o estado local imediatamente
    setAvaliacoes(novasAvaliacoes);

    // Calcular progresso correto após as mudanças (usando as novas avaliações)
    const novoProgresso = calcularProgressoAvaliacao(faixas, novasAvaliacoes);

    // Garantir que estamos criando um novo objeto para forçar reatividade
    setProgressoAvaliacao({ ...novoProgresso });

    if (usuarioFirebase) {
      try {
        if (detalhesAlbum) {
          // Passar as avaliações atualizadas para garantir que o banco receba a versão mais recente
          await salvarEstadoAlbumNoBanco({}, novasAvaliacoes);
        }
      } catch (error) {
        // Erro ao salvar avaliação
      }
    } else {
      // Para usuário não logado ou modo demo, atualizar o localStorage global
      // Verificar se estamos em modo de demonstração
      const demoToken = localStorage.getItem("demo_token");
      const demoExpiry = localStorage.getItem("demo_token_expiry");
      const modoDemo =
        demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

      if (modoDemo) {
        // Em modo demo, atualizar as estruturas globais
        // Obter avaliações e mapeamento atuais
        const avaliacoesExistentes = JSON.parse(
          localStorage.getItem("avaliacoesFaixas") || "{}"
        );
        const mapaFaixasAlbuns = JSON.parse(
          localStorage.getItem("mapaFaixasAlbuns") || "{}"
        );

        // Atualizar avaliações
        const novasAvaliacoesStorage = { ...avaliacoesExistentes };

        // Atualizar ou remover a avaliação
        if (nota > 0) {
          novasAvaliacoesStorage[faixaId] = nota;
        } else {
          delete novasAvaliacoesStorage[faixaId];
        }

        // IMPORTANTE: Garantir que TODAS as faixas do álbum estejam mapeadas
        const novoMapaFaixas = { ...mapaFaixasAlbuns };

        // Mapear todas as faixas para este álbum
        faixas.items.forEach((faixa) => {
          novoMapaFaixas[faixa.id] = albumId;
        });

        // Salvar no localStorage
        localStorage.setItem(
          "avaliacoesFaixas",
          JSON.stringify(novasAvaliacoesStorage)
        );
        localStorage.setItem(
          "mapaFaixasAlbuns",
          JSON.stringify(novoMapaFaixas)
        );

        // Sinalizar que o modo de demonstração está ativo
        localStorage.setItem("modo_demo_ativo", "true");

        // Também manter o formato antigo para compatibilidade
        localStorage.setItem(
          `avaliacoes_${albumId}`,
          JSON.stringify(novasAvaliacoes)
        );
      } else {
        // Para usuário não logado (sem modo demo), usar formato antigo
        localStorage.setItem(
          `avaliacoes_${albumId}`,
          JSON.stringify(novasAvaliacoes)
        );
      }

      // Notificar que as avaliações foram alteradas
      notificarAvaliacoesAlteradas();
    }

    // Registrar data da avaliação (passando o ID da faixa e a avaliação)
    if (nota > 0) {
      registrarDataAvaliacao(faixaId, nota);

      // Forçar a atualização do localStorage
      const datasAvaliacoes = JSON.parse(
        localStorage.getItem("datasAvaliacoes") || "{}"
      );

      if (datasAvaliacoes[albumId]) {
        // Atualizar apenas a data da última avaliação
        datasAvaliacoes[albumId].ultima = new Date().toISOString();
        localStorage.setItem(
          "datasAvaliacoes",
          JSON.stringify(datasAvaliacoes)
        );
      }

      // Atualizar o estado com os dados mais recentes
      setTimeout(() => {
        setDatasAvaliacao(obterDatasAvaliacao(albumId));
      }, 100);
    }
  };

  // Função para marcar uma faixa como favorita
  const marcarFaixaFavorita = async (faixaId) => {
    if (!faixas || !faixas.items) return;

    // Verificar se o usuário está logado no Firebase
    const usuarioFirebase = getUsuarioAtual();

    // Se já for favorita, remove a marcação
    const novaFaixaFavorita = faixaFavorita === faixaId ? null : faixaId;
    setFaixaFavorita(novaFaixaFavorita);

    // Atualizar progresso (não muda avaliações, mas pode ser útil para garantir reatividade)
    const novoProgresso = calcularProgressoAvaliacao(faixas, avaliacoes);
    setProgressoAvaliacao({ ...novoProgresso });

    // Encontrar o nome da faixa favorita (se houver)
    let nomeFaixaFavorita = null;
    if (novaFaixaFavorita) {
      const faixaEncontrada = faixas.items.find(
        (faixa) => faixa.id === novaFaixaFavorita
      );
      if (faixaEncontrada) {
        nomeFaixaFavorita = faixaEncontrada.name;
      }
    }

    if (usuarioFirebase) {
      try {
        if (detalhesAlbum) {
          await salvarEstadoAlbumNoBanco({
            faixaFavorita: novaFaixaFavorita,
            faixaFavoritaNome: nomeFaixaFavorita,
          });
        }
      } catch (error) {
        // Erro ao salvar faixa favorita
      }
    } else {
      // Verificar se estamos em modo de demonstração
      const demoToken = localStorage.getItem("demo_token");
      const demoExpiry = localStorage.getItem("demo_token_expiry");
      const modoDemo =
        demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

      if (modoDemo) {
        // Em modo demo, também atualizar a estrutura global de preferências
        const preferenciasGlobais = JSON.parse(
          localStorage.getItem("preferenciasAlbuns") || "{}"
        );

        preferenciasGlobais[albumId] = preferenciasGlobais[albumId] || {};
        preferenciasGlobais[albumId].faixaFavorita = novaFaixaFavorita;
        preferenciasGlobais[albumId].faixaFavoritaNome = nomeFaixaFavorita;

        // Preservar pior faixa se existir
        if (piorFaixa) {
          preferenciasGlobais[albumId].piorFaixa = piorFaixa;
          const piorFaixaObj = faixas.items.find(
            (faixa) => faixa.id === piorFaixa
          );
          if (piorFaixaObj) {
            preferenciasGlobais[albumId].piorFaixaNome = piorFaixaObj.name;
          }
        }

        // Salvar no localStorage global
        localStorage.setItem(
          "preferenciasAlbuns",
          JSON.stringify(preferenciasGlobais)
        );
      }

      // Para usuário não logado ou modo demo, salvar no formato antigo
      localStorage.setItem(
        `preferencias_${albumId}`,
        JSON.stringify({
          favorita: novaFaixaFavorita,
          pior: piorFaixa,
          // Sempre preservar a review existente, mesmo se for string vazia
          review: typeof review === "string" ? review : "",
          data_review: review ? new Date().toISOString() : null,
        })
      );

      // Notificar que as avaliações foram alteradas para acionar a sincronização
      notificarAvaliacoesAlteradas();
    }

    // Forçar a atualização do localStorage
    const datasAvaliacoes = JSON.parse(
      localStorage.getItem("datasAvaliacoes") || "{}"
    );

    if (datasAvaliacoes[albumId]) {
      // Atualizar apenas a data da última avaliação
      datasAvaliacoes[albumId].ultima = new Date().toISOString();
      localStorage.setItem("datasAvaliacoes", JSON.stringify(datasAvaliacoes));
    } else if (novaFaixaFavorita) {
      // Se não tiver registro ainda e estiver marcando favorito, criar novo registro
      const agora = new Date().toISOString();
      datasAvaliacoes[albumId] = {
        primeira: agora,
        ultima: agora,
      };
      localStorage.setItem("datasAvaliacoes", JSON.stringify(datasAvaliacoes));
    }

    // Atualizar o estado com os dados mais recentes
    setTimeout(() => {
      setDatasAvaliacao(obterDatasAvaliacao(albumId));
    }, 100);
  };

  // Função para marcar uma faixa como a pior
  const marcarPiorFaixa = async (faixaId) => {
    if (!faixas || !faixas.items) return;

    // Verificar se o usuário está logado no Firebase
    const usuarioFirebase = getUsuarioAtual();

    // Se já for a pior, remove a marcação
    const novaPiorFaixa = piorFaixa === faixaId ? null : faixaId;
    setPiorFaixa(novaPiorFaixa);

    // Atualizar progresso (não muda avaliações, mas pode ser útil para garantir reatividade)
    const novoProgresso = calcularProgressoAvaliacao(faixas, avaliacoes);
    setProgressoAvaliacao({ ...novoProgresso });

    // Encontrar o nome da pior faixa (se houver)
    let nomePiorFaixa = null;
    if (novaPiorFaixa) {
      const faixaEncontrada = faixas.items.find(
        (faixa) => faixa.id === novaPiorFaixa
      );
      if (faixaEncontrada) {
        nomePiorFaixa = faixaEncontrada.name;
      }
    }

    if (usuarioFirebase) {
      try {
        if (detalhesAlbum) {
          await salvarEstadoAlbumNoBanco({
            piorFaixa: novaPiorFaixa,
            piorFaixaNome: nomePiorFaixa,
          });
        }
      } catch (error) {
        // Erro ao salvar pior faixa
      }
    } else {
      // Verificar se estamos em modo de demonstração
      const demoToken = localStorage.getItem("demo_token");
      const demoExpiry = localStorage.getItem("demo_token_expiry");
      const modoDemo =
        demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

      if (modoDemo) {
        // Em modo demo, também atualizar a estrutura global de preferências
        const preferenciasGlobais = JSON.parse(
          localStorage.getItem("preferenciasAlbuns") || "{}"
        );

        preferenciasGlobais[albumId] = preferenciasGlobais[albumId] || {};
        preferenciasGlobais[albumId].piorFaixa = novaPiorFaixa;
        preferenciasGlobais[albumId].piorFaixaNome = nomePiorFaixa;

        // Preservar faixa favorita se existir
        if (faixaFavorita) {
          preferenciasGlobais[albumId].faixaFavorita = faixaFavorita;
          const faixaFavoritaObj = faixas.items.find(
            (faixa) => faixa.id === faixaFavorita
          );
          if (faixaFavoritaObj) {
            preferenciasGlobais[albumId].faixaFavoritaNome =
              faixaFavoritaObj.name;
          }
        }

        // Salvar no localStorage global
        localStorage.setItem(
          "preferenciasAlbuns",
          JSON.stringify(preferenciasGlobais)
        );
      }

      // Para usuário não logado ou modo demo, salvar no formato antigo
      localStorage.setItem(
        `preferencias_${albumId}`,
        JSON.stringify({
          favorita: faixaFavorita,
          pior: novaPiorFaixa,
          // Sempre preservar a review existente, mesmo se for string vazia
          review: typeof review === "string" ? review : "",
          data_review: review ? new Date().toISOString() : null,
        })
      );

      // Notificar que as avaliações foram alteradas para acionar a sincronização
      notificarAvaliacoesAlteradas();
    }

    // Forçar a atualização do localStorage
    const datasAvaliacoes = JSON.parse(
      localStorage.getItem("datasAvaliacoes") || "{}"
    );

    if (datasAvaliacoes[albumId]) {
      // Atualizar apenas a data da última avaliação
      datasAvaliacoes[albumId].ultima = new Date().toISOString();
      localStorage.setItem("datasAvaliacoes", JSON.stringify(datasAvaliacoes));
    } else if (novaPiorFaixa) {
      // Se não tiver registro ainda e estiver marcando pior faixa, criar novo registro
      const agora = new Date().toISOString();
      datasAvaliacoes[albumId] = {
        primeira: agora,
        ultima: agora,
      };
      localStorage.setItem("datasAvaliacoes", JSON.stringify(datasAvaliacoes));
    }

    // Atualizar o estado com os dados mais recentes
    setTimeout(() => {
      setDatasAvaliacao(obterDatasAvaliacao(albumId));
    }, 100);
  };

  // Função para resetar avaliações do álbum
  const resetarAvaliacoesAlbum = async () => {
    try {
      // Se estiver mostrando modal de confirmação, é hora de executar
      if (mostrarConfirmacao === "resetar") {
        setMostrarConfirmacao(null);

        // Resetar avaliações locais primeiro (para feedback imediato)
        const novasAvaliacoes = {};
        setAvaliacoes(novasAvaliacoes);

        // Limpar faixa favorita e pior faixa
        setFaixaFavorita(null);
        setPiorFaixa(null);

        // Atualizar progresso
        setProgressoAvaliacao({
          avaliadas: 0,
          total: faixas?.items?.length || 0,
          percentual: 0,
        });

        // Se o usuário estiver logado no Firebase, sincronizar com o servidor
        if (getUsuarioAtual()) {
          try {
            // Usar a função central com media 0 e preferências resetadas
            await salvarEstadoAlbumNoBanco({
              faixaFavorita: null,
              piorFaixa: null,
              review: typeof review === "string" ? review : "",
              data_review: review ? new Date() : null,
            });
          } catch (erroFirebase) {
            // Erro ao resetar avaliações no Firebase
          }
        } else {
          // Usuário em modo anônimo/demo, salvar no localStorage
          setAvaliacoesFaixas(novasAvaliacoes);

          // Resetar preferências de faixas
          try {
            localStorage.setItem(
              `preferencias_${albumId}`,
              JSON.stringify({
                favorita: null,
                pior: null,
                // Sempre preservar a review existente, mesmo se for string vazia
                review: typeof review === "string" ? review : "",
                data_review: review ? new Date().toISOString() : null,
              })
            );
          } catch (e) {
            // Ignorar erro ao salvar preferências
          }

          // Registrar a data da última avaliação
          registrarDataAvaliacao(albumId, "ultima");
        }

        // Atualizar datas de avaliação para UI
        const datasAtualizadas = obterDatasAvaliacao(albumId);
        setDatasAvaliacao(datasAtualizadas);

        // Notificar outros componentes sobre a alteração nas avaliações
        notificarAvaliacoesAlteradas();
      } else {
        // Se ainda não estiver mostrando confirmação, exibir modal
        setMostrarConfirmacao("resetar");
      }
    } catch (erro) {
      // Erro ao resetar avaliações
    }
  };

  // Função para remover o álbum das minhas avaliações
  const removerAlbum = async () => {
    try {
      // Se estiver mostrando modal de confirmação, é hora de executar
      if (mostrarConfirmacao === "remover") {
        setMostrarConfirmacao(null);

        // Se o usuário estiver logado no Firebase, remover do servidor
        const usuario = getUsuarioAtual();
        if (usuario) {
          try {
            const userRef = doc(db, "usuarios", usuario.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
              // Procurar o álbum pelo ID
              const albumsAvaliados = userDoc.data().albuns_avaliados || [];
              const albumParaRemover = albumsAvaliados.find(
                (album) => album.id === albumId
              );

              if (albumParaRemover) {
                // Remover usando arrayRemove
                await updateDoc(userRef, {
                  albuns_avaliados: arrayRemove(albumParaRemover),
                });
              }
            }
          } catch (erroFirebase) {
            // Erro ao remover álbum do Firebase
          }
        } else {
          // Usuário em modo anônimo/demo
          // Remover do localStorage

          // 1. Remover preferências do álbum
          localStorage.removeItem(`preferencias_${albumId}`);

          // 2. Remover faixas do álbum do objeto de avaliações
          const avaliacoesExistentes = getAvaliacoesFaixas();

          if (faixas && faixas.items) {
            const novasAvaliacoes = { ...avaliacoesExistentes };

            // Remover cada faixa do álbum
            faixas.items.forEach((faixa) => {
              delete novasAvaliacoes[faixa.id];
            });

            // Salvar no localStorage
            setAvaliacoesFaixas(novasAvaliacoes);
          }

          // 3. Remover do mapa de faixas-álbuns
          const mapaExistente = getMapaFaixasAlbuns();
          const novoMapa = { ...mapaExistente };

          // Remover a associação de cada faixa com este álbum
          if (faixas && faixas.items) {
            faixas.items.forEach((faixa) => {
              delete novoMapa[faixa.id];
            });
          }

          // Salvar mapa atualizado
          setMapaFaixasAlbuns(novoMapa);
        }

        // Voltar para a tela anterior após remover
        recarregarAvaliacoes();
        notificarAvaliacoesAlteradas();

        // Navegar de volta
        setTimeout(() => {
          navigate(-1);
        }, 100);
      } else {
        // Se ainda não estiver mostrando confirmação, exibir modal
        setMostrarConfirmacao("remover");
      }
    } catch (erro) {
      // Erro ao remover álbum
    }
  };

  // Função para cancelar a ação de confirmação
  const cancelarAcao = () => {
    setMostrarConfirmacao(null);
  };

  // Verificar se existe review
  const temReviewExistente = Boolean(review);

  return {
    avaliarFaixa,
    marcarFaixaFavorita,
    marcarPiorFaixa,
    resetarAvaliacoesAlbum,
    removerAlbum,
    cancelarAcao,
    mostrarConfirmacao,
    setMostrarConfirmacao,
    temReviewExistente,
  };
}
