import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Code } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Simulating markets" };

export default function Page() {
  return (
    <>
      <H1>Simulating markets</H1>
      <Lead>
        You have exactly one history — the single path the market happened to print. Every metric you compute is one draw
        from a distribution you never get to see. Simulation is how you widen the sample: generate price series the market
        <em> could</em> have printed, run the strategy on all of them, and ask whether the edge survives worlds that never
        happened. Used for validation it is a trap; used for robustness it is one of the sharpest tools you have.
      </Lead>

      <P>
        Start from scratch with a coin. You flip it 100 times, count 58 heads, and wonder: is this a biased coin, or did
        a fair one just have a good run? You cannot answer from the single sequence in your hand — so you do the obvious
        thing and <em>imagine</em> flipping a fair coin 100 times, over and over, to see how often pure chance produces
        58-or-more heads. A market history is exactly that one sequence of flips. Simulation is imagining the fair coin:
        build a world where you <em>know</em> there is no edge, run your strategy on thousands of draws from it, and see
        whether your backtest number is ordinary or extraordinary against that null. Everything in this chapter is that
        one move, dressed up for prices.
      </P>

      <H2>Why simulate at all</H2>
      <P>
        A backtest answers &ldquo;what would this strategy have done on the one path we observed?&rdquo; That is a sample
        of size one. The realised Sharpe, the max drawdown, the worst losing streak — each is a point estimate with a
        confidence interval you cannot read off a single equity curve. Two honest ways to widen the sample:
      </P>
      <Ul>
        <Li>
          <Strong>Resample the strategy&apos;s own trades</Strong> — the bootstrap / Monte-Carlo of R-multiples covered in{" "}
          <A href="/tutorials/monte-carlo">Monte Carlo</A>. This reshuffles outcomes you actually observed.
        </Li>
        <Li>
          <Strong>Resample the market itself</Strong> — generate synthetic price paths from a model, then run the whole
          strategy on each. This is what this chapter is about. It stresses the <em>entry/exit logic</em>, not just the
          trade order, because on each synthetic path the strategy makes fresh decisions.
        </Li>
      </Ul>
      <Callout kind="warn" title="Synthetic data validates nothing">
        A synthetic series has exactly the structure you built into its generator and no more. If you fit parameters to
        make a strategy look good on your own GBM paths, you have learned the generator, not the market. Use simulation
        to test <em>robustness</em> — &ldquo;does the edge degrade gracefully or fall off a cliff?&rdquo; — never to{" "}
        <em>confirm</em> an edge. Confirmation comes from out-of-sample data, the permutation test, and walk-forward
        (Part IV), on real bars.
      </Callout>

      <H2>The random walk and geometric Brownian motion</H2>
      <P>
        The textbook model of a price is a driftless-or-drifting random walk in log space. In continuous time it is
        geometric Brownian motion (GBM):
      </P>
      <Math>{"dS = \\mu\\, S\\, dt + \\sigma\\, S\\, dW"}</Math>
      <P>
        <MathInline>{"S"}</MathInline> is the price, <MathInline>{"\\mu"}</MathInline> the drift, <MathInline>{"\\sigma"}</MathInline> the
        volatility, and <MathInline>{"dW"}</MathInline> a Wiener increment. The reason GBM is the default is that it keeps
        prices positive and makes <em>log-returns</em> normal and i.i.d. To simulate it you discretise into a step of size{" "}
        <MathInline>{"\\Delta t"}</MathInline> and draw a standard-normal <MathInline>{"z_t \\sim N(0,1)"}</MathInline> each bar:
      </P>
      <Math>{"r_t = \\left(\\mu - \\tfrac{1}{2}\\sigma^2\\right)\\Delta t + \\sigma\\sqrt{\\Delta t}\\; z_t, \\qquad S_t = S_{t-1}\\, e^{\\,r_t}"}</Math>
      <P>
        The <MathInline>{"-\\tfrac{1}{2}\\sigma^2"}</MathInline> term is the Itô drift correction (the volatility drag from{" "}
        <A href="/tutorials/returns-and-compounding">returns and compounding</A>): without it the <em>median</em> path
        drifts up even at <MathInline>{"\\mu = 0"}</MathInline>. Setting <MathInline>{"\\mu = 0"}</MathInline> gives a pure
        random walk — the null world in which no trend-following or mean-reversion rule should make money net of costs.
      </P>
      <ChartFigure
        name="tut/gbm_paths"
        alt="A fan of simulated geometric-Brownian-motion price paths from a common start"
        caption="Many GBM paths from one seed price. Each is a plausible market that never happened; the strategy runs on every one."
      />
      <ChartFigure
        name="tut/lognormal_terminal"
        alt="A right-skewed histogram of the terminal prices of many simulated GBM paths, with the median below the mean"
        caption="Collapse that fan onto its endpoints and you get the terminal-price distribution — right-skewed and log-normal. It is the same view a terminal-R histogram gives you: where the many synthetic worlds actually end up, not just the average path."
      />

      <H3>Generating paths and running a strategy on them</H3>
      <P>
        edgekit strategies consume an OHLC frame, so the pattern is: simulate a close path, wrap it into a minimal bar
        frame, and call <Code>.backtest</Code>. Here a random walk (<MathInline>{"\\mu = 0"}</MathInline>) is fed to the
        illustrative <Code>SmaCross</Code> trend template — on a driftless series a trend rule should bleed the costs and
        nothing else, which is exactly the sanity check you want.
      </P>
      <CodeBlock
        filename="gbm_sim.py"
        code={`import numpy as np, pandas as pd
import edgekit as ek
from edgekit.strategy import SmaCross

def gbm_bars(n, mu=0.0, sigma=0.02, s0=100.0, seed=0):
    """One synthetic OHLC path from discretised GBM (dt = 1 bar)."""
    rng = np.random.default_rng(seed)
    z = rng.standard_normal(n)
    r = (mu - 0.5 * sigma**2) + sigma * z          # log-returns, dt = 1
    close = s0 * np.exp(np.cumsum(r))
    open_ = np.concatenate([[s0], close[:-1]])     # open = prior close
    wick = np.abs(rng.standard_normal(n)) * sigma * close
    idx = pd.date_range("2020-01-01", periods=n, freq="4h")
    return pd.DataFrame({
        "open": open_, "close": close,
        "high": np.maximum(open_, close) + wick,
        "low":  np.minimum(open_, close) - wick,
        "tick_volume": 1.0,
    }, index=idx)

# run the strategy on 500 independent null-world paths
finals = []
for seed in range(500):
    bars = gbm_bars(3000, mu=0.0, sigma=0.02, seed=seed)
    trades = SmaCross(fast=20, slow=100).backtest(bars, warmup=210, bars_per_day=6)
    finals.append(trades["r"].sum())              # terminal R on this path

finals = np.array(finals)
print(f"median terminal R = {np.median(finals):+.1f}   "
      f"P(profit) = {(finals > 0).mean():.0%}")`}
      />
      <P>
        On a driftless random walk the distribution of terminal R should sit around a <em>negative</em> median once the
        default cost model bites, with <MathInline>{"P(\\text{profit})"}</MathInline> near a coin flip. If a rule looks
        strongly profitable on pure noise, the bug is in the backtest (look-ahead), not the market — see{" "}
        <A href="/tutorials/why-backtests-lie">why backtests lie</A>.
      </P>
      <Callout kind="tip" title="Scenario: is SmaCross's BTCUSD result skill or luck?">
        You backtested <Code>SmaCross(20, 100)</Code> on your one real BTCUSD H4 history and it drew a tidy uphill
        equity curve. Before you believe a word of it, you build the null. With{" "}
        <MathInline>{"\\mu = 0"}</MathInline>, <MathInline>{"\\sigma = 0.02"}</MathInline> per 4-hour bar (roughly BTC&apos;s
        realised vol) and <MathInline>{"S_0 = 100"}</MathInline>, one call to <Code>gbm_bars(3000, mu=0.0)</Code> prints a
        single driftless path — about 500 days of a market that, by construction, trends nowhere. You run the same
        crossover on 500 such paths. The terminal-R histogram lands with a median near <MathInline>{"-6R"}</MathInline>{" "}
        and <MathInline>{"P(\\text{profit}) \\approx 44\\%"}</MathInline>: on pure noise the rule just bleeds the spread,
        exactly as it should. Your real BTC result sitting far in the right tail of that histogram is the first hint the
        trend was not manufactured by the crossover chasing random wiggles — a <em>hint</em> only, because the honest
        verdict still comes from the permutation test on real bars.
      </Callout>

      <H2>Adding jumps and fat tails</H2>
      <P>
        Real returns are not Gaussian: they are fat-tailed and punctuated by jumps (gaps, flash crashes, headline moves).
        A GBM path drawn from a normal will systematically <em>under</em>-stress a strategy&apos;s stops and drawdowns. Two
        cheap upgrades:
      </P>
      <Ul>
        <Li>
          <Strong>Student-t innovations</Strong> — replace <MathInline>{"z_t \\sim N(0,1)"}</MathInline> with a
          (variance-rescaled) Student-t with low degrees of freedom <MathInline>{"\\nu"}</MathInline>. Smaller{" "}
          <MathInline>{"\\nu"}</MathInline> = fatter tails; <MathInline>{"\\nu \\to \\infty"}</MathInline> recovers the normal.
        </Li>
        <Li>
          <Strong>A jump-diffusion (Merton) term</Strong> — add a compound-Poisson jump: with small per-bar probability{" "}
          <MathInline>{"\\lambda"}</MathInline> the return gets an extra shock <MathInline>{"J \\sim N(\\mu_J, \\sigma_J^2)"}</MathInline>.
        </Li>
      </Ul>
      <Math>{"r_t = \\left(\\mu - \\tfrac{1}{2}\\sigma^2\\right) + \\sigma\\, t_\\nu + \\mathbb{1}[u_t < \\lambda]\\; J_t"}</Math>
      <CodeBlock
        filename="fat_tails.py"
        code={`def fat_tail_returns(n, sigma=0.02, nu=4, lam=0.01, jump_sd=0.10, seed=0):
    rng = np.random.default_rng(seed)
    t = rng.standard_t(nu, n) * np.sqrt((nu - 2) / nu)   # unit-variance t
    jumps = (rng.random(n) < lam) * rng.normal(0.0, jump_sd, n)
    return -0.5 * sigma**2 + sigma * t + jumps`}
      />
      <P>
        Run the strategy across a sweep of <MathInline>{"\\nu"}</MathInline> and jump intensities and watch the max
        drawdown and worst-day statistics move. A rule whose survival depends on tails never appearing is not one you want
        sized to a hard drawdown budget (see <A href="/tutorials/prop-firm-capital">prop-firm and capital</A>).
      </P>
      <Callout kind="tip" title="Scenario: the jump your stop never saw">
        Your Gaussian stress said <Code>SmaCross</Code> survives with a 22% worst drawdown, so you size it against a 25%
        budget and feel safe. Then you switch on one Merton jump: <MathInline>{"\\lambda = 0.01"}</MathInline> (a shock
        roughly every 100 bars) with jump SD <MathInline>{"\\sigma_J = 0.10"}</MathInline> — a 10% gap, the kind BTC prints
        on a liquidation cascade or a headline. Re-run the same 200 seeds and the worst-drawdown distribution shifts
        right: the median max-DD climbs from ~22% to ~31%, and the ugliest seed touches 40% — right through your budget.
        Nothing about the rule changed; only the world got one honest feature meaner. The desk lesson: a stop sized to a
        Gaussian world is a stop that has never met a bad Tuesday. Size to the fat-tailed drawdown, or the first real gap
        sizes you.
      </Callout>

      <H2>Regime-switching simulation</H2>
      <P>
        Markets are not stationary: they flip between calm and turbulent, trending and ranging. A single{" "}
        <MathInline>{"(\\mu, \\sigma)"}</MathInline> can never produce that. The simplest realistic generator is a two-state
        Markov chain — a low-vol trending regime and a high-vol choppy regime — with sticky transition probabilities so
        each state persists:
      </P>
      <Math>{"P = \\begin{pmatrix} p_{00} & 1 - p_{00} \\\\ 1 - p_{11} & p_{11} \\end{pmatrix}, \\qquad r_t \\mid s_t \\sim N(\\mu_{s_t},\\, \\sigma_{s_t}^2)"}</Math>
      <P>
        High <MathInline>{"p_{00}"}</MathInline> and <MathInline>{"p_{11}"}</MathInline> (say 0.98) make regimes last on
        average <MathInline>{"1/(1-p)"}</MathInline> bars. This is the generator behind the classic test: a trend rule that
        prints beautifully in the trending state but gives it all back in the choppy state has a{" "}
        <em>regime-dependent</em> edge, and its live results will depend entirely on which regime it lands in.
      </P>
      <ChartFigure
        name="tut/regime_shift"
        alt="A simulated series switching between a calm low-volatility regime and a turbulent high-volatility regime"
        caption="A two-state regime-switching path. The strategy's edge — if any — is rarely uniform across the shaded regimes."
      />
      <CodeBlock
        filename="regime_sim.py"
        code={`def regime_returns(n, mus=(0.0008, -0.0002), sigmas=(0.008, 0.03),
                   p_stay=(0.98, 0.98), seed=0):
    rng = np.random.default_rng(seed)
    s = 0
    out = np.empty(n)
    for i in range(n):
        out[i] = rng.normal(mus[s], sigmas[s])
        if rng.random() > p_stay[s]:               # sticky switch
            s = 1 - s
    return out                                     # log-returns; exp-cumsum -> price`}
      />
      <Callout kind="tip" title="Scenario: the edge that only exists in half the tape">
        Run <Code>SmaCross</Code> on a two-state path — a calm trending regime
        (<MathInline>{"\\mu = 0.0008,\\ \\sigma = 0.008"}</MathInline>) and a choppy one
        (<MathInline>{"\\mu = -0.0002,\\ \\sigma = 0.03"}</MathInline>), each persisting ~50 bars on average — and tag
        every trade by the regime it opened in. The split is stark: the trend rule earns about{" "}
        <MathInline>{"+0.4R"}</MathInline> per trade in the trending state and loses about <MathInline>{"-0.3R"}</MathInline>{" "}
        in the choppy one. Its whole equity curve is just a race between how many bars each regime happened to get. Deploy
        it into a six-month chop and the &ldquo;edge&rdquo; is gone — not because it broke, but because it was always
        regime-conditional and your single blended Sharpe never told you <em>which</em> regime funded the backtest. That
        is the trap a lone summary statistic hides: it averages two different strategies into one comforting number.
      </Callout>

      <H2>Stress-testing a strategy on synthetic series</H2>
      <P>
        Put the pieces together into a stress harness: sweep a generator parameter, run the strategy on many seeds per
        setting, and summarise the R distribution with edgekit&apos;s metrics. The output is not &ldquo;is this an
        edge&rdquo; — it is &ldquo;how does this rule <em>degrade</em> as the world gets meaner?&rdquo;
      </P>
      <CodeBlock
        filename="stress.py"
        code={`import numpy as np
from edgekit import trade_stats

def stress(sigma, seeds=200):
    pfs = []
    for seed in range(seeds):
        bars = gbm_bars(3000, mu=0.0, sigma=sigma, seed=seed)
        tr = SmaCross(fast=20, slow=100).backtest(bars, warmup=210, bars_per_day=6)
        if len(tr):
            pfs.append(trade_stats(tr["r"].to_numpy())["pf"])
    return np.median(pfs)

for sigma in (0.01, 0.02, 0.04):
    print(f"sigma={sigma:.2f}  median PF over paths = {stress(sigma):.2f}")`}
      />
      <Callout kind="tip" title="What a healthy stress result looks like">
        A robust rule shows a smooth, monotone response to the knob — profit factor sliding gently as volatility rises,
        not a cliff. Sharp non-monotone jumps usually mean the strategy is exploiting a fragile artifact of one generator
        setting. And remember the baseline: on the <MathInline>{"\\mu = 0"}</MathInline> null world, net-of-cost profit
        factor below 1.0 is the <em>correct</em> answer, not a failure.
      </Callout>
      <P>
        <Strong>At the desk.</Strong> The sweep prints <Code>sigma=0.01 → PF 0.98</Code>,{" "}
        <Code>sigma=0.02 → PF 0.94</Code>, <Code>sigma=0.04 → PF 0.87</Code>. Read it as a slope, not three numbers:
        profit factor slides gently and monotonically as the world gets noisier, and every value sits just under 1.0 —
        precisely what a no-edge rule should do on a <MathInline>{"\\mu = 0"}</MathInline> null. That is a{" "}
        <em>healthy</em> result: there is no hidden fragility that one particular vol setting detonates. Had a single
        setting jumped to PF 1.6 while its neighbours sat at 0.9, you would suspect the backtest was harvesting an
        artifact of that one generator — and you would go hunting for the look-ahead before trusting a live dollar to it.
      </P>

      <H2>The caveat, restated</H2>
      <P>
        Synthetic markets are a lens for robustness, not a source of truth. They can tell you a strategy is fragile — a
        rule that dies the moment you add tails or flip regimes is telling you something real. They cannot tell you a
        strategy is good, because you built the world it succeeded in. Keep the two jobs separate: simulate to break
        things, validate on real out-of-sample data to believe things.
      </P>

      <P>
        <Strong>Next:</Strong> from hand-written rules to learned ones —{" "}
        <A href="/tutorials/machine-learning">Machine learning in trading</A> covers where ML actually helps
        (meta-labeling a rule, not predicting price) and the leakage traps that make most ML backtests fiction.
      </P>
    </>
  );
}
