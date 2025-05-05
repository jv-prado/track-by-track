import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, getUsuarioAtual } from "../../../services/firebase";

export default function useReviewAlbum(albumId, detalhesAlbum) {
  const [review, setReview] = useState("");
  const [salvandoReview, setSalvandoReview] = useState(false);
  const [mostrarModalReview, setMostrarModalReview] = useState(false);

  // Carregar review existente ao inicializar
  useEffect(() => {
    const carregarReview = async () => {
      try {
        const usuario = getUsuarioAtual();
        if (!usuario) return;

        const userRef = doc(db, "usuarios", usuario.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) return;

        const albumsAvaliados = userDoc.data().albuns_avaliados || [];
        const albumExistente = albumsAvaliados.find(
          (album) => album.id === albumId
        );

        if (albumExistente && albumExistente.review) {
          setReview(albumExistente.review);
        }
      } catch (error) {
        console.error("Erro ao carregar review:", error);
      }
    };

    if (albumId) {
      carregarReview();
    }
  }, [albumId]);

  // Função para salvar a review
  const salvarReview = async () => {
    try {
      setSalvandoReview(true);

      const usuario = getUsuarioAtual();
      if (!usuario) {
        throw new Error("Usuário não autenticado");
      }

      const userRef = doc(db, "usuarios", usuario.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error("Documento do usuário não encontrado");
      }

      // Verificar se o álbum já existe na lista do usuário
      const albumsAvaliados = userDoc.data().albuns_avaliados || [];
      const indexAlbumExistente = albumsAvaliados.findIndex(
        (album) => album.id === albumId
      );

      if (indexAlbumExistente >= 0) {
        // Álbum já existe, atualizar a review
        const novosAlbunsAvaliados = [...albumsAvaliados];
        novosAlbunsAvaliados[indexAlbumExistente] = {
          ...novosAlbunsAvaliados[indexAlbumExistente],
          review: review.trim(),
          data_review: new Date(),
        };

        await updateDoc(userRef, {
          albuns_avaliados: novosAlbunsAvaliados,
        });
      } else if (detalhesAlbum) {
        // Se o álbum não existir ainda, criar um objeto básico com a review
        const dadosAlbum = {
          id: albumId,
          nome: detalhesAlbum.name,
          artista: detalhesAlbum.artists.map((a) => a.name).join(", "),
          imagem: detalhesAlbum.images[0]?.url || "",
          avaliacoes: {},
          review: review.trim(),
          data_review: new Date(),
          data_avaliacao: new Date(),
        };

        await updateDoc(userRef, {
          albuns_avaliados: [...albumsAvaliados, dadosAlbum],
        });
      }

      setMostrarModalReview(false);
    } catch (error) {
      console.error("Erro ao salvar review:", error);
    } finally {
      setSalvandoReview(false);
    }
  };

  // Verificar se existe uma review
  const temReviewExistente = Boolean(review);

  return {
    review,
    setReview,
    salvandoReview,
    mostrarModalReview,
    setMostrarModalReview,
    salvarReview,
    temReviewExistente,
  };
}
