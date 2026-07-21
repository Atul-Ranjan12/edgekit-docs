import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.factors" };

export default function FactorsPage() {
  return (
    <>
      <H1>edgekit.factors</H1>
      <Lead>
        Regression &amp; factor models — the linear-algebra layer that answers &ldquo;is this return
        stream alpha, or just beta to something I already own?&rdquo;. A from-scratch OLS core, CAPM,
        multi-factor exposures, rolling beta, and Newey-West standard errors, all in numpy.
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> Everything sits on one engine: <Code>ols</Code>, a plain
        least-squares fit that returns coefficients with their t-stats and R². <Code>capm</Code> is the
        single-factor case that isolates alpha against a market; <Code>factor_exposures</Code>{" "}
        generalises it to a factor panel; <Code>rolling_beta</Code> tracks a time-varying loading; and{" "}
        <Code>newey_west_se</Code> gives you heteroskedasticity- and autocorrelation-robust standard
        errors when residuals are not i.i.d. (they rarely are).
      </P>

      <Callout kind="note" title="t-stats are asymptotic, not exact">
        These are numpy least-squares fits — the reported <Code>tstat</Code> values assume large
        samples and (except via <Code>newey_west_se</Code>) i.i.d. residuals. Treat <Code>|t| &gt; 2</Code>{" "}
        as the rough significance bar, and reach for Newey-West standard errors whenever returns are
        overlapping or autocorrelated.
      </Callout>

      <H2>Core regression</H2>

      <H3>ols</H3>
      <P>
        Ordinary least squares — regress <Code>y</Code> on <Code>X</Code> and get back coefficients,
        their standard errors and t-stats, fit quality, and the residuals. The primitive every other
        function in this module is built on.
      </P>
      <CodeBlock code={`ols(y, X, add_const=True) -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">y</Code>, "array (T,)", "—", "The dependent variable (e.g. asset returns)."],
          [<Code key="b">X</Code>, "array (T, k)", "—", "The regressor matrix (one column per factor)."],
          [<Code key="c">add_const</Code>, "bool", "True", "Prepend an intercept column (the alpha term)."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a <Code>dict</Code> with keys <Code>&quot;beta&quot;</Code>{" "}
        (coefficient vector, intercept first if <Code>add_const</Code>), <Code>&quot;se&quot;</Code>{" "}
        (standard errors), <Code>&quot;tstat&quot;</Code> (t-statistics),{" "}
        <Code>&quot;r2&quot;</Code>, <Code>&quot;adj_r2&quot;</Code>, <Code>&quot;resid&quot;</Code>{" "}
        (residuals), <Code>&quot;fitted&quot;</Code> (fitted values), and <Code>&quot;n&quot;</Code>{" "}
        (sample size).
      </P>
      <CodeBlock code={`import edgekit as ek
fit = ek.factors.ols(y, X)
fit["beta"], fit["tstat"], fit["adj_r2"]`} />

      <H2>Factor models</H2>

      <H3>capm</H3>
      <P>
        The single-factor CAPM regression — regress an asset&apos;s excess return on the market&apos;s
        and read off alpha and beta with their significance. The first question to ask any new edge:
        does it have a positive, significant alpha once you strip out market exposure?
      </P>
      <CodeBlock code={`capm(asset_returns, market_returns, rf=0.0, periods_per_year=252.0) -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">asset_returns</Code>, "array (T,)", "—", "The asset / strategy return series."],
          [<Code key="b">market_returns</Code>, "array (T,)", "—", "The market benchmark return series."],
          [<Code key="c">rf</Code>, "float", "0.0", "Per-period risk-free rate subtracted from both."],
          [<Code key="d">periods_per_year</Code>, "float", "252.0", "Annualisation factor for alpha_annual."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a <Code>dict</Code> with keys <Code>&quot;alpha&quot;</Code>{" "}
        (per-period intercept), <Code>&quot;beta&quot;</Code> (market loading),{" "}
        <Code>&quot;alpha_t&quot;</Code> and <Code>&quot;beta_t&quot;</Code> (their t-stats),{" "}
        <Code>&quot;r2&quot;</Code>, and <Code>&quot;alpha_annual&quot;</Code> (alpha annualised by{" "}
        <Code>periods_per_year</Code>).
      </P>
      <CodeBlock code={`c = ek.factors.capm(strat_rets, mkt_rets, rf=0.0, periods_per_year=365)
c["alpha_annual"], c["alpha_t"], c["beta"]   # want alpha_t > 2 and beta near 0`} />

      <H3>factor_exposures</H3>
      <P>
        Multi-factor regression — regress an asset on a panel of factors (market, size, value,
        momentum, …) to get its loading on each plus the residual alpha. The generalisation of{" "}
        <Code>capm</Code> to more than one systematic driver.
      </P>
      <CodeBlock code={`factor_exposures(asset_returns, factors) -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">asset_returns</Code>, "array (T,)", "—", "The asset / strategy return series."],
          [<Code key="b">factors</Code>, "array (T, k) / DataFrame", "—", "The factor-return panel (one column per factor)."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a <Code>dict</Code> with keys <Code>&quot;betas&quot;</Code>{" "}
        (loading on each factor), <Code>&quot;tstats&quot;</Code> (their t-stats),{" "}
        <Code>&quot;alpha&quot;</Code> (the intercept), <Code>&quot;alpha_t&quot;</Code> (its t-stat),
        and <Code>&quot;r2&quot;</Code>.
      </P>
      <CodeBlock code={`fx = ek.factors.factor_exposures(strat_rets, factor_panel)
fx["betas"], fx["alpha"], fx["alpha_t"]`} />

      <H2>Rolling &amp; robust</H2>

      <H3>rolling_beta</H3>
      <P>
        Beta of <Code>y</Code> on <Code>x</Code> estimated in a trailing <Code>window</Code> — a
        time-varying loading that shows when an exposure drifts (a strategy&apos;s market beta creeping
        up in a trend, say). Leading positions are NaN until the window fills.
      </P>
      <CodeBlock code={`rolling_beta(y, x, window) -> np.ndarray`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">y</Code>, "array (T,)", "—", "Dependent series (e.g. strategy returns)."],
          [<Code key="b">x</Code>, "array (T,)", "—", "Explanatory series (e.g. market returns)."],
          [<Code key="c">window</Code>, "int", "—", "Rolling lookback in bars."],
        ]}
      />
      <P><Strong>Returns:</Strong> a numpy array of rolling betas aligned to the inputs (leading positions NaN).</P>
      <CodeBlock code={`b = ek.factors.rolling_beta(strat_rets, mkt_rets, window=60)`} />

      <H3>newey_west_se</H3>
      <P>
        Newey-West HAC standard errors — heteroskedasticity- and autocorrelation-consistent errors for
        a fitted regression. Use them whenever residuals are autocorrelated (overlapping returns,
        persistent series); the plain OLS standard errors understate uncertainty there and make weak
        edges look significant.
      </P>
      <CodeBlock code={`newey_west_se(X, resid, lags) -> np.ndarray`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">X</Code>, "array (T, k)", "—", "The regressor matrix used in the fit (include the constant column)."],
          [<Code key="b">resid</Code>, "array (T,)", "—", "The regression residuals (e.g. ols()[\"resid\"])."],
          [<Code key="c">lags</Code>, "int", "—", "Bandwidth: number of autocorrelation lags to correct for."],
        ]}
      />
      <P><Strong>Returns:</Strong> a numpy array of HAC standard errors, one per coefficient in <Code>X</Code>.</P>
      <CodeBlock code={`fit = ek.factors.ols(y, X)
se_hac = ek.factors.newey_west_se(fit["X"] if "X" in fit else X, fit["resid"], lags=5)
t_hac = fit["beta"] / se_hac   # robust t-stats`} />

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/optimize">edgekit.optimize</A> — feed the estimated returns into portfolio construction.</Li>
        <Li><A href="/docs/api/timeseries">edgekit.timeseries</A> — the autocorrelation battery that tells you when to reach for Newey-West.</Li>
        <Li><A href="/docs/concepts/gauntlet">The validation gauntlet</A> — where a significant alpha_t has to survive.</Li>
      </Ul>
    </>
  );
}
