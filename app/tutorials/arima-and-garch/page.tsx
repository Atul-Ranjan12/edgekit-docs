import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Code, Callout } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "ARIMA & GARCH" };

export default function Page() {
  return (
    <>
      <H1>ARIMA &amp; GARCH</H1>
      <Lead>
        The previous chapter told you <em>which world</em> a series lives in. This one gives you the classical models
        that put numbers on it. ARIMA is the workhorse for the conditional <em>mean</em> of a series — where the next
        value is expected to land — and GARCH is the workhorse for the conditional <em>variance</em> — how big the next
        move is likely to be. The punchline you should carry into every design: for tradeable assets, mean models of
        returns are usually weak, while variance models are reliably useful. Understanding <em>why</em> is the whole
        lesson.
      </Lead>

      <Callout kind="tip" title="Why a trader cares">
        Two questions sit under every position you hold: <em>where</em> is the next return likely to land, and{" "}
        <em>how big</em> is the next move likely to be? A tempting hope is that yesterday&apos;s Bitcoin return tells you
        today&apos;s direction — buy the model and print money. This chapter shows why that hope is almost always empty
        (the direction is close to a coin flip) and why the <em>other</em> question pays: after a wild day, tomorrow is
        very likely wild too. You cannot forecast the sign of the move, but you can forecast its size — and that
        forecast is what sizes your position, sets your stop, and tells you when to stand down.
      </Callout>

      <Callout kind="note" title="Fit means on returns, fit variance on the same returns">
        ARIMA and GARCH both assume a stationary input, so you feed them <Strong>log returns</Strong>, not prices — the
        &ldquo;I&rdquo; (integration/differencing) in ARIMA is precisely what turns a non-stationary price into a
        stationary return before an ARMA mean model is fitted. Prices are I(1); their log returns are I(0).
      </Callout>

      <H2>AR, MA, ARMA, ARIMA: the mean model</H2>
      <P>
        An ARIMA model describes today&apos;s value as a linear combination of its own past values and past forecast
        errors. It has three integer orders, written <MathInline>{"\\text{ARIMA}(p,d,q)"}</MathInline>:{" "}
        <MathInline>{"p"}</MathInline> autoregressive terms, <MathInline>{"d"}</MathInline> differences to reach
        stationarity, and <MathInline>{"q"}</MathInline> moving-average terms. Build it up one piece at a time.
      </P>

      <H3>AR(p) — autoregression</H3>
      <P>
        An autoregressive model regresses the series on its own recent history. The workhorse special case is{" "}
        <Strong>AR(1)</Strong>: today is a constant plus a fraction of yesterday plus noise.
      </P>
      <Math>{"x_t = c + \\phi\\, x_{t-1} + \\epsilon_t, \\qquad \\epsilon_t \\sim \\text{iid}(0,\\sigma^2)"}</Math>
      <P>
        The single coefficient <MathInline>{"\\phi"}</MathInline> is the entire story. When{" "}
        <MathInline>{"|\\phi| < 1"}</MathInline> the process is stationary and <Strong>mean-reverting</Strong>: it is
        pulled back toward its long-run mean <MathInline>{"\\mu = c/(1-\\phi)"}</MathInline>, and a shock decays
        geometrically at rate <MathInline>{"\\phi"}</MathInline> per step. When{" "}
        <MathInline>{"\\phi = 1"}</MathInline> the constant vanishes into a unit root and you are back to a pure random
        walk — no mean to revert to, which is exactly the case the ADF test hunts for. When{" "}
        <MathInline>{"\\phi > 1"}</MathInline> the process explodes. The general order-<MathInline>{"p"}</MathInline>{" "}
        form simply stacks more lags:
      </P>
      <Math>{"x_t = c + \\sum_{i=1}^{p} \\phi_i\\, x_{t-i} + \\epsilon_t"}</Math>
      <Callout kind="tip" title="Scenario: reading phi off a mean-reverting series">
        Fit AR(1) to a daily z-scored pairs spread and it comes back{" "}
        <MathInline>{"\\phi = 0.90"}</MathInline>. Read it directly: today the spread keeps 90% of yesterday&apos;s
        deviation from its mean, so a shock decays geometrically and its <Strong>half-life</Strong> is{" "}
        <MathInline>{"\\ln(0.5)/\\ln(0.90) \\approx 6.6"}</MathInline> days — a stretched spread closes half its gap in
        about a week, which is exactly the holding horizon a pairs trade needs. Contrast the neighbours:{" "}
        <MathInline>{"\\phi=0.99"}</MathInline> means a 69-day half-life (barely reverting — capital tied up for
        months), while <MathInline>{"\\phi=0.5"}</MathInline> reverts in a single day (fast, but the edge per trade is
        tiny). And <MathInline>{"\\phi=1"}</MathInline> is the wall: no mean, a pure random walk, nothing to trade. The
        one coefficient tells you whether — and how fast — there is anything to fade.
      </Callout>

      <H3>MA(q) — moving average of shocks</H3>
      <P>
        A moving-average model makes today a blend of <em>past forecast errors</em> rather than past levels — it gives
        the series a short, finite memory of shocks that dies out completely after <MathInline>{"q"}</MathInline> steps.
      </P>
      <Math>{"x_t = c + \\epsilon_t + \\sum_{j=1}^{q} \\theta_j\\, \\epsilon_{t-j}"}</Math>
      <P>
        <Strong>ARMA(p,q)</Strong> is just the two glued together — AR terms for persistent level-memory, MA terms for
        transient shock-memory — and <Strong>ARIMA(p,d,q)</Strong> wraps an ARMA around the{" "}
        <MathInline>{"d"}</MathInline>-th difference of the raw series. For daily prices you almost always take{" "}
        <MathInline>{"d=1"}</MathInline> (one difference = returns), so an ARIMA on prices is an ARMA on returns.
      </P>

      <H3>Reading the order off ACF and PACF</H3>
      <P>
        You do not guess <MathInline>{"p"}</MathInline> and <MathInline>{"q"}</MathInline> — you read them from the
        autocorrelation and partial-autocorrelation functions you met in the{" "}
        <A href="/tutorials/time-series-analysis">time-series chapter</A>. The classic Box-Jenkins division of labour:
      </P>
      <Ul>
        <Li>
          <Strong>PACF cuts off after lag p, ACF decays gradually</Strong> → an AR(p) process. The PACF isolates the
          direct effect of each lag once the shorter lags are partialled out, so an AR(p) shows exactly{" "}
          <MathInline>{"p"}</MathInline> significant partial spikes then silence.
        </Li>
        <Li>
          <Strong>ACF cuts off after lag q, PACF decays gradually</Strong> → an MA(q) process — the mirror image.
        </Li>
        <Li>
          <Strong>Both decay gradually</Strong> → a mixed ARMA; pick the smallest orders that whiten the residuals.
        </Li>
      </Ul>
      <P>
        edgekit gives you both functions directly (the PACF via the Durbin-Levinson recursion, no statsmodels), plus the
        white-noise band <MathInline>{"\\pm 1.96/\\sqrt{n}"}</MathInline> to judge which spikes are real.
      </P>
      <CodeBlock code={`import edgekit as ek

rets = ek.timeseries.log_returns(bars.close)      # stationarise: prices -> returns

ac = ek.timeseries.acf(rets, nlags=40)            # ac[0] == 1 by construction
pc = ek.timeseries.pacf(rets, nlags=40)           # partial autocorrelations
band = 1.96 / len(rets) ** 0.5                    # +/- significance band

# how many PACF spikes poke outside the band -> candidate AR order p
p_hat = sum(1 for v in pc[1:11] if abs(v) > band)
print("suggested AR order:", p_hat)`} />
      <ChartFigure
        name="tut/acf_plot"
        alt="ACF and PACF of a return series with the significance band"
        caption="ACF (top) and PACF (bottom) with the +/-1.96/sqrt(n) band shaded. For returns the bars typically sit inside the band at almost every lag — the fingerprint of near-white noise, and the reason a mean model of returns rarely pays."
      />

      <Callout kind="warn" title="Why mean models of returns are weak">
        Run the ACF on returns and you usually find nothing significant past lag 0 — returns are close to serially
        uncorrelated. That is not a bug in the method; it is the near-efficiency of liquid markets. An ARIMA fit to such
        a series will have tiny coefficients, an <MathInline>{"R^2"}</MathInline> a hair above zero, and forecasts that
        collapse to the mean within a step or two. Fitting more lags just fits noise. This is the empirical wall behind
        the whole tutorial&apos;s insistence that <em>directional</em> edges are rare and must survive the gauntlet.
      </Callout>

      <H2>The twist: variance is predictable even when direction is not</H2>
      <P>
        Here is the fact that redirects the entire modelling effort. Run the ACF on <em>returns</em> and it is flat. Run
        the same ACF on <em>squared returns</em> (a proxy for variance) and you find strong, slowly-decaying positive
        autocorrelation. Direction is unpredictable; <Strong>magnitude is not</Strong>. Big moves cluster with big
        moves, calm with calm — the <em>volatility clustering</em> you saw last chapter. Returns are, in the famous
        phrase, &ldquo;serially uncorrelated but not independent.&rdquo;
      </P>
      <CodeBlock code={`# direction: essentially no memory
lb_ret = ek.timeseries.ljung_box(rets, lags=10)        # small Q -> can't reject white noise

# magnitude: strong, persistent memory
lb_sq  = ek.timeseries.ljung_box(rets ** 2, lags=10)   # large Q -> squared returns ARE autocorrelated`} />
      <Callout kind="tip" title="Scenario: the same series, two verdicts">
        Run this on a few years of daily equity-index returns and the two Ljung-Box statistics come back worlds apart.
        On the <em>returns</em>, <MathInline>{"Q \\approx 8"}</MathInline> across 10 lags — below the 5% critical value{" "}
        <MathInline>{"\\chi^2_{10}=18.3"}</MathInline>, so you <em>cannot</em> reject &ldquo;white noise&rdquo;: the
        direction has no exploitable memory. On the <em>squared</em> returns of the identical series,{" "}
        <MathInline>{"Q \\approx 240"}</MathInline> — off the chart, overwhelmingly significant. Same data, opposite
        answers: tomorrow&apos;s sign is a coin flip, but tomorrow&apos;s <em>size</em> is strongly predictable from
        today&apos;s. That single contrast is why the rest of this chapter models variance, not mean.
      </Callout>
      <P>
        This asymmetry is <em>why</em> the profitable modelling target for most assets is variance, not mean. You may
        not know which way the next move goes, but you can forecast how big it will be — and that forecast is what sizes
        a position, sets a stop, and decides whether to be in the market at all.
      </P>

      <H2>GARCH(1,1): the variance model</H2>
      <P>
        The ARCH/GARCH family models the conditional variance as its own recursion. The GARCH(1,1) — the version that
        wins in practice almost regardless of asset — says tomorrow&apos;s variance is a weighted blend of three things:
        a constant long-run level, yesterday&apos;s squared shock, and yesterday&apos;s variance.
      </P>
      <Math>{"\\sigma_t^2 = \\omega + \\alpha\\, \\epsilon_{t-1}^2 + \\beta\\, \\sigma_{t-1}^2"}</Math>
      <P>
        Read each term. <MathInline>{"\\omega > 0"}</MathInline> is the baseline variance the process relaxes toward.{" "}
        <MathInline>{"\\alpha"}</MathInline> is the <em>reaction</em>: how sharply variance jumps in response to a fresh
        shock <MathInline>{"\\epsilon_{t-1}"}</MathInline>. <MathInline>{"\\beta"}</MathInline> is the{" "}
        <em>memory</em>: how much of yesterday&apos;s variance carries into today. Their sum is the single most
        important diagnostic:
      </P>
      <Math>{"\\text{persistence} = \\alpha + \\beta"}</Math>
      <P>
        Stationarity requires <MathInline>{"\\alpha + \\beta < 1"}</MathInline>; the closer that sum sits to 1, the more
        slowly a volatility shock decays and the longer high-vol regimes persist. Typical equity and crypto fits land
        around <MathInline>{"\\alpha \\approx 0.05\\text{–}0.15"}</MathInline> and{" "}
        <MathInline>{"\\beta \\approx 0.8\\text{–}0.9"}</MathInline>, i.e. persistence near{" "}
        <MathInline>{"0.95"}</MathInline> — shocks fade over weeks, not days. The implied long-run (unconditional)
        variance is:
      </P>
      <Math>{"\\bar\\sigma^2 = \\frac{\\omega}{1 - \\alpha - \\beta}"}</Math>
      <P>
        edgekit fits the model by maximum likelihood using a derivative-free pattern search in pure numpy (no scipy),
        enforcing <MathInline>{"\\omega>0,\\ \\alpha,\\beta \\ge 0,\\ \\alpha+\\beta<1"}</MathInline>. It returns the
        parameters, the fitted conditional-volatility path, a one-step forecast, and the persistence:
      </P>
      <CodeBlock code={`g = ek.timeseries.garch11(rets, max_iter=200)
# g == {"omega", "alpha", "beta",
#       "cond_vol": ndarray of sigma_t,   # the fitted per-bar volatility path
#       "forecast": next-step sigma,      # sqrt(omega + alpha*r[-1]**2 + beta*sigma[-1]**2)
#       "persistence": alpha + beta}

print(f"alpha={g['alpha']:.3f}  beta={g['beta']:.3f}  persistence={g['persistence']:.3f}")
print("next-bar vol forecast:", g["forecast"])`} />
      <ChartFigure
        name="tut/garch_cond_vol"
        alt="A return series with its GARCH(1,1) conditional volatility path overlaid"
        caption="The GARCH(1,1) conditional volatility (line) tracks the return series (points): it ramps up as a cluster of large moves arrives and decays through the calm that follows, at a speed set by the persistence alpha+beta."
      />
      <Callout kind="tip" title="Scenario: a GARCH vol forecast the day after a Bitcoin crash">
        Fit GARCH(1,1) to daily <Strong>Bitcoin</Strong> returns and you get something like{" "}
        <MathInline>{"\\alpha=0.09,\\ \\beta=0.88"}</MathInline> (persistence <MathInline>{"0.97"}</MathInline>), with a
        long-run daily vol around 3.5%. Yesterday BTC was quietly running at{" "}
        <MathInline>{"\\sigma_{t-1}=3\\%"}</MathInline> (variance 0.0009) — then it printed a{" "}
        <MathInline>{"-12\\%"}</MathInline> day. Plug the shock into the recursion:
        <br />
        <MathInline>{"\\sigma_t^2 = \\omega + 0.09\\,(-0.12)^2 + 0.88\\,(0.03)^2 \\approx 0.0000368 + 0.001296 + 0.000792 = 0.00213"}</MathInline>
        <br />
        so <MathInline>{"\\sigma_t \\approx \\sqrt{0.00213} = 4.6\\%"}</MathInline> daily — an annualised jump from{" "}
        <MathInline>{"\\approx 57\\%"}</MathInline> to <MathInline>{"\\approx 88\\%"}</MathInline> (<MathInline>{"\\times\\sqrt{365}"}</MathInline>).
        The model just told you, quantitatively, that tomorrow&apos;s expected range is nearly double last week&apos;s.
        If your stop was a 2× multiple of forecast vol, it should widen accordingly; if you size to constant risk, your
        position should roughly halve. That is the forecast doing its one job.
      </Callout>

      <H3>Forecasting volatility forward</H3>
      <P>
        The one-step forecast is mechanical — plug the latest shock and variance into the recursion. Multi-step
        forecasts mean-revert toward the long-run level <MathInline>{"\\bar\\sigma^2"}</MathInline> at rate{" "}
        <MathInline>{"(\\alpha+\\beta)"}</MathInline> per step:
      </P>
      <Math>{"\\mathbb{E}[\\sigma_{t+h}^2] = \\bar\\sigma^2 + (\\alpha+\\beta)^{h}\\,\\big(\\sigma_{t+1}^2 - \\bar\\sigma^2\\big)"}</Math>
      <P>
        With persistence near <MathInline>{"0.95"}</MathInline>, the half-life of a vol shock is roughly{" "}
        <MathInline>{"\\ln(0.5)/\\ln(0.95) \\approx 13"}</MathInline> bars — so a spike today still meaningfully
        elevates your risk estimate a couple of weeks out. That horizon is the practical output: it tells you how long
        to keep stops wide and size trimmed after a shock.
      </P>
      <Callout kind="tip" title="GARCH vs EWMA">
        The RiskMetrics EWMA volatility from the last chapter is exactly a GARCH(1,1) with{" "}
        <MathInline>{"\\omega=0"}</MathInline> and <MathInline>{"\\alpha+\\beta=1"}</MathInline> (a fixed{" "}
        <MathInline>{"\\lambda=\\beta=0.94"}</MathInline>). EWMA is the cheap, zero-fit approximation; GARCH earns the
        extra <MathInline>{"\\omega"}</MathInline> term by adding genuine mean-reversion in variance, so its forecasts
        pull back to a long-run level instead of drifting. Use EWMA to size live and GARCH to understand and forecast.
      </Callout>

      <H2>What you actually do with this</H2>
      <P>
        You will not usually trade an ARIMA point-forecast of returns — the ACF already warned you it is noise. What
        GARCH buys you is <em>volatility-aware everything</em>, and edgekit&apos;s strategy templates are built to
        consume it:
      </P>
      <Ul>
        <Li>
          <Strong>Volatility targeting.</Strong> Feed the conditional-vol forecast into{" "}
          <Code>ek.sizing.vol_target</Code> so position size shrinks when GARCH says a storm is coming and grows in
          calm — keeping <em>risk</em>, not notional, constant.
        </Li>
        <Li>
          <Strong>Adaptive stops.</Strong> A stop set as a multiple of forecast vol widens automatically in stress, so
          you are not shaken out by a normal move that merely looks large against a stale fixed distance.
        </Li>
        <Li>
          <Strong>Regime awareness.</Strong> A persistence near 1 with an elevated current <MathInline>{"\\sigma_t"}</MathInline>{" "}
          is a quantitative &ldquo;high-vol regime&rdquo; flag — which is the exact idea the next-but-one chapter
          formalises with a hidden Markov model.
        </Li>
      </Ul>
      <CodeBlock code={`# GARCH-forecast vol -> size to a constant risk target, in a BaseStrategy subclass
g = ek.timeseries.garch11(rets, max_iter=200)
forecast_vol = g["forecast"]                       # next-bar sigma

# annualise for the sizing call (per-bar -> per-year), then target e.g. 15% vol
ann_vol = forecast_vol * (252 ** 0.5)
# vol_target scales an existing return/position stream toward the target vol path`} />
      <Callout kind="danger" title="A fitted model is a description, not a promise">
        GARCH parameters are estimated on one finite window and drift over time — persistence in a bull-quiet year
        differs from a crisis year. A vol forecast tells you the <em>conditional</em> risk given recent history; it says
        nothing about a discontinuous gap or a structural break. Treat the forecast as a live risk input to be stress-
        tested, never as a guarantee, and prove any strategy that leans on it through the full{" "}
        <A href="/tutorials/the-gauntlet">validation gauntlet</A>.
      </Callout>

      <P>
        Next: <A href="/tutorials/cointegration-and-pairs">Cointegration &amp; pairs</A> — when two non-stationary
        prices move together closely enough that their <em>spread</em> is stationary, and how to estimate the hedge
        ratio, test the residual, and model the spread as a mean-reverting process you can actually trade.
      </P>
    </>
  );
}
