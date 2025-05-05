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

  // Função para avaliar uma faixa
  const avaliarFaixa = async (faixaId, nota) => {
    if (!faixas) return;

    // Verificar se o usuário está logado no Firebase
    const usuarioFirebase = getUsuarioAtual();

    // Calcular o progresso atual para verificar se já estava 100% antes da alteração
    const progressoAtual = calcularProgressoAvaliacao(faixas, avaliacoes);
    const estaCompleto = progressoAtual.percentual === 100;

    // Guardar a média anterior para comparar depois (antes de qualquer alteração)
    // const mediaAnterior = calcularMediaAvaliacoes(faixas, avaliacoes); // removido

    // Atualiza as avaliações localmente
    let novasAvaliacoes = { ...avaliacoes };

    // Se a nota for a mesma já dada, remove a avaliação (toggle)
    if (novasAvaliacoes[faixaId] === nota) {
      delete novasAvaliacoes[faixaId];
    } else {
      novasAvaliacoes[faixaId] = nota;
    }

    setAvaliacoes(novasAvaliacoes);

    // Calcular progresso correto após as mudanças
    const novoProgresso = calcularProgressoAvaliacao(faixas, novasAvaliacoes);
    setProgressoAvaliacao(novoProgresso);

    // Calcular nova média após a avaliação (apenas para exibição)
    // const novaMedia = calcularMediaAvaliacoes(faixas, novasAvaliacoes); // removido

    // Log para debug
    // console.log(
    //   `Média anterior: ${mediaAnterior}, Nova média: ${novaMedia}, Progresso atual: ${progressoAtual.percentual}%, Novo progresso: ${novoProgresso.percentual}%`
    // );

    if (usuarioFirebase) {
      // Para usuário logado, salvar diretamente no Firebase
      try {
        if (detalhesAlbum) {
          // LÓGICA CORRIGIDA:
          // Se o álbum já estava completo (100%), qualquer alteração é uma atualização
          // Mesmo que a média não mude, se já está 100% e mudamos alguma nota, é uma atualização
          const isAtualizado = estaCompleto;

          // É primeira avaliação completa se:
          // Agora está 100% completo MAS não estava antes
          const isPrimeiraAvaliacaoConcluida =
            novoProgresso.percentual === 100 && !estaCompleto;

          // Calcular média para salvar (considerando todas as faixas)
          const mediaParaSalvar = calcularMediaTodasFaixas(
            faixas,
            novasAvaliacoes
          );

          await salvarAvaliacaoAlbum(
            albumId,
            novasAvaliacoes,
            detalhesAlbum.name,
            detalhesAlbum.artists[0].name,
            detalhesAlbum.images[0]?.url || "",
            {
              faixaFavorita,
              piorFaixa,
            },
            faixas, // Passar as faixas para salvar os nomes
            isAtualizado, // Indicar se é uma atualização
            isPrimeiraAvaliacaoConcluida, // Indicar se é a primeira avaliação completa
            mediaParaSalvar // <-- Passar a média correta
          );
        }
      } catch (error) {
        console.error("Erro ao salvar avaliação:", error);
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

    // Salvar nas preferências do álbum
    const preferencias = {
      faixaFavorita: novaFaixaFavorita,
      faixaFavoritaNome: nomeFaixaFavorita,
      piorFaixa: piorFaixa,
      // Preservar nome da pior faixa se existir
      piorFaixaNome: piorFaixa
        ? faixas.items.find((faixa) => faixa.id === piorFaixa)?.name
        : null,
    };

    if (usuarioFirebase) {
      // Para usuário logado, salvar diretamente no Firebase
      try {
        if (detalhesAlbum) {
          // Checagem defensiva para evitar undefined
          const nomeArtista =
            Array.isArray(detalhesAlbum.artists) &&
            detalhesAlbum.artists.length > 0 &&
            detalhesAlbum.artists[0]?.name
              ? detalhesAlbum.artists[0].name
              : "Artista desconhecido";
          const urlImagem =
            Array.isArray(detalhesAlbum.images) &&
            detalhesAlbum.images.length > 0 &&
            detalhesAlbum.images[0]?.url
              ? detalhesAlbum.images[0].url
              : "";
          await salvarAvaliacaoAlbum(
            albumId,
            avaliacoes,
            detalhesAlbum.name,
            nomeArtista,
            urlImagem,
            preferencias,
            faixas // Passar as faixas para salvar os nomes
          );
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
        JSON.stringify(preferencias)
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

    // Salvar nas preferências do álbum
    const preferencias = {
      faixaFavorita: faixaFavorita,
      // Preservar nome da faixa favorita se existir
      faixaFavoritaNome: faixaFavorita
        ? faixas.items.find((faixa) => faixa.id === faixaFavorita)?.name
        : null,
      piorFaixa: novaPiorFaixa,
      piorFaixaNome: nomePiorFaixa,
    };

    if (usuarioFirebase) {
      // Para usuário logado, salvar diretamente no Firebase
      try {
        if (detalhesAlbum) {
          // Checagem defensiva para evitar undefined
          const nomeArtista =
            Array.isArray(detalhesAlbum.artists) &&
            detalhesAlbum.artists.length > 0 &&
            detalhesAlbum.artists[0]?.name
              ? detalhesAlbum.artists[0].name
              : "Artista desconhecido";
          const urlImagem =
            Array.isArray(detalhesAlbum.images) &&
            detalhesAlbum.images.length > 0 &&
            detalhesAlbum.images[0]?.url
              ? detalhesAlbum.images[0].url
              : "";
          await salvarAvaliacaoAlbum(
            albumId,
            avaliacoes,
            detalhesAlbum.name,
            nomeArtista,
            urlImagem,
            preferencias,
            faixas // Passar as faixas para salvar os nomes
          );
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
        JSON.stringify(preferencias)
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
          // Preparar para salvar no Firebase
          const preferencias = {
            faixaFavorita: null,
            piorFaixa: null,
            // Sempre preservar a review existente, mesmo se for string vazia
            review: typeof review === "string" ? review : "",
            data_review: review ? new Date() : null,
          };

          try {
            // Checagem defensiva para garantir valores válidos
            const nomeAlbum = detalhesAlbum?.name || "Álbum sem nome";
            const nomeArtista =
              Array.isArray(detalhesAlbum?.artists) &&
              detalhesAlbum.artists.length > 0 &&
              detalhesAlbum.artists[0]?.name
                ? detalhesAlbum.artists[0].name
                : "Artista desconhecido";
            const urlImagem =
              Array.isArray(detalhesAlbum?.images) &&
              detalhesAlbum.images.length > 0 &&
              detalhesAlbum.images[0]?.url
                ? detalhesAlbum.images[0].url
                : "";

            await salvarAvaliacaoAlbum(
              albumId,
              novasAvaliacoes,
              nomeAlbum,
              nomeArtista,
              urlImagem,
              preferencias,
              faixas,
              true // indicar que é uma atualização
            );
          } catch (erroFirebase) {
            console.error(
              "Erro ao resetar avaliações no Firebase:",
              erroFirebase
            );
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
      console.error("Erro ao resetar avaliações:", erro);
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
            console.error("Erro ao remover álbum do Firebase:", erroFirebase);
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
      console.error("Erro ao remover álbum:", erro);
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
