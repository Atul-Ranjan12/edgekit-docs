import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Your toolkit" };

export default function Page() {
  return (
    <>
      <H1>Your toolkit</H1>
      <Lead>
        Time to get your hands on the machine. This chapter sets up Python and the scientific stack, installs edgekit,
        and pins down the one data contract every function in the library assumes. Then we run a strategy end to end —
        load, resample, backtest, measure — so you have seen the whole loop turn before we slow down and take it apart.
      </Lead>

      <H2>Python and the scientific stack</H2>
      <P>
        edgekit is a Python library, and its core rests on two packages you will use constantly:
      </P>
      <Ul>
        <Li>
          <Strong>numpy</Strong> — fast numeric arrays. Every indicator and the backtest bar loop work on{" "}
          <Code>np.ndarray</Code> under the hood, because per-bar Python loops over years of data would be too slow.
        </Li>
        <Li>
          <Strong>pandas</Strong> — labelled tables (<Code>DataFrame</Code>) indexed by time. Bars, trades, and
          resampling all live in pandas; the <Code>DatetimeIndex</Code> is what makes &ldquo;bar i sees only bars
          before it&rdquo; expressible.
        </Li>
      </Ul>
      <P>
        Use a recent Python (3.10+) and, strongly recommended, a virtual environment so the install can&apos;t collide
        with other projects.
      </P>
      <CodeBlock
        filename="setup.sh"
        lang="bash"
        code={`python -m venv .venv
source .venv/bin/activate      # Windows: .venv\\Scripts\\activate
python --version               # 3.10 or newer`}
      />

      <H2>Installing edgekit</H2>
      <P>
        edgekit keeps a lean core (numpy + pandas only) and gates everything heavy behind <em>extras</em>, so you only
        pull in what you use. Install the extra that matches what you&apos;re doing:
      </P>
      <Table
        head={["Command", "What you get"]}
        rows={[
          [<Code key="a">pip install -e .</Code>, "Lean core: numpy + pandas. Loading, resampling, backtest, metrics, validation."],
          [<Code key="b">pip install -e &quot;.[io]&quot;</Code>, "+ pyarrow — parquet caches and processed splits."],
          [<Code key="c">pip install -e &quot;.[viz]&quot;</Code>, "+ matplotlib — charts and HTML tear-sheets."],
          [<Code key="d">pip install -e &quot;.[ml]&quot;</Code>, "+ scikit-learn / xgboost / lightgbm — meta-labelling."],
          [<Code key="e">pip install -e &quot;.[all]&quot;</Code>, "Everything (io + viz + ml + dev)."],
        ]}
      />
      <CodeBlock
        filename="install.sh"
        lang="bash"
        code={`git clone https://github.com/Atul-Ranjan12/edgekit
cd edgekit
pip install -e ".[all]"        # or ".[io]" for just parquet, or "." for the lean core`}
      />
      <Callout kind="note" title="Heavy deps are lazy">
        Importing <Code>edgekit</Code> does not import matplotlib, scikit-learn, or pyarrow. A path that needs one loads
        it on demand — and if it&apos;s missing you get a pointed <Code>ImportError</Code> telling you exactly which
        extra to install (e.g. reading a <Code>.parquet</Code> without <Code>pyarrow</Code>), not an opaque stack
        trace. So <Code>pip install -e .</Code> is enough to work through the CSV-based examples in this course.
      </Callout>

      <H2>Loading bars and the OHLC contract</H2>
      <P>
        <Code>ek.data.load_bars</Code> reads a HistoryExporter CSV (columns{" "}
        <Code>time_utc,open,high,low,close,tick_volume</Code>) or a processed <Code>.parquet</Code> split. It validates
        the schema, sorts the index, and drops duplicate timestamps — so the frame it hands back satisfies the
        invariant every downstream function assumes.
      </P>
      <CodeBlock
        filename="load.py"
        code={`import edgekit as ek
bars = ek.data.load_bars("BTCUSDT_5m.csv")
bars.head()   # DatetimeIndex(time_utc) -> open / high / low / close / tick_volume`}
      />
      <P>That invariant — the <Strong>OHLC contract</Strong> — is worth memorising, because breaking it is the source of most silent bugs:</P>
      <Ul>
        <Li>The index is a <Code>DatetimeIndex</Code>, <Strong>tz-naive and interpreted as UTC</Strong>. Session tools localise from UTC; never store a fixed local offset in the index.</Li>
        <Li>It is <Strong>monotone increasing and unique</Strong> — sorted, no duplicate timestamps.</Li>
        <Li><Code>open, high, low, close</Code> are <Strong>floats</Strong>, with <Code>low ≤ open,close ≤ high</Code> on every bar.</Li>
        <Li>Volume lives in <Code>tick_volume</Code>.</Li>
      </Ul>
      <P>
        Keep frames in this shape and everything composes; deviate and the failure usually shows up much later as a
        strategy result that is subtly, expensively wrong.
      </P>

      <H3>Resampling to a swing timeframe</H3>
      <P>
        Raw exports are often fine-grained (M1/M5). Resample up to the timeframe you actually intend to trade before
        doing anything else:
      </P>
      <CodeBlock
        code={`h4 = ek.data.resample_ohlcv(bars, "H4")   # first open, max high, min low, last close, summed vol`}
      />

      <H2>A first end-to-end taste</H2>
      <P>
        Here is the whole loop in a dozen lines: load fine bars, resample to H4, run a strategy, and summarise the
        trades. We use <Code>SmaCross</Code> — a plain fast/slow moving-average crossover with an ATR stop — because it
        is a generic, untuned template built to exercise the engine, <em>not</em> an edge. That is exactly what makes it
        a safe first example.
      </P>
      <CodeBlock
        filename="first_backtest.py"
        code={`import edgekit as ek

# 1. load fine bars and resample to the swing timeframe
bars = ek.data.load_bars("BTCUSDT_5m.csv")
h4   = ek.data.resample_ohlcv(bars, "H4")

# 2. run a strategy (illustrative template — not tuned, not an edge)
strat  = ek.strategy.SmaCross(fast=20, slow=100, atr_n=20, stop_mult=2.0)
trades = strat.backtest(h4, warmup=210, bars_per_day=6)   # net of the default cost model

# 3. one row per closed trade, priced in R-multiples
print(trades[["date", "dir", "r", "bars_held", "exit_reason"]].head())

# 4. summarise
st = ek.metrics.trade_stats(trades.r, dates=trades.date)
print(f"trades   : {st['n']}")
print(f"win rate : {st['win_rate']:.1%}")
print(f"expectancy (R/trade): {st['ev_r']:+.3f}")   # ev_r is E[R] per trade
print(f"profit factor       : {st['pf']:.2f}")`}
      />
      <P>
        <Code>backtest</Code> returns the canonical trade frame — one row per closed trade with net R in{" "}
        <Code>r</Code>, the exit <Code>date</Code>, plus <Code>dir</Code>, <Code>bars_held</Code>, <Code>entry</Code>,{" "}
        <Code>exit</Code>, <Code>stop_dist</Code>, and <Code>exit_reason</Code>. <Code>trade_stats</Code> turns that R
        array into the universal summary: count, win rate, expectancy per trade (<Code>ev_r</Code>), profit factor, and
        — when you pass <Code>dates</Code> — annualised R, max drawdown, and Sharpe.
      </P>
      <Callout kind="tip" title="Scenario: reading the output like a trader">
        Say the print comes back <Code>trades: 184</Code>, <Code>win rate: 41.3%</Code>,{" "}
        <Code>expectancy: -0.021</Code>, <Code>profit factor: 0.94</Code>. Translate it at the desk: over roughly a
        decade of BTC H4 bars the crossover took 184 trades and won fewer than half — normal for a trend template, which
        wins rarely but big. The number that decides everything is the expectancy: <Code>-0.021</Code> means the
        <em>average</em> trade lost about 2% of one risk unit after costs. On a $500 risk that is ~$10 bled per trade,
        or ~$1,840 over the whole run. Profit factor 0.94 says gross the strategy pulled in only 94 cents for every
        dollar it gave back. This is not a bug — it is an honest, untuned template meeting real costs and coming up
        short. Your job for the rest of the course is to tell <em>this</em> (a genuine non-edge) apart from a number
        that only <em>looks</em> like an edge.
      </Callout>
      <Callout kind="warn" title="Expect a skeptical number">
        Run this and the expectancy will likely be around zero or negative once the default 12 bps + 2 bps/day cost
        model is applied. That is the correct, honest result for an untuned crossover — and precisely the point.
        A working backtest is the <em>starting</em> line, not the finish; the rest of the course is the machinery that
        tells you whether a promising-looking number is real.
      </Callout>
      <P>
        If you installed the <Code>viz</Code> extra, the same trades can be drawn as an equity curve with its drawdown
        shaded — the first picture you will learn to read critically:
      </P>
      <ChartFigure
        name="equity_with_drawdown"
        alt="Cumulative equity curve with the drawdown from the running peak shaded beneath it"
        caption="Equity curve with drawdown — the shape you'll interrogate for every strategy. A smooth-looking curve is not the same as a real edge."
      />

      <H2>What you now have</H2>
      <P>
        A working environment, the library installed, the OHLC contract in hand, and one full turn of the loop behind
        you: <Code>load_bars</Code> → <Code>resample_ohlcv</Code> → <Code>SmaCross().backtest</Code> →{" "}
        <Code>trade_stats</Code>. Everything after this refines a stage of that loop.
      </P>

      <P>
        Next, Part II opens the mathematical core with the single most consequential fact in trading — that returns
        multiply, they don&apos;t add — in{" "}
        <A href="/tutorials/returns-and-compounding">Returns and compounding</A>.
      </P>
    </>
  );
}
