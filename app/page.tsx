import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { Logo } from "@/components/Logo";
import { MODULES, TUTORIAL_PARTS } from "@/lib/nav";

const HERO_CODE = `import edgekit as ek

# load -> backtest -> PROVE -> (size -> ship, only if it survives)
bars   = ek.data.load_bars("US100_M1.csv")
rth    = bars[ek.data.rth_mask(bars.index)]            # Nasdaq cash session
trades = ek.strategy.ORB(or_bars=30, target_r=2.0).backtest(rth)
stats  = ek.trade_stats(trades.r, dates=trades.date)   # PF 0.71 · EV -0.21R

p = ek.validation.mcpt(trades.r.sum(), null_stat, n=1000)
print("REAL EDGE" if p < 0.01 else "rejected")         # -> rejected: dead after costs`;

const PIPELINE = [
  { n: "01", t: "Load", d: "OHLC from CSV/parquet, resample, RTH sessions, integrity-checked." },
  { n: "02", t: "Backtest", d: "Causal, gap-aware fills, cost in R. One position, one loop." },
  { n: "03", t: "Prove", d: "The gauntlet: permutation, walk-forward, cost-stress, is-it-beta." },
  { n: "04", t: "Size", d: "Risk-parity, CPPI, DD-throttle — sized to a drawdown budget." },
  { n: "05", t: "Ship", d: "Prop-firm sim + cloud-safe tree export to a live cBot." },
];

const FEATURES = [
  { t: "Causality is tested, not hoped", d: "Indicators are returned unlagged; you lag explicitly. Property tests perturb future bars and assert the past never moves — the look-ahead class of bug fails CI.", i: "⏱" },
  { t: "The permutation gauntlet", d: "Shuffle bar order to kill the trend, re-run, build a null. p < 0.01 = real edge. A no-edge strategy correctly scores non-significant — the test refuses to bless noise.", i: "🎲" },
  { t: "R-multiple is the currency", d: "Strategies emit trades priced in units of their own risk. Dollars come once, later, from a single sizing scalar — never baked into the signal.", i: "R" },
  { t: "Prop-firm ready", d: "Simulate FTMO / CryptoFundTrader / BrightFunded evaluations — pass-rate and days-to-pass by Monte-Carlo, sized to the exact drawdown rules.", i: "🎯" },
  { t: "Cloud-safe ML export", d: "Triple-barrier labels, purged walk-forward, then serialize trees to pure-Python/C# inference that matches sklearn within 1e-6 — no sklearn at runtime.", i: "🧠" },
  { t: "Self-contained reports", d: "One call renders a themed HTML report with equity curve, Monte-Carlo fan, and monthly heatmap — every image base64-inlined, zero external requests.", i: "📊" },
];

const STATS = [
  { k: "14", v: "modules" },
  { k: "99", v: "tests passing" },
  { k: "9-step", v: "validation gauntlet" },
  { k: "numpy+pandas", v: "lean core" },
];

// A theme-aware chart "shot": the light PNG in light mode, dark PNG in dark mode,
// framed like a little app window to match the code blocks.
function Shot({ id, label, className = "" }: { id: string; label?: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-surface shadow-sm ${className}`}>
      {label && (
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent/50" />
          <span className="ml-2 font-mono text-[11px] text-muted">{label}</span>
        </div>
      )}
      <div className="bg-white p-2 dark:bg-[#0d1117]">
        <img src={`/charts/${id}.light.png`} alt={label ?? id} loading="lazy" className="block h-auto w-full dark:hidden" />
        <img src={`/charts/${id}.dark.png`} alt={label ?? id} loading="lazy" className="hidden h-auto w-full dark:block" />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 h-[520px]" />
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted transition hover:border-accent/40"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              v0.1.0 · a systematic-trading research toolkit
            </Link>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-fg sm:text-6xl">Prove the edge.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted">
              edgekit takes a trading idea from raw bars to a validated, sized, deployable strategy — with a
              prime directive baked in: <span className="text-fg-soft">assume every edge is fake until proven otherwise.</span>
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/docs" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg shadow-sm transition hover:opacity-90">
                Get started →
              </Link>
              <Link href="/docs/concepts/gauntlet" className="rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-fg transition hover:border-border-strong">
                The gauntlet
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl items-start gap-4 lg:grid-cols-2">
            <CodeBlock code={HERO_CODE} filename="orb_gauntlet.py" />
            <Shot id="mc_fan" label="monte_carlo — forward paths" />
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.v} className="bg-bg px-4 py-5 text-center">
                <div className="font-mono text-2xl font-semibold text-accent">{s.k}</div>
                <div className="mt-1 text-xs text-muted">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* pipeline */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-muted">The pipeline</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.map((p) => (
            <div key={p.n} className="rounded-xl border border-border bg-surface p-5">
              <div className="font-mono text-xs text-accent">{p.n}</div>
              <div className="mt-2 text-base font-semibold text-fg">{p.t}</div>
              <div className="mt-1.5 text-sm leading-6 text-muted">{p.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.t} className="rounded-2xl border border-border bg-surface p-6 transition hover:border-accent/40">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-bg text-lg">{f.i}</div>
              <h3 className="mt-4 text-base font-semibold text-fg">{f.t}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* visualization showcase */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-fg">Charts that go straight into a report</h2>
          <p className="mt-3 text-muted">
            The <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-fg-soft">viz</code> module
            renders publication-quality charts in light or dark, and{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-fg-soft">tear_sheet()</code>{" "}
            assembles them into one self-contained HTML report. A few of them:
          </p>
        </div>
        <div className="mt-10 columns-1 gap-4 md:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
          <Shot id="equity_with_drawdown" label="equity_with_drawdown" />
          <Shot id="monthly_heatmap" label="monthly_heatmap" />
          <Shot id="permutation_hist" label="permutation_hist" />
          <Shot id="cost_sensitivity" label="cost_sensitivity" />
          <Shot id="mc_terminal_hist" label="mc_terminal_hist" />
          <Shot id="rolling_metrics" label="rolling_metrics" />
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/docs/gallery"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-fg transition hover:border-accent/50"
          >
            Browse the full gallery →
          </Link>
        </div>
      </section>

      {/* tutorials */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface p-8 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                New · Tutorial series
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-fg">Learn algorithmic trading, end to end</h2>
              <p className="mt-3 text-muted">
                A complete, math-grounded course — from what a market is, through the probability and statistics that
                decide whether an edge is real, to building, testing, simulating, and shipping strategies. Every idea is
                made concrete with edgekit.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/tutorials" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90">
                  Start the course →
                </Link>
                <Link href="/tutorials/monte-carlo" className="rounded-lg border border-border bg-bg px-5 py-2.5 text-sm font-semibold text-fg transition hover:border-border-strong">
                  Jump to Monte Carlo
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-[26rem]">
              {TUTORIAL_PARTS.map((p) => (
                <div key={p.part} className="rounded-xl border border-border bg-bg px-3 py-2.5">
                  <div className="font-mono text-xs text-accent">Part {p.part}</div>
                  <div className="mt-0.5 text-[13px] font-medium leading-5 text-fg-soft">{p.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* modules */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-fg">Fourteen composable modules</h2>
          <p className="mt-3 text-muted">
            One clean, tested package — replacing ~280 copy-pasted research scripts. Core is numpy + pandas;
            matplotlib, scikit-learn and friends are lazy extras.
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <Link key={m.slug} href={`/docs/api/${m.slug}`} className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-accent/50">
              <code className="rounded-md bg-accent-soft px-2 py-1 font-mono text-xs text-accent">{m.title}</code>
              <span className="text-sm leading-6 text-muted group-hover:text-fg-soft">{m.blurb}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* cta */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface p-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-fg">Start with a backtest you can trust.</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">Ten minutes to your first causally-validated result, permutation p-value and all.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/docs/quickstart" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90">Quickstart</Link>
            <Link href="/docs/api" className="rounded-lg border border-border bg-bg px-5 py-2.5 text-sm font-semibold text-fg transition hover:border-border-strong">API reference</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted sm:flex-row">
          <Logo />
          <p>A systematic-trading research toolkit · numpy + pandas core</p>
        </div>
      </footer>
    </div>
  );
}
