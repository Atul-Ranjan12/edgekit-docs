import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Code, Callout } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Risk management" };

export default function Page() {
  return (
    <>
      <H1>Risk management</H1>
      <Lead>
        Every earlier chapter was about finding and sizing an edge. This one is about surviving long enough to collect
        it. Risk management is the discipline of quantifying how much you can lose — in a normal day, in a bad tail, and
        over a long ugly stretch — and then sizing so that the worst plausible outcome does not end the game. The
        measures here (VaR, Expected Shortfall, drawdown, the ulcer index) are the vocabulary; the sizing tools turn a
        risk <em>target</em> into a position. The through-line: a strategy with a real edge and reckless sizing is a
        losing strategy.
      </Lead>

      <Callout kind="tip" title="Why a trader cares">
        You are running a <Strong>$100,000</Strong> account. The single most important number in your life is not your
        expected return — it is the answer to &ldquo;how much can I lose on a bad day, and how much on a truly awful
        one?&rdquo; Guess too low and one tail event ends the account before the edge ever pays off; guess too high and
        you trade so small the edge is pointless. This chapter is the vocabulary for pinning that number down — VaR for
        the bad day, Expected Shortfall for the awful one, drawdown for the long ugly stretch — and then the sizing
        tools that turn a loss budget back into a position.
      </Callout>

      <H2>Position risk vs portfolio risk</H2>
      <P>
        There are two distinct questions, and conflating them is a classic error.{" "}
        <Strong>Position risk</Strong> is how much a single trade can lose — governed by the entry, the stop, and the
        size, and expressed cleanly in edgekit as the R-multiple (loss at the stop = 1R). <Strong>Portfolio risk</Strong>{" "}
        is how much the whole book can lose at once, which is <em>not</em> the sum of the position risks because
        positions are correlated. Two &ldquo;independent&rdquo; long trades that both crater in the same crash are, in
        that moment, one position twice the size.
      </P>
      <P>
        The variance of a portfolio makes the correlation explicit. For weights{" "}
        <MathInline>{"w"}</MathInline> and covariance matrix <MathInline>{"\\Sigma"}</MathInline>:
      </P>
      <Math>{"\\sigma_p^2 = w^\\top \\Sigma\\, w = \\sum_i w_i^2 \\sigma_i^2 + \\sum_{i \\ne j} w_i w_j\\, \\sigma_i \\sigma_j\\, \\rho_{ij}"}</Math>
      <P>
        The cross terms are the whole story of diversification: low or negative{" "}
        <MathInline>{"\\rho_{ij}"}</MathInline> shrinks portfolio risk below the sum of parts, while correlations that
        spike to 1 in a crisis (as they notoriously do) erase the diversification exactly when you need it. Manage risk
        at the portfolio level, not one trade at a time.
      </P>
      <Callout kind="tip" title="Scenario: the diversification that evaporates in a crash">
        Split the $100k book equally across two strategies, each running 12% annual volatility, normally correlated at
        <MathInline>{"\\rho = 0.2"}</MathInline>. Portfolio vol is{" "}
        <MathInline>{"\\sqrt{0.0072\\,(1+\\rho)} = \\sqrt{0.0072\\times1.2} \\approx 9.3\\%"}</MathInline> — comfortably
        below either leg&apos;s 12%, the diversification working as advertised. Now a crisis hits and the two books,
        which looked independent in calm, both dump together: <MathInline>{"\\rho \\to 0.9"}</MathInline>. Portfolio vol
        jumps to <MathInline>{"\\sqrt{0.0072\\times1.9} \\approx 11.7\\%"}</MathInline> — almost the full undiversified
        12%. The benefit you sized against in calm nearly vanished in the exact moment you were counting on it. This is
        why the correlation-to-1 stress test at the end of the chapter is not optional.
      </Callout>

      <H2>Value-at-Risk</H2>
      <P>
        <Strong>Value-at-Risk</Strong> answers: &ldquo;over this horizon, what loss will I not exceed with confidence{" "}
        <MathInline>{"1-\\alpha"}</MathInline>?&rdquo; Formally it is the <MathInline>{"\\alpha"}</MathInline>-quantile
        of the loss distribution — the 5% VaR is the loss such that only 5% of days are worse.
      </P>
      <Math>{"\\text{VaR}_\\alpha = -\\,\\inf\\{\\, \\ell : P(R \\le \\ell) \\ge \\alpha \\,\\} = -\\,Q_R(\\alpha)"}</Math>
      <P>
        edgekit reports VaR as a <Strong>positive loss number</Strong> (a 5% VaR of{" "}
        <MathInline>{"0.03"}</MathInline> means &ldquo;lose 3% or more on the worst 1-in-20 days&rdquo;), with three
        estimation methods that trade off assumptions against tail realism:
      </P>
      <Ul>
        <Li>
          <Strong>Historical.</Strong> The empirical <MathInline>{"\\alpha"}</MathInline>-quantile of realised returns —
          no distributional assumption, but limited to tails your sample actually contains.
        </Li>
        <Li>
          <Strong>Gaussian.</Strong> <MathInline>{"-(\\mu + z_\\alpha \\sigma)"}</MathInline> with{" "}
          <MathInline>{"z_\\alpha = \\Phi^{-1}(\\alpha)"}</MathInline>. Clean and cheap, but it assumes normality and so{" "}
          <em>underestimates</em> the tail for the fat-tailed returns you met in Part II.
        </Li>
        <Li>
          <Strong>Cornish-Fisher.</Strong> The Gaussian quantile corrected for skewness and excess kurtosis, so a fat,
          left-skewed tail widens the VaR beyond the naive Gaussian estimate — a pragmatic middle ground.
        </Li>
      </Ul>
      <CodeBlock code={`import edgekit as ek

# rets: the strategy's daily return series (positive VaR = loss fraction)
var_hist = ek.risk.value_at_risk(rets, alpha=0.05, method="historical")
var_norm = ek.risk.value_at_risk(rets, alpha=0.05, method="gaussian")
var_cf   = ek.risk.value_at_risk(rets, alpha=0.05, method="cornish_fisher")
# fat/left-skewed tails -> var_cf > var_norm : the Gaussian number was too optimistic`} />
      <Callout kind="tip" title="Scenario: a 95% VaR on the $100k book, three ways">
        Your strategy&apos;s daily returns average roughly 0 with a 1% standard deviation, and they are fat-tailed and
        left-skewed (as real returns are). Compute the 5% (95%-confidence) 1-day VaR:
        <br />• <Strong>Historical</Strong> — the empirical 5th percentile of your actual daily returns comes in at{" "}
        <MathInline>{"-2.1\\%"}</MathInline>, so <MathInline>{"\\text{VaR} = 2.1\\%"}</MathInline>, i.e.{" "}
        <Strong>$2,100</Strong> on the $100k book. Read it as: &ldquo;on the worst 1-day-in-20 I lose $2,100 or
        more.&rdquo;
        <br />• <Strong>Gaussian</Strong> — <MathInline>{"-(\\mu + z_{0.05}\\,\\sigma) = -(0 - 1.645\\times0.01) = 1.6\\%"}</MathInline>,
        or <Strong>$1,645</Strong>. Cleaner, but it assumes normality and so <em>understates</em> the loss by ~$450.
        <br />• <Strong>Cornish-Fisher</Strong> — correct the Gaussian quantile for the negative skew and fat tails and
        it widens to <MathInline>{"\\approx 2.4\\%"}</MathInline>, or <Strong>$2,400</Strong>, now <em>above</em> the
        historical estimate because it extrapolates the tail shape rather than being capped by your sample.
        <br />Same book, same day: the ordering <MathInline>{"\\text{Gaussian} < \\text{historical} < \\text{Cornish-Fisher}"}</MathInline>{" "}
        is the fat left tail making itself felt, and the Gaussian $1,645 is exactly the number that lulls accounts into
        over-sizing.
      </Callout>
      <Callout kind="warn" title="The critiques of VaR">
        VaR has two deep flaws. First, it says nothing about <em>how bad</em> the tail is beyond the threshold — a 5%
        VaR of 3% is identical whether the worst 5% of days average −4% or −40%. Second, it is <em>not a coherent risk
        measure</em>: VaR can violate sub-additivity, meaning the VaR of a combined book can exceed the sum of its
        parts, which perversely penalises diversification. Both problems are exactly what Expected Shortfall fixes.
      </Callout>

      <H2>Expected Shortfall (CVaR)</H2>
      <P>
        <Strong>Expected Shortfall</Strong> — equivalently Conditional VaR — answers the question VaR dodges:{" "}
        <em>given</em> that you are in the worst <MathInline>{"\\alpha"}</MathInline> tail, what is the average loss? It
        is the mean of the tail, not its edge:
      </P>
      <Math>{"\\text{ES}_\\alpha = -\\,\\mathbb{E}\\big[\\, R \\mid R \\le Q_R(\\alpha) \\,\\big] \\;\\ge\\; \\text{VaR}_\\alpha"}</Math>
      <P>
        Because it averages over everything past the threshold, ES is always at least as large as VaR for the same{" "}
        <MathInline>{"\\alpha"}</MathInline>, and it responds to the shape of the extreme tail. Crucially it is a{" "}
        <Strong>coherent risk measure</Strong>: it satisfies sub-additivity, so diversification can only reduce it —
        which is why regulators and serious risk desks size against ES, not VaR. edgekit gives you both in one pass,
        guaranteed internally consistent (<MathInline>{"\\text{cvar} \\ge \\text{var}"}</MathInline>):
      </P>
      <CodeBlock code={`tail = ek.risk.var_cvar(rets, alpha=0.05, method="historical")
# tail == {"var": positive loss, "cvar": positive loss >= var}
print(f"5% VaR = {tail['var']:.3%}   5% CVaR = {tail['cvar']:.3%}")

# the two standalone forms are also available:
es = ek.risk.expected_shortfall(rets, alpha=0.05, method="historical")`} />
      <ChartFigure
        name="tut/var_cvar"
        alt="A return distribution with the VaR threshold and the CVaR tail mean marked"
        caption="The return histogram with the 5% VaR marked as the quantile line and CVaR as the mean of the shaded tail beyond it. VaR is where the tail begins; CVaR is how deep it goes. For fat-tailed returns the gap between them is wide — and it is the gap that ruins accounts."
      />
      <Callout kind="tip" title="Scenario: what VaR did not tell you about the $100k book">
        The historical VaR said you lose <em>at least</em> $2,100 on the worst 1-in-20 days. But how bad are those days
        on average? Take the mean of every return past the 5th-percentile threshold and, for this fat-tailed book, it
        comes to <MathInline>{"-3.4\\%"}</MathInline> — a 5% CVaR of <Strong>$3,400</Strong>. VaR told you where the tail
        <em> begins</em> ($2,100); CVaR tells you how <em>deep</em> it goes once you are in it ($3,400), a 60% larger
        number. That $3,400 — not the $2,100 — is what you must be financially and psychologically able to absorb, and
        it is why regulators and serious desks size against ES. The gap between the two is the fat tail, and it is the
        gap that empties accounts.
      </Callout>

      <H3>Tail risk and fat tails</H3>
      <P>
        This all matters only because returns are not Gaussian. As Part II&apos;s{" "}
        <A href="/tutorials/probability-and-distributions">distributions chapter</A> showed, financial returns have{" "}
        <em>excess kurtosis</em> — fat tails — so &ldquo;6-sigma&rdquo; days that a normal model deems impossible show up
        every few years. The <Strong>tail ratio</Strong> is a quick, distribution-free read on the asymmetry: the size
        of the right tail relative to the left.
      </P>
      <Math>{"\\text{tail ratio} = \\frac{|Q_R(1-q)|}{|Q_R(q)|}, \\qquad q = 0.05"}</Math>
      <P>
        A ratio above 1 means the winning tail is fatter than the losing tail (favourable convexity — small losses,
        occasional big wins, like a trend follower); below 1 flags crash-prone payoffs where you win small and lose
        big. Read it alongside CVaR to characterise the shape of what you are exposed to.
      </P>
      <CodeBlock code={`tr = ek.risk.tail_ratio(rets, q=0.05)   # |95th pctile| / |5th pctile|
# > 1 : right tail fatter (convex) | < 1 : left tail fatter (crash-prone)`} />

      <H2>Drawdown control and the ulcer index</H2>
      <P>
        VaR and ES describe a single period. But what actually forces capitulation — and, on a prop account, breaches
        the drawdown limit — is the <em>path</em>: how far below its high-water mark the equity curve sits, and for how
        long. The <Strong>drawdown series</Strong> is the running loss from the prior peak, as a positive fraction:
      </P>
      <Math>{"D_t = \\frac{\\max_{s \\le t} E_s - E_t}{\\max_{s \\le t} E_s}"}</Math>
      <P>
        Its maximum is the familiar max-drawdown, but a single scalar hides the difference between one sharp dip and a
        two-year slog underwater. The <Strong>ulcer index</Strong> captures that by taking the root-mean-square of the
        drawdown path — penalising drawdowns that are both <em>deep and long</em>, quadratically:
      </P>
      <Math>{"\\text{UI} = \\sqrt{\\frac{1}{T}\\sum_{t=1}^{T} D_t^2}"}</Math>
      <CodeBlock code={`# equity is the cumulative-return / account-value curve
dd = ek.risk.drawdown_series(equity)   # per-bar drawdown, 0 at every new high
ui = ek.risk.ulcer_index(equity)       # RMS of the drawdown path; deep+long hurts most
print(f"max drawdown = {dd.max():.2%}   ulcer index = {ui:.4f}")`} />
      <ChartFigure
        name="equity_with_drawdown"
        alt="An equity curve with its underwater drawdown series plotted beneath"
        caption="Top: the equity curve with its high-water mark. Bottom: the underwater plot — the drawdown series, zero at every new high and diving during losing stretches. The ulcer index is the RMS depth of that underwater region; two curves with the same max-DD can have very different ulcer indices."
      />
      <Callout kind="tip" title="Scenario: two curves, same max-drawdown, very different pain">
        Two strategies both post a 20% max-drawdown, so on that one number they look identical. Curve A took a sharp
        −20% hit and clawed back to new highs within a month — its underwater plot is a single deep spike, and its ulcer
        index is small (say <MathInline>{"\\approx 0.04"}</MathInline>). Curve B drifted −20% down and then languished
        underwater for <em>two years</em> before recovering — a long shallow bathtub, ulcer index{" "}
        <MathInline>{"\\approx 0.12"}</MathInline>, three times A&apos;s. Max-drawdown cannot tell them apart; the ulcer
        index, which RMS-averages the whole underwater path, says B was three times as painful to hold. If you have ever
        abandoned a &ldquo;working&rdquo; strategy out of sheer fatigue, it was the ulcer index, not the max-DD, that
        broke you.
      </Callout>
      <Callout kind="tip" title="Ulcer index over max-drawdown for comparing curves">
        Max-drawdown is a single worst-case point and is noisy — it can be set by one bar. The ulcer index integrates
        the entire pain of the curve, so it is the more stable statistic for ranking strategies and the better
        denominator for a pain-adjusted return (the Martin ratio = CAGR / ulcer index).
      </Callout>

      <H2>Risk budgeting: equal risk contribution</H2>
      <P>
        At the portfolio level, the naive move is to allocate <em>capital</em> equally. The better move is to allocate{" "}
        <em>risk</em> equally — because a volatile asset given equal capital dominates the portfolio&apos;s variance.{" "}
        <Strong>Equal risk contribution</Strong> (risk parity) chooses weights so that each asset contributes the same
        amount to total portfolio risk. Asset <MathInline>{"i"}</MathInline>&apos;s marginal contribution is:
      </P>
      <Math>{"\\text{RC}_i = w_i \\frac{(\\Sigma w)_i}{\\sqrt{w^\\top \\Sigma w}}, \\qquad \\text{ERC: } \\text{RC}_i = \\text{RC}_j \\ \\forall\\, i,j"}</Math>
      <P>
        There is no closed form, so <Code>ek.optimize.equal_risk_contribution</Code> solves it iteratively from the
        covariance matrix, and <Code>ek.sizing.risk_parity</Code> applies the rolling-volatility version bar by bar to a
        matrix of return streams:
      </P>
      <CodeBlock code={`import numpy as np

# covariance of the books' return streams -> equal-risk-contribution weights
cov = np.cov(np.vstack([book_a, book_b, book_c]))
w = ek.optimize.equal_risk_contribution(cov, iters=200)
# each book now contributes equally to portfolio variance -> no single book dominates

# or size a live book of streams to rolling risk parity:
weights = ek.sizing.risk_parity(returns_matrix, win=90)`} />
      <Callout kind="tip" title="Scenario: equal capital vs equal risk across three books">
        You allocate the $100k across three strategies: a trend follower at 20% vol, a pairs book at 8% vol, and a
        breakout at 12% vol, roughly uncorrelated. Split <em>capital</em> equally (⅓ each) and the trend follower — with
        more than double the pairs book&apos;s volatility — ends up producing over half the portfolio&apos;s risk: one
        book quietly runs the show. Feed the covariance to <Code>equal_risk_contribution</Code> and it rebalances toward
        the inverse-volatility mix — roughly 19% to the trend book, 48% to the calm pairs book, 32% to the breakout — so
        each contributes the <em>same</em> one-third of portfolio variance. Same three edges, but now no single book can
        sink the account on its own bad month.
      </Callout>

      <H2>Sizing to a risk target</H2>
      <P>
        Risk measurement is only useful if it feeds back into position size. Two edgekit sizers close that loop.{" "}
        <Code>vol_target</Code> scales exposure so realised volatility tracks a target — lever up in calm, cut in
        stress — which is the operational form of the GARCH-forecast idea from the first chapter of this part:
      </P>
      <Math>{"\\text{scale}_t = \\min\\!\\left(\\frac{\\sigma_{\\text{target}}}{\\hat\\sigma_t},\\ \\text{cap}\\right)"}</Math>
      <CodeBlock code={`# vol-target an existing return/position stream (capped leverage)
scaled = ek.sizing.vol_target(port_returns, cap=1.5, win=60)`} />
      <P>
        <Code>size_to_dd</Code> goes the other way: it sizes to a <em>drawdown budget</em> — the maximum you are willing
        to lose from peak — which is exactly the constraint a prop-firm challenge imposes. Give it the return stream,
        the drawdown budget, and the account size, and it backs out the position scale consistent with that limit:
      </P>
      <CodeBlock code={`# size so the expected peak-to-trough loss respects a fixed drawdown budget
size = ek.sizing.size_to_dd(daily_r, dd_budget=0.10, account=100_000)
# e.g. "never risk more than a 10% drawdown of a $100k account"`} />
      <Callout kind="tip" title="Scenario: sizing the book to a prop-firm drawdown limit">
        A prop challenge funds your $100k with a hard rule: breach a 10% ($10,000) trailing drawdown and the account is
        gone. Your strategy&apos;s <em>unscaled</em> return stream, from its historical path, would have run a ~25% peak-
        to-trough drawdown — three times the budget, an instant fail. <Code>size_to_dd(daily_r, dd_budget=0.10, account=100_000)</Code>{" "}
        backs out the position scale that pulls the <em>expected</em> worst drawdown down to the 10% line — here roughly
        a <MathInline>{"0.10/0.25 \\approx 0.4\\times"}</MathInline> haircut on size. You trade the same signal at 40% of
        its natural size so the loss budget, not your optimism, sets the leverage. That is the whole discipline: the
        risk limit chooses the size, and the size chooses whether you are still in the game next month.
      </Callout>

      <H2>Stress testing</H2>
      <P>
        Every number above is estimated on the past, and the past is not the worst case. <Strong>Stress testing</Strong>{" "}
        asks what happens under conditions your sample under-represents — and it is the humility check that keeps the
        whole discipline honest:
      </P>
      <Ul>
        <Li>
          <Strong>Cost stress.</Strong> Re-run at 2x and 3x your assumed spread/commission with{" "}
          <Code>ek.costs.cost_stress</Code>. A thin edge that dies at 2x cost is not deployable.
        </Li>
        <Li>
          <Strong>Correlation-goes-to-1.</Strong> Recompute portfolio VaR/CVaR assuming your diversifiers correlate
          perfectly, as they do in a crash. The diversification benefit you priced in calm may vanish.
        </Li>
        <Li>
          <Strong>Historical scenario replay.</Strong> Push the book through the worst windows in your data and read the
          resulting drawdown and CVaR — the loss you must be financially and psychologically prepared to take.
        </Li>
        <Li>
          <Strong>Monte Carlo on the return distribution.</Strong> Resample or bootstrap the trade sequence to see the
          distribution of drawdowns you could have experienced, not just the one path you did — the subject of the{" "}
          <A href="/tutorials/monte-carlo">Monte Carlo chapter</A>.
        </Li>
      </Ul>
      <Callout kind="danger" title="Risk measures fail in exactly the moment you need them">
        VaR, ES, and volatility are all backward-looking estimates on a finite sample, and they systematically
        understate risk in the transition from calm to crisis — the regime shift from the previous chapter. Treat every
        risk number as a lower bound on what can happen, size with a margin below what the model says you can afford,
        and never let a single position or a single correlated cluster be able to end the account.
      </Callout>

      <P>
        Next: <A href="/tutorials/backtest-to-live">From backtest to live</A> (Part IX) — how the validated,
        risk-managed strategy you have built survives contact with real execution: slippage, latency, capital limits,
        and the operational discipline of running it in production.
      </P>
    </>
  );
}
