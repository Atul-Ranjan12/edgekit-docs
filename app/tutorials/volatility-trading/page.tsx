import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, A, Strong, Callout, Code } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Volatility trading" };

export default function Page() {
  return (
    <>
      <H1>Volatility trading</H1>
      <Lead>
        Once you can price an option you can trade the one input that is not observable: volatility. A vol trader is not
        betting on direction — they are betting that the volatility <em>implied</em> by option prices is wrong relative
        to what the underlying will actually <em>realize</em>. This chapter defines both, explains the persistent gap
        between them (the variance risk premium), shows why the vol smile proves Black-Scholes is a convenient lie, and
        then walks through the mechanics — straddles, and the gamma-versus-theta P&amp;L of a delta-hedged position —
        together with the tail risk that makes short vol so dangerous.
      </Lead>

      <Callout kind="tip" title="Why a trader cares">
        In the last chapter you found the Acme earnings call was pricing 25% implied vol against your 20% estimate. A
        vol trader does not ask &ldquo;will Acme go up?&rdquo; — they ask &ldquo;is 25% too high?&rdquo; If the stock
        will really only swing at a 20% pace, then whoever <em>sells</em> that 25% vol and hedges out the direction
        collects the 5-point difference as profit. This chapter is how that bet is expressed, measured, and — because it
        is one of the most seductive ways to blow up an account — how it kills you when it goes wrong.
      </Callout>

      <H2>Realized vs implied volatility</H2>
      <P>
        <Strong>Realized volatility</Strong> is backward-looking: the annualised standard deviation of the returns the
        underlying <em>actually</em> printed. From log returns <MathInline>{"r_t"}</MathInline> over a window of{" "}
        <MathInline>{"n"}</MathInline> bars with <MathInline>{"A"}</MathInline> bars per year:
      </P>
      <Math>{"\\sigma_{\\text{realized}} = \\sqrt{\\frac{A}{n}\\sum_{t=1}^{n} (r_t - \\bar r)^2}"}</Math>
      <P>
        <Strong>Implied volatility</Strong> is forward-looking: the single <MathInline>{"\\sigma"}</MathInline> you back
        out of a traded option price with <Code>ek.options.implied_vol</Code> (previous chapter). It is the market&apos;s
        consensus forecast of volatility over the option&apos;s life. In edgekit the realized side comes from{" "}
        <A href="/docs/api/timeseries">ek.timeseries</A>:
      </P>
      <CodeBlock
        filename="realized.py"
        code={`import numpy as np
import edgekit as ek

logret = np.diff(np.log(close))

# rolling per-bar std, annualised by sqrt(periods_per_year)
rv = ek.timeseries.rolling_volatility(logret, window=20, periods_per_year=252)

# EWMA (RiskMetrics): weights recent shocks more, reacts to regime change
ew = ek.timeseries.ewma_volatility(logret, lam=0.94) * np.sqrt(252)

# realized_vol is the HF estimator: sqrt of the rolling *sum* of squared returns
rvol = ek.timeseries.realized_vol(logret, window=20)`}
      />
      <Callout kind="tip" title="Scenario">
        Over the last 20 trading days the <Strong>S&amp;P 500</Strong> printed daily log-returns with a standard
        deviation of about 0.72%. Annualise it: <MathInline>{"\\sigma_{\\text{realized}} = 0.0072\\times\\sqrt{252} \\approx 11.4\\%"}</MathInline>{" "}
        — a calm tape. Meanwhile the VIX (30-day implied vol on the same index) reads <Strong>18%</Strong>. The index
        has been <em>realizing</em> 11% while options are <em>implying</em> 18%: a 7-point gap. Anyone who sold that
        30-day vol and delta-hedged would have banked the difference, because the market delivered far less movement
        than the premium priced. That persistent &ldquo;implied sits above realized&rdquo; wedge has a name.
      </Callout>
      <Callout kind="note" title="Three vol estimators, three jobs">
        <Code>rolling_volatility</Code> is the textbook rolling std (a per-bar average).{" "}
        <Code>realized_vol</Code> is the high-frequency total-variation estimator — the <em>sum</em> of squared returns,
        larger by roughly <MathInline>{"\\sqrt{n}"}</MathInline>, measuring how far the series actually travelled.{" "}
        <Code>ewma_volatility</Code> replaces the hard lookback window with exponential decay so a new shock is felt
        immediately. Pick by purpose; do not mix their scales in one comparison.
      </Callout>

      <H2>The variance risk premium</H2>
      <P>
        Compare the two series and a robust empirical fact appears: <Strong>implied volatility is, on average, higher
        than the volatility that subsequently realizes</Strong>. The average gap is the <Strong>variance risk
        premium</Strong> (VRP):
      </P>
      <Math>{"\\text{VRP} = \\mathbb{E}\\big[\\sigma_{\\text{implied}}^2 - \\sigma_{\\text{realized}}^2\\big] > 0"}</Math>
      <P>
        Why does it persist? Options are insurance. Most participants are natural <em>buyers</em> of protection (long
        puts, long vol), and the sellers who warehouse that risk demand compensation for taking on rare, violent losses.
        So implied vol embeds a risk premium above the statistical forecast — the same reason insurance premiums exceed
        expected claims. Selling vol harvests this premium <em>most</em> of the time, which is exactly what makes it
        dangerous: the payoff is a long stream of small gains punctuated by rare catastrophic losses.
      </P>
      <Callout kind="warn" title="A premium is not a free lunch">
        The VRP is real and well-documented, but this is a tutorial on <em>mechanics</em>, not a trade recommendation.
        A positive average spread says nothing about whether a specific short-vol structure survives its own tail, its
        transaction costs, or a regime shift — put any such idea through{" "}
        <A href="/tutorials/the-gauntlet">the gauntlet</A> before believing it.
      </Callout>

      <H2>The vol smile and skew</H2>
      <P>
        Black-Scholes assumes one constant <MathInline>{"\\sigma"}</MathInline> for all strikes. If that were true,
        inverting every option on the same underlying and expiry would yield the same implied vol. It does not. Plot
        implied vol against strike and you get a <Strong>smile</Strong> (or, in equity and index markets, a downward{" "}
        <Strong>skew</Strong>): out-of-the-money options — especially downside puts — trade at higher implied vol than
        at-the-money.
      </P>
      <ChartFigure
        name="tut/vol_smile"
        alt="Implied volatility plotted against strike, forming a smile that tilts up more steeply on the downside (skew)"
        caption="Implied volatility by strike. A flat line is what Black-Scholes predicts; the observed smile/skew — steeper on the downside — is the market pricing fat tails and crash risk that a single constant sigma cannot capture."
      />
      <P>
        The smile is the market correcting Black-Scholes&apos; two false assumptions: returns are <em>not</em> Gaussian
        (they have fat tails, so far-OTM options are worth more than a normal distribution implies), and volatility is{" "}
        <em>not</em> constant (it clusters and spikes precisely when prices fall). The downside skew in equities encodes
        crash-o-phobia: demand for put protection bids up implied vol on the left wing. Practically, the smile means
        there is no single &ldquo;the&rdquo; volatility — you must speak of the implied vol <em>at a given strike</em>,
        and any model with one <MathInline>{"\\sigma"}</MathInline> will misprice the wings.
      </P>
      <CodeBlock
        filename="smile.py"
        code={`import numpy as np
import edgekit as ek

S, t, r = 100.0, 0.25, 0.04
strikes = np.array([80, 90, 100, 110, 120], float)

# Suppose these are observed market prices for calls at each strike.
# Inverting each with implied_vol recovers a *different* sigma per strike:
market_px = np.array([...])   # traded prices
ivs = [ek.options.implied_vol(px, S, K, t, r, kind="call")
       for px, K in zip(market_px, strikes)]
# a flat 'ivs' would confirm BS; a U-shape is the smile.`}
      />
      <Callout kind="tip" title="Scenario">
        Take one-month options on the <Strong>S&amp;P 500</Strong> with the index at 5000 and invert each traded price
        to an implied vol. A realistic skew looks like this: the 4500 put (10% out-of-the-money, the crash strike) prints{" "}
        <MathInline>{"\\approx 24\\%"}</MathInline>; the 5000 at-the-money prints <MathInline>{"\\approx 18\\%"}</MathInline>;
        the 5500 call (10% OTM upside) prints only <MathInline>{"\\approx 15\\%"}</MathInline>. Three strikes on one
        index and one expiry, three different volatilities — Black-Scholes says they must be identical. The downside puts
        are the most expensive because that is where the fear (and the demand for crash insurance) lives. Practically:
        there is no &ldquo;the vol of the S&amp;P&rdquo; — you must always say the vol <em>at which strike</em>, and a
        one-<MathInline>{"\\sigma"}</MathInline> model will misprice the wings by 5-6 vol points.
      </Callout>

      <H2>Trading volatility with structures</H2>
      <P>
        To bet on the <em>magnitude</em> of a move while staying (initially) direction-neutral, combine options so the
        deltas cancel and the vega adds.
      </P>
      <H3>Straddle and strangle</H3>
      <P>
        A <Strong>long straddle</Strong> is a long call plus a long put at the same at-the-money strike. Its deltas
        roughly offset (<MathInline>{"\\Delta_{\\text{call}} + \\Delta_{\\text{put}} \\approx 0"}</MathInline> at the
        money), leaving a position that is long gamma and long vega: it profits from a large move in <em>either</em>{" "}
        direction, or from implied vol rising, and it pays for that convexity through theta. A <Strong>strangle</Strong>{" "}
        uses OTM strikes instead — cheaper premium, but the underlying must travel further before it pays.
      </P>
      <CodeBlock
        filename="straddle.py"
        code={`import edgekit as ek

S = K = 100.0; t, r, sig = 0.25, 0.04, 0.25
call = ek.options.bs_price(S, K, t, r, sig, kind="call")
put  = ek.options.bs_price(S, K, t, r, sig, kind="put")
premium = call + put                      # cost of the straddle

gc = ek.options.bs_greeks(S, K, t, r, sig, kind="call")
gp = ek.options.bs_greeks(S, K, t, r, sig, kind="put")
net_delta = gc["delta"] + gp["delta"]     # ~ 0 at the money
net_vega  = gc["vega"]  + gp["vega"]       # additive, long vol
print(round(premium, 3), round(net_delta, 4), round(net_vega / 100, 3))`}
      />
      <Callout kind="tip" title="Scenario">
        A biotech, <Strong>Zenith Pharma</Strong>, trades at $100 with an FDA ruling due in three months. You have no
        view on approval-vs-rejection but you are certain the news will move the stock violently. Buy the 3-month $100
        straddle at <MathInline>{"\\sigma=25\\%"}</MathInline>: the call costs about $5.20, the put about $4.30, so the
        straddle costs roughly <MathInline>{"\\$9.50"}</MathInline>. Net delta is near zero (the two legs cancel), so you
        do not care <em>which</em> way — you care <em>how far</em>. Your break-evens are strike ± premium, i.e. $90.50
        and $109.50: Zenith must move more than <MathInline>{"\\approx 9.5\\%"}</MathInline> in either direction before
        expiry for the position to pay. A verdict that sends it to $120 nets{" "}
        <MathInline>{"20 - 9.50 = \\$10.50"}</MathInline>; a boring $103 close loses most of the premium to theta. You
        bought movement and vega; the FDA either delivers or you bleed.
      </Callout>

      <H2>Delta-hedging: gamma vs theta</H2>
      <P>
        Buying a straddle leaves you exposed to direction if the underlying drifts. To isolate a <em>pure</em> vol bet,
        continuously <Strong>delta-hedge</Strong>: hold <MathInline>{"-\\Delta"}</MathInline> units of the underlying and
        rebalance as spot moves. A delta-hedged long option has no first-order spot exposure, so its P&amp;L over a
        small step <MathInline>{"\\Delta S"}</MathInline> in time <MathInline>{"dt"}</MathInline> is the second-order
        Taylor expansion:
      </P>
      <Math>{"dP \\approx \\tfrac{1}{2}\\,\\Gamma\\,(\\Delta S)^2 + \\Theta\\,dt"}</Math>
      <P>
        This is the central identity of vol trading. The first term is <Strong>positive</Strong> (long gamma:{" "}
        <MathInline>{"\\Gamma > 0"}</MathInline> and <MathInline>{"(\\Delta S)^2 \\ge 0"}</MathInline>) — you make money
        from movement regardless of sign, because each rebalance buys low and sells high around the hedge. The second
        term is <Strong>negative</Strong> (theta decay: <MathInline>{"\\Theta < 0"}</MathInline>) — you bleed time value
        every day. The net is a race:
      </P>
      <Math>{"dP \\approx \\tfrac{1}{2}\\,\\Gamma\\,S^2\\big(\\sigma_{\\text{realized}}^2 - \\sigma_{\\text{implied}}^2\\big)\\,dt"}</Math>
      <P>
        Rewritten this way it is transparent: a delta-hedged long option makes money exactly when realized volatility
        exceeds the implied vol you paid, and loses when it does not. You bought vol at <MathInline>{"\\sigma_{\\text{implied}}"}</MathInline>;
        the market delivers <MathInline>{"\\sigma_{\\text{realized}}"}</MathInline>; the difference, scaled by your
        gamma exposure, is the P&amp;L. The short-vol seller sits on the other side of this equation — collecting theta,
        praying gamma losses stay small.
      </P>
      <Callout kind="tip" title="Scenario: the gamma-vs-theta race, day by day">
        You delta-hedge the long Zenith straddle. Say it carries <MathInline>{"\\Gamma \\approx 0.06"}</MathInline> and{" "}
        <MathInline>{"\\Theta \\approx -\\$0.08"}</MathInline> per day. Set the two terms equal to find your break-even
        daily move: <MathInline>{"\\tfrac{1}{2}(0.06)(\\Delta S)^2 = 0.08 \\Rightarrow \\Delta S \\approx \\$1.63"}</MathInline>,
        i.e. a 1.6% day — which annualises to <MathInline>{"1.6\\%\\times\\sqrt{252}\\approx 25\\%"}</MathInline>, exactly
        the implied vol you paid. That is not a coincidence; it is the identity above. Now watch two days:
        <br />• A <Strong>4% day</Strong> (<MathInline>{"\\Delta S = \\$4"}</MathInline>): gamma earns{" "}
        <MathInline>{"\\tfrac{1}{2}(0.06)(4)^2 = \\$0.48"}</MathInline>, theta costs $0.08, net{" "}
        <Strong>+$0.40</Strong>. Movement won.
        <br />• A <Strong>quiet 0.8% day</Strong> (<MathInline>{"\\Delta S = \\$0.80"}</MathInline>): gamma earns only{" "}
        <MathInline>{"\\tfrac{1}{2}(0.06)(0.8)^2 = \\$0.02"}</MathInline>, theta still costs $0.08, net{" "}
        <Strong>−$0.06</Strong>. Time won. Sum a month of days: you profit if and only if Zenith realizes more than the
        25% you paid. The hedge turned a directional lottery ticket into a clean bet on realized-vs-implied.
      </Callout>
      <Callout kind="tip" title="The trade IS the variance risk premium">
        Selling a delta-hedged straddle is the direct expression of the VRP: you collect{" "}
        <MathInline>{"\\Theta\\,dt"}</MathInline> and pay out <MathInline>{"\\tfrac{1}{2}\\Gamma(\\Delta S)^2"}</MathInline>.
        On average implied &gt; realized, so on average you win — but the loss term is <em>unbounded</em> in a gap, and
        no amount of average edge saves you from a single day where <MathInline>{"(\\Delta S)^2"}</MathInline> is huge.
      </Callout>

      <H2>The short-vol tail</H2>
      <P>
        The reason short vol is treated with such caution is the shape of its return distribution: many small positive
        days (theta collected) and a fat, sudden left tail (gamma losses in a crash, compounded by implied vol spiking
        against your short vega at the worst moment). It is negatively skewed and leptokurtic — the mirror image of the
        right-skewed trend-following payoff. Standard risk metrics <em>flatter</em> it: a short-vol book can post a
        gorgeous Sharpe for years and then surrender it all in a week, because Sharpe cannot see a tail it has not
        sampled yet.
      </P>
      <Callout kind="warn" title="Scenario: the short-vol seller who was right until they weren't">
        Flip the earlier trade around. A desk sells the 30-day S&amp;P vol at 18% while the index realizes 11%, and
        delta-hedges. Month after month it collects the <MathInline>{"\\Theta\\,dt"}</MathInline> spread — a steady{" "}
        <MathInline>{"\\approx +1\\%"}</MathInline> a month, Sharpe near 2, a beautiful equity curve. Then a shock hits:
        the index gaps −6% in a day and implied vol spikes from 18% to 45%. The gamma term{" "}
        <MathInline>{"\\tfrac{1}{2}\\Gamma(\\Delta S)^2"}</MathInline> — now with the sign against them — detonates, and
        the short vega loses again as implied vol reprices upward at the worst possible moment. One day erases eighteen
        months of premium. The average edge was real; it just never paid for the tail. Size against that day, not
        against the Sharpe.
      </Callout>
      <P>
        This is not a reason to avoid vol — it is a reason to size it against the tail, not the average. The lessons
        from <A href="/tutorials/position-sizing">position sizing</A> and{" "}
        <A href="/tutorials/monte-carlo">Monte Carlo</A> apply with full force: bootstrap the worst case, never let a
        single event exceed your ruin threshold, and report MAR and the loss distribution alongside any headline
        return.
      </P>

      <P>
        <Strong>Next:</Strong>{" "}
        <A href="/tutorials/market-microstructure">Market microstructure</A> — the limit order book, the anatomy of the
        bid-ask spread, and where trading costs are actually born.
      </P>
    </>
  );
}
