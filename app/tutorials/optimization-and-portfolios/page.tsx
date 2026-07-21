import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, A, Strong, Callout, Table } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Optimization & portfolios" };

export default function Page() {
  return (
    <>
      <H1>Optimization &amp; portfolios</H1>
      <Lead>
        Given a covariance matrix and a set of return views, what weights should you hold? Markowitz turned that into a
        constrained optimization problem with a clean closed-form answer — and six decades of experience turned it into
        a cautionary tale about trusting your inputs. This chapter derives the minimum-variance and tangency portfolios
        with Lagrange multipliers, draws the efficient frontier, and then explains, honestly, why the elegant solution
        so often loses to naive 1/N out of sample.
      </Lead>

      <Callout kind="tip" title="Intuition — the shape of the problem">
        <P>
          You have a pile of cash and a handful of assets. Put too much in the high-return one and a bad month wrecks
          you; spread it evenly and you leave return on the table. Somewhere between those extremes is a &ldquo;best&rdquo;
          split — and because risk is that bowl-shaped quadratic <MathInline>{"w^\\top \\Sigma w"}</MathInline> from the
          last chapter, there is exactly <em>one</em> bottom of the bowl, so &ldquo;best&rdquo; is well-defined and
          reachable by formula rather than by trial and error. The catch, which the second half of the chapter is
          honest about: the formula&rsquo;s answer is only as good as the return and covariance estimates you feed it,
          and those are noisy. The whole arc is &ldquo;here is the beautiful closed form; here is why the pros often
          trust a cruder, sturdier version of it.&rdquo;
        </P>
      </Callout>

      <H2>Convexity — why a unique answer exists</H2>
      <P>
        Portfolio variance is the quadratic form <MathInline>{"f(w) = w^\\top \\Sigma w"}</MathInline> from{" "}
        <A href="/tutorials/linear-algebra-for-quants">Linear algebra for quants</A>. Because{" "}
        <MathInline>{"\\Sigma"}</MathInline> is positive semi-definite, this function is <Strong>convex</Strong>: its
        Hessian is <MathInline>{"\\nabla^2 f = 2\\Sigma \\succeq 0"}</MathInline>, so the surface is a bowl with no
        false bottoms. That is what makes portfolio optimization tractable — a convex objective over linear constraints
        has a <em>single</em> global minimum, reachable in closed form. There is no local-minimum trap and no need for
        iterative solvers; the entire problem is one matrix inverse away.
      </P>

      <H2>Lagrange multipliers</H2>
      <P>
        To minimise a function subject to equality constraints, we use <Strong>Lagrange multipliers</Strong>. The idea:
        at a constrained optimum, the gradient of the objective must be a linear combination of the constraint
        gradients — otherwise you could slide along the constraint surface and improve. Encode that by forming the{" "}
        <Strong>Lagrangian</Strong>, a single function whose stationary point solves the constrained problem. For{" "}
        &ldquo;minimise <MathInline>{"f(w)"}</MathInline> subject to <MathInline>{"g(w) = 0"}</MathInline>&rdquo;:
      </P>
      <Math>{"\\mathcal{L}(w, \\lambda) = f(w) - \\lambda\\,g(w), \\qquad \\nabla_w \\mathcal{L} = 0, \\quad \\nabla_\\lambda \\mathcal{L} = 0."}</Math>
      <P>
        The second condition just re-imposes the constraint; the first is the stationarity condition. This single tool
        cracks both portfolios below.
      </P>

      <H2>The global minimum-variance portfolio</H2>
      <P>
        The simplest Markowitz problem ignores returns entirely and asks for the least-risky fully-invested portfolio:
      </P>
      <Math>{"\\min_{w} \\; w^\\top \\Sigma w \\quad \\text{subject to} \\quad w^\\top \\mathbf{1} = 1."}</Math>
      <Callout kind="tip" title="Derivation — the closed-form min-variance weights">
        <P>Form the Lagrangian with one multiplier for the budget constraint:</P>
        <Math>{"\\mathcal{L}(w, \\lambda) = w^\\top \\Sigma w - \\lambda\\,(w^\\top \\mathbf{1} - 1)."}</Math>
        <P>
          Set the gradient in <MathInline>{"w"}</MathInline> to zero, using{" "}
          <MathInline>{"\\nabla_w (w^\\top \\Sigma w) = 2\\Sigma w"}</MathInline> (valid because{" "}
          <MathInline>{"\\Sigma"}</MathInline> is symmetric):
        </P>
        <Math>{"\\nabla_w \\mathcal{L} = 2\\Sigma w - \\lambda \\mathbf{1} = 0 \\;\\Longrightarrow\\; w = \\tfrac{\\lambda}{2}\\,\\Sigma^{-1}\\mathbf{1}."}</Math>
        <P>
          The weights are proportional to <MathInline>{"\\Sigma^{-1}\\mathbf{1}"}</MathInline>; the multiplier{" "}
          <MathInline>{"\\lambda"}</MathInline> is just an overall scale, pinned by the budget constraint. Impose{" "}
          <MathInline>{"w^\\top \\mathbf{1} = 1"}</MathInline>:
        </P>
        <Math>{"\\tfrac{\\lambda}{2}\\,\\mathbf{1}^\\top \\Sigma^{-1}\\mathbf{1} = 1 \\;\\Longrightarrow\\; \\tfrac{\\lambda}{2} = \\frac{1}{\\mathbf{1}^\\top \\Sigma^{-1}\\mathbf{1}}."}</Math>
        <P>Substitute back to get the celebrated closed form:</P>
        <Math>{"w_{\\mathrm{mv}} = \\frac{\\Sigma^{-1}\\mathbf{1}}{\\mathbf{1}^\\top \\Sigma^{-1}\\mathbf{1}}."}</Math>
        <P>
          <Strong>Why it matters:</Strong> notice the answer depends only on <MathInline>{"\\Sigma"}</MathInline>, never
          on expected returns. That is why min-variance is the most robust MVO output — there is no{" "}
          <MathInline>{"\\mu"}</MathInline> to mis-estimate. On a diagonal <MathInline>{"\\Sigma"}</MathInline> it reduces
          to inverse-variance weighting, <MathInline>{"w_i \\propto 1/\\sigma_i^2"}</MathInline> — put more in the calm
          assets. The catch is the <MathInline>{"\\Sigma^{-1}"}</MathInline>: it is exactly the noisy, near-singular
          inverse that the previous chapter warned about.
        </P>
      </Callout>
      <CodeBlock
        filename="min_var.py"
        code={`import edgekit as ek

Sigma = ek.optimize.sample_cov(returns)
w = ek.optimize.min_variance(Sigma)        # Sigma^{-1} 1 / (1' Sigma^{-1} 1)
w.sum()                                     # 1.0  (fully invested)
ek.optimize.portfolio_vol(w, Sigma)         # sqrt(w' Sigma w)`}
      />
      <Callout kind="tip" title="Scenario — the min-variance split of equities and gold by hand">
        <P>
          Two assets make the closed form arithmetic you can do on paper. Take equities{" "}
          (<MathInline>{"\\sigma_1 = 16\\%"}</MathInline>, <MathInline>{"\\mu_1 = 8\\%"}</MathInline>) and gold{" "}
          (<MathInline>{"\\sigma_2 = 15\\%"}</MathInline>, <MathInline>{"\\mu_2 = 4\\%"}</MathInline>) with correlation{" "}
          <MathInline>{"\\rho = -0.20"}</MathInline>, so <MathInline>{"\\Sigma_{12} = -0.20 \\times 0.16 \\times 0.15 = -0.0048"}</MathInline>.
          For two assets <MathInline>{"w_{\\mathrm{mv}} = \\dfrac{\\Sigma^{-1}\\mathbf{1}}{\\mathbf{1}^\\top \\Sigma^{-1}\\mathbf{1}}"}</MathInline>{" "}
          reduces to a one-liner:
        </P>
        <Math>{"w_1 = \\frac{\\sigma_2^2 - \\Sigma_{12}}{\\sigma_1^2 + \\sigma_2^2 - 2\\Sigma_{12}} = \\frac{0.0225 - (-0.0048)}{0.0256 + 0.0225 - 2(-0.0048)} = \\frac{0.0273}{0.0577} = 0.47."}</Math>
        <P>
          So hold <MathInline>{"47\\%"}</MathInline> equities, <MathInline>{"53\\%"}</MathInline> gold. Plug back into the
          quadratic form:
        </P>
        <Math>{"\\sigma_p^2 = 0.47^2(0.0256) + 0.53^2(0.0225) + 2(0.47)(0.53)(-0.0048) = 0.00959,\\quad \\sigma_p = 9.8\\%."}</Math>
        <P>
          Read that number: the least-risky asset alone had <MathInline>{"15\\%"}</MathInline> vol, yet the blend sits at{" "}
          <MathInline>{"9.8\\%"}</MathInline> — <em>below either leg</em>. That is the negative correlation cashing out as
          the diversification free lunch, and it is the leftmost nose of the efficient frontier drawn below. This
          min-variance mix earns <MathInline>{"0.47(8\\%) + 0.53(4\\%) = 5.9\\%"}</MathInline>; if you wanted more return
          you would slide right along the frontier, accepting more vol for it. Notice the whole calculation never touched
          expected returns until the very last line — which is why the min-variance point is the one Markowitz output
          you can trust when you distrust <MathInline>{"\\mu"}</MathInline>.
        </P>
      </Callout>
      <Callout kind="note" title="Unconstrained means shorts are allowed">
        The closed form places no sign restriction on <MathInline>{"w"}</MathInline>, so a weight can come out negative —
        a short position — whenever assets are strongly correlated. edgekit&rsquo;s{" "}
        <Code>min_variance</Code>/<Code>max_sharpe</Code> are deliberately unconstrained; add your own box or no-short
        constraints downstream if the venue forbids shorting.
      </Callout>

      <H2>Adding a return target: the efficient frontier</H2>
      <P>
        Now bring returns back. Minimise variance for a <em>chosen</em> target return{" "}
        <MathInline>{"m"}</MathInline>, giving two constraints:
      </P>
      <Math>{"\\min_{w} \\; w^\\top \\Sigma w \\quad \\text{s.t.} \\quad w^\\top \\mathbf{1} = 1, \\;\\; w^\\top \\mu = m."}</Math>
      <P>
        Two constraints means two multipliers. The stationarity condition{" "}
        <MathInline>{"2\\Sigma w = \\lambda \\mathbf{1} + \\gamma \\mu"}</MathInline> gives{" "}
        <MathInline>{"w = \\tfrac{1}{2}\\Sigma^{-1}(\\lambda \\mathbf{1} + \\gamma \\mu)"}</MathInline>, and solving the
        two constraints for <MathInline>{"\\lambda, \\gamma"}</MathInline> makes the optimal weights <em>affine</em> in
        the target return — the <Strong>two-fund theorem</Strong>: <MathInline>{"w(m) = g + h\\,m"}</MathInline>.
        Sweeping <MathInline>{"m"}</MathInline> traces a parabola in variance, whose upper branch is the{" "}
        <Strong>efficient frontier</Strong>: the set of portfolios with the highest return for each level of risk.
        edgekit computes the whole curve analytically (no per-point solve) with the constants{" "}
        <MathInline>{"A = \\mathbf{1}^\\top \\Sigma^{-1}\\mathbf{1}"}</MathInline>,{" "}
        <MathInline>{"B = \\mathbf{1}^\\top \\Sigma^{-1}\\mu"}</MathInline>,{" "}
        <MathInline>{"C = \\mu^\\top \\Sigma^{-1}\\mu"}</MathInline>:
      </P>
      <Math>{"\\sigma^2(m) = \\frac{A\\,m^2 - 2B\\,m + C}{AC - B^2}."}</Math>
      <ChartFigure
        name="tut/efficient_frontier"
        alt="The efficient frontier: a curve of portfolio return against volatility, with individual assets inside it, the minimum-variance point at the far left, and the tangency portfolio where a line from the risk-free rate touches the curve"
        caption="The efficient frontier. Every individual asset sits inside the curve; combining them pushes the achievable set up and to the left — that leftward shift is diversification. The nose of the curve is the global minimum-variance portfolio; the point where a line from the risk-free rate is tangent to the curve is the max-Sharpe (tangency) portfolio."
      />

      <H2>The tangency (max-Sharpe) portfolio</H2>
      <P>
        Among all frontier portfolios, one has the steepest reward-per-risk — the highest{" "}
        <Strong>Sharpe ratio</Strong> <MathInline>{"(w^\\top \\mu - r_f)/\\sqrt{w^\\top \\Sigma w}"}</MathInline>. It is
        where a line drawn from the risk-free rate is tangent to the frontier, hence the <Strong>tangency portfolio</Strong>.
        Maximising the Sharpe ratio and solving gives another clean closed form:
      </P>
      <Math>{"w_{\\mathrm{tan}} \\;\\propto\\; \\Sigma^{-1}(\\mu - r_f \\mathbf{1}), \\qquad \\text{normalised so } w^\\top \\mathbf{1} = 1."}</Math>
      <P>
        Under the two-fund theorem, every investor holds some mix of the risk-free asset and this one risky portfolio —
        risk preference only sets the split, not the composition. edgekit exposes it as{" "}
        <Code>ek.optimize.max_sharpe</Code>, and the full frontier (returns, vols, weights, Sharpe at each point) as{" "}
        <Code>ek.optimize.efficient_frontier</Code>.
      </P>
      <CodeBlock
        filename="frontier.py"
        code={`import edgekit as ek

Sigma = ek.optimize.sample_cov(returns)
mu = returns.mean().to_numpy()             # expected-return VIEW (treat skeptically!)

w_tan = ek.optimize.max_sharpe(mu, Sigma, rf=0.0)   # Sigma^{-1}(mu - rf) normalised
front = ek.optimize.efficient_frontier(mu, Sigma, n=50)
front["vols"], front["returns"]            # trace the curve
front["sharpe"].max()                      # best reward-per-risk on the frontier`}
      />
      <Callout kind="warn" title="max_sharpe is dangerously sensitive to μ">
        The tangency weights depend on <MathInline>{"\\Sigma^{-1}\\mu"}</MathInline>, and{" "}
        <MathInline>{"\\mu"}</MathInline> — expected returns — is the single hardest thing to estimate in finance. Small
        errors in <MathInline>{"\\mu"}</MathInline> get amplified by <MathInline>{"\\Sigma^{-1}"}</MathInline> into
        wildly concentrated, often heavily-short weights. The min-variance portfolio avoids this by dropping{" "}
        <MathInline>{"\\mu"}</MathInline> entirely; that is why it generalises better.
      </Callout>
      <Callout kind="warn" title="Scenario — how a 0.5% estimate wobble flips the tangency book">
        <P>
          Take two near-twin assets: <MathInline>{"\\sigma_1 = \\sigma_2 = 20\\%"}</MathInline>, correlation{" "}
          <MathInline>{"\\rho = 0.90"}</MathInline>, and estimated returns <MathInline>{"\\mu_1 = 8\\%"}</MathInline>,{" "}
          <MathInline>{"\\mu_2 = 7\\%"}</MathInline> (<MathInline>{"r_f = 0"}</MathInline>). The high correlation makes{" "}
          <MathInline>{"\\Sigma"}</MathInline> nearly singular, so <MathInline>{"\\Sigma^{-1}"}</MathInline> is huge, and
          <MathInline>{"w_{\\mathrm{tan}} \\propto \\Sigma^{-1}(\\mu - r_f\\mathbf{1})"}</MathInline> comes out
        </P>
        <Math>{"w = (1.13,\\ -0.13) \\quad\\text{— 113\\% long asset 1, 13\\% short asset 2.}"}</Math>
        <P>
          A <MathInline>{"1\\%"}</MathInline> return gap became a leveraged long/short. Now nudge just one input —{" "}
          <MathInline>{"\\mu_2"}</MathInline> from <MathInline>{"7\\%"}</MathInline> to{" "}
          <MathInline>{"7.5\\%"}</MathInline>, well within any estimation error — and the weights swing to{" "}
          <MathInline>{"w = (0.81,\\ 0.19)"}</MathInline>: the short flips to a fifth of the book long. Nothing about the
          world changed; a rounding error in <MathInline>{"\\mu"}</MathInline> did, and{" "}
          <MathInline>{"\\Sigma^{-1}"}</MathInline> amplified it into a different portfolio. That is the
          error-maximiser in one example — and the concrete reason the desk reaches for shrinkage, risk parity, or plain
          1/N below.
        </P>
      </Callout>

      <H2>Why the optimizer is fragile</H2>
      <P>
        Markowitz optimization is an <em>error-maximiser</em>. It seeks out assets that look high-return and
        low-correlation — and those are precisely the estimates most likely to be lucky sampling noise. The inverse{" "}
        <MathInline>{"\\Sigma^{-1}"}</MathInline> makes it worse: near-zero eigenvalues (see the PCA discussion) blow up
        into enormous long/short bets on directions that are pure estimation error. The result is a portfolio that is
        beautifully optimal <em>in-sample</em> and unstable out of sample.
      </P>
      <H3>Ledoit-Wolf shrinkage</H3>
      <P>
        The standard fix is to <Strong>shrink</Strong> the noisy sample covariance toward a stable, structured target —
        a scaled identity <MathInline>{"\\mu I"}</MathInline> (<MathInline>{"\\mu"}</MathInline> = average sample
        variance). Ledoit-Wolf picks the convex mix that minimises expected squared error, with the shrinkage intensity{" "}
        <MathInline>{"\\delta"}</MathInline> available in closed form — no cross-validation:
      </P>
      <Math>{"\\Sigma^{*} = \\delta\\,\\mu I + (1 - \\delta)\\,S, \\qquad \\delta \\in [0, 1]."}</Math>
      <P>
        Shrinkage pulls the tiny, noise-dominated eigenvalues up and the inflated ones down — it conditions the matrix,
        so <MathInline>{"(\\Sigma^{*})^{-1}"}</MathInline> stops exploding. The sample cov is unbiased but high-variance;
        the identity target is biased but stable; the convex blend trades a little bias for a large variance reduction.
        Because it is a mix of two PSD matrices it is itself PSD, and strictly better-conditioned than{" "}
        <MathInline>{"S"}</MathInline>. Feed <MathInline>{"\\Sigma^{*}"}</MathInline> to the optimizers whenever the raw
        inverse looks unstable.
      </P>
      <CodeBlock
        filename="shrinkage.py"
        code={`import edgekit as ek

S   = ek.optimize.sample_cov(returns)      # unbiased but noisy
Sig = ek.optimize.ledoit_wolf(returns)     # shrunk toward scaled identity — stable inverse

w_raw    = ek.optimize.min_variance(S)     # can be wild / heavily short
w_shrunk = ek.optimize.min_variance(Sig)   # tamer, more diversified weights`}
      />

      <H2>Risk parity — sizing by risk, not dollars</H2>
      <P>
        A robust middle ground drops expected returns <em>and</em> the fragile inverse. <Strong>Equal-risk
        contribution</Strong> (risk parity) asks that every asset supply the same share of total portfolio variance.
        Using the Euler decomposition of the variance, asset <MathInline>{"i"}</MathInline>&rsquo;s risk contribution is{" "}
        <MathInline>{"\\mathrm{RC}_i = w_i\\,(\\Sigma w)_i"}</MathInline>, and these sum exactly to{" "}
        <MathInline>{"w^\\top \\Sigma w"}</MathInline>. Risk parity solves for the long-only{" "}
        <MathInline>{"w"}</MathInline> where all <MathInline>{"\\mathrm{RC}_i"}</MathInline> are equal — no single asset
        can dominate the risk budget. edgekit finds it with a stable damped fixed point (no matrix inverse at all):
      </P>
      <CodeBlock
        filename="erc.py"
        code={`import edgekit as ek

Sigma = ek.optimize.sample_cov(returns)
w_erc = ek.optimize.equal_risk_contribution(Sigma)   # every asset = 1/N of the variance
ek.optimize.risk_contributions(w_erc, Sigma)         # ~equal entries, sum to portfolio variance`}
      />

      <H2>Why 1/N often wins out of sample</H2>
      <P>
        Here is the humbling result. In a well-known study, DeMiguel, Garlappi &amp; Uppal (2009) found that across many
        datasets, sophisticated mean-variance optimizers <em>failed to reliably beat</em> the naive equal-weight (1/N)
        portfolio out of sample. The reason is exactly the fragility above: the estimation error in{" "}
        <MathInline>{"\\mu"}</MathInline> and <MathInline>{"\\Sigma"}</MathInline> costs more than the theoretical
        optimization gain. Equal weighting has <em>zero</em> estimation error — there are no parameters to get wrong.
      </P>
      <Table
        head={["Method", "Uses μ?", "Uses Σ⁻¹?", "Estimation risk", "edgekit"]}
        rows={[
          ["1/N equal weight", "No", "No", "None", "(w = 1/N)"],
          ["Risk parity (ERC)", "No", "No (fixed point)", "Low", "equal_risk_contribution"],
          ["Min-variance", "No", "Yes", "Medium", "min_variance"],
          ["Min-variance + shrinkage", "No", "Yes (conditioned)", "Lower", "ledoit_wolf → min_variance"],
          ["Max-Sharpe (tangency)", "Yes", "Yes", "High", "max_sharpe"],
        ]}
      />
      <Callout kind="tip" title="The practical hierarchy">
        The more an allocator relies on estimated inputs, the more it over-fits. So the robust ordering runs
        <em>up</em> the table: prefer 1/N or risk parity, reach for min-variance only with shrinkage, and treat
        max-Sharpe as a fragile view that needs strong priors on <MathInline>{"\\mu"}</MathInline>. This is precisely why
        edgekit&rsquo;s deployment-facing <A href="/tutorials/portfolio-construction">portfolio construction</A> layer
        combines validated R-streams with inverse-vol and hierarchical risk parity by default, keeping the fragile
        matrix inverse out of the live sizing path.
      </Callout>
      <P>
        The lesson is not that optimization is useless — it is that its inputs must be defensible. Use it when you have
        few assets, a long history, and a shrunk covariance you trust; fall back to risk-based heuristics when you do
        not. The math gives you the optimum <em>conditional on the inputs being right</em>; the discipline is knowing
        how wrong the inputs are.
      </P>

      <P>
        <Strong>Next:</Strong> we have modelled portfolios of returns — now we model how a single price moves through
        time, the random process the whole edifice rests on. <A href="/tutorials/stochastic-processes">Stochastic
        processes</A>.
      </P>
    </>
  );
}
