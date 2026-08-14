import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: number;
}

const STARS = [1, 2, 3, 4, 5];

/** Nota do VO `Score`: passos de meia estrela, 0 a 5. Clicar/soltar na nota atual zera. */
export function StarRating({ value, onChange, disabled, size = 20 }: StarRatingProps) {
  const { t } = useTranslation();
  const stripRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [preview, setPreview] = useState<number | null>(null);

  const displayed = preview ?? value;

  const scoreAtX = (clientX: number): number | null => {
    const strip = stripRef.current?.getBoundingClientRect();
    if (!strip || strip.width === 0) return null;

    // Arrastar pra fora da faixa pela esquerda zera — sem isso a nota mínima alcançável por
    // posição era 0.5 (zerar só era possível clicando de novo na nota já existente).
    if (clientX <= strip.left) return 0;

    const cell = strip.width / STARS.length;
    const index = Math.min(STARS.length - 1, Math.floor((clientX - strip.left) / cell));
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

  // Ponteiro capturado no `down`: a nota acompanha o dedo/mouse em tempo real mesmo se ele
  // sair da faixa das estrelas, e só é confirmada (`onChange`) na soltura — evita disparar a
  // mutação de rating a cada pixel arrastado. Cobre mouse (clicar e arrastar) e touch (deslizar
  // o dedo) com o mesmo código, sem depender do `click` nativo — que não dispara em touch
  // quando há arrasto, e cujo alvo de bubbling é ambíguo em micro-arrastos entre meias-estrelas.
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    stripRef.current?.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    setPreview(scoreAtX(event.clientX));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (draggingRef.current) {
      setPreview(scoreAtX(event.clientX));
      return;
    }
    // Preview por hover (sem pressionar) só faz sentido pra mouse/caneta.
    if (event.pointerType === "touch") return;
    setPreview(scoreAtX(event.clientX));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    stripRef.current?.releasePointerCapture(event.pointerId);

    const next = scoreAtX(event.clientX);
    if (next !== null) commit(next);
    else setPreview(null);
  };

  const handlePointerLeave = () => {
    if (!draggingRef.current) setPreview(null);
  };

  return (
    <div
      ref={stripRef}
      className={disabled ? "flex items-center opacity-50" : "flex items-center touch-none select-none"}
      onPointerDown={disabled ? undefined : handlePointerDown}
      onPointerMove={disabled ? undefined : handlePointerMove}
      onPointerUp={disabled ? undefined : endDrag}
      onPointerCancel={disabled ? undefined : endDrag}
      onPointerLeave={handlePointerLeave}
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
              // Os botões só tratam ativação por teclado (Enter/Espaço, `detail === 0`) — todo
              // clique/toque real é resolvido pelo pointerup da faixa acima, que já cobre tap
              // e arrasto sem depender de o `down`/`up` caírem no mesmo elemento.
              <div className="absolute inset-0 flex">
                {[star - 0.5, star].map((half) => (
                  <button
                    key={half}
                    type="button"
                    tabIndex={0}
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
