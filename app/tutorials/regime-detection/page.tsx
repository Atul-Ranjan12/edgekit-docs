import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Code, Callout } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Regime detection" };

export default function Page() {
  return (
    <>
      <H1>Regime detection</H1>
      <Lead>
        A strategy is rarely good or bad in the abstract — it is good in one <em>market regime</em> and bad in another.
        Trend-following prints money in a persistent bull and bleeds in a choppy range; a mean-reversion pair reverts in
        calm and gets run over in a crisis. If you could reliably know which regime you are in, you could switch models
        on and off, or scale risk up and down, and let each edge trade only where it works. This chapter is the
        statistical machinery for asking &ldquo;what regime is this?&rdquo; — Markov chains, transition matrices, and a
        two-state hidden Markov model — and, just as importantly, the ways that question quietly cheats.
      </Lead>

      <Callout kind="warn" title="Regime detection is a risk overlay, not an alpha">
        Nothing in this chapter is a strategy on its own. A regime label is an input that <em>gates</em> or{" "}
        <em>scales</em> an edge you have already validated. It is also the single easiest place in quant to fool
        yourself with look-ahead — labelling regimes with information from the future. Read the last section before you
        trust any regime chart.
      </Callout>

      <Callout kind="tip" title="Why a trader cares">
        Your mean-reversion pair made money all spring, then gave three months of it back over one ugly week in the
        autumn. Nothing was wrong with the signal — the <em>market</em> changed underneath it: it left the calm,
        range-bound regime where fading works and entered a violent trending one where it does not. If you had a
        reliable answer to &ldquo;which regime am I in right now?&rdquo; you could have stood the pair down before the
        bad week and let it trade only where it wins. This chapter builds that detector — and, just as important, shows
        the two ways it will quietly lie to you if you are not careful.
      </Callout>

      <H2>Markets switch regimes</H2>
      <P>
        The observable symptom of a regime is a shift in the <em>statistics</em> of returns, not the returns
        themselves. Two regimes worth separating recur everywhere:
      </P>
      <Ul>
        <Li>
          <Strong>Calm vs volatile.</Strong> The clearest and most robust split. Volatility clusters (you saw this with
          GARCH), so the market spends stretches in a low-variance state and stretches in a high-variance state, with
          sharp transitions between them. Risk sizing lives or dies on getting this right.
        </Li>
        <Li>
          <Strong>Trending vs choppy.</Strong> A directional-persistence split: in a trend, moves autocorrelate and
          momentum pays; in a range, moves reverse and fading pays. Harder to detect cleanly than the vol split, because
          the difference is in the sign structure, not the magnitude.
        </Li>
      </Ul>
      <P>
        The modelling assumption that makes this tractable: the regime is a <em>hidden</em> discrete state that you
        cannot observe directly, but which changes the distribution of the returns you <em>can</em> observe. Estimate
        the state from the observations and you have a regime detector.
      </P>
      <ChartFigure
        name="tut/regime_shift"
        alt="A return series whose volatility and mean visibly shift between two regimes"
        caption="A series that switches between a calm regime (tight, low-variance fluctuations) and a volatile regime (wide swings). The regime is not directly labelled in the data — the job of a regime model is to recover the hidden state that generated each bar."
      />

      <H2>Markov chains and transition matrices</H2>
      <P>
        The mathematical backbone is a <Strong>Markov chain</Strong>: a system that hops between a finite set of states,
        where the probability of the next state depends only on the current state — not the whole history. That
        memoryless property is the Markov assumption:
      </P>
      <Math>{"P(S_{t+1} = j \\mid S_t = i, S_{t-1}, \\dots) = P(S_{t+1} = j \\mid S_t = i) = A_{ij}"}</Math>
      <P>
        All the dynamics live in the <Strong>transition matrix</Strong> <MathInline>{"A"}</MathInline>, whose entry{" "}
        <MathInline>{"A_{ij}"}</MathInline> is the probability of moving from state <MathInline>{"i"}</MathInline> to
        state <MathInline>{"j"}</MathInline>. Each row sums to 1. For a two-state calm/volatile model it is just:
      </P>
      <Math>{"A = \\begin{pmatrix} A_{00} & A_{01} \\\\ A_{10} & A_{11} \\end{pmatrix}, \\qquad A_{i0} + A_{i1} = 1"}</Math>
      <P>
        The diagonal entries are the <em>persistence</em> of each regime. A calm state with{" "}
        <MathInline>{"A_{00} = 0.97"}</MathInline> stays calm 97% of bars, so its expected duration is{" "}
        <MathInline>{"1/(1 - A_{00}) \\approx 33"}</MathInline> bars. High diagonal values are what make regimes{" "}
        <em>sticky</em> — long runs rather than bar-to-bar flip-flopping — which is exactly the realistic behaviour you
        want a detector to reproduce.
      </P>
      <Callout kind="tip" title="Scenario: reading durations off the transition matrix">
        A fit on daily equity returns hands back{" "}
        <MathInline>{"A = \\begin{pmatrix} 0.97 & 0.03 \\\\ 0.10 & 0.90 \\end{pmatrix}"}</MathInline>. Read it as
        expected durations. The calm state (row 0) persists with <MathInline>{"A_{00}=0.97"}</MathInline>, so once calm
        it stays calm for <MathInline>{"1/(1-0.97) \\approx 33"}</MathInline> trading days — about a month and a half of
        quiet. The volatile state (row 1) persists with <MathInline>{"A_{11}=0.90"}</MathInline>, an expected{" "}
        <MathInline>{"1/(1-0.90)=10"}</MathInline> days — storms are shorter than calms, which matches how markets
        actually behave. And <MathInline>{"A_{01}=0.03"}</MathInline> says that on any given calm day there is only a 3%
        chance of tipping into turmoil tomorrow. Those numbers are what stop a detector from flip-flopping regime every
        other bar — the stickiness is baked into the matrix.
      </Callout>

      <H2>The two-state Gaussian HMM</H2>
      <P>
        A <Strong>hidden Markov model</Strong> makes the state unobserved and ties each state to a distribution over the
        observations. In the Gaussian two-state version, each bar&apos;s return is drawn from one of two normal
        distributions — one for each regime — and which one is chosen follows the Markov chain above:
      </P>
      <Math>{"S_t \\in \\{0, 1\\} \\ \\text{(hidden)}, \\qquad x_t \\mid S_t = k \\ \\sim\\ \\mathcal{N}(\\mu_k, \\sigma_k^2)"}</Math>
      <P>
        So the model has three sets of parameters: the two state means{" "}
        <MathInline>{"\\mu_0, \\mu_1"}</MathInline>, the two state variances{" "}
        <MathInline>{"\\sigma_0^2, \\sigma_1^2"}</MathInline>, and the transition matrix{" "}
        <MathInline>{"A"}</MathInline>. Fit to returns, it typically discovers one low-variance state and one
        high-variance state — the calm/volatile split — without ever being told the labels.
      </P>

      <H3>Baum-Welch: fitting without labels</H3>
      <P>
        You never observe the states, so you cannot fit by counting. The <Strong>Baum-Welch</Strong> algorithm (the
        expectation-maximisation instance for HMMs) solves the chicken-and-egg problem by iterating:
      </P>
      <Ul>
        <Li>
          <Strong>E-step (forward-backward).</Strong> Given the current parameters, compute the posterior probability
          that each bar was in each state — the <em>responsibilities</em> <MathInline>{"\\gamma_t(k)"}</MathInline>.
        </Li>
        <Li>
          <Strong>M-step.</Strong> Given those soft state assignments, re-estimate the means, variances, and transition
          matrix as probability-weighted averages.
        </Li>
      </Ul>
      <P>
        Iterate to convergence and the parameters settle on a local maximum of the likelihood. edgekit&apos;s{" "}
        <Code>hmm_two_state</Code> implements this in pure numpy with scaled forward-backward for numerical stability,
        initialises the two means at the low and high quantiles of the data (so state 0 = low, state 1 = high for
        identifiability), and uses sticky initial transitions so it prefers long runs over rapid flipping:
      </P>
      <CodeBlock code={`import edgekit as ek

rets = ek.timeseries.log_returns(bars.close)

h = ek.timeseries.hmm_two_state(rets, iters=100, seed=0)
# h == {"states": ndarray of 0/1,   # the argmax-posterior regime path
#       "means":  [mu0, mu1],        # state means (state 0 low, state 1 high)
#       "vars":   [var0, var1],      # state variances
#       "trans":  2x2 row-stochastic transition matrix A,
#       "prob":   ndarray}           # posterior P(state 1) per bar, in [0,1]

print("regime means:", h["means"])
print("persistence (diagonal):", h["trans"][0][0], h["trans"][1][1])`} />
      <P>
        The <Code>prob</Code> array — the posterior probability of being in the high state at each bar — is more useful
        than the hard <Code>states</Code> path, because it is a continuous confidence you can threshold or size against
        rather than a brittle 0/1 flip.
      </P>
      <ChartFigure
        name="tut/hmm_regimes"
        alt="A price series shaded by the HMM-inferred regime with the posterior probability below"
        caption="Top: the series with bars shaded by the HMM's inferred regime (calm vs volatile). Bottom: the posterior probability of the high-variance state — a continuous signal that ramps through transitions rather than snapping, which is what you actually gate risk on."
      />
      <Callout kind="tip" title="Scenario: the HMM flags a volatile month">
        Fit <Code>hmm_two_state</Code> to daily S&amp;P 500 returns and, without ever being told the labels, it
        discovers two states: state 0 with <MathInline>{"\\mu_0\\approx+0.05\\%,\\ \\sigma_0\\approx0.7\\%"}</MathInline>{" "}
        (calm, gently drifting up) and state 1 with <MathInline>{"\\mu_1\\approx-0.10\\%,\\ \\sigma_1\\approx2.4\\%"}</MathInline>{" "}
        (volatile, negative-drift — the crash signature). Through most of the sample <Code>h[&quot;prob&quot;]</Code> —
        the posterior probability of the high-variance state — sits near 0.05. Then, in one month, it ramps over three
        or four days from 0.1 to above 0.9 and stays pinned there for ~15 bars before decaying back. That elevated
        stretch <em>is</em> the volatile month, flagged bar by bar from the returns alone. Note the ramp: the
        continuous <Code>prob</Code> starts warning you <em>during</em> the transition, which is exactly the early
        signal you want — far more useful than the hard 0/1 <Code>states</Code> flip that only commits after the fact.
      </Callout>

      <H2>Using the regime</H2>
      <P>
        Once you have a regime label or probability, there are two clean ways to spend it, both risk overlays on an
        already-validated edge:
      </P>
      <Ul>
        <Li>
          <Strong>Gate the strategy.</Strong> Turn a model on only in the regime where it has an edge — e.g. allow a
          mean-reversion pair to trade only when <MathInline>{"P(\\text{volatile}) < 0.5"}</MathInline>, and stand aside
          in the high-vol state where reversion breaks down.
        </Li>
        <Li>
          <Strong>Scale the risk.</Strong> Keep trading in both regimes but shrink size when the volatile-state
          probability is high. Because the HMM&apos;s high state <em>is</em> the high-variance state, this is a discrete
          cousin of the continuous volatility targeting from the GARCH chapter.
        </Li>
      </Ul>
      <CodeBlock code={`# gate a signal by the inferred regime (posterior of the high-vol state)
h = ek.timeseries.hmm_two_state(rets, iters=100, seed=0)
p_high = h["prob"]                    # P(volatile) per bar

# inside a BaseStrategy: only take entries when the calm-regime probability is high
def regime_ok(t):
    return p_high[t] < 0.5            # stand aside in the volatile regime

# or scale exposure continuously: size_multiplier = 1 - p_high[t]`} />
      <Callout kind="tip" title="Scenario: gating the pair that blew up in the hook">
        Take the mean-reversion pair from the opening hook and gate it on this regime signal. In the calm state{" "}
        (<MathInline>{"p_{\\text{high}} < 0.5"}</MathInline>) it trades normally and harvests the reversion it is good
        at. When <Code>p_high</Code> ramped above 0.5 heading into that ugly autumn week, <Code>regime_ok</Code> would
        have returned <Code>False</Code> and stood the pair down — sitting out precisely the trending stretch that ran
        it over. The continuous alternative, <MathInline>{"\\text{size} = 1 - p_{\\text{high}}"}</MathInline>, is
        gentler: it does not slam the book shut, it fades exposure toward zero as conviction that the regime has turned
        rises. Either way the regime label is spent as a <em>risk overlay</em> on an edge you already validated — never
        as the edge itself.
      </Callout>
      <Callout kind="note" title="The high state maps to what you fit it on">
        Fit the HMM to <em>returns</em> and the two states separate by variance (calm vs volatile). Fit it to a{" "}
        <em>trend proxy</em> — say a rolling return or an ADX-like series — and the states separate by direction/trend
        strength instead. The model finds structure in whatever series you hand it, so choose the input to match the
        regime you actually care about.
      </Callout>

      <H2>Change-point detection: the other framing</H2>
      <P>
        An HMM answers &ldquo;which of these recurring states am I in?&rdquo; A complementary question is
        &ldquo;<em>when</em> did the statistics break?&rdquo; — <Strong>change-point detection</Strong>. Instead of a
        fixed set of states with return transitions, you scan for the moment the mean or variance of the series shifts,
        by comparing the likelihood of &ldquo;one distribution throughout&rdquo; against &ldquo;a distribution that
        switches at time <MathInline>{"\\tau"}</MathInline>.&rdquo; The two views are close cousins: a change point is a
        transition in a model with non-recurring states. Change-point framing is the natural tool when regimes do{" "}
        <em>not</em> recur — a one-way structural break like a market microstructure change — whereas the HMM is right
        when calm and volatile keep alternating.
      </P>

      <H2>The two ways regime models lie to you</H2>
      <P>
        Regime detection is uniquely seductive and uniquely dangerous, for two reasons that both amount to smuggling the
        future into the past.
      </P>
      <Callout kind="danger" title="Look-ahead in the labels">
        The Baum-Welch fit above uses the <em>entire</em> series to label every bar — the regime at bar{" "}
        <MathInline>{"t"}</MathInline> is informed by data from <MathInline>{"t+1, t+2, \\dots"}</MathInline>. That is a
        perfect in-sample chart and a fantasy in live trading, where you only have the past. To use a regime label in a
        backtest honestly you must re-fit (or at least re-infer) using <em>only data available at each bar</em> — an
        expanding or rolling fit — and accept that the causal label is laggier and noisier than the smoothed one. A
        strategy that looks brilliant on full-sample regime labels and mediocre on causal ones was trading the future.
      </Callout>
      <Callout kind="danger" title="Overfitting the regimes">
        With enough states, means, and variances, an HMM can carve any history into tidy regimes that &ldquo;explain&rdquo;
        every drawdown after the fact — and generalise to nothing. Two disciplines keep you honest: prefer the{" "}
        <em>fewest</em> states that capture a real economic distinction (two is usually plenty), and validate the{" "}
        <em>gated strategy</em> out-of-sample, not the regime fit. If the regime does not survive on data the model
        never saw, it was a story, not a signal. Take it through the <A href="/tutorials/the-gauntlet">gauntlet</A> like
        anything else.
      </Callout>

      <P>
        Next: <A href="/tutorials/risk-management">Risk management</A> — regimes tell you when risk is elevated; this
        final chapter of the part turns that into concrete controls: Value-at-Risk and its critiques, Expected Shortfall
        as a coherent tail measure, drawdown and the ulcer index, risk budgeting, and sizing to a risk target.
      </P>
    </>
  );
}
