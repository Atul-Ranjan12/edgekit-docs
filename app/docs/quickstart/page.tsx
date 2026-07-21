import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Code } from "@/components/prose";

export const metadata: Metadata = { title: "Quickstart" };

export default function QuickstartPage() {
  return (
    <>
      <H1>Quickstart</H1>
      <Lead>
        Take a famous, intuitive strategy — the opening-range breakout — from raw 1-minute bars through the
        gauntlet, and watch it get <Strong>rejected</Strong>. Every call below is the real public API, and
        the numbers are the ones the canonical example prints on Nasdaq. Examples exist to show the library,
        not to hand out alpha.
      </Lead>

      <P>
        The shape of the code mirrors the pipeline it implements:{" "}
        <Strong>load → backtest → prove → size → ship.</Strong> We build it one step at a time, then paste
        the whole thing together at the end. Make sure edgekit is{" "}
        <A href="/docs/installation">installed</A> first; the lean core is enough for the whole run.
      </P>

      <Callout kind="note" title="Why a losing strategy?">
        The ORB <em>looks</em> tradeable — a plausible, well-known pattern. That is exactly why it is the
        perfect demo: the gauntlet prices in real costs and kills it. &quot;Prove the edge&quot; cuts both
        ways, and most candidates should be killed. A quickstart that ended in a winning number would be
        teaching you to trust backtests — the opposite of the point.
      </Callout>

      <H2>1. Load and slice to the session</H2>
      <P>
        <A href="/docs/api/data"><Code>data.load_bars</Code></A> reads a HistoryExporter CSV (or a{" "}
        <Code>.parquet</Code> split) into the OHLC contract: a tz-naive UTC <Code>DatetimeIndex</Code> with
        float <Code>open/high/low/close</Code> columns. The ORB is an intraday strategy, so instead of
        resampling we keep the raw 1-minute bars and mask to the regular cash session with{" "}
        <A href="/docs/api/data"><Code>data.rth_mask</Code></A> — DST-correct, 09:30–16:00 New York, so the
        opening range is anchored to the real Nasdaq open.
      </P>

      <CodeBlock
        filename="quickstart.py"
        code={`import edgekit as ek

# load Nasdaq M1, keep the regular cash session (09:30-16:00 New York)
bars = ek.data.load_bars("US100_M1.csv")
rth  = bars[ek.data.rth_mask(bars.index, start="09:30", end="16:00", tz="America/New_York")]
print(f"{len(rth):,} RTH bars  {rth.index[0].date()} -> {rth.index[-1].date()}")`}
      />

      <H2>2. Run the causal backtest</H2>
      <P>
        <A href="/docs/api/strategy"><Code>strategy.ORB</Code></A> is the raw opening-range breakout: each
        session&rsquo;s first <Code>or_bars</Code> minutes define a range, a break of its high goes long / its
        low goes short, the stop sits at the opposite edge (so the range width <em>is</em> 1R), and the
        position is flattened at a <Code>target_r</Code> multiple or at the close — one trade per day.{" "}
        <Code>.backtest()</Code> runs the bar loop with gap-aware fills, pessimistic stops, and cost charged
        in R, returning the canonical trade frame (one row per closed round-trip, net R in the <Code>r</Code>{" "}
        column). It is intraday, so <Code>warmup</Code> is small and <Code>bars_per_day=390</Code> (M1 bars
        in an RTH session) converts hold-in-bars to days for the swap cost.
      </P>

      <CodeBlock
        filename="quickstart.py"
        code={`# 30-minute opening range, 2R target, stop at the opposite edge, one trade/day
orb    = ek.strategy.ORB(or_bars=30, target_r=2.0)
trades = orb.backtest(rth, warmup=5, bars_per_day=390)   # 390 M1 bars per RTH session
stats  = ek.trade_stats(trades.r.to_numpy(), dates=trades.date)

print(f"{len(trades)} trades | win {stats['win_rate']:.0%} | PF {stats['pf']:.2f} "
      f"| EV {stats['ev_r']:+.3f}R")
# 2666 trades | win 39% | PF 0.71 | EV -0.214R`}
      />

      <P>
        <A href="/docs/api/metrics"><Code>trade_stats</Code></A> is the universal per-trade summary in
        R-space. Passing <Code>dates</Code> (the exit dates) unlocks the annualised metrics. On US100 M1 from
        2015–2026 the ORB prints <Strong>2,666 trades, PF 0.71, EV −0.214R</Strong> — a profit factor below
        1 and a negative expectancy. The number is already bad, but we run the rest of the gauntlet anyway to
        understand <em>why</em>, because a below-1 headline is not always the whole story.
      </P>

      <H2>3. Prove it with a permutation test</H2>
      <P>
        The decisive structural question: is the strategy&rsquo;s timing distinguishable from random, or is
        it just noise? The Monte-Carlo permutation test answers it.{" "}
        <A href="/docs/api/validation"><Code>validation.permute_ohlc</Code></A> decomposes each bar into
        gap / high / low / close increments and applies one shared shuffle — destroying trends and
        autocorrelation while preserving the return marginal and bar shapes. We re-run the <em>same</em>{" "}
        strategy on each permuted series to build the null distribution, then{" "}
        <A href="/docs/api/validation"><Code>validation.mcpt</Code></A> counts how often the null matches or
        beats the real total R.
      </P>

      <CodeBlock
        filename="quickstart.py"
        code={`import numpy as np, pandas as pd

o, h, l, c = (rth[x].to_numpy(float) for x in ("open", "high", "low", "close"))
idx = rth.index

def null_stat(rng):
    po, ph, pl, pc = ek.validation.permute_ohlc(o, h, l, c, rng)
    shuffled = pd.DataFrame({"open": po, "high": ph, "low": pl, "close": pc}, index=idx)
    t = orb.backtest(shuffled, warmup=5, bars_per_day=390)
    return float(t.r.sum()) if len(t) else 0.0

p = ek.validation.mcpt(float(trades.r.sum()), null_stat, n=1000)
print(f"permutation test: p = {p:.4f}")   # low p: the timing beats random...`}
      />

      <P>
        Here is the subtle part, and the whole reason the ORB makes a good teaching case: the permutation
        p on total R comes out <em>low</em>. The real breakout&rsquo;s entry timing genuinely beats
        random-entry shuffles — it is not pure noise. And yet the strategy still <Strong>loses money</Strong>{" "}
        (PF 0.71). The permutation test asks &quot;is the timing structure real?&quot;, not &quot;does it
        make money net of what it costs to trade?&quot;. Beating a coin-flip is not the same as beating the
        spread.
      </P>

      <Callout kind="warn" title="A low p is necessary, not sufficient">
        A significant permutation result clears one gate — the timing is non-random — but it does not bless
        the strategy. You still have to survive realistic costs, and that is the gate this candidate fails.
        Never read <Code>p &lt; 0.01</Code> as &quot;profitable&quot;; read it as &quot;not obviously
        noise, keep testing.&quot;
      </Callout>

      <H2>4. Cost-stress — where it actually dies</H2>
      <P>
        Re-running at 1×, 2× and 3× assumed cost is the graceful-degradation check: a real edge bends, a
        fake one breaks. <Code>CostModel().scaled(mult)</Code> escalates the spread and swap. The ORB never
        clears a profit factor of 1 — not even at nominal cost — and collapses as cost climbs. This is the
        realistic-cost gate (gauntlet step 2), and it is where the candidate is rejected: you never bank a
        positive expectancy to size in the first place.
      </P>

      <CodeBlock
        filename="quickstart.py"
        code={`for mult in (1.0, 2.0, 3.0):
    t = orb.backtest(rth, cost=ek.CostModel().scaled(mult), warmup=5, bars_per_day=390)
    s = ek.trade_stats(t.r.to_numpy())
    print(f"  {mult:.0f}x -> PF {s['pf']:.2f}")
#   1x -> PF 0.71   2x -> PF 0.45   3x -> PF 0.29   (below 1 at every level -> dead)`}
      />

      <Callout kind="danger" title="This is the gate — stop here">
        Because the ORB fails the realistic-cost check, there is nothing downstream to do: you do{" "}
        <em>not</em> size it, and you do not ship it. Sizing an unproven backtest just risks real money on
        noise. The correct output of this quickstart is a <em>rejection</em>, recorded honestly.
      </Callout>

      <H2>5. Record the verdict in a report</H2>
      <P>
        A rejected strategy still earns a report — the point of the library is an honest record of what you
        tested and why it died. <A href="/docs/api/report"><Code>report.Report</Code></A> assembles a
        self-contained HTML page (CSS and every chart inlined as base64, zero external requests). It needs
        the <Code>[viz]</Code> extra.
      </P>

      <CodeBlock
        filename="quickstart.py"
        code={`verdict = "REJECTED - net-negative after costs" if stats["pf"] <= 1 else "survives"
(ek.report.Report("ORB - edgekit gauntlet", meta="US100 M1 - 30-min opening range")
    .kpi_row([("PF", f"{stats['pf']:.2f}", f"win {stats['win_rate']:.0%}"),
              ("EV", f"{stats['ev_r']:+.3f}R", f"{len(trades)} trades"),
              ("Perm p", f"{p:.3f}", "timing beats random"),
              ("Cost x3", "PF 0.29", verdict)])
    .caveat("Timing is non-random, but PF < 1 at every cost level. Not tradeable.")
    .write("orb_report.html"))`}
      />

      <H2>The whole thing</H2>
      <P>
        Here is the full script, adapted from <Code>examples/orb_gauntlet.py</Code> — the canonical
        end-to-end recipe that doubles as an integration smoke test. It exercises strategy + engine +
        metrics + validation + costs + report together on real data, and it ends in a rejection.
      </P>

      <CodeBlock
        filename="orb_gauntlet.py"
        code={`import numpy as np
import pandas as pd
import edgekit as ek

# 1) load Nasdaq M1 and keep the regular cash session (09:30-16:00 New York)
bars = ek.data.load_bars("US100_M1.csv")
rth  = bars[ek.data.rth_mask(bars.index, start="09:30", end="16:00", tz="America/New_York")]

# 2) causal backtest: 30-min opening range, 2R target, stop at the opposite edge
orb    = ek.strategy.ORB(or_bars=30, target_r=2.0)
trades = orb.backtest(rth, warmup=5, bars_per_day=390)
stats  = ek.trade_stats(trades.r.to_numpy(), dates=trades.date)
print(f"{len(trades)} trades | win {stats['win_rate']:.0%} | PF {stats['pf']:.2f} "
      f"| EV {stats['ev_r']:+.3f}R")     # 2666 | PF 0.71 | EV -0.214R

# 3) PROVE it -- Monte-Carlo permutation test (structure, not profitability)
o, h, l, c = (rth[x].to_numpy(float) for x in ("open", "high", "low", "close"))
idx = rth.index

def null_stat(rng):
    po, ph, pl, pc = ek.validation.permute_ohlc(o, h, l, c, rng)
    shuffled = pd.DataFrame({"open": po, "high": ph, "low": pl, "close": pc}, index=idx)
    t = orb.backtest(shuffled, warmup=5, bars_per_day=390)
    return float(t.r.sum()) if len(t) else 0.0

p = ek.validation.mcpt(float(trades.r.sum()), null_stat, n=1000)
print(f"permutation: p = {p:.4f}  ->  timing beats random, but see the cost gate")

# 4) cost-stress x1/x2/x3 -- the gate it fails
for mult in (1.0, 2.0, 3.0):
    s = ek.trade_stats(orb.backtest(rth, cost=ek.CostModel().scaled(mult),
                                    warmup=5, bars_per_day=390).r.to_numpy())
    print(f"  {mult:.0f}x -> PF {s['pf']:.2f}")   # 0.71 / 0.45 / 0.29 -> never above 1

# 5) record the verdict -- REJECTED, not sized, not shipped
(ek.report.Report("ORB - edgekit gauntlet", meta="US100 M1 - 30-min opening range")
    .kpi_row([("PF", f"{stats['pf']:.2f}", f"win {stats['win_rate']:.0%}"),
              ("EV", f"{stats['ev_r']:+.3f}R", f"{len(trades)} trades"),
              ("Perm p", f"{p:.3f}", "timing beats random"),
              ("Cost x3", "PF 0.29", "REJECTED")])
    .caveat("Timing is non-random, but PF < 1 at every cost level. Not tradeable.")
    .write("orb_report.html"))`}
      />

      <H2>Where to go next</H2>
      <Ul>
        <Li><A href="/docs/examples/orb-gauntlet">The ORB gauntlet</A> — this example in full, and the honest nuance of a strategy whose timing beats random yet still loses to costs.</Li>
        <Li><A href="/docs/pipeline">The pipeline</A> — each stage above in depth, and why the order is load → backtest → prove → size → ship.</Li>
        <Li><A href="/docs/concepts/gauntlet">The validation gauntlet</A> — walk-forward, regime splits, PBO, deflated Sharpe and is-it-beta beyond the permutation test.</Li>
        <Li><A href="/docs/guides/first-backtest">Guide: your first backtest</A> — a fuller walkthrough on your own data.</Li>
        <Li><A href="/docs/api">API reference</A> — every public function, module by module.</Li>
      </Ul>
    </>
  );
}
