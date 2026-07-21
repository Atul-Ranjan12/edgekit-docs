import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "From backtest to live" };

export default function Page() {
  return (
    <>
      <H1>From backtest to live</H1>
      <Lead>
        A strategy that survives the gauntlet has earned the right to be <em>projected</em> forward — not to be
        believed at face value. The backtest is the best case, the ceiling of what the idea could do on the friendliest
        data it will ever see. This chapter is about the gap between that ceiling and a live account: how to haircut the
        number honestly, paper-trade and reconcile, monitor whether the live strategy still tracks its backtest, decide
        when to retire it, and ship it in a shape the market can actually execute.
      </Lead>

      <P>
        Think about the last time you planned a road trip. The map says four hours; you tell everyone six. Not because
        the map lies, but because the map is the best case — no traffic, no rain, no stop for fuel — and you have driven
        enough real roads to know the best case is not the plan. A backtest is that map: the fastest the strategy could
        ever have gone, on the one stretch of road it has already seen. This chapter is the discipline of turning the map
        time into the arrival time you actually promise — haircutting the number, watching the road live, and knowing in
        advance the point at which you turn around.
      </P>

      <Callout kind="danger" title="Never trade a strategy that didn't survive the gauntlet">
        Everything below assumes the strategy already passed{" "}
        <A href="/tutorials/the-gauntlet">the gauntlet</A> — permutation, cost stress, walk-forward, is-it-beta.
        Deployment is not a place to relax skepticism; it is where a fake edge costs real money. A backtest that only
        looks good has no business anywhere near a live account. The bare ORB in these examples would be killed at the
        cost gate and would never reach this page — treat that as the norm, not the exception.
      </Callout>

      <H2>The backtest is a ceiling, not a forecast</H2>
      <P>
        The drawdown-matched backtest is the most optimistic honest number you have. It was measured on the one
        historical path that actually happened — a path that, by survivorship, tends to have been kinder than the
        future will be. Two things systematically erode it, and edgekit never hides either. Apply both, as
        multipliers, to the sized projection:
      </P>
      <Ul>
        <Li>
          <Strong>Edge decay ≈ ×0.85.</Strong> Even a permutation-validated edge weakens as other participants arb it
          away and as the regime drifts to something less favourable than the sample. If the edge was <em>not</em>{" "}
          permutation-validated, the haircut is far steeper — but such a strategy should not be here at all.
        </Li>
        <Li>
          <Strong>Size-down ≈ ×0.75.</Strong> Live drawdowns run deeper than the single lucky historical one. Size
          against a block-bootstrapped <A href="/docs/api/validation">dd95</A> (a bad-but-not-tail drawdown), never the
          realised max, then shade the projection down further.
        </Li>
      </Ul>
      <Math>{"R_{\\text{honest}} = R_{\\text{backtest}} \\cdot \\underbrace{0.85}_{\\text{edge decay}} \\cdot \\underbrace{0.75}_{\\text{size-down}} \\approx 0.64\\,R_{\\text{backtest}}"}</Math>
      <P>
        Roughly two-thirds of the headline. That is not pessimism; it is the number you can plan a business around. A
        strategy whose <em>haircut</em> projection is still worth trading is robust; one that only works at the ceiling
        was never real.
      </P>
      <CodeBlock
        filename="forward.py"
        code={`import edgekit as ek

# daily_r is the strategy's net-of-cost daily R stream (post-gauntlet)
# 1. size against a realistic worst case, not the one lucky historical drawdown
dd = ek.validation.dd95(daily_r, block=5, horizon=252, n=15000)   # 95th-pct max DD
sized = ek.sizing.size_to_dd(daily_r, dd_budget=0.095, account=100_000, daily_cap=0.045)
dpr = sized["dollar_per_r"]                                        # applied $/R scalar

# 2. annualise the sized backtest, then haircut it
per_year = 252
backtest_annual = dpr * float(daily_r.sum()) / len(daily_r) * per_year   # ceiling
honest_annual   = backtest_annual * 0.85 * 0.75                          # plan around THIS
print(f"backtest \${backtest_annual:,.0f}/yr  ->  honest \${honest_annual:,.0f}/yr")`}
      />
      <Callout kind="tip" title="Scenario: from a $47k backtest to a $30k plan">
        A survivor <Code>SmaCross</Code> book, sized to a 9.5% drawdown budget on a $100k account, backtests at{" "}
        <MathInline>{"\\$47{,}000"}</MathInline> a year. That is the map time. Apply the two haircuts in turn: edge decay{" "}
        <MathInline>{"\\times 0.85"}</MathInline> takes it to <MathInline>{"\\$40{,}000"}</MathInline> (other players arb
        it, the regime drifts), and size-down <MathInline>{"\\times 0.75"}</MathInline> takes it to{" "}
        <MathInline>{"\\$30{,}000"}</MathInline> (live drawdowns run deeper than the one lucky history, so you carry less
        size per dollar of budget). You do not put $47k in the business plan — you put $30k, and you treat any live year
        that lands between $30k and $47k as <em>on-plan</em>. The book that still justifies its capital at $30k is the
        one worth trading; the one that only works at $47k was a map you mistook for a road.
      </Callout>
      <P>
        The forward Monte-Carlo fan makes the ceiling-vs-plan distinction visual. Block-bootstrap the sized daily
        stream into thousands of forward-year paths and you see the whole cone of outcomes — the median is not the
        headline, and the lower bands are where risk budgets are actually set.
      </P>
      <CodeBlock
        filename="fan.py"
        code={`import edgekit as ek, numpy as np
from edgekit import viz

mc = ek.validation.block_bootstrap_mc(daily_r, block=5, horizon=252, n=20000)
print("median terminal", np.median(mc["terminal"]), "| dd95", ek.validation.dd95(daily_r))

# a paths array for the fan (n_sims x horizon) built from the same block bootstrap
fig = viz.mc_fan(paths, actual=daily_r.cumsum().to_numpy(), title="Forward equity — 1y")
viz.save_png(fig, "mc_fan.png")`}
      />
      <ChartFigure name="mc_fan" alt="Monte-Carlo fan of forward equity paths" caption="Forward fan from the block bootstrap. The median (not the backtest) is the planning line; the lower bands set the risk budget." />

      <H2>Paper trading and reconciliation</H2>
      <P>
        Before real capital, run the deployed engine on live data and record what it <em>would</em> have done. The
        point is not more profit evidence — the backtest already gave that — it is a <em>reconciliation</em>: do the
        live-engine fills, timestamps, and R-multiples match what the backtest produced on the same bars? Any
        divergence here is a bug (a look-ahead the backtest smuggled in, a timezone or session boundary off by one, a
        cost model that disagrees) and it is far cheaper to find in paper than in production.
      </P>
      <CodeBlock
        filename="reconcile.py"
        code={`import edgekit as ek
import numpy as np

# same strategy, same bars: paper engine output vs. the backtest it must reproduce
bt   = ek.trade_stats(backtest_trades.r, dates=backtest_trades.date)
live = ek.trade_stats(paper_trades.r,    dates=paper_trades.date)

for k in ("n", "win_rate", "ev_r", "pf"):
    print(f"{k:9s}  backtest {bt[k]:.3f}   paper {live[k]:.3f}")

# trade-for-trade: on overlapping dates the R-multiples should agree to tolerance
merged = backtest_trades.merge(paper_trades, on="date", suffixes=("_bt", "_live"))
gap = np.abs(merged["r_bt"] - merged["r_live"])
assert gap.max() < 1e-6, f"engine disagrees with backtest by {gap.max():.4g}R — find the bug"`}
      />
      <Callout kind="warn" title="Reconciliation is a correctness test, not a performance test">
        If paper trading disagrees with the backtest on the same data, do not average the two and move on. Stop and
        find why. A mismatch means one of them is wrong, and the backtest — the number you validated — is usually the
        one that was cheating. See <A href="/docs/concepts/causality">Causality</A>.
      </Callout>

      <H2>Monitoring a live strategy — is it still tracking?</H2>
      <P>
        Once live, the question is continuous: is the strategy behaving like the thing you validated? You do not have
        the luxury of a large live sample, so you monitor the <em>distribution</em>, not any single trade. The natural
        statistic is a running expectancy with its standard error. Under the backtest expectancy{" "}
        <MathInline>{"\\mu_0"}</MathInline>, the live mean R over <MathInline>{"n"}</MathInline> trades has standard
        error <MathInline>{"\\sigma/\\sqrt{n}"}</MathInline>, so a simple z-score tells you whether live has drifted
        below plan by more than noise:
      </P>
      <Math>{"z = \\frac{\\bar{R}_{\\text{live}} - \\mu_0}{\\sigma / \\sqrt{n}}"}</Math>
      <P>
        A single losing trade means nothing — a strategy that wins 40% of the time loses six in a row roughly once
        every couple of hundred trades. What matters is whether the live expectancy is <em>consistent</em> with the
        haircut projection (not the ceiling). Compare live against{" "}
        <MathInline>{"\\mu_0 = 0.85 \\cdot 0.75 \\cdot \\text{EV}_{\\text{backtest}}"}</MathInline>, not the raw
        backtest EV, or you will retire good strategies for underperforming a number they were never expected to hit.
      </P>
      <CodeBlock
        filename="monitor.py"
        code={`import edgekit as ek
import numpy as np

live = ek.trade_stats(live_trades.r)
mu0  = 0.85 * 0.75 * backtest_ev_r          # the PLAN expectancy, not the ceiling
n    = live["n"]
sd   = float(np.std(live_trades.r, ddof=1))
z    = (live["ev_r"] - mu0) / (sd / np.sqrt(n))
print(f"live EV {live['ev_r']:+.3f}R vs plan {mu0:+.3f}R  ->  z = {z:+.2f}")
# z near 0: tracking. z << -2 over a meaningful n: investigate, don't panic-close.`}
      />
      <Callout kind="tip" title="Scenario: is a -3R week a problem?">
        Twelve trades into live, your <Code>SmaCross</Code> book is down 3R and your gut says kill it. Do the arithmetic
        instead. Plan expectancy is <MathInline>{"\\mu_0 = 0.85\\times 0.75\\times 0.20 = +0.13R"}</MathInline> per trade;
        live is running <MathInline>{"\\bar{R} = -0.25R"}</MathInline> with a per-trade SD of{" "}
        <MathInline>{"\\sigma \\approx 1.1"}</MathInline>. The z-score is{" "}
        <MathInline>{"z = (-0.25 - 0.13)/(1.1/\\sqrt{12}) \\approx -1.2"}</MathInline> — well inside noise; a book this
        size prints a <MathInline>{"-3R"}</MathInline> stretch routinely. You do nothing. Only when{" "}
        <MathInline>{"z"}</MathInline> sits below <MathInline>{"-2"}</MathInline> across a <em>meaningful</em> n (dozens
        of trades, not a dozen) is the drift bigger than the streak and worth investigating. The number, not the gut,
        decides.
      </Callout>
      <P>
        Watch the shape of the live equity and its rolling metrics next to the backtest, not just the endpoint. A
        strategy can end near plan while its <em>character</em> — win rate, average hold, drawdown depth — has quietly
        shifted, which is the early signature of a changing regime.
      </P>
      <ChartFigure name="rolling_metrics" alt="Rolling live performance metrics vs backtest baseline" caption="Rolling win rate, expectancy and Sharpe. Tracking is a band around the plan line, not a match to the backtest ceiling." />

      <H2>Edge decay and when to retire</H2>
      <P>
        Edges are not permanent. Crowding, structural market changes, and your own capital moving the market all wear
        an edge down. The discipline is to decide the <em>retirement rule in advance</em>, so the decision is not made
        emotionally after a drawdown. Two honest triggers:
      </P>
      <Ul>
        <Li>
          <Strong>Statistical:</Strong> live expectancy has fallen below the lower bound of its plan for a
          meaningful sample — the z-score above sits well under −2 across enough trades that it is no longer a streak.
        </Li>
        <Li>
          <Strong>Structural:</Strong> the drawdown has breached the <A href="/docs/api/validation">dd95</A> you sized
          against. A live drawdown deeper than the 95th-percentile bootstrap is evidence the return distribution has
          changed, not merely bad luck within it.
        </Li>
      </Ul>
      <P>
        A cumulative-sum (CUSUM) of realised-minus-expected R is a clean way to see decay before the equity curve makes
        it obvious: it drifts flat while the edge holds and turns persistently down when it fades.
      </P>
      <Math>{"S_t = \\max\\!\\left(0,\\; S_{t-1} - (R_t - \\mu_0)\\right)"}</Math>
      <CodeBlock
        filename="decay.py"
        code={`import edgekit as ek
import numpy as np

# CUSUM of shortfall vs plan expectancy — rises when live underperforms plan
r   = live_trades.r.to_numpy(float)
mu0 = 0.85 * 0.75 * backtest_ev_r
S, series = 0.0, []
for rt in r:
    S = max(0.0, S - (rt - mu0)); series.append(S)

# structural trigger: has live DD breached the dd95 we sized against?
worst = ek.validation.dd95(live_daily_r, horizon=252)
print("CUSUM shortfall:", round(series[-1], 2), "| breached dd95:", worst)`}
      />
      <Callout kind="tip" title="Scenario: the retirement rule fires">
        You pre-committed both triggers before going live, so the hard decision is already made when the day comes. Eight
        months in, the CUSUM shortfall — flat for the first six — starts a persistent climb and crosses the threshold you
        set, while the live drawdown touches <MathInline>{"11\\%"}</MathInline> against a <Code>dd95</Code> of{" "}
        <MathInline>{"9.5\\%"}</MathInline>. Both triggers agree: the return distribution has changed, not merely dipped.
        Because the rule was written in advance, you retire the book with no sunk-cost argument running in your head,
        redeploy the capital to what still survives the gauntlet, and file the corpse in the research log. Six months of
        earnings, one clean exit — the edge working as designed, then ending on schedule.
      </Callout>
      <Callout kind="tip" title="Retiring a strategy is not a failure">
        A strategy that earned its keep for two years and then decayed did its job. The failure mode is holding a dead
        edge out of sunk-cost attachment. Retire on the pre-committed rule, redeploy the capital to what still
        survives the gauntlet, and keep the corpse in the research log — decayed edges sometimes return in a new
        regime.
      </Callout>

      <H2>Execution realities vs the backtest</H2>
      <P>
        The backtest fills at clean, deterministic prices. Live execution does not, and the gap is a cost the backtest
        under-charges. This is exactly why cost stress (gauntlet step 6) matters: re-running at 2× and 3× assumed cost
        is a proxy for a worse execution environment than the backtest assumed. If the edge survives 3× cost, it has
        headroom for the frictions below; if it dies at 2×, live execution will finish the job.
      </P>
      <Table
        head={["Reality", "What the backtest assumed", "Effect on live R", "Guard"]}
        rows={[
          ["Slippage", "fill at the modelled level/open", "each trade a touch worse than modelled", "widen spread_rt in CostModel; verify vs paper fills"],
          ["Latency", "instant decision-to-fill", "the level you saw is not the level you get", "use next-bar-open fills (the engine already does)"],
          ["Partial fills", "full size, always", "realised size < intended, R distorted", "size below the level that moves the book; reconcile size"],
          ["Gaps / halts", "continuous prices", "stops fill past the level (worse than 1R)", "gap-aware fills; treat stop-through as a real risk"],
        ]}
      />
      <P>
        edgekit charges cost in R through the <A href="/docs/api/costs">CostModel</A>, and the bracket engine already
        imposes the two most important realities: a bar that touches both stop and target counts as the{" "}
        <em>stop</em>, and fills happen at the next bar&apos;s open, never on the signal bar. That removes the two
        biggest live-vs-backtest surprises before you ever deploy. What remains — slippage and partial fills — is what
        the cost-stress headroom is buying you insurance against.
      </P>
      <P>
        <Strong>Scenario.</Strong> Your US100 <Code>ORB</Code> stop sits at 18,238. Overnight a headline gaps the open
        straight to 18,225 — the engine fills your stop at 18,225, not 18,238, so what the backtest booked as{" "}
        <MathInline>{"-1R"}</MathInline> lands as <MathInline>{"-1.35R"}</MathInline> live. One gap is noise; a strategy
        whose backtest is thick with stops in fast, gap-prone conditions is quietly under-charged for exactly this,
        trade after trade. That structural under-charge is what cost-stress at 2× and 3× stands in for: if the edge still
        clears PF 1 when you double the assumed cost, it has the headroom to absorb the real gaps and slippage the table
        above lists.
      </P>
      <ChartFigure name="cost_sensitivity" alt="Profit factor as trading cost is escalated" caption="The cost-stress curve is your execution-reality budget. Only an edge with room above PF 1 at 2-3x cost has headroom for live slippage." />

      <H2>Deployment shapes</H2>
      <P>
        A validated strategy ships as one of two shapes, and the choice is about where the decision logic runs.
      </P>
      <H3>A rules engine</H3>
      <P>
        If the strategy is pure rules — indicator crossovers, breakout levels, bracket exits — it deploys as a small
        deterministic engine that mirrors the backtest loop exactly: read the last closed bar, compute lagged
        indicators, apply the same entry/exit logic, place a bracket order. Because <Code>BaseStrategy</Code> already
        separates <Code>prepare</Code> / <Code>entry</Code> / <Code>exit</Code> from the backtest wiring, the same
        object that was validated is the specification the live engine implements — no translation gap.
      </P>
      <CodeBlock
        filename="rules_engine.py"
        code={`import edgekit as ek

strat = ek.strategy.SmaCross(fast=20, slow=100, atr_n=20, stop_mult=2.0)
# the SAME object you validated. Live loop reuses its prepare/entry/exit on closed bars:
#   ind = strat.prepare(bars_so_far)     # indicators are lagged by construction
#   if strat.entry(i, ind): place_bracket(...)   # act only on the last CLOSED bar`}
      />
      <H3>Cloud-safe exported models</H3>
      <P>
        If the strategy carries a machine-learning meta-label (a model that decides <em>whether</em> to take an
        otherwise-triggered signal), you cannot always ship scikit-learn to the execution venue — a broker cBot or a
        cloud runtime may forbid heavyweight or networked dependencies. <A href="/docs/api/ml">ek.ml.export_trees</A>{" "}
        serialises a fitted gradient-boosting classifier to a plain blob, and a pure-Python (or emitted C#) forward
        pass reproduces <Code>predict_proba</Code> to float tolerance — no sklearn at runtime.
      </P>
      <CodeBlock
        filename="export.py"
        code={`import numpy as np
from edgekit.ml import export_trees, tree_predict_proba, MetaLabeler, emit_python

blob = export_trees(clf)                       # fitted HistGradientBoostingClassifier -> str blob
assert np.abs(tree_predict_proba(blob, X) - clf.predict_proba(X)[:, 1]).max() < 1e-6

meta = MetaLabeler(blob=blob, threshold=0.55)  # take a trade only when P(win) >= 0.55
src  = emit_python({"orb": clf}, feature_names=FEATURES, threshold=0.55)  # standalone module
# ship 'src': it exposes predict(name, x) / take(name, x) with no scikit-learn dependency`}
      />
      <Callout kind="warn" title="The export must agree bit-for-bit">
        The whole point of the export is that a runtime with no scikit-learn agrees with the model you validated. The
        round-trip is guaranteed to float tolerance
        (<MathInline>{"|\\text{tree\\_predict\\_proba}(blob, X) - \\text{clf.predict\\_proba}(X)| < 10^{-6}"}</MathInline>).
        Assert it in your build, not your hopes — a silently diverging export is an unvalidated strategy wearing a
        validated one&apos;s name.
      </Callout>

      <H2>What&apos;s next</H2>
      <P>
        You now have the honest arc: validate, haircut, paper-reconcile, monitor, retire, and ship. The final chapter
        walks the entire series end to end on a single strategy — idea to verdict — so you can see how every piece
        fits.
      </P>
      <P>
        Next: <A href="/tutorials/capstone">Capstone: end-to-end research</A> — a full worked walkthrough, and an
        honest verdict.
      </P>
    </>
  );
}
