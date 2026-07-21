import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, A, Strong, Callout, Table } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Why most backtests lie" };

export default function Page() {
  return (
    <>
      <H1>Why most backtests lie</H1>
      <Lead>
        A beautiful equity curve is the easiest thing in the world to produce and one of the least meaningful. This
        chapter is the hinge of the whole course: it shows, with math, exactly how a backtest fools you — noise
        mistaken for signal, the same data mined until something shines, the best of many random tries dressed up as a
        discovery. Understanding this is what makes the testing chapters that follow feel necessary rather than
        pedantic.
      </Lead>

      <H2>Noise vs signal</H2>
      <P>
        Every price series is part <Strong>signal</Strong> (a real, repeatable relationship) and mostly{" "}
        <Strong>noise</Strong> (random fluctuation that will never repeat). A backtest cannot tell you which is which
        — it faithfully reports the performance of whatever pattern you fit, real or imaginary. The trouble is that
        noise is <em>structured enough</em> to look like signal over any finite sample. Given a few hundred bars, you
        can always find a rule that would have traded them beautifully; the question is whether that rule describes the
        market or just that particular slice of history.
      </P>
      <P>
        The cruel asymmetry: a real edge is small and noisy (recall the standard error from{" "}
        <A href="/tutorials/statistics-for-traders">Statistics for traders</A>), while an over-fit rule looks
        clean and large. So the more impressive a backtest looks, the more suspicious you should be — real edges are
        usually thin and ugly.
      </P>

      <H2>Data mining & p-hacking</H2>
      <P>
        <Strong>Data mining</Strong> is searching the same dataset for a pattern that works; <Strong>p-hacking</Strong>{" "}
        is doing it until something clears a significance bar. Both exploit a loophole in the p-value from earlier: a
        p-value is only valid for a <em>single, pre-registered</em> test. Try many, and you have quietly changed the
        experiment.
      </P>
      <P>
        Every knob is a hidden test. Sweeping a lookback from 10 to 200, trying five stop multiples, three targets, and
        four instruments is <MathInline>{"191 \\times 5 \\times 3 \\times 4 = 11{,}460"}</MathInline> strategies. Report
        the best one&rsquo;s p-value as if you had run one test and you are lying to yourself with arithmetic. This is
        the most common way honest people produce dishonest backtests.
      </P>

      <H2>The multiple-testing problem</H2>
      <P>
        Here is the math that should scare you. If you run <MathInline>{"N"}</MathInline> independent tests on pure
        noise, each with a false-positive rate <MathInline>{"\\alpha"}</MathInline>, the probability that{" "}
        <em>at least one</em> comes up &ldquo;significant&rdquo; is:
      </P>
      <Math>{"P(\\text{at least one false positive}) = 1 - (1 - \\alpha)^{N}"}</Math>
      <Callout kind="tip" title="Derivation — the complement of 'no false positives'">
        <P>
          Work with the complement. Under the null (pure noise), one test is a false positive with probability{" "}
          <MathInline>{"\\alpha"}</MathInline>, so it is <em>not</em> a false positive with probability{" "}
          <MathInline>{"1 - \\alpha"}</MathInline>. If the <MathInline>{"N"}</MathInline> tests are independent, the
          probability that <em>all</em> of them clear (no false positive anywhere) is the product{" "}
          <MathInline>{"(1-\\alpha)^{N}"}</MathInline>. &ldquo;At least one false positive&rdquo; is the complement of
          &ldquo;none,&rdquo; so
        </P>
        <Math>{"\\text{FWER} = P(\\ge 1 \\text{ false positive}) = 1 - P(\\text{none}) = 1 - (1-\\alpha)^{N}."}</Math>
        <P>
          <Strong>Bonferroni correction.</Strong> To hold the family-wise error at <MathInline>{"\\alpha"}</MathInline>{" "}
          across <MathInline>{"N"}</MathInline> tests, test each at the stricter threshold{" "}
          <MathInline>{"\\alpha/N"}</MathInline>. The guarantee needs no independence — it follows from Boole&rsquo;s
          union bound, <MathInline>{"P\\!\\left(\\bigcup_i A_i\\right) \\le \\sum_i P(A_i)"}</MathInline>:
        </P>
        <Math>{"\\text{FWER} = P\\!\\left(\\textstyle\\bigcup_{i=1}^{N} \\{\\text{test } i \\text{ false-pos}\\}\\right) \\le \\sum_{i=1}^{N} \\frac{\\alpha}{N} = \\alpha."}</Math>
        <P>
          <Strong>Why it matters for trading.</Strong> Every knob you sweep is a hidden test, so your effective{" "}
          <MathInline>{"N"}</MathInline> is enormous and the honest per-config threshold is brutal. The best config in
          an 11,460-strategy sweep must clear roughly <MathInline>{"0.05 / 11{,}460 \\approx 4\\times10^{-6}"}</MathInline>,
          not <MathInline>{"0.05"}</MathInline>, before its p-value means anything.
        </P>
      </Callout>
      <P>
        At <MathInline>{"\\alpha = 0.05"}</MathInline>, just 14 tests give you better-than-even odds of a spurious
        winner; at 100 tests it is 99.4% certain. You <em>will</em> find a{" "}
        <MathInline>{"p < 0.05"}</MathInline> strategy in random data if you look at enough of them — guaranteed.
      </P>
      <Callout kind="tip" title="Scenario: sweeping SmaCross into a fake winner">
        You optimise a plain <Code>SmaCross</Code>: fast MA over <MathInline>{"\\{5, 10, \\dots, 50\\}"}</MathInline>{" "}
        (10 values), slow MA over <MathInline>{"\\{60, 80, \\dots, 200\\}"}</MathInline> (8 values), across 4
        instruments — <MathInline>{"10 \\times 8 \\times 4 = 320"}</MathInline> backtests. Even if none of these has a
        real edge, at <MathInline>{"\\alpha = 0.05"}</MathInline> you expect{" "}
        <MathInline>{"320 \\times 0.05 = 16"}</MathInline> of them to clear &ldquo;<MathInline>{"p < 0.05"}</MathInline>&rdquo;
        by luck alone, and the very best might post a profit factor near 1.6 with a gorgeous curve. Report{" "}
        <em>that</em> one as if it were your single idea and you have p-hacked without meaning to. The honest bar is not
        0.05 but Bonferroni&rsquo;s <MathInline>{"0.05/320 \\approx 1.6\\times10^{-4}"}</MathInline> — and the real
        defense is to hold out data the sweep never touched and see if the winner repeats.
      </Callout>
      <H3>The expected maximum of N random strategies</H3>
      <P>
        It gets worse: not only will one clear the bar, the <em>best</em> of your random tries will look genuinely
        spectacular. If you generate <MathInline>{"N"}</MathInline> strategies with no real edge — each a standard
        Normal Sharpe — the expected value of the <em>maximum</em> grows without bound as you add more:
      </P>
      <Math>{"E\\!\\left[\\max_{1 \\le i \\le N} Z_i\\right] \\approx \\sqrt{2 \\ln N}"}</Math>
      <Callout kind="note" title="Sketch — where √(2 ln N) comes from">
        <P>
          The maximum sits near the level <MathInline>{"t"}</MathInline> that you expect to be exceeded about{" "}
          <em>once</em> in <MathInline>{"N"}</MathInline> draws — i.e. where{" "}
          <MathInline>{"N\\,P(Z > t) \\approx 1"}</MathInline>. For a standard Normal the upper tail decays like{" "}
          <MathInline>{"P(Z > t) \\approx \\dfrac{1}{t\\sqrt{2\\pi}}\\,e^{-t^2/2}"}</MathInline>. Keeping the dominant
          exponential factor, set
        </P>
        <Math>{"N\\,e^{-t^{2}/2} \\approx 1 \\;\\Rightarrow\\; \\frac{t^{2}}{2} \\approx \\ln N \\;\\Rightarrow\\; t \\approx \\sqrt{2\\ln N}."}</Math>
        <P>
          The maximum of <MathInline>{"N"}</MathInline> iid standard Normals concentrates tightly around this level
          (extreme-value theory sharpens it to <MathInline>{"\\sqrt{2\\ln N} - \\tfrac{\\ln\\ln N + \\ln 4\\pi}{2\\sqrt{2\\ln N}}"}</MathInline>,
          but the leading term is what bites). <Strong>Why it matters for trading:</Strong> a Sharpe estimate is
          approximately Normal around its true value, so the <em>best</em> of <MathInline>{"N"}</MathInline> edge-free
          strategies has an expected Sharpe of about <MathInline>{"\\sqrt{2\\ln N}"}</MathInline> standard errors above
          zero purely from selection. Growing the search only makes the winner look better while its true edge stays
          exactly zero — best-of-N noise is indistinguishable from skill until you test out-of-sample.
        </P>
      </Callout>
      <P>
        Test 1,000 worthless strategies and the best one has an expected Sharpe around{" "}
        <MathInline>{"\\sqrt{2 \\ln 1000} \\approx 3.7"}</MathInline> standard errors from zero — a &ldquo;3-sigma
        discovery&rdquo; that is pure selection. The winner of a large search is not the one with an edge; it is the
        one that got luckiest. Its out-of-sample performance regresses straight back to zero.
      </P>
      <ChartFigure
        name="tut/multiple_testing"
        alt="The best Sharpe found among N random strategies rising with the number of strategies tested"
        caption="Best-of-N on pure noise: the maximum Sharpe among N edge-free strategies climbs like √(2 ln N). A 'great' backtest selected from a large search is expected even when nothing works — the winner is the luckiest, not the best."
      />
      <Callout kind="danger" title="The best backtest you ran is the one you should trust least">
        Selection is not a minor caveat — it is the dominant force in any strategy search. The very act of picking the
        top performer biases its metrics upward. Any honest evaluation must penalise for how many things you tried.
      </Callout>
      <P>
        This is why edgekit&rsquo;s <A href="/docs/api/validation">validation</A> layer carries a{" "}
        <Code>deflated_sharpe</Code> — a Sharpe adjusted down for the number of trials it took to find the winner —
        precisely to undo the <MathInline>{"\\sqrt{2 \\ln N}"}</MathInline> inflation.
      </P>
      <CodeBlock
        filename="deflated.py"
        code={`from edgekit.validation import deflated_sharpe

# You searched ~200 configs and kept the best. Its raw Sharpe is inflated
# by that selection — deflate it against the number of trials.
ds = deflated_sharpe(winning_returns, n_trials=200, sr_std=0.03)
print(ds)   # a Sharpe that survives this is one selection didn't manufacture`}
      />

      <H2>The base-rate fallacy — the most important lesson in the chapter</H2>
      <P>
        A significant p-value answers <MathInline>{"P(\\text{significant} \\mid \\text{no edge})"}</MathInline> — the
        chance noise fakes your result. But the question you actually care about is the reverse:{" "}
        <MathInline>{"P(\\text{real edge} \\mid \\text{significant})"}</MathInline> — given that my backtest cleared the
        bar, how likely is the edge <em>real</em>? These are not the same number, and confusing them is the{" "}
        <Strong>base-rate fallacy</Strong>. <A href="/tutorials/statistics-for-traders">Bayes&rsquo; theorem</A> converts
        one into the other:
      </P>
      <Math>{"P(\\text{real} \\mid \\text{sig}) = \\frac{P(\\text{sig} \\mid \\text{real})\\,P(\\text{real})}{P(\\text{sig})}, \\qquad P(\\text{sig}) = P(\\text{sig}\\mid\\text{real})P(\\text{real}) + P(\\text{sig}\\mid\\text{fake})P(\\text{fake})."}</Math>
      <P>
        The term <MathInline>{"P(\\text{real})"}</MathInline> is the <Strong>prior base rate</Strong> — the fraction of
        strategies you try that have a genuine edge — and it is <em>low</em>. Real edges are rare; most ideas are
        variations on noise. Plug in a sober prior <MathInline>{"P(\\text{real}) = 0.05"}</MathInline>, a test with power{" "}
        <MathInline>{"P(\\text{sig}\\mid\\text{real}) = 0.80"}</MathInline>, and the usual false-positive rate{" "}
        <MathInline>{"P(\\text{sig}\\mid\\text{fake}) = 0.05"}</MathInline>:
      </P>
      <Math>{"P(\\text{real}\\mid\\text{sig}) = \\frac{0.80 \\times 0.05}{0.80 \\times 0.05 + 0.05 \\times 0.95} = \\frac{0.040}{0.040 + 0.0475} = \\frac{0.040}{0.0875} \\approx 0.46."}</Math>
      <P>
        Read that again: even a <em>correctly</em> significant, <MathInline>{"p < 0.05"}</MathInline> backtest is more
        likely <Strong>false than true</Strong> — a 54% chance the &ldquo;edge&rdquo; is noise — <em>before</em> you
        account for any data mining. And multiple testing makes it strictly worse: searching many configs inflates the
        effective <MathInline>{"P(\\text{sig}\\mid\\text{fake})"}</MathInline> far above 0.05 (that is what the{" "}
        <MathInline>{"1-(1-\\alpha)^N"}</MathInline> result above measures), so the denominator balloons and the
        posterior collapses toward zero.
      </P>
      <Callout kind="warn" title="Why it matters for trading — this is the whole game">
        You cannot raise a low posterior by staring harder at the same p-value; the only levers are the <em>prior</em>{" "}
        and the <em>false-positive rate</em>. That is exactly what good process does: a sound economic rationale raises{" "}
        <MathInline>{"P(\\text{real})"}</MathInline> before you test, and out-of-sample validation, permutation, and
        cost stress drive <MathInline>{"P(\\text{sig}\\mid\\text{fake})"}</MathInline> down. A significant backtest is
        the <em>start</em> of the argument, never the end of it.
      </Callout>

      <H2>Overfitting, formalised</H2>
      <P>
        <Strong>Overfitting</Strong> is fitting the noise instead of the signal. Any model flexible enough will drive
        its in-sample error toward zero by memorising the particular wiggles of the training data — wiggles that carry
        no information about the future. The tell is a widening gap between in-sample and out-of-sample performance:
      </P>
      <Math>{"\\text{Generalization gap} = \\underbrace{\\text{Error}_{\\text{out-of-sample}}}_{\\text{what you'll actually get}} - \\underbrace{\\text{Error}_{\\text{in-sample}}}_{\\text{what the backtest showed}}"}</Math>
      <Callout kind="note" title="Why the in-sample number is optimistic by construction">
        <P>
          When you choose parameters <MathInline>{"\\theta"}</MathInline> to <em>minimise</em> error on the training
          sample, you are optimising against that sample&rsquo;s particular noise as well as its signal. Decompose an
          estimator&rsquo;s expected error into <Strong>bias</Strong>, <Strong>variance</Strong>, and irreducible{" "}
          <Strong>noise</Strong>:
        </P>
        <Math>{"E\\big[(\\hat{y} - y)^2\\big] = \\underbrace{(\\text{bias})^2}_{\\text{too-simple}} + \\underbrace{\\text{variance}}_{\\text{fits noise}} + \\underbrace{\\sigma^2}_{\\text{irreducible}}."}</Math>
        <P>
          Adding complexity buys lower bias but higher variance — and variance is the part that <em>does not
          transfer</em> to new data. In-sample error keeps falling because the fit absorbs both terms; out-of-sample
          error can only fall until the variance term overtakes the bias saving, then it rises. <Strong>Why it matters
          for trading:</Strong> the gap is not measurable from the backtest alone — the training curve always looks
          good — which is exactly why you must hold out unseen data (walk-forward) to <em>estimate</em> it rather than
          assume it away. See <A href="/tutorials/overfitting-detection">Overfitting detection</A>.
        </P>
      </Callout>
      <Callout kind="tip" title="Scenario: the ten-knob strategy that only knew 2021">
        A colleague shows you a BTC strategy with ten hand-tuned rules — a lookback of 37, a stop at 2.3 ATR, a
        volume filter above 1.8×, a &ldquo;skip Mondays&rdquo; toggle, and so on — with a flawless 2021 equity curve
        and a Sharpe near 3. Each oddly-specific knob was chosen because it improved that year&rsquo;s backtest, which
        means the knobs are describing 2021&rsquo;s <em>particular</em> noise: the exact chop, the exact rallies. Run it
        untouched on 2022 and it falls apart — Sharpe goes negative — because 2022&rsquo;s noise is different noise. The
        in-sample number was never a forecast; it was a memory. That gap between the beautiful 2021 curve and the ugly
        2022 one is the generalization gap made visible, and the ten degrees of freedom are exactly what bought it.
      </Callout>
      <P>
        As you add parameters or search harder, in-sample error keeps falling but out-of-sample error turns around and{" "}
        <em>rises</em> — the model has started describing this history rather than the market. The sweet spot is well
        before the in-sample minimum; past it you are buying backtest beauty with live losses.
      </P>
      <ChartFigure
        name="tut/overfitting_curve"
        alt="In-sample error falling while out-of-sample error falls then rises with model complexity"
        caption="The overfitting curve. In-sample error (lower line) falls monotonically with complexity; out-of-sample error (upper line) bottoms out then climbs. The gap between them is overfitting — and the backtest only ever shows you the lower line."
      />
      <Callout kind="warn" title="Degrees of freedom are a budget you are spending">
        Every parameter, filter, and hand-tuned threshold is a degree of freedom spent fitting the past. A strategy
        with two robust rules that works everywhere beats one with ten finely-tuned knobs that works only on the data
        it was born from. Simplicity is not aesthetics — it is out-of-sample insurance.
      </Callout>

      <H2>Regime dependence</H2>
      <P>
        Even a genuinely-fit strategy carries a hidden assumption: that the future resembles the past. Markets move
        through <Strong>regimes</Strong> — trending vs ranging, calm vs volatile, low-rate vs high-rate — and an edge
        that was real in one regime can vanish or invert in the next. A backtest spanning a single long bull market
        can look flawless and be measuring nothing but that regime&rsquo;s tailwind (the difference between{" "}
        <em>alpha</em> and <em>beta</em>, covered in{" "}
        <A href="/tutorials/alpha-vs-beta">Alpha vs beta</A>).
      </P>
      <P>
        The defense is to insist an edge holds across regimes, not just on average. Split the history — bull vs bear,
        high-vol vs low-vol — and demand the edge survive each slice, not merely the blended whole. A result that only
        appears when you pool everything together is a regime artifact wearing an edge&rsquo;s clothing.
      </P>

      <H2>Regression to the mean &amp; survivorship bias</H2>
      <P>
        Selection has a quantitative signature. Write any measured performance as truth plus noise,{" "}
        <MathInline>{"X = \\mu + \\varepsilon"}</MathInline>, where <MathInline>{"\\mu"}</MathInline> is the strategy&rsquo;s
        real skill and <MathInline>{"\\varepsilon"}</MathInline> is sampling luck. When you pick the <em>top</em> result
        of a search, you preferentially pick strategies whose <MathInline>{"\\varepsilon"}</MathInline> was large and
        positive — so the winner&rsquo;s luck is, on average, positive, and its future performance{" "}
        <Strong>regresses toward the mean</Strong>. The best linear estimate of the truth given the observation shrinks
        it toward the population average <MathInline>{"\\bar{\\mu}"}</MathInline>:
      </P>
      <Math>{"E[\\mu \\mid X] = \\bar{\\mu} + \\rho\\,(X - \\bar{\\mu}), \\qquad \\rho = \\frac{\\sigma_\\mu^2}{\\sigma_\\mu^2 + \\sigma_\\varepsilon^2} < 1."}</Math>
      <P>
        The <em>reliability</em> <MathInline>{"\\rho"}</MathInline> is the share of observed variance that is real
        signal. When noise dominates <MathInline>{"(\\sigma_\\varepsilon^2 \\gg \\sigma_\\mu^2)"}</MathInline>,{" "}
        <MathInline>{"\\rho \\to 0"}</MathInline> and your best forecast of a chart-topping backtest&rsquo;s future is{" "}
        <em>the average</em> — near zero edge. This is regression to the mean stated as an equation, and it is the
        deep reason out-of-sample numbers come in below in-sample ones.
      </P>
      <P>
        <Strong>Survivorship bias</Strong> is the same conditioning applied by the world instead of by you. The
        strategies, funds, and coins you can study are the ones that <em>survived</em>; the failures were delisted and
        deleted. Conditioning on survival lifts the observed mean above the true mean,{" "}
        <MathInline>{"E[\\,\\text{return} \\mid \\text{survived}\\,] > E[\\,\\text{return}\\,]"}</MathInline>, so a
        backtest on today&rsquo;s tradable universe is quietly scored on a sample hand-picked for having done well.
      </P>
      <Callout kind="warn" title="Why it matters for trading">
        Both effects push the <em>same</em> direction — your live results will, on average, come in below your best
        backtest — and neither is a bug you can fix by trying harder. The only defenses are to <em>shrink</em> extreme
        estimates before you trust them (deflated Sharpe does this) and to test on data and instruments that were{" "}
        <em>not</em> pre-selected for success (walk-forward, point-in-time universes).
      </Callout>

      <H2>This is why the gauntlet exists</H2>
      <P>
        Every failure above has the same shape — a result that looks real in-sample and dies out-of-sample — and each
        has a specific antidote. Stacked together, they are the <A href="/tutorials/the-gauntlet">gauntlet</A>:
      </P>
      <Table
        head={["The lie", "The defense", "Where in edgekit"]}
        rows={[
          ["Noise mistaken for signal", "Permutation test — could shuffled data fake this?", <Code key="a">validation.mcpt</Code>],
          ["Best-of-N selection inflation", "Deflated Sharpe — penalise for trials", <Code key="b">validation.deflated_sharpe</Code>],
          ["Overfitting to one period", "Walk-forward — test on unseen data", <Code key="c">validation.walk_forward</Code>],
          ["Regime dependence", "Regime splits — demand edge in each", <A key="d" href="/tutorials/the-gauntlet">the gauntlet</A>],
          ["One lucky historical path", "Monte Carlo — resample the outcome", <A key="e" href="/tutorials/monte-carlo">Monte Carlo</A>],
          ["Costs quietly ignored", "Cost stress — 2× the fees, does it live?", <Code key="f">costs.cost_stress</Code>],
        ]}
      />
      <Callout kind="tip" title="The mindset to carry forward">
        Treat every backtest as guilty until proven innocent. Your job is not to build a strategy that looks good —
        that is trivial — but to <em>try to kill</em> a strategy and report the ones that refuse to die. The illustrative
        <Code>ORB</Code> and <Code>SmaCross</Code> strategies in edgekit are here to practice that adversarial process,
        and most of them do not survive it. That is the point.
      </Callout>

      <P>
        <Strong>Next:</Strong> with the math of edge and the ways it deceives us in hand, Part III turns to building —
        starting with the <A href="/tutorials/anatomy-of-a-strategy">Anatomy of a strategy</A>. The defenses named
        above are built out in full in Part IV, beginning with{" "}
        <A href="/tutorials/backtesting-fundamentals">Backtesting fundamentals</A>.
      </P>
    </>
  );
}
