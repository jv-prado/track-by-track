// Porta 1:1 de src/shared/lib/scoreColor.ts (web) — mesmos thresholds, classes
// trocadas por tokens RN (o "bg"/"border" viram className NativeWind iguais,
// "text" também — só o tom exato pode ser lido puro via colorHex quando algo
// precisa de cor crua em vez de className, ex: ícone SVG).
export interface ScoreColorClasses {
  bg: string;
  border: string;
  text: string;
  colorHex: string;
}

const RED: ScoreColorClasses = {
  bg: "bg-red-500/15",
  border: "border-red-500/30",
  text: "text-red-400",
  colorHex: "#f87171",
};

const YELLOW: ScoreColorClasses = {
  bg: "bg-yellow-500/15",
  border: "border-yellow-500/30",
  text: "text-yellow-400",
  colorHex: "#facc15",
};

const GREEN: ScoreColorClasses = {
  bg: "bg-green-500/15",
  border: "border-green-500/30",
  text: "text-green-400",
  colorHex: "#4ade80",
};

const NEUTRAL: ScoreColorClasses = {
  bg: "bg-gray-500/15",
  border: "border-gray-500/30",
  text: "text-gray-400",
  colorHex: "#9ca3af",
};

export function getScoreColorClasses(score: number, isComplete: boolean): ScoreColorClasses {
  if (!isComplete) return NEUTRAL;
  if (score < 4) return RED;
  if (score < 7) return YELLOW;
  return GREEN;
}
