import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { ChartFigure } from "@/components/ChartFigure";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.optimize" };

export default function OptimizePage() {
  return (
    <>
      <H1>edgekit.optimize</H1>
      <Lead>
        Portfolio optimization — turn a vector of expected returns and a covariance matrix into
        weights. Covariance estimators (sample and shrunk), the classic optimizers (min-variance,
        max-Sharpe, mean-variance), the efficient frontier, and the risk-parity family, all in closed
        numpy.
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> Two covariance estimators (<Code>sample_cov</Code>,{" "}
        <Code>ledoit_wolf</Code>) feed everything downstream. The optimizers split into two camps: the
        unconstrained analytic solvers (<Code>min_variance</Code>, <Code>max_sharpe</Code>,{" "}
        <Code>mean_variance</Code>) that solve in closed form, and the iterative risk-based allocators
        (<Code>equal_risk_contribution</Code>). <Code>efficient_frontier</Code> traces the whole
        risk/return locus, and <Code>portfolio_vol</Code> / <Code>portfolio_return</Code> /{" "}
        <Code>risk_contributions</Code> are the small diagnostics you evaluate any weight vector with.
      </P>

      <Callout kind="warn" title="min_variance / max_sharpe / mean_variance are unconstrained">
        These three are closed-form solvers that allow negative weights — they <Strong>can and will
        short</Strong>. There is no long-only or box constraint baked in. If your book is long-only or
        capped, clip and renormalise the result yourself, or reach for{" "}
        <Code>equal_risk_contribution</Code> (which stays non-negative by construction). The weights
        sum to 1 but are otherwise unbounded.
      </Callout>

      <H2>Covariance estimators</H2>

      <H3>sample_cov</H3>
      <P>
        The plain sample covariance matrix of a returns panel — the maximum-likelihood estimate. Fast
        and unbiased, but noisy and often near-singular when assets outnumber observations, which is
        exactly when you want to shrink it instead.
      </P>
      <CodeBlock code={`sample_cov(returns) -> np.ndarray          # (n_assets, n_assets)`} />
      <Ul>
        <Li><Code>returns</Code> — a <Code>(T, n)</Code> array/DataFrame of asset returns (rows = periods).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> an <Code>(n, n)</Code> numpy covariance matrix.</P>
      <CodeBlock code={`import edgekit as ek
cov = ek.optimize.sample_cov(rets_panel)`} />

      <H3>ledoit_wolf</H3>
      <P>
        Ledoit-Wolf shrinkage covariance — pulls the noisy sample matrix toward a scaled-identity
        target by an analytically optimal intensity. The go-to estimator for optimization: it stays
        well-conditioned and invertible, which keeps <Code>max_sharpe</Code> and <Code>min_variance</Code>{" "}
        from blowing up on estimation noise.
      </P>
      <CodeBlock code={`ledoit_wolf(returns) -> np.ndarray         # shrunk (n, n)`} />
      <Ul>
        <Li><Code>returns</Code> — a <Code>(T, n)</Code> array/DataFrame of asset returns.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> an <Code>(n, n)</Code> shrunk covariance matrix (same shape as <Code>sample_cov</Code>).</P>
      <CodeBlock code={`cov = ek.optimize.ledoit_wolf(rets_panel)   # prefer this for optimization inputs`} />

      <H2>Optimizers</H2>

      <H3>min_variance</H3>
      <P>
        The global minimum-variance portfolio — the weights that minimise <Code>wᵀ Σ w</Code> subject
        only to summing to 1. Ignores expected returns entirely, which is a feature: it is the most
        estimation-robust point on the frontier because <Code>Σ</Code> is far easier to estimate than{" "}
        <Code>μ</Code>.
      </P>
      <CodeBlock code={`min_variance(cov) -> np.ndarray            # unconstrained, sums to 1`} />
      <Ul>
        <Li><Code>cov</Code> — an <Code>(n, n)</Code> covariance matrix.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> an <Code>(n,)</Code> weight vector summing to 1 (can be negative).</P>
      <CodeBlock code={`w = ek.optimize.min_variance(cov)`} />

      <H3>max_sharpe</H3>
      <P>
        The tangency portfolio — weights that maximise the Sharpe ratio{" "}
        <Code>(wᵀμ − rf) / sqrt(wᵀΣw)</Code>. The most sensitive of the three to estimation error in{" "}
        <Code>μ</Code>; always feed it a shrunk covariance and treat the result as a starting point, not
        gospel.
      </P>
      <CodeBlock code={`max_sharpe(mu, cov, rf=0.0) -> np.ndarray  # tangency, unconstrained`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">mu</Code>, "array (n,)", "—", "Expected returns per asset."],
          [<Code key="b">cov</Code>, "array (n, n)", "—", "Covariance matrix (use ledoit_wolf)."],
          [<Code key="c">rf</Code>, "float", "0.0", "Risk-free rate in the same units as mu."],
        ]}
      />
      <P><Strong>Returns:</Strong> an <Code>(n,)</Code> weight vector summing to 1 (can be negative).</P>
      <CodeBlock code={`w = ek.optimize.max_sharpe(mu, cov, rf=0.02)`} />

      <H3>mean_variance</H3>
      <P>
        The Markowitz mean-variance solution — maximises <Code>wᵀμ − (risk_aversion/2)·wᵀΣw</Code>.
        Sweeping <Code>risk_aversion</Code> from small to large walks the weights from aggressive
        (return-seeking) toward the minimum-variance corner.
      </P>
      <CodeBlock code={`mean_variance(mu, cov, risk_aversion=1.0) -> np.ndarray`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">mu</Code>, "array (n,)", "—", "Expected returns per asset."],
          [<Code key="b">cov</Code>, "array (n, n)", "—", "Covariance matrix."],
          [<Code key="c">risk_aversion</Code>, "float", "1.0", "Risk penalty λ; higher = more conservative."],
        ]}
      />
      <P><Strong>Returns:</Strong> an <Code>(n,)</Code> weight vector summing to 1 (can be negative).</P>
      <CodeBlock code={`w = ek.optimize.mean_variance(mu, cov, risk_aversion=3.0)`} />

      <H3>efficient_frontier</H3>
      <P>
        Trace the efficient frontier: <Code>n</Code> portfolios spanning the achievable return range,
        each the minimum-variance portfolio for its target return. The one call that gives you the whole
        risk/return locus to plot or to pick a point off.
      </P>
      <CodeBlock code={`efficient_frontier(mu, cov, n=50) -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">mu</Code>, "array (n_assets,)", "—", "Expected returns per asset."],
          [<Code key="b">cov</Code>, "array (n_assets, n_assets)", "—", "Covariance matrix."],
          [<Code key="c">n</Code>, "int", "50", "Number of frontier points to trace."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a <Code>dict</Code> with keys <Code>&quot;returns&quot;</Code> (target
        return of each point), <Code>&quot;vols&quot;</Code> (its volatility),{" "}
        <Code>&quot;weights&quot;</Code> (an <Code>(n, n_assets)</Code> matrix of the weights at each
        point), and <Code>&quot;sharpe&quot;</Code> (the Sharpe of each point).
      </P>
      <CodeBlock code={`ef = ek.optimize.efficient_frontier(mu, cov, n=60)
ef["vols"], ef["returns"]      # x, y to plot the frontier
best = ef["weights"][ef["sharpe"].argmax()]   # max-Sharpe point on the frontier`} />
      <ChartFigure
        name="efficient_frontier"
        alt="efficient_frontier chart"
        caption="The efficient frontier with each portfolio coloured by Sharpe ratio."
      />

      <H2>Risk parity &amp; contributions</H2>

      <H3>risk_contributions</H3>
      <P>
        Decompose a portfolio&apos;s variance into each asset&apos;s share — the total risk contributed
        by each position, which sums to the portfolio volatility. The diagnostic that reveals when a
        &ldquo;diversified&rdquo; book is actually one bet in disguise.
      </P>
      <CodeBlock code={`risk_contributions(weights, cov) -> np.ndarray`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">weights</Code>, "array (n,)", "—", "The portfolio weights."],
          [<Code key="b">cov</Code>, "array (n, n)", "—", "Covariance matrix."],
        ]}
      />
      <P><Strong>Returns:</Strong> an <Code>(n,)</Code> array of per-asset risk contributions (summing to portfolio vol).</P>
      <CodeBlock code={`rc = ek.optimize.risk_contributions(w, cov)
rc / rc.sum()   # fractional risk share per asset`} />

      <H3>equal_risk_contribution</H3>
      <P>
        The risk-parity portfolio — iteratively solves for weights where every asset contributes the
        <em> same</em> amount of risk. Non-negative by construction (no shorting), and far more robust
        than max-Sharpe because it never touches <Code>μ</Code>. The workhorse allocator for a
        multi-strategy book.
      </P>
      <CodeBlock code={`equal_risk_contribution(cov, iters=200, tol=1e-8) -> np.ndarray`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">cov</Code>, "array (n, n)", "—", "Covariance matrix."],
          [<Code key="b">iters</Code>, "int", "200", "Maximum fixed-point iterations."],
          [<Code key="c">tol</Code>, "float", "1e-8", "Convergence tolerance on the weight update."],
        ]}
      />
      <P><Strong>Returns:</Strong> an <Code>(n,)</Code> non-negative weight vector summing to 1.</P>
      <CodeBlock code={`w = ek.optimize.equal_risk_contribution(cov)
ek.optimize.risk_contributions(w, cov)   # all roughly equal`} />

      <H2>Diagnostics</H2>

      <H3>portfolio_vol</H3>
      <P>Portfolio volatility for a weight vector — the square root of <Code>wᵀ Σ w</Code>.</P>
      <CodeBlock code={`portfolio_vol(weights, cov) -> float`} />
      <Ul>
        <Li><Code>weights</Code> — an <Code>(n,)</Code> weight vector.</Li>
        <Li><Code>cov</Code> — the <Code>(n, n)</Code> covariance matrix.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a <Code>float</Code> portfolio volatility (same units as the covariance inputs).</P>

      <H3>portfolio_return</H3>
      <P>Portfolio expected return for a weight vector — the dot product <Code>wᵀ μ</Code>.</P>
      <CodeBlock code={`portfolio_return(weights, mu) -> float`} />
      <Ul>
        <Li><Code>weights</Code> — an <Code>(n,)</Code> weight vector.</Li>
        <Li><Code>mu</Code> — the <Code>(n,)</Code> expected-return vector.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a <Code>float</Code> expected portfolio return.</P>
      <CodeBlock code={`w = ek.optimize.max_sharpe(mu, cov)
r = ek.optimize.portfolio_return(w, mu)
v = ek.optimize.portfolio_vol(w, cov)
sharpe = r / v`} />

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/factors">edgekit.factors</A> — estimate the <Code>μ</Code> and betas that feed the optimizers.</Li>
        <Li><A href="/docs/api/risk">edgekit.risk</A> — VaR/CVaR on the resulting portfolio return stream.</Li>
        <Li><A href="/docs/api/metrics">edgekit.metrics</A> — score the optimized book on PF / MAR / Sharpe.</Li>
      </Ul>
    </>
  );
}
