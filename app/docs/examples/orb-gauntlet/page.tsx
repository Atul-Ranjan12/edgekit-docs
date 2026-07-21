import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "The ORB gauntlet" };

const SCRIPT = `import edgekit as ek
import numpy as np
import pandas as pd

# 1. load Nasdaq M1 and keep the regular cash session (09:30-16:00 New York)
bars = ek.data.load_bars("US100_M1.csv")
rth = bars[ek.data.rth_mask(bars.index, start="09:30", end="16:00", tz="America/New_York")]

# 2. bare opening-range breakout: 30-min OR, stop at the opposite edge, 2R target, 1 trade/day
orb = ek.strategy.ORB(or_bars=30, target_r=2.0)
trades = orb.backtest(rth, warmup=5, bars_per_day=390)
stats = ek.trade_stats(trades.r, dates=trades.date)
print(f"{stats['n']} trades | win {stats['win_rate']:.0%} | "
      f"PF {stats['pf']:.2f} | EV {stats['ev_r']:+.3f}R")

# 3. PROVE it — does the breakout beat shuffled bars?
o, h, l, c = (rth[x].to_numpy(float) for x in ("open", "high", "low", "close"))
idx = rth.index
def null_stat(rng):
    po, ph, pl, pc = ek.validation.permute_ohlc(o, h, l, c, rng)
    sh = pd.DataFrame({"open": po, "high": ph, "low": pl, "close": pc}, index=idx)
    t = orb.backtest(sh, warmup=5, bars_per_day=390)
    return float(t.r.sum()) if len(t) else 0.0
p = ek.validation.mcpt(float(trades.r.sum()), null_stat, n=60)

# 4. cost stress x1/x2/x3
for m in (1.0, 2.0, 3.0):
    t = orb.backtest(rth, cost=ek.CostModel().scaled(m), warmup=5, bars_per_day=390)
    s = ek.trade_stats(t.r)
    print(f"  {m:.0f}x -> PF {s['pf']:.2f}  EV {s['ev_r']:+.3f}R")`;

const OUTPUT = `loaded 2,282,839 M1 bars 2015-12-15 -> 2026-06-11
RTH bars: 987,460

2666 trades | win 39% | PF 0.71 | EV -0.214R
cost stress:
  1x -> PF 0.71  EV -0.214R
  2x -> PF 0.45  EV -0.500R
  3x -> PF 0.29  EV -0.786R`;

export default function OrbGauntletPage() {
  return (
    <>
      <H1>The ORB gauntlet</H1>
      <Lead>
        A full, annotated walkthrough on real data — and a deliberate <em>negative</em> result. We take a famous,
        intuitive strategy, the opening-range breakout, and watch the gauntlet reject it. This is the library doing
        its actual job: most candidates should be killed.
      </Lead>

      <Callout kind="note" title="Why a losing example?">
        Examples exist to demonstrate the <em>tooling</em>, not to hand out alpha. The bare ORB is perfect for that —
        it looks tradeable, everyone knows it, and it fails honestly once you price in costs. &ldquo;Prove the
        edge&rdquo; cuts both ways.
      </Callout>

      <H2>The strategy</H2>
      <P>
        Each session&apos;s first 30 minutes define an opening range. A break of the range high goes long, a break of
        the low goes short, with the stop parked at the opposite edge — so the range width <em>is</em> 1R. The
        position targets 2R and is flattened at the end of the session. One trade per day. It is a pure, unfiltered
        breakout: no meta-label, no regime gate — exactly the naive version you want to stress-test.
      </P>

      <H2>The script</H2>
      <P>End to end: load, backtest, permutation-test, cost-stress. This runs as written on Nasdaq (US100) M1 data.</P>
      <CodeBlock filename="orb_gauntlet.py" code={SCRIPT} />

      <H2>What it prints</H2>
      <CodeBlock lang="text" code={OUTPUT} />

      <H2>Reading the result</H2>
      <Table
        head={["Metric", "Value", "Verdict"]}
        rows={[
          ["Trades", "2,666 (~254/yr)", "well-powered — not a small-sample fluke"],
          ["Win rate", "39%", "low, as breakouts run"],
          ["Profit factor", "0.71", "below 1 — it loses money"],
          ["Expectancy", "−0.214R / trade", "negative after costs"],
          ["PF at 2× / 3× cost", "0.45 / 0.29", "collapses under cost stress"],
        ]}
      />
      <P>
        The verdict is unambiguous: <Strong>the bare ORB is net-negative after costs (PF 0.71), and it degrades
        further as costs rise.</Strong> It never even reaches a positive expectancy to defend, so it fails the
        gauntlet at step 2 (realistic costs). No amount of sizing or portfolio dressing rescues a negative edge.
      </P>

      <Callout kind="tip" title="A subtle, honest nuance">
        Interestingly, the strategy&apos;s <em>entry timing</em> beats random-entry shuffles — on permuted bars the
        first-touch breakout whipsaws and loses even more, so the permutation p on total R is low. But that is not an
        edge: beating a coin-flip is not enough, you have to beat the <em>spread</em>. The breakout captures a faint
        real tendency that the transaction cost more than eats. This is exactly the trap the gauntlet is built to
        expose.
      </Callout>

      <H2>What would come next</H2>
      <P>
        In real research this is where you&apos;d stop and either discard the idea or look for what turns a faint
        tendency into a tradeable edge — a filter, a meta-label, a different session. edgekit gives you the pieces
        (<A href="/docs/api/ml">edgekit.ml</A> for meta-labeling, <A href="/docs/api/validation">validation</A> for
        the rest of the gauntlet) — but it will never tell you a losing strategy is a winner.
      </P>

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/concepts/gauntlet">The validation gauntlet</A> — the nine steps in full.</Li>
        <Li><A href="/docs/guides/proving-an-edge">Proving an edge</A> — the same tools, as a how-to.</Li>
        <Li><A href="/docs/api/strategy">edgekit.strategy</A> — the ORB class and the rest of the zoo.</Li>
      </Ul>
    </>
  );
}
