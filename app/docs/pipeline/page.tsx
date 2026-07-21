import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Code } from "@/components/prose";

export const metadata: Metadata = { title: "The pipeline" };

export default function PipelinePage() {
  return (
    <>
      <H1>The pipeline</H1>
      <Lead>
        edgekit implements one opinionated path from raw bars to a live strategy:{" "}
        <Strong>load → backtest → prove → size → ship.</Strong> The stages are ordered on purpose — each
        one is a gate, and skipping ahead is how fake edges reach production.
      </Lead>

      <P>
        The whole library is designed to read like this pipeline. Below, each stage explains what happens,
        which modules do it, and why it sits where it does. The governing rule: <em>you do not size or
        ship a strategy until it is proven.</em> Sizing an unproven backtest just risks real money on
        noise; a polished report of a lucky result is a liability, not an asset.
      </P>

      <H2>Load</H2>
      <P>
        The <A href="/docs/api/data"><Code>data</Code></A> module owns everything before a signal exists:
        loading bars, resampling to the strategy timeframe, marking DST-correct sessions, and splitting
        chronologically. <Code>data.load_bars</Code> reads a HistoryExporter CSV or parquet split into the
        OHLC contract — a tz-naive UTC <Code>DatetimeIndex</Code> with float{" "}
        <Code>open/high/low/close</Code>, sorted and de-duplicated. <Code>data.resample_ohlcv</Code>{" "}
        downsamples to a coarser timeframe using the causal <Code>label="left"</Code> /{" "}
        <Code>closed="left"</Code> convention: each bar carries its <em>open</em> timestamp, so a strategy
        acting at that timestamp only sees bars that have closed.
      </P>

      <CodeBlock
        code={`import edgekit as ek

bars = ek.data.load_bars("US100_M1.csv")               # OHLC contract, UTC index
rth  = bars[ek.data.rth_mask(bars.index)]              # -> keep the RTH cash session

# know what the data actually is before you trust it
rep = ek.data.integrity_report(bars, bar_minutes=1)
print(rep["intraweek_gaps"], rep["weekend_gaps"])`}
      />

      <P>
        <Strong>Why first.</Strong> Everything downstream inherits the data&rsquo;s flaws. A gap, a
        duplicated timestamp, or a look-ahead-inducing resample convention silently poisons the backtest —
        so the contract is enforced at the door with <Code>data.integrity_report</Code> and the sealed
        chronological holdout (<Code>data.chronological_split</Code>) available for later out-of-sample
        work.
      </P>

      <H2>Backtest</H2>
      <P>
        A <A href="/docs/api/strategy"><Code>strategy</Code></A> emits trades priced in{" "}
        <A href="/docs/concepts/r-multiples">R-multiples</A> — profit measured in units of a trade&rsquo;s
        own initial risk. The <A href="/docs/api"><Code>engine</Code></A> runs the strategy bar-by-bar
        (<Code>run_bar_loop</Code>) with gap-aware fills and pessimistic stops, charging{" "}
        <A href="/docs/api"><Code>costs</Code></A> in R via <Code>CostModel</Code>. Indicators from{" "}
        <A href="/docs/api"><Code>indicators</Code></A> are returned <em>unlagged</em>; the strategy lags
        them explicitly with <Code>core.lag</Code>, keeping the causality decision visible and testable.
        The <A href="/docs/api/metrics"><Code>metrics</Code></A> module then summarises the trade R-stream
        with <Code>trade_stats</Code>.
      </P>

      <CodeBlock
        code={`strat  = ek.strategy.ORB(or_bars=30, target_r=2.0)
trades = strat.backtest(rth, warmup=5, bars_per_day=390)   # canonical trade frame, r = net R
stats  = ek.trade_stats(trades.r.to_numpy(), dates=trades.date)
print(stats["pf"], stats["ev_r"])                          # PF 0.71 | EV -0.214R`}
      />

      <Callout kind="warn" title="Causality is a tested property, not a hope">
        R is charged net of cost, stops fill at the worse of stop/open, and indicators are lagged at the
        call site. Property tests perturb <em>future</em> bars and assert the past does not move. A good
        backtest number here is the start of skepticism — the whole reason the next stage exists.
      </Callout>

      <H2>Prove</H2>
      <P>
        This is the crown jewel and the reason edgekit exists. The{" "}
        <A href="/docs/api/validation"><Code>validation</Code></A> gauntlet tries to break your result
        before the market does. The decisive step is the Monte-Carlo permutation test:{" "}
        <Code>validation.permute_ohlc</Code> destroys serial structure (trends, autocorrelation) while
        preserving bar shapes and the return marginal, you re-run the <em>same</em> strategy on each
        permuted series, and <Code>validation.mcpt</Code> returns a p-value. <Code>p &lt; 0.01</Code> is a
        real edge; a no-edge strategy yields <Code>p ~ U(0,1)</Code>.
      </P>

      <CodeBlock
        code={`import pandas as pd
o, h, l, c = (rth[x].to_numpy(float) for x in ("open", "high", "low", "close"))

def null_stat(rng):
    po, ph, pl, pc = ek.validation.permute_ohlc(o, h, l, c, rng)
    shuffled = pd.DataFrame({"open": po, "high": ph, "low": pl, "close": pc}, index=rth.index)
    return float(strat.backtest(shuffled, warmup=5, bars_per_day=390).r.sum())

p = ek.validation.mcpt(float(trades.r.sum()), null_stat, n=1000)   # low p (timing != noise)`}
      />

      <P>
        The permutation test is one gate of several. Run the rest of the gauntlet in order and stop
        believing at the first failure: walk-forward across blocks (<Code>validation.walk_forward</Code>),
        regime splits (<Code>validation.regime_by_year</Code> / <Code>regime_by_adx</Code>), cost-stress
        ×1/2/3 (<Code>costs.cost_stress</Code> — the ORB collapses to PF 0.29 at 3× cost, and never clears 1
        even at nominal cost), an is-it-alpha-or-beta regression (<Code>validation.is_it_beta</Code>), and a
        parameter-plateau check (<Code>validation.param_sweep</Code>).
      </P>

      <Callout kind="danger" title="This is the gate">
        Prove sits between backtest and size for a hard reason: <Strong>an unproven edge must never be
        sized or shipped.</Strong> If the permutation p-value is not below 0.01, or any gauntlet stage
        fails, the strategy is dead — there is nothing downstream to do. Most apparent alpha is fake, and
        this stage is where you find out cheaply, on paper, instead of expensively, live.
      </Callout>

      <H2>Size</H2>
      <P>
        Only now do dollars enter, exactly once. The <A href="/docs/api/sizing"><Code>sizing</Code></A>{" "}
        module turns the proven R-stream into a dollar-risked equity path.{" "}
        <Code>sizing.size_to_dd</Code> finds the dollars-per-R scalar that makes historical max drawdown
        equal a hard budget (e.g. 0.095 of the account for a 10% prop limit with buffer), honouring a
        daily-loss cap when it binds tighter. For multiple books, <A href="/docs/api"><Code>portfolio</Code></A>{" "}
        combines their daily-R streams (risk-parity by default), and the governors{" "}
        <Code>vol_target</Code>, <Code>cppi</Code> and <Code>dd_throttle</Code> ride on top.
      </P>

      <CodeBlock
        code={`daily_r = trades.set_index("date").r.groupby(lambda t: t.normalize()).sum()
sz = ek.sizing.size_to_dd(daily_r, dd_budget=0.095, account=100_000, daily_cap=0.045)
print(sz["binding"], sz["dollar_per_r"])   # which limit binds, and $/R (only run this on a survivor)`}
      />

      <Callout kind="warn" title="Size against the honest drawdown">
        The realised historical drawdown is optimistic. <Code>validation.dd95</Code> gives the
        95th-percentile drawdown from a block-bootstrap — the number to size against. And the sized return
        is a <em>ceiling</em>: haircut it ×0.85 for edge decay before you treat it as a forward estimate.
      </Callout>

      <H2>Ship</H2>
      <P>
        The last stage packages the proven, sized strategy for a decision.{" "}
        <A href="/docs/api"><Code>challenge</Code></A> answers the prop-firm question honestly — a
        challenge is a path problem, not an average-return problem, so <Code>challenge.simulate</Code>{" "}
        block-bootstraps the sized daily-P&amp;L through the firm&rsquo;s rules (FTMO / CFT / BrightFunded)
        and returns a Monte-Carlo pass rate. <A href="/docs/api/report"><Code>report</Code></A> and{" "}
        <A href="/docs/api"><Code>viz</Code></A> then emit self-contained HTML — CSS and every chart
        inlined as base64, zero external requests — including the linked Challenge / Live / Realistic trio
        that never hides the haircut.
      </P>

      <CodeBlock
        code={`rate = ek.challenge.simulate(sz["sized"], ek.challenge.FTMO_1STEP)   # MC pass rate

# for a survivor only -- the ORB above never reaches this stage
(ek.report.Report("shipped strategy", meta="sized to a 10%-max / 5%-daily budget")
    .kpi_row([("Perm p", f"{p:.3f}", "cleared the gauntlet"),
              ("Pass",   f"{rate:.0%}", "FTMO 1-step"),
              ("$/R",    f"{sz['dollar_per_r']:,.0f}", f"binds {sz['binding']}")])
    .caveat("Backtest ceiling; haircut x0.85 for a forward estimate.")
    .write("report.html"))`}
      />

      <P>
        <Strong>Why last.</Strong> Shipping is the only stage that touches the outside world — a live bot,
        a prop challenge, a report someone acts on. It is deliberately downstream of proof and sizing so
        that the only thing that ever gets shipped is an edge that survived the gauntlet and was sized to
        a real drawdown budget.
      </P>

      <H2>Where to go next</H2>
      <Ul>
        <Li><A href="/docs/concepts/gauntlet">The validation gauntlet</A> — the full prove stage: permutation, walk-forward, PBO, deflated Sharpe, is-it-beta.</Li>
        <Li><A href="/docs/guides/first-backtest">Guide: your first backtest</A> — run this pipeline end-to-end on your own data.</Li>
        <Li><A href="/docs/quickstart">Quickstart</A> — the same five stages as a single copy-paste script with real numbers.</Li>
        <Li><A href="/docs/api">API reference</A> — every module and public function.</Li>
      </Ul>
    </>
  );
}
