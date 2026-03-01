import type { DifficultyConfig } from "./types.js";

export type Grid = number[][];

export function generateFullGrid(): Grid {
  const g = emptyGrid();
  solveRandom(g);
  return g;
}

export function makePuzzleUnique(full: Grid, targetGivens: number): Grid {
  const p = cloneGrid(full);
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i));

  const givens = () => p.flat().filter((v) => v !== 0).length;

  for (const idx of cells) {
    if (givens() <= targetGivens) break;
    const r = Math.floor(idx / 9);
    const c = idx % 9;

    const prev = p[r][c];
    p[r][c] = 0;

    if (countSolutions(cloneGrid(p), 2) !== 1) {
      p[r][c] = prev;
    }
  }
  return p;
}

export function puzzleHasBlanks(p: Grid): boolean {
  return p.some((row) => row.some((v) => v === 0));
}

export function meetsMaxPerUnit(p: Grid, maxPerUnit: number): boolean {
  for (let i = 0; i < 9; i++) {
    const rowCount = p[i].filter((v) => v !== 0).length;
    if (rowCount > maxPerUnit) return false;
    let colCount = 0;
    for (let r = 0; r < 9; r++) if (p[r][i] !== 0) colCount++;
    if (colCount > maxPerUnit) return false;
  }
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      let cnt = 0;
      for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) if (p[r][c] !== 0) cnt++;
      if (cnt > maxPerUnit) return false;
    }
  }
  return true;
}

export function hasUniqueSolution(p: Grid): boolean {
  return countSolutions(cloneGrid(p), 2) === 1;
}

/** Try to generate a single puzzle for the given config. Returns null on failure. */
export function generatePuzzle(config: DifficultyConfig): { puzzle: Grid; solution: Grid } | null {
  for (let attempt = 0; attempt < config.attemptsPerPuzzle; attempt++) {
    const full = generateFullGrid();
    const puzzle = makePuzzleUnique(full, config.targetGivens);

    if (!puzzleHasBlanks(puzzle)) continue;
    if (!meetsMaxPerUnit(puzzle, config.maxPerUnit)) continue;
    if (!hasUniqueSolution(puzzle)) continue;

    return { puzzle, solution: full };
  }
  return null;
}

/* ---- Internal helpers ---- */

function emptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function cloneGrid(g: Grid): Grid {
  return g.map((row) => row.slice());
}

function solveRandom(g: Grid): boolean {
  const pos = findEmpty(g);
  if (!pos) return true;
  const [r, c] = pos;

  for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (isValid(g, r, c, n)) {
      g[r][c] = n;
      if (solveRandom(g)) return true;
      g[r][c] = 0;
    }
  }
  return false;
}

function countSolutions(g: Grid, limit: number): number {
  const pos = findEmpty(g);
  if (!pos) return 1;
  const [r, c] = pos;

  let count = 0;
  for (let n = 1; n <= 9; n++) {
    if (isValid(g, r, c, n)) {
      g[r][c] = n;
      count += countSolutions(g, limit);
      g[r][c] = 0;
      if (count >= limit) return count;
    }
  }
  return count;
}

function findEmpty(g: Grid): [number, number] | null {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (g[r][c] === 0) return [r, c];
  return null;
}

function isValid(g: Grid, r: number, c: number, n: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (g[r][i] === n) return false;
    if (g[i][c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++)
    for (let cc = bc; cc < bc + 3; cc++) if (g[rr][cc] === n) return false;
  return true;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
