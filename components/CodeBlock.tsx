import { highlight } from "@/lib/shiki";
import { CopyButton } from "./CopyButton";

type Props = {
  code: string;
  lang?: string;
  filename?: string;
  className?: string;
};

// Async server component — highlights at render time, ships zero JS for the code itself.
export async function CodeBlock({ code, lang = "python", filename, className = "" }: Props) {
  const html = await highlight(code, lang);
  return (
    <div className={`group relative my-5 overflow-hidden rounded-xl border border-border bg-[var(--code-bg)] ${className}`}>
      {filename && (
        <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-[11px] font-medium text-muted">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-danger/60" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-warn/60" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent/60" />
          <span className="ml-2 font-mono">{filename}</span>
        </div>
      )}
      <CopyButton text={code} />
      <div
        className="overflow-x-auto px-4 py-3.5 font-mono [&_pre]:bg-transparent"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

// Inline code
export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-fg-soft">
      {children}
    </code>
  );
}
