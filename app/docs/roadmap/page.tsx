import type { Metadata } from "next";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Code } from "@/components/prose";

export const metadata: Metadata = { title: "Roadmap" };

export default function RoadmapPage() {
  return (
    <>
      <H1>Roadmap</H1>
      <Lead>
        Where edgekit is headed. These are proposed directions grouped by theme — a place to see what the library
        could become and to steer it. Nothing here is a promise of a ship date.
      </Lead>

      <Callout kind="note" title="Status">
        Items below are <Strong>proposed</Strong>, not implemented, unless a page in the API reference already documents
        them. The <A href="/docs/api/viz">viz</A> / <A href="/docs/api/report">report</A> expansion (tear sheets, the
        gauntlet charts, rolling metrics, and more) has <em>already landed</em> — see those pages.
      </Callout>

      <H2>Performance</H2>
      <Ul>
        <Li><Strong>Vectorised / JIT engine.</Strong> The bar loop is a readable Python state machine. A Numba or Polars back end (behind the same <A href="/docs/api/engine">engine</A> interface) would make multi-year, multi-asset sweeps and large permutation runs an order of magnitude faster.</Li>
        <Li><Strong>Parallel gauntlet.</Strong> Permutation, walk-forward re-optimisation, and parameter sweeps are embarrassingly parallel — a process-pool executor would cut wall-clock on the expensive validation steps.</Li>
        <Li><Strong>Incremental / streaming backtests.</Strong> A bar-at-a-time API so the same strategy code drives both the backtest and a live loop.</Li>
      </Ul>

      <H2>Breadth — strategies & data</H2>
      <Ul>
        <Li><Strong>More reference strategies.</Strong> Flesh out the vectorised sleeves (residual momentum, cross-sectional momentum) to first-class bar-loop citizens with tests.</Li>
        <Li><Strong>A regime layer.</Strong> HMM / change-point (BOCPD) regime detection as reusable overlays that any strategy can gate on — surfaced through <A href="/docs/api/validation">validation</A> as a regime split.</Li>
        <Li><Strong>Unified data connectors.</Strong> One <A href="/docs/api/data">data</A> fetch interface across venues (beyond Binance klines), plus futures roll / continuous-contract stitching and corporate-action handling for equities.</Li>
        <Li><Strong>Alternative bar types.</Strong> Volume, dollar, and imbalance bars (López de Prado) alongside time bars.</Li>
      </Ul>

      <H2>Live & deployment</H2>
      <Ul>
        <Li><Strong>Execution adapters.</Strong> A thin bridge from a validated strategy to a live/paper venue (cTrader, CCXT), reusing the same <Code>prepare/entry/exit</Code> code that ran in the backtest.</Li>
        <Li><Strong>Broaden the cloud export.</Strong> The <A href="/docs/api/ml">tree export</A> already emits pure-Python and C# inference; add ONNX and a signed parity artifact so a live deployment can self-check against its backtest.</Li>
        <Li><Strong>Paper-trading harness.</Strong> A scheduled loop that runs the live strategy against a feed and logs fills for reconciliation against the backtest.</Li>
      </Ul>

      <H2>Rigor</H2>
      <Ul>
        <Li><Strong>Campaign-level multiple-testing control.</Strong> Track every trial across a research campaign and apply a family-wise / deflated-Sharpe correction automatically — the honest counter to p-hacking.</Li>
        <Li><Strong>More bootstraps.</Strong> Stationary and circular block bootstraps alongside the fixed-block one, plus a path-dependent risk-of-ruin estimate.</Li>
        <Li><Strong>Property-test the whole engine.</Strong> Extend the causality property tests to every strategy and every sizing overlay, and pin regression baselines for each.</Li>
      </Ul>

      <H2>Visualisation & reporting</H2>
      <P>
        The chart vocabulary and the one-call <Code>tear_sheet</Code> shipped recently (<A href="/docs/api/viz">viz</A>,{" "}
        <A href="/docs/api/report">report</A>). Proposed next:
      </P>
      <Ul>
        <Li><Strong>Interactive tear sheets.</Strong> An optional Plotly/Bokeh back end for zoomable equity/drawdown, kept behind the same builder so the matplotlib path stays the dependency-light default.</Li>
        <Li><Strong>Comparison reports.</Strong> Side-by-side tear sheets for A/B strategy or in-sample vs out-of-sample panels.</Li>
        <Li><Strong>Live dashboards.</Strong> A small served view of an in-flight paper/live strategy reusing the report charts.</Li>
      </Ul>

      <H2>Developer experience</H2>
      <Ul>
        <Li><Strong>A CLI.</Strong> <Code>edgekit backtest</Code>, <Code>edgekit gauntlet</Code>, <Code>edgekit report</Code> over a config file for reproducible, no-boilerplate runs.</Li>
        <Li><Strong>Config-driven experiments.</Strong> Declare a study in YAML (data, strategy, params, gauntlet) → a reproducible run with a hashed artifact.</Li>
        <Li><Strong>Typed & published.</Strong> Ship <Code>py.typed</Code>, auto-generate the API reference from docstrings, and publish to a private index so <Code>pip install edgekit</Code> works without the editable checkout.</Li>
      </Ul>

      <Callout kind="tip" title="Want one of these?">
        The list is a menu, not a queue. If a particular item unblocks your work, it can jump the line — the ones that
        touch code you already use (reporting, execution, data connectors) are usually the highest-leverage.
      </Callout>
    </>
  );
}
