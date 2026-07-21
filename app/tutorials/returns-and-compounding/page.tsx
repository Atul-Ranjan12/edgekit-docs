import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, A, Strong, Callout, Table } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Returns & compounding" };

export default function Page() {
  return (
    <>
      <H1>Returns & compounding</H1>
      <Lead>
        Before any strategy, edge, or backtest, you need to measure change correctly. Two ways to write down a return
        look almost identical and behave completely differently once you chain them together. Getting this wrong quietly
        corrupts every metric downstream — Sharpe, CAGR, drawdown — so we start here.
      </Lead>

      <H2>Simple returns</H2>
      <P>
        The <Strong>simple</Strong> (arithmetic) return over one period is the fractional change in price. If{" "}
        <MathInline>{"P_t"}</MathInline> is the close at time <MathInline>{"t"}</MathInline>:
      </P>
      <Math>{"r_t = \\frac{P_t}{P_{t-1}} - 1 = \\frac{P_t - P_{t-1}}{P_{t-1}}"}</Math>
      <P>
        A move from 100 to 110 is <MathInline>{"r = 0.10"}</MathInline> — a 10% return. This is the number you
        actually earn on capital over the period, which is exactly why it is the right unit for <em>combining across
        assets</em> at a point in time: a portfolio&rsquo;s simple return is the weighted sum of its holdings&rsquo;
        simple returns.
      </P>
      <Callout kind="warn" title="Simple returns do not add across time">
        Up 10% then down 10% is <em>not</em> flat. <MathInline>{"1.10 \\times 0.90 = 0.99"}</MathInline> — you are
        down 1%. Percentages you can average in your head are lying to you the moment you chain periods together.
      </Callout>

      <H2>Log returns</H2>
      <P>
        The <Strong>log</Strong> (continuously-compounded) return is the natural log of the price ratio:
      </P>
      <Math>{"\\ell_t = \\ln\\!\\left(\\frac{P_t}{P_{t-1}}\\right) = \\ln P_t - \\ln P_{t-1}"}</Math>
      <P>
        For small moves the two are nearly equal — <MathInline>{"\\ln(1+r) \\approx r"}</MathInline> when{" "}
        <MathInline>{"r"}</MathInline> is small — so a 1% day is ~0.00995 in log space. The difference only bites on big
        moves and over long chains. The reason log returns matter is one property:
      </P>
      <H3>Why log returns add</H3>
      <P>
        Because the log of a product is the sum of the logs, the multi-period log return is just the sum of the
        single-period log returns:
      </P>
      <Math>{"\\ell_{0 \\to T} = \\ln\\!\\left(\\frac{P_T}{P_0}\\right) = \\sum_{t=1}^{T} \\ln\\!\\left(\\frac{P_t}{P_{t-1}}\\right) = \\sum_{t=1}^{T} \\ell_t"}</Math>
      <Callout kind="note" title="Derivation — the telescoping product">
        <p>
          Start from the identity that the intermediate prices cancel. Write the terminal price ratio as a product of
          the single-period ratios:
        </p>
        <Math>{"\\frac{P_T}{P_0} = \\frac{P_1}{P_0}\\cdot\\frac{P_2}{P_1}\\cdot\\frac{P_3}{P_2}\\cdots\\frac{P_T}{P_{T-1}} = \\prod_{t=1}^{T}\\frac{P_t}{P_{t-1}}"}</Math>
        <p>
          Every <MathInline>{"P_t"}</MathInline> for <MathInline>{"1 \\le t \\le T-1"}</MathInline> appears once in a
          numerator and once in a denominator, so they cancel — that is the &ldquo;telescope.&rdquo; Now take{" "}
          <MathInline>{"\\ln"}</MathInline> of both sides and use{" "}
          <MathInline>{"\\ln(ab) = \\ln a + \\ln b"}</MathInline>, which turns the product into a sum:
        </p>
        <Math>{"\\ln\\!\\left(\\frac{P_T}{P_0}\\right) = \\ln\\!\\left(\\prod_{t=1}^{T}\\frac{P_t}{P_{t-1}}\\right) = \\sum_{t=1}^{T}\\ln\\!\\left(\\frac{P_t}{P_{t-1}}\\right).\\quad\\blacksquare"}</Math>
      </Callout>
      <P>
        That telescoping is the whole point. Compounding, which is multiplicative in simple returns, becomes plain
        <em>addition</em> in log space. Sums of many terms are exactly what the central limit theorem and every
        variance calculation are built for, so almost all statistics — mean, standard deviation, the Normal
        approximation — are done on log returns, then converted back at the end.
      </P>
      <Table
        head={["Property", "Simple return", "Log return"]}
        rows={[
          ["Aggregate across assets (one period)", "Adds (weighted) — use this", "Does not add cleanly"],
          ["Aggregate across time", "Multiplies", "Adds — use this"],
          ["Symmetric around zero", "No (+10% ≠ −10%)", "Yes"],
          ["Bounded below", "≥ −100%", "Unbounded (−∞ possible)"],
        ]}
      />
      <Callout kind="note" title="The rule of thumb">
        Combine across <em>assets</em> in simple returns; combine across <em>time</em> in log returns. Mixing them up
        is one of the most common silent bugs in a backtest.
      </Callout>

      <H2>Arithmetic vs geometric mean</H2>
      <P>
        Given a series of simple returns, you can summarise them two ways. The <Strong>arithmetic mean</Strong> is the
        plain average:
      </P>
      <Math>{"\\bar{r}_{\\text{arith}} = \\frac{1}{T} \\sum_{t=1}^{T} r_t"}</Math>
      <P>
        The <Strong>geometric mean</Strong> is the constant per-period rate that reproduces the actual ending wealth:
      </P>
      <Math>{"\\bar{r}_{\\text{geom}} = \\left(\\prod_{t=1}^{T} (1 + r_t)\\right)^{1/T} - 1"}</Math>
      <P>
        The geometric mean is what you actually <em>compound at</em>; the arithmetic mean is what you would expect on
        the next single period. They are equal only when every return is identical, and otherwise the geometric mean is
        always smaller. The gap between them is caused by volatility — and that gap has a name.
      </P>
      <H3>Proof: the geometric mean never exceeds the arithmetic mean</H3>
      <P>
        Write the gross returns <MathInline>{"a_t = 1 + r_t > 0"}</MathInline>. The claim{" "}
        <MathInline>{"\\text{GM} \\le \\text{AM}"}</MathInline> is the classical <Strong>AM–GM inequality</Strong>. The
        cleanest one-line argument uses the concavity of the logarithm.
      </P>
      <Callout kind="note" title="Derivation — AM ≥ GM via a concave log">
        <p>
          The function <MathInline>{"\\ln"}</MathInline> is concave (its second derivative{" "}
          <MathInline>{"-1/x^2"}</MathInline> is negative everywhere). Jensen&rsquo;s inequality for a concave function
          says the function of the average is at least the average of the function. Apply it to the{" "}
          <MathInline>{"T"}</MathInline> gross returns, each weighted <MathInline>{"1/T"}</MathInline>:
        </p>
        <Math>{"\\ln\\!\\left(\\underbrace{\\frac{1}{T}\\sum_{t=1}^{T} a_t}_{\\text{AM}}\\right) \\;\\ge\\; \\frac{1}{T}\\sum_{t=1}^{T}\\ln a_t = \\ln\\!\\left(\\underbrace{\\Big(\\textstyle\\prod_{t=1}^{T} a_t\\Big)^{1/T}}_{\\text{GM}}\\right)"}</Math>
        <p>
          Because <MathInline>{"\\ln"}</MathInline> is strictly increasing, we can drop it from both sides without
          flipping the inequality:
        </p>
        <Math>{"\\frac{1}{T}\\sum_{t=1}^{T} a_t \\;\\ge\\; \\left(\\prod_{t=1}^{T} a_t\\right)^{1/T} \\;\\Longleftrightarrow\\; \\text{AM} \\ge \\text{GM}.\\quad\\blacksquare"}</Math>
        <p>
          Equality holds only when all <MathInline>{"a_t"}</MathInline> are equal — i.e. a perfectly flat return
          stream. Any dispersion at all pushes GM strictly below AM.
        </p>
      </Callout>
      <Callout kind="tip" title="Why it matters for trading">
        The arithmetic mean is the number a naive backtest average reports; the geometric mean is the number your
        account actually grows at. Quoting the arithmetic mean of a volatile strategy <em>overstates</em> real
        compounded growth — and the noisier the returns, the bigger the lie. Always judge a strategy by its geometric
        rate (CAGR), never by the average of its periodic returns.
      </Callout>

      <H2>Compounding & CAGR</H2>
      <P>
        Wealth compounds multiplicatively. Starting from <MathInline>{"V_0"}</MathInline>, after{" "}
        <MathInline>{"T"}</MathInline> periods:
      </P>
      <Math>{"V_T = V_0 \\prod_{t=1}^{T} (1 + r_t)"}</Math>
      <P>
        The <Strong>Compound Annual Growth Rate</Strong> collapses that whole path into the single annualised rate that
        would have produced the same ending value (with <MathInline>{"T"}</MathInline> measured in years):
      </P>
      <Math>{"\\text{CAGR} = \\left(\\frac{V_T}{V_0}\\right)^{1/T} - 1"}</Math>
      <P>
        CAGR is a geometric mean by another name, so it is honest about the round-trip: a strategy that doubles then
        halves has a CAGR of 0%, which is exactly right. This is the number{" "}
        <A href="/docs/api/metrics">edgekit.metrics.equity_stats</A> reports as <Code>cagr</Code>.
      </P>
      <Callout kind="tip" title="Scenario: the two-year account that fools you">
        Your account starts at $100,000. Year 1 is great: <MathInline>{"+50\\%"}</MathInline>, taking it to $150,000.
        Year 2 gives some back: <MathInline>{"-30\\%"}</MathInline>, leaving <MathInline>{"150{,}000 \\times 0.70 = \\$105{,}000"}</MathInline>.
        The <em>arithmetic</em> mean of your two annual returns is <MathInline>{"(50\\% - 30\\%)/2 = +10\\%"}</MathInline>{" "}
        — a number a careless report would headline. But your money grew only 5% <em>total</em> over two years, so the
        rate you actually compounded at is <MathInline>{"\\text{CAGR} = (105{,}000/100{,}000)^{1/2} - 1 \\approx 2.47\\%"}</MathInline>.
        The 10% is a fiction; the 2.47% is what is in your account. That gap — 10% down to 2.5% — is what volatility does
        to compounding, and it only widens with wilder swings.
      </Callout>
      <CodeBlock
        filename="cagr.py"
        code={`import numpy as np
from edgekit.metrics import equity_stats

# daily simple returns -> ending wealth and annualised rate
V0, VT = 100_000, 138_400
years = 2.5
cagr = (VT / V0) ** (1 / years) - 1        # -> 0.1357  (13.6%/yr)

es = equity_stats(daily_returns)           # fractional daily returns
print(es["cagr"], es["max_dd_pct"], es["mar"])`}
      />

      <H2>Volatility drag</H2>
      <P>
        Here is the result that trips up newcomers. The rate you compound at is <em>not</em> your average return — it is
        your average return minus a penalty for variance. To a good approximation, the geometric growth rate{" "}
        <MathInline>{"g"}</MathInline> is:
      </P>
      <Math>{"g \\approx \\mu - \\frac{\\sigma^2}{2}"}</Math>
      <P>
        where <MathInline>{"\\mu"}</MathInline> is the arithmetic mean return and{" "}
        <MathInline>{"\\sigma"}</MathInline> its standard deviation (both per period). The term{" "}
        <MathInline>{"\\sigma^2/2"}</MathInline> is <Strong>volatility drag</Strong>: the mathematical cost of
        bouncing around. It falls straight out of the second-order Taylor expansion of{" "}
        <MathInline>{"\\ln(1+r)"}</MathInline> — the same reason the geometric mean sits below the arithmetic one.
      </P>
      <H3>Where the σ²/2 comes from</H3>
      <P>
        The geometric growth rate is the <em>expected log return</em>,{" "}
        <MathInline>{"g = \\mathbb{E}[\\ln(1+r)]"}</MathInline> — the per-period version of the additive log return we
        derived above. Expand the log to second order and take expectations.
      </P>
      <Callout kind="note" title="Derivation — second-order expansion">
        <p>
          Taylor-expand <MathInline>{"\\ln(1+r)"}</MathInline> around <MathInline>{"r = 0"}</MathInline>:
        </p>
        <Math>{"\\ln(1+r) = r - \\frac{r^2}{2} + \\frac{r^3}{3} - \\cdots"}</Math>
        <p>Take the expectation term by term, keeping to second order:</p>
        <Math>{"g = \\mathbb{E}[\\ln(1+r)] \\approx \\mathbb{E}[r] - \\tfrac{1}{2}\\,\\mathbb{E}[r^2]"}</Math>
        <p>
          Now use the variance identity <MathInline>{"\\mathbb{E}[r^2] = \\operatorname{Var}(r) + (\\mathbb{E}[r])^2 = \\sigma^2 + \\mu^2"}</MathInline>:
        </p>
        <Math>{"g \\approx \\mu - \\tfrac{1}{2}\\big(\\sigma^2 + \\mu^2\\big) \\approx \\mu - \\frac{\\sigma^2}{2}"}</Math>
        <p>
          The last step drops <MathInline>{"\\mu^2"}</MathInline>: for a per-period return, <MathInline>{"\\mu"}</MathInline>{" "}
          is small and <MathInline>{"\\mu^2"}</MathInline> is negligible next to the variance{" "}
          <MathInline>{"\\sigma^2"}</MathInline>. What survives is the drag term. <span>&#9632;</span>
        </p>
      </Callout>
      <P>
        There is a second, assumption-free way to see the same inequality: <Strong>Jensen&rsquo;s inequality</Strong>.
        For any concave function <MathInline>{"f"}</MathInline>, <MathInline>{"\\mathbb{E}[f(X)] \\le f(\\mathbb{E}[X])"}</MathInline>. Because{" "}
        <MathInline>{"\\ln"}</MathInline> is concave, applying it with <MathInline>{"X = 1+r"}</MathInline> gives
      </P>
      <Math>{"g = \\mathbb{E}[\\ln(1+r)] \\;\\le\\; \\ln\\big(\\mathbb{E}[1+r]\\big) = \\ln(1+\\mu) \\approx \\mu"}</Math>
      <P>
        so the compounded growth rate can never exceed the arithmetic mean — the drag is exactly the size of that
        Jensen gap, and it is zero only when <MathInline>{"\\sigma = 0"}</MathInline>. This is the same fact as{" "}
        <MathInline>{"\\text{GM} \\le \\text{AM}"}</MathInline> above, now stated in expectation.
      </P>
      <P>
        The intuition: a loss hurts more than the same-size gain helps, because after a loss you compound from a smaller
        base. Down 50% needs a +100% recovery just to break even. Two strategies with the <em>same</em> average return
        but different volatility do not end up in the same place — the wilder one lags, and the gap widens with time.
      </P>
      <Callout kind="tip" title="Scenario: same average, opposite fates">
        Two strategies each average <MathInline>{"+1\\%"}</MathInline> per month <em>arithmetically</em>.{" "}
        <Strong>Steady</Strong> earns exactly <MathInline>{"+1\\%"}</MathInline> every month. <Strong>Wild</Strong>{" "}
        alternates <MathInline>{"+21\\%"}</MathInline> and <MathInline>{"-19\\%"}</MathInline> — same arithmetic mean of{" "}
        <MathInline>{"+1\\%"}</MathInline>. After two months Steady is at <MathInline>{"1.01^2 = 1.0201"}</MathInline> (up
        2.0%), while Wild is at <MathInline>{"1.21 \\times 0.81 = 0.9801"}</MathInline> — <em>down</em> 2.0%, despite the
        identical average. The <MathInline>{"-19\\%"}</MathInline> month compounds off a base already inflated by the{" "}
        <MathInline>{"+21\\%"}</MathInline>, so it bites harder. Wild&rsquo;s per-period variance is about{" "}
        <MathInline>{"\\sigma^2 = 0.20^2 = 0.04"}</MathInline>, so the drag <MathInline>{"\\sigma^2/2 \\approx 2\\%"}</MathInline>{" "}
        per month — exactly the shortfall you see. Same headline return, and one grows while the other bleeds.
      </Callout>
      <ChartFigure
        name="tut/compounding_drag"
        alt="Two equity curves with equal arithmetic mean but different volatility diverging over time"
        caption="Same arithmetic mean return, different volatility. The higher-variance path compounds more slowly — the shaded gap is volatility drag, roughly σ²/2 per period."
      />
      <Callout kind="tip" title="Why this reframes the whole game">
        Volatility drag is why reducing variance is not just about comfort — it directly raises the rate you compound
        at. It is the mathematical justification for position sizing, vol-targeting, and diversification: they are all
        ways to shrink <MathInline>{"\\sigma^2"}</MathInline> and claw back growth. See{" "}
        <A href="/tutorials/position-sizing">Position sizing</A> and{" "}
        <A href="/docs/api/sizing">edgekit.sizing</A>.
      </Callout>

      <H2>Where edgekit measures this</H2>
      <P>
        Two summary builders in <A href="/docs/api/metrics">edgekit.metrics</A> speak these two languages. Trade-level
        analysis lives in R-multiples (return normalised by risk — the subject of{" "}
        <A href="/tutorials/the-math-of-edge">The math of edge</A>); equity-curve analysis lives in returns and
        compounds them into CAGR.
      </P>
      <CodeBlock
        filename="two_lenses.py"
        code={`from edgekit import trade_stats
from edgekit.metrics import equity_stats

# Per-trade lens: expectancy in R, profit factor, MAR
st = trade_stats(trades.r, dates=trades.date)
print(st["ev_r"], st["pf"], st["mar"])

# Equity-curve lens: compounded growth and the drawdown it cost
es = equity_stats(daily_pnl_dollars, account=100_000)
print(es["cagr"], es["max_dd_pct"])`}
      />
      <P>
        Notice <Code>equity_stats</Code> reports <Code>mar</Code> (CAGR divided by max drawdown) alongside{" "}
        <Code>cagr</Code>. That ratio is the honest one: it asks not just how fast you grew, but how much of a
        stomach-churning drawdown you had to survive to get there — the volatility-drag lesson turned into a scorecard.
      </P>

      <P>
        <Strong>Next:</Strong> returns are random, so to reason about them we need the language of chance —{" "}
        <A href="/tutorials/probability-and-distributions">Probability & distributions</A>.
      </P>
    </>
  );
}
