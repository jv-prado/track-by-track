import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * Componente que exibe a barra de progresso das avaliações do álbum
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.progressoAvaliacao - Objeto com informações de progresso (avaliadas, total, percentual)
 */
const BarraProgresso = ({ progressoAvaliacao }) => {
  const { t } = useTranslation();

  // Ref para controlar se é a primeira montagem
  const isFirstMount = useRef(true);
  // Estado para animar suavemente o percentual
  const [percentualAnimado, setPercentualAnimado] = useState(0);
  const percentualAtualRef = useRef(0);

  // Efeito que roda apenas na primeira montagem
  useEffect(() => {
    const targetPercentual = Math.floor(progressoAvaliacao?.percentual || 0);

    if (isFirstMount.current) {
      // Na primeira montagem, anima de 0 até o valor atual com efeito mais rápido
      let startTime;
      const initialDuration = 600; // ms, um pouco mais longo para o efeito inicial

      function animateInitial(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / initialDuration, 1);

        // Easing function para tornar a animação mais natural
        const easedProgress =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const value = easedProgress * targetPercentual;

        setPercentualAnimado(value);
        percentualAtualRef.current = value;

        if (progress < 1) {
          requestAnimationFrame(animateInitial);
        } else {
          setPercentualAnimado(targetPercentual);
          percentualAtualRef.current = targetPercentual;
          isFirstMount.current = false;
        }
      }

      requestAnimationFrame(animateInitial);
    }

    return () => {
      // Cleanup
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efeito para animar mudanças de percentual após a montagem inicial
  useEffect(() => {
    if (isFirstMount.current) return; // Pula se for a primeira montagem

    const novoPercentual = Math.floor(progressoAvaliacao?.percentual || 0);
    if (novoPercentual === Math.floor(percentualAtualRef.current)) return;

    let startTime;
    const duration = 400; // ms para transições subsequentes
    const fromValue = percentualAtualRef.current;
    const toValue = novoPercentual;

    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function para suavizar a animação
      const easedProgress =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const value = fromValue + (toValue - fromValue) * easedProgress;

      setPercentualAnimado(value);
      percentualAtualRef.current = value;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setPercentualAnimado(toValue);
        percentualAtualRef.current = toValue;
      }
    }

    requestAnimationFrame(animate);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressoAvaliacao?.percentual]);

  return (
    <div className="mt-1 md:mt-0">
      <div className="w-full max-w-[80vw] mx-auto xs:max-w-[180px] md:max-w-full">
        <div className="flex justify-between mb-1 gap-1 xs:gap-1.5 text-center md:text-left">
          <span className="text-[10px] xs:text-xs md:text-sm text-gray-400">
            {t("albumDetails.ratingProgress")}
          </span>
          <span className="text-[10px] xs:text-xs md:text-sm text-gray-400">
            {progressoAvaliacao?.avaliadas || 0}/
            {progressoAvaliacao?.total || 0} (
            {Math.floor(progressoAvaliacao?.percentual || 0)}%)
          </span>
        </div>
      </div>
      <div className="w-full max-w-[80vw] mx-auto xs:max-w-[180px] md:max-w-full md:ml-0 h-1.5 xs:h-2 md:h-2.5 lg:h-3 xl:h-3 bg-cinza/70 xs:bg-cinza rounded-full overflow-hidden relative">
        <div
          className={`h-full ${
            Math.floor(progressoAvaliacao?.percentual || 0) >= 100
              ? "bg-verde-destaque"
              : "bg-blue-500/50"
          }`}
          style={{
            width: `${Math.round(percentualAnimado)}%`,
          }}
        ></div>
      </div>
    </div>
  );
};

export default BarraProgresso;
