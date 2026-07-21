# edgekit-docs

The documentation website for [edgekit](../edgekit) — a systematic-trading research toolkit.

Built with **Next.js 16 (App Router)** + **TypeScript** + **Tailwind v4**, with
[Shiki](https://shiki.style) for build-time syntax highlighting. Content is authored as
typed TSX pages (no MDX) using a small set of prose primitives — see [`AUTHORING.md`](./AUTHORING.md).

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Structure

```
app/
  page.tsx              landing page
  docs/
    layout.tsx          sidebar + content + table-of-contents
    page.tsx            Introduction
    installation/ quickstart/ pipeline/
    concepts/           r-multiples · causality · ohlc · gauntlet
    guides/             first-backtest · proving-an-edge · prop-firm · custom-strategy · ml-meta-labeling · reports
    api/                overview + one page per module (core, data, …, ml)
    examples/orb-gauntlet/  · gallery/  · roadmap/
components/             CodeBlock, ChartFigure, prose primitives, TopNav, Search, Toc, ThemeToggle
lib/                    nav.ts (navigation tree), shiki.ts (highlighter)
```

## Design

- Theme-aware (light/dark) via a class toggled on `<html>`, no flash on load.
- Semantic design tokens in `app/globals.css` flip with `.dark`; Shiki dual-theme.
- Client-side `⌘K` search over the navigation tree.
- Every doc page is statically prerendered.

Content is kept accurate against the edgekit source — signatures and examples mirror
`edgekit/docs/API_REFERENCE.md` and the real modules.
