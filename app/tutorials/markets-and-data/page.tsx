import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Markets, instruments & data" };

export default function Page() {
  return (
    <>
      <H1>Markets, instruments &amp; data</H1>
      <Lead>
        Before any rule, you need to understand the raw material: what you can trade, how a price is packaged into a
        bar, how bars aggregate across timeframes, and — the part that quietly decides whether a strategy lives or dies
        — what it costs to trade and whether the data can even be trusted. This chapter is the ground truth everything
        downstream sits on.
      </Lead>

      <H2>Asset classes and what actually differs</H2>
      <P>
        You will hear that markets are &ldquo;all the same underneath.&rdquo; For price-action logic that&apos;s nearly
        true; for a strategy&apos;s survival it is dangerously false. What differs between asset classes are the exact
        things that turn a gross edge into a net loss: when they trade, how much leverage they carry, and how you pay
        to hold a position.
      </P>
      <Table
        head={["Class", "Example", "Hours", "Leverage / financing", "Cost shape"]}
        rows={[
          ["Equities", "AAPL, SPY", "Exchange session (RTH); gaps overnight", "Low; margin interest", "Commission + spread"],
          ["Futures", "ES, CL", "Nearly 24h, daily halt", "High (notional); no swap", "Commission + spread; roll"],
          ["FX", "EURUSD", "24×5, Sun–Fri", "High; swap paid/earned nightly", "Spread; swap (carry)"],
          ["Crypto", "BTCUSDT", "24×7, never closes", "Venue-dependent; funding", "Spread + taker fee; funding"],
          ["CFDs", "US100, XAUUSD", "Tracks underlying", "High; overnight financing", "Spread + swap/financing"],
        ]}
      />
      <P>
        A strategy is not portable across these without re-costing it. A gross edge that clears a futures
        commission may vanish under a CFD&apos;s nightly financing if it holds positions for days. A 24×7 crypto series
        has no session gaps; an equity series gaps every night and every weekend. edgekit does not pretend these away —
        its cost model prices a round-trip <em>and</em> a per-day holding cost, and its session tools
        (<A href="/docs/api/data">ek.data</A>) are DST-correct rather than assuming a fixed UTC hour.
      </P>

      <H2>The OHLC bar</H2>
      <P>
        Continuous trading is summarised into <Strong>bars</Strong> (candles), one per time interval. Each bar records
        four prices and a volume:
      </P>
      <Ul>
        <Li><Strong>Open</Strong> — the first trade price in the interval.</Li>
        <Li><Strong>High</Strong> — the highest price touched.</Li>
        <Li><Strong>Low</Strong> — the lowest price touched.</Li>
        <Li><Strong>Close</Strong> — the last trade price (the one everyone quotes).</Li>
        <Li><Strong>Volume</Strong> — how much traded (in edgekit, <Code>tick_volume</Code> — the tick/trade count).</Li>
      </Ul>
      <P>
        A single H4 bar, drawn in prose: the body spans <MathInline>{"\\text{open}"}</MathInline> to{" "}
        <MathInline>{"\\text{close}"}</MathInline>, and the thin wicks reach up to the{" "}
        <MathInline>{"\\text{high}"}</MathInline> and down to the <MathInline>{"\\text{low}"}</MathInline>:
      </P>
      <CodeBlock
        lang="text"
        code={`        high  ─┐        (upper wick: how far buyers pushed, then failed)
               │
            ┌──┴──┐  close  ──  last price of the interval
            │     │
            │body │           the range low..high always contains open & close
            │     │
     open ──┴──┬──┘
               │
        low   ─┘        (lower wick: how far sellers pushed, then failed)`}
      />
      <P>
        The invariant that must always hold: <MathInline>{"\\text{low} \\le \\min(\\text{open},\\text{close})"}</MathInline>{" "}
        and <MathInline>{"\\text{high} \\ge \\max(\\text{open},\\text{close})"}</MathInline>. A bar that violates it is
        corrupt data — and edgekit&apos;s integrity check counts exactly these as <Code>bad_ohlc_bars</Code>.
      </P>
      <Callout kind="tip" title="Scenario: reading one BTCUSDT H4 bar">
        The 08:00–12:00 UTC bar on BTCUSDT prints{" "}
        <MathInline>{"O=60{,}000,\\; H=61{,}200,\\; L=59{,}400,\\; C=60{,}800"}</MathInline>. Four numbers, one story:
        buyers opened at 60,000, pushed the price up to 61,200, but sellers dragged it all the way back to 59,400 before
        buyers won the last word and closed it at 60,800. The body is green (close above open) and the long lower wick
        (60,000 down to 59,400) says a dip was bought. Notice what a bar <em>hides</em>: you have no idea whether price
        touched 61,200 at 08:15 or 11:45, or how many times it whipsawed in between. That lost intra-bar path is exactly
        why a strategy must never assume it filled at the best price of the bar — all it truly knows are these four
        levels, and only after the bar has closed.
      </Callout>
      <Callout kind="warn" title="The close is not free to act on">
        A bar&apos;s close is only known once the bar has finished. A strategy that decides on bar i&apos;s close and
        also fills at that same close is quietly cheating time. edgekit&apos;s engine handles this by lagging
        indicators so bar i only sees information through i-1 — the causal contract. Keep it in mind now; you&apos;ll
        rely on it constantly.
      </Callout>

      <H2>Timeframes and resampling</H2>
      <P>
        A timeframe is just the bar interval: M1 (one minute), M15, H1, H4, D1, W1. Coarser bars are built by
        aggregating finer ones — and there is exactly one correct aggregation: the coarse bar&apos;s open is the{" "}
        <em>first</em> open, its high the <em>max</em> high, its low the <em>min</em> low, its close the{" "}
        <em>last</em> close, and its volume the <em>sum</em>. edgekit&apos;s <Code>resample_ohlcv</Code> does precisely
        this.
      </P>
      <CodeBlock
        filename="resample.py"
        code={`from edgekit import data
m1 = data.load_bars("BTCUSDT_5m.csv")     # finer bars
h4 = data.resample_ohlcv(m1, "H4")        # first open, max high, min low, last close, summed vol
# rule can be a TIMEFRAME_RULES key ("M15","H4","D1","W1") or a pandas alias ("4h")`}
      />
      <P>
        Why resample at all? Signal and cost live on different timescales. An M1 series has 240× more bars than H4, so
        an M1 strategy pays the spread far more often — many gross edges are real on H4 and cost-killed on M1. Choosing
        the timeframe is a modelling decision, not a formatting one.
      </P>
      <Callout kind="warn" title="Resampling can leak the future">
        <Code>resample_ohlcv</Code> defaults to <Code>label=&quot;left&quot;, closed=&quot;left&quot;</Code> — each
        aggregated bar is stamped with the timestamp of its <em>open</em>. Flip to right-labelling and a bar carries the
        timestamp of a candle that hasn&apos;t finished forming, which is silent look-ahead. Keep the defaults unless
        you can articulate exactly why.
      </Callout>

      <H2>Sessions</H2>
      <P>
        Some markets have a <Strong>regular trading session</Strong> (RTH) that matters — US equities and index CFDs
        trade the bulk of their volume 09:30–16:00 New York. Intraday strategies (like an opening-range breakout) are
        defined <em>relative to the session open</em>, so you must slice the frame to the session before backtesting.
      </P>
      <CodeBlock
        filename="session.py"
        code={`from edgekit import data
mask = data.rth_mask(bars.index, start="09:30", end="16:00", tz="America/New_York")
rth  = bars[mask]      # regular-trading-hours bars only; 16:00 close bar excluded`}
      />
      <P>
        <Code>rth_mask</Code> reads the wall clock in the given timezone, so it stays correct across daylight-saving
        shifts — a fixed UTC-hour filter would drift by an hour twice a year and silently mis-slice half your history.
        Crypto has no session (24×7), so you would not mask it at all.
      </P>

      <H2>Transaction costs</H2>
      <P>
        This is where strategies go to die. Every backtest looks better gross than net, and the gap is not small. There
        are three costs to account for.
      </P>
      <H3>Spread</H3>
      <P>
        The gap between the best bid and best ask. You buy at the ask and sell at the bid, so you pay the spread
        (or half of it, each way) on <em>every</em> round trip regardless of whether the trade wins. On liquid
        instruments it&apos;s a few basis points; on thin ones it dwarfs the edge.
      </P>
      <H3>Commission / fee</H3>
      <P>
        An explicit charge per trade — a per-share/per-contract commission on equities and futures, a taker fee on
        crypto. Fixed and unavoidable, it is the second bite out of every round trip.
      </P>
      <H3>Swap / financing</H3>
      <P>
        The cost of <em>holding</em> a leveraged position overnight — FX swap, CFD financing, crypto funding. Unlike
        spread and commission, it scales with <em>time in the trade</em>, so it punishes swing strategies specifically.
        A crossover system holding for a week pays six or seven nights of financing on top of the entry/exit costs.
      </P>
      <P>
        edgekit rolls these into a single <Code>CostModel</Code>; the library convention is a{" "}
        <Strong>12 bps round-trip plus 2 bps per day held</Strong>, and <Code>backtest</Code> applies it by default.
        Costs are charged against the trade&apos;s risk unit, so it&apos;s natural to think of them in R. If your risk
        per trade is <MathInline>{"R"}</MathInline> dollars and the all-in cost of a round trip is{" "}
        <MathInline>{"c"}</MathInline> dollars, then every trade starts life down
      </P>
      <Math>{"\\text{cost}_R = \\frac{c}{R} \\;=\\; \\frac{\\text{spread} + \\text{commission} + n_{\\text{days}}\\cdot\\text{swap}}{R}"}</Math>
      <P>
        R-multiples. If your average winner is <MathInline>{"+1.5R"}</MathInline> and costs are{" "}
        <MathInline>{"0.15R"}</MathInline> per trade, you have handed back a tenth of your gross edge before you start.
        Halve the timeframe and trade twice as often, and you pay it twice as often. This is why the same signal can be
        a live edge on H4 and a net loser on M5.
      </P>
      <Callout kind="tip" title="Scenario: what a 6-day BTC swing actually costs">
        You buy $50,000 of notional BTCUSDT and hold it six nights before the exit. The 12 bps round-trip fee is{" "}
        <MathInline>{"0.0012 \\times 50{,}000 = \\$60"}</MathInline>. The 2 bps/day financing over six days is{" "}
        <MathInline>{"6 \\times 0.0002 \\times 50{,}000 = \\$60"}</MathInline>. Total drag: <Strong>$120</Strong>. If you
        risked <MathInline>{"R = \\$500"}</MathInline> on the trade, that is{" "}
        <MathInline>{"120 / 500 = 0.24R"}</MathInline> gone before the market moves a tick — nearly a quarter of a unit
        of risk. A gross <MathInline>{"+0.30R"}</MathInline> edge is now a barely-alive <MathInline>{"+0.06R"}</MathInline>.
        Hold the same position for one night instead of six and the financing drops to $10 and total cost to{" "}
        <MathInline>{"0.14R"}</MathInline>; run the identical signal on M5 and take ten times as many trades, and you
        pay the entry/exit fee ten times over. Time-in-trade and trade-frequency are cost decisions, not just signal
        decisions.
      </Callout>
      <ChartFigure
        name="cost_sensitivity"
        alt="Strategy performance metric plotted against increasing transaction-cost assumptions, degrading as cost rises"
        caption="Cost sensitivity: a healthy strategy degrades gracefully as costs rise; a fragile one falls off a cliff. edgekit's cost_stress sweeps this deliberately."
      />
      <Callout kind="danger" title="A gross edge is not an edge">
        Never quote a backtest result without costs. The number that matters is net of a realistic spread, commission,
        and financing — and ideally still positive when you stress those costs to 2× or 3×. If an edge only exists at
        zero cost, it does not exist.
      </Callout>

      <H2>Data quality</H2>
      <P>
        The most expensive bugs in this field are not in your strategy — they are in your data, and they make bad ideas
        look brilliant. Three failure modes matter.
      </P>
      <H3>Gaps</H3>
      <P>
        Missing bars. A weekend gap in FX is normal; an intraweek gap is missing data. Run one continuous backtest
        across a real time gap and the engine treats the jump as a single enormous bar-to-bar move — a fake trade or a
        fake stop-out. edgekit distinguishes the two: <Code>integrity_report</Code> counts{" "}
        <Code>weekend_gaps</Code> separately from <Code>intraweek_gaps</Code>.
      </P>
      <H3>Survivorship</H3>
      <P>
        A dataset that only contains instruments that still exist today has quietly deleted every company that went to
        zero. A strategy tested on the survivors looks far better than it would have live, because the losers were
        censored after the fact. If your universe was assembled with hindsight, your backtest inherits the bias.
      </P>
      <H3>Look-ahead in the data</H3>
      <P>
        Distinct from look-ahead in your <em>logic</em>: the values themselves can be contaminated. Adjusted prices
        that fold in a split announced later, a &ldquo;final&rdquo; figure that was actually a revision, a bar stamped
        at its close but sourced from the next period — all leak the future into the past. The defence is to look at
        the data before you trust it.
      </P>
      <CodeBlock
        filename="integrity.py"
        code={`from edgekit import data
bars = data.load_bars("BTCUSDT_5m.csv")
rep  = data.integrity_report(bars, bar_minutes=5)
print(rep["span_days"], rep["intraweek_gaps"], rep["weekend_gaps"])
print(rep["bad_ohlc_bars"], rep["spike_bars_range_gt_20x_median"])
# look at what the data IS before any strategy touches it`}
      />
      <Callout kind="note" title="Look before you leap">
        <Code>integrity_report</Code> returns span, gap counts, zero-range bars, price spikes, and OHLC-invariant
        violations. Reading it is the cheapest insurance in the whole pipeline: a five-line check that stops you
        building a beautiful strategy on broken bars.
      </Callout>

      <P>
        Next: we set up the environment, install the library, and run a first strategy end to end in{" "}
        <A href="/tutorials/your-toolkit">Your toolkit</A>.
      </P>
    </>
  );
}
