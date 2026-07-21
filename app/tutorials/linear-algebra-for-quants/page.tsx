import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Linear algebra for quants" };

export default function Page() {
  return (
    <>
      <H1>Linear algebra for quants</H1>
      <Lead>
        A portfolio is a weighted sum of assets, and its risk is a quadratic form in those weights. Once you see that,
        the whole machinery of portfolio theory — variance, diversification, risk factors — collapses into three
        objects from linear algebra: a weight vector, a covariance matrix, and its eigenvectors. This chapter builds
        that vocabulary from the ground up, derives the one formula every optimizer uses, and shows why the eigenvectors
        of the covariance matrix <em>are</em> the market&rsquo;s hidden risk factors.
      </Lead>

      <Callout kind="tip" title="Intuition — before any symbols">
        <P>
          Forget matrices for a second. You hold three things: some Bitcoin, some Ether, a little gold. Two questions
          run your book. <Strong>What did I make today?</Strong> — add up each holding&rsquo;s move, weighted by how much
          of it you own. <Strong>How risky am I?</Strong> — that one is subtler, because BTC and ETH tend to crash{" "}
          <em>together</em>, so holding both is not two bets but nearly one, while gold usually zigs when crypto zags and
          quietly cancels risk. Linear algebra is just the bookkeeping that turns those two questions into a vector (the
          first) and a matrix sandwiched between two vectors (the second). Everything hard in this chapter is a way of
          reading that second object — the covariance matrix — correctly.
        </P>
      </Callout>

      <H2>Vectors: returns and weights</H2>
      <P>
        Take <MathInline>{"N"}</MathInline> assets. On a given day their returns are just a list of numbers, which we
        stack into a column <Strong>vector</Strong> <MathInline>{"r \\in \\mathbb{R}^{N}"}</MathInline>. How you split
        your capital across them is a second vector, the <Strong>weights</Strong>{" "}
        <MathInline>{"w \\in \\mathbb{R}^{N}"}</MathInline>, where <MathInline>{"w_i"}</MathInline> is the fraction of
        the book in asset <MathInline>{"i"}</MathInline>. &ldquo;Fully invested&rdquo; is the linear constraint that the
        weights sum to one:
      </P>
      <Math>{"w^\\top \\mathbf{1} = \\sum_{i=1}^{N} w_i = 1, \\qquad \\mathbf{1} = (1, 1, \\dots, 1)^\\top."}</Math>
      <P>
        The portfolio&rsquo;s return for the day is the <Strong>dot product</Strong> of the two — each asset&rsquo;s
        return scaled by how much you held of it, summed:
      </P>
      <Math>{"r_p = w^\\top r = \\sum_{i=1}^{N} w_i\\, r_i."}</Math>
      <P>
        The superscript <MathInline>{"\\top"}</MathInline> is <em>transpose</em>: it turns the column{" "}
        <MathInline>{"w"}</MathInline> on its side so the multiplication lines up term-by-term. Everything that follows
        is built by stacking these vectors into matrices and asking what happens to the dot products.
      </P>

      <H2>The covariance matrix Σ</H2>
      <P>
        Return is linear in the weights, so its expectation is trivial:{" "}
        <MathInline>{"\\mathbb{E}[r_p] = w^\\top \\mu"}</MathInline> where{" "}
        <MathInline>{"\\mu = \\mathbb{E}[r]"}</MathInline> is the vector of expected returns. Risk is where the
        structure lives, because it depends on how assets move <em>together</em>. That co-movement is packed into the{" "}
        <Strong>covariance matrix</Strong> <MathInline>{"\\Sigma"}</MathInline>, an{" "}
        <MathInline>{"N \\times N"}</MathInline> table whose entries are
      </P>
      <Math>{"\\Sigma_{ij} = \\operatorname{Cov}(r_i, r_j) = \\mathbb{E}\\big[(r_i - \\mu_i)(r_j - \\mu_j)\\big]."}</Math>
      <P>
        The diagonal <MathInline>{"\\Sigma_{ii} = \\operatorname{Var}(r_i) = \\sigma_i^2"}</MathInline> is each
        asset&rsquo;s own variance; the off-diagonal <MathInline>{"\\Sigma_{ij}"}</MathInline> is how asset{" "}
        <MathInline>{"i"}</MathInline> and asset <MathInline>{"j"}</MathInline> co-vary. Because{" "}
        <MathInline>{"\\operatorname{Cov}(r_i, r_j) = \\operatorname{Cov}(r_j, r_i)"}</MathInline>, the matrix is{" "}
        <Strong>symmetric</Strong>: <MathInline>{"\\Sigma = \\Sigma^\\top"}</MathInline>. From a{" "}
        <MathInline>{"T \\times N"}</MathInline> matrix of historical returns <MathInline>{"X"}</MathInline> (rows =
        periods, columns = assets), the sample estimate is a single matrix product on the demeaned data:
      </P>
      <Math>{"\\hat{\\Sigma} = \\frac{1}{T - 1}\\, \\tilde{X}^\\top \\tilde{X}, \\qquad \\tilde{X} = X - \\bar{X}."}</Math>
      <P>
        That is exactly what <Code>ek.optimize.sample_cov</Code> computes — a demeaned Gram matrix normalised by{" "}
        <MathInline>{"T-1"}</MathInline>. It is the maximum-likelihood covariance and it is the raw material for every
        risk calculation in the rest of Part VI.
      </P>
      <CodeBlock
        filename="cov.py"
        code={`import edgekit as ek

# returns: T x N DataFrame (rows = days, columns = assets)
Sigma = ek.optimize.sample_cov(returns)   # N x N covariance, ddof=1
Sigma.shape          # (N, N)
Sigma.diagonal()     # per-asset variances (sigma_i^2)`}
      />

      <H2>Portfolio variance as a quadratic form</H2>
      <P>
        Here is the formula that motivates the whole chapter. The variance of the portfolio return{" "}
        <MathInline>{"r_p = w^\\top r"}</MathInline> is the <Strong>quadratic form</Strong>
      </P>
      <Math>{"\\sigma_p^2 = \\operatorname{Var}(w^\\top r) = w^\\top \\Sigma\\, w."}</Math>
      <Callout kind="tip" title="Derivation — expand the double sum, then collect it into a matrix product">
        <P>
          Portfolio return is a weighted sum, <MathInline>{"r_p = \\sum_i w_i r_i"}</MathInline>. Variance of a sum
          expands into variances plus every pairwise covariance — this is the bilinearity of covariance,{" "}
          <MathInline>{"\\operatorname{Cov}(\\sum_i a_i X_i, \\sum_j b_j Y_j) = \\sum_{i,j} a_i b_j \\operatorname{Cov}(X_i, Y_j)"}</MathInline>:
        </P>
        <Math>{"\\operatorname{Var}\\!\\Big(\\sum_{i} w_i r_i\\Big) = \\sum_{i=1}^{N} \\sum_{j=1}^{N} w_i\\, w_j\\, \\operatorname{Cov}(r_i, r_j) = \\sum_{i,j} w_i\\, w_j\\, \\Sigma_{ij}."}</Math>
        <P>
          The right-hand double sum is, by the definition of matrix multiplication, precisely{" "}
          <MathInline>{"w^\\top \\Sigma w"}</MathInline>: multiplying <MathInline>{"\\Sigma"}</MathInline> by{" "}
          <MathInline>{"w"}</MathInline> on the right forms the inner sum over <MathInline>{"j"}</MathInline>, and the
          outer <MathInline>{"w^\\top"}</MathInline> forms the sum over <MathInline>{"i"}</MathInline>. Hence{" "}
          <MathInline>{"\\sigma_p^2 = w^\\top \\Sigma w"}</MathInline>. <Strong>Why it matters:</Strong> risk is not the
          weighted average of individual risks — the cross terms are the whole story. Two volatile assets with negative
          covariance can combine into a low-variance book; that cancellation, buried in the off-diagonals, is what{" "}
          <em>diversification</em> means mathematically.
        </P>
      </Callout>
      <P>
        Split the double sum into its diagonal and off-diagonal parts to read the diversification directly:
      </P>
      <Math>{"\\sigma_p^2 = \\underbrace{\\sum_{i} w_i^2\\, \\sigma_i^2}_{\\text{own risk}} + \\underbrace{\\sum_{i \\neq j} w_i\\, w_j\\, \\Sigma_{ij}}_{\\text{interaction}}."}</Math>
      <P>
        If the assets were uncorrelated the second term vanishes and risk is just the weighted sum of variances. Real
        assets are correlated, and the sign and size of that second term is what an optimizer is really trading against
        return. When correlations are positive it inflates risk; when some are negative it deflates it — the free lunch
        of diversification.
      </P>
      <Callout kind="tip" title="Scenario — a 3-asset book of BTC, ETH, and gold">
        <P>
          Put real-ish annualised numbers on the desk. Volatilities:{" "}
          <MathInline>{"\\sigma_{\\text{BTC}} = 0.60"}</MathInline>, <MathInline>{"\\sigma_{\\text{ETH}} = 0.75"}</MathInline>,{" "}
          <MathInline>{"\\sigma_{\\text{gold}} = 0.15"}</MathInline>. Correlations:{" "}
          <MathInline>{"\\rho_{\\text{BTC,ETH}} = 0.80"}</MathInline> (crypto moves together),{" "}
          <MathInline>{"\\rho_{\\text{BTC,gold}} = 0.10"}</MathInline>,{" "}
          <MathInline>{"\\rho_{\\text{ETH,gold}} = 0.05"}</MathInline>. Each covariance is{" "}
          <MathInline>{"\\Sigma_{ij} = \\rho_{ij}\\,\\sigma_i\\sigma_j"}</MathInline>, so the matrix is
        </P>
        <Math>{"\\Sigma = \\begin{pmatrix} 0.360 & 0.360 & 0.009 \\\\ 0.360 & 0.5625 & 0.0056 \\\\ 0.009 & 0.0056 & 0.0225 \\end{pmatrix}, \\qquad w = \\big(\\tfrac13, \\tfrac13, \\tfrac13\\big)^\\top."}</Math>
        <P>
          Now evaluate the quadratic form. The diagonal (&ldquo;own risk&rdquo;) contributes{" "}
          <MathInline>{"\\tfrac19(0.360 + 0.5625 + 0.0225) = 0.1050"}</MathInline>; the off-diagonal
          (&ldquo;interaction&rdquo;) contributes <MathInline>{"\\tfrac19 \\cdot 2(0.360 + 0.009 + 0.0056) = 0.0832"}</MathInline>.
          Add them:
        </P>
        <Math>{"\\sigma_p^2 = w^\\top \\Sigma\\, w = 0.1050 + 0.0832 = 0.1882 \\;\\Longrightarrow\\; \\sigma_p = 43.4\\%."}</Math>
        <P>
          Read the numbers. A trader who <em>ignored</em> correlation would guess the book&rsquo;s risk was the weighted
          average of vols, <MathInline>{"(0.60 + 0.75 + 0.15)/3 = 50\\%"}</MathInline>. If the assets were truly
          uncorrelated the diagonal alone would give <MathInline>{"\\sqrt{0.1050} = 32.4\\%"}</MathInline>. Reality —{" "}
          <MathInline>{"43.4\\%"}</MathInline> — sits between: the <MathInline>{"0.80"}</MathInline> BTC/ETH correlation is
          almost the entire interaction term (it alone adds <MathInline>{"2 \\times 0.360 / 9 = 0.080"}</MathInline> of
          variance), while gold&rsquo;s near-zero correlations barely move it. That single off-diagonal cell is why
          &ldquo;I hold BTC and ETH&rdquo; is closer to one bet than two — and why the calm, uncorrelated gold sleeve is
          doing the real diversification work despite its tiny weight-share of the risk.
        </P>
      </Callout>

      <H2>Positive semi-definiteness</H2>
      <P>
        A variance can never be negative. Since <MathInline>{"\\sigma_p^2 = w^\\top \\Sigma w"}</MathInline> is a
        variance <em>for any weights whatsoever</em>, the covariance matrix must satisfy
      </P>
      <Math>{"w^\\top \\Sigma\\, w \\;\\ge\\; 0 \\quad \\text{for all } w \\in \\mathbb{R}^{N}."}</Math>
      <P>
        A symmetric matrix with this property is called <Strong>positive semi-definite</Strong> (PSD). It is not a
        technicality — it is a hard constraint that every valid covariance must obey, and it has three consequences you
        will keep meeting:
      </P>
      <Ul>
        <Li>
          <Strong>All eigenvalues are <MathInline>{"\\ge 0"}</MathInline>.</Strong> A negative eigenvalue would let you
          build a portfolio with negative variance — impossible. (Strictly positive eigenvalues make{" "}
          <MathInline>{"\\Sigma"}</MathInline> positive <em>definite</em> and therefore invertible.)
        </Li>
        <Li>
          <Strong>The inverse can be unstable.</Strong> A near-zero eigenvalue means <MathInline>{"\\Sigma"}</MathInline>{" "}
          is nearly singular, so <MathInline>{"\\Sigma^{-1}"}</MathInline> (which the optimizers of the next chapter
          need) explodes. This is the numerical face of over-fitting a covariance from too little data.
        </Li>
        <Li>
          <Strong>Sample estimates can break PSD.</Strong> When you have fewer observations than assets{" "}
          (<MathInline>{"T < N"}</MathInline>), the sample covariance is rank-deficient — it has exact zero eigenvalues
          and is only semi-definite. That is one of several reasons shrinkage estimators exist.
        </Li>
      </Ul>
      <Callout kind="note" title="Why edgekit ridges the inverse">
        Because a noisy sample <MathInline>{"\\Sigma"}</MathInline> can have eigenvalues so small that the inverse is
        nonsense, <Code>ek.optimize</Code> adds a tiny multiple of the identity{" "}
        (<MathInline>{"\\Sigma + \\varepsilon I"}</MathInline>) when the condition number blows up. That nudges every
        eigenvalue up by <MathInline>{"\\varepsilon"}</MathInline>, restoring a stable, still-PSD matrix without moving a
        well-behaved one. The principled version of the same idea — Ledoit-Wolf shrinkage — is the subject of the{" "}
        <A href="/tutorials/optimization-and-portfolios">next chapter</A>.
      </Callout>

      <H2>The correlation matrix</H2>
      <P>
        Covariance mixes co-movement with scale — a large <MathInline>{"\\Sigma_{ij}"}</MathInline> could just mean two
        volatile assets. To see the pure relationship, standardise each asset by its own volatility. The result is the{" "}
        <Strong>correlation matrix</Strong> <MathInline>{"\\rho"}</MathInline>:
      </P>
      <Math>{"\\rho_{ij} = \\frac{\\Sigma_{ij}}{\\sigma_i\\, \\sigma_j} = \\frac{\\operatorname{Cov}(r_i, r_j)}{\\sigma_i\\, \\sigma_j} \\;\\in\\; [-1, 1]."}</Math>
      <P>
        In matrix form, with <MathInline>{"D = \\operatorname{diag}(\\sigma_1, \\dots, \\sigma_N)"}</MathInline> the
        diagonal matrix of volatilities, <MathInline>{"\\rho = D^{-1} \\Sigma D^{-1}"}</MathInline> — a unit-diagonal,
        symmetric, still-PSD matrix. It is the right object to <em>look</em> at, because every entry is on the same{" "}
        <MathInline>{"[-1, 1]"}</MathInline> scale. In edgekit, <Code>ek.portfolio.correlation</Code> takes a dict of
        strategy R-streams and returns exactly this matrix — the diagnostic you use to check that the sleeves of a book
        are actually diversifying rather than secretly the same bet.
      </P>
      <CodeBlock
        filename="corr.py"
        code={`import edgekit as ek

# books: {"orb": r_series, "sma": r_series, ...} of daily-R Series
rho = ek.portfolio.correlation(books)   # unit-diagonal correlation DataFrame
rho.loc["orb", "sma"]                   # pairwise correlation of two sleeves`}
      />
      <ChartFigure
        name="corr_heatmap"
        alt="A heatmap of a correlation matrix, with a unit diagonal and colour-coded off-diagonal correlations"
        caption="A correlation matrix as a heatmap. The unit diagonal is trivial; the off-diagonal block is what you read. Warm clusters are groups of assets that move together — a hint that the effective number of independent bets is smaller than the number of assets."
      />
      <Callout kind="warn" title="A correlation heatmap hides the effective bet count">
        Eyeballing pairwise correlations tells you which assets look related, but not how many <em>independent</em>{" "}
        risks you truly hold. Ten assets that all correlate at 0.8 are close to one bet, not ten. Answering &ldquo;how
        many bets do I really have?&rdquo; needs the eigenvalues of the matrix — which is exactly what PCA delivers.
      </Callout>

      <H2>Eigenvalues, eigenvectors, and PCA</H2>
      <P>
        A symmetric PSD matrix has a special structure: it can be written entirely in terms of its{" "}
        <Strong>eigenvectors</Strong> and <Strong>eigenvalues</Strong>. An eigenvector{" "}
        <MathInline>{"v"}</MathInline> is a direction that <MathInline>{"\\Sigma"}</MathInline> merely stretches without
        rotating, and its eigenvalue <MathInline>{"\\lambda"}</MathInline> is the stretch factor:
      </P>
      <Math>{"\\Sigma\\, v = \\lambda\\, v."}</Math>
      <P>
        The <Strong>spectral theorem</Strong> says any symmetric <MathInline>{"\\Sigma"}</MathInline> decomposes into an
        orthonormal set of <MathInline>{"N"}</MathInline> such eigenvectors, collected as columns of an orthogonal
        matrix <MathInline>{"V"}</MathInline>, with eigenvalues on a diagonal matrix{" "}
        <MathInline>{"\\Lambda"}</MathInline>:
      </P>
      <Math>{"\\Sigma = V \\Lambda V^\\top = \\sum_{k=1}^{N} \\lambda_k\\, v_k v_k^\\top, \\qquad \\lambda_1 \\ge \\lambda_2 \\ge \\dots \\ge \\lambda_N \\ge 0."}</Math>
      <P>
        This is <Strong>Principal Component Analysis</Strong>. Each eigenvector <MathInline>{"v_k"}</MathInline> — a{" "}
        <em>principal component</em> — is a specific combination of the assets (a synthetic portfolio), and its
        eigenvalue <MathInline>{"\\lambda_k"}</MathInline> is the variance of returns along that direction.
      </P>
      <ChartFigure
        name="tut/pca_axes"
        alt="A 2D cloud of return points with two arrows from its centre along the principal-component directions, the longer arrow along the direction of greatest spread"
        caption="Eigenvectors of the covariance, drawn on the data. The arrows point along the principal components — directions the matrix only stretches, not rotates — and each arrow's length is its eigenvalue, the variance along it. The long arrow is the highest-variance combination of the assets; the short one is what is left over and uncorrelated with it."
      />
      <Callout kind="tip" title="Derivation — the variance captured by a principal component is its eigenvalue">
        <P>
          Consider the portfolio whose weights <em>are</em> a unit-length eigenvector, <MathInline>{"w = v_k"}</MathInline>{" "}
          with <MathInline>{"\\|v_k\\| = 1"}</MathInline>. Its variance is the quadratic form from above; substitute the
          eigenvector equation <MathInline>{"\\Sigma v_k = \\lambda_k v_k"}</MathInline>:
        </P>
        <Math>{"\\sigma_p^2 = v_k^\\top \\Sigma\\, v_k = v_k^\\top (\\lambda_k v_k) = \\lambda_k\\, (v_k^\\top v_k) = \\lambda_k."}</Math>
        <P>
          So the variance of the return along principal component <MathInline>{"k"}</MathInline> is <em>exactly</em> its
          eigenvalue. The largest eigenvalue <MathInline>{"\\lambda_1"}</MathInline> belongs to the highest-variance
          direction in the whole asset space — no unit-weight portfolio has more variance, which is a one-line
          consequence of the Rayleigh quotient <MathInline>{"\\max_{\\|w\\|=1} w^\\top \\Sigma w = \\lambda_1"}</MathInline>.
          Because the eigenvectors are orthogonal, the components are <em>uncorrelated</em> synthetic assets, and the
          trace identity <MathInline>{"\\sum_k \\lambda_k = \\operatorname{tr}(\\Sigma) = \\sum_i \\sigma_i^2"}</MathInline>{" "}
          says the eigenvalues simply repartition the total variance of the market into independent buckets.
        </P>
      </Callout>
      <P>
        The fraction of total variance explained by the first <MathInline>{"m"}</MathInline> components is the
        cumulative eigenvalue ratio, and it is the honest answer to &ldquo;how many independent risks am I holding?&rdquo;:
      </P>
      <Math>{"\\text{variance explained by top } m = \\frac{\\sum_{k=1}^{m} \\lambda_k}{\\sum_{k=1}^{N} \\lambda_k}."}</Math>
      <ChartFigure
        name="tut/pca_variance"
        alt="A scree plot: variance explained by each principal component, with a steep drop after the first few and a cumulative curve"
        caption="A PCA scree plot. The first component alone often captures most of the variance of a basket of correlated assets, and a handful more capture nearly all of it — the long tail of tiny eigenvalues is noise. The number of components needed to reach ~90% is the effective number of bets."
      />
      <Callout kind="tip" title="Scenario — how many bets are in the BTC/ETH/gold book?">
        <P>
          Diagonalise the <MathInline>{"\\Sigma"}</MathInline> from the scenario above and its three eigenvalues come out
          roughly <MathInline>{"\\lambda_1 \\approx 0.84"}</MathInline>, <MathInline>{"\\lambda_2 \\approx 0.087"}</MathInline>,{" "}
          <MathInline>{"\\lambda_3 \\approx 0.022"}</MathInline> (they sum to{" "}
          <MathInline>{"\\operatorname{tr}(\\Sigma) = 0.360 + 0.5625 + 0.0225 = 0.945"}</MathInline>, as the trace
          identity demands). The top eigenvector is <em>almost entirely</em> a long-BTC/long-ETH combination — that is
          &ldquo;crypto beta,&rdquo; and it alone is{" "}
          <MathInline>{"0.84 / 0.945 = 89\\%"}</MathInline> of the total variance. The second eigenvector is dominated by
          gold. The upshot: three tickers, but <MathInline>{"89\\%"}</MathInline> of your risk lives on one axis — you are
          running closer to <em>one and a bit</em> independent bets, not three. That is the number a correlation heatmap
          cannot tell you but the eigenvalues can, and it is exactly what a risk manager means by &ldquo;effective
          breadth.&rdquo;
        </P>
      </Callout>

      <H2>Why PCA finds risk factors</H2>
      <P>
        The eigenvectors are not just a numerical convenience — for financial returns they line up with economically
        meaningful <Strong>risk factors</Strong>. When you run PCA on a basket of correlated assets you almost always
        see the same pattern:
      </P>
      <Ul>
        <Li>
          <Strong>The first component is &ldquo;the market.&rdquo;</Strong> Its eigenvector has the same sign in every
          asset — a roughly equal-weight long that goes up when everything goes up. For equities it typically explains
          the large majority of the variance; it is the systematic beta that no amount of stock-picking diversifies
          away. This is the linear-algebra shadow of the <A href="/tutorials/alpha-vs-beta">market factor</A>.
        </Li>
        <Li>
          <Strong>Later components are style/sector spreads.</Strong> The second and third components have mixed signs —
          long one group, short another — and correspond to interpretable tilts (sector, size, value, duration). They
          are the market-neutral <em>spreads</em> a relative-value trader lives on.
        </Li>
        <Li>
          <Strong>The tail is noise.</Strong> The many tiny eigenvalues correspond to idiosyncratic wiggle. A near-zero
          <MathInline>{"\\lambda"}</MathInline> is precisely the near-singular direction that destabilises{" "}
          <MathInline>{"\\Sigma^{-1}"}</MathInline> — over-fitting risk, made visible.
        </Li>
      </Ul>
      <P>
        This is why factor models and PCA are two views of the same object: a factor model{" "}
        <MathInline>{"r = B f + \\varepsilon"}</MathInline> says returns are driven by a few common factors{" "}
        <MathInline>{"f"}</MathInline>, and PCA <em>discovers</em> those factors as the top eigenvectors of{" "}
        <MathInline>{"\\Sigma"}</MathInline> without being told what they are. The{" "}
        <A href="/tutorials/regression-and-factor-models">next chapter</A> takes the complementary route: given a factor
        you name in advance (the market), regress against it to measure exposure.
      </P>
      <Table
        head={["Object", "Symbol", "Linear-algebra role", "edgekit"]}
        rows={[
          ["Weights", <MathInline key="w">{"w"}</MathInline>, "Vector, sums to 1", "portfolio weights"],
          ["Covariance", <MathInline key="s">{"\\Sigma"}</MathInline>, "Symmetric PSD matrix", "ek.optimize.sample_cov"],
          ["Correlation", <MathInline key="r">{"\\rho"}</MathInline>, "Standardised Σ, unit diagonal", "ek.portfolio.correlation"],
          ["Portfolio variance", <MathInline key="v">{"w^\\top \\Sigma w"}</MathInline>, "Quadratic form", "ek.optimize.portfolio_vol"],
          ["Risk factors", <MathInline key="e">{"v_k, \\lambda_k"}</MathInline>, "Eigenvectors / eigenvalues of Σ", "PCA (numpy.linalg.eigh)"],
        ]}
      />
      <Callout kind="note" title="The one idea to keep">
        Risk is a quadratic form <MathInline>{"w^\\top \\Sigma w"}</MathInline>; diversification is the cancellation in
        its off-diagonal terms; and the eigenvectors of <MathInline>{"\\Sigma"}</MathInline> are the independent
        directions of that risk. Optimization (next chapter but one) is nothing more than minimising this quadratic form
        subject to linear constraints — which is where Lagrange multipliers enter.
      </Callout>

      <P>
        <Strong>Next:</Strong> we have the covariance matrix and its factors — now we name a factor in advance and
        measure how much of a return it explains. <A href="/tutorials/regression-and-factor-models">Regression &amp;
        factor models</A>.
      </P>
    </>
  );
}
