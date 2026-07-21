import type { Metadata } from "next";
import Link from "next/link";
import { H1, H2, P, Lead, Callout } from "@/components/prose";
import { MathInline } from "@/components/Math";
import { TUTORIAL_PARTS } from "@/lib/nav";

export const metadata: Metadata = { title: "Tutorials — algorithmic trading" };

export default function TutorialsIndex() {
  return (
    <>
      <H1>Algorithmic trading, end to end</H1>
      <Lead>
        A complete, math-grounded course: from what a market even is, through the probability and statistics that
        decide whether an edge is real, to building, testing, simulating, and shipping strategies. Every idea is made
        concrete with edgekit.
      </Lead>

      <P>
        The series is built around one belief — most apparent edges are noise, so the skill that matters is{" "}
        <em>testing</em>. You&apos;ll learn the tools to tell a real edge from a lucky backtest: expectancy{" "}
        <MathInline>{"E[R] = p\\,W - (1-p)\\,L"}</MathInline>, the permutation test, walk-forward analysis, and Monte
        Carlo. Work through it in order, or jump to a topic.
      </P>

      <Callout kind="note" title="How to read this">
        Chapters build on each other and are cross-linked with prev/next. Parts II and IV are the mathematical core;
        each math result is paired with a simulation and a runnable edgekit snippet so it never stays abstract.
      </Callout>

      {TUTORIAL_PARTS.map((part) => (
        <section key={part.part}>
          <H2>{`Part ${part.part} — ${part.title}`}</H2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {part.chapters.map((c, i) => (
              <Link
                key={c.slug}
                href={`/tutorials/${c.slug}`}
                className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-accent/50"
              >
                <span className="mt-0.5 inline-flex h-7 min-w-[2.25rem] flex-none items-center justify-center rounded-lg border border-border bg-bg px-1.5 font-mono text-[11px] text-accent">
                  {part.part}.{i + 1}
                </span>
                <span className="text-sm font-medium leading-6 text-fg-soft group-hover:text-fg">{c.title}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
