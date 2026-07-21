import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.core" };

export default function CorePage() {
  return (
    <>
      <H1>edgekit.core</H1>
      <Lead>
        The shared conventions every other module agrees on: the R-multiple, the OHLC contract, the causal{" "}
        <Code>lag()</Code> primitive, the <Code>Signal</Code> / <Code>Trade</Code> dataclasses, and the reproducible
        RNG. This is the vocabulary the rest of the library speaks.
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> One idea underpins everything: a trade is measured in{" "}
        <Strong>R-multiples</Strong> — profit in units of its own initial risk (the stop distance). A +2R trade made
        twice what it risked; a −1R trade lost a full unit of risk. Dollars are applied once, later, from a single
        sizing scalar (see <A href="/docs/api/sizing">edgekit.sizing</A>) — never baked into a strategy. Around that sit
        the two dataclasses the engine emits and consumes (<Code>Signal</Code>, <Code>Trade</Code>), the frame builder{" "}
        <Code>trades_to_frame</Code>, the annualisation helper <Code>infer_bars_per_year</Code>, the seeded{" "}
        <Code>bootstrap_rng</Code>, the schema validator <Code>as_ohlc</Code>, and the single most important function in
        the library — <Code>lag</Code>.
      </P>

      <Callout kind="note" title="The OHLC contract">
        <P>
          Everywhere in edgekit a &ldquo;bar frame&rdquo; means a <Code>pandas.DataFrame</Code> indexed by a{" "}
          <Strong>tz-naive UTC <Code>DatetimeIndex</Code></Strong>, with float columns <Code>open</Code>,{" "}
          <Code>high</Code>, <Code>low</Code>, <Code>close</Code> (<Code>volume</Code> / <Code>tick_volume</Code>{" "}
          optional). <Code>OHLC = (&quot;open&quot;, &quot;high&quot;, &quot;low&quot;, &quot;close&quot;)</Code> is the
          module constant naming those four columns.
        </P>
      </Callout>

      <H2>Causality</H2>

      <H3>lag</H3>
      <P>
        Causal shift: a value that is only known <em>after</em> a bar has closed is pushed forward <Code>k</Code> bars,
        so that bar <Code>i</Code> can only ever act on information available through bar <Code>i-1</Code>.{" "}
        <Strong>This is the single most important primitive in the library.</Strong> Indicators are returned unlagged
        (see <A href="/docs/api/indicators">edgekit.indicators</A>); every strategy must lag them before acting, or the
        backtest reads the future. It works on numpy arrays and pandas Series alike; leading positions become NaN.
      </P>
      <CodeBlock code={`lag(x, k: int = 1)`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">x</Code>, "np.ndarray | pd.Series", "—", "The indicator/series to shift forward."],
          [<Code key="b">k</Code>, "int", "1", "Number of bars to shift (delay). k=1 is the standard one-bar lag."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> the same type as the input — numpy array in, numpy array out; Series in, Series out.
      </P>
      <CodeBlock
        filename="lag_example.py"
        code={`from edgekit import indicators as ind
from edgekit.core import lag

# indicators come back UNLAGGED (value through bar i inclusive)
raw_atr = ind.atr(bars.high, bars.low, bars.close, 20)

# lag by one bar so a decision on bar i only sees info through i-1
N = lag(raw_atr, 1)          # N[i] reflects the ATR known at the close of bar i-1`}
      />
      <Callout kind="warn" title="Lag is the caller's job">
        edgekit deliberately keeps the lag at the call site instead of baking it into each indicator — it makes the
        causality decision <em>visible and testable</em>. If you feed an unlagged indicator straight into a trading rule,
        the backtest peeks at the current bar&apos;s completed value and the result is look-ahead-biased fiction.
      </Callout>

      <H2>Schema</H2>

      <H3>as_ohlc</H3>
      <P>
        Validate and normalise any bar frame to the OHLC contract: it sorts the index, drops duplicate timestamps
        (keep first), and checks the required <Code>open/high/low/close</Code> columns exist. It does <Strong>not</Strong>{" "}
        resample or fill — that is the caller&apos;s decision. Run it on anything before it enters the engine so the
        monotone-and-unique invariant every indicator assumes actually holds.
      </P>
      <CodeBlock code={`as_ohlc(df: pd.DataFrame) -> pd.DataFrame`} />
      <Ul>
        <Li><Code>df</Code> — a bar frame indexed by a <Code>DatetimeIndex</Code> with the four OHLC columns.</Li>
      </Ul>
      <P>
        <Strong>Returns:</Strong> the cleaned OHLC <Code>DataFrame</Code> (sorted, deduplicated). Raises{" "}
        <Code>ValueError</Code> if a required column is missing, and <Code>TypeError</Code> if the index is not a{" "}
        <Code>DatetimeIndex</Code>.
      </P>
      <CodeBlock
        code={`from edgekit.core import as_ohlc
bars = as_ohlc(raw_df)      # sorted, deduped, schema-checked — safe to backtest`}
      />

      <H2>The dataclasses</H2>

      <H3>Signal</H3>
      <P>
        A strategy&apos;s intent to open a position on the <em>next</em> bar&apos;s open. <Code>stop_dist</Code> is the
        stop distance in price units (e.g. <Code>2 * ATR</Code>); the engine turns it into the R denominator.{" "}
        <Code>direction</Code> is +1 long, −1 short. This is the object a <Code>BracketStrategy</Code> returns to the
        prop-firm <A href="/docs/api/engine">run_backtest</A> engine.
      </P>
      <CodeBlock code={`Signal(direction: int, stop_dist: float, tag: str = "")`} />
      <Table
        head={["Field", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">direction</Code>, "int", "—", "+1 long, −1 short."],
          [<Code key="b">stop_dist</Code>, "float", "—", "Stop distance in price units — becomes the R denominator."],
          [<Code key="c">tag</Code>, "str", '""', "Free-text label carried onto the resulting trade (which sleeve fired)."],
        ]}
      />
      <CodeBlock
        code={`from edgekit.core import Signal

def my_strat(df, i):
    if breakout(df, i):
        return Signal(direction=1, stop_dist=20.0, tag="brk")
    return None`}
      />

      <H3>Trade</H3>
      <P>
        One closed round-trip, priced in R. <Code>r</Code> is <Strong>net of costs</Strong> — the engine has already
        charged spread and swap before it lands here. A list of these is what the R-multiple engine accumulates and then
        collapses into a frame via <Code>trades_to_frame</Code>.
      </P>
      <CodeBlock
        code={`Trade(entry_time, exit_time, direction: int, entry: float, exit: float,
      stop_dist: float, r: float, bars_held: int, tag: str = "", exit_reason: str = "")`}
      />
      <Table
        head={["Field", "Type", "Meaning"]}
        rows={[
          [<Code key="a">entry_time</Code>, "pd.Timestamp", "Bar timestamp the position opened."],
          [<Code key="b">exit_time</Code>, "pd.Timestamp", "Bar timestamp the position closed."],
          [<Code key="c">direction</Code>, "int", "+1 long, −1 short."],
          [<Code key="d">entry</Code>, "float", "Fill price at entry."],
          [<Code key="e">exit</Code>, "float", "Fill price at exit."],
          [<Code key="f">stop_dist</Code>, "float", "The R denominator (initial risk in price units)."],
          [<Code key="g">r</Code>, "float", "Realised return in R, NET of costs."],
          [<Code key="h">bars_held</Code>, "int", "Number of bars the position was open."],
          [<Code key="i">tag</Code>, "str", "Which strategy/sleeve produced it."],
          [<Code key="j">exit_reason</Code>, "str", 'Why it closed (e.g. "sl", "tp", "eod").'],
        ]}
      />

      <H2>Frames &amp; helpers</H2>

      <H3>trades_to_frame</H3>
      <P>
        Collect a list of <Code>Trade</Code> into the canonical trade DataFrame that the rest of the library
        (metrics, sizing, viz) consumes. On top of the full record it adds a <Code>date</Code> column (the exit date)
        and a <Code>dir</Code> column (a direction alias), because downstream code expects at minimum{" "}
        <Code>date</Code> + <Code>r</Code> + <Code>dir</Code>.
      </P>
      <CodeBlock code={`trades_to_frame(trades: list[Trade]) -> pd.DataFrame`} />
      <Ul>
        <Li><Code>trades</Code> — a list of <Code>Trade</Code> objects (may be empty).</Li>
      </Ul>
      <P>
        <Strong>Returns</Strong> a <Code>DataFrame</Code> with columns:{" "}
        <Code>entry_time</Code>, <Code>exit_time</Code>, <Code>direction</Code>, <Code>entry</Code>, <Code>exit</Code>,{" "}
        <Code>stop_dist</Code>, <Code>r</Code>, <Code>bars_held</Code>, <Code>tag</Code>, <Code>exit_reason</Code>,{" "}
        <Code>date</Code>, <Code>dir</Code>. An empty <Code>trades</Code> list yields an empty frame with those columns.
        The module constant <Code>TRADE_COLUMNS</Code> is the base column order (everything except{" "}
        <Code>date</Code>/<Code>dir</Code>).
      </P>
      <CodeBlock
        code={`from edgekit.core import trades_to_frame, TRADE_COLUMNS
frame = trades_to_frame(trade_list)
frame[["date", "r", "dir"]].head()      # the minimum downstream contract
TRADE_COLUMNS                           # base column order`}
      />

      <H3>infer_bars_per_year</H3>
      <P>
        Estimate bars-per-year from the <em>median</em> bar spacing of an index — used to annualise Sharpe. The median
        (not the mean) makes it robust to weekend and holiday gaps. Falls back to <Code>252.0</Code> for fewer than 3
        bars or a non-positive step.
      </P>
      <CodeBlock code={`infer_bars_per_year(index: pd.DatetimeIndex) -> float`} />
      <Ul>
        <Li><Code>index</Code> — the bar frame&apos;s <Code>DatetimeIndex</Code>.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a <Code>float</Code> — approximate bars per calendar year (≈ 2190 for H4 crypto, 252 for daily).</P>
      <CodeBlock
        code={`from edgekit.core import infer_bars_per_year
ppy = infer_bars_per_year(bars.index)   # e.g. ~2190 for H4 24/7 crypto`}
      />

      <H3>bootstrap_rng</H3>
      <P>
        The repo-wide seeded generator (default seed 11) so results are reproducible. Pass it into any permutation /
        bootstrap routine (<A href="/docs/api/validation">edgekit.validation</A>) and re-runs give identical p-values.
      </P>
      <CodeBlock code={`bootstrap_rng(seed: int = 11) -> np.random.Generator`} />
      <Ul>
        <Li><Code>seed</Code> — the RNG seed (default 11, the repo-wide default).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a <Code>numpy.random.Generator</Code>.</P>
      <CodeBlock
        code={`from edgekit.core import bootstrap_rng
rng = bootstrap_rng()        # seed 11
rng2 = bootstrap_rng(42)     # a different reproducible stream`}
      />

      <H2>Module constants</H2>
      <Ul>
        <Li><Code>OHLC = (&quot;open&quot;, &quot;high&quot;, &quot;low&quot;, &quot;close&quot;)</Code> — the four required column names.</Li>
        <Li><Code>TRADE_COLUMNS</Code> — the base column order of the canonical trade frame (before <Code>date</Code>/<Code>dir</Code> are appended).</Li>
      </Ul>

      <Callout kind="tip" title="Top-level re-exports">
        <Code>OHLC</Code>, <Code>Signal</Code>, <Code>Trade</Code>, <Code>as_ohlc</Code>, <Code>lag</Code> and{" "}
        <Code>trades_to_frame</Code> are all re-exported at the package root, so <Code>edgekit.lag(...)</Code> and{" "}
        <Code>edgekit.core.lag(...)</Code> are the same function.
      </Callout>

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/indicators">edgekit.indicators</A> — the unlagged indicators <Code>lag</Code> exists to guard.</Li>
        <Li><A href="/docs/api/engine">edgekit.engine</A> — consumes <Code>Signal</Code>, emits <Code>Trade</Code>.</Li>
        <Li><A href="/docs/api/data">edgekit.data</A> — produces the OHLC frames <Code>as_ohlc</Code> validates.</Li>
      </Ul>
    </>
  );
}
