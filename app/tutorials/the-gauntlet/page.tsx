import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Table, Code } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "The gauntlet" };

export default function Page() {
  return (
    <>
      <H1>The gauntlet</H1>
      <Lead>
        The gauntlet is a fixed, ordered battery whose only purpose is to disprove your strategy. Nine steps, each with
        one job: try to break the number. Cheap decisive tests come first, expensive ones later, so a strategy that dies
        at step 3 never earns a walk-forward. This is the tutorial walkthrough; the{" "}
        <A href="/docs/concepts/gauntlet">concept page</A> and <A href="/docs/api/validation">API reference</A> have the
        full detail on each function.
      </Lead>

      <P>
        The mindset flip that makes the gauntlet work: you are not the strategy&apos;s proud parent, you are its
        prosecutor. Every step is an attempt to get a conviction — to prove the edge is fake — and the strategy is only
        &quot;innocent&quot; (worth trading) if it survives every charge you can bring. The order matters because
        prosecution is expensive: you ask the cheap, decisive questions first (did it read the future? does it survive
        the spread?) and save the slow ones (walk-forward, bootstrap sizing) for the few candidates that earn them.
        Most die in the first three steps, and that is the point — the gauntlet&apos;s job is to reject, fast.
      </P>

      <Callout kind="danger" title="Stop believing at the first failure">
        The steps are ordered on purpose. When a good number appears, the correct first move is to try to{" "}
        <em>break</em> it — not to celebrate it. What survives all nine is worth sizing; everything else is rejected.
      </Callout>

      <H2>The three ways alpha is fake</H2>
      <P>
        Almost all apparent alpha is one of three things in a strategy costume, and the gauntlet is organised to catch
        each:
      </P>
      <Ul>
        <Li><Strong>Beta in disguise</Strong> — the return is just market exposure. Caught by the is-it-beta regression and by permutation (which reshuffles away the drift beta rides on).</Li>
        <Li><Strong>Look-ahead</Strong> — the strategy read the future. Caught first, by construction and property test.</Li>
        <Li><Strong>Overfitting</Strong> — a pattern mined from noise. Caught by permutation, parameter sweeps, PBO, and the deflated Sharpe.</Li>
      </Ul>

      <H2>Step 1 — Causality / look-ahead audit</H2>
      <P>
        <Strong>Checks:</Strong> every indicator uses prior bars only and every fill is executable. <Strong>Why
        first:</Strong> every later step measures a statistic; if that statistic read the future, everything downstream
        measures a ghost. In edgekit this is enforced by construction — unlagged indicators, caller lags with{" "}
        <Code>ek.lag(x, 1)</Code>, gap-aware fills — and guarded by a property test that perturbs a future bar and
        asserts the past does not move.
      </P>

      <H2>Step 2 — Realistic fills and costs</H2>
      <P>
        <Strong>Checks:</Strong> the P&amp;L survives real spread, slippage, commission, and swap. <Strong>Why:</Strong>{" "}
        a gross edge that dies once you pay to trade it is not an edge. edgekit charges cost in R inside the loop via{" "}
        <A href="/docs/api/costs">CostModel</A>, so a trade&apos;s stored <Code>r</Code> is already net.
      </P>
      <CodeBlock
        filename="step2_costs.py"
        code={`import edgekit as ek

cost   = ek.costs.CostModel(spread_rt=0.0012, swap_day=0.0002)   # 12 bps round-trip, 2 bps/day
trades = ek.engine.run_bar_loop(bars, strategy, cost=cost)       # r is net of cost, in R
stats  = ek.trade_stats(trades.r, dates=trades.date)`}
      />

      <H2>Step 3 — Monte-Carlo permutation test (the decisive one)</H2>
      <P>
        <Strong>Checks:</Strong> whether the edge is distinguishable from what random data produces. <Strong>Why:</Strong>{" "}
        this is the test edgekit treats as decisive. Destroy the market&apos;s <em>structure</em> — the trends and
        serial correlation a strategy feeds on — while keeping its <em>return distribution</em> exactly, re-run the
        strategy on many such synthetic series, and ask how often random data matched or beat the real result.
      </P>
      <Math>{"p = \\frac{1 + \\#\\{s^*_i \\ge s\\}}{N + 1}"}</Math>
      <P>
        The <MathInline>{"+1"}</MathInline> counts the observed sample as one of its own permutations, so{" "}
        <MathInline>{"p > 0"}</MathInline> always. A no-edge strategy yields <MathInline>{"p \\sim U(0,1)"}</MathInline>;{" "}
        <MathInline>{"p < 0.01"}</MathInline> means real. This gets its own long chapter —{" "}
        <A href="/tutorials/monte-carlo">Monte Carlo</A>.
      </P>
      <ChartFigure
        name="tut/permutation_illustration"
        alt="Real price path beside a structure-destroyed permuted path with the same return marginal"
        caption="permute_ohlc keeps the return marginal but shuffles the order — the trend the strategy feeds on is gone."
      />
      <CodeBlock
        filename="step3_mcpt.py"
        code={`import edgekit as ek

real = strategy_total_r(bars)
def null_fn(rng):
    po, ph, pl, pc = ek.validation.permute_ohlc(
        bars.open, bars.high, bars.low, bars.close, rng)
    return strategy_total_r(rebuild(po, ph, pl, pc))

p = ek.validation.mcpt(real, null_fn, n=1000)
print(p)     # p < 0.01 -> real edge, not luck`}
      />
      <P>
        <Strong>Scenario.</Strong> Your BTCUSDT breakout earned +64R over the sample. You permute the OHLC bars 1,000
        times — each permutation keeps the same set of returns but scrambles their order, killing the trends — and
        re-run the strategy on each. Only 4 of the 1,000 scrambled markets matched or beat +64R, so{" "}
        <MathInline>{"p = (1+4)/(1+1000) \\approx 0.005"}</MathInline>. Verdict: the edge feeds on real serial
        structure, not the return distribution — it clears the decisive gate. The full step-by-step of this exact
        calculation is the <A href="/tutorials/monte-carlo">Monte Carlo</A> chapter.
      </P>

      <H2>Step 4 — Walk-forward across regimes</H2>
      <P>
        <Strong>Checks:</Strong> the edge persists out-of-sample, sequentially through time — especially in the bad
        regime. <Strong>Why:</Strong> one favourable sample proves nothing; a real edge shows up in block after block.
      </P>
      <CodeBlock
        filename="step4_wf.py"
        code={`import edgekit as ek

out = ek.validation.walk_forward(daily_r, k=6, refit=False)
print(out["n_positive"], "of", out["k"], "blocks positive")`}
      />
      <P>Full treatment: <A href="/tutorials/walk-forward">Walk-forward analysis</A>.</P>

      <H2>Step 5 — Regime split</H2>
      <P>
        <Strong>Checks:</Strong> <em>where</em> the edge earns — across calendar years, and across trend vs chop.{" "}
        <Strong>Why:</Strong> a strategy positive in only one year, or one that inverts between regimes, is
        regime-dependent, not robust.
      </P>
      <CodeBlock
        filename="step5_regime.py"
        code={`import edgekit as ek

by_year = ek.validation.regime_by_year(trades.r, trades.date)
print(by_year[["n", "ev", "win", "pf", "total_r"]])

adx   = ek.indicators.adx(bars.high, bars.low, bars.close, 14)
split = ek.validation.regime_by_adx(bar_net_r, adx, thr=20.0)
print(split["trend_ev"], split["chop_ev"])`}
      />

      <H2>Step 6 — Cost stress ×1/2/3</H2>
      <P>
        <Strong>Checks:</Strong> how the edge behaves as costs escalate. <Strong>Why:</Strong> a real edge degrades{" "}
        <em>gracefully</em>; a fake one collapses. Escalating cost is also a proxy for a worse execution environment
        than the backtest assumed.
      </P>
      <ChartFigure
        name="cost_sensitivity"
        alt="Profit factor as a function of the cost multiplier from 1x to 3x"
        caption="Survivor rule: profit factor must stay above 1 at 2x and 3x. A dip below 1 means the edge lived in the cost assumption."
      />
      <CodeBlock
        filename="step6_coststress.py"
        code={`import edgekit as ek

def run(cost):
    trades = ek.engine.run_bar_loop(bars, strategy, cost=cost)
    return ek.trade_stats(trades.r)

grid = ek.validation.cost_stress(run, base=ek.costs.CostModel(), mults=(1.0, 2.0, 3.0))
for mult, s in grid.items():
    print(mult, "x -> PF", round(s["pf"], 2))     # survivor rule: PF > 1 at 2x and 3x`}
      />

      <H2>Step 7 — Is it just beta?</H2>
      <P>
        <Strong>Checks:</Strong> whether the return is alpha or leveraged exposure to the benchmark. <Strong>Why:</Strong>{" "}
        the classic false positive — a trend follower that is really just long the market shows high beta and ~0 alpha.
        Regress strategy returns on the benchmark:
      </P>
      <Math>{"r_{s,t} = \\alpha + \\beta\\, r_{m,t} + \\varepsilon_t"}</Math>
      <CodeBlock
        filename="step7_beta.py"
        code={`import edgekit as ek

out = ek.validation.is_it_beta(strat_daily_ret, buy_and_hold_daily_ret, periods_per_year=365)
print(out["beta"], out["alpha"])     # want beta near 0 and alpha > 0`}
      />
      <P>Full treatment: <A href="/tutorials/alpha-vs-beta">Alpha vs beta</A>.</P>

      <H2>Step 8 — Parameter robustness</H2>
      <P>
        <Strong>Checks:</Strong> whether the edge is robust to its knobs. <Strong>Why:</Strong> a real effect is a{" "}
        <em>smooth plateau</em>; a knife-edge optimum at one lucky value is overfitting. <A href="/docs/api/validation">param_sweep</A>{" "}
        reports the min/median/max spread across a grid.
      </P>
      <CodeBlock
        filename="step8_sweep.py"
        code={`import edgekit as ek
from edgekit.strategy import ORB

def run(n):
    trades = ek.engine.run_bar_loop(rth, ORB(or_bars=n), warmup=5, bars_per_day=390)
    return ek.trade_stats(trades.r, dates=trades.date)["sharpe"]

sweep = ek.validation.param_sweep(run, grid=range(15, 61, 15))
print(sweep["sharpe_median"], sweep["spread"])   # tight spread = plateau (good)`}
      />
      <P>Full treatment: <A href="/tutorials/overfitting-detection">Overfitting detection</A>.</P>

      <H2>Step 9 — Honest forward projection</H2>
      <P>
        <Strong>Checks:</Strong> the number you can actually trade, not the one that looks best. <Strong>Why:</Strong>{" "}
        the drawdown-matched backtest is a <em>ceiling</em>. edgekit never hides the haircut: apply an edge-decay
        multiplier (≈ ×0.85 if permutation-validated) and a size-down multiplier (≈ ×0.75, because live drawdowns run
        deeper than the lucky historical one), and size against the block-bootstrap <A href="/docs/api/validation">dd95</A>.
      </P>
      <CodeBlock
        filename="step9_forward.py"
        code={`import edgekit as ek

dd    = ek.validation.dd95(daily_r, block=5, horizon=252, n=15000)   # 95th-pct max DD
sized = ek.sizing.size_to_dd(daily_r, dd_budget=0.095, account=100_000, daily_cap=0.045)
honest = backtest_annual * 0.85 * 0.75      # edge-decay x size-down -> plan around this`}
      />

      <H2>The overfit battery</H2>
      <P>
        Alongside the nine steps, two López de Prado diagnostics guard against having tried too many configs:{" "}
        <A href="/docs/api/validation">pbo_cscv</A> (want <MathInline>{"< 0.35"}</MathInline>) and{" "}
        <A href="/docs/api/validation">deflated_sharpe</A> (want <MathInline>{"> 0.95"}</MathInline>). Both are covered
        in <A href="/tutorials/overfitting-detection">Overfitting detection</A>.
      </P>

      <H2>A worked rejection — the ORB</H2>
      <P>
        The reference recipe runs a bare 30-minute opening-range breakout through the whole battery. It is famous,
        intuitive, and the gauntlet kills it — which is exactly the point.
      </P>
      <Table
        head={["Gauntlet step", "Result"]}
        rows={[
          ["Trades / result", "~2,666 trades, PF 0.71, EV −0.21R — net-negative"],
          ["Permutation (step 3)", <span key="p">low p — the entry <em>timing</em> beats random-entry shuffles</span>],
          ["Cost stress (step 6)", <span key="c">PF <Code>0.71 / 0.45 / 0.29</Code> at 1× / 2× / 3× — below 1 at every level</span>],
          ["Verdict", "rejected at the cost gate — never sized, never shipped"],
        ]}
      />
      <P>
        The honest nuance: the ORB&apos;s permutation p is <em>low</em>, so its timing is not pure noise — a real
        breakout does cluster entries better than a coin flip. And yet its profit factor never clears 1, so it loses
        money. The permutation test asks &quot;is the structure real?&quot;, not &quot;does this beat the spread?&quot;.
        Clearing the first bar and failing the second is the most common story there is, and telling the two apart is
        the whole job of the gauntlet.
      </P>

      <P>
        <Strong>Next:</Strong>{" "}
        <A href="/tutorials/monte-carlo">Monte Carlo</A> — the centrepiece: bootstrap resampling, the permutation
        test in full, forward path simulation, confidence cones, and risk of ruin.
      </P>
    </>
  );
}
