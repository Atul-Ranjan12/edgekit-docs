import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Statistics for traders" };

export default function Page() {
  return (
    <>
      <H1>Statistics for traders</H1>
      <Lead>
        You never see a strategy&rsquo;s true edge — only a finite sample of trades drawn from it, blurred by noise.
        Statistics is the discipline of saying how much that sample can be trusted. This is the chapter that explains
        the single most important sentence in the whole course: <em>you need a lot of trades before a backtest means
        anything.</em>
      </Lead>

      <H2>Sampling & sampling error</H2>
      <P>
        The true expected return per trade, <MathInline>{"\\mu"}</MathInline>, is a fixed but unknown property of the
        strategy — the <Strong>population</Strong> mean. A backtest gives you a <Strong>sample</Strong> of{" "}
        <MathInline>{"n"}</MathInline> trades, and from it the sample mean:
      </P>
      <Math>{"\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i"}</Math>
      <P>
        <MathInline>{"\\bar{x}"}</MathInline> is our estimate of <MathInline>{"\\mu"}</MathInline>, but it is itself
        random — run the strategy over a different slice of history and you get a different{" "}
        <MathInline>{"\\bar{x}"}</MathInline>. The gap between your sample estimate and the truth is{" "}
        <Strong>sampling error</Strong>. It is not a bug or a bad backtest; it is the irreducible fog that comes from
        having finite data. The entire job of the next few chapters is to keep that fog from fooling you.
      </P>

      <H2>Standard error</H2>
      <P>
        How much does <MathInline>{"\\bar{x}"}</MathInline> wobble from sample to sample? Its standard deviation has a
        name — the <Strong>standard error of the mean</Strong>:
      </P>
      <Math>{"\\operatorname{SE}(\\bar{x}) = \\frac{\\sigma}{\\sqrt{n}}"}</Math>
      <Callout kind="note" title="Derivation — the variance of a sample mean">
        <p>
          The sample mean is a sum scaled by <MathInline>{"1/n"}</MathInline>. Pull the constant out of the variance
          (which costs a square):
        </p>
        <Math>{"\\operatorname{Var}(\\bar{x}) = \\operatorname{Var}\\!\\left(\\frac{1}{n}\\sum_{i=1}^{n} x_i\\right) = \\frac{1}{n^2}\\,\\operatorname{Var}\\!\\left(\\sum_{i=1}^{n} x_i\\right)"}</Math>
        <p>
          If the trades are <em>independent</em>, the variance of the sum is the sum of the variances (no covariance
          terms), and each has the same <MathInline>{"\\sigma^2"}</MathInline>:
        </p>
        <Math>{"= \\frac{1}{n^2}\\sum_{i=1}^{n}\\operatorname{Var}(x_i) = \\frac{1}{n^2}\\,(n\\sigma^2) = \\frac{\\sigma^2}{n}"}</Math>
        <p>
          Take the square root to get back to the units of the mean:{" "}
          <MathInline>{"\\operatorname{SE}(\\bar{x}) = \\sigma/\\sqrt{n}"}</MathInline>. The{" "}
          <MathInline>{"\\sqrt{n}"}</MathInline> is not magic — it is the square root of the{" "}
          <MathInline>{"n^2"}</MathInline>-vs-<MathInline>{"n"}</MathInline> mismatch between scaling and adding.{" "}
          <span>&#9632;</span>
        </p>
      </Callout>
      <Callout kind="warn" title="The independence caveat">
        The clean <MathInline>{"nσ^2"}</MathInline> step needed independence. If trades overlap or share a regime they
        are positively correlated, the dropped covariance terms are positive, and the true SE is{" "}
        <em>larger</em> than <MathInline>{"σ/\\sqrt{n}"}</MathInline> — your effective sample size is smaller than your
        trade count. Correlated returns make you more confident than you deserve to be.
      </Callout>
      <P>
        Read this formula slowly, because it governs everything. The uncertainty in your estimate shrinks with the{" "}
        <em>square root</em> of the number of trades — not linearly. To halve your uncertainty you need{" "}
        <em>four times</em> as many trades. To cut it by ten, a hundred times as many. This is why a strategy with 30
        trades tells you almost nothing and one with 1,000 tells you something real.
      </P>
      <Table
        head={["Trades n", "√n", "SE relative to n = 25"]}
        rows={[
          ["25", "5", "1.00× (baseline)"],
          ["100", "10", "0.50× (half the error)"],
          ["400", "20", "0.25×"],
          ["2,500", "50", "0.10×"],
        ]}
      />
      <Callout kind="tip" title="Scenario: is a +0.2R edge over 30 trades real?">
        Your ORB backtest shows an average of <MathInline>{"+0.2R"}</MathInline> per trade over{" "}
        <MathInline>{"n = 30"}</MathInline> trades, with the usual per-trade spread of about{" "}
        <MathInline>{"\\sigma = 1R"}</MathInline>. The standard error of that mean is{" "}
        <MathInline>{"\\sigma/\\sqrt{n} = 1/\\sqrt{30} \\approx 0.18R"}</MathInline> — almost as big as the edge itself.
        Your measured <MathInline>{"+0.2R"}</MathInline> is only about <MathInline>{"0.2/0.18 \\approx 1.1"}</MathInline>{" "}
        standard errors from zero, so a true edge of exactly zero would routinely throw off a sample this good. Now run
        the same strategy long enough to log <MathInline>{"n = 400"}</MathInline> trades at the same{" "}
        <MathInline>{"+0.2R"}</MathInline>: the standard error drops to <MathInline>{"1/\\sqrt{400} = 0.05R"}</MathInline>,
        the edge is now <MathInline>{"4"}</MathInline> standard errors out, and zero becomes very hard to believe. The
        number did not change — the <em>evidence</em> did, and only <MathInline>{"n"}</MathInline> moved.
      </Callout>
      <Callout kind="warn" title="This is the deep reason few-trade backtests lie">
        A strategy with a big historical return but only 20 or 30 trades has an enormous standard error — its true edge
        could easily be zero. Impressive-looking, statistically empty results almost always trace back to a small{" "}
        <MathInline>{"n"}</MathInline>. When you read a backtest, look at the trade count before the return.
      </Callout>

      <H2>The law of large numbers</H2>
      <P>
        Before the mean can be <em>Normal</em>, it first has to land on the truth at all. That guarantee is the{" "}
        <Strong>law of large numbers</Strong> (LLN): as the number of trades grows, the sample mean converges to the
        true mean.
      </P>
      <Math>{"\\bar{x}_n \\;\\xrightarrow{\\; n \\to \\infty \\;}\\; \\mu"}</Math>
      <P>
        It is the mathematical form of &ldquo;let the edge play out.&rdquo; A positive-expectancy strategy is not
        promised to win on any given trade — only that, averaged over enough of them, the realised mean is pulled
        toward <MathInline>{"\\mu"}</MathInline>. The LLN is <em>why</em> an edge is worth having; it is also why it
        needs volume to materialise.
      </P>
      <H3>Chebyshev&rsquo;s inequality — a distribution-free proof</H3>
      <P>
        We can prove the LLN and get a usable bound in one stroke with <Strong>Chebyshev&rsquo;s inequality</Strong>,
        which holds for <em>any</em> distribution with finite variance — no Normality, no thin tails required:
      </P>
      <Math>{"P\\big(|X - \\mu| \\ge k\\sigma\\big) \\le \\frac{1}{k^2}"}</Math>
      <Callout kind="note" title="Proof sketch + how it forces the LLN">
        <p>
          Chebyshev follows from Markov&rsquo;s inequality applied to <MathInline>{"(X-\\mu)^2"}</MathInline>: since
          that quantity is non-negative with mean <MathInline>{"\\sigma^2"}</MathInline>, the probability it exceeds{" "}
          <MathInline>{"(k\\sigma)^2"}</MathInline> is at most <MathInline>{"\\sigma^2/(k\\sigma)^2 = 1/k^2"}</MathInline>.
          The event <MathInline>{"(X-\\mu)^2 \\ge (k\\sigma)^2"}</MathInline> is the same as{" "}
          <MathInline>{"|X-\\mu| \\ge k\\sigma"}</MathInline>, giving the bound.
        </p>
        <p>
          Now apply it to the sample mean, which has standard deviation <MathInline>{"\\sigma/\\sqrt{n}"}</MathInline>.
          For any fixed tolerance <MathInline>{"\\varepsilon > 0"}</MathInline>,
        </p>
        <Math>{"P\\big(|\\bar{x}_n - \\mu| \\ge \\varepsilon\\big) \\le \\frac{\\sigma^2}{n\\,\\varepsilon^2} \\;\\xrightarrow{\\; n \\to \\infty \\;}\\; 0"}</Math>
        <p>
          The probability of the sample mean straying from <MathInline>{"\\mu"}</MathInline> by any margin vanishes as{" "}
          <MathInline>{"n \\to \\infty"}</MathInline> — that is exactly convergence, and the LLN. <span>&#9632;</span>
        </p>
      </Callout>
      <Callout kind="tip" title="Why it matters for trading">
        Chebyshev is deliberately loose (it wastes nothing on tail shape), which makes it the honest tool when returns
        are fat-tailed and the Normal &ldquo;95% within 2σ&rdquo; rule cannot be trusted. It guarantees at least{" "}
        <MathInline>{"1 - 1/k^2"}</MathInline> of outcomes fall within <MathInline>{"k"}</MathInline> standard
        deviations — e.g. <MathInline>{"\\ge 75\\%"}</MathInline> within 2σ, <MathInline>{"\\ge 88.9\\%"}</MathInline>{" "}
        within 3σ — <em>no matter how ugly the distribution</em>. A worst-case bound you can actually rely on.
      </Callout>

      <H2>The central limit theorem</H2>
      <P>
        Why can we use <MathInline>{"\\sigma/\\sqrt{n}"}</MathInline> and reason with the bell curve, when individual
        returns are fat-tailed and nothing like Normal? Because of the <Strong>central limit theorem</Strong> (CLT):
        the distribution of the <em>sample mean</em> of <MathInline>{"n"}</MathInline> independent draws approaches a
        Normal as <MathInline>{"n"}</MathInline> grows — <em>regardless</em> of the shape of the underlying
        distribution.
      </P>
      <Math>{"\\bar{x} \\;\\xrightarrow{\\; n \\to \\infty \\;}\\; \\mathcal{N}\\!\\left(\\mu, \\; \\frac{\\sigma^2}{n}\\right)"}</Math>
      <P>
        The individual trades can be as skewed and fat-tailed as markets truly are; average enough of them and the{" "}
        <em>average</em> settles into a tidy bell curve centered on the truth, tightening as{" "}
        <MathInline>{"n"}</MathInline> rises. That is what licenses every confidence interval and hypothesis test that
        follows.
      </P>
      <Callout kind="note" title="Sketch — why Normal, and the √n rate">
        <p>
          The mechanism is a competition of moments. Standardise the sample mean as{" "}
          <MathInline>{"Z_n = \\sqrt{n}\\,(\\bar{x} - \\mu)/\\sigma"}</MathInline>. Its skew shrinks like{" "}
          <MathInline>{"1/\\sqrt{n}"}</MathInline> and its excess kurtosis like <MathInline>{"1/n"}</MathInline>, so as{" "}
          <MathInline>{"n"}</MathInline> grows every deviation from a bell shape is scrubbed away and only the mean and
          variance survive — the defining property of a Normal. (The rigorous version matches characteristic
          functions.) Note the scaling: we multiplied by <MathInline>{"\\sqrt{n}"}</MathInline> to keep{" "}
          <MathInline>{"Z_n"}</MathInline> from collapsing to a point, which is the same statement as{" "}
          <MathInline>{"\\operatorname{SE} = \\sigma/\\sqrt{n}"}</MathInline>: the mean concentrates, and the width of
          what is left of its distribution closes at rate <MathInline>{"1/\\sqrt{n}"}</MathInline> — quadruple the
          trades to halve the noise.
        </p>
      </Callout>
      <ChartFigure
        name="tut/clt_sampling"
        alt="Sampling distributions of the mean tightening into a bell curve as sample size grows"
        caption="The central limit theorem in action: even from a skewed source distribution, the sampling distribution of the mean becomes Normal and narrows as n grows — width shrinks like 1/√n."
      />
      <Callout kind="note" title="Fat tails slow the CLT down">
        The CLT is asymptotic, and fat tails make it converge slowly — a single monster trade can still dominate a
        modest sample. So the CLT is a reason to gather many trades, not an excuse to trust a small sample because
        &ldquo;means are Normal.&rdquo; When in doubt, resample empirically (bootstrap) instead of leaning on the
        formula — see <A href="/tutorials/monte-carlo">Monte Carlo</A>.
      </Callout>

      <H2>Confidence intervals</H2>
      <P>
        A point estimate <MathInline>{"\\bar{x}"}</MathInline> without a range is a false precision. A{" "}
        <Strong>confidence interval</Strong> puts a band around it. Using the CLT and the 95% rule for a Normal, the
        95% interval for the true mean is:
      </P>
      <Math>{"\\bar{x} \\;\\pm\\; 1.96 \\cdot \\frac{\\sigma}{\\sqrt{n}}"}</Math>
      <Callout kind="note" title="Derivation — inverting the standardised mean">
        <p>
          From the CLT, <MathInline>{"\\bar{x} \\sim \\mathcal{N}(\\mu, \\sigma^2/n)"}</MathInline>, so the standardised
          mean is a standard Normal:
        </p>
        <Math>{"Z = \\frac{\\bar{x} - \\mu}{\\sigma/\\sqrt{n}} \\sim \\mathcal{N}(0, 1)"}</Math>
        <p>
          The value <MathInline>{"z = 1.96"}</MathInline> is chosen so a standard Normal lands inside{" "}
          <MathInline>{"[-z, z]"}</MathInline> with probability 0.95. So with 95% probability,
        </p>
        <Math>{"-1.96 \\;\\le\\; \\frac{\\bar{x} - \\mu}{\\sigma/\\sqrt{n}} \\;\\le\\; 1.96"}</Math>
        <p>
          Multiply through by <MathInline>{"\\sigma/\\sqrt{n}"}</MathInline> and rearrange to isolate{" "}
          <MathInline>{"\\mu"}</MathInline>:
        </p>
        <Math>{"\\bar{x} - 1.96\\,\\frac{\\sigma}{\\sqrt{n}} \\;\\le\\; \\mu \\;\\le\\; \\bar{x} + 1.96\\,\\frac{\\sigma}{\\sqrt{n}}.\\quad\\blacksquare"}</Math>
        <p>
          For a general confidence level, swap 1.96 for the matching Normal quantile{" "}
          <MathInline>{"z_{1-\\alpha/2}"}</MathInline> (2.58 for 99%).
        </p>
      </Callout>
      <P>
        The interpretation is subtle and worth getting right: it does <em>not</em> say &ldquo;there is a 95%
        probability the truth is in this interval.&rdquo; It says that if you repeated the whole experiment many times,
        95% of the intervals you construct this way would contain the true <MathInline>{"\\mu"}</MathInline>. It is a
        statement about the reliability of the <em>procedure</em>, not about this one interval.
      </P>
      <ChartFigure
        name="tut/confidence_interval"
        alt="A point estimate with a 95% confidence band, and repeated intervals most of which cover the true value"
        caption="95% confidence intervals from repeated samples. About 1 in 20 misses the true mean (dashed line). Wider samples (smaller n) give wider bands — the honest picture of what a backtest can and cannot claim."
      />
      <P>
        The practical payoff: the same estimated edge is convincing with a narrow band and meaningless with a band that
        straddles zero. When you compute a strategy&rsquo;s expectancy, always ask whether zero is inside its interval.
        If it is, you do not yet have evidence of an edge — only a hint.
      </P>
      <CodeBlock
        filename="edge_ci.py"
        code={`import numpy as np
from edgekit import trade_stats

st = trade_stats(trades.r)            # per-trade R-multiples
r = np.asarray(trades.r, float)
n = r.size

mean = r.mean()
se = r.std(ddof=1) / np.sqrt(n)       # standard error of the mean
lo, hi = mean - 1.96 * se, mean + 1.96 * se

print(f"expectancy: {st['ev_r']:.3f}R  (n={n})")
print(f"95% CI: [{lo:.3f}, {hi:.3f}]R")
if lo <= 0 <= hi:
    print("zero is inside the band -> no statistical evidence of edge yet")`}
      />

      <H2>Hypothesis testing & p-values</H2>
      <P>
        Confidence intervals and hypothesis tests are two sides of the same coin. A hypothesis test formalises the
        skeptic&rsquo;s question: <em>could this result just be luck?</em>
      </P>
      <H3>The null hypothesis</H3>
      <P>
        You start by assuming the boring explanation — the <Strong>null hypothesis</Strong>{" "}
        <MathInline>{"H_0"}</MathInline>: the strategy has no edge, its true expectancy is zero, every apparent profit
        is noise. Your result is only interesting if the data makes this null look untenable. You never prove the null
        false; you either reject it or fail to reject it.
      </P>
      <H3>What a p-value actually means</H3>
      <P>
        The <Strong>p-value</Strong> is the probability of seeing a result <em>at least as extreme</em> as the one you
        got, <em>if the null hypothesis were true</em>:
      </P>
      <Math>{"p = P\\big(\\text{result at least this extreme} \\mid H_0 \\text{ true}\\big)"}</Math>
      <P>
        A small p (conventionally <MathInline>{"p < 0.05"}</MathInline>) means &ldquo;a no-edge world would rarely
        produce something this good, so the no-edge story is hard to believe.&rdquo; Be precise about what it is{" "}
        <em>not</em>: p is <Strong>not</Strong> the probability that your strategy has no edge, and it is{" "}
        <Strong>not</Strong> the probability the result is due to chance. It is a conditional probability{" "}
        <em>assuming</em> the null — a measure of how surprised a skeptic should be, nothing more.
      </P>
      <H3>Type I and Type II error</H3>
      <P>
        A test can be wrong two ways. A <Strong>Type I error</Strong> (false positive) is rejecting a true null —
        deploying a strategy that has no edge. A <Strong>Type II error</Strong> (false negative) is failing to reject a
        false null — discarding a strategy that really works. Their probabilities have standard names:
      </P>
      <Math>{"\\alpha = P(\\text{reject } H_0 \\mid H_0 \\text{ true}), \\qquad \\beta = P(\\text{fail to reject } H_0 \\mid H_0 \\text{ false})"}</Math>
      <P>
        Your significance threshold <em>is</em> <MathInline>{"\\alpha"}</MathInline> — set it to 0.05 and you accept a
        5% false-positive rate per test. The quantity <MathInline>{"1 - \\beta"}</MathInline> is the{" "}
        <Strong>power</Strong>: the chance of catching a real edge when there is one. The two trade off — demanding a
        smaller <MathInline>{"\\alpha"}</MathInline> raises <MathInline>{"\\beta"}</MathInline> unless you add data — and
        the lever that improves both at once is a larger <MathInline>{"n"}</MathInline>, which tightens{" "}
        <MathInline>{"\\sigma/\\sqrt{n}"}</MathInline> and separates the two hypotheses.
      </P>
      <ChartFigure
        name="tut/hypothesis_test"
        alt="Null and alternative distributions with the alpha false-positive region and beta missed-edge region shaded"
        caption="The two error types made visible. Under the null (no edge) the shaded α tail is where you falsely 'discover' an edge; under the alternative (real edge) the shaded β region is where you miss it. Moving the threshold trades one for the other — only more data (which pulls the curves apart) shrinks both at once."
      />
      <Callout kind="tip" title="Why it matters for trading">
        A trader&rsquo;s Type I error costs real money (a dead strategy that draws down); a Type II error is only
        opportunity cost. That asymmetry is why the gauntlet is deliberately strict — better to reject a few good
        strategies than to fund a fluke. But run enough tests at <MathInline>{"\\alpha = 0.05"}</MathInline> and false
        positives become near-certain: 20 independent no-edge tests yield roughly one &ldquo;significant&rdquo; result
        on average. That is the multiple-testing problem below.
      </Callout>
      <Callout kind="warn" title="Significant does not mean large, or real">
        With enough trades a trivially small edge becomes &ldquo;statistically significant,&rdquo; and — the far worse
        trap — if you test enough strategies, some will clear <MathInline>{"p < 0.05"}</MathInline> by pure luck. A
        single p-value from a single test is a weak defense. This is exactly the multiple-testing problem that{" "}
        <A href="/tutorials/why-backtests-lie">Why most backtests lie</A> is built around.
      </Callout>
      <P>
        Because market returns violate the neat assumptions behind textbook t-tests (independence, Normality), edgekit
        does not lean on a closed-form p-value. It uses a <Strong>permutation test</Strong>: shuffle the data to build
        the null distribution empirically, then read off where the real result falls. The p-value becomes a simple
        count:
      </P>
      <Math>{"p = \\frac{1 + \\#\\{\\, s^{*}_i \\ge s \\,\\}}{N + 1}"}</Math>
      <P>
        where <MathInline>{"s"}</MathInline> is your real statistic and <MathInline>{"s^{*}_i"}</MathInline> are the{" "}
        <MathInline>{"N"}</MathInline> statistics from shuffled (no-edge) data. This is{" "}
        <A href="/docs/api/validation">edgekit.validation.mcpt</A>, the decisive step of the gauntlet.
      </P>
      <Callout kind="tip" title="Scenario: reading a permutation p-value off your backtest">
        Your strategy&rsquo;s real backtest posts a profit factor of <MathInline>{"s = 1.40"}</MathInline>. You shuffle
        the returns <MathInline>{"N = 1000"}</MathInline> times to destroy any real ordering-based edge, re-run each
        shuffle, and record its profit factor <MathInline>{"s^{*}_i"}</MathInline>. Suppose 82 of those edge-free
        shuffles happened to score <MathInline>{"1.40"}</MathInline> or better. Then{" "}
        <MathInline>{"p = (1 + 82)/(1000 + 1) \\approx 0.083"}</MathInline> — an 8% chance a no-edge world fakes a result
        this good, which does <em>not</em> clear the usual 0.05 bar. Had only 4 shuffles beaten it,{" "}
        <MathInline>{"p \\approx 0.005"}</MathInline>, and the no-edge story would be genuinely hard to defend. Same PF
        of 1.40 either way; what the permutation test measures is how easily randomness reproduces it.
      </Callout>
      <CodeBlock
        filename="mcpt.py"
        code={`from edgekit.validation import mcpt, bootstrap_rng

# real_stat = your strategy's observed metric (e.g. profit factor)
# null_fn() = one draw of that metric under a shuffled, edge-free world
p = mcpt(real_stat, null_fn, n=1000, rng=bootstrap_rng())
print(f"permutation p = {p:.3f}")   # small p => the null struggles to fake this`}
      />

      <H2>Why we need many trades — the through-line</H2>
      <P>Everything in this chapter is the same fact stated four ways:</P>
      <Ul>
        <Li>Standard error is <MathInline>{"\\sigma/\\sqrt{n}"}</MathInline> — few trades, huge uncertainty.</Li>
        <Li>The CLT only tightens the estimate as <MathInline>{"n"}</MathInline> grows.</Li>
        <Li>Confidence intervals shrink like <MathInline>{"1/\\sqrt{n}"}</MathInline>.</Li>
        <Li>A p-value needs enough data to distinguish edge from noise.</Li>
      </Ul>
      <P>
        A strategy with 40 trades and a gorgeous equity curve is, statistically, a rumor. One with 700 trades that
        survives a permutation test is a claim you can act on. It is why the strategies worth deploying tend to be the
        ones that trade often enough to accumulate evidence — and why every backtest in this course reports its trade
        count as prominently as its return.
      </P>

      <P>
        <Strong>Next:</Strong> now we can define edge precisely and ask how many trades it takes to show up —{" "}
        <A href="/tutorials/the-math-of-edge">The math of edge</A>.
      </P>
    </>
  );
}
