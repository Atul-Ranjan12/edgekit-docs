import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, A, Strong, Callout, Code } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Portfolio construction" };

export default function Page() {
  return (
    <>
      <H1>Portfolio construction</H1>
      <Lead>
        One validated strategy is a business with a single point of failure. Two strategies whose returns don&apos;t move
        together are a portfolio whose combined risk is <em>less</em> than the sum of its parts — the only free lunch in
        finance. This chapter is the math of that lunch: portfolio variance, correlation, and the weighting schemes
        (equal-weight, inverse-vol, risk parity, HRP) that turn a set of independent books into one steadier equity
        curve.
      </Lead>

      <P>
        Start from scratch with two market stalls on the same street. One sells umbrellas, one sells sunglasses. Each on
        its own has wild months — the umbrella seller starves in a drought, the sunglasses seller in a monsoon. But own
        <em> both</em> and your street income barely moves with the weather: when one is quiet the other is busy. You did
        not raise your average takings; you smoothed them — and a smoother income at the same average is worth strictly
        more, because you can size up on it, borrow against it, and sleep through it. Two trading strategies whose good
        and bad months don&apos;t line up are umbrellas and sunglasses. This chapter is the arithmetic of exactly how
        much smoother the street gets, and it all turns on one number: the correlation between the two.
      </P>

      <H2>Combining strategies into one book</H2>
      <P>
        The unit of combination in edgekit is the <Strong>daily-R series</Strong> — each strategy&apos;s per-day sum of
        trade R-multiples, indexed by date. A day the strategy didn&apos;t trade contributes <MathInline>{"0"}</MathInline>{" "}
        R, not missing data. <Code>ek.portfolio.combine</Code> merges the per-strategy series onto one date grid and
        applies a weighting method:
      </P>
      <CodeBlock code={`combine(books: dict[str, pd.Series], method="risk_parity",
        weights=None) -> pd.Series
# method in "equal" | "fixed" | "risk_parity"`} />
      <CodeBlock
        filename="combine.py"
        code={`from edgekit import portfolio

# r_trend, r_breakout: each a daily-R series from a validated strategy
book = portfolio.combine({"trend": r_trend, "breakout": r_breakout}, method="risk_parity")`}
      />

      <H2>The diversification math</H2>
      <P>
        Why two books beat one comes straight out of the variance of a weighted sum. For weights{" "}
        <MathInline>{"w_i"}</MathInline>, per-book volatilities <MathInline>{"\\sigma_i"}</MathInline>, and pairwise
        correlations <MathInline>{"\\rho_{ij}"}</MathInline>, the portfolio variance is:
      </P>
      <Math>{"\\sigma_p^2 = \\sum_i \\sum_j w_i\\, w_j\\, \\sigma_i\\, \\sigma_j\\, \\rho_{ij}"}</Math>
      <P>The two-book case makes the mechanism obvious:</P>
      <Math>{"\\sigma_p^2 = w_1^2 \\sigma_1^2 + w_2^2 \\sigma_2^2 + 2\\, w_1 w_2\\, \\sigma_1 \\sigma_2\\, \\rho_{12}"}</Math>
      <P>
        The cross term carries <MathInline>{"\\rho_{12}"}</MathInline>. If the books are uncorrelated
        (<MathInline>{"\\rho_{12} = 0"}</MathInline>) it vanishes, and combined volatility is{" "}
        <MathInline>{"\\sqrt{w_1^2\\sigma_1^2 + w_2^2\\sigma_2^2}"}</MathInline> — strictly less than the weighted sum of the
        two volatilities. If they are <em>negatively</em> correlated, the cross term is negative and risk falls further. The
        return of the combined book is just the weighted average of the two means — so lower risk at the same return means
        a higher Sharpe. That is the entire case for diversification.
      </P>
      <P>
        <Strong>Scenario: a trend book and a breakout book.</Strong> You have two validated daily-R books. A{" "}
        <Code>SmaCross</Code> crypto trend book swings at <MathInline>{"\\sigma_1 = 1.4R"}</MathInline> per day; an{" "}
        <Code>ORB</Code>-style US100 breakout book is quieter at <MathInline>{"\\sigma_2 = 0.9R"}</MathInline> per day.
        One holds crypto for days at a time, the other is flat by every US close, so their daily-R correlation lands at{" "}
        <MathInline>{"\\rho_{12} = +0.08"}</MathInline> — essentially unrelated. Blend them 50/50 and the two-book
        variance formula becomes:
      </P>
      <Math>{"\\sigma_p^2 = 0.5^2(1.4)^2 + 0.5^2(0.9)^2 + 2(0.5)(0.5)(1.4)(0.9)(0.08) \\approx 0.49 + 0.20 + 0.05 = 0.74"}</Math>
      <P>
        so <MathInline>{"\\sigma_p \\approx 0.86R"}</MathInline> per day — <em>lower</em> than either book on its own,
        while the combined return is simply the average of the two means. That is the free lunch as a concrete number.
        Now suppose the two books had instead been the same trend signal on two instruments, correlated at{" "}
        <MathInline>{"\\rho = 0.9"}</MathInline>: the cross term swells from 0.05 to{" "}
        <MathInline>{"2(0.5)(0.5)(1.4)(0.9)(0.9) \\approx 0.57"}</MathInline>, portfolio vol climbs back to{" "}
        <MathInline>{"\\approx 1.12R"}</MathInline>, and the smoothing all but vanishes. Same books, same returns — the
        whole difference is the correlation.
      </P>
      <ChartFigure
        name="tut/correlation_scatter"
        alt="Scatter of two books' returns with a fitted line and the correlation coefficient"
        caption="The number the whole chapter turns on. Each point is one period's paired returns for two books; ρ measures how tightly they track the fitted line. A near-zero cloud (left) is the diversifying pair whose cross term vanishes; a tight upward line (ρ near 1) is two books moving as one, and no smoothing to be had."
      />
      <Callout kind="tip" title="Correlation, not count, is what diversifies">
        Ten strategies that are really the same trend signal on ten instruments have <MathInline>{"\\rho \\approx 1"}</MathInline>{" "}
        and diversify almost nothing — the cross terms nearly reproduce the weighted sum. Two <em>genuinely different</em>{" "}
        edges (a trend book and a mean-reversion book) at <MathInline>{"\\rho \\approx 0"}</MathInline> do far more for
        risk-adjusted return than ten correlated ones.
      </Callout>

      <H3>Measuring correlation honestly</H3>
      <P>
        <Code>ek.portfolio.correlation</Code> returns the pairwise daily-R correlation matrix. It counts only days where
        at least one book was active — shared idle days (both flat at <MathInline>{"0"}</MathInline>) would pull the
        estimate spuriously toward zero and make two books look more diversifying than they are.
      </P>
      <CodeBlock
        filename="correlation.py"
        code={`corr = portfolio.correlation({"trend": r_trend, "breakout": r_breakout})
print(corr.loc["trend", "breakout"])   # near 0 = genuine diversification`}
      />
      <P>
        <Strong>At the desk.</Strong> Run <Code>correlation</Code> on the two books above and it prints{" "}
        <MathInline>{"0.08"}</MathInline> — but only because it ignored the roughly 40% of calendar days when both books
        sat flat. Fold those shared zeros back in and a naive Pearson correlation sags toward{" "}
        <MathInline>{"0.03"}</MathInline>, making the pair look <em>more</em> diversifying than it truly is. That is not
        a cosmetic difference: you size real risk against this number, and a spuriously low correlation quietly tells you
        to load up on a pair that will move together more than you budgeted for.
      </P>
      <ChartFigure
        name="corr_heatmap"
        alt="A correlation heatmap of several strategy books' daily-R series"
        caption="Pairwise daily-R correlations. Cool off-diagonal cells are the pairs worth combining; a matrix that's warm everywhere is one strategy wearing many hats."
      />

      <H2>Weighting schemes</H2>
      <H3>Equal weight</H3>
      <P>
        Give each book the same weight, <MathInline>{"w_i = 1/n"}</MathInline>. Simple and hard to overfit, but it lets a
        high-volatility book dominate the combined risk: a book with twice the vol contributes four times the variance.
        Equal <em>capital</em> is not equal <em>risk</em>.
      </P>

      <H3>Inverse-volatility (naive risk parity)</H3>
      <P>
        Weight each book by the reciprocal of its volatility so every book contributes the same risk:
      </P>
      <Math>{"w_i = \\frac{1/\\sigma_i}{\\sum_j 1/\\sigma_j}"}</Math>
      <P>
        The quiet book gets the larger weight, the loud one is muted. <Code>ek.sizing.risk_parity</Code> builds these
        weights from a trailing volatility window — and every stat it uses is lagged one day (<Code>.shift(1)</Code>), so
        the weight on day <MathInline>{"t"}</MathInline> only sees returns through <MathInline>{"t-1"}</MathInline> and never
        reads its own bar.
      </P>
      <CodeBlock
        filename="risk_parity.py"
        code={`from edgekit import sizing

# M: DataFrame whose columns are per-book daily-R series
w = sizing.risk_parity(M, win=90)      # inverse-vol weights, each row sums to n_assets
book = (M * w).sum(axis=1)             # the equal-risk combined R-stream`}
      />
      <P>
        This is exactly what <Code>combine(..., method=&quot;risk_parity&quot;)</Code> does under the hood. True risk parity —
        equalising each book&apos;s <em>marginal</em> contribution to portfolio risk, which accounts for correlations too —
        is the more complete version; inverse-vol is the robust, correlation-blind approximation that rarely does worse
        out-of-sample.
      </P>
      <P>
        <Strong>Scenario.</Strong> Keep <MathInline>{"\\sigma_1 = 1.4R"}</MathInline> (trend) and{" "}
        <MathInline>{"\\sigma_2 = 0.9R"}</MathInline> (breakout). Inverse-vol weights are{" "}
        <MathInline>{"w_1 = (1/1.4)/(1/1.4 + 1/0.9) \\approx 0.39"}</MathInline> and{" "}
        <MathInline>{"w_2 \\approx 0.61"}</MathInline>: the quieter breakout book gets the larger share, precisely so
        each contributes the <em>same</em> risk to the blend. Equal capital (50/50) would instead let the louder trend
        book dominate the combined drawdown — the thing that actually breaches a limit — even while it holds only half
        the money.
      </P>

      <H3>Hierarchical Risk Parity (HRP)</H3>
      <P>
        Classic mean-variance optimisation inverts the covariance matrix, which is wildly unstable on correlated books —
        tiny estimation errors produce enormous, concentrated weights. HRP (Lopez de Prado) sidesteps the inversion
        entirely: it clusters the books by correlation into a tree, then allocates risk top-down through the tree by
        inverse cluster-variance. The result is stable, diversified weights with no matrix inversion.{" "}
        <Code>ek.sizing.hrp</Code> is pure numpy and, like everything in the sizing layer, is strictly causal — day-
        <MathInline>{"t"}</MathInline> weights are built only from the window before <MathInline>{"t"}</MathInline>.
      </P>
      <CodeBlock
        filename="hrp.py"
        code={`from edgekit import sizing
w = sizing.hrp(M, lookback=252, step=21)   # correlation-clustered risk weights
book = (M * w).sum(axis=1)`}
      />

      <H2>Choosing the split: allocation_sweep</H2>
      <P>
        Between two books there is a whole family of blends. <Code>ek.portfolio.allocation_sweep</Code> sweeps the
        risk-share of book A, sizes each blend to the same drawdown budget, and reports both the return-maximising split
        and the robust risk-parity (50/50) default. Crucially, it can fix weights on an in-sample window and report what
        they did out-of-sample — because the best in-sample share is always optimistic.
      </P>
      <CodeBlock code={`allocation_sweep(book_a, book_b, dd_budget, daily_cap, account,
                 grid=None, cut=None) -> dict`} />
      <CodeBlock
        filename="allocation_sweep.py"
        code={`res = portfolio.allocation_sweep(r_trend, r_breakout, dd_budget=0.10,
                                 daily_cap=0.05, account=100_000, cut="2023-01-01")
print(res["best_share"])          # return-maximising share of A (in-sample, optimistic)
print(res["risk_parity"])         # robust 50/50 default
print(res["oos"]["oos_annual"])   # what the IS-fixed weights did on unseen data`}
      />
      <ChartFigure
        name="allocation_area"
        alt="A stacked-area chart of each book's risk allocation across the sweep grid"
        caption="Risk allocation across the blend grid. Read the OOS panel, not the in-sample peak — the return-maximising share is chosen on the same data it's measured on."
      />
      <Callout kind="warn" title="Trust the OOS panel, not the best row">
        <Code>best_share</Code> is selected in-sample and therefore flatters itself. Pass a <Code>cut</Code> date and read
        the <Code>oos</Code> panel: it fixes 50/50 weights and sizing on the in-sample window and reports what they did on
        unseen data. If <Code>oos_annual</Code> collapses versus <Code>is_annual</Code>, the blend doesn&apos;t generalise —
        fall back to the correlation-blind risk-parity default, which has nothing to overfit.
      </Callout>

      <H2>Why correlation drifts — and why it matters</H2>
      <P>
        The diversification benefit is only as stable as the correlation that produces it. In a crisis, correlations
        across risk assets tend to spike toward <MathInline>{"+1"}</MathInline> exactly when you most need them low — the
        cross term in the variance formula swells and the &ldquo;free lunch&rdquo; shrinks. Watch the <em>rolling</em>{" "}
        correlation, not just the full-sample number, so a pair that is diversifying on average but coupled in stress
        doesn&apos;t surprise you live.
      </P>
      <P>
        <Strong>Scenario: the correlation that moved.</Strong> Through 2021&ndash;2023 the trend and breakout books above
        sit at a rolling <MathInline>{"\\rho \\approx 0.05"}</MathInline> and the blend feels bomb-proof. Then a macro
        shock hits: crypto and the equity index sell off together, both books flip short into the same falling tape, and
        for six weeks their rolling correlation spikes to <MathInline>{"0.6"}</MathInline>. The cross term you sized
        against at 0.05 is now more than ten times larger, the portfolio vol you budgeted for is blown through, and the
        drawdown lands deeper than the full-sample math ever suggested. This is why you size for the rolling peak, not
        the comfortable average — the diversification is only ever as reliable as its worst window.
      </P>
      <ChartFigure
        name="rolling_correlation"
        alt="Rolling pairwise correlation between two strategy books over time"
        caption="Rolling correlation between two books. A full-sample rho near zero can hide windows where the pair moves together — size for the peaks, not the average."
      />

      <P>
        <Strong>Next:</Strong> a combined book still has to survive a hard drawdown budget —{" "}
        <A href="/tutorials/prop-firm-capital">Prop-firm and capital</A> covers sizing to a drawdown limit and
        Monte-Carlo pass rates for funded-account evaluations.
      </P>
    </>
  );
}
