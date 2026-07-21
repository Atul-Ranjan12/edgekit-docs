import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "API reference" };

export default function ApiOverviewPage() {
  return (
    <>
      <H1>API reference</H1>
      <Lead>
        Every public symbol in <Code>edgekit</Code> v0.1.0, module by module. Signatures, defaults, and return
        shapes are copied faithfully from the source — the pages below are generated against the same ground-truth
        reference the library is tested to.
      </Lead>

      <P>
        edgekit is organised as fourteen submodules that map one-to-one onto the research pipeline:{" "}
        <Strong>load → backtest → prove-or-kill → size → ship.</Strong> Each has a focused job and a small public
        surface. The tables below link to the per-module reference; start with <A href="/docs/api/core">core</A> if
        you want the vocabulary the rest of the library speaks.
      </P>

      <H2>The import convention</H2>
      <P>
        There is exactly one supported way to reach everything: <Code>import edgekit as ek</Code>. The top-level
        package re-exports every submodule plus the handful of symbols you touch constantly, so you rarely write a
        deep import.
      </P>
      <CodeBlock
        filename="convention.py"
        code={`import edgekit as ek

# submodules hang off the package
bars   = ek.data.load_bars("US100_M1.csv")
rth    = bars[ek.data.rth_mask(bars.index)]
trades = ek.strategy.ORB(or_bars=30, target_r=2.0).backtest(rth, warmup=5, bars_per_day=390)

# hot symbols are re-exported at the top level
st = ek.trade_stats(trades.r, dates=trades.date)   # == ek.metrics.trade_stats
p  = ek.validation.mcpt(real_stat, null_fn, n=1000)`}
      />
      <P>
        The convenience re-exports available as <Code>edgekit.&lt;name&gt;</Code> are: the submodules{" "}
        <Code>challenge, core, costs, data, engine, indicators, metrics, ml, portfolio, report, sizing, strategy,
        validation, viz</Code>; and the symbols <Code>OHLC, Signal, Trade, as_ohlc, lag, trades_to_frame,
        EntryIntent, run_bar_loop, run_backtest, CostModel, cost_stress, trade_stats, equity_stats, max_drawdown,
        profit_factor, sharpe, sortino, dd_matched_size</Code>.
      </P>

      <Callout kind="tip" title="Lean core, lazy heavy deps">
        <Code>import edgekit</Code> needs only <Strong>numpy + pandas</Strong>. The heavy dependencies are optional
        extras, imported lazily <em>inside</em> the functions that use them, so importing the package never pays for
        a chart library you did not call: <Code>[viz]</Code> (matplotlib), <Code>[ml]</Code>{" "}
        (scikit-learn / xgboost / lightgbm), <Code>[io]</Code> (pyarrow). A missing extra raises a clear{" "}
        <Code>pip install edgekit[...]</Code> pointer, not an obscure <Code>ImportError</Code> at the top of a run.
      </Callout>

      <H2>The fourteen modules</H2>
      <Table
        head={["Module", "What it does"]}
        rows={[
          [<A key="core" href="/docs/api/core"><Code>core</Code></A>, "R-multiple + OHLC contract, the causal lag() primitive, Signal/Trade dataclasses, seeded RNG"],
          [<A key="data" href="/docs/api/data"><Code>data</Code></A>, "Load / fetch / resample bars, DST-correct sessions, integrity report, chronological split, parquet cache"],
          [<A key="ind" href="/docs/api/indicators"><Code>indicators</Code></A>, "Vectorised, unlagged indicators: atr, adx, donchian, rsi, hawkes, rolling hedge, half-life, cross-sectional rank"],
          [<A key="eng" href="/docs/api/engine"><Code>engine</Code></A>, "Two causal backtest engines: run_bar_loop (research) + run_backtest (fixed-RR prop-firm) and the Strategy protocol"],
          [<A key="cost" href="/docs/api/costs"><Code>costs</Code></A>, "Transaction-cost models (fraction-of-price & pips) and the cost_stress harness"],
          [<A key="met" href="/docs/api/metrics"><Code>metrics</Code></A>, "trade_stats / equity_stats / dd_matched_size, plus profit_factor, drawdown, sharpe, sortino"],
          [<A key="siz" href="/docs/api/sizing"><Code>sizing</Code></A>, "risk_parity, hrp, vol_target, size_to_dd, cppi, dd_throttle — R-streams to a dollar equity path"],
          [<A key="val" href="/docs/api/validation"><Code>validation</Code></A>, "The gauntlet: permutation MCPT, PBO, deflated Sharpe, walk-forward, is-it-beta, block-bootstrap DD"],
          [<A key="strat" href="/docs/api/strategy"><Code>strategy</Code></A>, "The strategy zoo: ORB, Keltner, RSI2MeanReversion, StatArbPairs, Hawkes"],
          [<A key="port" href="/docs/api/portfolio"><Code>portfolio</Code></A>, "Combine validated books into one daily-R stream, correlation, allocation sweep"],
          [<A key="chal" href="/docs/api/challenge"><Code>challenge</Code></A>, "Monte-Carlo prop-firm simulator: pass-rate + days-to-pass for FTMO / CFT / BrightFunded"],
          [<A key="viz" href="/docs/api/viz"><Code>viz</Code></A>, "matplotlib chart vocabulary + themes, base64-inlined"],
          [<A key="rep" href="/docs/api/report"><Code>report</Code></A>, "Self-contained, zero-network HTML reports"],
          [<A key="ml" href="/docs/api/ml"><Code>ml</Code></A>, "Triple-barrier labels, purged/embargoed walk-forward, meta-labeling, cloud-safe tree export"],
        ]}
      />

      <H2>Dependency layering</H2>
      <P>
        The modules form a strict layering — later layers import earlier ones, never the reverse. Reading in this
        order is also the fastest way to understand the library:
      </P>
      <Ul>
        <Li><Strong>Foundation.</Strong> <A href="/docs/api/core">core</A> defines the contracts; <A href="/docs/api/data">data</A>, <A href="/docs/api/indicators">indicators</A>, and <A href="/docs/api/costs">costs</A> all build on it and on nothing else in edgekit.</Li>
        <Li><Strong>Execution.</Strong> <A href="/docs/api/engine">engine</A> consumes core + costs to run a strategy causally; <A href="/docs/api/strategy">strategy</A> implements the interface the engine polls.</Li>
        <Li><Strong>Measurement.</Strong> <A href="/docs/api/metrics">metrics</A> summarises trade/equity streams; <A href="/docs/api/validation">validation</A> tries to break them.</Li>
        <Li><Strong>Deployment.</Strong> <A href="/docs/api/sizing">sizing</A> and <A href="/docs/api/portfolio">portfolio</A> turn R-streams into dollars; <A href="/docs/api/challenge">challenge</A> stress-tests the sized path; <A href="/docs/api/viz">viz</A> and <A href="/docs/api/report">report</A> present it.</Li>
      </Ul>

      <Callout kind="note" title="Prime directive">
        The API surface exists to serve one goal: <em>assume every edge is fake until proven otherwise.</em> The
        modules you will spend most of your time in are <A href="/docs/api/validation">validation</A> and{" "}
        <A href="/docs/api/costs">costs</A> — the ones whose job is to disprove your backtest before the market does.
      </Callout>

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/quickstart">Quickstart</A> — your first validated backtest end to end.</Li>
        <Li><A href="/docs/concepts/gauntlet">The validation gauntlet</A> — the reasoning behind the validation module.</Li>
        <Li><A href="/docs/api/core">edgekit.core</A> — start here for the shared vocabulary.</Li>
      </Ul>
    </>
  );
}
