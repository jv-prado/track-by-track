import { useState, useEffect } from "react";
import {
  buscarFaixasPorAlbum,
  buscarDetalhesAlbum,
} from "../../../services/spotify";
import { getUsuarioAtual } from "../../../services/firebase";
import {
  calcularProgressoAvaliacao,
  obterDatasAvaliacao,
} from "../../../services/avaliacoes";

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

  const buscarDados = async () => {
    if (!albumId) return;
    try {
      setCarregando(true);
      setErro(null);
      const usuarioFirebase = getUsuarioAtual();
      let detalhes = null;
      let dadosFaixas = null;
      let buscouDoFirebase = false;

      if (usuarioFirebase) {
        try {
          const firebaseModule = await import("../../../services/firebase");
          const albunsFirebase = await firebaseModule.obterAlbunsAvaliados();
          const albumAtual = albunsFirebase.find(
            (album) => album.id === albumId
          );
          if (albumAtual && albumAtual.detalhes && albumAtual.faixas) {
            detalhes = albumAtual.detalhes;
            dadosFaixas = albumAtual.faixas;
            buscouDoFirebase = true;
            setDetalhesAlbum(detalhes);
            setFaixas(dadosFaixas);

            // Carregar avaliações do Firebase
            setAvaliacoes(albumAtual.avaliacoes || {});

            // Carregar preferências de faixa favorita e pior faixa
            if (albumAtual.preferencias) {
              if (albumAtual.preferencias.faixaFavorita !== undefined) {
                setFaixaFavorita(albumAtual.preferencias.faixaFavorita);
              }
              if (albumAtual.preferencias.piorFaixa !== undefined) {
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
                // Erro ao converter datas
              }
            }

            // Calcular progresso
            setProgressoAvaliacao(
              calcularProgressoAvaliacao(
                dadosFaixas,
                albumAtual.avaliacoes || {}
              )
            );
          }
        } catch (error) {
          console.error("Erro ao buscar dados do Firebase:", error);
        }
      }

      if (!buscouDoFirebase) {
        [detalhes, dadosFaixas] = await Promise.all([
          buscarDetalhesAlbum(albumId),
          buscarFaixasPorAlbum(albumId),
        ]);
        setDetalhesAlbum(detalhes);
        setFaixas(dadosFaixas);

        if (usuarioFirebase) {
          // Para usuários Firebase, carregar dados do Firebase
          try {
            const firebaseModule = await import("../../../services/firebase");
            const albunsFirebase = await firebaseModule.obterAlbunsAvaliados();
            const albumAtual = albunsFirebase.find(
              (album) => album.id === albumId
            );

            if (albumAtual) {
              // Usar avaliações do Firebase
              setAvaliacoes(albumAtual.avaliacoes || {});

              // Carregar preferências
              if (albumAtual.preferencias) {
                if (albumAtual.preferencias.faixaFavorita !== undefined) {
                  setFaixaFavorita(albumAtual.preferencias.faixaFavorita);
                }
                if (albumAtual.preferencias.piorFaixa !== undefined) {
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
                  // Erro ao converter datas
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
              // Inicializar com valores vazios
              setProgressoAvaliacao({
                avaliadas: 0,
                total: dadosFaixas?.items?.length || 0,
                percentual: 0,
              });
            }
          } catch (error) {
            console.error("Erro ao carregar avaliações do Firebase:", error);
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
      }
    } catch (erro) {
      console.error("Erro ao buscar dados:", erro);
      setErro(
        "Não foi possível carregar os detalhes do álbum. Por favor, verifique sua conexão e tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarDados();
    // eslint-disable-next-line
  }, [albumId]);

  const tentarNovamente = () => {
    setErro(null);
    setCarregando(true);
    buscarDados();
  };

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
