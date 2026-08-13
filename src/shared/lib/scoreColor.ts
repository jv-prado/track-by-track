/**
 * Cor da nota (badge de averageScore, escala 0-10) — vermelho/amarelo/verde
 * conforme faixa de valor. Thresholds em terços da escala.
 */
export interface ScoreColorClasses {
  bg: string;
  border: string;
  text: string;
}

const RED: ScoreColorClasses = {
  bg: "bg-red-500/15",
  border: "border-red-500/30",
  text: "text-red-400",
};

const YELLOW: ScoreColorClasses = {
  bg: "bg-yellow-500/15",
  border: "border-yellow-500/30",
  text: "text-yellow-400",
};

const GREEN: ScoreColorClasses = {
  bg: "bg-green-500/15",
  border: "border-green-500/30",
  text: "text-green-400",
};

const NEUTRAL: ScoreColorClasses = {
  bg: "bg-gray-500/15",
  border: "border-gray-500/30",
  text: "text-gray-400",
};

/**
 * score na escala 0-10 (mesma de `ranking.averageScore`).
 * `isComplete` = todas as faixas do álbum já avaliadas — antes disso a nota
 * ainda pode mudar bastante, então fica neutra em vez de vermelha/verde cedo demais.
 */
export function getScoreColorClasses(
  score: number,
  isComplete: boolean,
): ScoreColorClasses {
  if (!isComplete) return NEUTRAL;
  if (score < 4) return RED;
  if (score < 7) return YELLOW;
  return GREEN;
}
