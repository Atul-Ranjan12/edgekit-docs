import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.timeseries" };

export default function TimeseriesPage() {
  return (
    <>
      <H1>edgekit.timeseries</H1>
      <Lead>
        Time-series analysis and causal feature engineering — the diagnostics you run <em>before</em> you build a
        strategy (is this series trending, mean-reverting, or a random walk?) and the machinery that turns raw OHLC into
        a leakage-free feature matrix a rule or a model can read.
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> Return and volatility construction (<Code>returns</Code>,{" "}
        <Code>log_returns</Code>, <Code>rolling_volatility</Code>, <Code>ewma_volatility</Code>,{" "}
        <Code>realized_vol</Code>), the autocorrelation / persistence battery (<Code>acf</Code>, <Code>pacf</Code>,{" "}
        <Code>autocorr</Code>, <Code>ljung_box</Code>, <Code>variance_ratio</Code>, <Code>hurst_exponent</Code>),
        stationarity testing (<Code>adf_stat</Code>, <Code>stationarity_report</Code>), transforms
        (<Code>difference</Code>, <Code>seasonal_decompose</Code>), and the causal feature builders
        (<Code>make_features</Code>, <Code>add_lags</Code>).
      </P>

      <Callout kind="note" title="numpy + pandas only — no statsmodels, no scipy">
        <P>
          Every estimator here is implemented from scratch on top of numpy and pandas: the ACF/PACF (Durbin-Levinson),
          the Lo-MacKinlay variance ratio, the Hurst exponent, and the ADF t-statistic. That keeps
          edgekit dependency-light and the arithmetic auditable, at the cost of the extras a full stats package would
          give you (p-value tables, lag-order selection). Compare the returned statistics to the standard critical
          values noted below.
        </P>
      </Callout>

      <H2>Returns &amp; volatility</H2>

      <H3>returns</H3>
      <P>
        Period-over-period returns from a price series — simple by default, log when <Code>log=True</Code>. The first
        element is <Code>nan</Code> (no prior price to difference against). Simple returns aggregate across assets;
        log returns aggregate across time — pick the one that matches what you are summing.
      </P>
      <CodeBlock code={`returns(prices, log=False) -> np.ndarray   # rets[0] = nan`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">prices</Code>, "array / Series", "—", "The price level series (e.g. close)."],
          [<Code key="b">log</Code>, "bool", "False", "False = simple pct-change; True = log returns."],
        ]}
      />
      <P><Strong>Returns:</Strong> a numpy array aligned to <Code>prices</Code>, with <Code>[0] = nan</Code>.</P>
      <CodeBlock code={`import edgekit as ek
rets = ek.timeseries.returns(bars.close)            # simple
lrets = ek.timeseries.returns(bars.close, log=True) # log`} />

      <H3>log_returns</H3>
      <P>
        Log returns as a named shortcut for <Code>returns(prices, log=True)</Code>. Additive across
        time and roughly symmetric, which is why most statistical machinery (vol, ACF, stationarity tests) is run on
        log returns rather than raw prices.
      </P>
      <CodeBlock code={`log_returns(prices) -> np.ndarray          # [0] = nan`} />
      <Ul>
        <Li><Code>prices</Code> — the price level series.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of log returns, <Code>[0] = nan</Code>.</P>

      <H3>rolling_volatility</H3>
      <P>
        Rolling standard deviation of returns over <Code>window</Code> bars — the trailing estimate of how big a normal
        move is. Pass <Code>periods_per_year</Code> to annualise (multiply by <Code>sqrt(periods_per_year)</Code>), so a
        daily series becomes a comparable annual vol.
      </P>
      <CodeBlock code={`rolling_volatility(rets, window=20, periods_per_year=None) -> np.ndarray`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">rets</Code>, "array", "—", "The return series (e.g. from returns())."],
          [<Code key="b">window</Code>, "int", "20", "Rolling lookback in bars."],
          [<Code key="c">periods_per_year</Code>, "int | None", "None", "If given, annualise by sqrt(periods_per_year)."],
        ]}
      />
      <P><Strong>Returns:</Strong> a numpy array of rolling vol (leading positions NaN until the window fills).</P>
      <CodeBlock code={`vol = ek.timeseries.rolling_volatility(rets, 20, periods_per_year=252)  # annualised daily vol`} />

      <H3>ewma_volatility</H3>
      <P>
        RiskMetrics exponentially-weighted volatility: variance updated as{" "}
        <Code>{"sigma2[t] = lam*sigma2[t-1] + (1-lam)*r[t]^2"}</Code>. Reacts to a vol shock faster than a flat rolling
        window because recent squared returns carry more weight. <Code>lam=0.94</Code> is the RiskMetrics daily default.
      </P>
      <CodeBlock code={`ewma_volatility(rets, lam=0.94) -> np.ndarray`} />
      <Ul>
        <Li><Code>rets</Code> — the return series.</Li>
        <Li><Code>lam</Code> — decay factor in (0,1); larger = longer memory (0.94 daily, ~0.97 monthly).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of EWMA volatility (per-bar sigma).</P>

      <H3>realized_vol</H3>
      <P>
        Realized volatility over <Code>window</Code> bars — the root of summed squared returns, the backward-looking
        volatility actually delivered over the window. The empirical counterpart to a volatility forecast.
      </P>
      <CodeBlock code={`realized_vol(rets, window=20) -> np.ndarray`} />
      <Ul>
        <Li><Code>rets</Code> — the return series.</Li>
        <Li><Code>window</Code> — the lookback (default 20).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of realized vol.</P>

      <H2>Autocorrelation &amp; persistence</H2>

      <H3>acf</H3>
      <P>
        Autocorrelation function — the correlation of the series with itself at lags <Code>0..nlags</Code>.
        <Code>acf[0]</Code> is always 1. A slow decay signals persistence (trend); a sharp cut-off after a few lags
        signals short-memory (MA) structure. Compare each bar to the significance band{" "}
        <Code>±1.96/sqrt(n)</Code> — spikes outside it are significant.
      </P>
      <CodeBlock code={`acf(x, nlags=40) -> np.ndarray             # acf[0] = 1`} />
      <Ul>
        <Li><Code>x</Code> — the series (usually returns, not prices).</Li>
        <Li><Code>nlags</Code> — number of lags to compute (default 40).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of length <Code>nlags+1</Code>, <Code>[0]=1</Code>.</P>
      <CodeBlock code={`ac = ek.timeseries.acf(rets, nlags=40)
band = 1.96 / len(rets)**0.5   # significance band`} />

      <H3>pacf</H3>
      <P>
        Partial autocorrelation function via Durbin-Levinson — the correlation at lag <Code>k</Code> after removing
        the effect of all shorter lags. Where the ACF gauges MA order, the PACF gauges AR order: a PACF that cuts off
        after lag <Code>p</Code> points to an AR(p) process.
      </P>
      <CodeBlock code={`pacf(x, nlags=40) -> np.ndarray            # Durbin-Levinson`} />
      <Ul>
        <Li><Code>x</Code> — the series.</Li>
        <Li><Code>nlags</Code> — number of lags (default 40).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of partial autocorrelations, <Code>[0]=1</Code>.</P>

      <H3>autocorr</H3>
      <P>
        Scalar autocorrelation at a single <Code>lag</Code> — the convenience form when you only need one number (e.g.
        lag-1 autocorrelation of returns, the sign of which hints trend vs reversal). It is the value{" "}
        <Code>stationarity_report</Code> stores under <Code>autocorr_lag1</Code>.
      </P>
      <CodeBlock code={`autocorr(x, lag=1) -> float`} />
      <Ul>
        <Li><Code>x</Code> — the series.</Li>
        <Li><Code>lag</Code> — the lag to evaluate (default 1).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a <Code>float</Code> autocorrelation coefficient.</P>

      <H3>ljung_box</H3>
      <P>
        Ljung-Box portmanteau test for joint autocorrelation across the first <Code>lags</Code> lags — one number that
        answers &ldquo;is there <em>any</em> linear dependence here, or is this white noise?&rdquo;. Run it on returns
        (are they predictable?) and on squared returns (is there volatility clustering?).
      </P>
      <CodeBlock code={`ljung_box(x, lags=10) -> dict`} />
      <Ul>
        <Li><Code>x</Code> — the series.</Li>
        <Li><Code>lags</Code> — number of lags to pool (default 10).</Li>
      </Ul>
      <P>
        <Strong>Returns:</Strong> a <Code>dict</Code> with keys{" "}
        <Code>&quot;stat&quot;</Code> (the Q statistic) and <Code>&quot;dof&quot;</Code> (degrees of freedom = lags).
        Compare <Code>stat</Code> to a chi-squared distribution with <Code>dof</Code> degrees of freedom — a large{" "}
        <Code>stat</Code> rejects white noise.
      </P>
      <CodeBlock code={`lb = ek.timeseries.ljung_box(rets, lags=10)
# lb == {"stat": ..., "dof": 10}; compare stat to chi2(dof)`} />

      <H3>variance_ratio</H3>
      <P>
        Lo-MacKinlay variance ratio on log prices: the variance of <Code>k</Code>-period returns divided by{" "}
        <Code>k×</Code> the variance of 1-period returns. Under a random walk this is <Code>1</Code>; positive
        autocorrelation (trend) inflates it above 1, mean-reversion pulls it below 1.
      </P>
      <CodeBlock code={`variance_ratio(prices, k=2) -> float       # >1 trend, <1 revert, ~1 random walk`} />
      <Ul>
        <Li><Code>prices</Code> — the <em>price</em> series (the function takes logs internally).</Li>
        <Li><Code>k</Code> — the aggregation horizon (default 2).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a <Code>float</Code> variance ratio.</P>
      <CodeBlock code={`vr = ek.timeseries.variance_ratio(bars.close, k=5)   # >1 => trending on a 5-bar horizon`} />

      <H3>hurst_exponent</H3>
      <P>
        The Hurst exponent from a rescaled-range / dispersion fit across lags. <Code>≈0.5</Code> is a random walk,{" "}
        <Code>{">0.5"}</Code> is persistent (trending, long memory), <Code>{"<0.5"}</Code> is anti-persistent
        (mean-reverting). A model-free companion to the variance ratio.
      </P>
      <CodeBlock code={`hurst_exponent(x, max_lag=50) -> float     # ~0.5 walk, >0.5 persist, <0.5 revert`} />
      <Ul>
        <Li><Code>x</Code> — the series (prices or a spread).</Li>
        <Li><Code>max_lag</Code> — the largest lag in the scaling fit (default 50).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a <Code>float</Code> Hurst exponent, typically in (0,1).</P>

      <H2>Stationarity</H2>

      <H3>adf_stat</H3>
      <P>
        The Augmented Dickey-Fuller t-statistic — tests the null of a unit root (non-stationary). A sufficiently
        negative statistic rejects the unit root and calls the series stationary. Rule of thumb:{" "}
        <Code>{"< -2.86"}</Code> is significant at the 5% level, <Code>{"< -3.43"}</Code> at 1%.
      </P>
      <CodeBlock code={`adf_stat(x, lags=1) -> float               # < ~-2.86 (5%) => stationary`} />
      <Ul>
        <Li><Code>x</Code> — the series to test.</Li>
        <Li><Code>lags</Code> — number of augmenting lagged-difference terms (default 1).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a <Code>float</Code> ADF t-statistic (more negative = more stationary).</P>
      <Callout kind="warn" title="It is a statistic, not a p-value">
        <Code>adf_stat</Code> returns the raw t-stat only — there is no scipy on the dependency list to look up an exact
        p-value. Compare it against the standard MacKinnon critical values above.
      </Callout>

      <H3>stationarity_report</H3>
      <P>
        A one-call diagnostic that runs the ADF test, the variance ratio, the Hurst exponent, and lag-1 autocorrelation
        together and folds them into a single verdict — the fastest way to characterise a fresh series before you decide
        whether to build a trend model, a reversion model, or nothing.
      </P>
      <CodeBlock code={`stationarity_report(x) -> dict`} />
      <Ul>
        <Li><Code>x</Code> — the series (price or return).</Li>
      </Ul>
      <P>
        <Strong>Returns:</Strong> a <Code>dict</Code> with keys <Code>&quot;adf_stat&quot;</Code>,{" "}
        <Code>&quot;variance_ratio&quot;</Code>, <Code>&quot;hurst&quot;</Code>,{" "}
        <Code>&quot;autocorr_lag1&quot;</Code>, and <Code>&quot;verdict&quot;</Code> — where <Code>verdict</Code> is one
        of <Code>&quot;trending&quot;</Code>, <Code>&quot;mean-reverting&quot;</Code>, or{" "}
        <Code>&quot;random-walk&quot;</Code>.
      </P>
      <CodeBlock code={`rep = ek.timeseries.stationarity_report(bars.close)
rep["verdict"]   # "trending" | "mean-reverting" | "random-walk"`} />

      <H2>Transforms</H2>

      <H3>difference</H3>
      <P>
        The <Code>d</Code>-th order difference of a series — the standard way to stationarise a level series (a first
        difference of prices is close cousin to returns). Differencing removes a stochastic trend so downstream stats
        stop lying to you.
      </P>
      <CodeBlock code={`difference(x, d=1) -> np.ndarray`} />
      <Ul>
        <Li><Code>x</Code> — the series.</Li>
        <Li><Code>d</Code> — order of differencing (default 1).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of the differenced series (shorter / NaN-padded by <Code>d</Code>).</P>

      <H3>seasonal_decompose</H3>
      <P>
        Classic additive decomposition into trend, seasonal, and residual components over a fixed <Code>period</Code> —
        useful for spotting a day-of-week or intraday-session cycle in returns or volume.
      </P>
      <CodeBlock code={`seasonal_decompose(series, period) -> dict`} />
      <Ul>
        <Li><Code>series</Code> — a pandas Series with a meaningful index.</Li>
        <Li><Code>period</Code> — the seasonal period in bars (e.g. 5 for weekly on daily data).</Li>
      </Ul>
      <P>
        <Strong>Returns:</Strong> a <Code>dict</Code> with keys <Code>&quot;trend&quot;</Code>,{" "}
        <Code>&quot;seasonal&quot;</Code>, and <Code>&quot;resid&quot;</Code> — each a pandas Series aligned to the
        input.
      </P>
      <CodeBlock code={`dec = ek.timeseries.seasonal_decompose(daily_ret, period=5)
dec["seasonal"]   # the repeating weekly component`} />

      <H2>Feature engineering</H2>

      <Callout kind="danger" title="make_features is causal — do not re-introduce look-ahead">
        <P>
          <Strong><Code>make_features</Code> shifts every column by one bar before returning it</Strong>, so row{" "}
          <Code>i</Code> holds only information known at the close of bar <Code>i-1</Code>. That is deliberate: the
          feature matrix is safe to hand straight to a rule or a model without leaking the current bar.
        </P>
        <P>
          The corollary: <Strong>do not add your own un-lagged columns</Strong> next to it, and do not un-shift what it
          gives you. Mixing a causal matrix with a same-bar feature is the classic way look-ahead sneaks back into a
          model that otherwise looked clean. See <A href="/docs/concepts/causality">the causality contract</A>.
        </P>
      </Callout>

      <H3>make_features</H3>
      <P>
        Turn an OHLC frame into a causal feature matrix in one call: returns, rolling volatility, momentum, RSI, ATR%,
        distance-from-moving-average z-scores, range%, calendar dummies, and lagged returns — every column shifted one
        bar. Internally it reuses <Code>atr</Code>, <Code>rsi</Code>, and <Code>zscore</Code> from{" "}
        <A href="/docs/api/indicators">edgekit.indicators</A>, so a feature means exactly what the indicator of the same
        name means.
      </P>
      <CodeBlock code={`make_features(df, windows=(5, 20, 60), lags=(1, 2, 3, 5), calendar=True) -> pd.DataFrame`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">df</Code>, "DataFrame", "—", "OHLC frame (open/high/low/close, optionally volume)."],
          [<Code key="b">windows</Code>, "tuple", "(5, 20, 60)", "Lookbacks for rolling vol / momentum / MA-distance."],
          [<Code key="c">lags</Code>, "tuple", "(1, 2, 3, 5)", "Return lags to include as columns."],
          [<Code key="d">calendar</Code>, "bool", "True", "Add day-of-week / month calendar features."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a pandas <Code>DataFrame</Code> of causal features indexed like <Code>df</Code> (every
        column shifted one bar; leading rows contain NaN until the longest window fills — drop or impute before
        modelling).
      </P>
      <CodeBlock code={`X = ek.timeseries.make_features(bars, windows=(10, 50), lags=(1, 2, 3))
X = X.dropna()   # trim the warm-up rows`} />

      <H3>add_lags</H3>
      <P>
        Append lagged copies of chosen columns to a frame — the low-level primitive behind the <Code>lags</Code>
        argument of <Code>make_features</Code>, handy when you want lagged versions of a specific signal you built
        yourself. Every added column is shifted, so it stays causal.
      </P>
      <CodeBlock code={`add_lags(df, cols, lags=(1, 2, 3)) -> pd.DataFrame`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">df</Code>, "DataFrame", "—", "The frame to extend."],
          [<Code key="b">cols</Code>, "list[str]", "—", "Column names to lag."],
          [<Code key="c">lags</Code>, "tuple", "(1, 2, 3)", "Which lags to add per column."],
        ]}
      />
      <P><Strong>Returns:</Strong> a new <Code>DataFrame</Code> with one extra column per (col, lag) pair.</P>
      <CodeBlock code={`df = ek.timeseries.add_lags(df, ["ret", "vol"], lags=(1, 2, 5))`} />

      <H2>Dynamic hedging &amp; regime models</H2>

      <P>
        The estimators above characterise a single series. This block models how two series co-move and
        how a series switches regime: a Kalman-filtered dynamic hedge ratio, the Ornstein-Uhlenbeck fit
        that a mean-reverting spread lives or dies on, a GARCH(1,1) volatility model, and a two-state
        Gaussian HMM. All numpy — no filterpy, arch, or hmmlearn.
      </P>

      <Callout kind="note" title="These are fitted models — check convergence, don't trust blindly">
        <P>
          Unlike the closed-form diagnostics above, these run iterative estimation (Kalman recursion,
          MLE, Baum-Welch). Sanity-check the outputs: a GARCH <Code>persistence</Code> at or above{" "}
          <Code>1</Code> is a non-stationary fit, an OU <Code>half_life</Code> longer than your holding
          horizon means the spread reverts too slowly to trade, and HMM state labels are arbitrary (state
          0 vs 1 is not fixed across runs — key off <Code>means</Code> / <Code>vars</Code>).
        </P>
      </Callout>

      <H3>kalman_hedge</H3>
      <P>
        A Kalman filter that estimates a <em>time-varying</em> hedge ratio between two series — the
        dynamic-beta replacement for a static OLS hedge. As the relationship drifts, <Code>beta</Code>{" "}
        tracks it, and <Code>spread</Code> is the residual you trade for mean reversion. The workhorse
        behind a pairs / stat-arb spread.
      </P>
      <CodeBlock code={`kalman_hedge(y, x, delta=1e-4, r=1.0) -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">y</Code>, "array (T,)", "—", "The dependent series (the leg you hedge)."],
          [<Code key="b">x</Code>, "array (T,)", "—", "The explanatory series (the hedging leg)."],
          [<Code key="c">delta</Code>, "float", "1e-4", "State-transition noise; larger = beta adapts faster."],
          [<Code key="d">r</Code>, "float", "1.0", "Observation-noise variance."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a <Code>dict</Code> with keys <Code>&quot;beta&quot;</Code> (the
        time-varying hedge ratio, per bar), <Code>&quot;alpha&quot;</Code> (the time-varying intercept),
        and <Code>&quot;spread&quot;</Code> (the residual <Code>y − (alpha + beta·x)</Code> to trade).
      </P>
      <CodeBlock code={`import edgekit as ek
kf = ek.timeseries.kalman_hedge(y, x, delta=1e-5)
z = ek.indicators.zscore(kf["spread"], 20)   # trade the spread when |z| is large`} />

      <H3>ou_params</H3>
      <P>
        Fit an Ornstein-Uhlenbeck process to a spread and read off its mean-reversion speed. The{" "}
        <Code>half_life</Code> — how long it takes the spread to close half the gap to its mean — is the
        single number that tells you whether a spread is tradeable and on what horizon.
      </P>
      <CodeBlock code={`ou_params(spread) -> dict`} />
      <Ul>
        <Li><Code>spread</Code> — a mean-reverting series (e.g. <Code>kalman_hedge()["spread"]</Code>).</Li>
      </Ul>
      <P>
        <Strong>Returns:</Strong> a <Code>dict</Code> with keys <Code>&quot;kappa&quot;</Code>{" "}
        (mean-reversion speed), <Code>&quot;theta&quot;</Code> (long-run mean),{" "}
        <Code>&quot;sigma&quot;</Code> (instantaneous volatility), and <Code>&quot;half_life&quot;</Code>{" "}
        (<Code>ln(2)/kappa</Code>, in bars).
      </P>
      <CodeBlock code={`ou = ek.timeseries.ou_params(kf["spread"])
ou["half_life"]   # bars to revert halfway; too long => not tradeable`} />

      <H3>garch11</H3>
      <P>
        A GARCH(1,1) volatility model fit by maximum likelihood — captures volatility clustering (calm
        begets calm, shocks beget shocks) and gives a one-step-ahead vol <Code>forecast</Code>. Use it
        for conditional vol-targeting and risk overlays where a flat rolling window reacts too slowly.
      </P>
      <CodeBlock code={`garch11(rets, max_iter=200) -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">rets</Code>, "array (T,)", "—", "The return series to model."],
          [<Code key="b">max_iter</Code>, "int", "200", "Maximum likelihood-optimiser iterations."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a <Code>dict</Code> with keys <Code>&quot;omega&quot;</Code>,{" "}
        <Code>&quot;alpha&quot;</Code>, <Code>&quot;beta&quot;</Code> (the three GARCH parameters),{" "}
        <Code>&quot;cond_vol&quot;</Code> (the fitted conditional-volatility path),{" "}
        <Code>&quot;forecast&quot;</Code> (next-step vol), and <Code>&quot;persistence&quot;</Code>{" "}
        (<Code>alpha + beta</Code>; approaches 1 as shocks decay slowly).
      </P>
      <CodeBlock code={`g = ek.timeseries.garch11(rets)
g["forecast"], g["persistence"]   # persistence >= 1 is a degenerate (non-stationary) fit`} />

      <H3>hmm_two_state</H3>
      <P>
        A two-state Gaussian hidden Markov model fit by Baum-Welch — the simplest regime detector,
        splitting a series into (typically) a calm state and a turbulent one. Use the decoded{" "}
        <Code>states</Code> to gate a strategy on or off by regime.
      </P>
      <CodeBlock code={`hmm_two_state(x, iters=100, seed=0) -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">x</Code>, "array (T,)", "—", "The observed series (usually returns)."],
          [<Code key="b">iters</Code>, "int", "100", "Baum-Welch (EM) iterations."],
          [<Code key="c">seed</Code>, "int", "0", "RNG seed for the initial parameter guess."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a <Code>dict</Code> with keys <Code>&quot;states&quot;</Code> (the
        most-likely state per bar, 0/1), <Code>&quot;means&quot;</Code> and <Code>&quot;vars&quot;</Code>{" "}
        (per-state Gaussian mean and variance), <Code>&quot;trans&quot;</Code> (the 2×2 transition
        matrix), and <Code>&quot;prob&quot;</Code> (the smoothed probability of each state per bar).
      </P>
      <Callout kind="warn" title="State labels are not stable across runs">
        Which regime is called <Code>0</Code> vs <Code>1</Code> depends on the random init — always
        identify the turbulent regime by its higher variance in <Code>vars</Code>, never by its index.
      </Callout>
      <CodeBlock code={`h = ek.timeseries.hmm_two_state(rets, iters=200)
turbulent = int(np.argmax(h["vars"]))   # the high-vol state
trade_on = h["states"] != turbulent     # sit out the turbulent regime`} />

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/indicators">edgekit.indicators</A> — the <Code>atr</Code> / <Code>rsi</Code> / <Code>zscore</Code> primitives <Code>make_features</Code> reuses.</Li>
        <Li><A href="/docs/api/ml">edgekit.ml</A> — <Code>build_features</Code>, the strategy-family feature builder for the ML layer.</Li>
        <Li><A href="/docs/concepts/causality">Causality</A> — why every feature must be lagged, and how edgekit enforces it.</Li>
        <Li><A href="/tutorials/time-series-analysis">Tutorial: time-series analysis</A> and <A href="/tutorials/feature-engineering">feature engineering</A> — the concepts behind this module.</Li>
      </Ul>
    </>
  );
}
