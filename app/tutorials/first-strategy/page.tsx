import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, P, Lead, A, Strong, Callout, Table } from "@/components/prose";
import { MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Build your first strategy" };

export default function Page() {
  return (
    <>
      <H1>Build your first strategy</H1>
      <Lead>
        Enough theory — let&apos;s run something. This chapter takes two shipped templates, <Code>SmaCross</Code> (a swing
        trend-follower) and <Code>ORB</Code> (an intraday breakout), from raw bars to a trade list to honest statistics.
        The point is not to discover an edge — neither of these is one as-is — but to learn the loop you will repeat for
        every real candidate: load, shape, backtest, read the numbers.
      </Lead>

      <H2>Step 1 — load and shape the data</H2>
      <P>
        Everything starts with a clean OHLC frame. <Code>ek.data.load_bars</Code> reads a HistoryExporter CSV or a
        processed parquet split, validates the schema, and returns a monotone, de-duplicated frame indexed by UTC time.
        A swing strategy then wants a coarser timeframe, so we resample the fine bars up with{" "}
        <Code>ek.data.resample_ohlcv</Code> — which does the only correct aggregation (first open, max high, min low, last
        close, summed volume) and keeps the causal <Code>label=&quot;left&quot;</Code> convention.
      </P>
      <CodeBlock
        filename="load.py"
        code={`import edgekit as ek

bars = ek.data.load_bars("BTCUSDT_5m.csv")     # 5-minute bars, DatetimeIndex(UTC)
h4   = ek.data.resample_ohlcv(bars, "H4")      # up to 4-hour swing bars

print(ek.data.integrity_report(bars, bar_minutes=5)["intraweek_gaps"])   # inspect before trusting`}
      />
      <Callout kind="tip" title="Inspect before you trust">
        Run <Code>ek.data.integrity_report</Code> first. Silent gaps, zero-range bars, or spikes will quietly distort a
        backtest; knowing the data&apos;s real span and holes is step zero, not an afterthought.
      </Callout>

      <H2>Step 2 — run the SmaCross backtest</H2>
      <P>
        <Code>SmaCross</Code> goes long/short on a fast-vs-slow moving-average relationship, with an ATR-based stop that
        sets the R denominator. Constructing it and calling <Code>.backtest</Code> runs the full causal bar loop and hands
        back the canonical trade frame. <Code>bars_per_day=6</Code> tells the engine an H4 day is six bars (for the
        time-based swap cost).
      </P>
      <CodeBlock
        filename="smacross.py"
        code={`from edgekit.strategy import SmaCross

strat  = SmaCross(fast=20, slow=100, atr_n=20, stop_mult=2.0)
trades = strat.backtest(h4, warmup=210, bars_per_day=6)

trades.head()          # one row per closed trade, net R in the 'r' column`}
      />
      <P>The trade frame is the same shape for every research strategy. The columns you will actually read:</P>
      <Table
        head={["Column", "Meaning"]}
        rows={[
          [<Code key="a">r</Code>, "Net R-multiple of the trade (after costs) — the number everything is judged on."],
          [<Code key="b">date</Code>, "Exit timestamp — used to annualise and to build the daily-R stream."],
          [<Code key="c">dir</Code>, "+1 long / −1 short."],
          [<Code key="d">bars_held</Code>, "Holding period in bars."],
          [<Code key="e">entry, exit</Code>, "Fill prices."],
          [<Code key="f">stop_dist</Code>, "The stop distance that defined 1R for this trade."],
          [<Code key="g">exit_reason</Code>, "Why the trade closed — stop, target, trailing exit, session end."],
        ]}
      />

      <H2>Step 3 — read the statistics</H2>
      <P>
        A trade list is not a verdict; <Code>ek.trade_stats</Code> turns it into one. Feed it the R column, and pass the
        exit dates to unlock the annualised and drawdown metrics.
      </P>
      <CodeBlock
        filename="stats.py"
        code={`st = ek.trade_stats(trades["r"], dates=trades["date"])

print(st["n"], st["ev_r"], st["win_rate"])     # count, expectancy per trade (R), hit rate
print(st["pf"], st["mar"], st["ann_r"])        # profit factor, return/maxDD, annualised R
print(st["max_dd_r"], st["worst_day_r"])       # the pain: worst drawdown and worst day, in R`}
      />
      <P>
        The number that decides everything is expectancy, <MathInline>{"E[R]=p\\,W-(1-p)\\,L"}</MathInline>, reported as{" "}
        <Code>ev_r</Code>. A positive <Code>ev_r</Code> that survives costs is the necessary (not sufficient) condition
        for an edge. Judge the whole picture on <Code>pf</Code> (profit factor) and <Code>mar</Code> (return over max
        drawdown) rather than Sharpe alone — Sharpe systematically understates a skewed trend-following return, as{" "}
        <A href="/docs/api/metrics">edgekit.metrics</A> warns.
      </P>
      <Callout kind="warn" title="Expect a modest or negative result — that is the honest baseline">
        Run as shown, on real data and after costs, a plain moving-average crossover typically lands somewhere between
        marginal and slightly negative. That is not a bug in the tutorial; it is what an un-validated, un-filtered
        textbook rule usually looks like. The skill is not producing a big number — it is telling a real number from a
        lucky one.
      </Callout>
      <Callout kind="tip" title="Scenario: reading a real stats dict">
        <P>
          Say the run above comes back with <Code>n=143</Code>, <Code>ev_r=0.04</Code>, <Code>win_rate=0.41</Code>,{" "}
          <Code>pf=1.08</Code>, <Code>mar=0.6</Code>, <Code>max_dd_r=14.2</Code>. Walk it: 143 trades is enough to have an
          opinion. Expectancy is +0.04R per trade — barely positive, and a realistic cost bump could erase it. The 41%
          win rate confirms this is behaving like a trend-follower (most trades lose small). Profit factor 1.08 means you
          made $1.08 gross for every $1.00 lost — thin. And <Code>max_dd_r</Code> of 14.2 says that at some point you were
          fourteen full risk-units underwater: at 1% risk per trade, a ~14% equity drawdown you had to sit through to
          collect that 0.04R edge. That is the honest verdict — not &ldquo;it works,&rdquo; but &ldquo;there might be
          something here, and it is not yet worth trading.&rdquo;
        </P>
      </Callout>
      <ChartFigure
        name="equity_with_drawdown"
        alt="Cumulative R equity curve with drawdown shaded underneath"
        caption="The cumulative-R curve with its drawdown shaded: the top panel is the story you want to believe, the bottom panel is what you actually have to survive to earn it."
      />

      <H2>Step 4 — the intraday ORB, and why session-slicing matters</H2>
      <P>
        <Code>ORB</Code> is a different animal: an intraday opening-range breakout that needs a <em>session</em>, not a
        continuous stream. Each trading day&apos;s first <Code>or_bars</Code> bars define a range whose width is 1R; a
        break of the high goes long, of the low short, stop at the opposite edge, one trade per day. So the frame must be
        sliced to a trading session first — here US cash hours in New York — via <Code>ek.data.rth_mask</Code>, and the
        engine told the intraday bar count.
      </P>
      <CodeBlock
        filename="orb.py"
        code={`from edgekit.strategy import ORB

m1  = ek.data.load_bars("US100_M1.csv")        # 1-minute index bars
rth = m1[ek.data.rth_mask(m1.index, start="09:30", end="16:00", tz="America/New_York")]

orb    = ORB(or_bars=30, target_r=2.0)         # 30-min opening range, flatten at 2R
trades = orb.backtest(rth, warmup=5, bars_per_day=390)

st = ek.trade_stats(trades["r"], dates=trades["date"])
print(st["n"], st["ev_r"], st["pf"])           # well-powered trade count; expectancy near zero`}
      />
      <Callout kind="warn" title="Slice the session before backtesting">
        <Code>ORB</Code> derives its opening range from each bar&apos;s calendar day, so localise and mask the frame to
        your session <em>first</em>. Being intraday, it takes a small <Code>warmup</Code> and a <Code>bars_per_day</Code>{" "}
        matching your bar size (390 one-minute bars in a US cash session). The raw breakout is typically net-negative — the
        published edge comes from a walk-forward ML meta-label layered on top, not from this skeleton.
      </Callout>
      <P>
        <Strong>Scenario (one ORB day).</Strong> Take 2024-02-13 on US100. The 09:30–10:00 opening range spans
        17,960–18,004 — a 44-point range, so 1R = 44 points and the target sits 88 points past the break. At 10:12 a
        one-minute bar pokes above 18,004, the engine fills the long at the next open (18,007, a few ticks of slippage
        past the level), stop at 17,960. Price drifts up to 18,050 then rolls over and tags the stop at 15:40 for{" "}
        <MathInline>{"-1R"}</MathInline>. Repeat that across ~250 trading days a year and you get the hundreds of trades
        below — most days a small win or loss, no single day decisive. That volume is the point.
      </P>
      <P>
        With hundreds of trades, ORB is <em>well-powered</em>: you can actually measure its expectancy rather than guess.
        A well-powered result of &ldquo;roughly zero after cost&rdquo; is far more useful than a spectacular number from
        nine trades — it tells you the raw signal has no edge, cleanly, so any effort goes into the selection layer.
      </P>

      <H2>Step 5 — look at the distribution, not just the mean</H2>
      <P>
        Two strategies with identical expectancy can be wildly different to trade. Plot the R-histogram to see the shape:
        a trend-follower shows many small losers and a few large winners (positive skew); a mean-reverter shows the
        mirror. The mean is the edge, but the tails are what you have to live through.
      </P>
      <ChartFigure
        name="r_histogram"
        alt="Histogram of per-trade R-multiples for the strategy"
        caption="The per-trade R-distribution. Expectancy is its mean; the shape of the tails tells you which regime the strategy is quietly betting on."
      />

      <H2>The loop you just learned</H2>
      <P>
        Load → shape → backtest → read the stats → look at the distribution. That five-step loop is the entire inner
        cycle of strategy work; everything else is doing it more carefully. Two habits from this chapter carry forward:
        always report expectancy and profit factor (not hit rate or Sharpe alone), and always distrust a great number
        that rests on few trades.
      </P>
      <P>
        A single backtest number is still just one draw, though — the next two chapters sharpen the machinery (entries,
        exits, sizing) and then Part IV asks the real question: is any of this actually significant?
      </P>
      <P>
        Next: <A href="/tutorials/entries-exits-stops">Entries, exits &amp; stops</A> — the order mechanics and exit
        rules that shape the R-distribution you just plotted.
      </P>
    </>
  );
}
