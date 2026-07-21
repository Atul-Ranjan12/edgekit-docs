import { createHighlighter, type Highlighter } from "shiki";

// One cached highlighter for the whole build. Dual-theme so a single render
// works in both light and dark (CSS swaps the vars — see globals.css).
let highlighterPromise: Promise<Highlighter> | null = null;

export const LANGS = ["python", "bash", "json", "tsx", "toml", "text"] as const;
export type Lang = (typeof LANGS)[number];

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark-default"],
      langs: [...LANGS],
    });
  }
  return highlighterPromise;
}

export async function highlight(code: string, lang: string): Promise<string> {
  const hl = await getHighlighter();
  const safeLang = (LANGS as readonly string[]).includes(lang) ? lang : "text";
  return hl.codeToHtml(code.replace(/\n$/, ""), {
    lang: safeLang,
    themes: { light: "github-light", dark: "github-dark-default" },
    defaultColor: "light",
  });
}
