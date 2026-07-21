"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { SearchButton } from "./Search";
import { ThemeToggle } from "./ThemeToggle";
import { NavTree } from "./NavTree";
import { Portal } from "./Portal";
import { DOCS_NAV, TUTORIAL_NAV } from "@/lib/nav";

const GITHUB = "https://github.com/Atul-Ranjan12/edgekit";

const PRIMARY = [
  { label: "Docs", href: "/docs" },
  { label: "Tutorials", href: "/tutorials" },
  { label: "API", href: "/docs/api" },
  { label: "Examples", href: "/docs/examples/orb-gauntlet" },
];

export function TopNav() {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  const isTut = pathname.startsWith("/tutorials");

  useEffect(() => setDrawer(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-4 px-4 sm:px-6">
        <button
          onClick={() => setDrawer(true)}
          aria-label="Open menu"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Logo />
        <span className="ml-1 hidden rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted sm:inline">v0.1.0</span>

        <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
          <Link href="/docs" className="rounded-lg px-3 py-1.5 text-fg-soft hover:bg-surface">Docs</Link>
          <Link href="/tutorials" className={`rounded-lg px-3 py-1.5 hover:bg-surface ${isTut ? "font-medium text-accent" : "text-fg-soft"}`}>Tutorials</Link>
          <Link href="/docs/api" className="rounded-lg px-3 py-1.5 text-fg-soft hover:bg-surface">API</Link>
          <Link href="/docs/examples/orb-gauntlet" className="rounded-lg px-3 py-1.5 text-fg-soft hover:bg-surface">Examples</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SearchButton />
          <ThemeToggle />
          <Link
            href={GITHUB}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition hover:border-border-strong hover:text-fg"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.75.81 1.2 1.84 1.2 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.05.78 2.12v3.14c0 .31.2.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* mobile drawer — portaled to <body> so the blurred header doesn't clip it */}
      {drawer && (
        <Portal>
          <div className="fixed inset-0 z-[100] lg:hidden" onClick={() => setDrawer(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto border-r border-border bg-bg p-4" onClick={(e) => e.stopPropagation()}>
              <div className="mb-5 flex items-center justify-between">
                <Logo />
                <button onClick={() => setDrawer(false)} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted">✕</button>
              </div>

              {/* top-level section switcher — the primary links are hidden on mobile, so surface them here */}
              <div className="mb-5 grid grid-cols-2 gap-2">
                {PRIMARY.map((p) => {
                  const active = p.href === "/tutorials" ? isTut : !isTut && pathname.startsWith(p.href);
                  return (
                    <Link
                      key={p.href}
                      href={p.href}
                      onClick={() => setDrawer(false)}
                      className={`rounded-lg border px-3 py-2 text-center text-sm font-medium transition ${
                        active ? "border-accent/40 bg-accent-soft text-accent" : "border-border text-fg-soft hover:border-border-strong"
                      }`}
                    >
                      {p.label}
                    </Link>
                  );
                })}
                <Link
                  href={GITHUB}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setDrawer(false)}
                  className="col-span-2 rounded-lg border border-border px-3 py-2 text-center text-sm font-medium text-fg-soft transition hover:border-border-strong"
                >
                  GitHub ↗
                </Link>
              </div>

              <div className="mb-2 border-t border-border pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {isTut ? "Tutorials" : "Documentation"}
              </div>
              <NavTree sections={isTut ? TUTORIAL_NAV : DOCS_NAV} onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        </Portal>
      )}
    </header>
  );
}
