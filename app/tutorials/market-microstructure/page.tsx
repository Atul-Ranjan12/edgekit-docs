import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, A, Strong, Callout, Code } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Market microstructure" };

export default function Page() {
  return (
    <>
      <H1>Market microstructure</H1>
      <Lead>
        A backtest fills you at the close, instantly, in any size. The real market is a queue of resting orders you have
        to cross, and every crossing costs money you did not model. Microstructure is the study of how that queue works
        — how prices actually form, why there is a spread between what you can buy and sell at, and where the frictions
        in your P&amp;L come from. This chapter builds the limit order book from the bottom up and decomposes the spread
        into its economic parts, then ties each back to the cost you charge in a backtest with{" "}
        <A href="/docs/api/costs">ek.costs.CostModel</A>.
      </Lead>

      <Callout kind="tip" title="Why a trader cares">
        Your backtest bought 5,000 shares of a stock at exactly $50.00, the closing print. In the real market there was
        no one offering 5,000 shares at $50.00 — there were 800 at $50.01, 1,200 at $50.02, and so on up the ladder. You
        paid a <em>blended</em> price above the quote, and that difference, times every trade you will ever make, is a
        tax your P&amp;L never saw coming. This chapter opens up the machinery — the order book, the spread, who pays
        whom — so that when you charge a cost in <A href="/docs/api/costs">ek.costs</A> you know exactly what real thing
        that number stands for.
      </Callout>

      <H2>The limit order book</H2>
      <P>
        Modern electronic markets are <Strong>continuous double auctions</Strong>. Every resting order lives in the{" "}
        <Strong>limit order book</Strong> (LOB): a price-sorted ladder of <Strong>bids</Strong> (buyers, below) and{" "}
        <Strong>asks</Strong>/offers (sellers, above). Each level shows a price and the total quantity waiting there —
        the <Strong>depth</Strong>. The two prices that matter most sit at the inside of the book:
      </P>
      <Math>{"\\text{spread} = P_{\\text{ask}} - P_{\\text{bid}}, \\qquad \\text{mid} = \\frac{P_{\\text{bid}} + P_{\\text{ask}}}{2}"}</Math>
      <P>
        The <Strong>best bid</Strong> is the highest price a buyer will pay; the <Strong>best ask</Strong> the lowest a
        seller will accept. The <Strong>mid</Strong> is the usual reference &ldquo;price&rdquo; — but you can never
        trade at the mid with a market order: you buy at the ask and sell at the bid. That gap is the first cost of
        doing business.
      </P>
      <ChartFigure
        name="tut/orderbook"
        alt="A limit order book drawn as horizontal bars: green bid depth stacked below the mid price, red ask depth above, with the bid-ask spread marked at the inside"
        caption="A snapshot of the book. Bid depth (below) and ask depth (above) are quantities resting at each price. The inside spread separates the best bid and best ask; the mid sits between them. A market buy walks up the ask ladder, consuming depth."
      />
      <P>
        A market order that is larger than the depth at the inside <Strong>walks the book</Strong>: it fills the first
        level, then the next, then the next, at progressively worse prices. The average fill is therefore worse than the
        inside quote — the origin of market impact, covered in the next chapter. A backtest that assumes you always
        transact at the mid silently ignores both the spread and this walk.
      </P>
      <Callout kind="tip" title="Scenario: a book snapshot and a market buy that walks it">
        Here is a snapshot of a $50 stock on a 1-cent tick. Asks (sellers) above, bids (buyers) below:
        <br />
        <Code>ask 50.04 × 3000 | 50.03 × 2000 | 50.02 × 1500 | 50.01 × 800</Code>
        <br />
        <Code>bid 50.00 × 1000 | 49.99 × 1800 | 49.98 × 2500</Code>
        <br />
        The best bid is $50.00, the best ask $50.01, so the <Strong>quoted spread is exactly one tick</Strong> ($0.01)
        and the mid is $50.005. Now send a market buy for <Strong>5,000 shares</Strong>. There are only 800 at the
        inside, so you walk up: 800 @ 50.01, 1,500 @ 50.02, 2,000 @ 50.03, and the last 700 @ 50.04. Total cost{" "}
        <MathInline>{"= \\$250{,}126"}</MathInline>, so your <Strong>average fill is $50.0252</Strong> — about 2 cents
        (≈4 bps) above the mid, even though the screen showed a 1-cent spread. A backtest filling all 5,000 at $50.005
        just handed you $101 of free money that the book never offered.
      </Callout>

      <H2>Market orders vs limit orders</H2>
      <P>
        Every trade is one of two roles:
      </P>
      <P>
        <Strong>Market order (liquidity taker):</Strong> execute immediately against the resting book. You are
        guaranteed a fill but you <em>pay</em> the spread and any impact — you cross from mid to ask (buying) or mid to
        bid (selling). Certainty of execution, uncertain price.
      </P>
      <P>
        <Strong>Limit order (liquidity maker):</Strong> post a resting order at your chosen price and wait. If it fills,
        you <em>earn</em> the spread instead of paying it (and often a maker rebate). But there is no guarantee it fills
        at all — and worse, it tends to fill precisely when you did not want it to (adverse selection, below). Certain
        price, uncertain execution.
      </P>
      <Callout kind="note" title="The maker-taker asymmetry is the whole cost story">
        A taker&apos;s cost is a maker&apos;s income. The spread you pay crossing the book is (roughly) the compensation
        the resting side earns for providing immediacy and bearing the risks that follow. Understanding <em>why</em>{" "}
        that compensation exists is understanding the spread.
      </Callout>

      <H2>Tick size and price formation</H2>
      <P>
        Prices are not continuous — they move on a discrete grid, the <Strong>tick size</Strong>, the minimum increment
        between quotable prices. Tick size sets a floor on the spread: it can never be tighter than one tick. In a
        liquid, large-tick instrument the spread is often pinned at exactly one tick and the real competition is for{" "}
        <em>queue priority</em> at that price, not for price itself. In a small-tick instrument the spread floats and
        depth thins out.
      </P>
      <P>
        <Strong>Price formation</Strong> is the process by which this book turns order flow into a consensus price. Each
        arriving market order and each cancellation nudges the inside quotes; the mid drifts as buyers and sellers
        reveal their willingness to pay. Price is not handed down — it is <em>discovered</em>, one order at a time, and
        the spread is the friction in that discovery.
      </P>

      <H2>The three components of the spread</H2>
      <P>
        Why is there a spread at all, and what sets its width? The market-making literature decomposes it into three
        economic parts a liquidity provider must be paid for:
      </P>
      <Math>{"\\text{spread} = \\underbrace{c_{\\text{proc}}}_{\\text{order processing}} + \\underbrace{c_{\\text{inv}}}_{\\text{inventory}} + \\underbrace{c_{\\text{adv}}}_{\\text{adverse selection}}"}</Math>
      <H3>Order-processing cost</H3>
      <P>
        The fixed operational cost of making a market — exchange fees, clearing, technology, and a minimum profit for
        the service of standing ready to trade. This is the floor and the smallest, most stable component.
      </P>
      <H3>Inventory cost</H3>
      <P>
        A market maker who buys from a seller now holds inventory they did not want and bears the risk that the price
        moves against it before they can offload it. They widen the quote to be compensated for this warehousing risk,
        and they skew the quote to nudge their inventory back toward flat. The more volatile the asset, the larger this
        component — which is why spreads widen precisely when volatility spikes.
      </P>
      <H3>Adverse selection</H3>
      <P>
        The deepest component, and the reason posting limit orders is dangerous. Some of the flow hitting the market
        maker is <Strong>informed</Strong> — it trades because it knows something about where the price is going. When
        an informed buyer lifts the maker&apos;s offer, the price is about to rise, so the maker just sold too cheap.
        The maker cannot tell informed flow from noise <em>ex ante</em>, so they widen the spread on <em>everyone</em>{" "}
        to recover, on average, what they lose to the informed. Adverse selection is the market maker&apos;s payment for
        trading against people who know more than they do.
      </P>
      <Callout kind="warn" title="Adverse selection is why your limit orders fill at the wrong time">
        A resting buy limit fills when someone sells to you — disproportionately, when they have a reason to sell,
        i.e. when the price is about to drop. &ldquo;My limit orders always fill right before the market moves against
        me&rdquo; is not bad luck; it is the structural signature of adverse selection. It is also why the spread cannot
        be modelled away: it is priced-in information asymmetry.
      </Callout>
      <Callout kind="tip" title="Scenario: watch the spread widen when the three costs rise">
        On a calm morning a liquid ETF quotes 100.00 / 100.01 — a 1-cent spread that is almost pure order-processing
        cost, because volatility is low (small inventory risk) and flow is mostly uninformed retail (little adverse
        selection). Then a Fed headline hits. Volatility triples, so a maker who buys now faces a much larger chance the
        price runs against their inventory before they can offload it — <em>inventory cost</em> jumps. And the flow
        turns sharp: the orders arriving are increasingly informed traders repricing the news, so <em>adverse
        selection</em> jumps too. The maker&apos;s only defence is to widen: the quote gaps to 99.96 / 100.04, an 8-cent
        spread. Nothing about the ETF changed — the <em>cost of providing liquidity</em> did. That is why your slippage
        is always worst in exactly the fast market where you most want to trade.
      </Callout>

      <H2>Quoted vs effective spread</H2>
      <P>
        The <Strong>quoted spread</Strong> is what you see: <MathInline>{"P_{\\text{ask}} - P_{\\text{bid}}"}</MathInline>.
        The <Strong>effective spread</Strong> is what you actually paid, measured against the mid at the moment of your
        trade — and for anything larger than the inside depth it is <em>wider</em>, because you walked the book:
      </P>
      <Math>{"S_{\\text{eff}} = 2\\,\\big|\\,P_{\\text{fill}} - P_{\\text{mid}}\\,\\big|"}</Math>
      <P>
        The factor of 2 makes it comparable to a full round-trip quoted spread (one side of the crossing, doubled). The
        gap between effective and quoted spread is your <em>impact</em>: the effective spread is the honest,
        trade-weighted cost, and it is the number a realistic backtest must charge — not the flattering inside quote.
      </P>
      <Callout kind="tip" title="Scenario: quoted vs effective on the same 5,000-share buy">
        Take the book-walk above. The quoted spread was $0.01. But you filled at an average of $50.0252 against a mid of
        $50.005, so your effective spread is{" "}
        <MathInline>{"S_{\\text{eff}} = 2\\,|50.0252 - 50.005| = \\$0.040"}</MathInline> — <Strong>four times</Strong>{" "}
        the quoted spread. That factor of 4 is the size penalty: the quote describes the first 800 shares, the effective
        spread describes all 5,000. As a fraction of price it is <MathInline>{"0.040/50 \\approx 8\\ \\text{bps}"}</MathInline>{" "}
        round-trip-equivalent — and <em>that</em> 8 bps, not the flattering 2 bps quoted spread, is what belongs in your
        cost model for an order this size.
      </Callout>

      <H2>Tying it back to ek.costs</H2>
      <P>
        You will not simulate the full order book in a strategy backtest — you compress all of the above into a single
        cost charged per round trip. That is exactly what <A href="/docs/api/costs">ek.costs.CostModel</A> does. Its{" "}
        <Code>spread_rt</Code> parameter is the round-trip spread as a fraction of price: it stands in for the quoted
        spread plus the typical impact of your size — i.e. an estimate of the <em>effective</em> spread you will pay
        crossing the book twice. Its <Code>swap_day</Code> is the financing/carry per day held.
      </P>
      <CodeBlock
        filename="costs.py"
        code={`import edgekit as ek

# 12 bps round-trip spread, 2 bps/day financing (a crypto/CFD convention)
cm = ek.costs.CostModel(spread_rt=0.0012, swap_day=0.0002)

# cost of one round trip, expressed in R (dollar cost / the stop-distance risk unit)
r_cost = cm.r_cost(entry_price=100.0, risk_per_unit=2.0, days=3)
print(round(r_cost, 4))          # subtract this from every trade's gross R`}
      />
      <Callout kind="tip" title="At the desk: from the book snapshot to spread_rt">
        The effective spread you measured on the 5,000-share buy was ≈8 bps <em>one way</em>. You cross twice per round
        trip, so a realistic <Code>spread_rt</Code> for that instrument and size is on the order of{" "}
        <MathInline>{"0.0016"}</MathInline> (16 bps), not the 12-bps placeholder. If your stop distance is $2 on a $50
        entry, the round-trip dollar cost is <MathInline>{"0.0016\\times 50 = \\$0.08"}</MathInline>, which is{" "}
        <MathInline>{"0.08/2 = 0.04\\,R"}</MathInline> gone before the trade even works. A signal with 0.15R of gross
        expectancy just lost a quarter of its edge to the book — and that is <em>before</em> the cost stress in the next
        chapter doubles it.
      </Callout>
      <P>
        The microstructure lesson is why this subtraction is not optional. The spread is not noise you can average away
        — it is a structural transfer from taker to maker on <em>every</em> trade, set by inventory risk and adverse
        selection, and it scales with how often you trade and how hard you cross. A high-frequency signal pays the
        effective spread hundreds of times; a slow one pays it rarely. Which cost dominates, and whether a gross edge
        survives it at all, is the subject of the next chapter.
      </P>
      <Callout kind="tip" title="Estimate spread_rt from the real book, not a default">
        The <Code>0.0012</Code> default is a placeholder. Pull the actual quoted spread and typical depth for your
        instrument and size, widen it toward the effective spread for the size you trade, and — as always — re-run at 2x
        and 3x that estimate to see whether the edge is real or a rounding artefact.
      </Callout>

      <P>
        <Strong>Next:</Strong>{" "}
        <A href="/tutorials/execution-and-tca">Execution & transaction costs</A> — slippage, the square-root impact
        law, execution algos, and the transaction-cost analysis that decides whether a signal is tradeable.
      </P>
    </>
  );
}
