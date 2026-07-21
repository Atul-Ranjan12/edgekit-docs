import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Time-series analysis for OHLC" };

export default function Page() {
  return (
    <>
      <H1>Time-series analysis for OHLC</H1>
      <Lead>
        Before you fit a rule to a price series, you owe it one honest question: what kind of series is this? A trend
        model on a random walk and a reversion model on a runaway trend both lose money for the same reason — a
        mismatch between the strategy&apos;s assumption and the data&apos;s actual memory structure. This chapter is the
        toolkit for reading that structure: stationarity, the trend-vs-reversion tests, autocorrelation, volatility
        clustering, and seasonality — each with the exact <Code>edgekit.timeseries</Code> call.
      </Lead>

      <Callout kind="note" title="Run stats on returns, not prices">
        Almost every statistic in this chapter assumes the series is stationary — its mean, variance, and
        autocorrelation don&apos;t drift over time. A raw price series is <em>not</em> stationary, so you transform it
        first (log returns, or differencing) and analyse the transformed series. The one exception is the random-walk
        tests themselves (variance ratio, ADF), which take the level series precisely to ask whether it has a trend.
      </Callout>

      <H2>Why stationarity matters</H2>
      <P>
        A stationary series is one whose statistical fingerprint stays put: the mean you estimate on the first half is
        the mean you&apos;ll see in the second half, the variance is stable, and the correlation between two points
        depends only on the gap between them, not on where they sit in time. That is the assumption baked into nearly
        every estimator — a rolling mean, a z-score, a regression coefficient — because each one pools information
        across time as if the underlying process weren&apos;t moving under your feet.
      </P>
      <P>
        A price series breaks that assumption in the most fundamental way. The canonical model of a price is a{" "}
        <Strong>random walk</Strong>: each price is the last price plus an unpredictable shock.
      </P>
      <Math>{"P_t = P_{t-1} + \\varepsilon_t, \\qquad \\varepsilon_t \\sim \\text{iid}(0, \\sigma^2)"}</Math>
      <P>
        The variance of <MathInline>{"P_t"}</MathInline> grows without bound as <MathInline>{"t"}</MathInline>{" "}
        increases (it is <MathInline>{"t\\sigma^2"}</MathInline>), so there is no fixed mean to revert to and no stable
        variance to standardise by. Compute a z-score of a random walk and the &ldquo;distance from the mean&rdquo; you
        get is meaningless, because the mean itself is wandering. This is why a strategy fit to price <em>levels</em>{" "}
        so often looks brilliant in-sample and dies out-of-sample: it learned the sample&apos;s particular wander, not a
        repeatable relationship.
      </P>
      <P>
        The fix is to <Strong>stationarise</Strong>. Differencing the series once removes the stochastic trend, and for
        prices the natural first difference is the log return:
      </P>
      <Math>{"r_t = \\log P_t - \\log P_{t-1} = \\Delta \\log P_t"}</Math>
      <P>
        Returns hover around a stable mean of roughly zero with a (mostly) stable variance — a series statistics can
        actually work on. In edgekit that transform is one call, and the differencing primitive is there for higher
        orders or non-price series:
      </P>
      <CodeBlock code={`import edgekit as ek

rets = ek.timeseries.log_returns(bars.close)   # stationarise prices -> returns
diff = ek.timeseries.difference(some_series, d=1)  # general d-th order difference`} />
      <ChartFigure
        name="tut/stationary_vs_randomwalk"
        alt="A non-stationary random-walk price path beside its stationary return series"
        caption="Top: a random-walk price wanders with ever-growing variance and no fixed mean. Bottom: its log returns fluctuate around a stable zero mean — the same information, now stationary and safe to analyse."
      />

      <H2>Random walk vs mean-reversion: three tests</H2>
      <P>
        Once you can transform a series, the first question worth money is which of three worlds it lives in: a{" "}
        <Strong>random walk</Strong> (unpredictable — no edge from direction), a <Strong>trending</Strong> world (moves
        persist, so momentum pays), or a <Strong>mean-reverting</Strong> world (moves overshoot and snap back, so fading
        pays). Three complementary tests triangulate the answer.
      </P>

      <H3>The variance ratio</H3>
      <P>
        The Lo-MacKinlay variance ratio exploits a simple fact: for a random walk, variance grows linearly with the
        horizon. So the variance of <MathInline>{"k"}</MathInline>-period returns should be exactly{" "}
        <MathInline>{"k"}</MathInline> times the variance of one-period returns. The ratio of the two is the statistic:
      </P>
      <Math>{"VR(k) = \\frac{\\operatorname{Var}(r_t^{(k)})}{k \\cdot \\operatorname{Var}(r_t^{(1)})}"}</Math>
      <P>
        Read it directly: <MathInline>{"VR \\approx 1"}</MathInline> is a random walk;{" "}
        <MathInline>{"VR > 1"}</MathInline> means multi-period moves are <em>larger</em> than the random-walk baseline —
        positive autocorrelation, i.e. trend; <MathInline>{"VR < 1"}</MathInline> means they are damped — negative
        autocorrelation, i.e. mean reversion. Sweep <MathInline>{"k"}</MathInline> to see at which horizon the structure
        lives.
      </P>
      <CodeBlock code={`vr2 = ek.timeseries.variance_ratio(bars.close, k=2)
vr5 = ek.timeseries.variance_ratio(bars.close, k=5)
# vr > 1 -> trending on that horizon; < 1 -> mean-reverting; ~1 -> random walk`} />

      <H3>The Hurst exponent</H3>
      <P>
        The Hurst exponent measures the same persistence from the scaling of dispersion across lags, boiling it into a
        single number in <MathInline>{"(0,1)"}</MathInline>:
      </P>
      <Ul>
        <Li><MathInline>{"H \\approx 0.5"}</MathInline> — a random walk (independent increments).</Li>
        <Li><MathInline>{"H > 0.5"}</MathInline> — persistent / long-memory: an up move tends to be followed by another up move (trend).</Li>
        <Li><MathInline>{"H < 0.5"}</MathInline> — anti-persistent: moves tend to reverse (mean reversion).</Li>
      </Ul>
      <CodeBlock code={`h = ek.timeseries.hurst_exponent(bars.close, max_lag=50)
# ~0.5 random walk | >0.5 persistent/trend | <0.5 mean-reverting`} />

      <H3>The ADF test</H3>
      <P>
        The Augmented Dickey-Fuller test asks the sharp version of the stationarity question: does the series have a{" "}
        <em>unit root</em> (the random-walk coefficient of exactly 1)? It regresses the change on the level and tests
        whether the level&apos;s coefficient <MathInline>{"\\gamma"}</MathInline> is zero:
      </P>
      <Math>{"\\Delta x_t = \\alpha + \\gamma\\, x_{t-1} + \\sum_{i=1}^{p} \\delta_i \\Delta x_{t-i} + \\varepsilon_t"}</Math>
      <P>
        The null is <MathInline>{"\\gamma = 0"}</MathInline> (a unit root — non-stationary). The test returns a{" "}
        <em>t-statistic</em> on <MathInline>{"\\gamma"}</MathInline>; because a stationary series pulls itself back
        toward its mean, <MathInline>{"\\gamma"}</MathInline> is negative, and a <em>sufficiently negative</em> t-stat
        rejects the unit root. The rule of thumb: below about <MathInline>{"-2.86"}</MathInline> is significant at 5%,
        below <MathInline>{"-3.43"}</MathInline> at 1%. A price level typically sits near zero (fails to reject —
        non-stationary); its returns sit far below the threshold (stationary).
      </P>
      <Callout kind="warn" title="A t-stat, not a p-value">
        <Code>adf_stat</Code> returns the raw t-statistic only — edgekit carries no scipy to look up an exact p-value.
        Compare the number to the MacKinnon critical values above. More negative = more clearly stationary.
      </Callout>
      <CodeBlock code={`adf_price = ek.timeseries.adf_stat(bars.close)          # near 0 -> non-stationary
adf_ret   = ek.timeseries.adf_stat(ek.timeseries.log_returns(bars.close))  # very negative -> stationary`} />

      <Callout kind="tip" title="Scenario: is this series mean-reverting? A two-series walk-through">
        <P>
          You have two candidate series on the desk and want to know, before writing a single rule, which world each
          lives in. Series A is the <Strong>BTCUSDT H4 close</Strong>. Series B is a <Strong>constructed spread</Strong> —
          the residual of one index regressed on a close cousin (the stat-arb setup). You run the same three probes on
          each:
        </P>
        <CodeBlock code={`# Series A: BTC price level
ek.timeseries.variance_ratio(btc.close, k=5)   # -> 1.28   (>1: multi-bar moves amplify -> trend)
ek.timeseries.hurst_exponent(btc.close, 50)    # -> 0.58   (>0.5: persistent)
ek.timeseries.adf_stat(btc.close)              # -> -1.4   (near 0: unit root, can't reject random walk)

# Series B: the mean-reverting spread
ek.timeseries.variance_ratio(spread, k=5)      # -> 0.61   (<1: multi-bar moves damp -> reversion)
ek.timeseries.hurst_exponent(spread, 50)       # -> 0.34   (<0.5: anti-persistent)
ek.timeseries.adf_stat(spread)                 # -> -3.9   (well below -3.43: reject unit root, stationary)`} />
        <P>
          Read together the verdict is unambiguous. Series A: VR above 1, Hurst above 0.5, ADF too shallow to reject a
          random walk — a <em>trending / drifting</em> series where a fade would get run over and a momentum idea is at
          least worth testing. Series B: VR below 1, Hurst below 0.5, ADF firmly past the 1% critical value — a genuinely
          <em> mean-reverting</em> spread you can build a z-score fade on. Three independent lenses agreeing is what turns
          a hunch into a prior. (These numbers are illustrative of the pattern, not a claim about any live instrument.)
        </P>
      </Callout>

      <H3>One call for the verdict</H3>
      <P>
        You rarely want to eyeball three numbers by hand. <Code>stationarity_report</Code> runs the ADF stat, the
        variance ratio, the Hurst exponent, and lag-1 autocorrelation together and returns a single verdict —{" "}
        <Code>&quot;trending&quot;</Code>, <Code>&quot;mean-reverting&quot;</Code>, or{" "}
        <Code>&quot;random-walk&quot;</Code> — plus the raw components so you can see <em>why</em>.
      </P>
      <CodeBlock code={`rep = ek.timeseries.stationarity_report(bars.close)
# {"adf_stat": ..., "variance_ratio": ..., "hurst": ...,
#  "autocorr_lag1": ..., "verdict": "trending" | "mean-reverting" | "random-walk"}
if rep["verdict"] == "random-walk":
    print("no directional edge here — don't fit a trend or reversion rule")`} />
      <Callout kind="note" title="A verdict is a prior, not a strategy">
        A &ldquo;trending&rdquo; verdict says a momentum idea is <em>worth testing</em>, not that it works — the series
        can still fail the full validation gauntlet on costs or out-of-sample. Treat the report as a filter on where to
        spend your research time, then prove the edge properly in <A href="/tutorials/the-gauntlet">Part IV</A>.
      </Callout>

      <H2>Autocorrelation: the memory of a series</H2>
      <P>
        The variance ratio and Hurst exponent both summarise <em>autocorrelation</em> — the correlation of a series
        with a lagged copy of itself. The ACF and PACF show it lag by lag, which is how you read the actual memory
        structure rather than a single scalar.
      </P>
      <P>
        The <Strong>autocorrelation function (ACF)</Strong> at lag <MathInline>{"k"}</MathInline> is the correlation
        between <MathInline>{"r_t"}</MathInline> and <MathInline>{"r_{t-k}"}</MathInline>. By construction{" "}
        <MathInline>{"\\text{ACF}(0) = 1"}</MathInline>. A slow, gradual decay signals persistence; a sharp cut-off
        after a few lags signals short-memory (moving-average) structure; bars that are all inside the noise band signal
        white noise — no linear predictability.
      </P>
      <Math>{"\\rho_k = \\frac{\\sum_{t} (r_t - \\bar r)(r_{t-k} - \\bar r)}{\\sum_{t} (r_t - \\bar r)^2}"}</Math>
      <P>
        The <Strong>partial autocorrelation function (PACF)</Strong> gives the correlation at lag{" "}
        <MathInline>{"k"}</MathInline> <em>after</em> removing the influence of all shorter lags. The division of labour
        is the classic Box-Jenkins reading: the PACF cutting off after lag <MathInline>{"p"}</MathInline> suggests an
        AR(p) process, while the ACF cutting off after lag <MathInline>{"q"}</MathInline> suggests an MA(q).
      </P>
      <P>
        Significance is judged against the white-noise band. Under the null of no autocorrelation, each coefficient is
        approximately normal with standard error <MathInline>{"1/\\sqrt{n}"}</MathInline>, so the two-sided 95% band is:
      </P>
      <Math>{"\\pm \\frac{1.96}{\\sqrt{n}}"}</Math>
      <P>
        Bars poking outside that band are the ones worth a second look; bars inside it are noise. edgekit computes both
        functions directly (the PACF via Durbin-Levinson recursion — no statsmodels):
      </P>
      <CodeBlock code={`ac = ek.timeseries.acf(rets, nlags=40)     # ac[0] == 1
pc = ek.timeseries.pacf(rets, nlags=40)    # partial autocorrelations
band = 1.96 / len(rets) ** 0.5             # the +/- significance band

lag1 = ek.timeseries.autocorr(rets, lag=1) # single-lag convenience form`} />
      <P>
        And to ask &ldquo;is there <em>any</em> autocorrelation across the first several lags at all?&rdquo; in one
        shot, the Ljung-Box portmanteau test pools them:
      </P>
      <CodeBlock code={`lb = ek.timeseries.ljung_box(rets, lags=10)
# lb == {"stat": Q, "dof": 10}; compare Q to a chi-squared(dof) — a large Q rejects white noise`} />
      <ChartFigure
        name="tut/acf_plot"
        alt="ACF and PACF of a return series with the significance band"
        caption="ACF (top) and PACF (bottom) with the +/-1.96/sqrt(n) band shaded. Bars inside the band are indistinguishable from white noise; a spike outside it at a given lag is where predictable structure lives."
      />

      <H2>Volatility clustering: returns are not iid</H2>
      <P>
        Here is the twist that shapes almost every real strategy. Run the ACF on <em>returns</em> and you usually find
        very little — direction is close to unpredictable. Run it on <em>squared</em> (or absolute) returns and you find
        strong, slowly-decaying autocorrelation. That is <Strong>volatility clustering</Strong>: large moves cluster
        with large moves and calm with calm, even when the <em>sign</em> of the next move is unpredictable. The famous
        one-liner is that returns are &ldquo;serially uncorrelated but not independent.&rdquo;
      </P>
      <P>
        This is the empirical fact GARCH-family models formalise — tomorrow&apos;s variance is a weighted blend of a
        long-run level, yesterday&apos;s variance, and yesterday&apos;s squared shock — and it is why a single fixed
        stop distance is fragile: the size of a &ldquo;normal&rdquo; move is itself time-varying. edgekit gives you the
        practical estimators without the full GARCH fit. The RiskMetrics EWMA recursion is the workhorse:
      </P>
      <Math>{"\\sigma_t^2 = \\lambda\\, \\sigma_{t-1}^2 + (1-\\lambda)\\, r_t^2, \\qquad \\lambda = 0.94"}</Math>
      <P>
        Because recent squared returns carry more weight, EWMA vol turns on a dime when a shock hits — much faster than
        a flat rolling window, which dilutes the shock across the whole lookback. Use it to size risk in volatility
        units so a stop widens in stress and tightens in calm.
      </P>
      <CodeBlock code={`ewma = ek.timeseries.ewma_volatility(rets, lam=0.94)     # RiskMetrics, fast-reacting
roll = ek.timeseries.rolling_volatility(rets, 20, periods_per_year=252)  # annualised
rv   = ek.timeseries.realized_vol(rets, window=20)       # vol actually delivered

# confirm the clustering: autocorrelation of SQUARED returns is strongly positive
lb_sq = ek.timeseries.ljung_box(rets ** 2, lags=10)`} />
      <P>
        <Strong>Scenario (why a fixed stop breaks).</Strong> On BTCUSDT you run <Code>ljung_box(rets, 10)</Code> and get
        Q ≈ 9 against a chi-squared(10) — inside the noise band, direction is unpredictable. Then you run it on{" "}
        <Code>rets ** 2</Code> and get Q ≈ 140 — a screaming rejection of white noise. Same series, opposite verdicts:
        the <em>sign</em> of tomorrow&apos;s move is a coin flip, but its <em>size</em> is highly forecastable. That is
        why the EWMA vol you&apos;d have sized a stop off in the calm June regime (say 0.9% daily) is useless the day a
        3% shock lands — the estimate reprices within a bar or two, and a stop pinned to the old number gets swept.
      </P>
      <ChartFigure
        name="tut/vol_clustering"
        alt="Return series showing bursts of high and low volatility with an EWMA volatility overlay"
        caption="Volatility clusters: quiet stretches and violent stretches group together. The EWMA estimate (overlay) tracks the regime, spiking as a shock arrives and decaying through the calm that follows."
      />

      <H2>Seasonality &amp; decomposition</H2>
      <P>
        Some series carry a repeating calendar rhythm — a day-of-week pattern in equity-index returns, an
        hour-of-session pattern in intraday volume. <Code>seasonal_decompose</Code> splits a series into three additive
        parts over a fixed period so you can see the cycle on its own:
      </P>
      <Math>{"x_t = \\text{trend}_t + \\text{seasonal}_t + \\text{resid}_t"}</Math>
      <P>
        The <em>trend</em> is the slow drift, the <em>seasonal</em> component is the repeating cycle of length{" "}
        <Code>period</Code>, and the <em>residual</em> is what neither explains. If the seasonal component is small
        relative to the residual, there is no reliable cycle to trade — the honest and common outcome.
      </P>
      <CodeBlock code={`dec = ek.timeseries.seasonal_decompose(daily_ret, period=5)   # weekly cycle on daily bars
# dec == {"trend": Series, "seasonal": Series, "resid": Series}
dec["seasonal"]   # the repeating component; compare its scale to dec["resid"]`} />
      <P>
        <Strong>Scenario (a &ldquo;Monday effect&rdquo; that isn&apos;t).</Strong> You decompose daily US500 returns with
        <Code> period=5</Code> and the seasonal component shows Monday averaging −0.06% and Wednesday +0.05%. Tempting.
        But the residual&apos;s daily standard deviation is 1.1% — the seasonal swing is one-twentieth the noise it swims
        in. At the desk that means the &ldquo;pattern&rdquo; would be buried by a single ordinary day&apos;s move: not a
        tradeable cycle, just the sample&apos;s particular wobble. A seasonal component only earns a second look when its
        amplitude is a meaningful fraction of the residual, which is the honest-and-usually-disappointing outcome here.
      </P>
      <ChartFigure
        name="tut/regime_shift"
        alt="A series decomposed into trend, seasonal, and residual components"
        caption="An additive decomposition: the slow trend, the repeating seasonal cycle, and the residual noise. A seasonal component that is dwarfed by the residual is not a tradeable pattern."
      />

      <Callout kind="danger" title="Analysis describes the past — it does not forecast the future">
        Every statistic here is estimated on a finite historical sample. A verdict, an ACF spike, a seasonal bump can
        all be artefacts of the particular window you looked at. The tools tell you where structure <em>might</em> be;
        whether it survives is decided out-of-sample, under costs, in <A href="/tutorials/the-gauntlet">the validation
        gauntlet</A>. Never size a position off a diagnostic alone.
      </Callout>

      <H2>Where this leads</H2>
      <P>
        You now have the vocabulary to describe a series honestly: stationary or not, trending or reverting or random,
        which lags carry memory, whether volatility clusters, whether a calendar cycle exists. The next step is turning
        that description into <em>inputs a strategy can act on</em> — without smuggling the future into the past.
      </P>
      <P>
        Next: <A href="/tutorials/feature-engineering">Feature engineering</A> — how <Code>make_features</Code> turns
        raw OHLC into a causal feature matrix, and the leakage traps that quietly destroy otherwise-sound models.
      </P>
    </>
  );
}
