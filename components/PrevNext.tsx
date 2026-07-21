"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { neighbors } from "@/lib/nav";

export function PrevNext() {
  const pathname = usePathname();
  const { prev, next } = neighbors(pathname);
  if (!prev && !next) return null;
  return (
    <div className="mt-16 grid grid-cols-2 gap-4 border-t border-border pt-8">
      {prev ? (
        <Link href={prev.href} className="group rounded-xl border border-border p-4 transition hover:border-accent/50 hover:bg-surface">
          <div className="text-xs text-muted">← Previous</div>
          <div className="mt-1 font-medium text-fg group-hover:text-accent">{prev.title}</div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link href={next.href} className="group rounded-xl border border-border p-4 text-right transition hover:border-accent/50 hover:bg-surface">
          <div className="text-xs text-muted">Next →</div>
          <div className="mt-1 font-medium text-fg group-hover:text-accent">{next.title}</div>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
