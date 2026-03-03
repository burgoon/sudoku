import { useEffect, useMemo, useState } from "react";

type Difficulty = "easy" | "medium" | "hard" | "expert" | "mixed";

const MAX_PUZZLES: Record<Difficulty, number> = {
  easy: 100,
  medium: 75,
  hard: 50,
  expert: 25,
  mixed: 25,
};

type RuntimeConfig = {
  apiBaseUrl?: string;
};

const ENV_API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? undefined;

async function loadRuntimeConfig(): Promise<RuntimeConfig | null> {
  try {
    const res = await fetch("/config.json", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as RuntimeConfig;
  } catch {
    return null;
  }
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

export default function App() {
  const [title, setTitle] = useState("Goonbits Sudoku Volume One");
  const [count, setCount] = useState(30);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [font, setFont] = useState("helvetica");
  const [includeCover, setIncludeCover] = useState(true);
  const [includeContents, setIncludeContents] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiBase, setApiBase] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const cfg = await loadRuntimeConfig();
      const base = cfg?.apiBaseUrl || ENV_API_BASE || "http://localhost:3001"; // dev-friendly default
      setApiBase(normalizeBaseUrl(base));
    })();
  }, []);

  const apiUrl = useMemo(() => {
    if (!apiBase) return null;
    return `${apiBase}/generate`;
  }, [apiBase]);

  async function onGenerate() {
    if (!apiUrl) {
      setError("API not ready yet. If this is local dev, start the API on http://localhost:3001.");
      return;
    }

    setBusy(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, count, difficulty, font, includeCover, includeContents }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`API error ${res.status}: ${txt}`);
      }

      // Try Content-Disposition header first, fall back to client-side generation from title
      let filename = `${
        title
          .replace(/[^a-z0-9\-_ ]/gi, "")
          .trim()
          .replace(/\s+/g, "_") || "sudoku"
      }.pdf`;
      const disposition = res.headers.get("content-disposition");
      const match = disposition?.match(/filename="?([^"]+)"?/);
      if (match) {
        filename = match[1];
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setError("Request timed out. Try fewer puzzles or an easier difficulty.");
      } else {
        setError(e?.message || String(e));
      }
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <div className="card">
        <h1>Goonbits Sudoku Generator</h1>

        <label>
          Title
          <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <div className="row3">
          <label>
            # Puzzles
            <input
              type="number"
              min={1}
              max={MAX_PUZZLES[difficulty]}
              value={count}
              onChange={(e) => {
                const max = MAX_PUZZLES[difficulty];
                setCount(Math.min(max, Math.max(1, parseInt(e.target.value || "1", 10) || 1)));
              }}
            />
          </label>

          <label>
            Difficulty
            <select
              value={difficulty}
              onChange={(e) => {
                const d = e.target.value as Difficulty;
                setDifficulty(d);
                setCount((prev) => Math.min(prev, MAX_PUZZLES[d]));
              }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>

          <label>
            Font
            <select value={font} onChange={(e) => setFont(e.target.value)}>
              <option value="helvetica">Helvetica</option>
              <option value="times">Times</option>
              <option value="courier">Courier</option>
            </select>
          </label>
        </div>

        <div className="row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeCover}
              onChange={(e) => setIncludeCover(e.target.checked)}
            />
            Include cover page
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeContents}
              onChange={(e) => setIncludeContents(e.target.checked)}
            />
            Include table of contents
          </label>
        </div>

        <button disabled={busy || !apiUrl} onClick={onGenerate}>
          {busy ? "Generating…" : "Generate PDF"}
        </button>

        {error && <pre className="error">{error}</pre>}
      </div>
    </div>
  );
}
