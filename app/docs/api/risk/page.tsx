import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { ChartFigure } from "@/components/ChartFigure";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.risk" };

export default function RiskPage() {
  return (
    <>
      <H1>edgekit.risk</H1>
      <Lead>
        Value-at-Risk &amp; tail risk — how bad a normal-ish bad day looks (VaR), how bad the days
        beyond it look (CVaR / expected shortfall), and the drawdown-shape diagnostics that a single
        loss number misses. Three VaR methods, two ES methods, and the ulcer / tail-ratio pair.
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> <Code>value_at_risk</Code> and{" "}
        <Code>expected_shortfall</Code> are the two headline estimators (with <Code>cvar</Code> as an
        alias for the latter); <Code>var_cvar</Code> returns both in one call. Below the quantile,{" "}
        <Code>drawdown_series</Code> reconstructs the full underwater curve, <Code>ulcer_index</Code>{" "}
        summarises its depth-and-duration pain, and <Code>tail_ratio</Code> compares the right tail to
        the left.
      </P>

      <Callout kind="warn" title="Sign convention: VaR and CVaR are positive loss numbers">
        <P>
          Both are reported as <Strong>positive magnitudes of loss</Strong> — a 5% VaR of <Code>0.021</Code>{" "}
          means &ldquo;on the worst 5% of days you lose about 2.1%&rdquo;, not <Code>-0.021</Code>. Because
          CVaR averages the losses <em>beyond</em> the VaR threshold, it is always at least as large:{" "}
          <Code>cvar &gt;= var</Code>. If either comes back negative, your input is a gain at that
          quantile.
        </P>
      </Callout>

      <H2>Value-at-Risk &amp; expected shortfall</H2>

      <H3>value_at_risk</H3>
      <P>
        The loss you should not exceed on all but the worst <Code>alpha</Code> fraction of periods —
        the standard one-number risk budget. Three methods trade off distributional assumptions:{" "}
        <Code>historical</Code> (empirical quantile, no assumption), <Code>gaussian</Code> (normal
        closed form), and <Code>cornish_fisher</Code> (normal adjusted for skew and kurtosis — better
        for fat tails).
      </P>
      <CodeBlock code={`value_at_risk(returns, alpha=0.05, method="historical") -> float`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">returns</Code>, "array-like", "—", "Per-period return series."],
          [<Code key="b">alpha</Code>, "float", "0.05", "Tail probability (0.05 = 95% VaR)."],
          [<Code key="c">method</Code>, "str", '"historical"', '"historical", "gaussian", or "cornish_fisher".'],
        ]}
      />
      <P><Strong>Returns:</Strong> a <Code>float</Code> — the VaR as a positive loss fraction.</P>
      <CodeBlock code={`import edgekit as ek
ek.risk.value_at_risk(rets, alpha=0.05)                      # historical 95% VaR
ek.risk.value_at_risk(rets, alpha=0.01, method="cornish_fisher")  # fat-tail-aware 99%`} />

      <H3>expected_shortfall</H3>
      <P>
        Expected shortfall (a.k.a. CVaR) — the <em>average</em> loss on the days worse than the VaR
        threshold. Answers the question VaR ducks: &ldquo;when it does break, how bad is it?&rdquo;. Two
        methods: <Code>historical</Code> and <Code>gaussian</Code>. <Code>cvar</Code> is an exported
        alias for this function.
      </P>
      <CodeBlock code={`expected_shortfall(returns, alpha=0.05, method="historical") -> float
cvar(returns, alpha=0.05, method="historical") -> float   # alias`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">returns</Code>, "array-like", "—", "Per-period return series."],
          [<Code key="b">alpha</Code>, "float", "0.05", "Tail probability."],
          [<Code key="c">method</Code>, "str", '"historical"', '"historical" or "gaussian".'],
        ]}
      />
      <P><Strong>Returns:</Strong> a <Code>float</Code> — the average tail loss as a positive fraction (always <Code>&gt;= value_at_risk</Code>).</P>
      <CodeBlock code={`ek.risk.expected_shortfall(rets, alpha=0.05)
ek.risk.cvar(rets, alpha=0.05)   # same thing`} />

      <H3>var_cvar</H3>
      <P>
        Both risk numbers in a single call, sharing the same <Code>method</Code> and <Code>alpha</Code>{" "}
        — the convenience form when you report them together (which you should).
      </P>
      <CodeBlock code={`var_cvar(returns, alpha=0.05, method="historical") -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">returns</Code>, "array-like", "—", "Per-period return series."],
          [<Code key="b">alpha</Code>, "float", "0.05", "Tail probability."],
          [<Code key="c">method</Code>, "str", '"historical"', 'VaR method ("historical" / "gaussian" / "cornish_fisher"; ES falls back to "gaussian" for cornish_fisher).'],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a <Code>dict</Code> with keys <Code>&quot;var&quot;</Code> and{" "}
        <Code>&quot;cvar&quot;</Code>, both positive loss numbers with <Code>cvar &gt;= var</Code>.
      </P>
      <CodeBlock code={`r = ek.risk.var_cvar(rets, alpha=0.05)
r["var"], r["cvar"]`} />
      <ChartFigure
        name="var_cvar"
        alt="var_cvar chart"
        caption="The return distribution with the VaR quantile and CVaR tail-average marked."
      />

      <H2>Drawdown shape</H2>

      <H3>drawdown_series</H3>
      <P>
        The full underwater curve — the fractional distance below the running peak at every point.
        Where <Code>max_drawdown</Code> gives you the single worst gap, this gives you the whole shape:
        how often, how deep, and how long you were underwater.
      </P>
      <CodeBlock code={`drawdown_series(equity) -> np.ndarray`} />
      <Ul>
        <Li><Code>equity</Code> — a cumulative equity / wealth curve.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of drawdowns (<Code>0</Code> at new highs, negative or positive-magnitude below — same length as <Code>equity</Code>).</P>
      <CodeBlock code={`dd = ek.risk.drawdown_series(equity)`} />

      <H3>ulcer_index</H3>
      <P>
        The Ulcer Index — the root-mean-square of the drawdown series, so it penalises deep <em>and</em>{" "}
        prolonged drawdowns rather than just the single worst point. A pain metric that rewards curves
        which recover quickly.
      </P>
      <CodeBlock code={`ulcer_index(equity) -> float`} />
      <Ul>
        <Li><Code>equity</Code> — a cumulative equity curve.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a <Code>float</Code> — the RMS drawdown (lower is smoother).</P>

      <H3>tail_ratio</H3>
      <P>
        The ratio of the right-tail quantile to the (absolute) left-tail quantile — how big the good
        extremes are relative to the bad ones. <Code>&gt; 1</Code> means the upside tail dominates
        (the positively-skewed profile trend-following wants); <Code>&lt; 1</Code> means losses tail
        harder than gains.
      </P>
      <CodeBlock code={`tail_ratio(returns, q=0.05) -> float       # >1 upside tail dominates`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">returns</Code>, "array-like", "—", "Per-period return series."],
          [<Code key="b">q</Code>, "float", "0.05", "Tail fraction to compare on each side."],
        ]}
      />
      <P><Strong>Returns:</Strong> a <Code>float</Code> — right-tail / |left-tail| ratio.</P>
      <CodeBlock code={`ek.risk.tail_ratio(rets, q=0.05)   # >1 is the shape a trend edge should have`} />

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/metrics">edgekit.metrics</A> — <Code>max_drawdown</Code> / <Code>sharpe</Code> / <Code>sortino</Code> alongside these tail numbers.</Li>
        <Li><A href="/docs/api/optimize">edgekit.optimize</A> — the portfolio whose tail you are measuring.</Li>
        <Li><A href="/docs/api/sizing">edgekit.sizing</A> — turn a drawdown budget into a position size.</Li>
      </Ul>
    </>
  );
}
