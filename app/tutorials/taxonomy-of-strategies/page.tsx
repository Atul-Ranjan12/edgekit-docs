import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";
import { MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "A taxonomy of strategies" };

export default function Page() {
  return (
    <>
      <H1>A taxonomy of strategies</H1>
      <Lead>
        There are only a handful of genuinely distinct ways to make money in markets, and each one is a bet on a specific
        recurring behaviour: that trends persist, that ranges hold, that cheap risk pays a premium, that a temporary
        imbalance will correct. This chapter is a field guide to the archetypes — for each, the mechanism, the market
        behaviour it exploits, when it works and when it dies, a one-line signal sketch, and whether edgekit ships a
        template you can start from.
      </Lead>

      <Callout kind="note" title="These are the general archetypes, not proprietary edges">
        Everything below is textbook strategy taxonomy — the public vocabulary of the field. edgekit ships two concrete
        research templates you can run and read: <Code>SmaCross</Code> (a trend-following crossover) and <Code>ORB</Code>{" "}
        (an opening-range breakout). The other families are described conceptually; some you would assemble from the{" "}
        <A href="/tutorials/indicators-and-features">indicator primitives</A>. None of them is presented as a working
        edge — an archetype is a hypothesis, and the <A href="/tutorials/the-gauntlet">gauntlet</A> decides whether
        any given instance is real.
      </Callout>

      <H2>The families at a glance</H2>
      <Table
        head={["Family", "Typical horizon", "What it exploits", "Main risk", "edgekit template"]}
        rows={[
          ["Trend-following", "Days–months", "Persistence / autocorrelation of returns", "Whipsaw in ranges; long flat stretches", <Code key="a">SmaCross</Code>],
          ["Breakout", "Intraday–days", "Range expansion / volatility clustering", "False breaks; chop", <Code key="b">ORB</Code>],
          ["Momentum (cross-sectional)", "Weeks–months", "Winners keep winning vs peers", "Crashes / sharp reversals", "conceptual"],
          ["Momentum (time-series)", "Weeks–months", "An asset's own trend sign", "Regime flips; beta in disguise", "conceptual"],
          ["Mean-reversion", "Minutes–days", "Overreaction reverting to a mean", "Trends that don't revert (fat left tail)", "conceptual"],
          ["Statistical arbitrage / pairs", "Hours–days", "A stable relationship between assets", "Relationship breaking (de-cointegration)", "conceptual"],
          ["Carry", "Weeks–months", "A premium for holding a position", "Rare, violent unwinds", "conceptual"],
          ["Market-making", "Sub-second–minutes", "The bid-ask spread; liquidity provision", "Adverse selection; inventory", "out of scope"],
          ["Event-driven", "Event-scoped", "Predictable reaction to scheduled news", "Gaps; slippage; surprise direction", "conceptual"],
          ["ML-based", "Any", "Weak patterns across many features", "Overfitting; leakage", <A key="c" href="/tutorials/machine-learning">Part V</A>],
        ]}
      />

      <H2>Trend-following</H2>
      <P>
        <Strong>Mechanism.</Strong> Buy what is going up, sell what is going down, and hold until the trend gives way.
        Entries key off a moving-average relationship or a channel; exits are trailing, so winners run and losers are cut
        quickly. <Strong>What it exploits:</Strong> positive autocorrelation of returns — the empirical tendency for
        large moves to extend as capital, information, and herding push in one direction over weeks to months.
      </P>
      <P>
        <Strong>Signal sketch:</Strong> <MathInline>{"\\text{long when } \\text{MA}_{\\text{fast}} > \\text{MA}_{\\text{slow}}"}</MathInline>{" "}
        (or when price breaks the <MathInline>{"n"}</MathInline>-bar high). <Strong>Works</Strong> in strong, sustained
        directional regimes and across many uncorrelated markets at once (diversification smooths the flat spells).{" "}
        <Strong>Fails</Strong> in choppy, range-bound markets, where the crossover flips repeatedly and every entry is a
        small loss; the return profile is a low win rate rescued by a fat right tail, so it demands patience through long
        drawdowns. edgekit ships <Code>SmaCross</Code>.
      </P>
      <CodeBlock code={`from edgekit.strategy import SmaCross
trades = SmaCross(fast=20, slow=100, atr_n=20, stop_mult=2.0).backtest(h4, warmup=210, bars_per_day=6)`} />
      <P>
        <Strong>Scenario (what it feels like to trade).</Strong> On BTCUSDT H4 the fast MA crosses up through the slow at
        64,900 and you go long with a 2-ATR stop. Price grinds to 78,000 over six weeks and the trail eventually closes
        you at 74,500 — a fat <MathInline>{"+4R"}</MathInline> winner. But that one trade sat inside a run of nine
        entries: the other eight were small whipsaws in choppy stretches, each closing near <MathInline>{"-0.6R"}</MathInline>.
        Net across the nine you are positive only because the single trend paid for all the paper cuts. That lopsided
        arithmetic — many small losers, one outsized winner — <em>is</em> the trend-following experience, and why you must
        survive the flat stretches to collect the one that matters.
      </P>

      <H2>Breakout</H2>
      <P>
        <Strong>Mechanism.</Strong> Define a reference range — an opening range, a prior-day range, an{" "}
        <MathInline>{"n"}</MathInline>-bar channel — and act when price escapes it, stop at the opposite edge.{" "}
        <Strong>What it exploits:</Strong> volatility clustering and range expansion — quiet coils tend to resolve into
        directional bursts, and the moment of escape often precedes the largest part of the move.
      </P>
      <P>
        <Strong>Signal sketch:</Strong> <MathInline>{"\\text{long when } P_t > \\max_{k<n} H_{t-k}"}</MathInline>, stop at
        the range low. <Strong>Works</Strong> when a real catalyst drives follow-through (news, session opens, regime
        shifts). <Strong>Fails</Strong> as the classic &ldquo;false breakout&rdquo;: price pokes through, triggers the
        crowd, and snaps back — so unfiltered breakouts are typically net-negative after costs, and the edge, if any,
        lives in filtering which breaks to trust. edgekit ships <Code>ORB</Code> (opening-range breakout).
      </P>
      <CodeBlock code={`from edgekit.strategy import ORB
rth = bars[ek.data.rth_mask(bars.index, start="09:30", end="16:00", tz="America/New_York")]
trades = ORB(or_bars=30, target_r=2.0).backtest(rth, warmup=5, bars_per_day=390)`} />
      <P>
        <Strong>Scenario (a true break and a false one).</Strong> US100 opens at 09:30 New York; the first 30 minutes
        carve a range of 40 points (18,000–18,040). That 40-point width is 1R. <em>Monday:</em> at 10:05 price prints
        18,041, the buy-stop triggers, a fresh CPI-driven trend carries it to 18,120 and the 2R target (18,120) fills —{" "}
        <MathInline>{"+2R"}</MathInline>. <em>Tuesday:</em> same setup, price ticks to 18,042, triggers the long, then
        immediately sags back inside the range and slides to 17,999 — stopped at the lower edge for{" "}
        <MathInline>{"-1R"}</MathInline>. Identical mechanics, opposite outcome; the raw signal cannot tell them apart in
        advance, which is the whole reason the edge (if any) lives in a filter, not the break.
      </P>
      <Callout kind="warn" title="The raw breakout is usually a loser">
        Plain <Code>ORB</Code> across a full history is typically net-negative after costs — that is the honest baseline,
        and exactly why it makes a good teaching example. Any edge comes from a selection layer (a volatility gate, a
        retest entry, a meta-label) applied on top, not from the breakout itself.
      </Callout>

      <H2>Momentum</H2>
      <P>Momentum splits into two related but distinct constructions.</P>
      <H3>Cross-sectional momentum</H3>
      <P>
        <Strong>Mechanism.</Strong> Rank a universe of assets by recent return; go long the top slice, short the bottom,
        rebalance periodically. It is a <em>relative</em> bet — long the strongest against the weakest — and is naturally
        market-neutral-ish. <Strong>Exploits:</Strong> the persistence of relative performance (winners keep beating
        losers over weeks to months). <Strong>Signal sketch:</Strong>{" "}
        <MathInline>{"\\text{rank}_i(r_{t-k:t}), \\; \\text{long top decile / short bottom}"}</MathInline>. edgekit ships
        the <Code>cross_sectional_rank</Code> primitive for the ranking; the strategy is conceptual.
      </P>
      <CodeBlock code={`ranks = ek.indicators.cross_sectional_rank(trailing_return_matrix)   # 1.0 = strongest that date`} />
      <P>
        <Strong>Fails</Strong> in momentum crashes — sharp reversals where yesterday&apos;s losers rip and the short book
        is run over. The left tail is brutal and clustered.
      </P>
      <H3>Time-series momentum</H3>
      <P>
        <Strong>Mechanism.</Strong> Trade each asset on the sign of its <em>own</em> trailing return, independent of
        peers — long if it has been going up, short if down. <Strong>Exploits:</Strong> the same persistence, per-asset.{" "}
        <Strong>Signal sketch:</Strong> <MathInline>{"\\text{sign}\\big(r_{t-k:t}\\big)"}</MathInline>. The trap here is
        that long-only time-series momentum on a rising asset is often just <em>beta</em> — market exposure dressed as
        alpha — so the honest test is whether the short side also pays (see{" "}
        <A href="/tutorials/alpha-vs-beta">alpha vs beta</A>). Conceptual in edgekit.
      </P>

      <H2>Mean-reversion</H2>
      <P>
        <Strong>Mechanism.</Strong> Fade extremes: buy when price is stretched far below a reference, sell when stretched
        far above, exit as it reverts. <Strong>Exploits:</Strong> short-horizon overreaction — order-flow imbalances and
        liquidity gaps that push price away from &ldquo;fair&rdquo; and then correct. <Strong>Signal sketch:</Strong>{" "}
        <MathInline>{"\\text{long when } z_t < -k, \\;\\text{exit when } z_t \\to 0"}</MathInline> using the rolling
        z-score. <Strong>Works</Strong> in range-bound, liquid markets (index ETFs are the classic home).{" "}
        <Strong>Fails</Strong> catastrophically in a trend — a mean-reverter&apos;s losers are open-ended because a
        genuinely trending price never reverts, giving it a high win rate masking a fat left tail. It is, in a precise
        sense, the mirror image of trend-following, which is why the two diversify each other. edgekit&apos;s shipped
        <Code>SmaCross</Code> is a <em>trend</em> template; mean-reversion is conceptual here, built from the{" "}
        <Code>zscore</Code> / <Code>rsi</Code> primitives.
      </P>
      <P>
        <Strong>Scenario (the fade that works, and the one that doesn&apos;t).</Strong> An index ETF closes 2.5 sigma
        below its 60-bar mean after a liquidity-driven flush. You buy the dislocation; over the next three bars it snaps
        back to the mean for a clean <MathInline>{"+1R"}</MathInline>. This happens over and over — you win maybe seven
        times in ten. Then a real regime change hits: price is 2.5 sigma below the mean and <em>keeps going</em> — 3
        sigma, 4 sigma, the mean itself sliding down after it. Your stop is far away (that is how the win rate got so
        high), so the one loser gives back six winners in a single trade. High hit rate, fat left tail — the mean-reverter&apos;s
        signature and its trap.
      </P>
      <Callout kind="tip" title="High win rate is not high expectancy">
        Mean-reversion tempts beginners because it wins often. But expectancy is <MathInline>{"E[R]=pW-(1-p)L"}</MathInline>:
        a 75% win rate with tiny winners and rare huge losers can still be negative. Always judge on expectancy and profit
        factor, never on hit rate.
      </Callout>

      <H2>Statistical arbitrage &amp; pairs</H2>
      <P>
        <Strong>Mechanism.</Strong> Find two (or more) assets whose prices move together, trade the <em>spread</em>
        between them rather than either outright: short the rich leg, long the cheap leg, collect the convergence. Because
        the market exposure cancels, it is close to market-neutral. <Strong>Exploits:</Strong> a stable statistical
        relationship — cointegration — between assets driven by the same underlying factor.
      </P>
      <P>
        The construction has three standard ingredients, all of which edgekit provides as primitives:
      </P>
      <Ul>
        <Li>
          <Strong>Hedge ratio</Strong> — a rolling regression of one leg on the other gives the spread you actually trade
          (<Code>ek.indicators.rolling_ols_hedge</Code>).
        </Li>
        <Li>
          <Strong>z-score</Strong> — standardise the spread; enter when <MathInline>{"|z|"}</MathInline> is large, exit as
          it returns toward zero (<Code>ek.indicators.zscore</Code>).
        </Li>
        <Li>
          <Strong>Half-life</Strong> — the Ornstein-Uhlenbeck half-life of the spread measures how fast it reverts; a
          short half-life is a live pair, an infinite one is a coincidence (<Code>ek.indicators.half_life</Code>).
        </Li>
      </Ul>
      <CodeBlock code={`alpha, beta, spread = ek.indicators.rolling_ols_hedge(leg_y, leg_x, win=90)
z  = ek.core.lag(ek.indicators.zscore(spread, 60), 1)   # trade the spread's z-score
hl = ek.indicators.half_life(spread)                    # short half-life = a reverting pair`} />
      <P>
        <Strong>Scenario (trading the spread, not the leg).</Strong> Two related equity indices normally move together;
        the rolling hedge says leg-Y ≈ 1.3 × leg-X, and the spread&apos;s z-score is +2.2 with a half-life of 6 days. You
        do <em>not</em> care which index goes up — you short the rich leg and long the cheap leg so the market exposure
        nets to roughly zero, and you collect the convergence as z decays toward 0. It works for weeks. Then a sector
        shock hits only one of the two names: the spread blows out to +5 sigma and never comes back — the relationship
        <em> de-cointegrated</em>. That open-ended divergence, not a normal loss, is how a pairs book takes its worst hit,
        and why cointegration that held in-sample must be re-proven out-of-sample before you trust it.
      </P>
      <P>
        <Strong>Signal sketch:</Strong> <MathInline>{"\\text{short spread when } z > +k, \\;\\text{long when } z < -k"}</MathInline>.
        <Strong>Fails</Strong> when the relationship breaks — a structural change de-cointegrates the pair and the spread
        walks away instead of reverting, which is how pairs books suffer their worst losses. Cointegration that held
        in-sample routinely fails to replicate out-of-sample, so this family demands especially ruthless validation.
        Conceptual in edgekit.
      </P>

      <H2>Carry</H2>
      <P>
        <Strong>Mechanism.</Strong> Get paid to hold a position: earn the roll/funding/interest differential and hope the
        spot price does not move against you enough to erase it. <Strong>Exploits:</Strong> a structural risk premium —
        someone pays to hedge, and the carry trader collects it. Examples are FX interest-rate differentials, futures
        term-structure roll, and perpetual-swap funding. <Strong>Signal sketch:</Strong>{" "}
        <MathInline>{"\\text{hold the high-yield leg, funded by the low-yield leg}"}</MathInline>. <Strong>Works</Strong>{" "}
        in calm regimes, where the premium accrues steadily. <Strong>Fails</Strong> in the tail: carry returns look like
        picking up coins in front of a steamroller — long stretches of small gains punctuated by rare, violent unwinds
        (the &ldquo;carry crash&rdquo;). Conceptual; often needs an own-capital venue rather than a CFD account.
      </P>

      <H2>Market-making</H2>
      <P>
        <Strong>Mechanism.</Strong> Quote a bid and an ask simultaneously and earn the spread when both fill, while
        managing inventory back toward flat. <Strong>Exploits:</Strong> the compensation liquidity providers receive for
        immediacy. <Strong>Main risk:</Strong> adverse selection — you get filled precisely when an informed trader knows
        something you don&apos;t — plus inventory risk when the market runs one way. This is a latency- and
        infrastructure-bound game measured in microseconds; it is <Strong>out of scope</Strong> for edgekit&apos;s
        bar-based research engine, which assumes you cross the spread as a taker (that cost is charged in R).
      </P>

      <H2>Event-driven</H2>
      <P>
        <Strong>Mechanism.</Strong> Trade around scheduled or discrete events — earnings, economic releases, index
        rebalances, expiries — where the reaction is more predictable than the direction. <Strong>Exploits:</Strong>{" "}
        structured, repeatable behaviour clustered in time. <Strong>Signal sketch:</Strong>{" "}
        <MathInline>{"\\text{position sized/timed relative to a known event clock}"}</MathInline>. <Strong>Works</Strong>{" "}
        when the reaction pattern is stable and you can be positioned before the crowd. <Strong>Fails</Strong> on the
        gap-and-slippage problem — the biggest moves happen in an instant with no fill in between, and a surprise flips
        the sign. Conceptual; edgekit&apos;s session and calendar tooling (<Code>ek.data.rth_mask</Code>,{" "}
        <Code>minute_of_day</Code>) is the scaffolding you would build the event clock on.
      </P>

      <H2>ML-based</H2>
      <P>
        <Strong>Mechanism.</Strong> Instead of a hand-written rule on one feature, fit a model across many features and
        let it learn the mapping to a labelled outcome (e.g. &ldquo;did this setup reach +1R before −1R?&rdquo;).{" "}
        <Strong>Exploits:</Strong> weak, interacting patterns no single threshold captures — most usefully as a{" "}
        <em>meta-label</em> that filters a base strategy&apos;s signals rather than as a standalone predictor.{" "}
        <Strong>Main risk:</Strong> overfitting and leakage — with enough features and enough tuning, a model will fit
        noise perfectly and generalise to nothing. This is the highest-variance family: the ceiling is real, but so is
        the number of ways to fool yourself. Covered in <A href="/tutorials/machine-learning">Part V</A>, built on
        <A href="/docs/api/ml"> edgekit.ml</A>.
      </P>

      <H2>Choosing a family is choosing a regime bet</H2>
      <P>
        Notice the through-line: trend-following and breakout profit from expansion and continuation; mean-reversion and
        pairs profit from contraction and convergence; carry profits from calm; event-driven from structure. No family
        wins in every regime — each is a bet that a particular market behaviour will recur. That is why serious books
        combine <em>uncorrelated</em> families (trend + reversion, directional + market-neutral) so the one that is
        suffering is offset by the one that is thriving — the subject of{" "}
        <A href="/tutorials/portfolio-construction">portfolio construction</A>.
      </P>
      <ChartFigure
        name="regime_bars"
        alt="Strategy performance broken out by market regime"
        caption="Each family is a regime bet: performance concentrates in the regime it was designed for and gives back in the others. Diversifying across families smooths the whole."
      />
      <P>
        Next: <A href="/tutorials/first-strategy">Build your first strategy</A> — take two of these templates from
        data load to trade statistics, end to end.
      </P>
    </>
  );
}
