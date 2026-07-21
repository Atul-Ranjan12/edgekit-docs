"use client";

import { useEffect, useState } from "react";

type Head = { id: string; text: string; level: number };

export function Toc() {
  const [heads, setHeads] = useState<Head[]>([]);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("article h2[id], article h3[id]"));
    setHeads(nodes.map((n) => ({ id: n.id, text: n.textContent?.replace(/#$/, "") ?? "", level: n.tagName === "H2" ? 2 : 3 })));

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  if (heads.length === 0) return null;

  return (
    <div className="sticky top-20">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">On this page</div>
      <ul className="space-y-1.5 border-l border-border">
        {heads.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`-ml-px block border-l-2 py-0.5 text-[13px] leading-5 transition ${
                h.level === 3 ? "pl-6" : "pl-4"
              } ${active === h.id ? "border-accent font-medium text-accent" : "border-transparent text-muted hover:text-fg"}`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
