import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, A, Strong, Callout, Code } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Performance metrics" };

export default function Page() {
  return (
    <>
      <H1>Performance metrics</H1>
      <Lead>
        Every metric compresses an equity curve into one number, and every compression throws something away. This
        chapter gives the formula for each headline statistic, the assumption it smuggles in, and the exact key it maps
        to in <A href="/docs/api/metrics">ek.metrics</A>. The recurring lesson: no single number is safe to judge an
        edge on — report profit factor and MAR alongside Sharpe, always.
      </Lead>

      <P>
        Think of it like a doctor reading vitals. No single reading tells you whether the patient is healthy — a great
        pulse means nothing if the blood pressure is a disaster. Each metric below is one vital sign of an equity curve,
        and each has a blind spot the others cover. The skill is not memorising formulas; it is knowing which number
        lies about which kind of strategy, so you always read them in a group. To make that concrete, we will carry one
        small, real-looking set of trades through the trade-level metrics and compute them by hand.
      </P>

      <H2>Trade-level metrics</H2>
      <P>
        These summarise a stream of per-trade R-multiples. In edgekit they come from{" "}
        <Code>ek.trade_stats(r, dates=...)</Code>, which returns a dict; the key for each is called out below.
      </P>
      <Callout kind="note" title="The worked trade set">
        Ten closed trades from a trend system, in R:{" "}
        <Code>[−1, −1, +2.4, −1, +0.5, −1, +3.1, −1, −1, +1.6]</Code>. Six losers (all stopped at −1R), four winners.
        We will compute win rate, expectancy, and profit factor on exactly these ten numbers below — the same numbers{" "}
        <Code>ek.trade_stats</Code> would return.
      </Callout>

      <H3>Win rate</H3>
      <P>
        The fraction of trades that made money. Alone it is nearly meaningless — a 90%-win-rate strategy that risks 10
        to make 1 is a slow-motion disaster.
      </P>
      <Math>{"W_{\\text{rate}} = \\frac{\\#\\{r_i > 0\\}}{N}"}</Math>
      <P>
        <Strong>Key:</Strong> <Code>win_rate</Code>. Read it only in the same breath as average win and average loss (
        <Code>avg_win</Code>, <Code>avg_loss</Code>).
      </P>
      <P>
        <Strong>On our set.</Strong> 4 of 10 trades made money, so the win rate is{" "}
        <MathInline>{"4/10 = 0.40"}</MathInline> — a losing-looking 40%. Held up alone it says &quot;this system loses
        more often than it wins&quot; and you might kill it on the spot. That would be a mistake, as expectancy shows
        next: this is a trend system, and trend systems are <em>supposed</em> to win less than half the time.
      </P>

      <H3>Expectancy</H3>
      <P>
        The expected R per trade — the single most important trade-level number. It is the win rate and payoff woven
        together:
      </P>
      <Math>{"E[R] = p\\,W - (1-p)\\,L"}</Math>
      <P>
        where <MathInline>{"p"}</MathInline> is win probability, <MathInline>{"W"}</MathInline> the average win in R, and{" "}
        <MathInline>{"L"}</MathInline> the average loss in R. Positive expectancy is the necessary condition for an edge;
        everything else is about how reliably and how fast it compounds. <Strong>Key:</Strong> <Code>ev_r</Code>.
      </P>
      <P>
        <Strong>On our set.</Strong> The winners average{" "}
        <MathInline>{"W = (2.4 + 0.5 + 3.1 + 1.6)/4 = 1.9"}</MathInline>R and the losers average{" "}
        <MathInline>{"L = 1.0"}</MathInline>R, with <MathInline>{"p = 0.40"}</MathInline>. So{" "}
        <MathInline>{"E[R] = 0.40 \\times 1.9 - 0.60 \\times 1.0 = 0.76 - 0.60 = +0.16"}</MathInline>R per trade.
        (Identical to just averaging all ten: <MathInline>{"1.6/10 = +0.16"}</MathInline>R.) That flips the verdict the
        40% win rate implied: despite losing 60% of the time, the system earns +0.16R every time you pull the trigger,
        because the winners are nearly twice the size of the losers. This is the number that actually decides &quot;is
        there an edge&quot; — and the reason you never kill a strategy on win rate alone.
      </P>

      <H3>Profit factor</H3>
      <P>
        Gross win divided by gross loss — the most robust single summary of an edge. It survives skew, assumes nothing
        about normality, and is the number you cost-stress against.
      </P>
      <Math>{"\\text{PF} = \\frac{\\sum_{r_i > 0} r_i}{\\left|\\sum_{r_i < 0} r_i\\right|}"}</Math>
      <P>
        <MathInline>{"\\text{PF} = 1"}</MathInline> is break-even; below 1 the strategy loses. It returns{" "}
        <MathInline>{"\\infty"}</MathInline> when there are no losing trades. <Strong>Key:</Strong> <Code>pf</Code>{" "}
        (also standalone as <Code>ek.profit_factor</Code>).
      </P>
      <CodeBlock
        code={`from edgekit import profit_factor
profit_factor([2.0, -1.0, -1.0])   # -> 1.0  (2 won / 2 lost)
profit_factor([1.0, 1.0])          # -> inf  (no losers)`}
      />
      <P>
        <Strong>On our set.</Strong> Gross win is <MathInline>{"2.4 + 0.5 + 3.1 + 1.6 = 7.6"}</MathInline>R; gross loss
        is the six −1R stops, <MathInline>{"6.0"}</MathInline>R. So <MathInline>{"\\text{PF} = 7.6/6.0 = 1.27"}</MathInline>.
        Read that as &quot;for every dollar the system loses, it makes 1.27&quot; — a modest but genuine edge. Now the
        three trade-level vitals together tell one coherent story instead of three contradictory ones: win rate 0.40
        (loses often), expectancy +0.16R (but wins bigger), profit factor 1.27 (net positive, net of cost). Any one in
        isolation misleads; the trio does not. And 1.27 is the number you now hand to <A href="/tutorials/the-gauntlet">
        cost stress</A> — if it sinks below 1.0 at 2× spread, the edge was living in the cost assumption.
      </P>

      <H3>The R-multiple distribution</H3>
      <P>
        Before trusting any summary, look at the shape. A histogram of per-trade R exposes what the averages hide: fat
        tails, a cluster of −1R stops, the handful of big winners a trend system lives on. Trend-following R is
        right-skewed — many small losers, few large winners — which is exactly why Sharpe (below) understates it.
      </P>
      <ChartFigure
        name="r_histogram"
        alt="Histogram of per-trade R-multiples with a cluster near −1R and a right tail of winners"
        caption="Per-trade R-multiples. The stop clusters losses near −1R; the right tail is where a trend edge earns its expectancy."
      />

      <H2>Equity-curve metrics</H2>
      <P>
        These summarise a daily P&amp;L or return series. In edgekit they come from{" "}
        <Code>ek.metrics.equity_stats(daily_pnl, account=...)</Code>; the trade summary also surfaces the R-space
        versions when you pass <Code>dates</Code>.
      </P>

      <H3>CAGR</H3>
      <P>
        The compound annual growth rate — the constant yearly rate that would take <MathInline>{"V_0"}</MathInline> to{" "}
        <MathInline>{"V_T"}</MathInline> over <MathInline>{"T"}</MathInline> years:
      </P>
      <Math>{"\\text{CAGR} = \\left(\\frac{V_T}{V_0}\\right)^{1/T} - 1"}</Math>
      <P>
        <Strong>Key:</Strong> <Code>cagr</Code> (from <Code>equity_stats</Code>); the R-space annualised return is{" "}
        <Code>ann_r</Code> (from <Code>trade_stats</Code> with dates).
      </P>

      <H3>Maximum drawdown</H3>
      <P>
        The largest peak-to-trough decline the equity curve ever suffered — the metric that decides whether you can
        actually hold the strategy through its worst stretch:
      </P>
      <Math>{"\\text{MaxDD} = \\max_{t}\\left(\\max_{s \\le t} V_s - V_t\\right)"}</Math>
      <P>
        As a fraction of the running peak it is <Code>max_drawdown_pct</Code>; in raw units,{" "}
        <Code>ek.max_drawdown</Code>. <Strong>Keys:</Strong> <Code>max_dd_pct</Code> (equity) / <Code>max_dd_r</Code>{" "}
        (R-space). The realised historical max drawdown is a <em>lucky</em> number — live will be deeper — which is why
        Part V sizes against a bootstrapped worst case instead.
      </P>
      <ChartFigure
        name="equity_with_drawdown"
        alt="Equity curve with the underwater drawdown series shaded below it"
        caption="An equity curve with its underwater (drawdown) series. Max drawdown is the deepest point of the shaded region."
      />

      <H3>MAR</H3>
      <P>
        Return divided by max drawdown — how much growth you got per unit of pain. It is the most honest one-number
        summary for a skewed, trend-following equity curve, because it says nothing about the shape of the return
        distribution:
      </P>
      <Math>{"\\text{MAR} = \\frac{\\text{CAGR}}{\\text{MaxDD}}"}</Math>
      <P>
        <Strong>Key:</Strong> <Code>mar</Code> (in both <Code>trade_stats</Code> and <Code>equity_stats</Code>).
      </P>

      <H3>Sharpe ratio</H3>
      <P>
        The canonical risk-adjusted return: excess return per unit of return volatility, annualised by{" "}
        <MathInline>{"\\sqrt{N}"}</MathInline>:
      </P>
      <Math>{"\\text{Sharpe} = \\frac{\\mu - r_f}{\\sigma}\\sqrt{N}"}</Math>
      <P>
        where <MathInline>{"\\mu"}</MathInline> and <MathInline>{"\\sigma"}</MathInline> are the mean and standard
        deviation of per-period returns, <MathInline>{"r_f"}</MathInline> the per-period risk-free rate, and{" "}
        <MathInline>{"N"}</MathInline> the periods per year. <Strong>Key:</Strong> <Code>sharpe</Code>.
      </P>
      <Callout kind="warn" title="Sharpe assumes what trend-following violates">
        The <MathInline>{"\\sqrt{N}"}</MathInline> annualisation is exact only if returns are i.i.d. and approximately
        Gaussian. Trend-following returns are <em>neither</em>: they are right-skewed (a few huge winners) and
        autocorrelated (trends persist). Both push the measured <MathInline>{"\\sigma"}</MathInline> up and the Sharpe
        down, so a genuine trend edge reads deceptively low. <Strong>Never judge a trend strategy on Sharpe alone</Strong>{" "}
        — always report <Code>pf</Code> and <Code>mar</Code> beside it. <Code>sharpe</Code> returns <Code>0.0</Code> on
        degenerate or too-short input rather than blowing up.
      </Callout>

      <H3>Sortino ratio</H3>
      <P>
        Sharpe&apos;s asymmetric cousin: it penalises only <em>downside</em> deviation, not the upside volatility that a
        trader is happy to have. It divides excess return by the deviation of returns below a target (usually zero):
      </P>
      <Math>{"\\text{Sortino} = \\frac{\\mu - r_f}{\\sigma_{\\text{down}}}\\sqrt{N}, \\qquad \\sigma_{\\text{down}} = \\sqrt{\\frac{1}{N}\\sum_{r_i < 0} r_i^{\\,2}}"}</Math>
      <P>
        It flatters skewed strategies relative to Sharpe — which is fairer for trend-following, but still no substitute
        for MAR and PF. <Strong>Key:</Strong> <Code>sortino</Code>.
      </P>

      <H2>Putting it together</H2>
      <P>
        The two entry points do all the work. Feed <Code>trade_stats</Code> per-trade R (with <Code>dates</Code> to
        unlock the annualised block), or feed <Code>equity_stats</Code> a daily series (with an <Code>account</Code> to
        get dollars).
      </P>
      <CodeBlock
        filename="metrics.py"
        code={`import edgekit as ek

# trade-level, in R
st = ek.trade_stats(trades.r, dates=trades.date)
print(st["ev_r"], st["pf"], st["win_rate"])       # expectancy, profit factor, win rate
print(st["ann_r"], st["max_dd_r"], st["mar"], st["sharpe"])

# equity-level, in dollars
es = ek.metrics.equity_stats(daily_pnl_dollars, account=100_000)
print(es["cagr"], es["max_dd_pct"], es["mar"], es["sortino"])`}
      />
      <Callout kind="tip" title="Read three numbers, not one">
        Judge an edge on the trio: <Code>ev_r</Code> (is each trade profitable in expectation?), <Code>pf</Code> (how
        robustly, net of cost?), and <Code>mar</Code> (is the growth worth the drawdown?). Sharpe is a useful
        cross-strategy comparator, but it is the one most likely to lie about a real trend edge.
      </Callout>

      <P>
        <Strong>Next:</Strong>{" "}
        <A href="/tutorials/the-gauntlet">The gauntlet</A> — the prove-or-kill pipeline that turns these metrics
        into a verdict.
      </P>
    </>
  );
}
