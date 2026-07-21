import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.validation" };

export default function ValidationPage() {
  return (
    <>
      <H1>edgekit.validation</H1>
      <Lead>
        The validation gauntlet — the crown jewel. Assume every edge is fake until proven otherwise; this module is the
        machinery that tries to break your result before the market does. numpy + pandas only (the permutation and
        normal-quantile math is implemented here so <Code>import edgekit</Code> never needs scipy).
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> Two null generators (<Code>permute_ohlc</Code>, <Code>permute_returns</Code>)
        feed the Monte-Carlo permutation test (<Code>mcpt</Code>) — the decisive step. Around it sit the rest of the
        gauntlet: overfitting probability (<Code>pbo_cscv</Code>), deflated Sharpe (<Code>deflated_sharpe</Code>),
        honest walk-forward (<Code>walk_forward</Code>), IS/OOS cuts (<Code>oos_split</Code>, <Code>is_oos_split</Code>),
        the alpha-vs-beta regression (<Code>is_it_beta</Code>), a plateau detector (<Code>param_sweep</Code>), regime
        splits (<Code>regime_by_year</Code>, <Code>regime_by_adx</Code>), and the block-bootstrap drawdown distribution
        (<Code>block_bootstrap_mc</Code>, <Code>dd95</Code>). <Code>cost_stress</Code> is re-exported here from{" "}
        <A href="/docs/api/costs">edgekit.costs</A> as gauntlet step 6.
      </P>

      <CodeBlock
        code={`__all__ = ["permute_ohlc", "permute_returns", "mcpt", "pbo_cscv", "deflated_sharpe",
           "walk_forward", "oos_split", "is_oos_split", "is_it_beta", "param_sweep",
           "regime_by_year", "regime_by_adx", "block_bootstrap_mc", "dd95", "cost_stress"]`}
      />

      <Callout kind="note" title="The p-value that decides everything">
        <P>
          The permutation p-value is <Code>{"p = (#{null >= real} + 1) / (N + 1)"}</Code>. It answers one question:
          across <Code>N</Code> permutations of the data — data with the same return marginal but with the serial
          structure destroyed — how often does <em>random</em> data match or beat your real statistic? The <Code>+1</Code>{" "}
          in numerator and denominator guarantees <Code>{"p > 0"}</Code> even if no null ever beats real.
        </P>
        <P>
          <Strong>{"p < 0.01 → real edge."}</Strong> A no-edge strategy yields <Code>{"p ~ U(0, 1)"}</Code> — uniformly
          distributed, so it looks significant only by luck. This single test is what stops you shipping noise.
        </P>
      </Callout>

      <H2>The nulls</H2>

      <H3>permute_ohlc</H3>
      <P>
        The Masters / NeuroTrader OHLC bar-permutation — the correct null for trend and breakout systems. It decomposes
        each log bar into four increments (gap, high−open, low−open, close−open), applies <Strong>one shared
        permutation</Strong> to all four so rebuilt bars stay internally valid (high ≥ open/close/low), then cumsums back
        into prices. This destroys serial structure — trends, autocorrelation — while preserving the return marginal and
        the bar shapes. Bar 0 is the untouched anchor.
      </P>
      <CodeBlock code={`permute_ohlc(o, h, l, c, rng) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]`} />
      <Ul>
        <Li><Code>o, h, l, c</Code> — open/high/low/close arrays (price levels).</Li>
        <Li><Code>rng</Code> — a numpy <Code>Generator</Code> (use <Code>edgekit.core.bootstrap_rng()</Code> for reproducibility).</Li>
      </Ul>
      <P>Returns a <Code>(open, high, low, close)</Code> tuple of arrays — a fresh, structure-free but marginal-preserving market.</P>

      <H3>permute_returns</H3>
      <P>
        Shuffle a return series — the null for anything that acts on returns directly. Breaks time-ordering while
        keeping the exact return marginal (it is a reshuffle, not a re-draw).
      </P>
      <CodeBlock code={`permute_returns(ret, rng) -> np.ndarray`} />
      <Ul>
        <Li><Code>ret</Code> — a 1-D return series.</Li>
        <Li><Code>rng</Code> — numpy <Code>Generator</Code>.</Li>
      </Ul>

      <Callout kind="warn" title="Match the null to the mechanism">
        Use <Code>permute_ohlc</Code> when the strategy reads bars (breakouts, channels, candles). Use{" "}
        <Code>permute_returns</Code> when it reads a return stream directly. A mismatched null can leak the very
        structure you are trying to destroy — and a leaky null makes a fake edge look real.
      </Callout>

      <H2>The decisive test</H2>

      <H3>mcpt</H3>
      <P>
        Monte-Carlo permutation p-value. You supply your real statistic and a <Code>null_fn(rng)</Code> that produces
        one statistic on freshly-permuted data; <Code>mcpt</Code> calls it <Code>n</Code> times and counts how often the
        null matches or beats real.
      </P>
      <CodeBlock code={`mcpt(real_stat: float, null_fn, n: int = 1000, rng=None) -> float`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">real_stat</Code>, "float", "—", "The statistic computed on the real, unpermuted data."],
          [<Code key="b">null_fn</Code>, "Callable[[Generator], float]", "—", "Produces one statistic on permuted data. Called n times."],
          [<Code key="c">n</Code>, "int", "1000", "Number of permutations. More = tighter p-value floor (min p = 1/(n+1))."],
          [<Code key="d">rng</Code>, "Generator | None", "None", "Seeded generator for reproducibility (defaults to a fresh one)."],
        ]}
      />
      <P>Returns a single <Code>float</Code> p-value in <Code>(0, 1]</Code>.</P>
      <CodeBlock
        filename="mcpt_example.py"
        code={`import numpy as np, pandas as pd
from edgekit import validation as v
from edgekit.core import bootstrap_rng

def donchian_stat(o, h, l, c, n=20):
    """Total log-return captured while long a 20-bar Donchian breakout."""
    c = np.asarray(c, float)
    up = pd.Series(h).rolling(n).max().shift(1).to_numpy()
    dn = pd.Series(l).rolling(n).min().shift(1).to_numpy()
    ret = np.diff(np.log(c), prepend=np.log(c[0]))
    pos, total = 0, 0.0
    for i in range(n + 1, len(c)):
        if pos == 0 and c[i - 1] > up[i - 1]:   pos = 1
        elif pos == 1 and c[i - 1] < dn[i - 1]: pos = 0
        total += pos * ret[i]
    return total

real = donchian_stat(o, h, l, c)

# null_fn re-runs the SAME statistic on a permuted market
def null_fn(rng):
    return donchian_stat(*v.permute_ohlc(o, h, l, c, rng))

p = v.mcpt(real, null_fn, n=1000, rng=bootstrap_rng())
print(f"permutation p = {p:.4f}")     # p < 0.01 -> real edge`}
      />

      <H2>Overfitting & significance</H2>

      <H3>pbo_cscv</H3>
      <P>
        Probability of Backtest Overfitting via CSCV (Bailey &amp; Lopez de Prado). Given a matrix of per-period returns
        with one column per config you tried, it splits time into <Code>S</Code> blocks, and over every balanced
        train/test partition picks the in-sample-best config and records where it lands out-of-sample. PBO is the
        fraction of splits where the IS-winner lands in the bottom half OOS.
      </P>
      <CodeBlock code={`pbo_cscv(M, S: int = 16) -> dict`} />
      <Ul>
        <Li><Code>M</Code> — a <Code>T × Nconfig</Code> matrix of per-period returns (one column per config).</Li>
        <Li><Code>S</Code> — number of contiguous time blocks to partition (default 16).</Li>
      </Ul>
      <P>Returns a dict: <Code>pbo</Code> (fraction), <Code>median_logit</Code>. Rule of thumb: <Code>{"> 0.50"}</Code> = overfit; <Code>{"< 0.35"}</Code> = acceptable.</P>

      <H3>deflated_sharpe</H3>
      <P>
        The Deflated Sharpe Ratio: the probability the observed Sharpe is real given you ran <Code>n_trials</Code>{" "}
        configurations. It discounts the Sharpe by the expected maximum Sharpe under the null across those trials, then
        converts to a probability with a skew/kurtosis correction.
      </P>
      <CodeBlock code={`deflated_sharpe(returns, n_trials: int = 1, sr_std: float | None = None,
                periods_per_year: float = 252.0) -> float`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">returns</Code>, "array", "—", "The winning strategy's return series."],
          [<Code key="b">n_trials</Code>, "int", "1", "How many configs you searched. 1 = no deflation (PSR vs 0)."],
          [<Code key="c">sr_std</Code>, "float | None", "None", "Std of Sharpe across trials (the search variance)."],
          [<Code key="d">periods_per_year</Code>, "float", "252.0", "Annualisation factor."],
        ]}
      />
      <P>Returns a probability <Code>float</Code> in <Code>[0, 1]</Code>. Want <Code>{"DSR > 0.95"}</Code>.</P>
      <CodeBlock code={`dsr = v.deflated_sharpe(winning_returns, n_trials=100, sr_std=0.03)`} />

      <H2>Out-of-sample & walk-forward</H2>

      <H3>walk_forward</H3>
      <P>
        Two modes, selected by <Code>refit</Code>. The honest default splits one strategy&apos;s returns into <Code>k</Code>{" "}
        consecutive blocks and checks each is positive (an edge should be spread across time, not concentrated in one
        block). The refit mode does expanding-window re-optimisation across a config matrix.
      </P>
      <CodeBlock code={`walk_forward(M, cfgs=None, k: int = 6, refit: bool = False,
             periods_per_year: float = 252.0) -> dict`} />
      <Ul>
        <Li><Code>M</Code> — a 1-D single-strategy return series (<Code>refit=False</Code>) or a <Code>T × Nconfig</Code> matrix (<Code>refit=True</Code>).</Li>
        <Li><Code>cfgs</Code> — config labels aligned to the matrix columns (only for <Code>refit=True</Code>).</Li>
        <Li><Code>k</Code> — number of sequential blocks (default 6).</Li>
        <Li><Code>refit</Code> — <Code>False</Code>: sequential-block test; <Code>True</Code>: expanding-window re-optimisation.</Li>
      </Ul>
      <P>
        <Strong>refit=False</Strong> returns <Code>refit, k, blocks</Code> (list of{" "}
        <Code>{"{n, sharpe, total, positive}"}</Code>), <Code>n_positive</Code>.{" "}
        <Strong>refit=True</Strong> returns <Code>refit, oos_sharpe, picks, n_folds, oos_returns, stable</Code>.
      </P>
      <CodeBlock
        code={`out = v.walk_forward(daily_r, k=6, refit=False)
print(out["n_positive"], "/", out["k"])   # want most blocks positive

# expanding-window re-optimisation across a config matrix
out = v.walk_forward(M, cfgs=list("abcdefgh"), k=6, refit=True)
print(out["oos_sharpe"], out["picks"])`}
      />

      <H3>oos_split</H3>
      <P>Hard calendar cut into in-sample / out-of-sample date-indexed slices — used to measure IS→OOS Sharpe degradation.</P>
      <CodeBlock code={`oos_split(df, cut: str = "2023-01-01")   # -> (in_sample, out_of_sample)`} />

      <H3>is_oos_split</H3>
      <P>Positional cut on a bare array: chronological split at fraction <Code>frac</Code> (no shuffle, preserving time&apos;s arrow).</P>
      <CodeBlock code={`is_oos_split(M, frac: float = 0.55)   # -> (IS, OOS) arrays

a, b = v.is_oos_split(np.arange(100), frac=0.55)   # len(a)==55, len(b)==45`} />

      <H2>Alpha vs beta</H2>

      <H3>is_it_beta</H3>
      <P>
        Regress strategy returns on a benchmark: is this alpha, or just the market in a strategy costume? A
        trend-follower that is really just long the market shows high beta and ~0 alpha.
      </P>
      <CodeBlock code={`is_it_beta(strat_ret, bench_ret, periods_per_year: float = 252.0) -> dict`} />
      <Ul>
        <Li><Code>strat_ret</Code> — the strategy return series.</Li>
        <Li><Code>bench_ret</Code> — the benchmark (e.g. buy-and-hold) return series, aligned.</Li>
        <Li><Code>periods_per_year</Code> — annualisation for the intercept (default 252).</Li>
      </Ul>
      <P>Returns a dict: <Code>beta</Code> (the slope), <Code>alpha</Code> (the annualised intercept residual).</P>
      <CodeBlock code={`out = v.is_it_beta(strat_daily, btc_buyhold_daily)
print(out["beta"], out["alpha"])   # want beta near 0 and alpha > 0`} />

      <H2>Robustness & regime</H2>

      <H3>param_sweep</H3>
      <P>Plateau detector: a real edge is robust to its knobs, an overfit one is a spike. <Code>run_fn(params)</Code> returns a Sharpe (or a dict containing <Code>&apos;sharpe&apos;</Code>) for each point in the grid.</P>
      <CodeBlock code={`param_sweep(run_fn, grid) -> dict`} />
      <P>Returns: <Code>sharpe_min, sharpe_median, sharpe_max, spread, n</Code>. A tight spread across the grid is a plateau (good); a lone spike is overfit.</P>
      <CodeBlock code={`out = v.param_sweep(lambda p: run_config(entry_n=p), grid=range(15, 30))
print(out["sharpe_median"], out["spread"])`} />

      <H3>regime_by_year</H3>
      <P>Per-year breakdown of an R-stream — is the edge spread across years, or one lucky one?</P>
      <CodeBlock code={`regime_by_year(r, dates) -> pd.DataFrame`} />
      <P>Returns a DataFrame indexed by calendar year, columns <Code>n, ev, win, pf, total_r</Code>.</P>
      <CodeBlock code={`df = v.regime_by_year(trades.r, trades.date)
print(df)   # year-by-year n / ev / win / pf / total_r`} />

      <H3>regime_by_adx</H3>
      <P>Split net returns into chop (<Code>{"ADX < thr"}</Code>) vs trend (<Code>{"ADX >= thr"}</Code>). Trend systems should make money in trends and bleed little in chop.</P>
      <CodeBlock code={`regime_by_adx(net, adx, thr: float = 20.0) -> dict`} />
      <P>Returns: <Code>chop_ev, trend_ev, n_chop, n_trend</Code>.</P>

      <H2>Forward risk</H2>

      <H3>block_bootstrap_mc</H3>
      <P>
        Stationary block-bootstrap of a daily-return stream into forward wealth &amp; drawdown distributions. Resampling
        5-day <em>blocks</em> (rather than i.i.d. days) preserves autocorrelation and vol-clustering, so the drawdown
        distribution is honest rather than optimistic.
      </P>
      <CodeBlock code={`block_bootstrap_mc(returns, block: int = 5, horizon: int = 252,
                   n: int = 20000, rng=None) -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">returns</Code>, "array", "—", "Daily return stream."],
          [<Code key="b">block</Code>, "int", "5", "Block length in days (preserves serial structure)."],
          [<Code key="c">horizon</Code>, "int", "252", "Length of each simulated path."],
          [<Code key="d">n</Code>, "int", "20000", "Number of paths."],
          [<Code key="e">rng</Code>, "Generator | None", "None", "Seeded generator."],
        ]}
      />
      <P>Returns: <Code>terminal</Code> (array of terminal cum-returns), <Code>drawdowns</Code> (array of max DDs). Raises <Code>ValueError</Code> if fewer than <Code>block+1</Code> returns.</P>

      <H3>dd95</H3>
      <P>The 95th-percentile max drawdown from the block-bootstrap — the number to size against, more conservative than the single realised historical drawdown.</P>
      <CodeBlock code={`dd95(returns, block: int = 5, horizon: int = 252, n: int = 15000, rng=None) -> float`} />
      <CodeBlock code={`worst = v.dd95(daily_r, horizon=252)   # size the book against THIS, not the lucky historical DD`} />

      <H3>cost_stress</H3>
      <P>
        Re-exported from <A href="/docs/api/costs">edgekit.costs</A> as gauntlet step 6. Re-run a strategy at escalating
        cost and return <Code>{"{mult: metrics}"}</Code>; a real edge degrades gracefully, a fake one collapses.
        Survivor rule of thumb: PF must stay <Code>{"> 1"}</Code> at 2x and 3x.
      </P>
      <CodeBlock code={`cost_stress(run_fn, base=None, mults=(1.0, 2.0, 3.0)) -> dict

from edgekit.strategy import ORB
from edgekit import trade_stats
def run(cost): return trade_stats(ORB(or_bars=30, target_r=2.0).backtest(rth, cost=cost, warmup=5, bars_per_day=390).r)
grid = v.cost_stress(run)   # {1.0: {...}, 2.0: {...}, 3.0: {...}}`} />

      <Callout kind="tip" title="The full gauntlet, in order">
        <P>
          Permutation (<Code>mcpt</Code>) → walk-forward (<Code>walk_forward</Code>) → overfit (<Code>pbo_cscv</Code>,{" "}
          <Code>deflated_sharpe</Code>) → is-it-beta (<Code>is_it_beta</Code>) → regime (<Code>regime_by_year</Code>,{" "}
          <Code>regime_by_adx</Code>) → cost stress (<Code>cost_stress</Code>) → forward risk (<Code>dd95</Code>). What
          survives all of it is worth sizing.
        </P>
      </Callout>

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/concepts/gauntlet">The validation gauntlet</A> — the concept, end to end.</Li>
        <Li><A href="/docs/api/strategy">edgekit.strategy</A> — the R-multiple backtests you feed into these tests.</Li>
        <Li><A href="/docs/api/costs">edgekit.costs</A> — the source of <Code>cost_stress</Code>.</Li>
      </Ul>
    </>
  );
}
