import { useState, useEffect, useCallback } from "react";
import {
  buscarFaixasPorAlbum,
  buscarDetalhesAlbum,
} from "../../../services/spotify";
import { getUsuarioAtual } from "../../../services/firebase";
import {
  calcularProgressoAvaliacao,
  obterDatasAvaliacao,
} from "../../../services/avaliacoes";

// Cache local para armazenar resultados de álbums já consultados
const cacheAlbuns = new Map();

export default function useDetalhesAlbum(albumId) {
  const [detalhesAlbum, setDetalhesAlbum] = useState(null);
  const [faixas, setFaixas] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState({});
  const [faixaFavorita, setFaixaFavorita] = useState(null);
  const [piorFaixa, setPiorFaixa] = useState(null);
  const [progressoAvaliacao, setProgressoAvaliacao] = useState({
    avaliadas: 0,
    total: 0,
    percentual: 0,
  });
  const [datasAvaliacao, setDatasAvaliacao] = useState({
    primeira: null,
    ultima: null,
    temRegistro: false,
  });

  // Memoizamos a função buscarDados para evitar recriações desnecessárias
  const buscarDados = useCallback(async () => {
    if (!albumId) return;

    // Verifica se já temos este álbum em cache na sessão atual
    if (cacheAlbuns.has(albumId)) {
      const dadosCache = cacheAlbuns.get(albumId);
      setDetalhesAlbum(dadosCache.detalhes);
      setFaixas(dadosCache.faixas);
      try {
        await carregarAvaliacoesUsuario(dadosCache.detalhes, dadosCache.faixas);
      } catch (e) {
        // Se der erro, ainda assim libera o carregamento
      }
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro(null);
      const usuarioFirebase = getUsuarioAtual();
      let detalhes = null;
      let dadosFaixas = null;
      let albumFirebase = null;

      // Inicia a importação do módulo Firebase em paralelo com outras operações
      const firebaseModulePromise = usuarioFirebase
        ? import("../../../services/firebase")
        : Promise.resolve(null);

      if (usuarioFirebase) {
        try {
          const firebaseModule = await firebaseModulePromise;
          const albunsFirebase = await firebaseModule.obterAlbunsAvaliados();
          albumFirebase = albunsFirebase.find((album) => album.id === albumId);

          if (albumFirebase && albumFirebase.detalhes && albumFirebase.faixas) {
            detalhes = albumFirebase.detalhes;
            dadosFaixas = albumFirebase.faixas;

            // VERIFICAÇÃO: Se a lista de faixas do Firebase está incompleta, busca da API
            let faixasCompletas = dadosFaixas;
            let precisaAtualizarFaixas = false;
            if (
              !Array.isArray(dadosFaixas.items) ||
              dadosFaixas.items.length === 0
            ) {
              // Caso antigo: faixas salvas como array simples
              precisaAtualizarFaixas = true;
            } else if (
              detalhes &&
              detalhes.total_tracks &&
              dadosFaixas.items.length < detalhes.total_tracks
            ) {
              precisaAtualizarFaixas = true;
            }
            if (precisaAtualizarFaixas) {
              // Buscar faixas completas da API
              faixasCompletas = await buscarFaixasPorAlbum(albumId);
              dadosFaixas = faixasCompletas;
            }

            setDetalhesAlbum(detalhes);
            setFaixas(dadosFaixas);
            // Armazena no cache local
            cacheAlbuns.set(albumId, {
              detalhes,
              faixas: dadosFaixas,
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          console.error("Erro ao buscar dados do Firebase:", error);
        }
      }

      // Se não encontrou os dados completos no Firebase, busca da API
      if (!detalhes || !dadosFaixas) {
        const [detalhesApi, dadosFaixasApi] = await Promise.all([
          buscarDetalhesAlbum(albumId),
          buscarFaixasPorAlbum(albumId),
        ]);

        detalhes = detalhesApi;
        dadosFaixas = dadosFaixasApi;

        setDetalhesAlbum(detalhes);
        setFaixas(dadosFaixas);

        // Armazena no cache local
        cacheAlbuns.set(albumId, {
          detalhes,
          faixas: dadosFaixas,
          timestamp: Date.now(),
        });
      }

      // Carrega avaliações do usuário
      await carregarAvaliacoesUsuario(
        detalhes,
        dadosFaixas,
        albumFirebase,
        usuarioFirebase
      );
    } catch (erro) {
      console.error("Erro ao buscar dados:", erro);
      setErro(
        "Não foi possível carregar os detalhes do álbum. Por favor, verifique sua conexão e tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }, [albumId]);

  // Função auxiliar para carregar avaliações do usuário
  const carregarAvaliacoesUsuario = async (
    detalhes,
    dadosFaixas,
    albumFirebase = null,
    usuarioFirebase = null
  ) => {
    if (!usuarioFirebase) {
      usuarioFirebase = getUsuarioAtual();
    }

    // Carrega as avaliações e preferências do usuário (do Firebase ou localStorage)
    if (usuarioFirebase) {
      // Já temos o albumFirebase da consulta anterior
      if (albumFirebase) {
        // Usar avaliações do Firebase
        setAvaliacoes(albumFirebase.avaliacoes || {});

        // Carregar preferências
        if (albumFirebase.preferencias) {
          if (albumFirebase.preferencias.faixaFavorita !== undefined) {
            setFaixaFavorita(albumFirebase.preferencias.faixaFavorita);
          }
          if (albumFirebase.preferencias.piorFaixa !== undefined) {
            setPiorFaixa(albumFirebase.preferencias.piorFaixa);
          }
        }

        // Carregar datas de avaliação do Firebase
        if (
          albumFirebase.data_primeira_avaliacao ||
          albumFirebase.data_avaliacao
        ) {
          try {
            const datasDoFirebase = {
              primeira: albumFirebase.data_primeira_avaliacao
                ? new Date(albumFirebase.data_primeira_avaliacao.seconds * 1000)
                : new Date(albumFirebase.data_avaliacao.seconds * 1000),
              ultima: new Date(albumFirebase.data_avaliacao.seconds * 1000),
              temRegistro: true,
            };
            setDatasAvaliacao(datasDoFirebase);
          } catch (error) {
            // Erro ao converter datas
          }
        }

        // Calcular progresso
        setProgressoAvaliacao(
          calcularProgressoAvaliacao(
            dadosFaixas,
            albumFirebase.avaliacoes || {}
          )
        );
      } else {
        // Precisamos buscar as avaliações do Firebase novamente
        try {
          const firebaseModule = await import("../../../services/firebase");
          const albunsFirebase = await firebaseModule.obterAlbunsAvaliados();
          const albumAtual = albunsFirebase.find(
            (album) => album.id === albumId
          );

          if (albumAtual) {
            setAvaliacoes(albumAtual.avaliacoes || {});

            if (albumAtual.preferencias) {
              if (albumAtual.preferencias.faixaFavorita !== undefined) {
                setFaixaFavorita(albumAtual.preferencias.faixaFavorita);
              }
              if (albumAtual.preferencias.piorFaixa !== undefined) {
                setPiorFaixa(albumAtual.preferencias.piorFaixa);
              }
            }

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
                // Erro ao converter datas
              }
            }

            setProgressoAvaliacao(
              calcularProgressoAvaliacao(
                dadosFaixas,
                albumAtual.avaliacoes || {}
              )
            );
          } else {
            // Inicializar com valores vazios
            setProgressoAvaliacao({
              avaliadas: 0,
              total: dadosFaixas?.items?.length || 0,
              percentual: 0,
            });
          }
        } catch (error) {
          console.error("Erro ao buscar avaliações do Firebase:", error);
          setProgressoAvaliacao({
            avaliadas: 0,
            total: dadosFaixas?.items?.length || 0,
            percentual: 0,
          });
        }
      }
    } else {
      // Para usuários não logados, carregar do localStorage
      try {
        // Carregar avaliações
        const avaliacoesSalvas = JSON.parse(
          localStorage.getItem("avaliacoesFaixas") || "{}"
        );
        setAvaliacoes(avaliacoesSalvas);

        // Carregar preferências de faixas favoritas/piores
        const prefsFaixas = JSON.parse(
          localStorage.getItem(`preferencias_${albumId}`) || "{}"
        );

        if (prefsFaixas.favorita !== undefined) {
          setFaixaFavorita(prefsFaixas.favorita);
        } else if (prefsFaixas.faixaFavorita !== undefined) {
          setFaixaFavorita(prefsFaixas.faixaFavorita);
        }

        if (prefsFaixas.pior !== undefined) {
          setPiorFaixa(prefsFaixas.pior);
        } else if (prefsFaixas.piorFaixa !== undefined) {
          setPiorFaixa(prefsFaixas.piorFaixa);
        }

        // Carregar datas de avaliação
        const datas = obterDatasAvaliacao(albumId);
        setDatasAvaliacao(datas);

        // Calcular progresso
        setProgressoAvaliacao(
          calcularProgressoAvaliacao(dadosFaixas, avaliacoesSalvas)
        );
      } catch (error) {
        console.error("Erro ao carregar dados do localStorage:", error);
      }
    }
  };

  useEffect(() => {
    // Limpa cache antigo (mais de 1 hora)
    const agora = Date.now();
    cacheAlbuns.forEach((valor, chave) => {
      if (agora - valor.timestamp > 3600000) {
        // 1 hora em milissegundos
        cacheAlbuns.delete(chave);
      }
    });

    buscarDados();
  }, [buscarDados]);

  const tentarNovamente = useCallback(() => {
    setErro(null);
    setCarregando(true);
    buscarDados();
  }, [buscarDados]);

  return {
    detalhesAlbum,
    faixas,
    carregando,
    erro,
    tentarNovamente,
    avaliacoes,
    faixaFavorita,
    piorFaixa,
    progressoAvaliacao,
    datasAvaliacao,
    setAvaliacoes,
    setFaixaFavorita,
    setPiorFaixa,
    setProgressoAvaliacao,
    setDatasAvaliacao,
  };
}
