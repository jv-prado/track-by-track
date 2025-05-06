import React, { useEffect, useState } from "react";
import { obterAvaliacoesGlobais } from "../../../services/firebase";
import { FaStar } from "react-icons/fa";
import { MdRateReview } from "react-icons/md";

const ReviewsUsuariosAlbum = ({ albumId }) => {
  const [reviews, setReviews] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const buscarReviews = async () => {
      setCarregando(true);
      setErro(null);
      try {
        // Busca todas as avaliações globais (pode ser otimizado no futuro)
        const avaliacoes = await obterAvaliacoesGlobais(100);
        // Filtra apenas as reviews do álbum atual
        const reviewsAlbum = avaliacoes.filter(
          (a) => a.id === albumId && a.review && a.review.trim().length > 0
        );
        // Ordena por data_review (mais recente primeiro)
        reviewsAlbum.sort((a, b) => {
          const dA = a.data_review ? new Date(a.data_review) : new Date(0);
          const dB = b.data_review ? new Date(b.data_review) : new Date(0);
          return dB - dA;
        });
        setReviews(reviewsAlbum);
      } catch (e) {
        setErro("Erro ao carregar reviews dos usuários.");
      } finally {
        setCarregando(false);
      }
    };
    if (albumId) buscarReviews();
  }, [albumId]);

  if (carregando) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="w-8 h-8 border-4 border-verde-destaque/20 border-t-verde-destaque rounded-full animate-spin mr-3"></div>
        <span className="text-verde-destaque font-medium text-lg">
          Carregando reviews...
        </span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="text-center text-red-400 py-6 font-semibold">{erro}</div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8 text-lg">
        Nenhuma review de usuário para este álbum ainda.
      </div>
    );
  }

  return (
    <div className="mt-8 mb-4">
      <h3 className="text-2xl font-bold text-verde-destaque flex items-center gap-2 mb-6">
        <MdRateReview className="text-indigo-400 text-3xl" />
        Reviews dos Usuários
      </h3>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <div
            key={r.usuario.id + (r.data_review || Math.random())}
            className="bg-cinza-escuro rounded-xl shadow-lg p-5 flex flex-col h-full hover:scale-[1.02] transition-transform border border-gray-800 hover:border-verde-destaque/60"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center shadow">
                {r.usuario.foto ? (
                  <img
                    src={r.usuario.foto}
                    alt={r.usuario.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl text-verde-destaque font-bold">
                    {r.usuario.nome.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-white text-base truncate max-w-[120px]">
                  {r.usuario.nome}
                </span>
                <span className="text-xs text-gray-400">
                  {r.data_review
                    ? new Date(r.data_review).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : ""}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-1 bg-gray-900 px-2 py-1 rounded-lg shadow">
                <FaStar className="text-yellow-400 text-base" />
                <span className="text-white font-bold text-lg">
                  {typeof r.mediaAvaliacao === "number"
                    ? r.mediaAvaliacao.toFixed(1)
                    : "-"}
                </span>
              </div>
            </div>
            <div className="mt-2 text-gray-200 text-base whitespace-pre-line break-words min-h-[60px]">
              {r.review}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsUsuariosAlbum;
