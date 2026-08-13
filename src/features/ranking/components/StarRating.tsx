import { useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: number;
}

const STARS = [1, 2, 3, 4, 5];

/** Nota do VO `Score`: passos de meia estrela, 0 a 5. Clicar na nota atual zera. */
export function StarRating({ value, onChange, disabled, size = 20 }: StarRatingProps) {
  const { t } = useTranslation();
  const stripRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<number | null>(null);

  const displayed = preview ?? value;

  /**
   * Nota derivada da posição do ponteiro na faixa inteira, não do botão que recebeu o evento:
   * com meia estrela o alvo é estreito, e um micro-arrasto entre as duas metades faz o `click`
   * disparar no ancestral comum em vez do botão — a nota se perdia.
   */
  const scoreAtX = (clientX: number): number | null => {
    const strip = stripRef.current?.getBoundingClientRect();
    if (!strip || strip.width === 0) return null;

    const cell = strip.width / STARS.length;
    const index = Math.min(STARS.length - 1, Math.max(0, Math.floor((clientX - strip.left) / cell)));
    const withinCell = clientX - strip.left - index * cell;

    return index + (withinCell < cell / 2 ? 0.5 : 1);
  };

  // Sem isso, clicar pra limpar a nota (clique na mesma estrela) mantém `preview` travado
  // na posição do clique: as estrelas seguem cheias até o ponteiro sair, parecendo que nada
  // aconteceu mesmo com a nota já zerada.
  const commit = (next: number) => {
    setPreview(null);
    onChange(next === value ? 0 : next);
  };

  // `detail === 0` = click sintetizado pelo teclado (Enter/Espaço no botão), que não tem
  // coordenada útil. Ponteiro resolve aqui; teclado resolve no botão.
  const handleStripClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.detail === 0) return;
    const next = scoreAtX(event.clientX);
    if (next !== null) commit(next);
  };

  const handleStripPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    setPreview(scoreAtX(event.clientX));
  };

  return (
    <div
      ref={stripRef}
      className={disabled ? "flex items-center opacity-50" : "flex items-center"}
      onClick={disabled ? undefined : handleStripClick}
      onPointerMove={disabled ? undefined : handleStripPointerMove}
      onPointerLeave={() => setPreview(null)}
    >
      {STARS.map((star) => {
        const fillFraction = Math.min(1, Math.max(0, displayed - (star - 1)));

        return (
          <div key={star} className={disabled ? "relative shrink-0" : "relative shrink-0 p-1"}>
            <div className="relative" style={{ width: size, height: size }}>
              <Star size={size} className="text-gray-600" />
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${fillFraction * 100}%` }}
              >
                <Star size={size} className="fill-dourado text-dourado" />
              </div>
            </div>

            {!disabled && (
              // Cobre também o padding: sem isso o espaço entre estrelas vira zona morta.
              <div className="absolute inset-0 flex touch-manipulation">
                {[star - 0.5, star].map((half) => (
                  <button
                    key={half}
                    type="button"
                    onClick={(event) => {
                      if (event.detail !== 0) return;
                      commit(half);
                    }}
                    onFocus={() => setPreview(half)}
                    onBlur={() => setPreview(null)}
                    aria-label={t("starRating.ariaLabel", { star: half })}
                    className="w-1/2 h-full cursor-pointer"
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
