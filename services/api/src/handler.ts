import { ALL_DIFFICULTIES, DIFFICULTY_LABELS, difficultyConfig } from "./types.js";
import type {
  Difficulty,
  DifficultyOption,
  FontFamily,
  GenerateRequest,
  ApiResponse,
} from "./types.js";
import { generatePuzzle } from "./sudoku.js";
import { buildPdf } from "./pdf.js";

/* ---------------- Input sanitisation ---------------- */

const DEFAULTS = {
  title: "Goonbits Sudoku Volume One",
  count: 30,
  difficulty: "medium" as DifficultyOption,
  font: "helvetica" as FontFamily,
  includeCover: true,
  includeContents: true,
} as const;

const VALID_DIFFICULTIES: DifficultyOption[] = [...ALL_DIFFICULTIES, "mixed"];
const VALID_FONTS: FontFamily[] = ["helvetica", "times", "courier"];

function sanitiseInput(raw: GenerateRequest) {
  return {
    title:
      String(raw.title ?? "")
        .trim()
        .slice(0, 80) || DEFAULTS.title,
    count: clampInt(Number(raw.count) || DEFAULTS.count, 1, 100),
    difficulty: oneOf(raw.difficulty, VALID_DIFFICULTIES, DEFAULTS.difficulty),
    font: oneOf(raw.font, VALID_FONTS, DEFAULTS.font),
    includeCover: raw.includeCover !== false,
    includeContents: raw.includeContents !== false,
  };
}

function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

/* ---------------- Handler ---- */

export async function handler(event: any): Promise<ApiResponse> {
  let body: GenerateRequest = {};
  try {
    body = event?.body ? JSON.parse(event.body) : {};
  } catch {
    body = {};
  }

  const { title, count, difficulty, font, includeCover, includeContents } = sanitiseInput(body);

  // Build per-puzzle difficulty list
  const difficultyList: Difficulty[] =
    difficulty === "mixed"
      ? Array.from({ length: count }, (_, i) => ALL_DIFFICULTIES[i % ALL_DIFFICULTIES.length])
      : Array(count).fill(difficulty);

  const puzzles: number[][][] = [];
  const solutions: number[][][] = [];
  const labels: string[] = [];

  for (let i = 0; i < count; i++) {
    const d = difficultyList[i];
    const result = generatePuzzle(difficultyConfig(d));

    if (!result) {
      return jsonError(
        500,
        `Failed to generate puzzle ${i + 1} (${DIFFICULTY_LABELS[d]}). Try fewer puzzles or easier difficulty.`,
      );
    }

    puzzles.push(result.puzzle);
    solutions.push(result.solution);
    labels.push(DIFFICULTY_LABELS[d]);
  }

  const pdfBytes = await buildPdf({
    title,
    puzzles,
    solutions,
    labels,
    includeCover,
    includeContents,
    font,
  });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFilename(title)}.pdf"`,
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
    },
    isBase64Encoded: true,
    body: pdfBytes.toString("base64"),
  };
}

/* ---------------- Helpers ---- */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "Content-Disposition",
};

function safeFilename(s: string) {
  return (
    s
      .replace(/[^a-z0-9\-_ ]/gi, "")
      .trim()
      .replace(/\s+/g, "_") || "sudoku"
  );
}

function jsonError(statusCode: number, message: string): ApiResponse {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    isBase64Encoded: false,
    body: JSON.stringify({ error: message }),
  };
}
