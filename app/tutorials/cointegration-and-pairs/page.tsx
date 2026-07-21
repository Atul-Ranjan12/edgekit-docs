import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Code, Callout } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Cointegration & pairs" };

export default function Page() {
  return (
    <>
      <H1>Cointegration &amp; pairs</H1>
      <Lead>
        A single price is a random walk — non-stationary, no mean to trade against. But two prices can be individually
        non-stationary and yet <em>tethered</em> to each other, so that a particular combination of them{" "}
        <em>is</em> stationary. That combination is a spread, the tether is called cointegration, and the whole of
        market-neutral pairs trading is built on it: you cannot forecast where either leg goes, but you can bet the gap
        between them snaps back. This chapter is the mechanics — spotting a real relationship versus a fake one,
        estimating the hedge ratio, testing the spread, and modelling its mean-reversion.
      </Lead>

      <Callout kind="danger" title="This mechanism is real; most instances are not">
        Cointegration is a genuine, tradeable phenomenon — and also the single most over-claimed edge in retail quant.
        Two series can look beautifully co-moving over a window and be an artefact of a shared regime that then breaks.
        Everything below is necessary but <em>not sufficient</em>: a passing ADF stat is a reason to test properly, not
        a reason to trade. Take every candidate through permutation and out-of-sample checks in the{" "}
        <A href="/tutorials/the-gauntlet">gauntlet</A> before it touches capital.
      </Callout>

      <Callout kind="tip" title="Why a trader cares">
        <Strong>Coca-Cola</Strong> and <Strong>PepsiCo</Strong> are the same business facing the same shocks — sugar
        prices, consumer spending, the dollar. Neither price is forecastable on its own (both are random walks), but
        when Coke runs up 4% and Pepsi does not, something has to give: history says the gap tends to snap back. You
        cannot bet on <em>either</em> stock, but you can bet on the <em>spread</em> between them closing — a trade that
        makes money whether the market goes up or down, because you are long one and short the other. This chapter is
        how you tell a real tether from a coincidence, size the hedge, and time the fade.
      </Callout>

      <H2>Spurious regression vs cointegration</H2>
      <P>
        Regress one random walk on an <em>unrelated</em> second random walk and you will very often get a large{" "}
        <MathInline>{"R^2"}</MathInline> and a t-statistic that screams significance. This is the{" "}
        <Strong>spurious regression</Strong> trap (Granger and Newbold, 1974): two independent I(1) series drift, and
        over any finite sample their drifts happen to line up enough to fool ordinary least squares. The regression is
        statistically meaningless — its residual is itself a random walk, so nothing pins the two series together.
      </P>
      <P>
        <Strong>Cointegration</Strong> is the real thing that spurious regression imitates. Two series{" "}
        <MathInline>{"y_t"}</MathInline> and <MathInline>{"x_t"}</MathInline> are cointegrated if each is
        individually I(1) (a random walk in levels) but some linear combination is I(0) (stationary):
      </P>
      <Math>{"s_t = y_t - \\beta\\, x_t \\quad \\text{is stationary}, \\qquad y_t, x_t \\sim I(1)"}</Math>
      <P>
        The economic picture is an equilibrium with a rubber band. Both prices wander freely, but whenever the spread{" "}
        <MathInline>{"s_t"}</MathInline> stretches away from its mean, arbitrage-like forces pull it back. The
        distinction from spurious regression is entirely in the <em>residual</em>: for a spurious pair the residual is a
        random walk (ADF fails to reject); for a cointegrated pair the residual is stationary (ADF rejects). That test
        on the residual is the whole game.
      </P>
      <ChartFigure
        name="tut/stationary_vs_randomwalk"
        alt="A stationary mean-reverting spread beside a non-stationary random-walk residual"
        caption="Top: the residual of a genuinely cointegrated pair oscillates around a fixed mean — stationary, tradeable. Bottom: the residual of a spurious pair wanders with no anchor — a random walk that only looked co-moving in-sample. The ADF test on the residual is what tells them apart."
      />

      <H2>The hedge ratio: static vs dynamic</H2>
      <P>
        The spread only makes sense once you have a hedge ratio <MathInline>{"\\beta"}</MathInline> — the number of
        units of <MathInline>{"x"}</MathInline> that neutralise one unit of <MathInline>{"y"}</MathInline>. There are
        two ways to get it, and the choice matters.
      </P>

      <H3>Static: rolling OLS</H3>
      <P>
        The Engle-Granger first step is an ordinary regression of one leg on the other, whose slope is the hedge ratio.
        A single full-sample OLS bakes in look-ahead (it uses the whole history to price today), so in practice you run
        it on a trailing window and let <MathInline>{"\\beta"}</MathInline> evolve. edgekit&apos;s{" "}
        <Code>rolling_ols_hedge</Code> returns the rolling intercept, slope, and residual in one call:
      </P>
      <CodeBlock code={`import edgekit as ek

# y, x are aligned price series (e.g. two related instruments' closes)
alpha, beta, resid = ek.indicators.rolling_ols_hedge(y, x, win=90)
# alpha[t], beta[t] use only the trailing 90 bars up to t  -> causal, no look-ahead
# resid[t] = y[t] - (alpha[t] + beta[t]*x[t])  is the spread`} />
      <P>
        Rolling OLS is transparent and cheap, but it has a lag: the window must fill with new data before{" "}
        <MathInline>{"\\beta"}</MathInline> adapts, and a short window is jumpy while a long one is stale.
      </P>

      <H3>Dynamic: the Kalman filter</H3>
      <P>
        The Kalman filter treats the hedge ratio as a hidden state that drifts continuously, updating it every bar from
        the latest observation rather than re-fitting a window. It models{" "}
        <MathInline>{"\\beta_t"}</MathInline> as a random walk and <MathInline>{"y_t"}</MathInline> as a noisy linear
        readout of it:
      </P>
      <Math>{"\\beta_t = \\beta_{t-1} + w_t, \\qquad y_t = \\alpha_t + \\beta_t\\, x_t + v_t"}</Math>
      <P>
        Two knobs govern its behaviour. <MathInline>{"\\delta"}</MathInline> sets how fast the hedge ratio is allowed to
        wander (the state-transition variance) — larger <MathInline>{"\\delta"}</MathInline> means a more adaptive, more
        nervous <MathInline>{"\\beta"}</MathInline>; <MathInline>{"r"}</MathInline> is the observation-noise variance. The
        filter&apos;s one-step prediction error <em>is</em> the spread, delivered causally with no window lag:
      </P>
      <CodeBlock code={`k = ek.timeseries.kalman_hedge(y, x, delta=1e-4, r=1.0)
# k == {"beta": ndarray,     # the dynamic hedge ratio, updated every bar
#       "alpha": ndarray,    # the dynamic intercept
#       "spread": ndarray}   # y - (alpha + beta*x), the tradeable series

spread = k["spread"]
hedge_now = k["beta"][-1]    # units of x to short per unit of y, right now`} />
      <ChartFigure
        name="tut/kalman_hedge"
        alt="A dynamic Kalman hedge ratio adapting over time with the resulting spread below"
        caption="Top: the Kalman-filtered hedge ratio beta_t evolves bar by bar as the relationship between the two legs drifts, with no fixed-window lag. Bottom: the resulting spread — the filter's prediction error — oscillates around zero, ready to standardise into a z-score."
      />
      <Callout kind="tip" title="Scenario: a hedge ratio that drifts from 1.0 to 1.5">
        Two gold miners, <Strong>GOLDCO</Strong> and <Strong>MINEX</Strong>, start the year moving one-for-one:{" "}
        <MathInline>{"\\beta \\approx 1.0"}</MathInline>, so you short one MINEX for every GOLDCO you buy. Over the year
        MINEX takes on leverage and its stock becomes roughly 50% more sensitive to the gold price than GOLDCO&apos;s.
        A static full-sample OLS would average the whole year and hand you a stale <MathInline>{"\\beta \\approx 1.25"}</MathInline>{" "}
        — wrong at both ends. A 90-day rolling OLS chases it, but always ~45 bars late. The Kalman filter, watching each
        bar&apos;s prediction error, walks <MathInline>{"\\beta_t"}</MathInline> smoothly from{" "}
        <MathInline>{"1.0 \\to 1.5"}</MathInline> as the drift happens, so today&apos;s hedge is{" "}
        <MathInline>{"k[\\text{\"beta\"}][-1] \\approx 1.5"}</MathInline>: you now short 1.5 MINEX per GOLDCO. Get this
        wrong and your &ldquo;market-neutral&rdquo; spread quietly picks up a directional gold bet — the drift is not a
        detail, it is the difference between neutral and naked.
      </Callout>
      <Callout kind="tip" title="Which to use">
        Rolling OLS is the honest baseline and easiest to reason about; reach for it first. The Kalman filter earns its
        keep when the true hedge ratio genuinely drifts (different volatilities, evolving lead-lag) and a fixed window
        is always either too slow or too jumpy. Whichever you use, the hedge ratio must be computed from{" "}
        <em>past data only</em> — both edgekit calls are causal by construction.
      </Callout>

      <H2>Engle-Granger: the two-step test</H2>
      <P>
        The Engle-Granger procedure is the standard way to certify a pair, and it is exactly two steps:
      </P>
      <Ul>
        <Li>
          <Strong>Step 1 — estimate the spread.</Strong> Regress <MathInline>{"y"}</MathInline> on{" "}
          <MathInline>{"x"}</MathInline> to get <MathInline>{"\\beta"}</MathInline>, then form{" "}
          <MathInline>{"s_t = y_t - \\beta x_t"}</MathInline> (via <Code>rolling_ols_hedge</Code> or{" "}
          <Code>kalman_hedge</Code> above).
        </Li>
        <Li>
          <Strong>Step 2 — test the residual for a unit root.</Strong> Run the Augmented Dickey-Fuller test on the
          spread. If the spread is stationary (ADF rejects the unit root), the pair is cointegrated.
        </Li>
      </Ul>
      <P>
        Recall from the time-series chapter that <Code>adf_stat</Code> returns the raw t-statistic, not a p-value —
        compare it to the critical values (below roughly <MathInline>{"-2.86"}</MathInline> is 5% significance,{" "}
        <MathInline>{"-3.43"}</MathInline> is 1%). The more negative, the more convincingly the spread reverts.
      </P>
      <CodeBlock code={`# Step 1: spread from the dynamic hedge (or use the rolling-OLS resid)
spread = ek.timeseries.kalman_hedge(y, x, delta=1e-4, r=1.0)["spread"]

# Step 2: ADF on the spread. More negative = more clearly mean-reverting.
t = ek.timeseries.adf_stat(spread, lags=1)
if t < -2.86:
    print(f"spread stationary at ~5% (adf t = {t:.2f}) -> candidate cointegrated pair")
else:
    print(f"cannot reject unit root (adf t = {t:.2f}) -> likely spurious, do not trade")`} />
      <Callout kind="warn" title="The critical values are stricter here">
        Because the spread is itself an <em>estimated</em> residual (you fitted beta to it), the honest critical values
        are more negative than the textbook ADF ones — fitting the hedge ratio mechanically makes the residual look
        more stationary than it is. When a pair only barely clears <MathInline>{"-2.86"}</MathInline>, treat it as a
        fail, not a pass.
      </Callout>
      <Callout kind="tip" title="Scenario: two ADF verdicts">
        Run <Code>adf_stat</Code> on the Coke-Pepsi spread over five years and it returns{" "}
        <MathInline>{"t = -3.6"}</MathInline> — comfortably past the 1% critical value of{" "}
        <MathInline>{"-3.43"}</MathInline>, so the spread convincingly reverts: a real candidate. Now run it on a
        spurious pair — say Coke against an unrelated oil driller that merely happened to trend together during a bull
        market — and you get <MathInline>{"t = -1.4"}</MathInline>, nowhere near <MathInline>{"-2.86"}</MathInline>: the
        residual is itself a random walk, no tether, do not trade it. Same code, same threshold, opposite decisions —
        and note that because you <em>fitted</em> the hedge ratio, a marginal <MathInline>{"-2.9"}</MathInline> should
        still be read as a fail, not a pass.
      </Callout>

      <H2>The Ornstein-Uhlenbeck model of the spread</H2>
      <P>
        A stationary spread is tradeable, but you want more than a yes/no — you want to know <em>how fast</em> it
        reverts and <em>where</em> it reverts to. The continuous-time model of exactly this is the
        Ornstein-Uhlenbeck process, the mean-reverting cousin of Brownian motion:
      </P>
      <Math>{"ds_t = \\kappa\\,(\\theta - s_t)\\,dt + \\sigma\\, dW_t"}</Math>
      <P>
        Three parameters carry all the meaning. <MathInline>{"\\theta"}</MathInline> is the equilibrium level the spread
        is pulled toward. <MathInline>{"\\kappa"}</MathInline> is the speed of that pull — larger{" "}
        <MathInline>{"\\kappa"}</MathInline> means faster reversion. <MathInline>{"\\sigma"}</MathInline> is the size of
        the random shocks fighting the pull. edgekit fits it by OLS on the AR(1) increments and hands back the derived{" "}
        <em>half-life</em> — the expected number of bars to close half the gap to equilibrium:
      </P>
      <Math>{"t_{1/2} = \\frac{\\ln 2}{\\kappa}"}</Math>
      <CodeBlock code={`ou = ek.timeseries.ou_params(spread)
# ou == {"kappa": reversion speed,
#        "theta": equilibrium level,
#        "sigma": per-bar shock std,
#        "half_life": ln(2)/kappa bars}

# a convenience half-life is also on indicators:
hl = ek.indicators.half_life(spread)
print(f"kappa={ou['kappa']:.4f}  theta={ou['theta']:.4f}  half-life={ou['half_life']:.1f} bars")`} />
      <P>
        The half-life is the most operationally useful number in the whole chapter: it <em>is</em> your holding horizon.
        A half-life of 5 bars says positions close in days and the pair can be traded actively; a half-life of 200 bars
        says you would hold for the better part of a year, tying up capital and exposing you to the relationship
        breaking before it reverts. A negative or huge <MathInline>{"\\kappa"}</MathInline> means no usable reversion —
        skip it.
      </P>
      <Callout kind="tip" title="Scenario: what the half-life tells you to do">
        <Code>ou_params</Code> on the Coke-Pepsi spread returns{" "}
        <MathInline>{"\\kappa \\approx 0.069"}</MathInline>, giving a half-life of{" "}
        <MathInline>{"\\ln 2/0.069 \\approx 10"}</MathInline> trading days. Read operationally: when the spread gaps
        out, expect it to close half the gap in about two weeks — so this is a swing pair, not a day trade, and a
        position that has sat open for ~30 days (three half-lives) without reverting is a red flag that the tether may
        have snapped. Contrast a pair with <MathInline>{"\\kappa \\approx 0.003"}</MathInline> (half-life ≈ 230 days):
        you would tie up capital for the better part of a year per round-trip and take only a handful of independent
        bets — statistically too thin to trust however pretty the backtest. The half-life sets your holding horizon,
        your time-stop, and your realistic trade count all at once.
      </Callout>

      <H2>Trading the z-score</H2>
      <P>
        With a stationary spread and a sane half-life, the trade rule writes itself: standardise the spread into a
        z-score and fade the extremes back toward <MathInline>{"\\theta"}</MathInline>.
      </P>
      <Math>{"z_t = \\frac{s_t - \\mu_t}{\\sigma_t}"}</Math>
      <P>
        where <MathInline>{"\\mu_t"}</MathInline> and <MathInline>{"\\sigma_t"}</MathInline> are a trailing mean and
        standard deviation of the spread (or the OU <MathInline>{"\\theta"}</MathInline> and the stationary std). The
        canonical rule: <Strong>short the spread</Strong> (sell <MathInline>{"y"}</MathInline>, buy{" "}
        <MathInline>{"\\beta"}</MathInline> of <MathInline>{"x"}</MathInline>) when{" "}
        <MathInline>{"z_t > +2"}</MathInline>, <Strong>long the spread</Strong> when{" "}
        <MathInline>{"z_t < -2"}</MathInline>, and flatten as <MathInline>{"z_t"}</MathInline> crosses back through 0.
        Because both legs are held, the position is dollar-neutral and — if the cointegration holds — largely immune to
        the direction of the underlying market. You can build this as a <Code>BaseStrategy</Code> subclass that trades a
        synthetic spread instrument, sizing the two legs by the current hedge ratio.
      </P>
      <CodeBlock code={`# z-score of the causal spread against a trailing window (past data only)
import numpy as np
win = 60
s = np.asarray(spread, float)
mu = np.array([s[max(0, t - win):t].mean() for t in range(1, len(s) + 1)])
sd = np.array([s[max(0, t - win):t].std()  for t in range(1, len(s) + 1)])
z = (s - mu) / np.where(sd == 0, np.nan, sd)

# entry/exit rule inside a BaseStrategy on the synthetic spread:
#   z > +2   -> short spread (sell y, buy beta*x)
#   z < -2   -> long  spread (buy  y, sell beta*x)
#   |z| < 0.5 -> flat ; also time-stop after ~3x the OU half-life`} />
      <Callout kind="tip" title="Scenario: a z-score round-trip">
        Coke jumps on an earnings beat while Pepsi lags, and the spread stretches to{" "}
        <MathInline>{"z = +2.3"}</MathInline>. The rule fires: <Strong>short the spread</Strong> — sell $100k of Coke,
        buy <MathInline>{"\\beta \\approx 1.1"}</MathInline> times that, $110k, of Pepsi, so the position is
        dollar-neutral and indifferent to whether the whole sector rises or falls. Over the next ~10 days (the
        half-life) the gap closes and <MathInline>{"z"}</MathInline> drifts back through 0; you flatten and book the
        convergence. Had <MathInline>{"z"}</MathInline> instead kept climbing to +4 and stayed there past ~30 days, the
        time-stop would pull you out at a loss — the correct response to a tether that has broken, not a reason to add.
        Same machinery fires the mirror trade at <MathInline>{"z < -2"}</MathInline>.
      </Callout>
      <Callout kind="note" title="Half-life sets the bands and the patience">
        Tie the entry band and the max holding time to the half-life. If the OU half-life is 10 bars, a position that
        has not reverted in ~30 bars is telling you the relationship may have broken — a time-stop is as important as
        the z-score exit. This is the same &ldquo;the model can stop being true&rdquo; humility that runs through the
        whole tutorial.
      </Callout>

      <H2>The risks that actually kill pairs trades</H2>
      <Ul>
        <Li>
          <Strong>Cointegration breaks.</Strong> The relationship is an empirical regularity, not a law. A merger, a
          balance-sheet shock, an index reconstitution, or a regime change can sever the tether permanently — and the
          spread you were fading simply trends away and never comes back. This is the dominant risk.
        </Li>
        <Li>
          <Strong>It was never real.</Strong> A spurious pair that cleared a too-lenient ADF threshold in one window.
          The defence is the gauntlet: permutation-test the spread, split it out-of-sample, and confirm the ADF stat
          holds on data the hedge ratio was never fitted to.
        </Li>
        <Li>
          <Strong>Costs on two legs.</Strong> Every round-trip pays spread and commission <em>twice</em>, and reversion
          edges are thin. A pair that is profitable gross can be dead net — always run <Code>ek.costs.cost_stress</Code>{" "}
          at multiples of your assumed cost.
        </Li>
        <Li>
          <Strong>Too few trades.</Strong> A long half-life yields a handful of round-trips per year, so a great-looking
          backtest can rest on a statistically meaningless number of independent bets. Count trades, not just returns.
        </Li>
      </Ul>

      <P>
        Next: <A href="/tutorials/regime-detection">Regime detection</A> — cointegration holds in some regimes and
        breaks in others, so the natural companion question is how to detect which regime you are in. We fit a two-state
        hidden Markov model to label calm-vs-volatile (or trending-vs-choppy) regimes and gate a strategy accordingly.
      </P>
    </>
  );
}
