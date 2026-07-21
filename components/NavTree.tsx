"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DOCS_NAV, type NavSection } from "@/lib/nav";

function Items({ section, pathname, onNavigate }: { section: NavSection; pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {section.items.map((item) => {
        const active = pathname === item.href;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`flex items-start gap-2 rounded-lg px-3 py-1.5 text-left text-sm leading-5 transition ${
                active ? "bg-accent-soft font-medium text-fg" : "text-muted hover:bg-surface hover:text-fg"
              }`}
            >
              <span className={`flex-1 min-w-0 ${item.href.startsWith("/docs/api/") && item.title !== "Overview" ? "font-mono text-[13px]" : ""}`}>
                {item.title}
              </span>
              {item.badge && (
                <span className="mt-0.5 shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">{item.badge}</span>
              )}
              {active && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function CollapsibleSection({ section, pathname, onNavigate }: { section: NavSection; pathname: string; onNavigate?: () => void }) {
  const hasActive = section.items.some((i) => i.href === pathname);
  const [open, setOpen] = useState(hasActive);
  const show = open || hasActive;
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center gap-2 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted transition hover:text-fg"
      >
        <span className="flex-1 text-left">{section.title}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`shrink-0 transition-transform ${show ? "rotate-90" : ""}`}
        >
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {show && <Items section={section} pathname={pathname} onNavigate={onNavigate} />}
    </div>
  );
}

export function NavTree({ sections = DOCS_NAV, onNavigate }: { sections?: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-7">
      {sections.map((section) =>
        section.collapsible ? (
          <CollapsibleSection key={section.title} section={section} pathname={pathname} onNavigate={onNavigate} />
        ) : (
          <div key={section.title}>
            <div className="mb-2 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">{section.title}</div>
            <Items section={section} pathname={pathname} onNavigate={onNavigate} />
          </div>
        ),
      )}
    </nav>
  );
}
