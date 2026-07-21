import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, A, Strong, Callout } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Position sizing & risk" };

export default function Page() {
  return (
    <>
      <H1>Position sizing &amp; risk</H1>
      <Lead>
        Sizing does not create edge — a losing strategy sized any way still loses — but it decides whether a real edge
        compounds into wealth or gets wiped out by an unlucky run first. This chapter is the bridge from the R-multiples
        of the last five chapters to dollars: fixed-fractional risk, volatility targeting, Kelly and why you trade a
        fraction of it, and the drawdown-budget machinery edgekit uses to size a whole book to a hard risk limit.
      </Lead>

      <H2>Fixed-fractional risk</H2>
      <P>
        The foundation: risk the same fraction <MathInline>{"f"}</MathInline> of current equity on every trade. Since a
        trade&apos;s risk is 1R (the stop distance), you convert R to dollars by choosing how many dollars 1R is worth:
      </P>
      <Math>{"\\text{dollar risk} = f \\cdot E, \\qquad \\text{units} = \\frac{f \\cdot E}{d_{\\text{stop}}}"}</Math>
      <P>
        with <MathInline>{"E"}</MathInline> equity and <MathInline>{"d_{\\text{stop}}"}</MathInline> the stop distance in
        price units. Two properties matter. Because it scales with equity, wins compound and losses shrink the next
        bet — you can never (in theory) go fully bust on a series of −1R losses. And because risk is fixed <em>per R</em>,
        a volatile instrument with a wide ATR stop automatically gets fewer units, equalising risk across the book. A
        typical <MathInline>{"f"}</MathInline> is 0.5–2% per trade; the ceiling is set by drawdown tolerance, below.
      </P>
      <P>
        <Strong>Scenario (R to contracts).</Strong> Account <MathInline>{"E = \\$100{,}000"}</MathInline>, risk{" "}
        <MathInline>{"f = 1\\%"}</MathInline>, so dollar risk is $1,000. Your BTCUSDT long has a stop distance of 1,800
        points; at $1 per point per unit that is <MathInline>{"1{,}000/1{,}800 \\approx 0.56"}</MathInline> BTC. Now the
        same account takes a low-vol trade with a 400-point stop: units become <MathInline>{"1{,}000/400 = 2.5"}</MathInline>{" "}
        — over four times the size, because the tighter stop means each unit risks less. Both trades put exactly $1,000 at
        risk; the position size floats so the <em>risk</em> stays flat. Win the BTC trade at +2R and you make $2,000
        (2%); lose it and you are down $1,000, and next trade&apos;s 1% is computed on the smaller $99,000 — losers
        automatically shrink the bet.
      </P>

      <H2>Volatility targeting</H2>
      <P>
        Fixed-fractional holds <em>per-trade</em> risk constant; volatility targeting holds the <em>portfolio&apos;s</em>{" "}
        realised volatility constant. Scale exposure inversely to recent volatility so the book delivers a steady risk
        level instead of lurching with the market&apos;s mood:
      </P>
      <Math>{"\\text{scale}_t = \\frac{\\sigma_{\\text{target}}}{\\sigma_t}, \\qquad \\sigma_t = \\text{trailing volatility (lagged)}"}</Math>
      <P>
        When the book goes quiet the scale presses risk up; when volatility spikes it trims. edgekit&apos;s{" "}
        <Code>ek.sizing.vol_target</Code> implements exactly this, with two guardrails: the target is the book&apos;s own{" "}
        <em>expanding median</em> volatility (not a hand-picked number that invites overfitting), and the scale is clipped
        to <MathInline>{"[0.5,\\, \\text{cap}]"}</MathInline> so it never de-levers below half or levers past the cap.
      </P>
      <CodeBlock code={`stable = ek.sizing.vol_target(book_r, cap=1.5)   # steady vol; scale clipped to [0.5, 1.5]`} />
      <P>
        <Strong>Scenario (leaning against the market&apos;s mood).</Strong> Your book&apos;s own median trailing
        volatility is the target. Through a sleepy summer the book&apos;s realised vol drops to two-thirds of that median,
        so <MathInline>{"\\text{scale} = \\sigma_{\\text{target}}/\\sigma_t \\approx 1.5"}</MathInline> — and the cap of
        1.5 catches it exactly, pressing exposure up to fill the quiet. Then a volatility spike doubles realised vol; the
        scale wants to drop to ~0.5 and the floor clips it there, halving exposure so the book keeps delivering roughly
        the same risk instead of lurching with the tape. Without the clips a single freak-calm week could lever you to
        the moon right before the storm.
      </P>
      <Callout kind="warn" title="Every weighting statistic is lagged">
        The vol estimate that sizes bar <Code>i</Code> may only see returns through <Code>i-1</Code> — it is{" "}
        <Code>.shift(1)</Code> throughout <A href="/docs/api/sizing">edgekit.sizing</A>. Size on a volatility that
        includes the current bar and you are, once again, reading the future.
      </Callout>

      <H2>Kelly and fractional Kelly</H2>
      <P>
        Kelly answers &ldquo;what <MathInline>{"f"}</MathInline> maximises long-run compound growth?&rdquo; For a bet
        paying <MathInline>{"b"}</MathInline> to 1 with win probability <MathInline>{"p"}</MathInline> (recall{" "}
        <A href="/tutorials/the-math-of-edge">the math of edge</A>):
      </P>
      <Math>{"f^{*} = \\frac{p(b+1) - 1}{b}"}</Math>
      <P>
        <Strong>Scenario (plug in a real backtest).</Strong> Your validated trend-follower wins{" "}
        <MathInline>{"p = 0.42"}</MathInline> of the time and its average winner is 2.5× its average loser, so{" "}
        <MathInline>{"b = 2.5"}</MathInline>. Then <MathInline>{"f^{*} = (0.42 \\cdot 3.5 - 1)/2.5 = 0.19"}</MathInline> —
        full Kelly says risk <em>19%</em> of equity per trade. That is terrifying: a run of four losers (entirely normal
        at a 42% win rate) would carve roughly 55% off the account. And your <MathInline>{"p"}</MathInline> and{" "}
        <MathInline>{"b"}</MathInline> came from a noisy backtest that almost certainly overstates the edge. Take
        half-Kelly and you risk ~9.5%; take the quarter-Kelly most desks actually run and you are near 4.75% — already
        aggressive, and a country mile below the raw number the formula spat out.
      </P>
      <P>
        Betting more than <MathInline>{"f^{*}"}</MathInline> lowers growth <em>and</em> raises risk — a strictly bad
        trade — and betting past <MathInline>{"2f^{*}"}</MathInline> drives expected log-growth negative even with a
        positive edge. The growth-rate curve is a dome: it climbs to a peak at <MathInline>{"f^{*}"}</MathInline> and
        falls away on the right.
      </P>
      <ChartFigure
        name="tut/kelly_curve"
        alt="Long-run growth rate as a function of bet fraction, peaking at f-star"
        caption="Expected log-growth versus bet fraction. The peak is Kelly; the right shoulder is steep, which is why practitioners deliberately sit to the left of it."
      />
      <P>
        Nobody trades full Kelly. It assumes you know <MathInline>{"p"}</MathInline> and <MathInline>{"b"}</MathInline>{" "}
        exactly — you don&apos;t, you estimated them from a noisy backtest — and full Kelly produces drawdowns most humans
        cannot sit through. Overestimating the edge pushes you past the peak into the region where growth is negative.
        The standard defence is <Strong>fractional Kelly</Strong>: trade <MathInline>{"\\lambda f^{*}"}</MathInline> with{" "}
        <MathInline>{"\\lambda \\approx 0.25\\text{–}0.5"}</MathInline>. Half-Kelly keeps about three-quarters of the
        growth for roughly half the volatility — a trade almost always worth making given estimation error.
      </P>
      <Callout kind="danger" title="Kelly is a ceiling, not a target">
        Because your edge estimate is uncertain and optimistically biased, treat Kelly as the absolute maximum and live
        well below it. The risk-of-ruin math below is what makes that concrete.
      </Callout>

      <H2>Sizing to a drawdown budget</H2>
      <P>
        In practice you rarely size from Kelly directly — you size to a <em>drawdown limit</em>, because that is the
        constraint that actually ends accounts (and the one prop firms enforce). The question inverts: given this
        strategy&apos;s R-stream and a maximum tolerable drawdown, how many dollars per R can I risk? edgekit answers it
        with <Code>ek.metrics.dd_matched_size</Code> — the single home for that math — wrapped by{" "}
        <Code>ek.sizing.size_to_dd</Code>, which returns the sized dollar series directly.
      </P>
      <Math>{"\\text{dollar per R} = \\frac{\\text{dd\\_budget} \\cdot E}{\\text{max drawdown of the R-stream}}"}</Math>
      <CodeBlock
        filename="size_to_dd.py"
        code={`res = ek.sizing.size_to_dd(daily_r, dd_budget=0.095, account=100_000, daily_cap=0.045)
res["sized"]         # dollar P&L series; historical max DD == 9.5% of account (when max-dd binds)
res["dollar_per_r"]  # the dollars-per-R scalar this implies
res["binding"]       # "max-dd" or "daily" — which constraint set the size`}
      />
      <P>
        <Strong>Scenario (sizing to a prop limit).</Strong> A $100k FTMO-style account allows a 10% overall drawdown; you
        budget 9.5% to leave a buffer. Your strategy&apos;s historical R-stream had a max drawdown of 22R. Then dollars
        per R = <MathInline>{"(0.095 \\cdot 100{,}000)/22 \\approx \\$432"}</MathInline>: risk about $432 per trade and the
        <em> historical</em> path would have drawn down exactly to the 9.5% line at its worst. But add the{" "}
        <Code>daily_cap=0.045</Code> and if any single day&apos;s R-loss, scaled at $432/R, would breach 4.5% of the
        account, the daily rule binds first and <Code>res[&quot;binding&quot;]</Code> returns <Code>&quot;daily&quot;</Code>{" "}
        — forcing a smaller size. Whichever leash is shorter is the one that sets your stake.
      </P>
      <P>
        With a <Code>daily_cap</Code>, whichever constraint binds tighter wins — a dual limit that mirrors a
        prop-firm&apos;s combined max-drawdown and daily-loss rules (see{" "}
        <A href="/tutorials/prop-firm-capital">prop-firm capital</A>).
      </P>
      <Callout kind="warn" title="A drawdown-matched size is a ceiling, not a forecast">
        <Code>size_to_dd</Code> reproduces the <em>historical</em> worst drawdown exactly — live drawdown runs deeper, by
        definition, because the future contains a worse run than the past you fitted to. Treat the sized curve as an
        optimistic ceiling: apply a haircut, and where possible size against a bootstrapped <Code>dd95</Code> from{" "}
        <A href="/tutorials/monte-carlo">Monte Carlo</A> rather than the lucky realised drawdown.
      </Callout>

      <H2>Risk of ruin</H2>
      <P>
        Why fractional matters, made quantitative. For a strategy with per-trade win probability{" "}
        <MathInline>{"p"}</MathInline> risking a fraction that survives <MathInline>{"N"}</MathInline> consecutive losses,
        the probability of eventually hitting a ruin threshold rises steeply as the bet fraction climbs. A useful
        closed form for even-money-style bets is
      </P>
      <Math>{"P(\\text{ruin}) \\approx \\left(\\frac{1-e}{1+e}\\right)^{u}, \\qquad e = 2p - 1"}</Math>
      <P>
        where <MathInline>{"e"}</MathInline> is the edge and <MathInline>{"u"}</MathInline> the number of risk-units of
        capital. The lesson is not the exact formula but its shape: ruin probability is exponentially sensitive to how
        much you risk per bet, so halving the bet fraction does far more than halve the tail risk.
      </P>
      <P>
        <Strong>Scenario (the convexity, concretely).</Strong> Two traders share the same real edge but size it
        differently. Trader A risks 2% per trade, so a &ldquo;ruin&rdquo; drawdown is many risk-units of capital away —
        the probability of blowing up is a fraction of a percent. Trader B, sure the edge is bigger than it is, risks 8%.
        B has not merely quadrupled the risk: because <MathInline>{"u"}</MathInline> (capital measured in risk-units)
        shrank by 4×, the ruin probability rose <em>super-linearly</em> into the double digits. Same signal, same
        win rate — one survives a bad streak, the other doesn&apos;t. Sizing didn&apos;t change the edge; it changed
        whether the trader is around to collect it.
      </P>
      <ChartFigure
        name="tut/risk_of_ruin"
        alt="Probability of ruin rising with risk-per-trade"
        caption="Risk of ruin versus fraction risked per trade. The curve is convex: modest reductions in bet size buy large reductions in the probability of blowing up."
      />

      <H2>Governing a book: risk parity, CPPI, drawdown throttle</H2>
      <P>Once several validated strategies run together, sizing becomes allocation. edgekit separates three jobs:</P>
      <H3>Risk parity (inverse-vol)</H3>
      <P>
        Weight each strategy by the reciprocal of its trailing volatility so no single loud asset dominates the
        book&apos;s risk — every sleeve contributes roughly equal risk rather than equal dollars:
      </P>
      <Math>{"w_i \\propto \\frac{1}{\\sigma_i}, \\qquad \\text{book}_t = \\sum_i w_{i} \\, R_{i,t}"}</Math>
      <CodeBlock code={`w    = ek.sizing.risk_parity(M)        # M: columns are per-strategy daily-R series
book = (M * w).sum(axis=1)             # the equal-risk combined R-stream`} />
      <H3>CPPI — throttle up when winning, down when bleeding</H3>
      <P>
        Constant-Proportion Portfolio Insurance runs a trailing floor below the high-water mark and risks in proportion
        to the <em>cushion</em> — the distance from equity down to that floor. Risk scales up while the book climbs and
        toward zero as it approaches the floor, which is the mechanism behind prop-challenge survival curves.
      </P>
      <CodeBlock code={`throttled = ek.sizing.cppi(daily_pnl, account=100_000, mstop=0.10, slope=2.0, cap=1.5)`} />
      <H3>Drawdown throttle</H3>
      <P>
        The blunt version: halve risk whenever the equity curve is more than a threshold below its peak, restore it on
        recovery. Path-dependent and applied sequentially, it is a simple circuit-breaker on a live path.
      </P>
      <CodeBlock code={`out = ek.sizing.dd_throttle(daily_pnl, thresh=0.04, factor=0.5)   # halve risk while >4% underwater`} />
      <ChartFigure
        name="allocation_area"
        alt="Stacked allocation weights across strategies over time"
        caption="A governed book's weights drifting over time: risk parity keeps each sleeve's risk contribution balanced as their volatilities move."
      />

      <H2>The order of operations</H2>
      <P>
        Combine the sleeves (risk parity) → stabilise the book&apos;s volatility (vol-target) → size it to a drawdown
        budget in dollars (size-to-dd) → govern the live path (CPPI / throttle). Keeping these four steps separate is
        what lets you reason about each independently — and it is exactly how edgekit&apos;s sizing layer is factored.
        Sizing is the last thing you decide and the first thing that saves you.
      </P>
      <P>
        Next: <A href="/tutorials/backtesting-fundamentals">Part IV — Backtesting fundamentals</A>, where we stop
        trusting a single equity curve and start proving whether the edge is real.
      </P>
    </>
  );
}
