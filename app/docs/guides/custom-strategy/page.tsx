import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "A custom strategy" };

export default function CustomStrategyPage() {
  return (
    <>
      <H1>Writing a custom strategy</H1>
      <Lead>
        Every strategy in edgekit is three methods on a subclass of <Code>BaseStrategy</Code>:{" "}
        <Code>prepare</Code> precomputes causal indicator arrays, <Code>entry</Code> decides when to open, and{" "}
        <Code>exit</Code> decides when to close. The engine does the rest — position bookkeeping, gap-aware fills,
        pessimistic stops, and cost charged in R. This guide builds a complete strategy from scratch and runs it
        through the gauntlet.
      </Lead>

      <H2>The interface</H2>
      <P>
        <A href="/docs/api/strategy">BaseStrategy</A> is an ABC satisfying the engine&apos;s{" "}
        <A href="/docs/api/engine">Strategy protocol</A>. You implement three abstract methods and inherit the{" "}
        <Code>.backtest()</Code> wiring for free:
      </P>
      <CodeBlock
        code={`prepare(self, bars) -> dict                    # precompute causal arrays (the "P" dict), once
entry(self, bars, P, i) -> EntryIntent | None  # on a FLAT bar i: open a position, or None
exit(self, bars, P, pos, i) -> float | None    # on an IN-POSITION bar i: exit price, or None`}
      />
      <Ul>
        <Li>
          <Strong>prepare</Strong> runs once at the start of a backtest and returns the <Code>P</Code> dict of
          numpy arrays aligned to <Code>bars</Code>. This is where every indicator is computed — and{" "}
          <em>lagged</em>.
        </Li>
        <Li>
          <Strong>entry</Strong> is polled on each bar <Code>i</Code> while flat. Return an{" "}
          <A href="/docs/api/engine">EntryIntent</A>
          <Code>(direction, level, stop_dist)</Code> to open, or <Code>None</Code> to stay out.
        </Li>
        <Li>
          <Strong>exit</Strong> is polled on each bar while in a position (the current position is passed as{" "}
          <Code>pos</Code>). Return an exit price, or <Code>None</Code> to hold.
        </Li>
      </Ul>

      <Callout kind="warn" title="Causality is your responsibility in prepare()">
        Indicators from <Code>edgekit.indicators</Code> are computed <em>through bar i inclusive</em> — they are
        NOT lagged. If your <Code>entry</Code> reads <Code>P[&quot;ema&quot;][i]</Code> and that value already
        includes bar <Code>i</Code>&apos;s close, the backtest is reading the future. Always{" "}
        <Code>edgekit.core.lag(arr, 1)</Code> every indicator in <Code>prepare</Code> so that <Code>arr[i]</Code>{" "}
        reflects information only through bar <Code>i-1</Code>. Keeping the lag visible at the call site is the
        whole point of the design.
      </Callout>

      <H2>A complete worked example: EMA-cross breakout</H2>
      <P>
        A fast/slow EMA trend-follower: go long on a golden cross, short on a death cross, risk a fixed multiple
        of ATR, and exit when the trend flips or the stop is hit. Every array is lagged in <Code>prepare</Code>;
        every decision reads only lagged values.
      </P>
      <CodeBlock
        filename="ma_cross.py"
        code={`import numpy as np
from edgekit.strategy import BaseStrategy
from edgekit.engine import EntryIntent
from edgekit.core import lag
from edgekit import indicators as ind


class MACrossBreakout(BaseStrategy):
    name = "ma_cross"

    def __init__(self, fast: int = 20, slow: int = 100, atr_n: int = 20, stop_mult: float = 2.0):
        # tunables live in __init__ (never hard-coded in the loop) so the gauntlet can sweep them
        self.fast = fast
        self.slow = slow
        self.atr_n = atr_n
        self.stop_mult = stop_mult

    def prepare(self, bars) -> dict:
        o = bars["open"].to_numpy(float)
        h = bars["high"].to_numpy(float)
        l = bars["low"].to_numpy(float)
        c = bars["close"].to_numpy(float)
        # every indicator LAGGED by 1: arr[i] reflects info only through bar i-1
        return dict(
            o=o, h=h, l=l, c=c,
            fast=lag(ind.ema(c, self.fast), 1),
            slow=lag(ind.ema(c, self.slow), 1),
            atr=lag(ind.atr(h, l, c, self.atr_n), 1),
        )

    def entry(self, bars, P, i) -> EntryIntent | None:
        fast, slow, N = P["fast"], P["slow"], P["atr"]
        if not (np.isfinite(fast[i]) and np.isfinite(slow[i]) and np.isfinite(N[i]) and N[i] > 0):
            return None
        crossed_up = fast[i] > slow[i] and fast[i - 1] <= slow[i - 1]   # golden cross
        crossed_dn = fast[i] < slow[i] and fast[i - 1] >= slow[i - 1]   # death cross
        if crossed_up:
            d = 1
        elif crossed_dn:
            d = -1
        else:
            return None
        # level = this bar's open => a market entry (gap-aware fill collapses to the open);
        # risk one 'stop_mult * ATR' as the R denominator.
        return EntryIntent(direction=d, level=P["o"][i], stop_dist=self.stop_mult * N[i])

    def exit(self, bars, P, pos, i) -> float | None:
        o, h, l = P["o"], P["h"], P["l"]
        fast, slow = P["fast"], P["slow"]
        d = pos["d"]
        if d > 0:
            if l[i] <= pos["stop"]:            # hard stop touched intrabar
                return min(pos["stop"], o[i])  # pessimistic + gap-aware fill
            if fast[i] < slow[i]:              # trend flipped -> flatten at the open
                return o[i]
        else:
            if h[i] >= pos["stop"]:
                return max(pos["stop"], o[i])
            if fast[i] > slow[i]:
                return o[i]
        return None`}
      />

      <H3>The pos dict</H3>
      <P>
        <Code>exit</Code> receives the live position the engine is tracking. The keys you can read:
      </P>
      <Table
        head={["Key", "Meaning"]}
        rows={[
          [<Code key="d">pos["d"]</Code>, "direction, +1 / -1"],
          [<Code key="e">pos["e"]</Code>, "the actual (gap-aware) entry fill price"],
          [<Code key="s">pos["stop"]</Code>, <span key="ss">the stop price, computed by the engine as <Code>e - d * stop_dist</Code></span>],
          [<Code key="r">pos["rpx"]</Code>, "the stop distance in price units (1R)"],
          [<Code key="i">pos["ei"]</Code>, "the bar index the position opened on"],
        ]}
      />
      <P>
        You do not set the stop yourself — you supplied <Code>stop_dist</Code> in the{" "}
        <Code>EntryIntent</Code> and the engine turned it into a stop price. Your <Code>exit</Code> just checks
        whether the bar reached it.
      </P>

      <H2>How the engine applies fills and cost</H2>
      <P>
        <A href="/docs/api/engine">run_bar_loop</A> is the workhorse behind <Code>.backtest()</Code>. Walking one
        bar at a time, one position at a time:
      </P>
      <Ul>
        <Li>
          <Strong>Entry fill is gap-aware.</Strong> For a long, <Code>entry = max(level, open)</Code> — a market
          that gaps through your trigger fills at the (worse) open, never the stale level. Shorts mirror with{" "}
          <Code>min</Code>. Passing <Code>level = open</Code> (as above) makes it a clean market fill; passing a
          breakout price makes it a stop-entry.
        </Li>
        <Li>
          <Strong>Stops are pessimistic.</Strong> When your <Code>exit</Code> returns a stop price, gap-through is
          filled at the worse of stop and open. When a bar could have hit both stop and target, edgekit takes the
          loss.
        </Li>
        <Li>
          <Strong>Cost is charged in R.</Strong> Each trade&apos;s spread + swap (from the{" "}
          <A href="/docs/api/costs">CostModel</A>) is converted to R via its own stop distance and days held
          (<Code>bars_per_day</Code> converts bars → days), then subtracted. The <Code>r</Code> column is always
          net.
        </Li>
      </Ul>

      <H2>Run it</H2>
      <CodeBlock
        code={`import edgekit as ek

bars = ek.data.resample_ohlcv(ek.data.load_bars("US100_M1.csv"), "4h")

strat = MACrossBreakout(fast=20, slow=100, stop_mult=2.0)
trades = strat.backtest(bars, warmup=210, bars_per_day=6)   # H4 => 6 bars/day
stats = ek.trade_stats(trades.r.to_numpy(), dates=trades.date)
print(f"{stats['n']} trades | PF {stats['pf']:.2f} | EV {stats['ev_r']:+.3f}R | MAR {stats['mar']:.2f}")`}
      />
      <P>
        <Code>warmup</Code> skips the leading bars where your longest indicator is still NaN (100-EMA needs a run
        of history); <Code>bars_per_day</Code> must match the timeframe (H4 = 6, daily = 1, a 5-min session = 48
        per RTH day) so the swap cost is right.
      </P>

      <H2>Then prove it — the same gauntlet</H2>
      <P>
        A custom strategy earns no trust until it survives the exact battery every candidate faces. Because your
        class satisfies the same interface, the null test is a two-line change from the{" "}
        <A href="/docs/guides/proving-an-edge">proving-an-edge</A> guide:
      </P>
      <CodeBlock
        code={`import numpy as np, pandas as pd
from edgekit.core import bootstrap_rng

o, h, l, c = (bars[x].to_numpy(float) for x in ("open", "high", "low", "close"))
idx = bars.index

def null_stat(rng):
    po, ph, pl, pc = ek.validation.permute_ohlc(o, h, l, c, rng)
    shuffled = pd.DataFrame({"open": po, "high": ph, "low": pl, "close": pc}, index=idx)
    t = strat.backtest(shuffled)          # YOUR strategy on permuted bars
    return float(t.r.sum()) if len(t) else 0.0

p = ek.validation.mcpt(float(trades.r.sum()), null_stat, n=100, rng=bootstrap_rng())
print(f"permutation p = {p:.4f}")         # p < 0.01 or it does not ship`}
      />
      <Callout kind="danger" title="Most custom strategies die here — that is the point">
        The permutation test is unforgiving, and it should be. If your EMA-cross returns <Code>p = 0.4</Code>, you
        have found noise, not an edge. Do not tune parameters until the number drops — that is the overfitting the
        gauntlet exists to catch. Kill it and move on.
      </Callout>

      <H2>Next</H2>
      <Ul>
        <Li><A href="/docs/api/strategy">API · strategy</A> — BaseStrategy and the built-in strategy zoo.</Li>
        <Li><A href="/docs/api/engine">API · engine</A> — run_bar_loop, EntryIntent, fill_entry / fill_stop.</Li>
        <Li><A href="/docs/concepts/causality">Causality</A> — the lag discipline that keeps a backtest honest.</Li>
        <Li><A href="/docs/guides/proving-an-edge">Proving an edge</A> — the full gauntlet your strategy must pass.</Li>
      </Ul>
    </>
  );
}
