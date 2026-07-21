import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, A, Strong, Callout, Code } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Options & the Greeks" };

export default function Page() {
  return (
    <>
      <H1>Options & the Greeks</H1>
      <Lead>
        An option is the right — not the obligation — to trade an asset at a fixed price. That asymmetry turns it into a
        bet on <em>where</em> and <em>how much</em> a price will move, priced by no-arbitrage. This chapter builds the
        instrument from its payoff up: intrinsic versus time value, put-call parity from a replication argument,
        Black-Scholes as the risk-neutral discounted expectation, the Greeks as its partial derivatives, and implied
        volatility as the number you back out by inverting the formula. Every quantity here maps to a call in{" "}
        <Code>ek.options</Code>.
      </Lead>

      <Callout kind="tip" title="Why a trader cares">
        You think <Strong>Acme Corp</Strong>, trading at $100, will move hard on next month&apos;s earnings — but you are
        not sure which way, and you cannot stomach the open-ended loss of guessing wrong with shares. Buy one call and
        your downside is floored at the premium (say $2.30), while a big up-move still pays. That is the trade an option
        lets you express and a share position cannot. Everything below exists to answer two practical questions: is
        $2.30 a <em>fair</em> price for that bet, and once you own it, what exactly moves your P&amp;L — the stock, the
        clock, or the market&apos;s changing fear? Price, the Greeks, and implied vol are the three answers.
      </Callout>

      <H2>Calls, puts, and payoff</H2>
      <P>
        A <Strong>call</Strong> pays off when the underlying finishes above the strike; a <Strong>put</Strong> pays off
        below it. At expiry the value depends only on the terminal spot <MathInline>{"S_T"}</MathInline> and the strike{" "}
        <MathInline>{"K"}</MathInline>:
      </P>
      <Math>{"\\text{Call}_T = \\max(S_T - K,\\, 0), \\qquad \\text{Put}_T = \\max(K - S_T,\\, 0)"}</Math>
      <P>
        The <MathInline>{"\\max(\\cdot, 0)"}</MathInline> is the whole story: your loss is floored at the premium you
        paid, while the upside is open (call) or bounded only by <MathInline>{"S_T \\to 0"}</MathInline> (put). That
        kinked, convex payoff is what you cannot replicate with the linear P&amp;L of a spot position — it is why
        options exist.
      </P>
      <ChartFigure
        name="tut/option_payoff"
        alt="Payoff diagrams at expiry for a long call and a long put, hockey-stick shapes kinked at the strike"
        caption="Payoff at expiry. The long call (left) is flat below K then rises 1:1; the long put (right) falls 1:1 toward the strike then flattens. The dashed line subtracts the premium to give profit."
      />
      <Callout kind="tip" title="Scenario">
        Buy the Acme $100 call for a $2.30 premium. At expiry your profit is{" "}
        <MathInline>{"\\max(S_T - 100, 0) - 2.30"}</MathInline>. If earnings disappoint and Acme closes at $95, the call
        expires worthless and you lose exactly $2.30 — no more, whatever the crash. If it rips to $115 you collect{" "}
        <MathInline>{"15 - 2.30 = \\$12.70"}</MathInline>. Your <Strong>break-even</Strong> is $102.30 (strike plus
        premium): below it the trade loses, above it it wins, and the loss can never exceed the premium. That capped,
        one-sided shape is the convexity a linear share position simply does not have.
      </Callout>

      <H3>Intrinsic value vs time value</H3>
      <P>
        Before expiry an option is worth more than its payoff-if-exercised-now. Split the premium in two:
      </P>
      <Math>{"V = \\underbrace{\\max(S - K,\\, 0)}_{\\text{intrinsic}} + \\underbrace{(V - \\max(S - K,\\, 0))}_{\\text{time value}}"}</Math>
      <P>
        <Strong>Intrinsic value</Strong> is what you would collect exercising immediately — zero for an out-of-the-money
        option. <Strong>Time value</Strong> is everything left: the premium the market charges for the <em>chance</em>{" "}
        that the option moves further into the money before expiry. It is largest at-the-money and decays to zero as{" "}
        <MathInline>{"t \\to 0"}</MathInline> — the erosion that <MathInline>{"\\Theta"}</MathInline> (below) measures.
      </P>
      <P>
        <Strong>Scenario.</Strong> Acme has climbed to $108 and your $100 call now trades at $9.50. Its intrinsic value
        is <MathInline>{"\\max(108 - 100, 0) = \\$8"}</MathInline>; the remaining <MathInline>{"9.50 - 8 = \\$1.50"}</MathInline>{" "}
        is time value — the market&apos;s charge for the chance the stock climbs even further before expiry. Hold to the
        last day with Acme still at $108 and that $1.50 has bled away to nothing: you are left with the $8 intrinsic and
        not a cent more. The time value is what you are really buying and selling when you trade an option early.
      </P>

      <H2>Put-call parity</H2>
      <P>
        Before any pricing model, a pure no-arbitrage relation ties calls and puts together. Consider two portfolios
        held to expiry <MathInline>{"T"}</MathInline>:
      </P>
      <P>
        <Strong>A</Strong>: long one call, short one put, both struck at <MathInline>{"K"}</MathInline>. At expiry it is
        worth <MathInline>{"\\max(S_T - K, 0) - \\max(K - S_T, 0) = S_T - K"}</MathInline> in every state of the world.
        <br />
        <Strong>B</Strong>: long one share (reinvesting the continuous carry <MathInline>{"q"}</MathInline>) plus a
        loan whose face value is <MathInline>{"K"}</MathInline>. At expiry it is worth{" "}
        <MathInline>{"S_T - K"}</MathInline> too.
      </P>
      <P>
        Two portfolios with identical payoffs in <em>every</em> state must have identical value today, or you could buy
        the cheap one, sell the dear one, and pocket a riskless profit. Discounting each leg to the present — the share
        by its carry, the loan by the rate <MathInline>{"r"}</MathInline> — gives put-call parity:
      </P>
      <Math>{"C - P = S e^{-qt} - K e^{-rt}"}</Math>
      <P>
        This holds for European options <em>independent of any model</em> — it never assumes Black-Scholes. It is the
        first thing to sanity-check a pricer against: price a call and a put at the same strike and confirm the
        difference equals the forward minus the discounted strike.
      </P>
      <CodeBlock
        filename="parity.py"
        code={`import numpy as np
import edgekit as ek

S, K, t, r, q, sigma = 100.0, 100.0, 0.5, 0.04, 0.01, 0.20
C = ek.options.bs_price(S, K, t, r, sigma, kind="call", q=q)
P = ek.options.bs_price(S, K, t, r, sigma, kind="put",  q=q)

lhs = C - P
rhs = S * np.exp(-q * t) - K * np.exp(-r * t)
print(round(lhs, 8), round(rhs, 8))   # equal to machine precision`}
      />

      <H2>The Black-Scholes price</H2>
      <P>
        Black-Scholes-Merton assumes the underlying follows geometric Brownian motion with constant volatility{" "}
        <MathInline>{"\\sigma"}</MathInline>, and prices the option as the discounted expectation of its payoff under
        the <em>risk-neutral</em> measure (where the drift is the carry-adjusted rate, not the real-world return). The
        closed form for a call is:
      </P>
      <Math>{"C = S e^{-qt}\\,\\Phi(d_1) - K e^{-rt}\\,\\Phi(d_2)"}</Math>
      <Math>{"P = K e^{-rt}\\,\\Phi(-d_2) - S e^{-qt}\\,\\Phi(-d_1)"}</Math>
      <P>
        where <MathInline>{"\\Phi"}</MathInline> is the standard-normal CDF and
      </P>
      <Math>{"d_1 = \\frac{\\ln(S/K) + (r - q + \\tfrac{1}{2}\\sigma^2)\\,t}{\\sigma\\sqrt{t}}, \\qquad d_2 = d_1 - \\sigma\\sqrt{t}"}</Math>
      <P>
        Read the call intuitively: <MathInline>{"\\Phi(d_2)"}</MathInline> is (roughly) the risk-neutral probability of
        finishing in the money, so <MathInline>{"K e^{-rt}\\Phi(d_2)"}</MathInline> is the expected cost you pay for the
        stock, and <MathInline>{"S e^{-qt}\\Phi(d_1)"}</MathInline> is the discounted expected value of the stock you
        receive, conditional on exercise. The single free input is <MathInline>{"\\sigma"}</MathInline>: everything else
        is observable. The same formula prices equity (<MathInline>{"q"}</MathInline> = dividend yield), FX (
        <MathInline>{"q"}</MathInline> = foreign rate) and futures options (<MathInline>{"q = r"}</MathInline>, the
        Black-76 case).
      </P>
      <CodeBlock
        filename="price.py"
        code={`import edgekit as ek

# 6-month at-the-money call, 4% rate, 1% carry, 20% vol
px = ek.options.bs_price(S=100, K=100, t=0.5, r=0.04, sigma=0.20, kind="call", q=0.01)
print(round(px, 4))            # ~ 5.9  (all time value: ATM has zero intrinsic)

# deep in-the-money call -> price dominated by intrinsic (S - K discounted)
print(round(ek.options.bs_price(140, 100, 0.5, 0.04, 0.20, kind="call"), 4))`}
      />
      <Callout kind="tip" title="Scenario">
        Back to Acme&apos;s earnings bet. Price the <Strong>1-month</Strong> at-the-money call:{" "}
        <MathInline>{"S=K=100"}</MathInline>, <MathInline>{"t=1/12\\approx0.083"}</MathInline>,{" "}
        <MathInline>{"r=0.04"}</MathInline>, <MathInline>{"\\sigma=0.20"}</MathInline>. Black-Scholes returns roughly{" "}
        <MathInline>{"\\$2.30"}</MathInline> — the $2.30 premium from the hook, now derived, not assumed. A useful ATM
        rule of thumb reproduces it: <MathInline>{"C \\approx 0.4\\,S\\,\\sigma\\sqrt{t} = 0.4(100)(0.20)\\sqrt{0.083} \\approx 2.31"}</MathInline>.
        Now stretch the same call to <Strong>6 months</Strong> and the price roughly triples to about $5.90 — twice as
        much calendar time is not twice the premium, because time value scales with{" "}
        <MathInline>{"\\sqrt{t}"}</MathInline>, not <MathInline>{"t"}</MathInline>. That single square-root is why
        short-dated options are cheap in dollars but brutally expensive in decay per day.
      </Callout>
      <Callout kind="note" title="Pure numpy, no scipy">
        <Code>ek.options</Code> implements <MathInline>{"\\Phi"}</MathInline> as{" "}
        <MathInline>{"\\tfrac{1}{2}(1 + \\operatorname{erf}(x/\\sqrt{2}))"}</MathInline> via <Code>math.erf</Code>, so
        every function is float-in / float-out but also broadcasts elementwise over numpy arrays — price a whole strike
        ladder in one call by passing an array of <Code>K</Code>.
      </Callout>

      <H2>The Greeks</H2>
      <P>
        The Greeks are the partial derivatives of the price with respect to each input — the sensitivities you hedge and
        risk-manage against. <Code>ek.options.bs_greeks(...)</Code> returns all five in one dict:{" "}
        <Code>delta</Code>, <Code>gamma</Code>, <Code>vega</Code>, <Code>theta</Code>, <Code>rho</Code>.
      </P>

      <H3>Delta — sensitivity to spot</H3>
      <P>
        <MathInline>{"\\Delta = \\partial V / \\partial S"}</MathInline>, the change in option value per <MathInline>{"\\$1"}</MathInline>{" "}
        move in spot. For a call it is exactly:
      </P>
      <Math>{"\\Delta_{\\text{call}} = e^{-qt}\\,\\Phi(d_1) \\in (0, 1), \\qquad \\Delta_{\\text{put}} = e^{-qt}(\\Phi(d_1) - 1) \\in (-1, 0)"}</Math>
      <P>
        It doubles as the hedge ratio (hold <MathInline>{"-\\Delta"}</MathInline> shares to neutralise spot risk) and as
        a rough in-the-money probability. Deep ITM calls approach <MathInline>{"\\Delta = 1"}</MathInline> (they behave
        like stock); far OTM approach <MathInline>{"0"}</MathInline>.
      </P>

      <H3>Gamma — curvature</H3>
      <P>
        <MathInline>{"\\Gamma = \\partial^2 V / \\partial S^2"}</MathInline>, how fast delta itself moves. It is the same
        for calls and puts and is always positive for a long option:
      </P>
      <Math>{"\\Gamma = \\frac{e^{-qt}\\,\\phi(d_1)}{S\\,\\sigma\\sqrt{t}}"}</Math>
      <P>
        Gamma is the convexity you pay theta for. It peaks at-the-money and near expiry, and it is the term that makes a
        delta-hedged long-option position profit from large moves — the subject of the next chapter.
      </P>

      <H3>Vega — sensitivity to volatility</H3>
      <P>
        <MathInline>{"\\mathcal{V} = \\partial V / \\partial \\sigma"}</MathInline>, the change in value per unit of
        volatility. Same for calls and puts, always positive for a long option:
      </P>
      <Math>{"\\mathcal{V} = S\\,e^{-qt}\\,\\phi(d_1)\\,\\sqrt{t}"}</Math>
      <Callout kind="warn" title="Vega is quoted per 1.00 of vol">
        <Code>bs_greeks</Code> returns vega per <Strong>1.00</Strong> (=100 vol-points) of <MathInline>{"\\sigma"}</MathInline>.
        To get the more familiar &ldquo;dollars per 1% vol move&rdquo;, divide by 100. Likewise <Code>theta</Code> is
        per <em>year</em> — divide by 365 for per-calendar-day decay — and <Code>rho</Code> is per 1.00 of rate (÷100
        for per-1%). Getting these unit conventions wrong is the single most common Greeks bug.
      </Callout>

      <H3>Theta — time decay</H3>
      <P>
        <MathInline>{"\\Theta = \\partial V / \\partial t"}</MathInline> (per year), the erosion of time value as expiry
        approaches. It is negative for a long option — you bleed premium every day nothing happens:
      </P>
      <Math>{"\\Theta_{\\text{call}} = -\\frac{S e^{-qt}\\phi(d_1)\\,\\sigma}{2\\sqrt{t}} - r K e^{-rt}\\Phi(d_2) + q S e^{-qt}\\Phi(d_1)"}</Math>

      <H3>Rho — sensitivity to rates</H3>
      <P>
        <MathInline>{"\\rho = \\partial V / \\partial r"}</MathInline>, usually the smallest Greek for short-dated
        options: <MathInline>{"\\rho_{\\text{call}} = K t\\,e^{-rt}\\,\\Phi(d_2)"}</MathInline> and{" "}
        <MathInline>{"\\rho_{\\text{put}} = -K t\\,e^{-rt}\\,\\Phi(-d_2)"}</MathInline>.
      </P>
      <ChartFigure
        name="tut/option_greeks"
        alt="Delta, gamma, vega, and theta plotted against spot for a call option, showing delta as an S-curve and gamma/vega peaking at the money"
        caption="The Greeks as a function of spot. Delta is the S-curve from 0 to 1; gamma and vega both peak at-the-money; theta is most negative where time value (and gamma) is largest."
      />
      <CodeBlock
        filename="greeks.py"
        code={`import edgekit as ek

g = ek.options.bs_greeks(S=100, K=100, t=0.5, r=0.04, sigma=0.20, kind="call", q=0.01)
print(round(g["delta"], 4))          # ~ 0.55  (slightly above 0.5 for ATM call)
print(round(g["gamma"], 5))
print(round(g["vega"] / 100, 4))     # $ per +1% vol  (divide the per-1.00 vega by 100)
print(round(g["theta"] / 365, 4))    # $ per calendar day of decay
print(round(g["rho"] / 100, 4))      # $ per +1% rate`}
      />
      <Callout kind="tip" title="At the desk: reading the Acme call's Greeks">
        Pull the Greeks on the 1-month Acme call (<MathInline>{"S=K=100,\\ t=0.083,\\ \\sigma=0.20"}</MathInline>) and
        you get roughly <MathInline>{"\\Delta \\approx 0.53"}</MathInline>, <MathInline>{"\\Gamma \\approx 0.069"}</MathInline>,
        vega <MathInline>{"\\approx \\$0.115"}</MathInline> per 1% vol, and theta <MathInline>{"\\approx -\\$0.043"}</MathInline>{" "}
        per day. Read them as a risk report on your $2.30 bet: (1) <Strong>delta 0.53</Strong> — if Acme ticks up $1 the
        call gains about 53 cents, and to hedge the direction out you would short 0.53 shares per call; (2){" "}
        <Strong>gamma 0.069</Strong> — after that $1 move delta climbs to <MathInline>{"\\approx 0.60"}</MathInline>, so
        the position accelerates into the move (the convexity you paid for); (3) <Strong>vega $0.115</Strong> — if the
        market&apos;s implied vol jumps from 20% to 25% ahead of earnings, the call gains{" "}
        <MathInline>{"5 \\times 0.115 \\approx \\$0.58"}</MathInline> with the stock unchanged; (4){" "}
        <Strong>theta −$0.043</Strong> — every quiet day costs you 4.3 cents of premium. Own the call and you are long
        stock-sensitivity, long convexity, long vol, and short time. That is the whole position in four numbers.
      </Callout>

      <H2>Implied volatility</H2>
      <P>
        Black-Scholes takes <MathInline>{"\\sigma"}</MathInline> and returns a price. In the market you observe the
        <em> price</em> and want the volatility that reproduces it — the <Strong>implied volatility</Strong>. Because
        the price is strictly increasing in <MathInline>{"\\sigma"}</MathInline> (vega &gt; 0), there is a unique
        solution, found by inverting the formula numerically:
      </P>
      <Math>{"\\text{find } \\sigma_{\\text{imp}} \\;\\text{ s.t. }\\; \\text{BS}(S, K, t, r, \\sigma_{\\text{imp}}, q) = V_{\\text{market}}"}</Math>
      <P>
        <Code>ek.options.implied_vol</Code> does this with Newton-Raphson on vega, falling back to bisection when a step
        leaves the no-arbitrage bracket. It returns <Code>nan</Code> when no positive vol can reproduce the price —
        chiefly a quote below intrinsic value, or a non-positive price/time.
      </P>
      <CodeBlock
        filename="iv.py"
        code={`import edgekit as ek

# price a call at a known vol, then recover that vol from the price
px  = ek.options.bs_price(100, 100, 0.5, 0.04, 0.30, kind="call")
iv  = ek.options.implied_vol(px, 100, 100, 0.5, 0.04, kind="call")
print(round(iv, 6))          # -> 0.30, the round-trip is exact

# a quote below intrinsic has no solution
print(ek.options.implied_vol(0.01, 140, 100, 0.5, 0.04, kind="call"))  # nan`}
      />
      <Callout kind="tip" title="Scenario">
        A week before earnings the Acme $100 one-month call is no longer $2.30 — the screen shows it trading at{" "}
        <Strong>$2.85</Strong>. You did not change your rate or the time to expiry, so what does the market know that you
        did not? Invert it: <Code>ek.options.implied_vol(2.85, 100, 100, 0.083, 0.04, kind=&quot;call&quot;)</Code>{" "}
        returns roughly <MathInline>{"0.25"}</MathInline>. The market is pricing <Strong>25% implied vol</Strong>, not
        your 20% — it expects the earnings print to shake the stock 25% harder (annualised) than its recent history did.
        That 5-vol-point gap <em>is</em> the earnings risk premium, made explicit. If you still believe 20% is the right
        number, the call is expensive and you are on the wrong side of the bet — which is precisely the comparison the
        next chapter turns into a trade.
      </Callout>
      <P>
        Implied vol is the market&apos;s forward-looking price of risk, and reading it across strikes and maturities is
        where the constant-<MathInline>{"\\sigma"}</MathInline> assumption of Black-Scholes visibly breaks — the vol
        smile. That is the door into volatility trading.
      </P>

      <P>
        <Strong>Next:</Strong>{" "}
        <A href="/tutorials/volatility-trading">Volatility trading</A> — realized versus implied vol, the variance risk
        premium, the smile, and delta-hedging a long-gamma book.
      </P>
    </>
  );
}
