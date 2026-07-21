import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, A, Strong, Callout } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Execution & transaction costs" };

export default function Page() {
  return (
    <>
      <H1>Execution & transaction costs</H1>
      <Lead>
        A signal is only half a strategy. The other half is getting the trade done at a price close enough to the one
        your backtest assumed that the edge survives. Most researched edges are real on paper and dead in production for
        one reason: <Strong>execution costs</Strong>. This chapter quantifies where those costs come from — slippage and
        market impact, temporary and permanent — states the square-root impact law, walks through the execution algos
        that manage it, defines implementation shortfall as the honest scorecard, and shows how transaction-cost
        analysis and capacity limits decide whether a signal is worth trading at all.
      </Lead>

      <Callout kind="tip" title="Why a trader cares">
        You have a signal that makes 12 bps per trade on paper. You scale it up, and at $2m per order it still works. At
        $20m per order it is flat. At $50m it loses money — same signal, same market, same code. Nothing broke except
        that your orders got big enough to move the price against themselves. This chapter is the arithmetic of that
        collapse: how much a trade costs to execute, why cost grows with size, and how to tell — <em>before</em> you
        commit capital — whether an edge is a real business or a paper mirage that dies on contact with the book.
      </Callout>

      <H2>Why execution matters</H2>
      <P>
        The trap is the difference between <em>gross</em> and <em>net</em> edge. A signal with a healthy gross profit
        factor can have a negative net one the moment costs are subtracted — and the faster it trades, the more times it
        pays. From the metrics chapter, an edge is judged on expectancy in R; costs are subtracted from every trade
        before that expectancy is computed:
      </P>
      <Math>{"\\mathbb{E}[R_{\\text{net}}] = \\mathbb{E}[R_{\\text{gross}}] - c_R, \\qquad c_R = \\frac{\\text{cost per round trip}}{\\text{risk per unit}}"}</Math>
      <P>
        When <MathInline>{"c_R"}</MathInline> approaches gross expectancy, the edge vanishes. This is not a haircut you
        apply at the end — it is a survival test. A great signal dies on costs quietly: the equity curve just tilts a
        few basis points per trade until it points down.
      </P>

      <H2>Slippage and market impact</H2>
      <P>
        <Strong>Slippage</Strong> is the gap between the price you <em>expected</em> and the price you <em>got</em>. Part
        of it is the spread from the last chapter; the rest is <Strong>market impact</Strong> — the fact that your own
        order moves the price against you as it consumes liquidity. Impact splits into two kinds:
      </P>
      <P>
        <Strong>Temporary impact</Strong> is the concession you pay for demanding immediacy: you walk the book, depth
        refills after you are done, and the price snaps back. It is a cost of <em>how</em> you traded and it decays.
      </P>
      <P>
        <Strong>Permanent impact</Strong> is the information your trade reveals: the market infers that a large buyer
        knows something, and the price stays elevated. It is a lasting shift in the mid that does not come back — the
        adverse-selection cost from the previous chapter, seen from the taker&apos;s side.
      </P>

      <H3>The square-root law</H3>
      <P>
        The central empirical regularity of impact: the price concession from trading a quantity{" "}
        <MathInline>{"Q"}</MathInline> against a daily volume <MathInline>{"V"}</MathInline> grows not linearly but as
        the <em>square root</em> of participation:
      </P>
      <Math>{"\\text{impact} \\;\\propto\\; \\sigma\\,\\sqrt{\\frac{Q}{V}}"}</Math>
      <P>
        where <MathInline>{"\\sigma"}</MathInline> is the asset&apos;s volatility and <MathInline>{"Q/V"}</MathInline>{" "}
        the fraction of daily volume you represent. Two consequences drive everything downstream. First, impact is{" "}
        <em>concave</em>: doubling your size less-than-doubles your cost, so there is a real benefit to trading larger —
        up to a point. Second, and more important, cost per share <em>rises</em> with size (<MathInline>{"\\sqrt{Q/V}/Q \\propto 1/\\sqrt{Q}"}</MathInline>{" "}
        falls, but total impact still climbs), and the <MathInline>{"\\sqrt{Q}"}</MathInline> term is what eventually
        caps a strategy&apos;s capacity.
      </P>
      <ChartFigure
        name="tut/price_impact"
        alt="Market impact plotted against order size as a fraction of daily volume, a concave square-root curve rising steeply for small sizes then flattening"
        caption="The square-root impact law. Cost rises with participation but concavely — the first slice of size is cheap per share, later slices climb. Trading faster (higher Q/V per unit time) pushes you up this curve."
      />
      <Callout kind="tip" title="Scenario: impact on an order that is 10% of a day's volume">
        A $50 stock trades <MathInline>{"V = 10"}</MathInline> million shares a day with daily volatility{" "}
        <MathInline>{"\\sigma = 2\\%"}</MathInline>. You need to buy <MathInline>{"Q = 1"}</MathInline> million shares —
        that is <MathInline>{"Q/V = 10\\%"}</MathInline> of the day&apos;s volume, a genuinely large order. With a
        calibrated coefficient <MathInline>{"c \\approx 0.5"}</MathInline>, the square-root law estimates{" "}
        <MathInline>{"\\text{impact} \\approx c\\,\\sigma\\sqrt{Q/V} = 0.5\\times 0.02\\times\\sqrt{0.10} \\approx 0.0032"}</MathInline>{" "}
        — about <Strong>32 bps</Strong>, or 16 cents a share, roughly $160k on the $50m notional. Now feel the
        concavity: had you needed only 100k shares (<MathInline>{"Q/V=1\\%"}</MathInline>), impact would be{" "}
        <MathInline>{"0.5\\times0.02\\times\\sqrt{0.01}=10\\ \\text{bps}"}</MathInline> — so a{" "}
        <Strong>10× larger order costs only ~3× the impact</Strong> (<MathInline>{"\\sqrt{10}\\approx 3.2"}</MathInline>),
        the hallmark of the square root. The flip side is timing: to actually <em>get</em> the 32-bps number you must
        trade the million shares slowly across the day so your instantaneous participation stays low — and while you
        drip it out, the price can drift away from you. Impact versus timing risk is the entire job of an execution
        algo.
      </Callout>

      <H2>Execution algorithms</H2>
      <P>
        The whole job of an execution algo is to manage the trade-off the square-root law creates: trade too fast and
        you pay impact; trade too slow and you carry <em>timing risk</em> — the price may drift away before you finish.
        Three canonical schedules:
      </P>
      <P>
        <Strong>TWAP (time-weighted average price):</Strong> slice the order into equal pieces spaced evenly over a
        fixed window. Simple, predictable, ignores volume — good when you want a steady, low-footprint schedule and
        do not trust volume forecasts.
      </P>
      <P>
        <Strong>VWAP (volume-weighted average price):</Strong> slice in proportion to <em>expected</em> volume, trading
        more when the market is busy and less when it is thin. The benchmark most institutions are measured against,
        because participating in proportion to volume minimises footprint for a given size.
      </P>
      <P>
        <Strong>POV (percentage of volume):</Strong> trade a fixed fraction of whatever volume actually prints in real
        time — say 10% of every trade — so your participation is capped no matter how the day develops. Adapts to
        realised liquidity at the cost of an uncertain completion time.
      </P>
      <Callout kind="tip" title="Scenario: three ways to work the million shares">
        Same 1m-share buy on the $50 stock. <Strong>TWAP</Strong> over 6.5 hours slices it into, say, 78 equal clips of
        ~12,800 shares every 5 minutes — steady and predictable, but it buys just as hard into the thin lunch lull as
        into the busy open, leaving a visible footprint when volume dries up. <Strong>VWAP</Strong> instead front- and
        back-loads to match the U-shaped intraday volume curve — heavier at the 9:30 open and 4:00 close, lighter
        midday — so it keeps participation near a constant ~10% of <em>actual</em> volume and minimises footprint.{" "}
        <Strong>POV at 10%</Strong> stops asking the clock and simply takes 10% of whatever prints: if a block trade
        doubles the day&apos;s volume you buy more; if the tape goes quiet you buy less and may not finish by the close.
        None is free — TWAP ignores liquidity, VWAP trusts a volume forecast, POV surrenders your completion time.
      </Callout>
      <Callout kind="note" title="Every algo is a point on the impact-vs-timing frontier">
        There is no free schedule. Front-loading cuts timing risk but raises impact; stretching out cuts impact but
        raises timing risk. The optimal trajectory (Almgren-Chriss and its descendants) trades off expected impact
        against the variance of the fill — the same risk/return logic as the rest of this course, applied to a single
        order.
      </Callout>

      <H2>Implementation shortfall</H2>
      <P>
        The honest scorecard for execution is <Strong>implementation shortfall</Strong> (IS): the difference between the
        price at the moment you <em>decided</em> to trade (the decision or arrival price) and the average price you
        actually filled at, plus the opportunity cost of anything you failed to execute:
      </P>
      <Math>{"\\text{IS} = \\underbrace{Q\\,(\\bar P_{\\text{fill}} - P_{\\text{decision}})}_{\\text{execution cost}} + \\underbrace{(Q - Q_{\\text{filled}})\\,(P_{\\text{end}} - P_{\\text{decision}})}_{\\text{opportunity cost}}"}</Math>
      <P>
        IS captures what a backtest hides. Your backtest fills at <MathInline>{"P_{\\text{decision}}"}</MathInline> (or
        worse, the close); reality fills at <MathInline>{"\\bar P_{\\text{fill}}"}</MathInline> after spread, impact, and
        delay. The shortfall is the leakage between simulated and live P&amp;L — and it is precisely the quantity your
        cost model is trying to estimate in advance.
      </P>
      <Callout kind="tip" title="Scenario: scoring the fill with implementation shortfall">
        You decide to buy the million shares when the stock is at <MathInline>{"P_{\\text{decision}} = \\$50.00"}</MathInline>.
        Working it with VWAP, you fill 950,000 shares at an average of $50.08, but the tape runs and you never get the
        last 50,000 before the stock closes at $50.20. Score it:
        <br />• <Strong>Execution cost</Strong> = <MathInline>{"950{,}000\\times(50.08 - 50.00) = \\$76{,}000"}</MathInline>{" "}
        — what you paid above your decision price on the shares you got.
        <br />• <Strong>Opportunity cost</Strong> = <MathInline>{"50{,}000\\times(50.20 - 50.00) = \\$10{,}000"}</MathInline>{" "}
        — the profit you forfeited on the shares you failed to buy while the price moved away.
        <br />Total IS = <MathInline>{"\\$86{,}000"}</MathInline>, or <MathInline>{"86{,}000/(10^6\\times 50)\\approx 17\\ \\text{bps}"}</MathInline>{" "}
        of the intended notional. Your backtest, filling all 1m shares instantly at $50.00, recorded <em>zero</em> of
        this. IS is the honest gap between that fantasy and the trade you actually did.
      </Callout>

      <H2>Transaction-cost analysis</H2>
      <P>
        <Strong>TCA</Strong> is the post-trade discipline of measuring realised execution cost — decomposing each fill
        into spread, temporary impact, permanent impact, and timing — and feeding it back into both the cost model and
        the choice of execution algo. In research you run TCA <em>forward</em>: you assume a cost, and then you stress
        it. edgekit&apos;s harness does exactly this — re-run the strategy at escalating multiples of your baseline cost
        and watch what happens to the metrics:
      </P>
      <CodeBlock
        filename="cost_stress.py"
        code={`import edgekit as ek

def run(cost: ek.costs.CostModel) -> dict:
    r = backtest_returns_in_R(cost)          # your strategy, charged this cost
    return ek.metrics.trade_stats(r)

grid = ek.validation.cost_stress(
    run,
    base=ek.costs.CostModel(spread_rt=0.0012, swap_day=0.0002),
    mults=(1.0, 2.0, 3.0),
)
for m, stats in grid.items():
    print(f"{m}x cost -> PF {stats['pf']:.2f}, EV {stats['ev_r']:.3f}R")`}
      />
      <ChartFigure
        name="cost_sensitivity"
        alt="Profit factor plotted against a cost multiplier, showing a robust edge degrading gracefully while a fragile one collapses below 1"
        caption="Cost sensitivity. A real edge (upper line) degrades gracefully as cost rises; a fragile one (lower) crosses PF = 1 by 2-3x and was never tradeable. The survivor rule: PF must stay above 1 at 2x and 3x."
      />
      <P>
        The survivor rule of thumb is blunt: <Strong>profit factor must stay above 1 at 2x and 3x your baseline
        cost.</Strong> A genuine edge has margin; a curve-fit one is a knife-edge that the first realistic cost estimate
        tips over. This is validation gauntlet stage #6, and it is the direct enforcement of the microstructure lesson —
        the spread is not optional, so prove the edge outlives it.
      </P>

      <H2>Capacity and liquidity limits</H2>
      <P>
        The square-root law implies a hard ceiling. As you scale capital, <MathInline>{"Q/V"}</MathInline> rises, impact
        grows, and net expectancy per trade shrinks — until, at some size, the marginal trade&apos;s cost equals its
        gross edge and adding capital <em>destroys</em> return. That size is the strategy&apos;s <Strong>capacity</Strong>.
        Fast, small-edge, high-turnover strategies have low capacity (they pay the spread constantly and saturate thin
        books); slow, large-edge, low-turnover strategies have high capacity. Capacity is not a footnote — it decides
        whether an edge is a personal-account curiosity or an institutional business, and it must be estimated from the
        same impact model that sets your costs.
      </P>
      <Callout kind="tip" title="Scenario: where the 12-bps signal hits its ceiling">
        Recall the signal from the hook: 12 bps of gross edge per trade. Its capacity is the size at which the impact of
        the marginal trade eats that 12 bps. Set impact equal to the edge with the same law:{" "}
        <MathInline>{"0.5\\times0.02\\times\\sqrt{Q/V} = 0.0012 \\Rightarrow \\sqrt{Q/V}=0.12 \\Rightarrow Q/V \\approx 1.4\\%"}</MathInline>.
        On the $50 stock with a $500m daily volume, 1.4% of ADV is about <MathInline>{"\\$7\\text{m}"}</MathInline> per
        trade — right where the hook&apos;s numbers turned: $2m works comfortably, $7m is break-even, $20m is deep
        underwater. Capacity is not a vibe; it falls straight out of the impact model, and it is the number that decides
        whether an edge scales into a business.
      </Callout>
      <Callout kind="tip" title="Costs are a design constraint, not an afterthought">
        Decide the cost budget before you fall in love with a signal. If the gross edge per trade is 5 bps and the
        round-trip effective spread is 8 bps, no amount of clever execution rescues it — the strategy must trade less
        often, in more liquid instruments, or not at all.
      </Callout>

      <P>
        This closes the loop with <A href="/tutorials/backtesting-pitfalls">why backtests lie</A>: the cost-sensitivity
        curve is the antidote to the most expensive pitfall — a gross edge that never survived contact with the book.
        With execution understood, the remaining frontier is modelling the price process itself.
      </P>

      <P>
        <Strong>Next:</Strong>{" "}
        <A href="/tutorials/arima-and-garch">ARIMA & GARCH</A> — the classical time-series models for the conditional
        mean and conditional variance that underlie much of what we have priced and traded here.
      </P>
    </>
  );
}
