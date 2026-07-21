import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.portfolio" };

export default function PortfolioPage() {
  return (
    <>
      <H1>edgekit.portfolio</H1>
      <Lead>
        Combine independently-validated strategy books into one daily-R stream, then decide how much risk each carries.
        The unit everywhere is the <Strong>daily-R series</Strong> — one strategy&apos;s per-day sum of trade
        R-multiples, indexed by date.
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> Three functions: <Code>combine</Code> (merge books into one daily-R series),{" "}
        <Code>correlation</Code> (the pairwise daily-R correlation matrix), and <Code>allocation_sweep</Code> (sweep the
        risk-share between two books and pick the return-maximising split under a drawdown budget). Missing days are
        filled with <Code>0.0</Code> — a strategy that didn&apos;t trade contributes no R, it is not missing data.
        Causality lives in <Code>sizing.risk_parity</Code> (lagged std).
      </P>

      <H2>combine</H2>
      <P>Combine per-strategy daily-R series into a single book daily-R series, aligned on the union date grid and NaN-free.</P>
      <CodeBlock code={`combine(books: dict[str, pd.Series], method: str = "risk_parity",
        weights: dict[str, float] | None = None) -> pd.Series`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">books</Code>, "dict[str, pd.Series]", "—", "Name → daily-R series for each validated strategy."],
          [<Code key="b">method</Code>, "str", '"risk_parity"', 'One of "equal", "fixed", "risk_parity".'],
          [<Code key="c">weights</Code>, "dict[str, float] | None", "None", 'Per-strategy weights (required when method="fixed"; missing → 0).'],
        ]}
      />
      <Ul>
        <Li><Code>method=&quot;equal&quot;</Code> — unit-weight each (<Code>M.sum(axis=1)</Code>).</Li>
        <Li><Code>method=&quot;fixed&quot;</Code> — apply the <Code>weights</Code> dict; raises <Code>ValueError</Code> if no dict is given.</Li>
        <Li><Code>method=&quot;risk_parity&quot;</Code> — inverse-vol weights, renormalised to sum to <Code>n</Code>.</Li>
      </Ul>
      <P>Returns a single <Code>pd.Series</Code> (the book&apos;s daily R), indexed by the union of all input dates, with no NaNs.</P>
      <CodeBlock
        filename="combine.py"
        code={`from edgekit import portfolio
book = portfolio.combine({"trend": r_trend, "breakout": r_breakout}, method="risk_parity")

# fixed weights (e.g. 2x the trend book, mute the breakout sleeve)
book = portfolio.combine({"trend": r_trend, "breakout": r_breakout},
                         method="fixed", weights={"trend": 2.0, "breakout": 0.0})`}
      />

      <H2>correlation</H2>
      <P>Pairwise daily-R correlation. Symmetric with a 1.0 diagonal.</P>
      <CodeBlock code={`correlation(books: dict[str, pd.Series]) -> pd.DataFrame`} />
      <Callout kind="warn" title="Idle days are excluded on purpose">
        Only rows where at least one strategy was active (non-zero) enter the estimate — shared idle days (both books
        flat, contributing 0.0) would pull correlations spuriously toward zero and make two books look more diversifying
        than they are.
      </Callout>
      <CodeBlock code={`corr = portfolio.correlation({"trend": r_trend, "breakout": r_breakout})
print(corr.loc["trend", "breakout"])   # near 0 = genuine diversification`} />

      <H2>allocation_sweep</H2>
      <P>
        Sweep the risk-share between two books, size each blend to the same drawdown budget, and report the
        return-maximising split plus the robust risk-parity default. For every <Code>share</Code> of A in the grid the
        books are inverse-vol weighted, blended, and sized to <Code>dd_budget</Code> (with <Code>daily_cap</Code> binding
        when it is tighter).
      </P>
      <CodeBlock code={`allocation_sweep(book_a: pd.Series, book_b: pd.Series, dd_budget: float,
                 daily_cap: float | None, account: float, grid=None, cut=None) -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">book_a, book_b</Code>, "pd.Series", "—", "The two books' daily-R series."],
          [<Code key="b">dd_budget</Code>, "float", "—", "Drawdown budget as a fraction of account (e.g. 0.10 for 10%)."],
          [<Code key="c">daily_cap</Code>, "float | None", "—", "Daily-loss fraction cap; binds when tighter than dd_budget."],
          [<Code key="d">account</Code>, "float", "—", "Account size in dollars."],
          [<Code key="e">grid</Code>, "iterable | None", "None", "Shares of A to test (default 0→1 by 0.1)."],
          [<Code key="f">cut</Code>, "date | None", "None", "If given, fixes 50/50 weights + sizing on the IS window and applies them unchanged OOS."],
        ]}
      />
      <P>Returns a dict:</P>
      <Ul>
        <Li><Code>table</Code> — per-share DataFrame with columns <Code>share, w_a, w_b, dollar_per_r, binding, annual, max_dd_pct, worst_day_pct</Code>.</Li>
        <Li><Code>best</Code> — the return-maximising row.</Li>
        <Li><Code>best_share</Code> — the share of A at that maximum.</Li>
        <Li><Code>risk_parity</Code> — the 0.5-share allocation (the robust default).</Li>
        <Li><Code>correlation</Code> — the A/B correlation.</Li>
        <Li><Code>oos</Code> (only when <Code>cut</Code> is passed) — <Code>dollar_per_r, is_annual, oos_annual, is_sharpe, oos_sharpe, oos_max_dd_pct</Code>.</Li>
      </Ul>
      <CodeBlock
        filename="allocation_sweep.py"
        code={`res = portfolio.allocation_sweep(r_trend, r_breakout, dd_budget=0.10, daily_cap=0.05,
                                 account=100_000, cut="2023-01-01")
print(res["best_share"])          # return-maximising share of the trend book
print(res["risk_parity"])         # robust 50/50 default
print(res["oos"]["oos_annual"])   # what the IS-fixed weights actually did out-of-sample`}
      />
      <Callout kind="tip" title="Trust the OOS panel, not the best row">
        <Code>best_share</Code> is chosen in-sample and is therefore optimistic. Pass a <Code>cut</Code> and read the{" "}
        <Code>oos</Code> panel: it fixes 50/50 weights and sizing on the in-sample window and reports what they did on
        unseen data. If <Code>oos_annual</Code> collapses versus <Code>is_annual</Code>, the blend does not generalise.
      </Callout>

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/sizing">edgekit.sizing</A> — <Code>risk_parity</Code>, <Code>size_to_dd</Code>, and the risk governors underneath.</Li>
        <Li><A href="/docs/api/challenge">edgekit.challenge</A> — run the sized book through a prop-firm evaluation.</Li>
        <Li><A href="/docs/api/validation">edgekit.validation</A> — validate each book <em>before</em> combining.</Li>
      </Ul>
    </>
  );
}
