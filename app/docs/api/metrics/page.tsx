import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table, Code } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.metrics" };

export default function MetricsPage() {
  return (
    <>
      <H1>edgekit.metrics</H1>
      <Lead>
        Performance metrics — one honest home for the <Code>stats</Code>/<Code>mets</Code>/<Code>st</Code>{" "}
        builder that appeared ~47 times across the research scripts, each subtly different. Everything
        speaks R-multiples first; dollars arrive only when you pass an account.
      </Lead>

      <P>
        <Strong>What&rsquo;s inside.</Strong> Two entry points do the heavy lifting:{" "}
        <Code>trade_stats</Code> (from an array of per-trade R-multiples) and <Code>equity_stats</Code>{" "}
        (from a daily P&amp;L / return series). The scalar metrics that were re-derived inline
        everywhere — <Code>profit_factor</Code>, <Code>max_drawdown</Code>, <Code>max_drawdown_pct</Code>,{" "}
        <Code>sharpe</Code>, <Code>sortino</Code> — are exposed standalone. And{" "}
        <Code>dd_matched_size</Code> is the one place that turns an R-stream into a dollar-per-R scalar
        against a drawdown budget (the sizing layer delegates to it).
      </P>

      <Callout kind="warn" title="Sharpe understates trend-following">
        Trend-following returns are skewed and autocorrelated, so their annualised Sharpe reads low.
        Never judge a trend edge on Sharpe alone — always report <Code>pf</Code> (profit factor) and{" "}
        <Code>mar</Code> (return / max-drawdown) alongside it. <Code>sharpe</Code> and <Code>sortino</Code>{" "}
        both return <Code>0.0</Code> on degenerate or too-short input rather than blowing up.
      </Callout>

      <H2>Scalar metrics</H2>

      <H3>profit_factor</H3>
      <P>
        Gross win divided by gross loss. The single most robust summary of an edge — it survives
        skew, doesn&rsquo;t assume normality, and is the number you cost-stress against. Returns{" "}
        <Code>inf</Code> when there are no losing trades.
      </P>
      <CodeBlock code={`profit_factor(r) -> float`} />
      <P><Strong>Returns:</Strong> the ratio as a float; <Code>inf</Code> if gross loss is 0.</P>
      <CodeBlock
        code={`from edgekit import profit_factor
profit_factor([2.0, -1.0, -1.0])   # -> 1.0  (2 won / 2 lost)
profit_factor([1.0, 1.0])          # -> inf  (no losers)`}
      />

      <H3>max_drawdown</H3>
      <P>
        Max peak-to-trough drawdown of an equity curve, as a positive number in the curve&rsquo;s own
        units. Pass a cumulative-sum curve for R, or a dollar equity curve for dollars.
      </P>
      <CodeBlock code={`max_drawdown(equity) -> float`} />
      <P>
        <Strong>Returns:</Strong> the largest peak-minus-trough gap (a positive number in the input units).
      </P>
      <CodeBlock
        code={`from edgekit import max_drawdown
import numpy as np
eq = np.array([0, 1, 2, 1, 0, 3])   # cumulative R; peak 2 -> trough 0
max_drawdown(eq)                    # -> 2.0`}
      />

      <H3>max_drawdown_pct</H3>
      <P>Max drawdown expressed as a fraction of the running peak, rather than in raw units.</P>
      <CodeBlock code={`max_drawdown_pct(equity) -> float`} />
      <P><Strong>Returns:</Strong> the worst drawdown as a fraction of its preceding peak.</P>

      <H3>sharpe</H3>
      <P>
        Annualised Sharpe of a per-period return series. Read the caveat above — this understates
        trend-following.
      </P>
      <CodeBlock code={`sharpe(returns, periods_per_year: float = 252.0) -> float`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">returns</Code>, "array-like", "—", "Per-period return series (non-finite values dropped)."],
          [<Code key="b">periods_per_year</Code>, "float", "252.0", "Annualisation factor (252 daily, 365 for calendar-daily crypto)."],
        ]}
      />
      <P><Strong>Returns:</Strong> annualised Sharpe; <Code>0.0</Code> if std is 0 or fewer than 3 points.</P>

      <H3>sortino</H3>
      <P>Annualised Sortino — Sharpe using downside deviation only (penalises loss volatility, not gains).</P>
      <CodeBlock code={`sortino(returns, periods_per_year: float = 252.0) -> float`} />
      <P><Strong>Returns:</Strong> annualised Sortino; <Code>0.0</Code> when there is no downside deviation.</P>

      <H2>Summary builders</H2>

      <H3>trade_stats</H3>
      <P>
        The universal per-trade summary in R-space — the consolidated replacement for the ~47
        copy-pasted stats builders. Feed it per-trade net R; pass <Code>dates</Code> to unlock
        annualised metrics and <Code>hold</Code> to unlock holding-period metrics.
      </P>
      <CodeBlock code={`trade_stats(r, dates=None, hold=None) -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">r</Code>, "array-like", "—", "Per-trade net R-multiples."],
          [<Code key="b">dates</Code>, "array-like | None", "None", "Exit dates — enables annualised R, max DD, Sharpe, frequency."],
          [<Code key="c">hold</Code>, "array-like | None", "None", "Holding period per trade (bars or days) — enables hold stats."],
        ]}
      />
      <P>
        <Strong>Returns (dict keys).</Strong> The set grows with what you pass:
      </P>
      <Ul>
        <Li>
          <Strong>Always:</Strong> <Code>n</Code>, <Code>total_r</Code>, <Code>ev_r</Code>,{" "}
          <Code>win_rate</Code>, <Code>pf</Code>, <Code>avg_win</Code>, <Code>avg_loss</Code>,{" "}
          <Code>best</Code>, <Code>worst</Code>, <Code>win_streak</Code>, <Code>loss_streak</Code>.
        </Li>
        <Li>
          <Strong>When <Code>n == 0</Code>:</Strong> only <Code>n</Code>, <Code>total_r</Code>,{" "}
          <Code>ev_r</Code>, <Code>win_rate</Code>, <Code>pf</Code>.
        </Li>
        <Li>
          <Strong>With <Code>dates</Code>:</Strong> adds <Code>years</Code>, <Code>ann_r</Code>,{" "}
          <Code>max_dd_r</Code>, <Code>mar</Code>, <Code>sharpe</Code>, <Code>worst_day_r</Code>,{" "}
          <Code>trades_per_year</Code>. (The Sharpe here is annualised at 365 — daily R buckets.)
        </Li>
        <Li>
          <Strong>With <Code>hold</Code>:</Strong> adds <Code>avg_hold</Code>, <Code>median_hold</Code>.
        </Li>
      </Ul>
      <CodeBlock
        filename="trade_stats.py"
        code={`from edgekit import trade_stats

st = trade_stats(trades.r, dates=trades.date)
print(st["pf"], st["mar"], st["ann_r"])   # judge the edge on PF and MAR, not Sharpe
print(st["win_rate"], st["ev_r"])          # ev_r is expectancy per trade, in R`}
      />

      <H3>equity_stats</H3>
      <P>
        Summary of a daily P&amp;L (or return) series — the equity-curve counterpart to{" "}
        <Code>trade_stats</Code>. If <Code>account</Code> is given, <Code>daily_pnl</Code> is treated as
        dollars and normalised by it; otherwise it is treated as fractional returns.
      </P>
      <CodeBlock code={`equity_stats(daily_pnl, account: float | None = None, periods_per_year: float = 252.0) -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">daily_pnl</Code>, "array-like", "—", "Daily P&L (dollars if account given) or fractional returns."],
          [<Code key="b">account</Code>, "float | None", "None", "Account size; when set, daily_pnl is dollars and normalised by it."],
          [<Code key="c">periods_per_year</Code>, "float", "252.0", "Annualisation factor for CAGR / Sharpe / Sortino."],
        ]}
      />
      <P>
        <Strong>Returns (all keys):</Strong> <Code>total_return</Code>, <Code>cagr</Code>,{" "}
        <Code>sharpe</Code>, <Code>sortino</Code>, <Code>max_dd_pct</Code>, <Code>mar</Code>,{" "}
        <Code>worst_day</Code>, <Code>best_day</Code>.
      </P>
      <CodeBlock
        filename="equity_stats.py"
        code={`from edgekit.metrics import equity_stats

es = equity_stats(daily_pnl_dollars, account=100_000)
print(es["cagr"], es["max_dd_pct"], es["mar"])`}
      />

      <H3>dd_matched_size</H3>
      <P>
        The dollar-per-R scalar that sizes an R-stream to a drawdown budget — the honest bridge from
        an R backtest to a dollar-risked plan. It sizes so the historical max drawdown equals{" "}
        <Code>dd_budget * account</Code> (e.g. 0.095 for a 10% prop limit with buffer). If{" "}
        <Code>daily_cap</Code> is given (e.g. 0.045 for a 5% daily limit), whichever of the two
        constraints binds tighter wins — the dual-constraint sizing.
      </P>
      <CodeBlock code={`dd_matched_size(daily_r, dd_budget: float, account: float, daily_cap: float | None = None) -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">daily_r</Code>, "array-like", "—", "Daily R-stream (per-day sum of trade R-multiples)."],
          [<Code key="b">dd_budget</Code>, "float", "—", "Max-drawdown budget as a fraction of account (e.g. 0.095)."],
          [<Code key="c">account</Code>, "float", "—", "Account size in dollars."],
          [<Code key="d">daily_cap</Code>, "float | None", "None", "Optional worst-day limit as a fraction of account (e.g. 0.045)."],
        ]}
      />
      <P>
        <Strong>Returns (all keys):</Strong> <Code>dollar_per_r</Code> (the sizing scalar),{" "}
        <Code>binding</Code> (<Code>&quot;max-dd&quot;</Code> or <Code>&quot;daily&quot;</Code> — which
        constraint set the size), and <Code>max_dd_r</Code> (the historical max drawdown in R).
      </P>
      <Callout kind="warn" title="A drawdown-matched size is a ceiling, not a forecast">
        This scalar reproduces the <em>historical</em> worst case exactly — live drawdown will be
        deeper. Treat the sized return as an optimistic ceiling and plan around a haircut. To size
        against a bootstrapped worst case instead of the lucky historical one, feed a{" "}
        <Code>dd95</Code> estimate.
      </Callout>
      <CodeBlock
        filename="dd_matched_size.py"
        code={`from edgekit import dd_matched_size

info = dd_matched_size(daily_r, dd_budget=0.10, account=100_000, daily_cap=0.03)
info["dollar_per_r"]   # dollars to risk per 1R so historical DD == budget
info["binding"]        # "daily" if the worst-day cap bound tighter than max-DD`}
      />

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/sizing">edgekit.sizing</A> — <Code>size_to_dd</Code> wraps <Code>dd_matched_size</Code> and returns the sized dollar series.</Li>
        <Li><A href="/docs/api/costs">edgekit.costs</A> — feed <Code>trade_stats</Code> into <Code>cost_stress</Code>.</Li>
        <Li><A href="/docs/concepts/gauntlet">The validation gauntlet</A> — where these metrics get stress-tested.</Li>
      </Ul>
    </>
  );
}
