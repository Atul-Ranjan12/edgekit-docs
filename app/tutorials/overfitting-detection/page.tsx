import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, A, Strong, Callout, Table, Code } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Overfitting detection" };

export default function Page() {
  return (
    <>
      <H1>Overfitting detection</H1>
      <Lead>
        The most dangerous backtests are the ones that look best, because the surest way to a great backtest is to try
        many things and keep the winner. This chapter is about catching that: reading a parameter surface for a plateau
        vs a knife-edge, estimating the probability of backtest overfitting with CSCV, and deflating the Sharpe by the
        number of trials you actually ran.
      </Lead>

      <P>
        The trap is human, not mathematical: you try things until something works, then remember only the thing that
        worked. Every discarded variant was a hidden lottery ticket, and the winner is partly just the luckiest ticket.
        This chapter is three ways of asking &quot;how lucky was my winner, really?&quot; — is one strategy stable when
        you nudge its dials (plateau vs knife-edge), does being the in-sample best predict anything out-of-sample (PBO),
        and does the winning Sharpe survive a correction for how many tickets you bought (deflated Sharpe). We will put
        real-ish numbers through each.
      </P>

      <H2>Parameter robustness — plateau vs knife-edge</H2>
      <P>
        A real effect is <em>robust to its knobs</em>. If a strategy works with a 200-bar filter, it should work almost
        as well at 180 or 240 — the parameter surface is a smooth <Strong>plateau</Strong>. An overfit strategy shows a
        lone towering spike: it is excellent at exactly one value and mediocre on either side, because that one value
        happened to fit the noise.
      </P>
      <ChartFigure
        name="tut/overfitting_curve"
        alt="A smooth plateau of performance across parameter values versus a single sharp spike"
        caption="A robust edge is a plateau across its parameter range; a lucky fit is a knife-edge spike surrounded by mediocrity."
      />
      <P>
        <A href="/docs/api/validation">param_sweep</A> quantifies this. It runs your strategy across a grid and reports
        the min, median, and max Sharpe plus the spread. A tight spread with a high median is a plateau; a huge spread
        dominated by one max is a lucky corner of parameter space.
      </P>
      <CodeBlock
        filename="param_sweep.py"
        code={`import edgekit as ek
from edgekit.strategy import ORB

def run(n):
    trades = ek.engine.run_bar_loop(rth, ORB(or_bars=n), warmup=5, bars_per_day=390)
    return ek.trade_stats(trades.r, dates=trades.date)["sharpe"]

sweep = ek.validation.param_sweep(run, grid=range(15, 61, 15))
print(sweep["sharpe_min"], sweep["sharpe_median"], sweep["sharpe_max"], sweep["spread"])
# tight spread, high median -> plateau (trust it); lone max -> overfit`}
      />
      <Callout kind="tip" title="Scenario — two sweeps that look identical if you only read the max">
        You sweep the ORB opening-range length over <Code>{"{15, 30, 45, 60}"}</Code> minutes on US100. Strategy A
        returns Sharpes <Code>[0.9, 1.1, 1.0, 0.85]</Code>; strategy B returns <Code>[0.1, 1.6, 0.2, 0.0]</Code>. Both
        have a max around 1.1–1.6, so a headline that quotes the best value makes B look <em>better</em>. But A is a
        plateau — median 0.95, spread 0.25, it works everywhere in the neighbourhood — while B is a knife-edge: the
        median is ~0.15 and the whole result hangs on the single 30-minute value fitting that sample&apos;s noise. In
        live trading you will not reliably sit on the exact optimum, so A&apos;s median 0.95 is roughly what you get and
        B&apos;s realistic expectation is ~0.15. Report the median and A wins; report the max and you ship B.
      </Callout>
      <Callout kind="tip" title="Report the median, not the max">
        The honest summary of a parameter sweep is the <em>median</em> performance across the plateau — the number you
        would get if you missed the optimum, which you will. Reporting the max is quietly reporting the overfit.
      </Callout>

      <H2>Probability of backtest overfitting (PBO via CSCV)</H2>
      <P>
        When you try many configurations, the question is not &quot;is the winner good in-sample?&quot; but &quot;does
        being the in-sample winner predict anything out-of-sample?&quot; Combinatorially Symmetric Cross-Validation
        (Bailey &amp; López de Prado) answers it directly.
      </P>
      <H3>How CSCV works</H3>
      <P>
        Take a <MathInline>{"T \\times N"}</MathInline> matrix of per-period returns — one column per config you tried.
        Split time into <MathInline>{"S"}</MathInline> blocks and form every balanced train/test partition (half the
        blocks in, half out). In each partition, find the config that was best in-sample, then look up its{" "}
        <em>rank</em> out-of-sample. PBO is the fraction of partitions where the in-sample winner lands in the{" "}
        <em>bottom half</em> out-of-sample:
      </P>
      <Math>{"\\text{PBO} = P\\!\\left(\\, r_{\\text{OOS}}(\\text{IS-best}) < \\text{median rank} \\,\\right)"}</Math>
      <P>
        If picking the in-sample best gives you a coin flip out-of-sample, PBO ≈ 0.5 and your selection has no
        predictive power. Rule of thumb: <MathInline>{"\\text{PBO} > 0.50"}</MathInline> is overfit;{" "}
        <MathInline>{"< 0.35"}</MathInline> is acceptable.
      </P>
      <CodeBlock
        filename="pbo.py"
        code={`import edgekit as ek

# M is a T x Nconfig matrix of per-period returns, one column per config tried
pbo = ek.validation.pbo_cscv(M, S=16)
print(pbo["pbo"], pbo["median_logit"])   # want pbo < 0.35`}
      />
      <P>
        <Strong>Scenario.</Strong> You have a <MathInline>{"T \\times 24"}</MathInline> matrix of daily returns, one
        column per ORB filter-combination you tried. CSCV splits time into <MathInline>{"S = 16"}</MathInline> blocks
        and forms every balanced half-in/half-out partition. In each one it finds the config that topped the in-sample
        half, then checks its rank on the held-out half. If <Code>pbo</Code> comes back <Strong>0.55</Strong>, then more
        than half the time your in-sample champion landed in the bottom half out-of-sample — picking the backtest winner
        is worse than a coin flip, so the <em>selection procedure itself</em> has no predictive power and the whole
        search is rejected regardless of how good the top config looked. If it comes back <Strong>0.20</Strong>, the
        in-sample winner reliably stays strong out-of-sample and your selection is trustworthy.
      </P>

      <H2>The deflated Sharpe ratio</H2>
      <P>
        Try enough strategies and a Sharpe of 2 appears from noise alone. The deflated Sharpe ratio (DSR) corrects the
        observed Sharpe for the number of trials that produced it, then converts to a probability that the true Sharpe
        is positive.
      </P>
      <H3>The expected maximum Sharpe under the null</H3>
      <P>
        The core insight: if you run <MathInline>{"n"}</MathInline> independent strategies with <em>zero</em> true edge,
        the best of them still has a positive Sharpe by luck, and its expectation grows with{" "}
        <MathInline>{"n"}</MathInline>. With <MathInline>{"\\sigma_{\\text{SR}}"}</MathInline> the standard deviation of
        Sharpe across trials, the expected maximum is approximately:
      </P>
      <Math>{"E[\\max SR] \\approx \\sigma_{\\text{SR}} \\left[ (1-\\gamma)\\,\\Phi^{-1}\\!\\left(1 - \\tfrac{1}{n}\\right) + \\gamma\\,\\Phi^{-1}\\!\\left(1 - \\tfrac{1}{n}e^{-1}\\right) \\right]"}</Math>
      <P>
        where <MathInline>{"\\Phi^{-1}"}</MathInline> is the inverse normal CDF and{" "}
        <MathInline>{"\\gamma"}</MathInline> the Euler–Mascheroni constant. This <MathInline>{"E[\\max SR]"}</MathInline>{" "}
        is the benchmark your winner has to beat. The DSR discounts the observed Sharpe by it and applies a
        skew/kurtosis correction to get a probability:
      </P>
      <Math>{"\\text{DSR} = \\Phi\\!\\left( \\frac{(SR - E[\\max SR])\\,\\sqrt{T-1}}{\\sqrt{1 - \\hat{\\gamma}_3 SR + \\frac{\\hat{\\gamma}_4 - 1}{4} SR^2}} \\right)"}</Math>
      <P>
        with <MathInline>{"\\hat{\\gamma}_3"}</MathInline> the skew and <MathInline>{"\\hat{\\gamma}_4"}</MathInline> the
        kurtosis of the returns. You want <MathInline>{"\\text{DSR} > 0.95"}</MathInline>.
      </P>
      <ChartFigure
        name="tut/multiple_testing"
        alt="Expected maximum Sharpe under the null rising with the number of trials"
        caption="Under the null, the expected maximum Sharpe rises with the number of trials. DSR asks whether your winner beats that bar."
      />
      <CodeBlock
        filename="dsr.py"
        code={`import edgekit as ek

# n_trials = how many configs you actually searched; sr_std = spread of Sharpe across them
dsr = ek.validation.deflated_sharpe(winning_returns, n_trials=100, sr_std=0.03)
print(dsr)   # probability the Sharpe is real; want > 0.95`}
      />
      <Callout kind="tip" title="Scenario — the Sharpe 2.1 that deflates to a coin flip">
        You searched 100 configurations of a mean-reversion system and the winner posted <Strong>Sharpe 2.1</Strong>
        over ~500 daily observations. Before celebrating, ask what the <em>best of 100</em> zero-edge systems would
        score by luck. With a Sharpe spread of about <Code>sr_std = 0.5</Code> across your configs, the expected maximum
        under the null, <MathInline>{"E[\\max SR]"}</MathInline>, already lands near 1.3 — so a big chunk of your 2.1 is
        just &quot;best of 100 dice.&quot; Feeding <Code>n_trials=100</Code> into <Code>deflated_sharpe</Code> discounts
        the 2.1 by that 1.3 benchmark and, after the skew/kurtosis and sample-length terms, returns DSR ≈ 0.70 — below
        the 0.95 bar. The honest verdict: the winner is probably real-<em>ish</em> but nowhere near a Sharpe-2 system,
        and on these trials it fails to clear the multiple-testing correction. Now imagine you under-reported and typed{" "}
        <Code>n_trials=1</Code>: DSR jumps past 0.99 and you ship an overfit. The correction is only as honest as the
        trial count you feed it.
      </Callout>
      <Callout kind="warn" title="Count every trial, honestly">
        <Code>n_trials</Code> is the number of configurations you searched — including the ones you discarded and the
        ones you tried &quot;just to see&quot;. Under-reporting trials is how a p-hacked strategy passes DSR. If you
        cannot count them, the deflation is meaningless, and you should distrust the winner by default.
      </Callout>

      <H2>The three together</H2>
      <P>
        These are complementary views of the same danger. <Code>param_sweep</Code> asks whether a single strategy is
        robust to its own knobs; <Code>pbo_cscv</Code> asks whether your <em>selection procedure</em> across many
        configs has any OOS power; <Code>deflated_sharpe</Code> asks whether the winning Sharpe survives the
        multiple-testing correction. A strategy worth sizing shows a plateau, PBO below 0.35, and DSR above 0.95.
      </P>
      <Table
        head={["Diagnostic", "Asks", "Pass"]}
        rows={[
          [<Code key="a">param_sweep</Code>, "Is one strategy robust to its knobs?", "tight spread, high median (plateau)"],
          [<Code key="b">pbo_cscv</Code>, "Does IS-best predict OOS?", "PBO < 0.35"],
          [<Code key="c">deflated_sharpe</Code>, "Does the Sharpe survive n_trials?", "DSR > 0.95"],
        ]}
      />

      <P>
        <Strong>Next:</Strong>{" "}
        <A href="/tutorials/alpha-vs-beta">Alpha vs beta</A> — separating genuine skill from leveraged market
        exposure, and the honest haircut you apply before believing any of it.
      </P>
    </>
  );
}
