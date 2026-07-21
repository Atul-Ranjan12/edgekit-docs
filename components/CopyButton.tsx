"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      aria-label="Copy code"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
      className="absolute right-2.5 top-2.5 rounded-md border border-border bg-surface/80 px-2 py-1 text-[11px] font-medium text-muted opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-fg hover:border-border-strong"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
