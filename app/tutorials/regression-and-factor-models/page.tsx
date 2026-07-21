import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Regression & factor models" };

export default function Page() {
  return (
    <>
      <H1>Regression &amp; factor models</H1>
      <Lead>
        Every strategy&rsquo;s return can be split into a part explained by things you did not choose — the market, a
        sector, a style — and a residual that is genuinely yours. Regression is the tool that does the splitting, and
        the CAPM is the simplest useful example: it separates skill (alpha) from riding the market (beta). This chapter
        derives ordinary least squares from first principles, shows where its standard errors and t-stats come from, and
        wires the theory straight into <Code>ek.factors</Code>.
      </Lead>

      <Callout kind="tip" title="Intuition — why a trader cares before any algebra">
        <P>
          Your crypto strategy returned <MathInline>{"+40\\%"}</MathInline> last year. Impressive — until you notice
          Bitcoin itself was up <MathInline>{"+70\\%"}</MathInline>. So how much of that <MathInline>{"40\\%"}</MathInline>
          was <em>you</em>, and how much was just being in the room while the market rose? Regression answers exactly
          that. It draws the best straight line through &ldquo;my return&rdquo; versus &ldquo;the market&rsquo;s
          return,&rdquo; and the line has two numbers: a <Strong>slope</Strong> (how much you move when the market moves
          — the part you did not earn) and a <Strong>height</Strong> where the market return is zero (what you made when
          the market did nothing — the part that might be skill). Splitting those two apart, and asking whether the
          second is real or a fluke, is the whole game. Everything below is the machinery that draws that line honestly.
        </P>
      </Callout>

      <H2>The linear model</H2>
      <P>
        We posit that a response <MathInline>{"y"}</MathInline> (say, a strategy&rsquo;s daily returns) is a linear
        combination of <MathInline>{"k"}</MathInline> explanatory variables, plus noise. Stacking{" "}
        <MathInline>{"n"}</MathInline> observations into a vector <MathInline>{"y \\in \\mathbb{R}^{n}"}</MathInline> and
        the regressors into a <Strong>design matrix</Strong> <MathInline>{"X \\in \\mathbb{R}^{n \\times k}"}</MathInline>{" "}
        (one column per variable, usually including a column of ones for the intercept):
      </P>
      <Math>{"y = X\\beta + \\varepsilon, \\qquad \\mathbb{E}[\\varepsilon] = 0, \\quad \\operatorname{Var}(\\varepsilon) = \\sigma^2 I."}</Math>
      <P>
        The unknown coefficient vector <MathInline>{"\\beta \\in \\mathbb{R}^{k}"}</MathInline> is what we want to
        estimate, and <MathInline>{"\\varepsilon"}</MathInline> is the part of <MathInline>{"y"}</MathInline> the
        regressors cannot explain. The assumptions on the right — zero-mean, constant-variance, uncorrelated errors —
        are what make least squares the <em>best linear unbiased estimator</em> (the Gauss-Markov theorem); we will flag
        where financial data violates them.
      </P>

      <H2>Ordinary least squares — the normal equations</H2>
      <P>
        OLS chooses the <MathInline>{"\\beta"}</MathInline> that minimises the <Strong>sum of squared residuals</Strong>{" "}
        (SSR) — the total squared vertical distance between the data and the fitted line:
      </P>
      <Math>{"S(\\beta) = \\sum_{t=1}^{n} \\big(y_t - x_t^\\top \\beta\\big)^2 = (y - X\\beta)^\\top (y - X\\beta)."}</Math>
      <Callout kind="tip" title="Derivation — minimise the SSR to get β = (XᵀX)⁻¹Xᵀy">
        <P>
          Expand the objective, using <MathInline>{"(X\\beta)^\\top y = y^\\top X\\beta"}</MathInline> (both scalars,
          equal to their own transpose):
        </P>
        <Math>{"S(\\beta) = y^\\top y - 2\\,\\beta^\\top X^\\top y + \\beta^\\top X^\\top X \\beta."}</Math>
        <P>
          This is a convex quadratic in <MathInline>{"\\beta"}</MathInline> (the Hessian{" "}
          <MathInline>{"2X^\\top X"}</MathInline> is PSD), so the unique minimum is where the gradient vanishes.
          Differentiating with the matrix-calculus rules{" "}
          <MathInline>{"\\nabla_\\beta (\\beta^\\top a) = a"}</MathInline> and{" "}
          <MathInline>{"\\nabla_\\beta (\\beta^\\top A \\beta) = 2A\\beta"}</MathInline>:
        </P>
        <Math>{"\\nabla_\\beta S = -2 X^\\top y + 2 X^\\top X \\beta \\;\\overset{!}{=}\\; 0 \\;\\Longrightarrow\\; X^\\top X \\beta = X^\\top y."}</Math>
        <P>
          Those are the <Strong>normal equations</Strong>. When <MathInline>{"X^\\top X"}</MathInline> is invertible
          (the regressors are not collinear), solve for the estimator:
        </P>
        <Math>{"\\hat\\beta = (X^\\top X)^{-1} X^\\top y."}</Math>
        <P>
          <Strong>Geometric reading.</Strong> The fitted values{" "}
          <MathInline>{"\\hat y = X\\hat\\beta = X(X^\\top X)^{-1}X^\\top y = Hy"}</MathInline> are the orthogonal{" "}
          <em>projection</em> of <MathInline>{"y"}</MathInline> onto the column space of <MathInline>{"X"}</MathInline>;
          the normal equations are just the statement that the residual{" "}
          <MathInline>{"\\hat\\varepsilon = y - \\hat y"}</MathInline> is perpendicular to every regressor,{" "}
          <MathInline>{"X^\\top \\hat\\varepsilon = 0"}</MathInline>. Least squares is the closest point in the span of
          your explanatory variables — nothing more.
        </P>
      </Callout>
      <ChartFigure
        name="tut/ols_fit"
        alt="A scatter of points with the least-squares regression line through them and vertical residual segments from each point to the line"
        caption="Ordinary least squares in one picture. The line is the beta that minimises the summed squares of the vertical residual segments; the normal equations are exactly the condition that no other line makes those segments jointly shorter. The fit is the orthogonal projection of the data onto the regressors."
      />
      <P>
        edgekit computes exactly this in <Code>ek.factors.ols</Code>, using <Code>numpy.linalg.lstsq</Code> (which
        solves the normal equations stably via a matrix factorisation rather than forming{" "}
        <MathInline>{"(X^\\top X)^{-1}"}</MathInline> naively). Set <Code>add_const=True</Code> to prepend the intercept
        column automatically.
      </P>
      <CodeBlock
        filename="ols.py"
        code={`import edgekit as ek

res = ek.factors.ols(y, X, add_const=True)   # X without a constant column
res["beta"]     # coefficients, intercept first
res["se"]       # standard errors
res["tstat"]    # beta / se
res["r2"]       # coefficient of determination
res["resid"]    # y - fitted (the unexplained part)`}
      />

      <H2>Goodness of fit: R²</H2>
      <P>
        How much of the variation in <MathInline>{"y"}</MathInline> did the model capture? The residual is orthogonal to
        the fit, so the total variation splits cleanly (Pythagoras in <MathInline>{"n"}</MathInline> dimensions) into
        explained plus unexplained:
      </P>
      <Math>{"\\underbrace{\\sum_t (y_t - \\bar y)^2}_{\\text{SST}} = \\underbrace{\\sum_t (\\hat y_t - \\bar y)^2}_{\\text{SSE}} + \\underbrace{\\sum_t (y_t - \\hat y_t)^2}_{\\text{SSR}}."}</Math>
      <P>
        The <Strong>coefficient of determination</Strong> is the explained fraction:
      </P>
      <Math>{"R^2 = 1 - \\frac{\\text{SSR}}{\\text{SST}} = \\frac{\\text{SSE}}{\\text{SST}} \\;\\in\\; [0, 1]."}</Math>
      <P>
        An <MathInline>{"R^2"}</MathInline> of 0.7 in a CAPM regression means 70% of the strategy&rsquo;s return variance
        is just the market moving. Adding regressors can only raise <MathInline>{"R^2"}</MathInline> (a projection onto a
        bigger space can only get closer), which is why edgekit also reports <Code>adj_r2</Code> — it penalises extra
        columns and can fall when a regressor adds nothing.
      </P>
      <Callout kind="warn" title="High R² is not high skill">
        A strategy with <MathInline>{"R^2 = 0.9"}</MathInline> against the market has almost no independent signal — it{" "}
        <em>is</em> the market with a bit of noise. For finding alpha you want a <em>low</em>{" "}
        <MathInline>{"R^2"}</MathInline> on the systematic factors and a significant intercept. Fit quality and edge are
        different questions.
      </Callout>

      <H2>Standard errors and t-stats</H2>
      <P>
        A point estimate <MathInline>{"\\hat\\beta"}</MathInline> is useless without a sense of its uncertainty. Under
        the model assumptions the estimator&rsquo;s sampling covariance follows from{" "}
        <MathInline>{"\\hat\\beta = (X^\\top X)^{-1}X^\\top y"}</MathInline> being a linear function of the random{" "}
        <MathInline>{"y"}</MathInline>:
      </P>
      <Math>{"\\operatorname{Var}(\\hat\\beta) = \\sigma^2 (X^\\top X)^{-1}, \\qquad \\hat\\sigma^2 = \\frac{\\text{SSR}}{n - k}."}</Math>
      <P>
        The <Strong>standard error</Strong> of coefficient <MathInline>{"j"}</MathInline> is the square root of the{" "}
        <MathInline>{"j"}</MathInline>-th diagonal entry, and the <Strong>t-statistic</Strong> asks how many standard
        errors the estimate sits away from zero:
      </P>
      <Math>{"\\mathrm{se}(\\hat\\beta_j) = \\sqrt{\\hat\\sigma^2\\,[(X^\\top X)^{-1}]_{jj}}, \\qquad t_j = \\frac{\\hat\\beta_j}{\\mathrm{se}(\\hat\\beta_j)}."}</Math>
      <P>
        A <MathInline>{"|t| \\gtrsim 2"}</MathInline> is the rough &ldquo;significant at 5%&rdquo; bar: the coefficient
        is unlikely to be that far from zero by chance. edgekit returns <Code>se</Code> and <Code>tstat</Code> from{" "}
        <Code>ols</Code> using the unbiased <MathInline>{"n-k"}</MathInline> denominator.
      </P>
      <Callout kind="warn" title="Return data breaks the plain-OLS standard errors">
        The formula <MathInline>{"\\sigma^2 (X^\\top X)^{-1}"}</MathInline> assumes errors are uncorrelated and
        equal-variance. Financial returns are neither — volatility clusters (heteroskedasticity) and overlapping holds
        induce autocorrelation, which makes plain SEs <em>too small</em> and t-stats too optimistic. edgekit provides{" "}
        <Code>ek.factors.newey_west_se</Code> (a HAC sandwich estimator) for exactly this; treat a{" "}
        <MathInline>{"t = 2.1"}</MathInline> on serially-correlated returns with suspicion.
      </Callout>

      <H2>The CAPM: alpha vs beta</H2>
      <P>
        The Capital Asset Pricing Model is a one-regressor OLS with a famous interpretation. Regress an asset&rsquo;s{" "}
        <em>excess</em> return (over the risk-free rate <MathInline>{"r_f"}</MathInline>) on the market&rsquo;s excess
        return:
      </P>
      <Math>{"r_i - r_f = \\alpha + \\beta\\,(r_m - r_f) + \\varepsilon."}</Math>
      <P>The two coefficients answer two different questions:</P>
      <Ul>
        <Li>
          <Strong>Beta (<MathInline>{"\\beta"}</MathInline>) is market exposure.</Strong> The slope is{" "}
          <MathInline>{"\\beta = \\operatorname{Cov}(r_i, r_m) / \\operatorname{Var}(r_m)"}</MathInline> — how much the
          asset moves per unit of market move. A trend-follower that is secretly just long the index shows{" "}
          <MathInline>{"\\beta \\approx 1"}</MathInline>. Beta is the return you could have earned with an index fund; it
          is <em>not</em> skill.
        </Li>
        <Li>
          <Strong>Alpha (<MathInline>{"\\alpha"}</MathInline>) is skill.</Strong> The intercept is the average excess
          return left over <em>after</em> stripping out the market. A positive, statistically significant{" "}
          <MathInline>{"\\alpha"}</MathInline> is the evidence that a strategy adds something the market did not give
          away for free.
        </Li>
      </Ul>
      <P>
        The test of skill is therefore a t-test on the intercept. edgekit&rsquo;s <Code>ek.factors.capm</Code> returns{" "}
        <Code>alpha</Code>, <Code>beta</Code>, the t-stat on alpha (<Code>alpha_t</Code>), the t-stat on beta{" "}
        (<Code>beta_t</Code>), the fit (<Code>r2</Code>), and an annualised intercept (<Code>alpha_annual</Code>) for a
        readable number. The bar you want to clear is a positive <Code>alpha</Code> with{" "}
        <MathInline>{"|\\texttt{alpha\\_t}| \\gtrsim 2"}</MathInline>.
      </P>
      <CodeBlock
        filename="capm.py"
        code={`import edgekit as ek

cm = ek.factors.capm(asset_returns, market_returns, rf=0.0,
                     periods_per_year=252)
cm["beta"]          # market exposure (1.0 = moves with the index)
cm["alpha"]         # per-period skill, net of the market
cm["alpha_t"]       # t-stat on alpha: is the skill real?  (|t| > 2)
cm["alpha_annual"]  # alpha scaled to a yearly number
cm["r2"]            # fraction of variance the market explains`}
      />
      <Callout kind="tip" title="Scenario — splitting a crypto strategy's return into alpha and beta">
        <P>
          Regress a trend strategy&rsquo;s <em>monthly excess</em> returns on BTC&rsquo;s monthly excess returns over 36
          months. Suppose OLS hands back <MathInline>{"\\beta = 0.55"}</MathInline>,{" "}
          <MathInline>{"\\alpha = 0.8\\%\\text{/month}"}</MathInline> with{" "}
          <MathInline>{"\\mathrm{se}(\\alpha) = 0.4\\%"}</MathInline>, and <MathInline>{"R^2 = 0.45"}</MathInline>. Over
          that window BTC&rsquo;s excess return averaged <MathInline>{"2.5\\%\\text{/month}"}</MathInline>. Decompose the
          strategy&rsquo;s average month:
        </P>
        <Math>{"\\underbrace{2.175\\%}_{\\text{strategy}} = \\underbrace{0.8\\%}_{\\alpha,\\ \\text{skill}} + \\underbrace{0.55 \\times 2.5\\%}_{\\beta\\,(r_m - r_f)\\,=\\,1.375\\%,\\ \\text{market ride}}."}</Math>
        <P>
          Annualised, that is <MathInline>{"0.8\\% \\times 12 \\approx 9.6\\%"}</MathInline> of alpha versus{" "}
          <MathInline>{"1.375\\% \\times 12 \\approx 16.5\\%"}</MathInline> you could have earned with{" "}
          <MathInline>{"0.55"}</MathInline> units of a BTC index fund. More than half the &ldquo;edge&rdquo; was beta.
          Now the honesty check: <MathInline>{"t_\\alpha = 0.8/0.4 = 2.0"}</MathInline> — it just clears the bar, but only
          just. And because monthly returns overlap and cluster, the plain SE is optimistic; run{" "}
          <Code>ek.factors.newey_west_se</Code> and a HAC correction of even <MathInline>{"25\\%"}</MathInline> pushes{" "}
          <MathInline>{"t_\\alpha"}</MathInline> to <MathInline>{"1.6"}</MathInline> — no longer significant. The
          point-estimate looked like skill; the inference says &ldquo;plausibly, but unproven.&rdquo;
        </P>
      </Callout>
      <Callout kind="note" title="This is the honest version of is_it_beta">
        The gauntlet&rsquo;s <Code>ek.validation.is_it_beta</Code> gives a quick annualised intercept with{" "}
        <Code>np.polyfit</Code>. <Code>ek.factors.capm</Code> is the inference-carrying version: it hands you the{" "}
        <em>t-stat</em>, so you can distinguish &ldquo;alpha looks positive&rdquo; from &ldquo;alpha is statistically
        distinguishable from zero.&rdquo; A positive point-estimate with <MathInline>{"\\texttt{alpha\\_t} = 0.6"}</MathInline>{" "}
        is not skill — it is noise. See <A href="/tutorials/alpha-vs-beta">Alpha vs beta</A> for the trading
        interpretation.
      </Callout>

      <H3>The security market line</H3>
      <P>
        CAPM makes an equilibrium prediction: across assets, expected excess return should be a straight line in beta —
        the <Strong>security market line</Strong> (SML), <MathInline>{"\\mathbb{E}[r_i - r_f] = \\beta_i\\,(\\mathbb{E}[r_m] - r_f)"}</MathInline>.
        An asset with no skill sits <em>on</em> the line; its whole return is compensation for the market risk it
        carries. An asset with genuine alpha sits <em>above</em> it — the vertical gap is the alpha.
      </P>
      <ChartFigure
        name="tut/capm_sml"
        alt="The security market line: expected excess return plotted against beta, a straight line through the origin, with points above the line marked as positive alpha"
        caption="The security market line. Beta is on the x-axis, expected excess return on the y. The line is what the market pays for risk alone; a point sitting above the line has positive alpha — return the market did not require it to earn. Alpha is a vertical distance from this line, not a level of return."
      />

      <H2>Multi-factor models</H2>
      <P>
        A single market factor rarely explains everything. The Fama-French insight was that a couple more systematic
        factors — a size spread (small minus big, SMB) and a value spread (high minus low book-to-market, HML) — capture
        return variation the market misses. The regression just grows more columns:
      </P>
      <Math>{"r_i - r_f = \\alpha + \\beta_{\\mathrm{mkt}}(r_m - r_f) + \\beta_{\\mathrm{smb}}\\,\\mathrm{SMB} + \\beta_{\\mathrm{hml}}\\,\\mathrm{HML} + \\varepsilon."}</Math>
      <P>
        Same normal equations, wider <MathInline>{"X"}</MathInline>. Now each <MathInline>{"\\beta"}</MathInline> is a{" "}
        <em>loading</em> — how much of the strategy&rsquo;s return is explained by each known factor — and the intercept{" "}
        <MathInline>{"\\alpha"}</MathInline> is the return left after controlling for <em>all</em> of them. This is the
        harder, fairer bar: a &ldquo;market-neutral&rdquo; strategy can have <MathInline>{"\\beta_{\\mathrm{mkt}} \\approx 0"}</MathInline>{" "}
        yet be quietly loaded on value, and its apparent alpha vanishes once HML is in the regression.
      </P>
      <P>
        edgekit&rsquo;s <Code>ek.factors.factor_exposures</Code> runs this multivariate OLS. Pass the asset returns and a
        DataFrame of factor returns; it returns <Code>betas</Code> and <Code>tstats</Code> as dicts keyed by your factor
        column names, plus <Code>alpha</Code>, <Code>alpha_t</Code>, and <Code>r2</Code>.
      </P>
      <CodeBlock
        filename="factors.py"
        code={`import edgekit as ek
import pandas as pd

factors = pd.DataFrame({"mkt": mkt_ret, "smb": smb_ret, "hml": hml_ret})
fx = ek.factors.factor_exposures(asset_returns, factors)

fx["betas"]     # {"mkt": 0.08, "smb": 0.41, "hml": -0.22}  loadings by name
fx["tstats"]    # {"mkt": 0.7, "smb": 3.9, "hml": -2.1}     significance by name
fx["alpha"]     # intercept AFTER controlling for every factor
fx["alpha_t"]   # is the leftover alpha real?
fx["r2"]        # variance spanned by the factors together`}
      />
      <Callout kind="tip" title="Scenario — a 'market-neutral' alpha that was really a value tilt">
        <P>
          A long/short equity book reports a CAPM fit of <MathInline>{"\\beta_{\\mathrm{mkt}} = 0.05"}</MathInline> (looks
          genuinely neutral) and <MathInline>{"\\alpha = 6\\%\\text{/yr}"}</MathInline> with{" "}
          <MathInline>{"t_\\alpha = 2.4"}</MathInline> — apparently real skill uncorrelated to the index. Add the
          Fama-French value factor and re-run:
        </P>
        <Math>{"r - r_f = \\alpha + 0.05\\,(r_m - r_f) + 0.45\\,\\mathrm{HML} + \\varepsilon, \\qquad t_{\\mathrm{hml}} = 3.9."}</Math>
        <P>
          The HML loading is <MathInline>{"0.45"}</MathInline> with <MathInline>{"t = 3.9"}</MathInline> — the book is
          quietly long cheap stocks and short expensive ones. With that captured, the intercept collapses to{" "}
          <MathInline>{"\\alpha = 1.5\\%\\text{/yr}"}</MathInline> at <MathInline>{"t_\\alpha = 0.6"}</MathInline>. The
          &ldquo;alpha&rdquo; was never neutral skill; it was compensation for bearing value risk, a factor you can rent
          for a few basis points. Market-neutral in the <MathInline>{"\\beta_{\\mathrm{mkt}}"}</MathInline> sense is not
          factor-neutral. This is why the fair bar is a significant intercept <em>after all the obvious factors are in
          the regression</em>, not just after the market.
        </P>
      </Callout>
      <Table
        head={["Quantity", "Formula", "Reads as", "edgekit key"]}
        rows={[
          ["OLS estimator", <MathInline key="b">{"(X^\\top X)^{-1}X^\\top y"}</MathInline>, "Best-fit coefficients", "beta"],
          ["Standard error", <MathInline key="s">{"\\sqrt{\\hat\\sigma^2 [(X^\\top X)^{-1}]_{jj}}"}</MathInline>, "Estimate uncertainty", "se"],
          ["t-statistic", <MathInline key="t">{"\\hat\\beta_j / \\mathrm{se}"}</MathInline>, "Significant if |t| ≳ 2", "tstat / alpha_t"],
          ["Fit", <MathInline key="r">{"1 - \\text{SSR}/\\text{SST}"}</MathInline>, "Variance explained", "r2"],
          ["Skill", <MathInline key="a">{"\\alpha"}</MathInline>, "Return net of factors", "alpha"],
        ]}
      />
      <Callout kind="tip" title="The regression discipline">
        Whenever a strategy looks good, the first question is: <em>against what?</em> Regress it on the obvious
        systematic factors and look at the intercept. If the alpha survives with a real t-stat, you may have something;
        if it collapses into a beta loading, you have re-discovered the market with extra steps. This is the same
        skepticism the <A href="/tutorials/why-backtests-lie">gauntlet</A> applies with permutation tests.
      </Callout>

      <P>
        <Strong>Next:</Strong> we can measure risk and attribute return — now we choose the weights that trade one
        against the other. <A href="/tutorials/optimization-and-portfolios">Optimization &amp; portfolios</A>.
      </P>
    </>
  );
}
