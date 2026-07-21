import Link from "next/link";
import type { ReactNode } from "react";

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function H1({ children }: { children: ReactNode }) {
  return <h1 className="mt-1 text-3xl font-bold tracking-tight text-fg sm:text-4xl">{children}</h1>;
}

export function H2({ children, id }: { children: ReactNode; id?: string }) {
  const anchor = id ?? slugify(typeof children === "string" ? children : "");
  return (
    <h2 id={anchor} className="group mt-12 scroll-mt-24 border-b border-border pb-2 text-xl font-semibold tracking-tight text-fg">
      {children}
      {anchor && (
        <a href={`#${anchor}`} className="anchor-link ml-2 text-base font-normal no-underline">
          #
        </a>
      )}
    </h2>
  );
}

export function H3({ children, id }: { children: ReactNode; id?: string }) {
  const anchor = id ?? slugify(typeof children === "string" ? children : "");
  return (
    <h3 id={anchor} className="group mt-8 scroll-mt-24 text-lg font-semibold tracking-tight text-fg">
      {children}
      {anchor && (
        <a href={`#${anchor}`} className="anchor-link ml-2 text-sm font-normal no-underline">
          #
        </a>
      )}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-4 leading-7 text-fg-soft">{children}</p>;
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-lg leading-8 text-muted">{children}</p>;
}

export function Ul({ children }: { children: ReactNode }) {
  return <ul className="mt-4 space-y-2 pl-1">{children}</ul>;
}

export function Li({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 leading-7 text-fg-soft">
      <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-accent" />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http");
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
    >
      {children}
    </Link>
  );
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-fg">{children}</strong>;
}

type CalloutKind = "note" | "tip" | "warn" | "danger";
const CALLOUT: Record<CalloutKind, { label: string; cls: string; icon: string }> = {
  note: { label: "Note", cls: "border-accent/30 bg-accent-soft", icon: "→" },
  tip: { label: "Tip", cls: "border-accent/30 bg-accent-soft", icon: "✦" },
  warn: { label: "Watch out", cls: "border-warn/40 bg-warn-soft", icon: "!" },
  danger: { label: "Danger", cls: "border-danger/40 bg-danger/5", icon: "✕" },
};

export function Callout({ kind = "note", title, children }: { kind?: CalloutKind; title?: string; children: ReactNode }) {
  const c = CALLOUT[kind];
  return (
    <div className={`my-6 rounded-xl border px-4 py-3.5 ${c.cls}`}>
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-fg">
        <span className="grid h-5 w-5 place-items-center rounded-md border border-border-strong text-xs">{c.icon}</span>
        {title ?? c.label}
      </div>
      <div className="text-sm leading-6 text-fg-soft [&_p]:mt-2 [&_p:first-child]:mt-0">{children}</div>
    </div>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface">
            {head.map((h, i) => (
              <th key={i} className="border-b border-border px-4 py-2.5 text-left font-semibold text-fg">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="even:bg-surface/50">
              {r.map((cell, j) => (
                <td key={j} className="border-b border-border px-4 py-2.5 align-top text-fg-soft last:border-0">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">
      {children}
    </kbd>
  );
}

// Inline code — also exported from CodeBlock; re-homed here so pages can import it
// alongside the other prose primitives from a single module.
export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-fg-soft">
      {children}
    </code>
  );
}
