import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Bayesian methods" };

export default function Page() {
  return (
    <>
      <H1>Bayesian methods</H1>
      <Lead>
        A backtest gives you a point estimate — &ldquo;this strategy makes +0.2R per trade.&rdquo; But you started with
        a belief (most strategies have no edge), and the data should <em>update</em> that belief, not replace it.
        Bayesian inference is the calculus of updating beliefs with evidence. This chapter derives it from one identity,
        works the conjugate Normal case in full, and shows why a Bayesian view naturally shrinks noisy estimates,
        respects base rates, and gives a principled way to allocate across competing strategies.
      </Lead>

      <Callout kind="tip" title="Intuition — you already reason this way">
        <P>
          A friend says his coin-flip strategy won 6 of its last 10 trades. Do you believe he has an edge? Of course not
          — you <em>start</em> knowing that almost every strategy is a coin flip, and 6/10 is exactly what a fair coin
          coughs up all the time. But if he showed you 600 wins out of 1000, you would change your mind. That mental
          motion — starting from a skeptical belief, then letting evidence move it in proportion to how much evidence
          there is — <em>is</em> Bayes&rsquo; theorem. This chapter makes it arithmetic: a prior (your skepticism), a
          likelihood (what the trades say), and a posterior (your updated belief), with a knob that automatically weights
          data against belief by how much of each you have. It is the honest antidote to reading a 30-trade backtest as
          gospel.
        </P>
      </Callout>

      <H2>Bayes&rsquo; theorem for parameters</H2>
      <P>
        We want the distribution of an unknown parameter <MathInline>{"\\theta"}</MathInline> (an edge, a win rate, a
        mean return) <em>given</em> the data we observed. Bayes&rsquo; theorem, a one-line rearrangement of the
        definition of conditional probability, delivers it:
      </P>
      <Math>{"p(\\theta \\mid \\text{data}) = \\frac{p(\\text{data} \\mid \\theta)\\,p(\\theta)}{p(\\text{data})} \\;\\propto\\; \\underbrace{p(\\text{data} \\mid \\theta)}_{\\text{likelihood}}\\;\\underbrace{p(\\theta)}_{\\text{prior}}."}</Math>
      <P>
        Read left to right: the <Strong>posterior</Strong> (belief after data) is proportional to the{" "}
        <Strong>likelihood</Strong> (how well each <MathInline>{"\\theta"}</MathInline> explains the data) times the{" "}
        <Strong>prior</Strong> (belief before data). The denominator <MathInline>{"p(\\text{data})"}</MathInline> is just
        a normalising constant that makes the posterior integrate to one, which is why we usually work with the
        proportionality. This is the entire engine — everything below is applying it to a specific likelihood and prior.
      </P>
      <Callout kind="note" title="The frequentist / Bayesian contrast in one line">
        A frequentist treats <MathInline>{"\\theta"}</MathInline> as fixed and unknown and asks &ldquo;how surprising is
        my data?&rdquo; A Bayesian treats <MathInline>{"\\theta"}</MathInline> as a random variable with a distribution
        and asks &ldquo;what do I now believe about <MathInline>{"\\theta"}</MathInline>?&rdquo; For trading, the
        Bayesian framing is the natural one: you genuinely have a prior — most apparent edges are noise — and you want a
        distribution over your edge, not just a p-value against a null.
      </Callout>

      <H2>Conjugate Normal updating</H2>
      <P>
        The cleanest case: estimate an unknown mean <MathInline>{"\\mu"}</MathInline> (say, the true per-trade edge) from
        Gaussian data with known variance <MathInline>{"\\sigma^2"}</MathInline>. Put a Gaussian prior on{" "}
        <MathInline>{"\\mu"}</MathInline> centred at <MathInline>{"\\mu_0"}</MathInline> with variance{" "}
        <MathInline>{"\\tau_0^2"}</MathInline>. The magic of <Strong>conjugacy</Strong> is that the posterior is Gaussian
        too — the family is closed under updating, so we only need to track a mean and a variance.
      </P>
      <Callout kind="tip" title="Derivation — the posterior mean is a precision-weighted average">
        <P>
          It is cleanest in terms of <Strong>precision</Strong> = 1/variance. Prior precision{" "}
          <MathInline>{"\\tau_0^{-2}"}</MathInline>; each of <MathInline>{"n"}</MathInline> observations carries
          precision <MathInline>{"\\sigma^{-2}"}</MathInline>. Multiply the Gaussian prior by the Gaussian likelihood of
          the sample mean <MathInline>{"\\bar x"}</MathInline> and complete the square in{" "}
          <MathInline>{"\\mu"}</MathInline>. The exponent is
        </P>
        <Math>{"-\\tfrac{1}{2}\\Big[\\tau_0^{-2}(\\mu - \\mu_0)^2 + n\\sigma^{-2}(\\mu - \\bar x)^2\\Big],"}</Math>
        <P>
          a quadratic in <MathInline>{"\\mu"}</MathInline>, so the posterior is Gaussian. Matching the quadratic and
          linear coefficients, the posterior precision is the <em>sum</em> of precisions and the posterior mean is the
          precision-weighted average of the two estimates:
        </P>
        <Math>{"\\tau_n^{-2} = \\tau_0^{-2} + n\\sigma^{-2}, \\qquad \\mu_n = \\frac{\\tau_0^{-2}\\,\\mu_0 + n\\sigma^{-2}\\,\\bar x}{\\tau_0^{-2} + n\\sigma^{-2}}."}</Math>
        <P>
          <Strong>Why it matters:</Strong> the posterior mean is a <em>weighted blend</em> of your prior belief{" "}
          <MathInline>{"\\mu_0"}</MathInline> and the data&rsquo;s estimate <MathInline>{"\\bar x"}</MathInline>, with
          weights equal to how precisely each is known. With little data (small <MathInline>{"n"}</MathInline>) the prior
          dominates and your estimate stays near <MathInline>{"\\mu_0"}</MathInline>; as{" "}
          <MathInline>{"n \\to \\infty"}</MathInline> the data precision <MathInline>{"n\\sigma^{-2}"}</MathInline> swamps
          the prior and <MathInline>{"\\mu_n \\to \\bar x"}</MathInline>. Evidence overwhelms belief — but only in
          proportion to how much evidence you actually have. The posterior variance also shrinks monotonically, so more
          data always sharpens the estimate.
        </P>
      </Callout>
      <ChartFigure
        name="tut/bayes_updating"
        alt="Three curves: a wide prior distribution, a likelihood from data, and a narrower posterior sitting between them and shifted toward the data"
        caption="Bayesian updating of a mean. The broad prior encodes skepticism; the likelihood is what the data alone says; the posterior sits between them — pulled toward the data but not all the way, and narrower than either because it combines two sources of information. More data would slide the posterior further toward the likelihood and tighten it."
      />
      <Callout kind="tip" title="Scenario — updating a win rate from 30 trades (the Beta-Binomial conjugate pair)">
        <P>
          Win rate is a probability, not a mean, so the natural conjugate pair is <Strong>Beta prior</Strong> +{" "}
          <Strong>Binomial likelihood</Strong>. A <MathInline>{"\\mathrm{Beta}(a, b)"}</MathInline> density is proportional
          to <MathInline>{"p^{a-1}(1-p)^{b-1}"}</MathInline>; the likelihood of <MathInline>{"w"}</MathInline> wins in{" "}
          <MathInline>{"n"}</MathInline> trades is proportional to <MathInline>{"p^{w}(1-p)^{n-w}"}</MathInline>. Multiply
          them and the exponents simply add — the posterior is <MathInline>{"\\mathrm{Beta}(a + w,\\ b + n - w)"}</MathInline>,
          conjugacy in one line:
        </P>
        <Math>{"\\underbrace{p^{a-1}(1-p)^{b-1}}_{\\text{prior}} \\times \\underbrace{p^{w}(1-p)^{n-w}}_{\\text{likelihood}} \\;\\propto\\; p^{(a+w)-1}(1-p)^{(b+n-w)-1}."}</Math>
        <P>
          Put a weak, skeptical prior centred at a coin flip: <MathInline>{"\\mathrm{Beta}(2, 2)"}</MathInline> (mean{" "}
          <MathInline>{"0.5"}</MathInline>, worth just two pseudo-wins and two pseudo-losses). Observe{" "}
          <MathInline>{"18"}</MathInline> wins and <MathInline>{"12"}</MathInline> losses over{" "}
          <MathInline>{"30"}</MathInline> trades. The posterior is{" "}
          <MathInline>{"\\mathrm{Beta}(2 + 18,\\ 2 + 12) = \\mathrm{Beta}(20, 14)"}</MathInline>, with
        </P>
        <Math>{"\\text{mean} = \\frac{20}{34} = 0.588, \\qquad \\text{sd} = \\sqrt{\\frac{20 \\cdot 14}{34^2 \\cdot 35}} = 0.083."}</Math>
        <P>
          The raw sample win rate was <MathInline>{"18/30 = 0.60"}</MathInline>; the prior shrinks it to{" "}
          <MathInline>{"0.588"}</MathInline> — barely, because 30 trades already outweigh a two-pseudo-trade prior. But
          look at the width: a 95% credible interval is roughly <MathInline>{"[0.42,\\ 0.75]"}</MathInline>. If your
          payoff is <MathInline>{"1{:}1"}</MathInline> the break-even win rate is <MathInline>{"50\\%"}</MathInline>, and{" "}
          <MathInline>{"50\\%"}</MathInline> sits comfortably <em>inside</em> that interval. So the honest read after 30
          trades is not &ldquo;<MathInline>{"60\\%"}</MathInline> win rate, edge confirmed&rdquo; but &ldquo;probably
          above break-even, plausibly not — keep trading and let the posterior tighten.&rdquo; That is the same
          &ldquo;wide posterior = I don&rsquo;t know yet&rdquo; discipline as the Normal case, now on a bounded
          probability.
        </P>
      </Callout>
      <ChartFigure
        name="tut/beta_binomial"
        alt="Several Beta posterior densities over a win rate, each based on more trades, tightening and converging around the true win rate as the trade count grows"
        caption="Beta-Binomial updating of a win rate. Each curve is the posterior after more trades: a broad, near-flat belief after a handful, tightening around the true rate as evidence accumulates. Conjugacy means every update is just Beta(a+wins, b+losses) — the width is your honest uncertainty, and it only shrinks as fast as the data earns it."
      />

      <H2>Credible vs confidence intervals</H2>
      <P>
        The posterior lets you make the statement people <em>think</em> a confidence interval makes. A 95%{" "}
        <Strong>credible interval</Strong> is a range that contains the parameter with 95% posterior probability:
      </P>
      <Math>{"P\\big(\\mu \\in [\\,a, b\\,] \\mid \\text{data}\\big) = 0.95."}</Math>
      <P>
        That is a direct probability statement about <MathInline>{"\\mu"}</MathInline> — exactly what you want. A
        frequentist <Strong>confidence interval</Strong> means something subtly but importantly different: 95% of
        intervals <em>constructed this way</em> across hypothetical repeat experiments would cover the true (fixed){" "}
        <MathInline>{"\\mu"}</MathInline>. It says nothing about the probability that <em>your</em> particular interval
        contains it.
      </P>
      <Callout kind="warn" title="Don't over-read either interval on a short backtest">
        Both intervals inherit the <MathInline>{"\\sigma/\\sqrt{n}"}</MathInline> width from the{" "}
        <A href="/tutorials/the-math-of-edge">law of large numbers</A>. With a few dozen trades and per-trade noise{" "}
        <MathInline>{"\\sigma \\approx 1R"}</MathInline>, the interval on your edge is enormous — often comfortably
        straddling zero. A Bayesian is candid about this: the posterior is wide, so the honest conclusion is
        &ldquo;I don&rsquo;t know yet,&rdquo; not &ldquo;+0.2R edge confirmed.&rdquo;
      </Callout>

      <H2>Shrinkage and regression to the mean</H2>
      <P>
        The precision-weighted mean is <Strong>shrinkage</Strong> in disguise. Write it as the data estimate pulled a
        fraction of the way back toward the prior:
      </P>
      <Math>{"\\mu_n = \\bar x + (1 - \\kappa)(\\mu_0 - \\bar x), \\qquad \\kappa = \\frac{n\\sigma^{-2}}{\\tau_0^{-2} + n\\sigma^{-2}} \\in [0, 1]."}</Math>
      <P>
        A noisy estimate from little data (small <MathInline>{"\\kappa"}</MathInline>) gets shrunk hard toward the prior;
        a well-measured one is left alone. This is the mathematics behind{" "}
        <A href="/tutorials/statistics-for-traders">regression to the mean</A>: extreme sample results are
        disproportionately <em>lucky</em> extremes, so the best forecast of the next sample is closer to the average
        than the last one was. It is also exactly the logic of Ledoit-Wolf covariance shrinkage from the{" "}
        <A href="/tutorials/optimization-and-portfolios">optimization chapter</A> — pull noisy estimates toward a stable
        target — and of fractional Kelly: since your edge is estimated, bet as if it were smaller than measured.
      </P>
      <Callout kind="tip" title="Why the best backtest in a batch is your worst estimate">
        If you test 50 strategies and pick the top performer, its measured edge is the maximum of 50 noisy draws — it is
        almost certainly inflated by luck. A Bayesian with a sane prior (most strategies have zero edge) shrinks that
        winner hard, and the shrunk estimate is a far better forecast of live performance. This is the quantitative form
        of the warning in <A href="/tutorials/why-backtests-lie">Why most backtests lie</A>: selection turns noise into
        apparent signal, and shrinkage is the antidote.
      </Callout>

      <H2>The base-rate reminder</H2>
      <P>
        Bayes forces you to confront the <Strong>base rate</Strong> — the prior probability of a real edge — and it is
        low. Suppose 5% of the strategies you dream up have a genuine edge, and your validation test correctly flags a
        real edge 80% of the time but also fires on 10% of dead strategies (false positives). If a strategy passes, what
        is the chance it is real?
      </P>
      <Math>{"P(\\text{real} \\mid \\text{pass}) = \\frac{0.80 \\times 0.05}{0.80 \\times 0.05 + 0.10 \\times 0.95} = \\frac{0.040}{0.135} \\approx 0.30."}</Math>
      <P>
        Even a good test, applied to a population that is mostly noise, leaves a passing strategy more likely dead than
        alive. The low base rate dominates. That is why edgekit&rsquo;s gauntlet stacks <em>multiple independent</em>{" "}
        tests (permutation, walk-forward, regime split, cost stress): each one lowers the false-positive rate, and only
        their conjunction pushes the posterior probability of a real edge high enough to deploy.
      </P>

      <H2>Bayesian strategy allocation &amp; Thompson sampling</H2>
      <P>
        The Bayesian view also solves a live problem: you have several strategies and must decide how much to run each,
        while still <em>learning</em> which are best. That is the explore/exploit trade-off, and{" "}
        <Strong>Thompson sampling</Strong> is its elegant Bayesian solution. Keep a posterior over each strategy&rsquo;s
        edge; to allocate, <em>draw one sample</em> from each posterior and back the strategy with the best draw.
      </P>
      <Ul>
        <Li>
          <Strong>Exploit:</Strong> strategies with high posterior means get chosen most often — you ride what is
          working.
        </Li>
        <Li>
          <Strong>Explore:</Strong> a strategy with few trades has a <em>wide</em> posterior, so its sample occasionally
          comes out on top — you keep giving uncertain strategies a chance, in exact proportion to how uncertain they
          are.
        </Li>
        <Li>
          <Strong>Self-correcting:</Strong> as evidence accumulates each posterior narrows, exploration automatically
          fades, and allocation converges on the genuinely best performers.
        </Li>
      </Ul>
      <P>
        The allocation weight on a strategy is just the posterior probability that it is best,{" "}
        <MathInline>{"P(\\theta_k = \\max_j \\theta_j \\mid \\text{data})"}</MathInline>, estimated by the fraction of
        draws it wins. It needs no tuning parameter — the exploration rate is set by the posteriors themselves — which
        is why it beats hand-tuned <MathInline>{"\\varepsilon"}</MathInline>-greedy rules in practice.
      </P>
      <CodeBlock
        filename="thompson.py"
        code={`import numpy as np

# Posterior over each strategy's edge: mean m_k, std s_k (from the Normal update above).
# Thompson step: sample one edge per strategy, allocate to the argmax.
def thompson_weights(means, stds, draws=10_000, rng=np.random.default_rng(0)):
    samples = rng.normal(means, stds, size=(draws, len(means)))  # draws x K
    winners = samples.argmax(axis=1)                              # best draw each round
    return np.bincount(winners, minlength=len(means)) / draws     # P(strategy is best)

# Wide posterior (few trades) => more exploration; narrow => exploitation.
w = thompson_weights(means=[0.05, 0.02, 0.08], stds=[0.03, 0.03, 0.12])`}
      />
      <Callout kind="note" title="This closes the loop with sizing">
        Thompson allocation dovetails with <A href="/tutorials/position-sizing">position sizing</A> and{" "}
        <A href="/tutorials/portfolio-construction">portfolio construction</A>: the posterior <em>mean</em> feeds the
        size (bet more on the stronger edge, shrunk for uncertainty), while the posterior <em>width</em> governs how
        much you explore. Belief, evidence, and bet size become a single, self-updating system — which is the whole
        point of treating an edge as a distribution rather than a number.
      </Callout>
      <Table
        head={["Concept", "Formula / rule", "Trading use"]}
        rows={[
          ["Posterior", <MathInline key="p">{"\\propto \\text{likelihood} \\times \\text{prior}"}</MathInline>, "Belief about the edge after data"],
          ["Posterior mean", <MathInline key="m">{"\\text{precision-weighted avg}"}</MathInline>, "Shrunk edge estimate"],
          ["Credible interval", <MathInline key="c">{"P(\\mu \\in [a,b] \\mid D) = 0.95"}</MathInline>, "Honest range on the edge"],
          ["Shrinkage", <MathInline key="s">{"\\kappa \\in [0,1]"}</MathInline>, "Discount lucky backtests"],
          ["Thompson sampling", <MathInline key="t">{"\\text{argmax of one draw each}"}</MathInline>, "Explore/exploit allocation"],
        ]}
      />

      <P>
        <Strong>Next:</Strong> you now have the full mathematical toolkit — linear algebra, regression, optimization,
        stochastic processes, and Bayesian inference. Take it back to the workbench and turn a raw idea into a validated
        strategy in <A href="/tutorials/anatomy-of-a-strategy">Anatomy of a strategy</A>.
      </P>
    </>
  );
}
