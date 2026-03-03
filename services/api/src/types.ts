/* ---- Difficulty ---- */

export type Difficulty = "easy" | "medium" | "hard" | "expert";
export type DifficultyOption = Difficulty | "mixed";

export const ALL_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert"];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  expert: "Expert",
};

export interface DifficultyConfig {
  targetGivens: number;
  maxPerUnit: number;
  attemptsPerPuzzle: number;
  maxCount: number;
}

const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  // targetGivens: how many cells are pre-filled (fewer = harder)
  // maxPerUnit: max givens allowed in any single row/col/box (prevents easy clusters)
  // attemptsPerPuzzle: harder puzzles need more generation retries
  easy: { targetGivens: 38, maxPerUnit: 6, attemptsPerPuzzle: 40, maxCount: 100 },
  medium: { targetGivens: 30, maxPerUnit: 5, attemptsPerPuzzle: 80, maxCount: 75 },
  hard: { targetGivens: 26, maxPerUnit: 4, attemptsPerPuzzle: 150, maxCount: 50 },
  expert: { targetGivens: 23, maxPerUnit: 4, attemptsPerPuzzle: 250, maxCount: 25 },
};

export function difficultyConfig(d: Difficulty): DifficultyConfig {
  return DIFFICULTY_CONFIGS[d];
}

export function maxCountForDifficulty(d: DifficultyOption): number {
  if (d === "mixed")
    return Math.min(...ALL_DIFFICULTIES.map((k) => DIFFICULTY_CONFIGS[k].maxCount));
  return DIFFICULTY_CONFIGS[d].maxCount;
}

/* ---- Fonts ---- */

export type FontFamily = "helvetica" | "times" | "courier";
export type Fonts = { regular: string; bold: string };

export const FONT_MAP: Record<FontFamily, Fonts> = {
  helvetica: { regular: "Helvetica", bold: "Helvetica-Bold" },
  times: { regular: "Times-Roman", bold: "Times-Bold" },
  courier: { regular: "Courier", bold: "Courier-Bold" },
};

/* ---- Page size ---- */

export const A5 = { width: 420, height: 595 };

/* ---- API types ---- */

export type GenerateRequest = {
  title?: string;
  count?: number;
  difficulty?: DifficultyOption;
  includeCover?: boolean;
  includeContents?: boolean;
  font?: FontFamily;
};

export type ApiResponse = {
  statusCode: number;
  headers: Record<string, string>;
  isBase64Encoded: boolean;
  body: string;
};
