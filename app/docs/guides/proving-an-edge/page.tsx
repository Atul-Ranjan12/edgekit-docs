import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "Proving an edge" };

export default function ProvingAnEdgePage() {
  return (
    <>
      <H1>Proving an edge</H1>
      <Lead>
        A backtest is a hypothesis, not a result. This guide runs the ORB from the previous page through the full{" "}
        <A href="/docs/concepts/gauntlet">validation gauntlet</A> — permutation test, cost-stress, is-it-beta,
        walk-forward, param-sweep, PBO and deflated Sharpe — and shows what each step is trying to kill. The ORB
        is the honest case study: a plausible, famous strategy that the gauntlet <em>rejects</em>.
      </Lead>

      <Callout kind="note" title="Prime directive">
        Assume the edge is fake. Your job is to <em>disprove</em> it. What survives every test below is the part
        you get to trade — and most candidates survive nothing. If any one test fails decisively, you stop. You do
        not keep torturing the data until it confesses.
      </Callout>

      <P>All of this assumes you already have the trade frame and stats from the first-backtest guide:</P>
      <CodeBlock
        filename="prove.py"
        code={`import numpy as np
import pandas as pd
import edgekit as ek
from edgekit.core import bootstrap_rng

bars = ek.data.load_bars("US100_M1.csv")
rth  = bars[ek.data.rth_mask(bars.index, start="09:30", end="16:00", tz="America/New_York")]
orb  = ek.strategy.ORB(or_bars=30, target_r=2.0)
trades = orb.backtest(rth, warmup=5, bars_per_day=390)
stats  = ek.trade_stats(trades.r.to_numpy(), dates=trades.date)
real   = float(trades.r.sum())   # -570.6R — the statistic to beat`}
      />

      <H2>Step 1 — the permutation test</H2>
      <P>
        The <A href="/docs/api/validation">mcpt</A> Monte-Carlo permutation test asks the only question that
        matters about <em>timing</em>: <em>how often does random data reproduce this result?</em> You write a{" "}
        <Code>null_stat(rng)</Code> that permutes the bars and re-runs the exact same strategy, then{" "}
        <Code>mcpt</Code> calls it many times and counts how often the shuffled result matches or beats the real
        one.
      </P>
      <P>
        For a breakout system the right null is <A href="/docs/api/validation">permute_ohlc</A> — the
        Masters/NeuroTrader bar permutation. It decomposes each log bar into four increments, applies one shared
        shuffle so the rebuilt bars stay internally valid, and cumsums back to prices. This destroys serial
        structure (trends, autocorrelation, intraday momentum) while preserving the return marginal and bar
        shapes. A breakout run on that data should make nothing.
      </P>
      <CodeBlock
        code={`o, h, l, c = (rth[x].to_numpy(float) for x in ("open", "high", "low", "close"))
idx = rth.index

def null_stat(rng: np.random.Generator) -> float:
    po, ph, pl, pc = ek.validation.permute_ohlc(o, h, l, c, rng)
    shuffled = pd.DataFrame({"open": po, "high": ph, "low": pl, "close": pc}, index=idx)
    t = orb.backtest(shuffled, warmup=5, bars_per_day=390)   # SAME strategy, permuted world
    return float(t.r.sum()) if len(t) else 0.0

p = ek.validation.mcpt(real, null_stat, n=100, rng=bootstrap_rng())
print(f"permutation test: p = {p:.4f}")
# permutation test: p = 0.0396  ->  the ORB's timing beats the shuffle`}
      />
      <P>
        The p-value is <Code>(#{"{"}null &gt;= real{"}"} + 1) / (N + 1)</Code> — the <Code>+1</Code> guarantees{" "}
        <Code>p &gt; 0</Code>. Reading the scale:
      </P>
      <Table
        head={["p-value", "Verdict on timing"]}
        rows={[
          [<Code key="a">p &lt; 0.01</Code>, "the timing is essentially never reproduced by random data"],
          [<Code key="b">0.01 – 0.05</Code>, "marginal — the timing is suggestive, not conclusive"],
          [<Code key="c">p &gt; 0.05</Code>, "no signal — random entries do just as well (p ~ Uniform(0,1))"],
        ]}
      />
      <P>
        Here is the trap the ORB is built to teach. <Code>p = 0.04</Code> says its <em>entry timing</em> genuinely
        beats random-entry shuffles: breaking a real opening range picks better moments than firing at random
        bars. And yet — as the next step shows — the strategy still loses money net of costs. The permutation test
        clears the coin-flip; it says nothing about whether you clear the spread.
      </P>
      <Callout kind="warn" title="The permutation test is necessary, not sufficient">
        A low permutation p is a gate you must pass, not a licence to trade. It only asks whether your signal beats
        random timing on the <em>same</em> bars — it does not know your costs, and it does not know that a
        negative total R can still be less-negative than the shuffles. Beating a coin-flip is not enough. You must
        beat the spread, and that is a different test.
      </Callout>

      <H2>Step 2 — cost-stress (x1 / x2 / x3) — the step that kills it</H2>
      <P>
        Many &quot;edges&quot; are just an underestimate of transaction cost — and some, like the ORB, do not even
        have a gross edge left over once honest friction is charged. <A href="/docs/api/validation">cost_stress</A>{" "}
        (re-exported from <Code>costs</Code>) re-runs the strategy at escalating cost and returns{" "}
        <Code>{"{mult: metrics}"}</Code>. The survivor rule of thumb: profit factor must stay above 1 at 2x and
        3x. The ORB is already below 1 at <em>1x</em>.
      </P>
      <CodeBlock
        code={`from edgekit.costs import cost_stress

def run(cost):
    return ek.trade_stats(orb.backtest(rth, cost=cost, warmup=5, bars_per_day=390).r.to_numpy())

grid = cost_stress(run)                    # {1.0: {...}, 2.0: {...}, 3.0: {...}}
for mult, s in grid.items():
    print(f"  {mult:.0f}x -> PF {s['pf']:.2f}  EV {s['ev_r']:+.3f}R")
#   1x -> PF 0.71  EV -0.214R
#   2x -> PF 0.45  EV -0.462R
#   3x -> PF 0.29  EV -0.690R`}
      />
      <P>
        PF 0.71 → 0.45 → 0.29 is a strategy with <em>no positive expectancy to defend</em>: it loses at real cost
        and loses more at double and triple. This is the decisive failure. A real edge degrades gracefully and
        stays above PF 1; the ORB never gets there. The gauntlet is a chain, so in practice you stop here — the
        remaining steps below are shown to complete the tour, but the verdict is already in.
      </P>

      <H2>Step 3 — is it beta?</H2>
      <P>
        A directional strategy that is secretly just long the market will look great in a bull run and evaporate
        in a chop. <A href="/docs/api/validation">is_it_beta</A> regresses the strategy&apos;s daily returns on a
        benchmark (here buy-and-hold US100) and splits the result into <Code>alpha</Code> (annualised intercept)
        and <Code>beta</Code> (slope). You want meaningful positive alpha and low beta.
      </P>
      <CodeBlock
        code={`daily_r = trades.set_index("date").r.groupby(lambda t: t.normalize()).sum()
bench   = rth["close"].pct_change().resample("1D").sum()   # US100 daily return
aligned = pd.concat([daily_r, bench], axis=1).fillna(0.0)

res = ek.validation.is_it_beta(aligned.iloc[:, 0].to_numpy(), aligned.iloc[:, 1].to_numpy())
print(f"beta {res['beta']:+.2f}  alpha {res['alpha']:+.1%}/yr")
# the ORB is roughly beta-neutral, but with NEGATIVE alpha - there is no return to attribute`}
      />

      <H2>Step 4 — walk-forward</H2>
      <P>
        Is a result spread across the whole history, or one lucky stretch?{" "}
        <A href="/docs/api/validation">walk_forward</A> with <Code>refit=False</Code> is the honest
        sequential-block test: split the daily-R series into <Code>k</Code> consecutive blocks and check each.
      </P>
      <CodeBlock
        code={`out = ek.validation.walk_forward(daily_r.to_numpy(), k=6, refit=False)
print(f"{out['n_positive']} / {out['k']} blocks positive")
for b in out["blocks"]:
    print(f"  n={b['n']:4d}  sharpe {b['sharpe']:+.2f}  total {b['total']:+.1f}  positive={b['positive']}")`}
      />
      <P>
        For the ORB the blocks are mostly negative — the bleed is persistent, not a single bad regime, which is
        exactly what you expect from a no-edge strategy paying costs every day. (For a genuine edge you want
        six-out-of-six positive; five-of-six with one small negative block is normal.) Complement this with{" "}
        <Code>ek.validation.regime_by_year(trades.r, trades.date)</Code> for the calendar-year breakdown.
      </P>

      <H2>Step 5 — param-sweep (the plateau test)</H2>
      <P>
        A real edge is a broad plateau in parameter space; an overfit one is a lonely spike; a no-edge strategy is
        a plateau of <em>uniformly bad</em> numbers. <A href="/docs/api/validation">param_sweep</A> runs{" "}
        <Code>run_fn(params) -&gt; sharpe</Code> over a grid and reports the spread of Sharpes.
      </P>
      <CodeBlock
        code={`def run_cfg(prm):
    t = ek.strategy.ORB(or_bars=prm["or_bars"], target_r=prm["target_r"]).backtest(
        rth, warmup=5, bars_per_day=390)
    return ek.trade_stats(t.r.to_numpy(), dates=t.date)["sharpe"]

grid = [{"or_bars": ob, "target_r": tr} for ob in (15, 30, 45, 60) for tr in (1.5, 2.0, 2.5)]
sweep = ek.validation.param_sweep(run_cfg, grid)
print(sweep)   # {'sharpe_min':..., 'sharpe_median':..., 'sharpe_max':..., 'spread':..., 'n':12}`}
      />
      <P>
        Here <Code>sharpe_median</Code> is negative and the whole grid is a flat, losing plateau — there is no
        magic opening-range length or target that rescues it. Consistency around a bad number is still bad.
      </P>

      <H2>Step 6 — PBO and deflated Sharpe</H2>
      <P>
        These two quantify the overfitting risk of having <em>tried many things</em>, and normally you only reach
        them for a candidate that already cleared costs.{" "}
        <A href="/docs/api/validation">pbo_cscv</A> (Probability of Backtest Overfitting, via CSCV) takes a{" "}
        <Code>T × Nconfig</Code> matrix — one return column per config you tried — and estimates how often the
        in-sample winner lands in the bottom half out-of-sample. Under 35% is acceptable; over 50% means your
        selection process is overfit.
      </P>
      <CodeBlock
        code={`# build a returns matrix, one column per config from your sweep
cols = {}
for ob in (15, 30, 45, 60):
    for tr in (1.5, 2.0, 2.5):
        t = ek.strategy.ORB(or_bars=ob, target_r=tr).backtest(rth, warmup=5, bars_per_day=390)
        cols[f"{ob}_{tr}"] = t.set_index("date").r.groupby(lambda d: d.normalize()).sum()

M = pd.DataFrame(cols).fillna(0.0)
pbo = ek.validation.pbo_cscv(M.to_numpy(), S=16)
print(f"PBO {pbo['pbo']:.0%}  median_logit {pbo['median_logit']:+.2f}")   # < 35% good`}
      />
      <P>
        <A href="/docs/api/validation">deflated_sharpe</A> then discounts the observed Sharpe by the maximum you
        would expect to see by chance across <Code>n_trials</Code> configs, and returns the probability the Sharpe
        is real. Feed it the number of configs you actually tried; you want DSR &gt; 0.95 (a negative Sharpe never
        gets there).
      </P>
      <CodeBlock
        code={`dsr = ek.validation.deflated_sharpe(daily_r.to_numpy(), n_trials=len(cols), sr_std=0.03)
print(f"deflated Sharpe probability: {dsr:.2f}")   # far below 0.95 for the ORB`}
      />

      <Callout kind="warn" title="Stop believing at the first failure">
        The gauntlet is a chain, not a menu. Once cost-stress showed PF &lt; 1, the ORB was dead — no amount of
        pretty walk-forward or param-plateau rescues it. And the reverse trap is just as fatal: do not re-run with
        different parameters until one test passes and then report that one. That <em>is</em> the overfitting the
        whole battery exists to catch. A strategy is only as strong as its weakest gauntlet step.
      </Callout>

      <H2>The verdict on the ORB</H2>
      <Ul>
        <Li>Permutation <Code>p ≈ 0.04</Code> — the timing beats a coin-flip, but that is not an edge.</Li>
        <Li>Cost-stress PF 0.71 / 0.45 / 0.29 — <Strong>net-negative at 1x and worse under stress. This is the rejection.</Strong></Li>
        <Li>Beta-neutral but with negative alpha — there is no return to attribute.</Li>
        <Li>Persistently negative walk-forward blocks and a uniformly losing param plateau — not one bad regime.</Li>
      </Ul>
      <P>
        That is what the gauntlet doing its job looks like. &quot;Prove the edge&quot; cuts both ways: a famous,
        intuitive strategy that <em>looks</em> tradeable is killed the moment costs are priced in. Most candidates
        should die here — and the examples exist to show the library, not to hand out alpha.
      </P>

      <H2>Next</H2>
      <Ul>
        <Li><A href="/docs/concepts/gauntlet">The validation gauntlet</A> — the concept and the full checklist.</Li>
        <Li><A href="/docs/api/validation">API · validation</A> — every function used above.</Li>
        <Li><A href="/docs/guides/prop-firm">Sizing for a prop-firm challenge</A> — the mechanics, for an edge that <em>does</em> survive.</Li>
        <Li><A href="/docs/examples/orb-gauntlet">Example: the ORB gauntlet</A> — the whole thing as one runnable script.</Li>
      </Ul>
    </>
  );
}
