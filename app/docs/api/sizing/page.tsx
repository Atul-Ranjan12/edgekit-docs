import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table, Code } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.sizing" };

export default function SizingPage() {
  return (
    <>
      <H1>edgekit.sizing</H1>
      <Lead>
        The layer that turns a book of per-asset R-streams into a single dollar-risked equity path,
        plus the risk governors that ride on top of it. Four composable jobs, kept deliberately
        separate: <Strong>combine → vol-target → size-to-DD → govern.</Strong>
      </Lead>

      <P>
        <Strong>What&rsquo;s inside.</Strong> Two weight builders combine correlated R-streams without
        letting the loudest asset dominate — <Code>risk_parity</Code> (inverse-vol) and <Code>hrp</Code>{" "}
        (Hierarchical Risk Parity). <Code>vol_target</Code> stabilises the combined book&rsquo;s
        volatility. <Code>size_to_dd</Code> sizes the stream to a hard drawdown budget in dollars. And
        two live-path governors, <Code>cppi</Code> and <Code>dd_throttle</Code>, throttle risk as the
        book bleeds.
      </P>

      <Callout kind="warn" title="Every weighting stat is .shift(1)">
        The one non-negotiable across this whole module: <Strong>every rolling statistic used to weight
        or scale bar <Code>i</Code> is <Code>.shift(1)</Code></Strong>. A weight on day <Code>i</Code>{" "}
        may only see returns through <Code>i-1</Code>, never its own bar. <Code>risk_parity</Code> lags
        its trailing std; <Code>vol_target</Code> lags both the vol and the median target;{" "}
        <Code>hrp</Code> builds day-<Code>t</Code> weights only from the window strictly before{" "}
        <Code>t</Code>. Skip that lag and the backtest quietly reads the future.
      </Callout>

      <H2>Combine — weight builders</H2>

      <H3>risk_parity</H3>
      <P>
        Inverse-volatility (naive risk-parity) weights for a book of R-streams. Each asset is weighted
        by the reciprocal of its trailing <Code>win</Code>-day standard deviation, then the row is
        renormalised to sum to <Code>n_assets</Code> — so the mean weight is 1.0 and{" "}
        <Code>(M * weights).sum(axis=1)</Code> reproduces an equal-risk book. The quiet asset gets the
        larger weight; the loud one is muted.
      </P>
      <CodeBlock code={`risk_parity(M: pd.DataFrame, win: int = 90) -> pd.DataFrame`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">M</Code>, "pd.DataFrame", "—", "Columns are per-asset daily-R series."],
          [<Code key="b">win</Code>, "int", "90", "Trailing window (days) for the volatility estimate."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a DataFrame of weights aligned to <Code>M</Code>, each row summing to{" "}
        <Code>n_assets</Code>. The trailing std is <Code>.shift(1)</Code> (causal).
      </P>
      <CodeBlock
        filename="risk_parity.py"
        code={`from edgekit import sizing

w = sizing.risk_parity(M)               # sums to n_assets per row
book = (M * w).sum(axis=1)              # the equal-risk combined R-stream
# the quiet asset gets the larger mean weight; the loud one is muted`}
      />

      <H3>hrp</H3>
      <P>
        Rolling Hierarchical Risk Parity weights (Lopez de Prado). Clusters the assets by correlation,
        then allocates risk top-down through the tree by inverse cluster-variance — sidestepping the
        unstable covariance-matrix inversion that wrecks plain mean-variance on correlated books. Pure
        numpy (no scipy dependency).
      </P>
      <CodeBlock code={`hrp(M: pd.DataFrame, lookback: int = 252, step: int = 21) -> pd.DataFrame`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">M</Code>, "pd.DataFrame", "—", "Columns are per-asset daily-R series."],
          [<Code key="b">lookback</Code>, "int", "252", "Trailing window (days) the clustering is fit on."],
          [<Code key="c">step</Code>, "int", "21", "Recompute cadence — weights are held flat then forward-filled between recomputes."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a DataFrame of weights, renormalised to sum to <Code>n_assets</Code>{" "}
        per row. Weights applied from day <Code>t</Code> are built only from returns strictly before{" "}
        <Code>t</Code> (window <Code>[t-lookback:t]</Code>), never peeking.
      </P>
      <CodeBlock
        filename="hrp.py"
        code={`from edgekit import sizing

w = sizing.hrp(M, lookback=252, step=21)   # correlation-clustered risk weights
book = (M * w).sum(axis=1)`}
      />

      <H2>Vol-target the book</H2>

      <H3>vol_target</H3>
      <P>
        Scale a portfolio-R series toward a constant volatility, leverage-capped. The scale on day{" "}
        <Code>i</Code> is (trailing-median vol) / (current <Code>win</Code>-day vol), clipped to{" "}
        <Code>[0.5, cap]</Code> — it presses risk up when the book has gone quiet and trims it when vol
        spikes, but never levers past <Code>cap</Code> nor cuts below half. The target level is the{" "}
        <em>expanding median</em> of realised vol, so it&rsquo;s set by the book&rsquo;s own history
        rather than a hand-picked number.
      </P>
      <CodeBlock code={`vol_target(port: pd.Series, cap: float = 1.5, win: int = 60, med_min: int = 60) -> pd.Series`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">port</Code>, "pd.Series", "—", "The combined portfolio-R series to stabilise."],
          [<Code key="b">cap</Code>, "float", "1.5", "Maximum leverage the scale may reach (upper clip)."],
          [<Code key="c">win</Code>, "int", "60", "Trailing window (days) for the current-vol estimate."],
          [<Code key="d">med_min</Code>, "int", "60", "Min periods before the expanding-median target activates."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> the scaled portfolio-R series (<Code>port * scale</Code>). Both the
        current vol and the median target are <Code>.shift(1)</Code>.
      </P>
      <CodeBlock
        filename="vol_target.py"
        code={`from edgekit import sizing

stable = sizing.vol_target(book, cap=1.5)   # scale clipped to [0.5, 1.5]`}
      />

      <H2>Size to a drawdown budget</H2>

      <H3>size_to_dd</H3>
      <P>
        Size a daily-R stream to a hard drawdown budget, in dollars. It delegates the dollar-per-R
        scalar to <A href="/docs/api/metrics">metrics.dd_matched_size</A> (the single home for that
        math — no re-deriving max-drawdown here), applies it, and returns both the scaled dollar series
        and the sizing decision. When <Code>daily_cap</Code> is given, whichever of the two constraints
        (max-DD vs worst-day) binds tighter wins.
      </P>
      <CodeBlock code={`size_to_dd(daily_r: pd.Series, dd_budget: float, account: float,
           daily_cap: float | None = None) -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">daily_r</Code>, "pd.Series", "—", "Daily-R stream to size."],
          [<Code key="b">dd_budget</Code>, "float", "—", "Max-drawdown budget as a fraction of account (e.g. 0.095)."],
          [<Code key="c">account</Code>, "float", "—", "Account size in dollars."],
          [<Code key="d">daily_cap</Code>, "float | None", "None", "Optional worst-day limit as a fraction of account (e.g. 0.045)."],
        ]}
      />
      <P>
        <Strong>Returns (all keys):</Strong> <Code>sized</Code> (the scaled dollar P&amp;L series),
        plus <Code>dollar_per_r</Code>, <Code>binding</Code> and <Code>max_dd_r</Code> passed through
        from <Code>dd_matched_size</Code>. Applied to the history, <Code>sized</Code> has a max
        drawdown of <Code>dd_budget * account</Code> when max-DD is the binding constraint.
      </P>
      <Callout kind="warn" title="The sized curve is a historical ceiling">
        <Code>size_to_dd</Code> reproduces the <em>historical</em> worst drawdown exactly — live
        drawdown runs deeper. The <Code>sized</Code> series is an optimistic ceiling, not a forecast;
        plan around a haircut and, ideally, size against a bootstrapped <Code>dd95</Code> rather than
        the lucky realised drawdown.
      </Callout>
      <CodeBlock
        filename="size_to_dd.py"
        code={`from edgekit import sizing

res = sizing.size_to_dd(daily_r, dd_budget=0.095, account=100_000)
res["sized"]         # dollar P&L series; max DD == 9.5% of account (when max-dd binds)
res["dollar_per_r"]  # the applied scalar
res["binding"]       # "max-dd" or "daily"
res["max_dd_r"]      # historical max drawdown, in R`}
      />

      <H2>Govern the live path</H2>

      <H3>cppi</H3>
      <P>
        Constant-Proportion Portfolio Insurance on a live P&amp;L stream. Runs a trailing floor at{" "}
        <Code>mstop</Code> below the high-water mark and risks in proportion to the <em>cushion</em> —
        how far equity sits from that floor up to the high-water mark. The risk multiplier is{" "}
        <Code>slope * cushion</Code>, floored at 0 (fully de-risked near the floor) and capped at{" "}
        <Code>cap</Code>. It presses risk when winning and throttles toward zero as it bleeds into the
        floor — the mechanism behind the prop-challenge survival curves.
      </P>
      <CodeBlock code={`cppi(returns, account: float, mstop: float, slope: float = 2.0, cap: float | None = None) -> pd.Series`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">returns</Code>, "array-like", "—", "Dollar P&L per period (same units as account)."],
          [<Code key="b">account</Code>, "float", "—", "Starting equity in dollars."],
          [<Code key="c">mstop</Code>, "float", "—", "Trailing floor distance below the high-water mark (e.g. 0.10)."],
          [<Code key="d">slope</Code>, "float", "2.0", "Risk multiplier per unit of cushion."],
          [<Code key="e">cap</Code>, "float | None", "None", "Ceiling on the risk multiplier; None = no ceiling."],
        ]}
      />
      <P><Strong>Returns:</Strong> the throttled dollar P&amp;L series, indexed to <Code>returns</Code>.</P>
      <CodeBlock
        filename="cppi.py"
        code={`from edgekit import sizing

throttled = sizing.cppi(daily_pnl, account=100_000, mstop=0.10, slope=2.0, cap=1.5)
# full cushion (eq == hwm) => multiplier == slope; near the floor => ~0`}
      />

      <H3>dd_throttle</H3>
      <P>
        Halve risk while the equity curve is more than <Code>thresh</Code> below its peak. A blunt,
        path-dependent governor: track the equity peak-to-date, and any period whose drawdown-from-peak
        exceeds <Code>thresh</Code> is sized at <Code>factor</Code> of full risk until the book
        recovers. Because the throttle changes the equity it then measures, it is applied sequentially.
      </P>
      <CodeBlock code={`dd_throttle(returns, thresh: float = 0.04, factor: float = 0.5) -> pd.Series`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">returns</Code>, "array-like", "—", "Per-period returns/P&L on a unit equity base."],
          [<Code key="b">thresh</Code>, "float", "0.04", "Drawdown-from-peak that triggers the throttle (4%)."],
          [<Code key="c">factor</Code>, "float", "0.5", "Risk multiplier applied while underwater (0.5 = halve)."],
        ]}
      />
      <P><Strong>Returns:</Strong> the throttled series, indexed to <Code>returns</Code>.</P>
      <CodeBlock
        filename="dd_throttle.py"
        code={`from edgekit import sizing

out = sizing.dd_throttle([-0.05, 0.10, 0.10], thresh=0.04, factor=0.5)
out.iloc[0]   # -0.05  first bar full risk (no drawdown yet)
out.iloc[1]   #  0.05  halved: the 5% drawdown exceeds the 4% threshold`}
      />

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/metrics">edgekit.metrics</A> — <Code>size_to_dd</Code> delegates to <Code>dd_matched_size</Code>.</Li>
        <Li><A href="/docs/api/costs">edgekit.costs</A> — sizing operates on net-of-cost R.</Li>
        <Li><A href="/docs/api">API reference</A> — every module, symbol by symbol.</Li>
      </Ul>
    </>
  );
}
