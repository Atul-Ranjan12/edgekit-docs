import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "Your first backtest" };

export default function FirstBacktestPage() {
  return (
    <>
      <H1>Your first backtest</H1>
      <Lead>
        Load raw Nasdaq bars, slice them to the regular cash session, run the causal ORB engine, and read the two
        objects every edgekit workflow produces: the <Strong>trade frame</Strong> and the{" "}
        <Strong>trade-stats dict</Strong>. Ten minutes, one strategy, real numbers.
      </Lead>

      <P>
        This guide walks the first four lines of the pipeline. It stops short of <em>proving</em> anything — that
        is the next guide. Here the goal is just to get a validated round-trip: bars in, priced-in-R trades out,
        and an honest summary you can trust. We use the opening-range breakout (ORB) as the running example — a
        famous, intuitive strategy, and, as the summary already hints, a useful one precisely <em>because</em> it
        turns out not to be an edge.
      </P>

      <H2>Step 1 — load the bars</H2>
      <P>
        <A href="/docs/api/data">data.load_bars</A> reads a HistoryExporter CSV
        (<Code>time_utc,open,high,low,close,tick_volume</Code>) or a processed parquet split. It validates the
        schema, sorts the index, and drops duplicate timestamps so the frame is monotone and unique — the{" "}
        <A href="/docs/concepts/ohlc">OHLC contract</A> the rest of the library assumes.
      </P>
      <CodeBlock
        filename="first_backtest.py"
        code={`import edgekit as ek

bars = ek.data.load_bars("US100_M1.csv")     # Nasdaq index, 1-minute bars
print(bars.shape, bars.index[0], "->", bars.index[-1])
print(bars.columns.tolist())   # ['open', 'high', 'low', 'close', 'tick_volume']`}
      />

      <H2>Step 2 — keep the regular-hours session</H2>
      <P>
        The ORB is intraday: each session&apos;s opening range defines the day&apos;s setup, and the position is
        flattened at the close. <A href="/docs/api/data">data.rth_mask</A> selects the regular cash session
        (09:30–16:00 New York), left-inclusive / right-exclusive so the 16:00 close bar is dropped. Pre-slicing to
        the session you trade is what lets the strategy read each day&apos;s calendar cleanly.
      </P>
      <CodeBlock
        code={`rth = bars[ek.data.rth_mask(bars.index, start="09:30", end="16:00", tz="America/New_York")]
print(f"{len(rth):,} RTH bars  {rth.index[0].date()} -> {rth.index[-1].date()}")
# 390 M1 bars per session (09:30-16:00 = 6.5h)`}
      />
      <Callout kind="tip" title="Check what the data actually is">
        Before trusting any backtest, run <Code>ek.data.integrity_report(bars, bar_minutes=1)</Code>. It reports
        span, weekend vs intraweek gaps, zero-range bars, and spikes — the difference between a clean series and
        one with holes that silently inflate a result.
      </Callout>

      <H2>Step 3 — run the causal backtest</H2>
      <P>
        Every strategy in the zoo exposes a one-liner <Code>.backtest(bars)</Code>. Here we run{" "}
        <A href="/docs/api/strategy">strategy.ORB</A> — <Code>or_bars=30</Code> uses the first 30 minutes as the
        opening range, and <Code>target_r=2.0</Code> flattens winners at twice the range width (the stop sits at
        the opposite edge, so the range <em>is</em> 1R). One trade per day, flattened at the close. The call
        returns the <Strong>canonical trade frame</Strong>: one row per closed round-trip, priced in R and net of
        costs.
      </P>
      <CodeBlock
        code={`orb = ek.strategy.ORB(or_bars=30, target_r=2.0)
trades = orb.backtest(rth, warmup=5, bars_per_day=390)     # 390 M1 bars per RTH session
print(len(trades), "trades")   # 2666`}
      />
      <P>
        The default cost model is the fraction-of-price convention — 12 bps round-trip spread plus 2 bps/day swap —
        and <Code>bars_per_day=390</Code> converts each trade&apos;s hold-in-bars into days for that swap charge (an
        intraday trade holds a fraction of a day). Both are arguments to <Code>.backtest</Code> if you need to
        change them.
      </P>

      <H3>Reading the trade frame</H3>
      <P>Every row is one closed trade. The columns:</P>
      <Table
        head={["Column", "Meaning"]}
        rows={[
          [<Code key="et">entry_time</Code>, "bar timestamp the position opened"],
          [<Code key="xt">exit_time</Code>, "bar timestamp it closed"],
          [<Code key="d">direction</Code>, "+1 long, -1 short"],
          [<Code key="e">entry</Code>, "gap-aware fill price"],
          [<Code key="x">exit</Code>, "stop / target / session-flatten fill price"],
          [<Code key="sd">stop_dist</Code>, "the risk denominator in price units (1R = opening-range width)"],
          [<Code key="r">r</Code>, <span key="rs">the trade result in R-multiples, <Strong>net of costs</Strong></span>],
          [<Code key="bh">bars_held</Code>, "how many bars the trade was open"],
          [<Code key="tag">tag</Code>, "the strategy name"],
          [<Code key="xr">exit_reason</Code>, "why it closed (when the engine records one)"],
          [<Code key="dt">date</Code>, "exit date — the key for daily/annual metrics"],
          [<Code key="dir">dir</Code>, "direction alias downstream tooling expects"],
        ]}
      />
      <CodeBlock
        code={`trades[["entry_time", "direction", "entry", "exit", "r", "bars_held"]].head()

# the whole result in one number:
print(f"total {trades.r.sum():+.1f}R  best {trades.r.max():+.2f}R  worst {trades.r.min():+.2f}R")
# total -570.6R  best +2.00R  worst -1.00R`}
      />
      <Callout kind="note" title="Why R, not dollars">
        A trade&apos;s <Code>r</Code> is its profit measured in units of its own initial risk. Dollars are applied
        once, later, from a single sizing scalar — never baked into a strategy. This is what lets the same trade
        stream be sized to any account or drawdown budget. See <A href="/docs/concepts/r-multiples">R-multiples</A>.
      </Callout>

      <H2>Step 4 — summarise with trade_stats</H2>
      <P>
        <A href="/docs/api/metrics">trade_stats</A> is the universal per-trade summary in R-space. Pass the R
        column; pass <Code>dates=</Code> (the exit dates) to unlock annualised metrics, and <Code>hold=</Code>{" "}
        (bars-held) to unlock hold statistics.
      </P>
      <CodeBlock
        code={`stats = ek.trade_stats(trades.r.to_numpy(), dates=trades.date)
print(f"{stats['n']} trades | win {stats['win_rate']:.0%} | PF {stats['pf']:.2f} "
      f"| EV {stats['ev_r']:+.3f}R | ann {stats['ann_r']:+.1f}R | MAR {stats['mar']:.2f}")
# 2666 trades | win 39% | PF 0.71 | EV -0.214R | ann -54.3R | MAR -0.10`}
      />
      <P>The returned dict — walk through what each key means:</P>
      <Table
        head={["Key", "Value here", "Meaning"]}
        rows={[
          [<Code key="n">n</Code>, "2666", "number of closed trades (~254/yr)"],
          [<Code key="tr">total_r</Code>, "≈ -570.6", "sum of all trade R"],
          [<Code key="ev">ev_r</Code>, "-0.214", "expectancy — mean R per trade (negative: it loses)"],
          [<Code key="wr">win_rate</Code>, "0.39", "fraction of winners"],
          [<Code key="pf">pf</Code>, "0.71", "profit factor = gross win / gross loss (< 1 = net loss)"],
          [<Code key="aw">avg_win / avg_loss</Code>, "—", "mean R of winners / losers"],
          [<Code key="bw">best / worst</Code>, "—", "largest single win / loss in R"],
          [<Code key="st">win_streak / loss_streak</Code>, "—", "longest run of each"],
        ]}
      />
      <P>
        Passing <Code>dates=</Code> adds the annualised block: <Code>years</Code>, <Code>ann_r</Code> (R per
        year), <Code>max_dd_r</Code> (max drawdown in R), <Code>mar</Code> (ann_r / max_dd — the risk-adjusted
        headline), <Code>sharpe</Code>, <Code>worst_day_r</Code>, and <Code>trades_per_year</Code>. Passing{" "}
        <Code>hold=trades.bars_held</Code> adds <Code>avg_hold</Code> and <Code>median_hold</Code>.
      </P>

      <H2>What the engine did for you</H2>
      <P>Two causal guarantees are baked into every one of those 2,666 trades:</P>
      <Ul>
        <Li>
          <Strong>Gap-aware fills.</Strong> A long whose breakout level is jumped fills at the actual price, not
          the stale trigger — <Code>entry = max(level, open)</Code>. A stop gapped through fills at the worse of
          stop and open. You never get the fantasy price.
        </Li>
        <Li>
          <Strong>Cost charged in R.</Strong> Each trade&apos;s spread + swap is converted to R using its own stop
          distance and subtracted from the gross result, so <Code>r</Code> is always net. Wider-range trades pay
          proportionally less R for the same spread.
        </Li>
        <Li>
          <Strong>Pessimistic stops.</Strong> When a bar could have hit both stop and target, the loss is taken.
          No favourable-fill wishful thinking.
        </Li>
      </Ul>
      <Callout kind="warn" title="A plausible strategy is not a profitable one">
        PF 0.71 and a negative expectancy are already telling you this one does not survive its own costs — the
        breakout wins are too small and too rare to pay for the losers plus the spread. That is not a bug in the
        example; it is the example. The ORB looks tradeable and is famous for it. The next guide runs the full
        gauntlet and formalises exactly why it gets rejected.
      </Callout>

      <H2>Next</H2>
      <Ul>
        <Li><A href="/docs/guides/proving-an-edge">Proving an edge</A> — run this ORB through the full gauntlet.</Li>
        <Li><A href="/docs/guides/prop-firm">Sizing for a prop-firm challenge</A> — turn an R-stream into dollars.</Li>
        <Li><A href="/docs/concepts/causality">Causality</A> — why the fills and lags are the way they are.</Li>
        <Li><A href="/docs/api/metrics">API · metrics</A> — every key trade_stats returns.</Li>
      </Ul>
    </>
  );
}
