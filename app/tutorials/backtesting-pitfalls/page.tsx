import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Code } from "@/components/prose";
import { MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Backtesting pitfalls" };

export default function Page() {
  return (
    <>
      <H1>Backtesting pitfalls — why backtests lie</H1>
      <Lead>
        Almost every apparent edge is an artefact. Before any statistical test, a backtest can already be wrong in five
        structural ways — and each one produces a beautiful equity curve. This chapter names them, shows how each fools
        you, and points at the edgekit machinery that guards against it. Learn to distrust your own number first.
      </Lead>

      <P>
        Here is the uncomfortable way to hold this: the prettier the equity curve, the more suspicious you should be.
        A curve that climbs from the bottom-left to the top-right with barely a wobble almost never means &quot;I found
        a great edge&quot; — it means &quot;I made one of the five mistakes below.&quot; Each mistake has a signature
        look, a story of exactly how it fools a careful person, and a specific edgekit tool built to catch it. Learn
        the signatures and you learn to flinch at your own good news.
      </P>

      <Callout kind="danger" title="The prime directive">
        Assume every edge is fake until proven otherwise. A good backtest is the <em>start</em> of skepticism, not the
        end. Your job is to try to break your own strategy before the market does it for you.
      </Callout>

      <H2>1. Look-ahead bias — the classic killer</H2>
      <P>
        Look-ahead is using information at bar <MathInline>{"i"}</MathInline> that was not knowable until bar{" "}
        <MathInline>{"i+1"}</MathInline> or later. It is the single most common and most catastrophic error, because it
        can be as subtle as forgetting to shift one array by one bar.
      </P>
      <H3>How it fools you</H3>
      <P>
        Suppose you compute a 20-bar high and enter when the close exceeds it. If the rolling max <em>includes the
        current bar</em>, the current close is compared to a high that already contains itself — the signal fires with
        knowledge of the very bar it trades on. The equity curve looks superb: you are, in effect, buying things you
        already know went up. A single unshifted indicator can add tens of percent of pure fiction.
      </P>
      <Callout kind="tip" title="Scenario — the SMA cross that peeked">
        You code a moving-average cross on BTCUSDT H4: go long when the fast SMA is above the slow SMA. The backtest
        prints CAGR 41%, PF 1.9 — you are already mentally spending it. Then a colleague asks which bar the SMAs are
        computed on. You realise your <Code>entry</Code> reads <Code>sma_fast[i]</Code> and <Code>sma_slow[i]</Code> —
        the values that include bar <MathInline>{"i"}</MathInline>&apos;s own close, the bar you then trade on. You add
        one line, <Code>ek.lag(sma_fast, 1)</Code>, so the decision only sees through bar{" "}
        <MathInline>{"i-1"}</MathInline>. Re-run: CAGR 41% collapses to 6%, PF 1.9 to 1.05. The 35 points of CAGR were
        never in the market — they were you buying the close of a bar after seeing it close.
      </Callout>
      <Callout kind="warn" title="A real project number was ~90% look-ahead">
        A &quot;+34% improvement&quot; in this project turned out to be roughly 90% look-ahead. This is not a beginner
        mistake you grow out of — it is a permanent hazard you build guards against.
      </Callout>
      <H3>How edgekit guards it</H3>
      <P>
        The engine enforces causality <em>by construction</em>: indicators are returned unlagged, the caller lags with{" "}
        <Code>ek.lag(x, 1)</Code> inside <Code>prepare</Code>, and fills happen at the next open, gap-aware. A decision
        on bar <MathInline>{"i"}</MathInline> can only read through bar <MathInline>{"i-1"}</MathInline>. A CI property
        test perturbs a <em>future</em> bar and asserts the past does not move — if it does, an indicator is peeking.
      </P>
      <CodeBlock
        filename="lag.py"
        code={`import edgekit as ek

upper, lower = ek.indicators.donchian(bars.high, bars.low, 20)
upper = ek.lag(upper, 1)          # a decision at bar i may only see through i-1
# entry acts on upper[i]; engine fills at max(level, open[i+1]) for longs`}
      />

      <H2>2. Data snooping and overfitting</H2>
      <P>
        Try enough rules, parameters, or filters on one dataset and <em>something</em> will look good by chance alone.
        This is data snooping — and its close cousin, overfitting, is fitting a rule so tightly to past noise that it
        describes the history perfectly and predicts nothing.
      </P>
      <H3>How it fools you</H3>
      <P>
        If you test <MathInline>{"m"}</MathInline> independent strategies with true edge zero, the expected maximum
        Sharpe among them grows with <MathInline>{"m"}</MathInline> — the best of many coin-flippers looks like a
        genius. The equity curve of the winner is real; what is fake is the belief that it will continue. Every knob you
        turn, every variant you discard, is a hidden trial that inflates the survivor.
      </P>
      <Callout kind="tip" title="Scenario — 50 filters, one winner, zero edge">
        You bolt filters onto an ORB on US100: session-of-day, an RSI gate, a volatility band, a day-of-week screen —
        50 combinations in an afternoon. One of them, &quot;only trade Tue–Thu when RSI &lt; 60&quot;, shows Sharpe
        1.6 while the raw system sits near 0. It feels like discovery. But with 50 zero-edge coin-flippers, the{" "}
        <em>expected best</em> Sharpe from noise alone is already well above 1 — you did not find a signal, you found
        the luckiest of 50 dice. The tell: that config sits on a knife-edge (RSI &lt; 55 or &lt; 65 both die), and it
        fails <A href="/tutorials/overfitting-detection">deflated Sharpe</A> the moment you honestly report{" "}
        <Code>n_trials = 50</Code>.
      </Callout>
      <ChartFigure
        name="tut/overfitting_curve"
        alt="In-sample fit improving while out-of-sample performance degrades as model complexity rises"
        caption="As you add parameters, in-sample fit keeps improving while out-of-sample performance turns over — the signature of overfitting."
      />
      <H3>How edgekit guards it</H3>
      <Ul>
        <Li>
          <A href="/docs/api/validation">param_sweep</A> — a real effect is a smooth <em>plateau</em> across its knobs; a
          lone towering spike at one lucky value is overfit. It reports min / median / max Sharpe and the spread.
        </Li>
        <Li>
          <A href="/docs/api/validation">pbo_cscv</A> — the Probability of Backtest Overfitting: over every balanced
          train/test split it checks whether the in-sample-best config lands in the bottom half out-of-sample. Above 0.50
          your selection has no OOS power.
        </Li>
        <Li>
          <A href="/docs/api/validation">deflated_sharpe</A> — discounts the observed Sharpe by the <em>expected
          maximum</em> Sharpe under the null across <Code>n_trials</Code>. Report the number of configs you actually
          tried, honestly.
        </Li>
      </Ul>
      <P>
        These get a full treatment in <A href="/tutorials/overfitting-detection">Overfitting detection</A>. The
        cheapest defence is a strong economic prior: prefer effects with an ex-ante reason to exist over patterns mined
        from the data.
      </P>

      <H2>3. Survivorship bias</H2>
      <P>
        Backtest a universe as it exists <em>today</em> and you have silently excluded everything that died. The
        delisted, the bankrupt, the merged-away — all gone from your data, all of them losers you never had to hold.
      </P>
      <H3>How it fools you</H3>
      <P>
        A mean-reversion rule that &quot;buys the dip&quot; looks wonderful on a survivor-only universe: every name in
        the sample eventually recovered, because the ones that did not recover were deleted. The strategy that would
        have caught the falling knives is invisible. The same trap hits index-membership rules, backfilled crypto
        listings, and any &quot;top N by market cap today&quot; screen applied to the past.
      </P>
      <Callout kind="tip" title="Scenario — the altcoin dip-buyer that only saw the winners">
        You pull the top-30 crypto names <em>as of today</em> and backtest &quot;buy any 40% drawdown, hold to
        recovery&quot;. It shows a 95% hit rate — nearly every dip recovered. Of course it did: the coins that dropped
        40% and <em>never</em> came back (the delisted, the rug-pulled, the −99% zombies) are not in a today-constructed
        top-30. Your sample was built by the very outcome you are testing. Rebuild the universe point-in-time — every
        coin that was top-30 <em>at the time of the dip</em>, survivors and corpses alike — and the hit rate falls into
        the 50s and the &quot;edge&quot; is gone.
      </Callout>
      <H3>How edgekit guards it</H3>
      <P>
        edgekit is single-instrument and point-in-time by design — you feed it one OHLC frame through{" "}
        <A href="/docs/api/data">ek.data</A>, and there is no cross-sectional universe to quietly curate. The
        discipline is on you: use point-in-time data, include the dead names, and never let a
        constructed-today universe stand in for what you could actually have traded then.
      </P>

      <H2>4. Regime dependence</H2>
      <P>
        A strategy can be genuinely profitable in one market state and quietly lose in another. If your sample is
        dominated by the favourable regime — a long bull run, a single volatile year — the average looks like an edge
        when it is really a bet on that regime repeating.
      </P>
      <H3>How it fools you</H3>
      <P>
        A trend follower tested only through a bull market shows a gorgeous curve; it is long-biased beta, and it will
        give it all back in the bear it never saw. A chop-loving mean-reverter tested through a quiet year inverts and
        bleeds the moment a trend arrives. The blended average hides the fact that the edge lives entirely in one state.
      </P>
      <Callout kind="tip" title="Scenario — a trend follower that was just 2020–21 in disguise">
        Your BTCUSDT Donchian breakout shows +180% total, PF 1.7 over 2019–2025. Impressive — until you split it by
        year with <Code>regime_by_year</Code>. The breakdown: 2020 +85R, 2021 +60R, and then 2022 −18R, 2023 +4R,
        2024 +6R, 2025 −3R. Nearly the entire result lived in the two roaring bull years; strip them and the strategy
        is roughly flat-to-negative. That is not a durable edge, it is a long-only bet that 2020–21 repeats. The honest
        read is &quot;profitable in strong uptrends, bleeds slowly otherwise&quot; — useful to know, but you size it as
        the regime bet it is, not the all-weather system the blended average pretended to be.
      </Callout>
      <H3>How edgekit guards it</H3>
      <CodeBlock
        filename="regime.py"
        code={`import edgekit as ek

# per-year breakdown — is the edge spread across years, or one lucky one?
by_year = ek.validation.regime_by_year(trades.r, trades.date)
print(by_year[["n", "ev", "win", "pf", "total_r"]])

# trend vs chop, split on ADX — a trend system should earn in trends, bleed little in chop
adx   = ek.indicators.adx(bars.high, bars.low, bars.close, 14)
split = ek.validation.regime_by_adx(bar_net_r, adx, thr=20.0)
print(split["trend_ev"], split["chop_ev"])`}
      />
      <P>
        The <A href="/tutorials/walk-forward">walk-forward</A> test is the stronger version: it demands the edge
        show up in block after block through time, including the ugly regimes, not just on average.
      </P>

      <H2>5. Cost sensitivity</H2>
      <P>
        Many &quot;edges&quot; are alive only inside an optimistic cost assumption. Halve the spread you assumed and the
        curve soars; double it — closer to what you actually pay — and the whole thing collapses.
      </P>
      <H3>How it fools you</H3>
      <P>
        High-frequency and mean-reversion rules are especially fragile: they trade often, so a few basis points per
        round trip compound into the difference between profit and ruin. A backtest at zero or nominal cost can show a
        profit factor comfortably above 1 that lives entirely in the space between the assumed spread and the real one.
      </P>
      <H3>How edgekit guards it</H3>
      <P>
        <A href="/docs/api/costs">cost_stress</A> re-runs the strategy at 1×, 2×, and 3× cost. The survivor rule: profit
        factor must stay above 1 at 2× and 3×. If it drops below 1 the moment you double the spread, the edge was living
        inside the cost assumption, not the market.
      </P>
      <Callout kind="tip" title="Scenario — the scalper that dies at 2× spread">
        A 5-minute mean-reversion system on US100 trades ~1,400 times/year and shows PF 1.22 at your assumed 0.6-point
        spread. Looks bankable. You run <Code>cost_stress</Code>: at 1× spread PF 1.22, at 2× (1.2 points — closer to
        what you actually get filled at in fast tape) PF 0.97, at 3× PF 0.81. The edge was 22% above break-even and the
        realistic spread ate all of it. Compare a swing trend system trading 40 times/year: PF 1.5 → 1.42 → 1.35 across
        the same sweep. Same survivor rule, opposite verdict — the scalper is rejected here, the swing system walks on
        to the next gate.
      </Callout>
      <ChartFigure
        name="cost_sensitivity"
        alt="Profit factor falling as the cost multiplier rises from 1x to 3x"
        caption="A cost-sensitivity sweep: a real edge degrades gracefully; a fake one crosses below PF = 1 as soon as costs rise."
      />
      <CodeBlock
        filename="cost_stress.py"
        code={`import edgekit as ek

def run(cost):
    trades = ek.engine.run_bar_loop(bars, strategy, cost=cost)
    return ek.trade_stats(trades.r)

grid = ek.validation.cost_stress(run, base=ek.costs.CostModel(), mults=(1.0, 2.0, 3.0))
for mult, stats in grid.items():
    print(mult, "x -> PF", round(stats["pf"], 2))   # want > 1 at 2x and 3x`}
      />

      <Callout kind="tip" title="The through-line">
        Look-ahead is caught by construction, snooping by the overfit battery, survivorship by point-in-time data,
        regime dependence by the year/ADX and walk-forward splits, and cost sensitivity by the stress harness. The{" "}
        <A href="/docs/concepts/gauntlet">gauntlet</A> is just these guards run in a fixed order. Stop believing at the
        first failure.
      </Callout>

      <P>
        <Strong>Next:</Strong>{" "}
        <A href="/tutorials/performance-metrics">Performance metrics</A> — the formulas for the numbers you will
        judge an edge on, and which of them lie to you about trend-following.
      </P>
    </>
  );
}
