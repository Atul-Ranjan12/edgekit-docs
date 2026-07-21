import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.strategy" };

export default function StrategyPage() {
  return (
    <>
      <H1>edgekit.strategy</H1>
      <Lead>
        Small, illustrative strategy templates expressed against the causal <Code>Strategy</Code> interface. Each
        subclasses <Code>BaseStrategy</Code>: <Code>prepare</Code> builds lagged indicator arrays,{" "}
        <Code>entry</Code>/<Code>exit</Code> make per-bar decisions, and <Code>.backtest(bars)</Code> runs the
        R-multiple bar loop. Bring your own strategy by subclassing the base.
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> The abstract base <Code>BaseStrategy</Code>, plus two concrete templates:{" "}
        <Code>ORB</Code> (an intraday opening-range breakout) and <Code>SmaCross</Code> (a fast/slow moving-average
        crossover). Both are plain textbook demos built on the same interface.
      </P>

      <Callout kind="note" title="These are demonstrations, not signals">
        The bundled strategies exist to exercise the engine and the gauntlet — they are illustrative, not tuned edges
        (unfiltered, they are typically net-negative after costs). The workflow is always: implement a candidate, then
        put it through <A href="/docs/concepts/gauntlet">the gauntlet</A>. Most candidates should be rejected (see{" "}
        <A href="/docs/examples/orb-gauntlet">the ORB example</A>).
      </Callout>

      <H2>BaseStrategy (ABC)</H2>
      <P>
        The abstract base implementing the engine&apos;s <Code>Strategy</Code> protocol. Subclasses set a{" "}
        <Code>name</Code> and implement three methods; they inherit the one-line backtest wiring.
      </P>
      <CodeBlock code={`prepare(self, bars) -> dict                        # precompute causal indicator arrays (the P dict)
entry(self, bars, P, i) -> EntryIntent | None      # entry decision on a flat bar i
exit(self, bars, P, pos, i) -> float | None        # exit price on an in-position bar i`} />
      <P>The inherited convenience method runs the strategy through <Code>run_bar_loop</Code> and returns the canonical trade DataFrame priced in R:</P>
      <CodeBlock code={`backtest(self, bars, cost: CostModel | None = None, warmup: int = 210,
         bars_per_day: float = 6.0) -> pd.DataFrame`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">bars</Code>, "pd.DataFrame", "—", "OHLC frame (tz-naive UTC DatetimeIndex, float open/high/low/close)."],
          [<Code key="b">cost</Code>, "CostModel | None", "None", "Cost model; default = the library convention (12 bps round-trip + 2 bps/day)."],
          [<Code key="c">warmup</Code>, "int", "210", "Bars to skip before trading (indicator warmup)."],
          [<Code key="d">bars_per_day</Code>, "float", "6.0", "Converts hold-in-bars to days for the swap cost (H4 = 6/day)."],
        ]}
      />
      <P>
        Returns the canonical trade frame: one row per closed trade with net R in <Code>r</Code>, exit date in{" "}
        <Code>date</Code>, plus <Code>dir</Code>, <Code>bars_held</Code>, <Code>entry</Code>, <Code>exit</Code>,{" "}
        <Code>stop_dist</Code>, <Code>tag</Code>, <Code>exit_reason</Code>.
      </P>

      <H2>ORB</H2>
      <P>Opening-range breakout — a classic intraday breakout, as a plain template.</P>
      <CodeBlock code={`ORB(or_bars: int = 30, target_r: float = 2.0)`} />
      <Table
        head={["Param", "Default", "Meaning"]}
        rows={[
          [<Code key="a">or_bars</Code>, "30", "Bars in the opening range (its width = 1R)."],
          [<Code key="b">target_r</Code>, "2.0", "Flatten at target_r × risk (or at end of session)."],
        ]}
      />
      <P>Each session&apos;s first <Code>or_bars</Code> bars define an opening range; a break of its high goes long / its low goes short, with the stop at the opposite edge (range width = 1R). One trade per day, flattened at the session end.</P>
      <CodeBlock code={`import edgekit as ek
from edgekit.strategy import ORB
rth = bars[ek.data.rth_mask(bars.index, start="09:30", end="16:00", tz="America/New_York")]
trades = ORB(or_bars=30, target_r=2.0).backtest(rth, warmup=5, bars_per_day=390)`} />
      <Callout kind="warn" title="Session-slice first">
        The session is derived from the bar index&apos;s calendar day — pre-slice / localise the frame to your trading
        session before backtesting. Being intraday, pass a small <Code>warmup</Code> and a <Code>bars_per_day</Code>{" "}
        matching your bar size. This is the raw, unfiltered breakout skeleton — a demonstration, not a tuned edge.
      </Callout>

      <H2>SmaCross</H2>
      <P>A vanilla fast/slow moving-average crossover with an ATR stop — the textbook trend-following template.</P>
      <CodeBlock code={`SmaCross(fast: int = 20, slow: int = 100, atr_n: int = 20, stop_mult: float = 2.0)`} />
      <Table
        head={["Param", "Default", "Meaning"]}
        rows={[
          [<Code key="a">fast</Code>, "20", "Fast SMA period."],
          [<Code key="b">slow</Code>, "100", "Slow SMA period."],
          [<Code key="c">atr_n</Code>, "20", "ATR period for the stop distance."],
          [<Code key="d">stop_mult</Code>, "2.0", "Hard stop distance in ATRs (the R denominator)."],
        ]}
      />
      <P>Go long when the fast SMA crosses above the slow SMA, short on the opposite cross; exit on a <Code>stop_mult×ATR</Code> stop or when the SMAs cross back. All indicators are lagged, so bar <Code>i</Code> only sees information through <Code>i-1</Code>.</P>
      <CodeBlock code={`from edgekit.strategy import SmaCross
trades = SmaCross(fast=20, slow=100).backtest(bars, warmup=210, bars_per_day=6)`} />

      <H2>Writing your own</H2>
      <P>
        Subclass <Code>BaseStrategy</Code>, precompute (and lag) your indicators in <Code>prepare</Code>, return an{" "}
        <Code>EntryIntent(direction, level, stop_dist)</Code> from <Code>entry</Code>, and an exit price from{" "}
        <Code>exit</Code>. The engine handles gap-aware fills, the R accounting, and costs. See{" "}
        <A href="/docs/guides/custom-strategy">the custom-strategy guide</A> and{" "}
        <A href="/tutorials/anatomy-of-a-strategy">the tutorial chapter</A> for a full walkthrough.
      </P>

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/engine">edgekit.engine</A> — the bar loop and the <Code>Strategy</Code> protocol.</Li>
        <Li><A href="/docs/api/validation">edgekit.validation</A> — prove a strategy before you trust it.</Li>
        <Li><A href="/docs/api/portfolio">edgekit.portfolio</A> — combine several strategies into one book.</Li>
      </Ul>
    </>
  );
}
