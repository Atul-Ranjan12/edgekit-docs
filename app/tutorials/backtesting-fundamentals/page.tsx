import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, A, Strong, Callout, Table, Code } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";

export const metadata: Metadata = { title: "Backtesting fundamentals" };

export default function Page() {
  return (
    <>
      <H1>Backtesting fundamentals</H1>
      <Lead>
        A backtest is a simulation of a decision rule against the historical tape. Get the mechanics wrong — fill at a
        price you could not have got, count a bar you had not yet seen — and every number downstream is fiction. This
        chapter builds the mental model of the bar loop, how edgekit fills a trade, what the trade frame stores, and why
        cost is charged in R.
      </Lead>

      <P>
        Strip away the jargon and a backtest is one honest question asked over and over: <em>standing at this bar, with
        only what I could have known by now, what would I have done — and what would it have cost me?</em> Answer it
        wrong by a single bar and you are no longer testing a strategy, you are reading tomorrow&apos;s newspaper today.
        Everything in this chapter exists to make that question impossible to cheat on.
      </P>

      <H2>Event-driven vs vectorized</H2>
      <P>
        There are two ways to compute what a strategy would have done. A <Strong>vectorized</Strong> backtest expresses
        the whole rule as array algebra: build a boolean signal for every bar, shift it forward one bar, multiply by the
        next return, and sum. It is fast and fine for a first sniff — but it quietly assumes you can act on a bar at the
        same instant it closes, and it struggles to express path-dependent logic (a stop that may fire intrabar, a
        one-position-at-a-time constraint, an end-of-session flatten).
      </P>
      <P>
        An <Strong>event-driven</Strong> backtest walks bars in order and asks, at each step, &quot;given only what I
        knew at the close of bar <MathInline>{"i"}</MathInline>, what do I do on bar <MathInline>{"i+1"}</MathInline>?&quot;
        It is slower but honest: it makes the arrow of time explicit, so look-ahead has to be introduced deliberately
        rather than by accident. edgekit&apos;s research engine, <Code>run_bar_loop</Code>, is event-driven for exactly
        this reason.
      </P>
      <Table
        head={["", "Vectorized", "Event-driven (run_bar_loop)"]}
        rows={[
          ["Speed", "Fast (array ops)", "Slower (Python bar loop)"],
          ["Path dependence", "Awkward — intrabar stops, one-position rules", "Natural — state carried across bars"],
          ["Look-ahead risk", "High — a stray unshifted array peeks", "Low — time's arrow is enforced by construction"],
          ["Use for", "A first-pass sanity check", "The number you actually trust and validate"],
        ]}
      />

      <H2>The bar loop</H2>
      <P>
        The core contract is the same one the whole library rests on: a decision made on bar <MathInline>{"i"}</MathInline>{" "}
        may read information only through bar <MathInline>{"i"}</MathInline>, and the resulting order fills at the{" "}
        <em>open</em> of bar <MathInline>{"i+1"}</MathInline> (or gap-aware at bar <MathInline>{"i"}</MathInline>). A{" "}
        <A href="/docs/api/engine">Strategy</A> exposes three methods: <Code>prepare</Code> precomputes lagged indicator
        arrays once (the <Code>P</Code> dict), <Code>entry</Code> returns an <Code>EntryIntent</Code> or{" "}
        <Code>None</Code> on a flat bar, and <Code>exit</Code> returns an exit price or <Code>None</Code> while in a
        position.
      </P>
      <CodeBlock
        filename="bar_loop.py"
        code={`import edgekit as ek
from edgekit.strategy import ORB

# rth = a session-sliced OHLC frame; ORB reads the opening range, breaks it, stops at the far edge
trades = ek.engine.run_bar_loop(rth, ORB(or_bars=30, target_r=2.0),
                                warmup=5, bars_per_day=390)
print(trades["r"].sum(), len(trades))   # total R (typically net-negative), trade count`}
      />
      <P>
        The loop keeps one position at a time. On each bar it either (a) polls <Code>exit</Code> if it holds a position,
        or (b) polls <Code>entry</Code> if it is flat, then fills whatever intent comes back on the next bar&apos;s open.
        The state — are we long, at what level, with what stop — lives between iterations. That is the whole point of
        event-driven: the strategy cannot answer bar <MathInline>{"i"}</MathInline> using bar{" "}
        <MathInline>{"i+1"}</MathInline>, because bar <MathInline>{"i+1"}</MathInline> does not exist yet in the loop.
      </P>
      <Callout kind="tip" title="At the desk — one bar of a US100 opening-range breakout">
        Picture the loop stepping onto the 10:00 bar of US100. It is flat, so it polls <Code>entry</Code>: the 30-minute
        opening range formed 9:30–10:00 was 21,480–21,520, and the just-closed 10:00 bar poked above 21,520, so the
        strategy returns an intent to go long with the stop at the low edge (<Code>stop_dist</Code> = 40 points). The
        loop does <em>not</em> fill here — it fills at the <em>open of the 10:05 bar</em>, which prints 21,528. You are
        long from 21,528, risking 40 points. The next iteration the loop holds a position, so it stops asking about
        entries and starts polling <Code>exit</Code> every bar until the stop or the 2R target (21,608) resolves. That
        one step — decide on the 10:00 close, fill on the 10:05 open — is the whole causal contract in miniature.
      </Callout>
      <Callout kind="warn" title="Lag inside prepare, not entry/exit">
        Because <Code>entry</Code> and <Code>exit</Code> execute on bar <MathInline>{"i"}</MathInline>, every indicator
        they read must already have been lagged (via <Code>ek.lag(x, 1)</Code>) inside <Code>prepare</Code>. If the{" "}
        <Code>P</Code> dict holds an <em>unlagged</em> array, bar <MathInline>{"i"}</MathInline> reads its own
        just-closed value — the classic one-bar look-ahead that inflates a backtest and evaporates live.
      </Callout>

      <H2>How a fill is priced</H2>
      <H3>Next-open, gap-aware fills</H3>
      <P>
        The decision is committed at the close of bar <MathInline>{"i"}</MathInline>; the fill happens at the open of
        bar <MathInline>{"i+1"}</MathInline>. But the open is not always kind. If price gaps <em>through</em> your entry
        trigger overnight, you do not get the stale trigger price — you get the open. edgekit&apos;s{" "}
        <Code>fill_entry</Code> encodes this: a long whose level sits below the open fills at the open, never the level.
      </P>
      <Math>{"\\text{fill}_{\\text{long}} = \\max(\\text{level}, \\text{open}_{i+1}), \\qquad \\text{fill}_{\\text{short}} = \\min(\\text{level}, \\text{open}_{i+1})"}</Math>
      <P>
        Stops resolve the same way, but against you. <Code>fill_stop</Code> takes the <em>worse</em> of the stop price
        and the open — a gap through a long stop fills at the lower open, deepening the loss. And when a single bar
        touches both the stop and the target, the engine counts it as the <Strong>stop</Strong> (pessimistic): you
        cannot know intrabar which came first, so assume the bad one.
      </P>
      <Callout kind="tip" title="Pessimism is a feature">
        Every ambiguity is resolved against the strategy. This is deliberate. An optimistic fill — the target when a bar
        touched both, the trigger when price gapped past it — is exactly how a backtest manufactures edge that is not
        there. If a strategy survives pessimistic fills, its edge is more likely to be real.
      </Callout>

      <H3>The R denominator</H3>
      <P>
        edgekit prices every trade in <A href="/docs/concepts/r-multiples">R-multiples</A>, not dollars. R is the
        trade&apos;s P&amp;L divided by the risk you put on — the stop distance at entry. An <Code>EntryIntent</Code>{" "}
        carries a <Code>stop_dist</Code> in price units; that is the denominator that turns a price move into R:
      </P>
      <Math>{"R = \\frac{\\text{dir} \\cdot (\\text{exit} - \\text{entry})}{\\text{stop\\_dist}}"}</Math>
      <P>
        A trade that hits its stop is <MathInline>{"-1"}</MathInline>R by construction; a 2R target is a{" "}
        <MathInline>{"+2"}</MathInline>R win. Pricing in R makes strategies comparable across instruments and
        volatilities before any capital decision, and it is the unit the entire gauntlet operates in.
      </P>
      <P>
        <Strong>Scenario.</Strong> Carry on the US100 long above. You filled at <Code>entry = 21,528</Code> with{" "}
        <Code>stop_dist = 40</Code>. Three bars later price runs into your 2R target and the engine fills the exit at{" "}
        <Code>21,606</Code>. The raw move is <MathInline>{"21{,}606 - 21{,}528 = 78"}</MathInline> points; in R that is{" "}
        <MathInline>{"78 / 40 = +1.95"}</MathInline>R (a hair under the clean +2R because the target gap-filled two
        points early). Now suppose instead the trade had reversed and the stop filled at <Code>21,488</Code>:{" "}
        <MathInline>{"(21{,}488 - 21{,}528)/40 = -1.0"}</MathInline>R exactly. The beauty of the R denominator is that a
        40-point US100 stop and, say, a $1,200 BTCUSDT stop both land on the same −1 → +2 axis, so you can pool them,
        rank them, and stress them without ever converting to dollars.
      </P>

      <H2>The trade frame</H2>
      <P>
        <Code>run_bar_loop</Code> returns the canonical trade DataFrame — one row per closed trade. These are the
        columns every downstream tool ({" "}
        <A href="/docs/api/metrics">metrics</A>, <A href="/docs/api/validation">validation</A>,{" "}
        <A href="/docs/api/sizing">sizing</A>) expects:
      </P>
      <Table
        head={["Column", "Meaning"]}
        rows={[
          [<Code key="r">r</Code>, "Net R-multiple of the trade — already net of cost. The workhorse column."],
          [<Code key="date">date</Code>, "Exit date/time — enables annualised metrics and per-year regime splits."],
          [<Code key="dir">dir</Code>, "+1 long / −1 short."],
          [<Code key="e">entry</Code>, "Fill price at entry."],
          [<Code key="x">exit</Code>, "Fill price at exit."],
          [<Code key="sd">stop_dist</Code>, "The R denominator — stop distance in price units at entry."],
          [<Code key="bh">bars_held</Code>, "Holding period in bars (feeds hold stats and swap cost)."],
          [<Code key="t">tag</Code>, "The strategy name carried onto each trade."],
          [<Code key="xr">exit_reason</Code>, "Why the trade closed (stop, target, channel, session flatten…)."],
        ]}
      />
      <P>
        The frame is the interface. Once you have it, you never touch the loop again — you hand{" "}
        <Code>trades.r</Code> and <Code>trades.date</Code> to <Code>ek.trade_stats</Code> and to every gauntlet
        function:
      </P>
      <CodeBlock
        filename="trade_frame.py"
        code={`import edgekit as ek

st = ek.trade_stats(trades.r, dates=trades.date)
print(st["n"], st["ev_r"], st["pf"])       # count, expectancy in R, profit factor
print(st["ann_r"], st["mar"])              # annualised R, MAR (needs dates)`}
      />

      <H2>Charging cost in R</H2>
      <P>
        edgekit never bakes dollars into a strategy. Cost is a haircut on each trade&apos;s R, applied once per round
        trip inside the loop, via a <A href="/docs/api/costs">CostModel</A>. The crypto-convention model expresses cost
        as a fraction of price — a round-trip spread plus a per-day financing charge — and converts it to R with the
        same stop-distance denominator:
      </P>
      <Math>{"R_{\\text{cost}} = \\frac{\\text{spread\\_rt}\\cdot P + \\text{swap\\_day}\\cdot P \\cdot \\text{days}}{\\text{risk\\_per\\_unit}}"}</Math>
      <CodeBlock
        filename="cost_in_r.py"
        code={`import edgekit as ek

cost = ek.costs.CostModel(spread_rt=0.0012, swap_day=0.0002)   # 12 bps round-trip + 2 bps/day
trades = ek.engine.run_bar_loop(bars, strategy, cost=cost)     # trades.r is ALREADY net of cost
stats  = ek.trade_stats(trades.r, dates=trades.date)

# one round trip's haircut, in R:
r = cost.r_cost(entry_price=30_000.0, risk_per_unit=1_200.0, days=8)   # -> 0.07 R`}
      />
      <P>
        <Strong>Scenario.</Strong> Read that <Code>r_cost</Code> call as a real BTCUSDT swing trade. You enter at{" "}
        $30,000 risking $1,200 per unit (your stop distance), and you hold 8 days. The spread costs{" "}
        <MathInline>{"0.0012 \\times 30{,}000 = 36"}</MathInline> dollars round-trip and financing adds{" "}
        <MathInline>{"0.0002 \\times 30{,}000 \\times 8 = 48"}</MathInline> dollars, so <MathInline>{"84"}</MathInline>{" "}
        dollars of friction against a <MathInline>{"1{,}200"}</MathInline>-dollar risk unit — a haircut of{" "}
        <MathInline>{"84/1200 \\approx 0.07"}</MathInline>R on <em>every</em> trade. That sounds tiny until you notice a
        trend system whose average winner is +0.9R: 0.07R off the top is roughly 8% of the edge gone before you count a
        single loser. This is exactly why cost lives inside the loop — so a strategy that looks like PF 1.15 gross and
        is really PF 0.98 net gets caught here, not in production.
      </P>
      <P>
        Because every stored <Code>r</Code> is net, a strategy&apos;s profit factor is a net-of-cost number from the
        start. That matters: a gross edge that dies once you pay the spread is not an edge, and the honest place to find
        that out is inside the loop, not in a footnote. Sizing to dollars happens later, from a single scalar, so the
        strategy stays a pure statement about the market.
      </P>

      <Callout kind="note" title="Two engines">
        <Code>run_bar_loop</Code> is the research engine — one position, gap-aware, cost in R — and it is what the
        gauntlet consumes. edgekit also ships <Code>run_backtest</Code>, a fixed reward:risk prop-firm simulator with
        EOD flatten and loss caps, priced in pips and dollars. Reach for it only when you need the account-rules
        simulation; everything in Part IV runs on the R-stream from <Code>run_bar_loop</Code>.
      </Callout>

      <P>
        <Strong>Next:</Strong>{" "}
        <A href="/tutorials/backtesting-pitfalls">Why backtests lie</A> — the five ways a clean-looking backtest is
        already wrong before you ever run a statistical test on it.
      </P>
    </>
  );
}
