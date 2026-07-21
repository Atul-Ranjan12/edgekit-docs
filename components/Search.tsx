"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Portal } from "./Portal";
import { searchDocs } from "@/lib/search";

export function SearchButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition hover:border-border-strong sm:w-56"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Search docs…</span>
        <kbd className="ml-auto hidden rounded border border-border-strong px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </button>
      {open && (
        <Portal>
          <SearchModal onClose={() => setOpen(false)} />
        </Portal>
      )}
    </>
  );
}

function SearchModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => searchDocs(q), [q]);

  // focus input + lock body scroll while open
  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  useEffect(() => setActive(0), [q]);

  // keep the active row in view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(href: string) {
    router.push(href);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search documentation"
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter" && results[active]) go(results[active].href);
              else if (e.key === "Escape") onClose();
            }}
            placeholder="Search the docs…"
            className="w-full bg-transparent py-3.5 text-sm text-fg outline-none placeholder:text-muted"
          />
          <kbd className="shrink-0 rounded border border-border-strong px-1.5 font-mono text-[10px] text-muted">esc</kbd>
        </div>
        <ul ref={listRef} className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted">
              No matches for <span className="font-medium text-fg-soft">“{q}”</span>.
            </li>
          )}
          {results.map((it, i) => (
            <li key={it.href}>
              <button
                data-idx={i}
                onMouseMove={() => setActive(i)}
                onClick={() => go(it.href)}
                className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition ${
                  i === active ? "bg-accent-soft" : "hover:bg-surface"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium ${i === active ? "text-fg" : "text-fg-soft"}`}>{it.title}</span>
                  <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">{it.section}</span>
                </span>
                {it.description && <span className="text-xs leading-5 text-muted">{it.description}</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-muted">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
