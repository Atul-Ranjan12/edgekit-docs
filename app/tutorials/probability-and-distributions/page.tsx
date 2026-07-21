import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, A, Strong, Callout } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Probability & distributions" };

export default function Page() {
  return (
    <>
      <H1>Probability & distributions</H1>
      <Lead>
        A return is a random variable — you cannot know tomorrow&rsquo;s, only its distribution of possibilities.
        Trading is the business of taking bets whose average outcome is positive while surviving the tails. This
        chapter builds the vocabulary — expectation, variance, the Normal, and crucially why markets are <em>not</em>{" "}
        Normal — that the rest of the course reasons in.
      </Lead>

      <H2>Random variables & expected value</H2>
      <P>
        A <Strong>random variable</Strong> <MathInline>{"X"}</MathInline> is a quantity whose value is uncertain — a
        trade&rsquo;s return, tomorrow&rsquo;s move. Its <Strong>expected value</Strong>{" "}
        <MathInline>{"E[X]"}</MathInline> is the probability-weighted average outcome: the long-run mean if you could
        replay the bet forever. For a discrete variable:
      </P>
      <Math>{"E[X] = \\sum_i x_i \\, p(x_i)"}</Math>
      <P>and for a continuous one, the integral against its density <MathInline>{"f(x)"}</MathInline>:</P>
      <Math>{"E[X] = \\int_{-\\infty}^{\\infty} x \\, f(x) \\, dx"}</Math>
      <P>
        Expectation is <em>linear</em>: <MathInline>{"E[aX + bY] = a\\,E[X] + b\\,E[Y]"}</MathInline>, always, even
        when <MathInline>{"X"}</MathInline> and <MathInline>{"Y"}</MathInline> are dependent. This is the engine behind
        expectancy — a strategy&rsquo;s edge is just the expected value of one trade, and the total is the sum of the
        parts. It is the single most important quantity in the whole course.
      </P>
      <H3>Proof: linearity of expectation</H3>
      <P>
        Linearity is worth proving once because it holds <em>unconditionally</em> — no independence required — and that
        is exactly what makes expectancy add up trade by trade.
      </P>
      <Callout kind="note" title="Derivation — sum over the joint distribution">
        <p>
          Let <MathInline>{"p(x,y)"}</MathInline> be the joint probability of{" "}
          <MathInline>{"X = x"}</MathInline> and <MathInline>{"Y = y"}</MathInline>. By definition,
        </p>
        <Math>{"\\mathbb{E}[aX + bY] = \\sum_{x}\\sum_{y} (ax + by)\\,p(x,y)"}</Math>
        <p>Split the sum and pull the constants out:</p>
        <Math>{"= a\\sum_{x} x \\sum_{y} p(x,y) \\; + \\; b\\sum_{y} y \\sum_{x} p(x,y)"}</Math>
        <p>
          The inner sums are just the marginals — <MathInline>{"\\sum_y p(x,y) = p_X(x)"}</MathInline> and{" "}
          <MathInline>{"\\sum_x p(x,y) = p_Y(y)"}</MathInline> — so
        </p>
        <Math>{"= a\\sum_{x} x\\,p_X(x) + b\\sum_{y} y\\,p_Y(y) = a\\,\\mathbb{E}[X] + b\\,\\mathbb{E}[Y].\\quad\\blacksquare"}</Math>
        <p>
          Nothing above assumed <MathInline>{"X"}</MathInline> and <MathInline>{"Y"}</MathInline> were independent — the
          joint distribution carried all the dependence, and it dropped out.
        </p>
      </Callout>
      <Callout kind="tip" title="Why it matters for trading">
        Linearity is why a strategy&rsquo;s total expected profit is the sum of its trades&rsquo; expectancies even
        though the trades are correlated (same regime, overlapping positions). You can add up edges without untangling
        their dependence — but, as we will see, you <em>cannot</em> add up their variances that way.
      </Callout>
      <H3>Random variables, PDF and CDF</H3>
      <P>
        Two functions fully describe a continuous random variable. The <Strong>cumulative distribution function</Strong>{" "}
        (CDF) gives the probability of landing at or below a level — it runs monotonically from 0 to 1:
      </P>
      <Math>{"F(x) = P(X \\le x), \\qquad F(-\\infty) = 0, \\; F(+\\infty) = 1"}</Math>
      <P>
        The <Strong>probability density function</Strong> (PDF) is its derivative,{" "}
        <MathInline>{"f(x) = F'(x)"}</MathInline>, so probability is area under the density:{" "}
        <MathInline>{"P(a < X \\le b) = \\int_a^b f(x)\\,dx = F(b) - F(a)"}</MathInline>. A single point has zero
        probability; only intervals carry mass. The CDF is the object behind quantiles and VaR (later on this page); the
        PDF is the bell curve you picture.
      </P>
      <Callout kind="tip" title="Scenario: the expected value of one ORB trade">
        Picture an opening-range breakout on US100 that risks 1R to make 2R. Historically it wins 40% of the time. Model
        one trade as a random variable <MathInline>{"R"}</MathInline>: it pays <MathInline>{"+2"}</MathInline> with
        probability 0.40 and <MathInline>{"-1"}</MathInline> with probability 0.60. Its expected value is{" "}
        <MathInline>{"E[R] = (0.40)(+2) + (0.60)(-1) = 0.8 - 0.6 = +0.2R"}</MathInline>. So <em>on average</em> each
        trade adds a fifth of a risk unit. But look at what you actually experience: no single trade ever returns{" "}
        <MathInline>{"+0.2R"}</MathInline> — every outcome is either <MathInline>{"+2R"}</MathInline> or{" "}
        <MathInline>{"-1R"}</MathInline>, and the more common one is a loss. The <MathInline>{"+0.2R"}</MathInline> is the
        center of gravity you drift toward over hundreds of trades, not a forecast of the next one. That is why a losing
        streak can be perfectly consistent with a real positive expectancy.
      </Callout>
      <Callout kind="note" title="Expectation is not what you will get">
        <MathInline>{"E[X]"}</MathInline> is the center of gravity of the distribution, not a prediction of any single
        draw. A coin flip paying +2 or −1 has <MathInline>{"E[X] = 0.5"}</MathInline>, but no individual flip ever
        returns 0.5. Edge is a statement about the average of <em>many</em> trades — the theme of{" "}
        <A href="/tutorials/the-math-of-edge">The math of edge</A>.
      </Callout>

      <H2>Variance & standard deviation</H2>
      <P>
        Expectation tells you the center; <Strong>variance</Strong> tells you the spread. It is the expected squared
        distance from the mean:
      </P>
      <Math>{"\\operatorname{Var}(X) = \\sigma^2 = E\\big[(X - \\mu)^2\\big] = E[X^2] - \\mu^2"}</Math>
      <Callout kind="note" title="Derivation — the computational identity">
        <p>
          The far-right form <MathInline>{"E[X^2] - \\mu^2"}</MathInline> is the one you actually compute with. Expand
          the square inside the expectation and use linearity, remembering <MathInline>{"\\mu = E[X]"}</MathInline> is a
          constant:
        </p>
        <Math>{"\\operatorname{Var}(X) = E\\big[(X-\\mu)^2\\big] = E\\big[X^2 - 2\\mu X + \\mu^2\\big] = E[X^2] - 2\\mu\\,E[X] + \\mu^2"}</Math>
        <p>
          Since <MathInline>{"E[X] = \\mu"}</MathInline>, the middle term is{" "}
          <MathInline>{"-2\\mu^2"}</MathInline> and it collapses:
        </p>
        <Math>{"= E[X^2] - 2\\mu^2 + \\mu^2 = E[X^2] - \\mu^2.\\quad\\blacksquare"}</Math>
        <p>
          A useful corollary: because a variance can never be negative,{" "}
          <MathInline>{"E[X^2] \\ge (E[X])^2"}</MathInline> always — a special case of Jensen for the convex function{" "}
          <MathInline>{"x^2"}</MathInline>.
        </p>
      </Callout>
      <P>
        Squaring makes it awkward to read (units of return-squared), so we usually quote the{" "}
        <Strong>standard deviation</Strong> <MathInline>{"\\sigma = \\sqrt{\\operatorname{Var}(X)}"}</MathInline>,
        which is back in the units of the return itself. In finance <MathInline>{"\\sigma"}</MathInline> is called{" "}
        <em>volatility</em>, and it is the denominator of the Sharpe ratio and the raw material of position sizing.
      </P>
      <P>
        A key scaling fact: for independent returns, variance adds over time, so volatility grows with the{" "}
        <em>square root</em> of the horizon. Daily vol annualises as{" "}
        <MathInline>{"\\sigma_{\\text{ann}} = \\sigma_{\\text{daily}} \\sqrt{252}"}</MathInline>. That{" "}
        <MathInline>{"\\sqrt{N}"}</MathInline> shows up again in the standard error and in the Sharpe annualisation —
        it is the same idea each time.
      </P>

      <H2>Covariance, correlation & diversification</H2>
      <P>
        Variance describes one variable in isolation. <Strong>Covariance</Strong> measures how two move{" "}
        <em>together</em> — the expected product of their deviations from their means:
      </P>
      <Math>{"\\operatorname{Cov}(X,Y) = E\\big[(X - \\mu_X)(Y - \\mu_Y)\\big] = E[XY] - \\mu_X \\mu_Y"}</Math>
      <P>
        Positive covariance: when one is above its mean the other tends to be too. The second form comes from the same
        expand-and-cancel trick as the variance identity (indeed <MathInline>{"\\operatorname{Cov}(X,X) = \\operatorname{Var}(X)"}</MathInline>). Covariance
        is hard to read on its own because its units are the product of the two variables&rsquo; units, so we normalise
        it into the unitless <Strong>correlation coefficient</Strong>:
      </P>
      <Math>{"\\rho_{XY} = \\frac{\\operatorname{Cov}(X,Y)}{\\sigma_X \\, \\sigma_Y} \\in [-1, 1]"}</Math>
      <ChartFigure
        name="tut/correlation_scatter"
        alt="Scatter of two assets' returns with a fitted line and the correlation coefficient"
        caption="What ρ actually looks like: each point is one period's paired returns, the line is the best linear fit, and ρ measures how tightly the cloud hugs it. Near ±1 the points collapse onto the line; near 0 they scatter into a shapeless blob."
      />
      <Callout kind="note" title="Proof sketch — why ρ lives in [−1, 1] (Cauchy–Schwarz)">
        <p>
          For any real <MathInline>{"t"}</MathInline>, a variance is non-negative, so
        </p>
        <Math>{"0 \\le \\operatorname{Var}(X + tY) = \\operatorname{Var}(X) + 2t\\,\\operatorname{Cov}(X,Y) + t^2\\,\\operatorname{Var}(Y)"}</Math>
        <p>
          The right side is a quadratic in <MathInline>{"t"}</MathInline> that is never negative, so its discriminant
          must be <MathInline>{"\\le 0"}</MathInline>:
        </p>
        <Math>{"\\big(2\\operatorname{Cov}(X,Y)\\big)^2 - 4\\,\\operatorname{Var}(X)\\operatorname{Var}(Y) \\le 0 \\;\\Longrightarrow\\; \\operatorname{Cov}(X,Y)^2 \\le \\sigma_X^2\\,\\sigma_Y^2"}</Math>
        <p>
          Taking square roots gives <MathInline>{"|\\operatorname{Cov}(X,Y)| \\le \\sigma_X \\sigma_Y"}</MathInline>,
          which is exactly <MathInline>{"|\\rho| \\le 1"}</MathInline>. Equality (<MathInline>{"\\rho = \\pm 1"}</MathInline>) happens only when{" "}
          <MathInline>{"X"}</MathInline> and <MathInline>{"Y"}</MathInline> are perfectly linearly related.{" "}
          <span>&#9632;</span>
        </p>
      </Callout>
      <P>
        Covariance is the whole reason diversification works. The variance of a two-position book is
      </P>
      <Math>{"\\operatorname{Var}(X + Y) = \\operatorname{Var}(X) + \\operatorname{Var}(Y) + 2\\,\\operatorname{Cov}(X,Y)"}</Math>
      <P>
        When the two edges are uncorrelated the cross term vanishes and risk adds in <em>quadrature</em> —{" "}
        combined volatility grows like <MathInline>{"\\sqrt{2}"}</MathInline>, not 2 — so the book&rsquo;s
        return-to-risk improves. Negative covariance shrinks it further. This is the formal statement of &ldquo;don&rsquo;t
        put all your risk in one bet.&rdquo;
      </P>
      <Callout kind="tip" title="Scenario: two uncorrelated books, one third less risk">
        You run a crypto trend strategy with a monthly volatility of <MathInline>{"\\sigma = 10\\%"}</MathInline>. You
        add an index breakout strategy with the same <MathInline>{"10\\%"}</MathInline> volatility and the same expected
        return, and — crucially — its returns are <em>uncorrelated</em> with the first (<MathInline>{"\\rho = 0"}</MathInline>).
        Put half your risk in each. The blended monthly return has variance{" "}
        <MathInline>{"\\left(\\tfrac{1}{2}\\right)^2(0.10^2) + \\left(\\tfrac{1}{2}\\right)^2(0.10^2) = 0.005"}</MathInline>,
        so its volatility is <MathInline>{"\\sqrt{0.005} \\approx 7.1\\%"}</MathInline>. Same expected return as either
        book alone, but risk fell from 10% to 7.1% — a <em>free</em> 29% cut, paid for entirely by the vanished{" "}
        <MathInline>{"2\\operatorname{Cov}"}</MathInline> term. Now suppose the two books were actually perfectly
        correlated (<MathInline>{"\\rho = 1"}</MathInline>): the cross term returns in full, the volatility stays at
        10%, and you diversified nothing but the paperwork.
      </Callout>
      <Callout kind="tip" title="Why it matters for trading">
        This is why edgekit judges a new strategy by its correlation to what you already run, not just its standalone
        Sharpe. A mediocre edge that is uncorrelated to your book can lower total risk more than a stronger edge that
        moves with it — the <MathInline>{"2\\operatorname{Cov}"}</MathInline> term does the work.
      </Callout>
      <H3>Independent vs merely uncorrelated</H3>
      <P>
        Independence means <MathInline>{"P(X, Y) = P(X)\\,P(Y)"}</MathInline> — knowing one tells you nothing about the
        other. Independence implies <MathInline>{"\\operatorname{Cov}(X,Y) = 0"}</MathInline>, but the converse is
        false. Correlation only sees <em>linear</em> co-movement; two variables can be strongly dependent yet have zero
        correlation. Classic case: <MathInline>{"X"}</MathInline> symmetric about 0 and{" "}
        <MathInline>{"Y = X^2"}</MathInline> — <MathInline>{"Y"}</MathInline> is completely determined by{" "}
        <MathInline>{"X"}</MathInline>, yet <MathInline>{"\\rho = 0"}</MathInline>. In markets, tail dependence hides
        here: assets that look uncorrelated day to day can crash together, a nonlinear link a single{" "}
        <MathInline>{"\\rho"}</MathInline> will never show.
      </P>
      <Callout kind="warn" title="Correlation is not causation">
        A high <MathInline>{"\\rho"}</MathInline> between a signal and future returns says they moved together in your
        sample — not that the signal <em>drives</em> returns. With enough candidate signals some will correlate with
        anything by chance (spurious correlation). Demand a mechanism and out-of-sample confirmation, never a
        correlation alone.
      </Callout>

      <H2>Conditional probability & Bayes&rsquo; theorem</H2>
      <P>
        Trading is decision-making under partial information, and the language for updating beliefs as evidence arrives
        is conditional probability. The probability of <MathInline>{"A"}</MathInline> <em>given</em> that{" "}
        <MathInline>{"B"}</MathInline> occurred is
      </P>
      <Math>{"P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}, \\qquad P(B) > 0"}</Math>
      <P>
        Rearranged, this says the joint probability factors two symmetric ways —{" "}
        <MathInline>{"P(A \\cap B) = P(A \\mid B)\\,P(B) = P(B \\mid A)\\,P(A)"}</MathInline> — and equating the two
        halves gives <Strong>Bayes&rsquo; theorem</Strong>:
      </P>
      <Math>{"P(A \\mid B) = \\frac{P(B \\mid A)\\,P(A)}{P(B)}"}</Math>
      <Callout kind="note" title="Derivation — just two conditional definitions">
        <p>Write the definition of conditional probability both ways for the same joint event:</p>
        <Math>{"P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}, \\qquad P(B \\mid A) = \\frac{P(A \\cap B)}{P(A)}"}</Math>
        <p>
          Solve the second for the shared numerator, <MathInline>{"P(A \\cap B) = P(B \\mid A)\\,P(A)"}</MathInline>,
          and substitute into the first:
        </p>
        <Math>{"P(A \\mid B) = \\frac{P(B \\mid A)\\,P(A)}{P(B)}.\\quad\\blacksquare"}</Math>
      </Callout>
      <P>
        The pieces have names worth knowing: <MathInline>{"P(A)"}</MathInline> is the <Strong>prior</Strong> (belief
        before evidence), <MathInline>{"P(B \\mid A)"}</MathInline> the <Strong>likelihood</Strong>,{" "}
        <MathInline>{"P(A \\mid B)"}</MathInline> the <Strong>posterior</Strong> (belief after evidence).
      </P>
      <Callout kind="tip" title="Why it matters — P(real edge | good backtest)">
        <p>
          Let <MathInline>{"A"}</MathInline> = &ldquo;the strategy has a real edge&rdquo; and{" "}
          <MathInline>{"B"}</MathInline> = &ldquo;its backtest looks good.&rdquo; Suppose real edges are rare —{" "}
          <MathInline>{"P(A) = 0.05"}</MathInline> — a real edge almost always backtests well,{" "}
          <MathInline>{"P(B \\mid A) = 0.90"}</MathInline>, but so do a lot of flukes,{" "}
          <MathInline>{"P(B \\mid \\text{no edge}) = 0.30"}</MathInline>. Then
        </p>
        <Math>{"P(A \\mid B) = \\frac{0.90 \\cdot 0.05}{0.90 \\cdot 0.05 + 0.30 \\cdot 0.95} \\approx 0.14"}</Math>
        <p>
          A gorgeous backtest lifts your confidence from 5% only to about 14% — still probably noise. Because the base
          rate of true edges is low, one good backtest is weak evidence. This is the quantitative reason the course
          demands permutation tests, walk-forward, and out-of-sample data before believing an edge.
        </p>
      </Callout>
      <H3>The law of iterated expectations</H3>
      <P>
        The averaging counterpart of Bayes is the <Strong>law of iterated expectations</Strong> (the &ldquo;tower
        rule&rdquo;): averaging the conditional average recovers the overall average.
      </P>
      <Math>{"E\\big[E[X \\mid Y]\\big] = E[X]"}</Math>
      <P>
        The inner <MathInline>{"E[X \\mid Y]"}</MathInline> is a random variable — a different number for each value of{" "}
        <MathInline>{"Y"}</MathInline>. Averaging it over the distribution of <MathInline>{"Y"}</MathInline> weights
        each conditional mean by how often that condition occurs, and by the definition of the marginal that is just{" "}
        <MathInline>{"E[X]"}</MathInline>. For trading it means your overall expectancy is the probability-weighted
        blend of your per-regime expectancies: a strategy that only makes money in one regime has its edge diluted by
        how rarely that regime shows up.
      </P>

      <H2>The Normal distribution</H2>
      <P>
        The <Strong>Normal</Strong> (Gaussian) is the bell curve, fully described by just its mean{" "}
        <MathInline>{"\\mu"}</MathInline> and standard deviation <MathInline>{"\\sigma"}</MathInline>:
      </P>
      <Math>{"f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} \\, \\exp\\!\\left(-\\frac{(x - \\mu)^2}{2\\sigma^2}\\right)"}</Math>
      <P>
        It earns its central place because sums of many small independent shocks tend toward it (the central limit
        theorem, next chapter), and because its thin tails make the math tractable. Under a Normal, outcomes cluster
        tightly: about 68% land within <MathInline>{"1\\sigma"}</MathInline>, 95% within{" "}
        <MathInline>{"2\\sigma"}</MathInline>, and 99.7% within <MathInline>{"3\\sigma"}</MathInline>. A 5-sigma day
        should happen roughly once every 14,000 years.
      </P>

      <H2>Fat tails — why returns aren&rsquo;t Normal</H2>
      <P>
        Markets did not read the textbook. Real return distributions are <Strong>fat-tailed</Strong> (leptokurtic):
        the peak is taller and narrower, and — the part that matters — the tails are far heavier than a Normal allows.
        Those &ldquo;once every 14,000 years&rdquo; 5-sigma days show up several times a decade. October 1987 was a
        ~20-sigma move under a Normal fit; under a Normal it is impossible, yet it happened.
      </P>
      <ChartFigure
        name="tut/normal_vs_fat"
        alt="A fat-tailed distribution overlaid on a Normal, showing a taller peak and heavier tails"
        caption="A fat-tailed return distribution (solid) vs a Normal with the same mean and variance (dashed). More mass in the center and in the extreme tails; less in the shoulders. The tail excess is where blow-ups live."
      />
      <P>
        You can see the same fact in real data. Below is edgekit&rsquo;s return-distribution chart — a histogram of
        realised returns with a Normal fit laid over it. The overflowing tail bars are the risk a Normal model would
        have told you to ignore.
      </P>
      <ChartFigure
        name="return_distribution"
        alt="Histogram of realised returns with a fitted Normal overlay showing tail excess"
        caption="edgekit.viz return distribution: realised returns vs a fitted Normal. The gap in the tails is exactly the risk that Normal-based models understate."
      />
      <Callout kind="danger" title="Why this is the whole risk-management problem">
        Nearly every classical risk formula assumes Normality, and every one of them under-estimates tail risk as a
        result. A model that says ruin is a 1-in-a-million event when it is really 1-in-500 will feel safe right up
        until it isn&rsquo;t. Assume fatter tails than your data shows, and stress-test rather than trust a closed-form
        number.
      </Callout>

      <H2>Skew & kurtosis</H2>
      <P>
        Mean and variance are the first two moments. The next two describe the <em>shape</em> that fat tails live in.
      </P>
      <H3>Skewness</H3>
      <P>The third standardised moment — the asymmetry of the distribution:</P>
      <Math>{"\\text{Skew}(X) = E\\!\\left[\\left(\\frac{X - \\mu}{\\sigma}\\right)^3\\right]"}</Math>
      <P>
        Negative skew means a long <em>left</em> tail: many small gains punctuated by rare large losses — the classic
        shape of short-option and mean-reversion strategies (and it is how a lot of blow-ups feel: fine, fine, fine,
        catastrophe). Positive skew is the opposite: many small losses and occasional large wins, the signature of
        trend-following. A Normal has zero skew.
      </P>
      <H3>Kurtosis</H3>
      <P>The fourth standardised moment — how heavy the tails are:</P>
      <Math>{"\\text{Kurt}(X) = E\\!\\left[\\left(\\frac{X - \\mu}{\\sigma}\\right)^4\\right]"}</Math>
      <P>
        A Normal has kurtosis 3, so people quote <Strong>excess kurtosis</Strong>{" "}
        <MathInline>{"\\text{Kurt}(X) - 3"}</MathInline>: positive means fatter-than-Normal tails. Financial returns
        routinely show large positive excess kurtosis. High kurtosis is the formal statement of &ldquo;fat
        tails.&rdquo;
      </P>
      <Callout kind="tip" title="Read skew before you trust a Sharpe">
        Two strategies can share a mean and volatility — and so an identical Sharpe — while one has benign positive
        skew and the other hides a fat left tail. This is precisely why{" "}
        <A href="/docs/api/metrics">edgekit.metrics</A> insists you report profit factor and MAR beside Sharpe: the
        higher moments are where Sharpe goes blind.
      </Callout>

      <H2>VaR & CVaR</H2>
      <P>
        Since the tail is where you get hurt, we measure it directly. <Strong>Value at Risk</Strong> at confidence{" "}
        <MathInline>{"\\alpha"}</MathInline> (say 95%) is the loss threshold you only breach{" "}
        <MathInline>{"(1-\\alpha)"}</MathInline> of the time — the <MathInline>{"\\alpha"}</MathInline>-quantile of the
        loss distribution:
      </P>
      <Math>{"\\operatorname{VaR}_\\alpha = \\inf\\{\\, \\ell : P(L \\le \\ell) \\ge \\alpha \\,\\}"}</Math>
      <P>
        VaR has a notorious flaw: it tells you the <em>threshold</em> you will breach but says nothing about how bad
        things get once you do. <Strong>Conditional VaR</Strong> (also Expected Shortfall) fixes that — it is the{" "}
        <em>average</em> loss in the worst <MathInline>{"(1-\\alpha)"}</MathInline> of cases:
      </P>
      <Math>{"\\operatorname{CVaR}_\\alpha = E\\big[\\, L \\mid L \\ge \\operatorname{VaR}_\\alpha \\,\\big]"}</Math>
      <P>
        CVaR is the number to prefer, especially with fat tails: it looks <em>into</em> the tail rather than stopping
        at its edge. Because both are just quantiles and conditional means of the historical loss series, you estimate
        them empirically rather than from a Normal formula — which, again, would understate them.
      </P>
      <CodeBlock
        filename="tail_risk.py"
        code={`import numpy as np

# empirical VaR / CVaR from a return series (no Normal assumption)
losses = -returns                       # losses as positive numbers
var95 = np.quantile(losses, 0.95)       # breached 5% of the time
cvar95 = losses[losses >= var95].mean() # average loss beyond VaR

print(f"95% VaR:  {var95:.3%}")
print(f"95% CVaR: {cvar95:.3%}")        # always >= VaR; the honest tail number`}
      />
      <P>
        In practice you rarely trust a single historical tail estimate — the worst case in your sample is just the
        worst case you happened to see. edgekit&rsquo;s Monte-Carlo tools resample the return stream thousands of times
        to build a <em>distribution</em> of terminal outcomes and drawdowns, giving you a bootstrapped tail rather than
        the one lucky (or unlucky) path history handed you. That is the subject of{" "}
        <A href="/tutorials/monte-carlo">Monte Carlo</A>.
      </P>

      <P>
        <Strong>Next:</Strong> we only ever see a <em>sample</em> of the true distribution, so how much can we trust
        it? — <A href="/tutorials/statistics-for-traders">Statistics for traders</A>.
      </P>
    </>
  );
}
