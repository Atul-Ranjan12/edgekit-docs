import katex from "katex";

// Server-side KaTeX rendering — equations are typeset at build time (no client JS).
// KaTeX CSS is imported once in app/layout.tsx.

export function Math({ children }: { children: string }) {
  const html = katex.renderToString(children, {
    displayMode: true,
    throwOnError: false,
    output: "html",
  });
  return (
    <div
      className="my-5 overflow-x-auto rounded-xl border border-border bg-surface px-4 py-3 text-fg"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function MathInline({ children }: { children: string }) {
  const html = katex.renderToString(children, {
    displayMode: false,
    throwOnError: false,
    output: "html",
  });
  return <span className="text-fg-soft" dangerouslySetInnerHTML={{ __html: html }} />;
}
