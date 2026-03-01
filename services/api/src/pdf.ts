import PDFDocument from "pdfkit";
import { A5, FONT_MAP } from "./types.js";
import type { FontFamily, Fonts } from "./types.js";
import type { Grid } from "./sudoku.js";

/* ---- Named destination helpers ---- */

function destPuzzle(i: number) {
  return `puzzle_${i}`;
}
function destSolution(i: number) {
  return `sol_${i}`;
}
const DEST_TOC = "toc";

/* ---- TOC layout constants ---- */

const TOC_MARGIN = 28;
const TOC_ROW_H = 22;
const TOC_COLS = 3;
const TOC_HEADER_H = 72;
const TOC_USABLE_W = A5.width - TOC_MARGIN * 2;
const TOC_COL_W = TOC_USABLE_W / TOC_COLS;
const TOC_PAGE_BOTTOM = A5.height - TOC_MARGIN;

function tocRowsForPage(isFirst: boolean) {
  const availableH = TOC_PAGE_BOTTOM - TOC_MARGIN - (isFirst ? TOC_HEADER_H : 0);
  return Math.floor(availableH / TOC_ROW_H);
}

/* ---- Public entry point ---- */

export interface BuildPdfOpts {
  title: string;
  puzzles: Grid[];
  solutions: Grid[];
  labels: string[];
  includeCover: boolean;
  includeContents: boolean;
  font: FontFamily;
}

export async function buildPdf(opts: BuildPdfOpts): Promise<Buffer> {
  const { title, puzzles, solutions, labels, includeCover, includeContents, font } = opts;
  const fonts = FONT_MAP[font];

  const doc = new PDFDocument({
    size: [A5.width, A5.height],
    margins: { top: 28, bottom: 28, left: 28, right: 28 },
    autoFirstPage: false,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const N = puzzles.length;

  if (includeCover) {
    doc.addPage();
    drawCover(doc, title, fonts);
  }

  if (includeContents) {
    drawTOC(doc, title, N, labels, fonts);
  }

  for (let i = 1; i <= N; i++) {
    doc.addPage();
    doc.addNamedDestination(destPuzzle(i));
    drawPuzzlePage(doc, i, puzzles[i - 1], labels[i - 1], includeContents, fonts);
  }

  for (let start = 1; start <= N; start += 4) {
    doc.addPage();
    const end = Math.min(start + 3, N);
    for (let s = start; s <= end; s++) {
      doc.addNamedDestination(destSolution(s));
    }
    drawSolutionsPage(doc, start, solutions.slice(start - 1, start - 1 + 4), fonts);
  }

  doc.end();
  return await done;
}

/* ---- Page renderers ---- */

function drawCover(doc: PDFKit.PDFDocument, title: string, fonts: Fonts) {
  const w = A5.width,
    h = A5.height;
  doc.save();
  doc.rect(0, 0, w, h).fill("#000");
  doc.fillColor("#fff").fontSize(26).font(fonts.bold);
  doc.text(title, 0, h * 0.4, { width: w, align: "center" });
  doc.restore();
}

function drawTOC(
  doc: PDFKit.PDFDocument,
  title: string,
  count: number,
  labels: string[],
  fonts: Fonts,
) {
  let entryIndex = 1;

  for (let page = 0; entryIndex <= count; page++) {
    doc.addPage();
    const isFirst = page === 0;
    if (isFirst) doc.addNamedDestination(DEST_TOC);
    let cursorY = TOC_MARGIN;

    if (isFirst) {
      const headerH = 54;
      doc.save();
      doc.lineWidth(1.5).rect(TOC_MARGIN, cursorY, TOC_USABLE_W, headerH).stroke("#000");
      doc.font(fonts.bold).fontSize(16).fillColor("#000");
      doc.text(title, TOC_MARGIN, cursorY + 16, { width: TOC_USABLE_W, align: "center" });
      doc.restore();
      cursorY += headerH + 18;
    }

    const rowsThisPage = tocRowsForPage(isFirst);

    for (let row = 0; row < rowsThisPage && entryIndex <= count; row++) {
      const y = cursorY + row * TOC_ROW_H;

      for (let col = 0; col < TOC_COLS && entryIndex <= count; col++) {
        const x = TOC_MARGIN + col * TOC_COL_W;
        const diffLabel = labels[entryIndex - 1];
        const label = diffLabel ? `${entryIndex}. ${diffLabel}` : `Puzzle ${entryIndex}`;

        doc.save();
        const cbSize = 10;
        const cbX = x + 6;
        const cbY = y + 6;
        doc.lineWidth(0.8).rect(cbX, cbY, cbSize, cbSize).stroke("#000");

        doc.font(fonts.regular).fontSize(11).fillColor("#000");
        doc.text(label, cbX + cbSize + 5, y + 5, { lineBreak: false });

        doc.goTo(x, y, TOC_COL_W, TOC_ROW_H, destPuzzle(entryIndex));
        doc.restore();

        entryIndex++;
      }

      if (entryIndex <= count || row < rowsThisPage - 1) {
        const lineY = cursorY + (row + 1) * TOC_ROW_H;
        doc.save();
        doc
          .lineWidth(0.3)
          .moveTo(TOC_MARGIN, lineY)
          .lineTo(TOC_MARGIN + TOC_USABLE_W, lineY)
          .stroke("#ccc");
        doc.restore();
      }
    }
  }
}

function drawPuzzlePage(
  doc: PDFKit.PDFDocument,
  index: number,
  grid: Grid,
  label: string,
  includeContents: boolean,
  fonts: Fonts,
) {
  const w = A5.width,
    h = A5.height;
  const margin = 28;

  const badgeH = 24;
  const cell = 42;
  const gridSize = cell * 9;

  const headerBlockH = badgeH + 10;
  const linkH = 14;
  const contentH = headerBlockH + gridSize + 10 + linkH;
  const topY = Math.max(margin, (h - contentH) / 2);

  const gridX = (w - gridSize) / 2;
  const gridY = topY + headerBlockH;

  const badgeText = label ? `#${index} - ${label}` : `#${index}`;
  doc.save();
  doc.font(fonts.bold).fontSize(12).fillColor("#000");
  const badgeW = doc.widthOfString(badgeText) + 20;
  const badgeX = (w - badgeW) / 2;
  const badgeY = topY;

  doc.lineWidth(1.2).rect(badgeX, badgeY, badgeW, badgeH).stroke("#000");
  doc.text(badgeText, badgeX, badgeY + 6, { width: badgeW, align: "center" });

  drawSudokuGrid(doc, gridX, gridY, cell, grid, true, fonts);

  const footerY = gridY + gridSize + 8;
  doc.font(fonts.regular).fontSize(11).fillColor("#000");

  if (includeContents) {
    const contentsText = "<< Contents";
    doc.text(contentsText, gridX, footerY, { lineBreak: false });
    const contentsW = doc.widthOfString(contentsText);
    doc.goTo(gridX - 2, footerY - 2, contentsW + 4, 14, DEST_TOC);
  }

  const solText = "Go to solution >>";
  const solW = doc.widthOfString(solText);
  const solX = gridX + gridSize - solW;
  doc.text(solText, solX, footerY, { lineBreak: false });
  doc.goTo(solX - 2, footerY - 2, solW + 4, 14, destSolution(index));

  doc.restore();
}

function drawSolutionsPage(
  doc: PDFKit.PDFDocument,
  startIndex: number,
  sols: Grid[],
  fonts: Fonts,
) {
  const margin = 22;
  const w = A5.width,
    h = A5.height;
  const gap = 14;

  const cell = 18;
  const gridSize = cell * 9;

  const blockW = (w - margin * 2 - gap) / 2;
  const blockH = (h - margin * 2 - gap) / 2;

  for (let k = 0; k < 4; k++) {
    const idx = startIndex + k;
    if (idx > startIndex + sols.length - 1) break;
    const sol = sols[k];

    const col = k % 2;
    const row = Math.floor(k / 2);

    const x0 = margin + col * (blockW + gap);
    const y0 = margin + row * (blockH + gap);

    doc.save();
    doc.lineWidth(1.0).rect(x0, y0, 38, 20).stroke("#000");
    doc.font(fonts.bold).fontSize(10).fillColor("#000");
    doc.text(`#${idx}`, x0, y0 + 5, { width: 38, align: "center" });

    doc.font(fonts.regular).fontSize(10);
    doc.text("Solution", x0 + 44, y0 + 5);

    const backText = "<< Back to puzzle";
    const backY = y0 + 24;
    doc.font(fonts.regular).fontSize(9);
    doc.text(backText, x0, backY, { lineBreak: false });
    const backW = doc.widthOfString(backText);
    doc.goTo(x0, backY - 2, backW + 6, 12, destPuzzle(idx));

    const gx = x0 + (blockW - gridSize) / 2;
    const gy = y0 + 38;
    drawSudokuGrid(doc, gx, gy, cell, sol, false, fonts);

    doc.restore();
  }
}

function drawSudokuGrid(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  cell: number,
  grid: Grid,
  isPuzzle: boolean,
  fonts: Fonts,
) {
  const size = cell * 9;

  doc.save();
  doc.lineWidth(0.8);
  for (let i = 0; i <= 9; i++) {
    const xx = x + i * cell;
    const yy = y + i * cell;
    doc
      .moveTo(xx, y)
      .lineTo(xx, y + size)
      .stroke("#000");
    doc
      .moveTo(x, yy)
      .lineTo(x + size, yy)
      .stroke("#000");
  }

  doc.lineWidth(2.0);
  for (const i of [0, 3, 6, 9]) {
    const xx = x + i * cell;
    const yy = y + i * cell;
    doc
      .moveTo(xx, y)
      .lineTo(xx, y + size)
      .stroke("#000");
    doc
      .moveTo(x, yy)
      .lineTo(x + size, yy)
      .stroke("#000");
  }

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      if (!v) continue;

      const cx = x + c * cell;
      const cy = y + r * cell;

      if (isPuzzle) {
        doc.font(fonts.bold).fontSize(Math.max(12, Math.floor(cell * 0.45)));
      } else {
        doc.font(fonts.bold).fontSize(Math.max(8, Math.floor(cell * 0.45)));
      }
      doc.fillColor("#000");
      doc.text(String(v), cx, cy + cell * 0.22, { width: cell, align: "center" });
    }
  }

  doc.restore();
}
