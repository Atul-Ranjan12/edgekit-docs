import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Entries, exits & stops" };

export default function Page() {
  return (
    <>
      <H1>Entries, exits &amp; stops</H1>
      <Lead>
        A signal tells you the market is interesting; the entry, the stop, and the exit decide whether that interest turns
        into R. This is where most of a strategy&apos;s realised behaviour is actually determined — and where a careless
        backtest manufactures phantom edge through optimistic fills. This chapter covers order types, gap-aware filling,
        stop placement, the exit families, and exactly how edgekit charges cost so your R-multiples are honest.
      </Lead>

      <H2>Order types</H2>
      <P>Three primitives cover almost everything, and the choice trades certainty of fill against price:</P>
      <Ul>
        <Li>
          <Strong>Market</Strong> — fill now at whatever the next print is. Certain fill, uncertain price; you pay the
          spread and any slippage. This is what edgekit&apos;s research engine assumes: an <Code>EntryIntent</Code> is
          filled at the <em>next bar&apos;s open</em>.
        </Li>
        <Li>
          <Strong>Limit</Strong> — fill only at your price or better. Good price, uncertain fill: a limit into a pullback
          may never trigger, and the ones that do skip the trades that ran away without you (adverse selection).
        </Li>
        <Li>
          <Strong>Stop</Strong> — becomes a market order once price trades through a level. This is the breakout entry
          (buy-stop above the range) and the protective exit (sell-stop below the trade). Certain to trigger on a touch,
          but fills at the market beyond your level — worse in a gap.
        </Li>
      </Ul>

      <H2>Gap-aware fills — pessimism is the point</H2>
      <P>
        The most seductive backtesting lie is assuming you got filled exactly at your intended price. Markets gap:
        overnight, over weekends, on news. If your breakout level is 100 and the bar opens at 103, you do not get 100 —
        you get 103. edgekit models this with two helpers the engine uses on every fill:
      </P>
      <CodeBlock code={`fill_entry(level: float, open_price: float, direction: int) -> float   # gap-aware entry fill
fill_stop(stop: float, open_price: float, direction: int) -> float     # pessimistic stop fill`} />
      <Ul>
        <Li>
          <Code>fill_entry</Code> — a long whose level gaps <em>through</em> fills at the higher open, never the stale
          level. You enter worse, so your R is smaller.
        </Li>
        <Li>
          <Code>fill_stop</Code> — a stop gapped through fills at the <em>worse</em> of the stop and the open. You exit
          worse, so a &ldquo;−1R&rdquo; stop can realise as −1.4R.
        </Li>
      </Ul>
      <Callout kind="warn" title="Both helpers resolve ambiguity against you">
        The gap-aware rule always fills at the price that hurts. That is deliberate: an optimistic fill is precisely how a
        backtest invents edge that evaporates the moment real money meets a real gap. If a strategy only survives with
        best-case fills, it does not survive. The engine also breaks the &ldquo;did this bar hit the stop or the target
        first?&rdquo; tie in favour of the stop, for the same reason.
      </Callout>
      <Callout kind="tip" title="Scenario: the weekend gap that ate half an R">
        <P>
          Friday you are long BTCUSDT from 68,550 with the stop at 66,750 (1R = 1,800 points). Over the weekend a
          sell-off hits and Monday&apos;s bar <em>opens</em> at 66,000 — straight through your 66,750 stop.{" "}
          <Code>fill_stop</Code> does not pretend you got out at 66,750; it fills at the worse of stop and open, so you
          exit at 66,000. Your realised loss is <MathInline>{"(66{,}000-68{,}550)/1{,}800 = -1.42R"}</MathInline>, not the
          tidy −1R the stop implied. The engine resolves every such ambiguity against you on purpose: if a strategy only
          survives assuming you always got the clean stop price, it does not survive.
        </P>
      </Callout>
      <P>
        This is why the entry declares a <Code>level</Code> and a <Code>stop_dist</Code>, not a fill price: the strategy
        proposes, the engine fills — pessimistically — and reports the realised R.
      </P>

      <H2>Stop placement — the stop defines R</H2>
      <P>
        The protective stop is not just risk control; its distance <em>is</em> the R denominator. Move the stop and you
        change what 1R means, which changes every downstream statistic. Two placements dominate:
      </P>
      <H3>ATR stop</H3>
      <P>
        Set the stop a multiple of Average True Range away from entry, so risk is constant in{" "}
        <em>volatility units</em> rather than a fixed dollar/pip amount:
      </P>
      <Math>{"d_{\\text{stop}} = k \\cdot \\text{ATR}_n, \\qquad R = \\frac{P_{\\text{exit}} - P_{\\text{entry}}}{d_{\\text{stop}}} - c"}</Math>
      <P>
        A wider ATR in a volatile regime gives a wider stop, so the same 1R absorbs the same amount of normal noise
        whether the market is calm or wild. This is what makes R comparable across regimes and instruments — and why the
        ATR stop is the default everywhere in edgekit. Use the lagged ATR:
      </P>
      <CodeBlock code={`from edgekit.core import lag
N = lag(ek.indicators.atr(bars.high, bars.low, bars.close, 20), 1)
# in entry(): EntryIntent(direction=1, level=level, stop_dist=2.0 * N[i])`} />
      <P>
        <Strong>Scenario (same trade, two regimes).</Strong> You break long on BTCUSDT at 68,550 twice, months apart. In
        the calm regime ATR(20) is 700, so a 2-ATR stop is 1,400 points away at 67,150. In the volatile regime ATR(20) is
        2,100, so the same 2-ATR stop sits 4,200 points away at 64,350. The dollar risk you assign is identical in both
        (1R), but the stop is three times wider when the market is wild — precisely so a normal volatile-regime wiggle
        doesn&apos;t masquerade as your idea being wrong. A fixed 1,000-point stop would have been noise-tight in the
        second case and got you swept before the move.
      </P>
      <H3>Opposite-edge (structural) stop</H3>
      <P>
        Place the stop at a structural level — the other side of the range you broke out of, a swing low, the channel
        low. The <Code>ORB</Code> template does exactly this: the opening range&apos;s width <em>is</em> 1R, so the stop
        sits at the opposite edge of the range. The advantage is that the stop is invalidation-based (&ldquo;if price is
        back inside the range, the idea is wrong&rdquo;) rather than an arbitrary distance.
      </P>

      <H2>Exits — where most of the character lives</H2>
      <P>
        Two strategies with the same entry and stop can behave completely differently depending on how they leave. The
        exit shapes the entire right side of the R-distribution.
      </P>
      <H3>Protective stop</H3>
      <P>
        The floor: the −1R backstop that is always active. Even when a strategy&apos;s <Code>exit</Code> returns{" "}
        <Code>None</Code> (hold), the engine keeps the stop live. Everything else is layered on top of this.
      </P>
      <H3>Fixed R-multiple target</H3>
      <P>
        Flatten at a preset reward:risk. <Code>ORB(target_r=2.0)</Code> exits at <MathInline>{"+2R"}</MathInline> (or
        session end). Targets cap the right tail — they raise the win rate but forgo the outsized winners, so they suit
        mean-reversion and range strategies more than trend-following. The relationship between the target multiple{" "}
        <MathInline>{"b"}</MathInline> and the breakeven win rate is <MathInline>{"p^* = 1/(1+b)"}</MathInline>: a 2R
        target only needs to win one time in three to break even (before cost).
      </P>
      <H3>Trailing stop</H3>
      <P>
        Ratchet the stop toward price as the trade works — a Donchian/channel trail or a chandelier (high minus{" "}
        <MathInline>{"k\\cdot\\text{ATR}"}</MathInline>). This is the trend-follower&apos;s exit: it lets winners run
        open-endedly while continuously reducing give-back, which is what produces the fat positive tail. The cost is a
        lower win rate — many trades trail back to a small loss or breakeven.
      </P>
      <CodeBlock code={`def exit(self, bars, P, pos, i):
    # trailing channel exit for a long: leave when price closes back under the lagged lower channel
    if pos["dir"] == 1 and bars.close.iloc[i] < P["lo"][i]:
        return bars.close.iloc[i]
    return None    # otherwise hold; the protective stop still applies`} />
      <H3>Breakeven</H3>
      <P>
        Once a trade reaches some profit (say <MathInline>{"+1R"}</MathInline>), move the stop to the entry price so the
        trade can no longer lose. It clips the left tail on trades that started well, at the cost of being stopped out of
        some that would have recovered after a normal pullback. Useful, but not free.
      </P>
      <H3>Time stop</H3>
      <P>
        Exit after <MathInline>{"m"}</MathInline> bars regardless of price. A mean-reversion idea has a thesis with a
        clock — if the reversion has not happened in a few bars, it probably won&apos;t, and holding just accumulates risk.
        The time stop enforces that discipline and keeps capital turning over.
      </P>
      <Callout kind="tip" title="Scenario: one move, three exits, three R-outcomes">
        <P>
          Same long, same entry at 68,550, 1R = 1,800. The move plays out identically: price runs to 78,000 over five
          weeks, then pulls back and finishes the trend near 74,000. What you <em>booked</em> depends entirely on the
          exit you chose. A <Strong>fixed 2R target</Strong> flattens you at 72,150 for a clean{" "}
          <MathInline>{"+2R"}</MathInline> — but leaves the other +3R on the table. A <Strong>2-ATR trailing
          stop</Strong> rides most of it and closes near 74,500 for about <MathInline>{"+3.3R"}</MathInline>. A{" "}
          <Strong>breakeven-after-1R</Strong> exit protects the trade the moment it reached 70,350 — great here, but on a
          different day it would have flushed you at breakeven on a normal pullback that later resumed. Identical signal
          and stop; the exit alone spread the outcome from +2R to +3.3R. That is why the exit is where a strategy&apos;s
          character actually lives.
        </P>
      </Callout>
      <Callout kind="tip" title="Match the exit to what you're exploiting">
        Trend-following wants a <em>trailing</em> exit (let winners run); mean-reversion wants a <em>target + time</em>{" "}
        stop (take the snap-back, don&apos;t overstay). Bolting a tight profit target onto a trend-follower throws away
        the very tail that makes it work. The exit is a hypothesis about how your edge pays out.
      </Callout>

      <H2>How edgekit charges cost — in R</H2>
      <P>
        Cost is not a footnote; it is frequently the difference between a positive and negative edge, and it is charged
        directly in R so it shows up in every metric. The research engine subtracts a <Code>CostModel</Code> from each
        trade&apos;s R: by convention a round-trip fee plus a per-day holding (swap) charge. Because cost is denominated
        in the stop distance, a <em>tighter</em> stop pays a <em>larger</em> cost in R — a subtle, important effect that
        kills many high-frequency ideas.
      </P>
      <Math>{"R_{\\text{net}} = \\frac{P_{\\text{exit}} - P_{\\text{entry}}}{d_{\\text{stop}}} - \\underbrace{\\frac{\\text{fees} + \\text{swap}\\cdot\\text{days}}{d_{\\text{stop}}}}_{\\text{cost in R}}"}</Math>
      <P>
        <Strong>Scenario (why the tight-stop scalper dies).</Strong> Round-trip cost is a fixed 30 points on some CFD.
        The swing trader uses a 1,800-point ATR stop, so cost is <MathInline>{"30/1{,}800 = 0.017R"}</MathInline> — a
        rounding error against a +1.5R winner. The scalper on the same instrument uses a 120-point stop; now the identical
        30-point cost is <MathInline>{"30/120 = 0.25R"}</MathInline> <em>every trade</em>. A scalper needs an expectancy
        above a quarter-R gross just to break even, and trades far more often. Same market, same fee schedule — the tight
        stop quietly multiplies the cost in R, which is how a gross edge that looks fine on paper nets to nothing.
      </P>
      <P>
        The practical consequence: always run a candidate at 2–3× your assumed cost. If the edge only exists at
        optimistic costs, it isn&apos;t one. edgekit&apos;s validation layer includes exactly this cost-stress; the{" "}
        <Code>bars_per_day</Code> argument you pass to <Code>.backtest</Code> is what converts a hold in bars into days for
        the swap charge (H4 = 6/day, a US cash minute session = 390/day).
      </P>
      <ChartFigure
        name="cost_sensitivity"
        alt="Strategy performance as assumed transaction cost increases"
        caption="Net edge as assumed cost rises. A real edge degrades gracefully; a fragile one — often a fast, tight-stop system — crosses into negative territory well before an honest cost estimate."
      />

      <H2>Putting it together</H2>
      <P>
        Entry fixes direction and the risk unit; the stop defines 1R and the left tail; the exit shapes the right tail;
        cost taxes all of it in R. Change any one and you get a different strategy, even with the same signal. Get in the
        habit of testing exit and stop choices as first-class variables — they are not tuning knobs to overfit, but they
        are where an idea becomes tradeable or not.
      </P>
      <P>
        Next: <A href="/tutorials/position-sizing">Position sizing &amp; risk</A> — now that trades are priced in R,
        decide how many dollars ride on each one.
      </P>
    </>
  );
}
