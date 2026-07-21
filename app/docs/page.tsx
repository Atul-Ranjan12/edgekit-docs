import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "Introduction" };

export default function IntroPage() {
  return (
    <>
      <H1>Introduction</H1>
      <Lead>
        edgekit is a systematic-trading research toolkit. It takes a trading idea from raw OHLC bars to a
        validated, sized, deployable strategy — and it is built around one uncomfortable assumption:{" "}
        <Strong>most apparent alpha is fake.</Strong>
      </Lead>

      <P>
        Most backtests are wrong before they are interesting. The number is inflated by look-ahead bias, or it is
        market beta wearing a strategy costume, or it is a pattern mined from noise. edgekit treats a good backtest as
        the <em>start</em> of skepticism, not the end — the library exists to try to break your own result before the
        market does.
      </P>

      <Callout kind="note" title="Prime directive">
        Assume every edge is fake until proven otherwise. Your job is to <em>disprove</em> your own strategy. What
        survives the gauntlet is real.
      </Callout>

      <H2>What it gives you</H2>
      <Ul>
        <Li><Strong>A causal engine.</Strong> Gap-aware fills, pessimistic stops, cost charged in R. Look-ahead is a tested property, not a hope.</Li>
        <Li><Strong>The validation gauntlet.</Strong> Monte-Carlo permutation, purged walk-forward, PBO, deflated Sharpe, cost-stress, and an is-it-beta regression — the difference between a real edge and a lucky one.</Li>
        <Li><Strong>Position sizing & portfolio construction.</Strong> Risk-parity, HRP, vol-targeting, CPPI, drawdown-throttle, sized to a prop-firm drawdown budget.</Li>
        <Li><Strong>Prop-firm tooling.</Strong> Monte-Carlo pass-rate and days-to-pass for FTMO, CryptoFundTrader and BrightFunded evaluations.</Li>
        <Li><Strong>An ML layer.</Strong> Triple-barrier labels, purged/embargoed walk-forward, meta-labeling, and a cloud-safe tree export that matches scikit-learn within 1e-6 at runtime.</Li>
        <Li><Strong>Reporting.</Strong> Self-contained HTML reports and matplotlib charts, base64-inlined, zero external requests.</Li>
      </Ul>

      <H2>Thirty seconds of edgekit</H2>
      <P>The whole library is designed to read like the pipeline it implements:</P>
      <CodeBlock
        filename="pipeline.py"
        code={`import edgekit as ek

# 1. load + keep the Nasdaq regular cash session (09:30-16:00 New York)
bars = ek.data.load_bars("US100_M1.csv")
rth  = bars[ek.data.rth_mask(bars.index, start="09:30", end="16:00", tz="America/New_York")]

# 2. causal backtest — trades priced in R
trades = ek.strategy.ORB(or_bars=30, target_r=2.0).backtest(rth, warmup=5, bars_per_day=390)
stats  = ek.trade_stats(trades.r, dates=trades.date)   # 2,666 trades | PF 0.71 | EV -0.214R

# 3. PROVE it — the gauntlet's job is to REJECT. This one is net-negative:
p = ek.validation.mcpt(trades.r.sum(), null_stat, n=1000)   # entry timing beats random...
#   ...but PF 0.71 after costs (0.71 / 0.45 / 0.29 at 1x/2x/3x) — dead. Stop here.

# 4. only a survivor gets sized to a 10%-max / 5%-daily drawdown budget
sized = ek.sizing.size_to_dd(daily_r, dd_budget=0.095, account=100_000, daily_cap=0.045)

# 5. ...and shipped: prop-firm pass-rate sim + a self-contained HTML report
rate = ek.challenge.simulate(daily_pnl, ek.challenge.FTMO_1STEP)
ek.report.Report("ORB - rejected").kpi_row(cards).write("orb.html")`}
      />

      <H2>Why it exists</H2>
      <P>
        edgekit is extracted from a large quant-research repo where a good core coexisted with ~280 standalone scripts
        that inlined the same machinery over and over. The same Hawkes indicator was pasted 52 times; the trade-stats
        builder ~47 times; the permutation test ~60 times. edgekit is that machinery consolidated into one installable,
        tested package — so a fix or an improvement happens once, with a test guarding it.
      </P>

      <Table
        head={["Was pasted", "Times", "Now lives in"]}
        rows={[
          [<code key="1">hawkes()</code>, "52", <code key="2">indicators</code>],
          ["trade-stats builder", "~47", <code key="3">metrics</code>],
          ["permutation test", "~60", <code key="4">validation</code>],
          ["report scaffold + CSS", "87", <code key="5">viz / report</code>],
        ]}
      />

      <H2>What to read next</H2>
      <Ul>
        <Li><A href="/docs/installation">Installation</A> — install with the extras you need.</Li>
        <Li><A href="/docs/quickstart">Quickstart</A> — your first validated backtest in ten minutes.</Li>
        <Li><A href="/docs/concepts/gauntlet">The validation gauntlet</A> — the heart of the library.</Li>
        <Li><A href="/docs/api">API reference</A> — every public function, module by module.</Li>
      </Ul>

      <Callout kind="tip" title="A note on honesty">
        edgekit never hides the haircut. A drawdown-matched backtest is a <em>ceiling</em>, not an expectation — the docs
        and the tooling consistently push you toward the number you can actually trade, not the one that looks best.
      </Callout>
    </>
  );
}
