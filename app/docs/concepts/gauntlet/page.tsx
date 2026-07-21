import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Table, Code } from "@/components/prose";

export const metadata: Metadata = { title: "The validation gauntlet" };

export default function GauntletPage() {
  return (
    <>
      <H1>The validation gauntlet</H1>
      <Lead>
        Anyone can produce a backtest number. edgekit&apos;s entire reason to exist is the disciplined battery that
        decides whether that number is a real edge or an artefact of luck, look-ahead, or overfitting. This is the
        crown jewel of the library — run it in order, and <Strong>stop believing at the first failure.</Strong>
      </Lead>

      <Callout kind="note" title="Prime directive">
        Assume every edge is fake until proven otherwise. Your job is to <em>disprove</em> your own strategy. A good
        backtest is the <em>start</em> of skepticism, not the end. What survives the gauntlet is real.
      </Callout>

      <H2>The three ways alpha is usually fake</H2>
      <P>
        Almost all apparent &quot;alpha&quot; is one of three things wearing a strategy costume. The gauntlet is
        organised to catch each:
      </P>
      <Ul>
        <Li><Strong>Beta in disguise.</Strong> The return is just market exposure. A &quot;trend follower&quot; that is really long the market makes money in a bull run and gives it all back in a bear — that is leverage, not skill. Caught by the <A href="#is-it-beta">is-it-beta regression</A> and the permutation test (which reshuffles away the drift beta rides on).</Li>
        <Li><Strong>Look-ahead.</Strong> The strategy read information it could not have had. Caught first, by construction and property test (see <A href="/docs/concepts/causality">Causality</A>).</Li>
        <Li><Strong>Overfitting.</Strong> The pattern was mined from noise — you pulled enough levers that <em>something</em> looked good. Caught by permutation, parameter sweeps, PBO, and the deflated Sharpe.</Li>
      </Ul>
      <P>
        The nine steps below run in order. Each has one job: try to break the number. If a step fails, you stop — a
        strategy that dies at step 3 does not get a walk-forward.
      </P>

      <H2>Step 1 — Causality / look-ahead audit</H2>
      <P>
        <Strong>What it checks:</Strong> that the number belongs to a real, tradeable timeline — every indicator uses
        prior bars only, and every fill is executable and gap-aware.{" "}
        <Strong>Why it matters:</Strong> every later step measures a statistic; if that statistic was produced by
        reading the future, everything downstream is measuring a ghost. This is why causality is step one.
      </P>
      <P>
        In edgekit this step is enforced <em>by construction</em> — indicators return unlagged, the caller lags with{" "}
        <Code>ek.lag(x, 1)</Code>, the engine fills gap-aware — and it is guaranteed by the property test that perturbs
        a future bar and asserts the past does not move. The full treatment is its own page:
      </P>
      <CodeBlock
        filename="causal.py"
        code={`import edgekit as ek

upper, lower = ek.indicators.donchian(bars.high, bars.low, 20)
upper = ek.lag(upper, 1)          # a decision at bar i may only see through i-1
# ... entry acts on upper[i]; the engine fills at max(level, open[i]) for longs`}
      />
      <Callout kind="danger" title="This step is not optional">
        The project&apos;s &quot;+34% improvement&quot; was ~90% look-ahead. Re-read the loop. See{" "}
        <A href="/docs/concepts/causality">Causality</A> for the mirage, the rule, and the CI property test.
      </Callout>

      <H2>Step 2 — Realistic fills and costs</H2>
      <P>
        <Strong>What it checks:</Strong> that P&amp;L survives real commission, spread, slippage, and swap.{" "}
        <Strong>Why it matters:</Strong> a gross edge that dies once you pay to trade it is not an edge. edgekit charges
        cost in R (see <A href="/docs/concepts/r-multiples">R-multiples</A>) via{" "}
        <A href="/docs/api/costs">CostModel</A>, so a trade&apos;s stored <Code>r</Code> is already net of what it cost
        to hold:
      </P>
      <CodeBlock
        filename="costs.py"
        code={`import edgekit as ek

cost = ek.costs.CostModel(spread_rt=0.0012, swap_day=0.0002)   # 12 bps round trip, 2 bps/day
trades = ek.engine.run_bar_loop(bars, strategy, cost=cost)     # r is net of cost, in R
stats  = ek.trade_stats(trades.r, dates=trades.date)`}
      />
      <P>
        The bracket engine adds its own realism: a bar that touches both stop and target counts as the stop, and fills
        happen at the next bar&apos;s open. Cost is not a nuisance parameter — it is a test, and step 6 escalates it.
      </P>

      <H2 id="mcpt">Step 3 — Monte-Carlo permutation test (the decisive one)</H2>
      <P>
        <Strong>What it checks:</Strong> whether the edge is distinguishable from what random data would produce.{" "}
        <Strong>Why it matters:</Strong> this is the test that separates a real edge from a lucky one, and it is the
        one edgekit treats as decisive.
      </P>
      <P>
        The idea: take the market and destroy its <em>structure</em> — the trends and serial correlation a strategy
        feeds on — while keeping its <em>return distribution</em> exactly. <A href="/docs/api/validation">permute_ohlc</A>{" "}
        does this the Masters/NeuroTrader way. It decomposes each log bar into four increments (gap, high−open,
        low−open, close−open), applies <em>one shared permutation</em> to all four (so each rebuilt bar stays
        internally consistent and valid), then cumsums back into prices. The set of close-to-close returns is
        identical to the original; the order — the trend — is gone.
      </P>
      <CodeBlock
        filename="validation.py (excerpt)"
        code={`def permute_ohlc(o, h, l, c, rng):
    lo, lh, ll, lc = np.log(o), np.log(h), np.log(l), np.log(c)
    n = len(c)
    pg = lo[1:] - lc[:-1]     # gap: open - prev close
    ph = lh[1:] - lo[1:]      # high - open
    pl = ll[1:] - lo[1:]      # low  - open
    pc = lc[1:] - lo[1:]      # close - open
    j = rng.permutation(n - 1)
    pg, ph, pl, pc = pg[j], ph[j], pl[j], pc[j]   # SAME perm -> shape-consistent bars
    ...                                            # cumsum back into valid OHLC prices`}
      />
      <P>
        Re-run the strategy on many such synthetic series to build a <em>null distribution</em> of the statistic
        (total R, profit factor, whatever you chose), then ask how often random data matched or beat the real result.
        The p-value is:
      </P>
      <CodeBlock
        filename="validation.py (excerpt)"
        code={`def mcpt(real_stat, null_fn, n=1000, rng=None):
    """p = (#{null >= real} + 1) / (N + 1).  p < 0.01 = real edge."""
    rng = rng or bootstrap_rng()
    ge = sum(1 for _ in range(n) if null_fn(rng) >= real_stat)
    return (ge + 1) / (n + 1)`}
      />
      <P>
        The <Code>+1</Code> in numerator and denominator is not cosmetic: it counts the observed sample as one of its
        own permutations, so the p-value can never be exactly 0 — you have not <em>proven</em> impossibility from a
        finite sample — and the test stays valid. If the real result sits <em>inside</em> the null cloud, it is luck.
      </P>
      <CodeBlock
        filename="mcpt.py"
        code={`import edgekit as ek

real = strategy_total_r(bars)                       # the real statistic

def null_fn(rng):
    po, ph, pl, pc = ek.validation.permute_ohlc(
        bars.open, bars.high, bars.low, bars.close, rng)
    return strategy_total_r(rebuild(po, ph, pl, pc))  # re-run on shuffled bars

p = ek.validation.mcpt(real, null_fn, n=1000)
print(p)     # p < 0.01 -> the edge is real, not luck`}
      />
      <Callout kind="tip" title="It refuses to bless noise">
        The library&apos;s load-bearing validity test proves the test&apos;s <em>other</em> direction: a strategy with
        no edge (a breakout on a pure random walk) does <Strong>not</Strong> earn <Code>p &lt; 0.01</Code>. Averaged
        over seeds the p-value is large (<Code>p ~ U(0,1)</Code>), and it is essentially never spuriously significant.
        A test that only ever said &quot;real&quot; would be useless; this one correctly says &quot;noise&quot; when it
        is noise, which is exactly what stops you shipping it.
      </Callout>

      <H2>Step 4 — Walk-forward across regimes</H2>
      <P>
        <Strong>What it checks:</Strong> that the edge persists out-of-sample, sequentially through time — especially
        in the <em>bad</em> regime (for crypto, the 2022 bear). <Strong>Why it matters:</Strong> one favourable sample
        proves nothing; a real edge shows up in block after block, not just on average.
      </P>
      <P>
        <A href="/docs/api/validation">walk_forward</A> has two modes. The honest sequential-block test
        (<Code>refit=False</Code>) splits one strategy&apos;s returns into <Code>k</Code> consecutive blocks and checks
        the edge is positive in each. The expanding-window re-optimisation (<Code>refit=True</Code>, with a config
        matrix and labels) picks the in-sample-best config on data up to each fold and applies it only to the next
        fold — config drift across folds is an overfit smell.
      </P>
      <CodeBlock
        filename="walkforward.py"
        code={`import edgekit as ek

# sequential blocks: is the edge positive in each period, not just overall?
out = ek.validation.walk_forward(daily_r, k=6, refit=False)
print(out["n_positive"], "of", out["k"], "blocks positive")
for b in out["blocks"]:
    print(b["sharpe"], b["total"], b["positive"])

# expanding re-optimisation: does the picked config stay stable OOS?
wf = ek.validation.walk_forward(M, cfgs=labels, k=6, refit=True)
print(wf["oos_sharpe"], wf["picks"], wf["stable"])`}
      />

      <H2>Step 5 — Regime split</H2>
      <P>
        <Strong>What it checks:</Strong> <em>where</em> the edge earns — across calendar years, and across market
        states (trend vs. chop). <Strong>Why it matters:</Strong> a strategy positive in only one year, or one that
        lives entirely in the low-ADX chop regime (or <em>inverts</em> between regimes), is regime-dependent, not
        robust. A trend system should make its money in trends and bleed little in chop.
      </P>
      <CodeBlock
        filename="regime.py"
        code={`import edgekit as ek

# per-year breakdown — recent years are your accidental live-OOS
by_year = ek.validation.regime_by_year(trades.r, trades.date)
print(by_year[["n", "ev", "win", "pf", "total_r"]])

# trend vs chop, split on ADX
adx = ek.indicators.adx(bars.high, bars.low, bars.close, 14)
split = ek.validation.regime_by_adx(bar_net_r, adx, thr=20.0)
print(split["trend_ev"], split["chop_ev"], split["n_trend"], split["n_chop"])`}
      />

      <H2>Step 6 — Cost stress ×1/2/3</H2>
      <P>
        <Strong>What it checks:</Strong> how the edge behaves as costs escalate. <Strong>Why it matters:</Strong> a
        real edge degrades <em>gracefully</em> at 2× and 3× assumed cost; a fake one collapses. Re-running at inflated
        cost is also a proxy for a worse execution environment than the backtest assumed.{" "}
        <A href="/docs/api/costs">cost_stress</A> re-runs your strategy at each multiplier:
      </P>
      <CodeBlock
        filename="coststress.py"
        code={`import edgekit as ek

def run(cost):
    trades = ek.engine.run_bar_loop(bars, strategy, cost=cost)
    return ek.trade_stats(trades.r)

grid = ek.validation.cost_stress(run, base=ek.costs.CostModel(), mults=(1.0, 2.0, 3.0))
for mult, stats in grid.items():
    print(mult, "x ->  PF", round(stats["pf"], 2))     # survivor rule: PF > 1 at 2x and 3x`}
      />

      <H2 id="is-it-beta">Step 7 — Is it just beta?</H2>
      <P>
        <Strong>What it checks:</Strong> whether the return is alpha or leveraged exposure to the benchmark.{" "}
        <Strong>Why it matters:</Strong> this is the classic false positive — a trend follower that is really just long
        the market shows high beta and ~0 alpha. <A href="/docs/api/validation">is_it_beta</A> regresses strategy
        returns on the benchmark: <Code>beta</Code> is the slope (exposure), <Code>alpha</Code> the annualised
        intercept residual (return not explained by riding the benchmark):
      </P>
      <CodeBlock
        filename="isitbeta.py"
        code={`import edgekit as ek

out = ek.validation.is_it_beta(strat_daily_ret, buy_and_hold_daily_ret, periods_per_year=365)
print(out["beta"], out["alpha"])
# high beta + ~0 alpha  -> you have leverage, not skill`}
      />
      <Callout kind="note">
        Regime modelling is also probably just beta. If a &quot;regime overlay&quot; only turns market exposure on
        during bull markets, it has not added alpha — it has added timing beta. The permutation test (step 3) is the
        harder gate here, because drift-beta survives a reshuffle while genuine serial-correlation structure does not.
      </Callout>

      <H2>Step 8 — Parameter robustness (smooth plateau)</H2>
      <P>
        <Strong>What it checks:</Strong> whether the edge is robust to its knobs. <Strong>Why it matters:</Strong> a
        real effect is a <em>smooth plateau</em> — e.g. a macro-MA that improves the strategy across 120→300 — while a
        knife-edge optimum at one lucky value is overfitting. <A href="/docs/api/validation">param_sweep</A> reports the
        min/median/max spread across a grid; a tight spread is a plateau, a huge spread with one towering max is a
        lucky corner of parameter space:
      </P>
      <CodeBlock
        filename="paramsweep.py"
        code={`import edgekit as ek

def run(n):
    trades = ek.engine.run_bar_loop(rth, ek.strategy.ORB(or_bars=n), cost=cost, bars_per_day=390)
    return ek.trade_stats(trades.r, dates=trades.date)["sharpe"]

sweep = ek.validation.param_sweep(run, grid=range(15, 61, 15))
print(sweep["sharpe_min"], sweep["sharpe_median"], sweep["sharpe_max"], sweep["spread"])`}
      />
      <Callout kind="warn" title="Never re-optimise to the recent sample">
        Pulling levers until the number looks good is p-hacking. Prefer effects with a strong economic prior
        (trend-following, trade-with-the-trend) over mined patterns, and correct for the number of trials you ran (see
        the overfit battery below).
      </Callout>

      <H2>Step 9 — Honest forward projection</H2>
      <P>
        <Strong>What it checks:</Strong> the number you can actually trade, not the one that looks best.{" "}
        <Strong>Why it matters:</Strong> the drawdown-matched backtest is a <em>ceiling</em>, not an expectation.
        edgekit never hides the haircut. Two multipliers, applied to the sized projection:
      </P>
      <Ul>
        <Li><Strong>Edge decay ≈ ×0.85</Strong> if the edge is permutation-validated (worse if it is not). The future regime is assumed <em>less</em> favourable than the past.</Li>
        <Li><Strong>Size-down ≈ ×0.75</Strong> because live drawdowns run deeper than the single lucky historical one. Size against the block-bootstrap <A href="/docs/api/validation">dd95</A> (a bad-but-not-tail drawdown), not the realised max.</Li>
      </Ul>
      <CodeBlock
        filename="forward.py"
        code={`import edgekit as ek

# size against a realistic worst case, not the one lucky historical drawdown
dd = ek.validation.dd95(daily_r, block=5, horizon=252, n=15000)   # 95th-pct max DD
sized = ek.sizing.size_to_dd(daily_r, dd_budget=0.095, account=100_000, daily_cap=0.045)

backtest_annual = sized["dollar_per_r"] * daily_r.sum() / len(...)  # illustrative
honest = backtest_annual * 0.85 * 0.75         # edge-decay x size-down -> plan around this`}
      />

      <H2>The overfit battery</H2>
      <P>
        Alongside the nine steps, two diagnostics from López de Prado guard against the subtler failure of having tried
        too many configs:
      </P>
      <Ul>
        <Li><Strong><A href="/docs/api/validation">pbo_cscv</A></Strong> — Probability of Backtest Overfitting via CSCV. Feed a <Code>T × Nconfig</Code> matrix of per-period returns (one column per config you tried); over every balanced train/test split it records the OOS rank of the in-sample-best config. PBO &gt; 50% means your selection has no OOS predictive power; &lt; 35% is acceptable.</Li>
        <Li><Strong><A href="/docs/api/validation">deflated_sharpe</A></Strong> — try enough knobs and a Sharpe of 2 appears from noise alone. DSR discounts the observed Sharpe by the <em>expected maximum</em> Sharpe under the null across <Code>n_trials</Code>, with a skew/kurtosis correction. Want DSR &gt; 0.95.</Li>
      </Ul>
      <CodeBlock
        filename="overfit.py"
        code={`import edgekit as ek

pbo = ek.validation.pbo_cscv(M, S=16)              # M = T x Nconfig return matrix
print(pbo["pbo"], pbo["median_logit"])             # want pbo < 0.35

dsr = ek.validation.deflated_sharpe(winner_returns, n_trials=40, sr_std=0.03)
print(dsr)                                          # want > 0.95`}
      />

      <H2>A worked rejection — the ORB</H2>
      <P>
        The reference recipe (<Code>examples/orb_gauntlet.py</Code>) runs a bare 30-minute opening-range breakout on
        US100 M1 through the whole battery. It is a famous, intuitive strategy that <em>looks</em> tradeable — and the
        gauntlet kills it, which is exactly what the gauntlet is for:
      </P>
      <Table
        head={["Gauntlet step", "Result"]}
        rows={[
          ["Trades / result", "2,666 trades, PF 0.71, EV −0.214R — net-negative"],
          ["Permutation (step 3)", <span key="p">low p — the entry <em>timing</em> beats random-entry shuffles</span>],
          ["Realistic costs (step 2)", <span key="c">PF <Code>0.71 / 0.45 / 0.29</Code> at 1× / 2× / 3× — below 1 at every level</span>],
          ["Verdict", "rejected at the cost gate — never sized, never shipped"],
        ]}
      />
      <P>
        Here is the honest nuance that makes the ORB such a good teaching case: its permutation p is <em>low</em>, so
        the timing is not pure noise — a real breakout does cluster its entries better than a coin flip. And yet the
        profit factor never clears 1, not even at nominal cost, so the strategy loses money. The permutation test asks
        &quot;is the timing structure real?&quot;; it does not ask &quot;does this beat the spread?&quot;. The ORB
        clears the first bar and fails the second. Beating a coin-flip is not an edge — and telling the two apart is
        the whole job of the gauntlet.
      </P>

      <Callout kind="tip" title="Stop believing at the first failure">
        The steps are ordered so a cheap, decisive test comes before an expensive one. A strategy that dies at the
        permutation test does not earn a walk-forward. When a &quot;good number&quot; appears, the correct first move
        is to try to <em>break</em> it — permutation, robustness, is-it-beta — before celebrating it. State every
        result faithfully, and never present a backtest headline without its haircut.
      </Callout>

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/validation">edgekit.validation</A> — every function in the gauntlet, module by module.</Li>
        <Li><A href="/docs/concepts/causality">Causality</A> — step 1, the correctness foundation everything else rests on.</Li>
        <Li><A href="/docs/concepts/r-multiples">R-multiples</A> — the unit the whole gauntlet operates in.</Li>
        <Li><A href="/docs/api/costs">edgekit.costs</A> — the cost model and the cost-stress harness (steps 2 and 6).</Li>
      </Ul>
    </>
  );
}
