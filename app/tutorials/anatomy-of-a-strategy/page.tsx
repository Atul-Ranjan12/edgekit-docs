import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Anatomy of a strategy" };

export default function Page() {
  return (
    <>
      <H1>Anatomy of a strategy</H1>
      <Lead>
        Every mechanical strategy, however it dresses itself up, is four decisions bolted together: a signal that says
        when the market is interesting, an entry that commits capital, an exit that releases it, and a size that decides
        how much. This chapter takes that decomposition apart, ties it to the unit everything is measured in — the
        R-multiple — and shows the exact edgekit interface you implement to make it real.
      </Lead>

      <H2>The four decisions</H2>
      <P>
        It is tempting to think of a strategy as &ldquo;the indicator&rdquo; — the moving-average crossover, the RSI
        threshold, the breakout level. But the indicator is only the <em>signal</em>. A tradeable strategy is the whole
        chain, and each link can make or break the edge independently:
      </P>
      <Ul>
        <Li>
          <Strong>Signal</Strong> — a condition on past data that flags a candidate: a close above a channel, an
          oscillator at an extreme, a spread stretched from its mean. It answers <em>&ldquo;is anything happening?&rdquo;</em>
        </Li>
        <Li>
          <Strong>Entry</Strong> — how and where you actually get in once the signal fires: at the next open, on a stop
          through a level, on a limit into a pullback. It also fixes the <em>risk distance</em> — the gap from entry to
          the stop that defines one unit of risk.
        </Li>
        <Li>
          <Strong>Exit</Strong> — the rules that end the trade: a protective stop, a profit target, a trailing channel, a
          time stop. Most of a strategy&apos;s character lives here, not in the entry.
        </Li>
        <Li>
          <Strong>Sizing</Strong> — how many dollars of risk ride on this particular trade. Sizing does not create edge,
          but it decides whether a real edge compounds or a run of losers ruins you.
        </Li>
      </Ul>
      <Callout kind="tip" title="Signal and edge are not the same thing">
        A signal with a real statistical edge can still lose money after a bad entry fill, a stop placed in the noise, or
        sizing that blows through a drawdown. Conversely, no exit or sizing trick rescues a signal that has no edge to
        begin with. Keep the four decisions separate in your head so you can test each one in isolation.
      </Callout>
      <Callout kind="tip" title="Scenario: one trade through all four decisions">
        <P>
          It is 12:00 UTC and a fresh H4 bar just closed on <Strong>BTCUSDT</Strong> at 68,400. The <em>signal</em> fires:
          that close is above the highest high of the prior 20 bars (66,900) — a 20-bar Donchian breakout. The{" "}
          <em>entry</em> commits on the next bar&apos;s open, at 68,550. The 20-bar ATR is 900, so you place the initial
          stop two ATRs below at 68,550 − 1,800 = 66,750; that 1,800-point gap <em>is</em> your risk distance, one R. The{" "}
          <em>exit</em> is a trailing rule: you&apos;ll leave when a bar closes back under the 20-bar low. And the{" "}
          <em>size</em>: on a $100k account risking 1% you commit $1,000 to that 1,800-point stop — about 0.55 BTC — so a
          full stop-out costs $1,000 and a move to 72,150 (+2R) makes $2,000.
        </P>
        <P>
          Every later chapter is one of those four words in more depth. Notice that three of the four numbers you just
          set — the breakout level, the stop, the trail — never mention dollars. That is the R-world the research engine
          lives in; the dollar step comes last.
        </P>
      </Callout>

      <H2>The R-multiple is the unit</H2>
      <P>
        edgekit prices every trade in <Strong>R-multiples</Strong>, not dollars or pips. One <MathInline>{"R"}</MathInline> is the
        risk you committed on entry — the distance from your entry price to your initial stop. A trade that makes twice
        what it risked is <MathInline>{"+2R"}</MathInline>; one stopped out for its full risk is <MathInline>{"-1R"}</MathInline> (a touch
        worse after cost). For a long,
      </P>
      <Math>{"R = \\frac{P_{\\text{exit}} - P_{\\text{entry}}}{d_{\\text{stop}}} - c"}</Math>
      <P>
        where <MathInline>{"d_{\\text{stop}}"}</MathInline> is the stop distance in price units and <MathInline>{"c"}</MathInline> is the
        round-trip cost, itself expressed in R. Working in R does three things at once. It makes trades on a $30 stock and
        a $60,000 coin directly comparable. It separates the <em>edge</em> (the R-distribution the strategy produces) from
        the <em>sizing</em> (how many dollars you assign per R) — the subject of a whole later chapter. And it lets the
        expectancy formula from <A href="/tutorials/the-math-of-edge">the math of edge</A> read straight off the trade
        list:
      </P>
      <Math>{"E[R] = p\\,W - (1-p)\\,L"}</Math>
      <P>
        with <MathInline>{"p"}</MathInline> the win rate, <MathInline>{"W"}</MathInline> the average winner in R and{" "}
        <MathInline>{"L"}</MathInline> the average loser in R. A strategy is worth trading only when{" "}
        <MathInline>{"E[R] > 0"}</MathInline> after costs — and a trend-follower can be profitable at a 40% win rate if{" "}
        <MathInline>{"W"}</MathInline> is large enough, while a mean-reverter can win 70% of the time and still bleed if its
        losers are fat. The R-histogram is the picture of that distribution.
      </P>
      <P>
        <Strong>Scenario (reading R off a fill).</Strong> Take the BTCUSDT trade above: entry 68,550, stop distance{" "}
        <MathInline>{"d_{\\text{stop}}=1{,}800"}</MathInline>. The trail eventually fires and the engine closes it at
        71,250. Ignoring cost, that is <MathInline>{"(71{,}250-68{,}550)/1{,}800 = +1.5R"}</MathInline>. Charge a
        round-trip cost of, say, 0.05R and the booked trade is <MathInline>{"+1.45R"}</MathInline>. Had it instead gapped
        down and stopped, you would read roughly <MathInline>{"-1R"}</MathInline> (a touch worse if the open gapped
        through the stop). Whether the coin trades at 68k or a stock trades at $30, that same +1.45 / −1.05 vocabulary
        lets you pool both onto one histogram and read the expectancy straight off the mean.
      </P>
      <ChartFigure
        name="r_histogram"
        alt="Histogram of per-trade R-multiples"
        caption="A strategy's edge is the shape of its R-distribution: many small losers and a fat right tail is the trend-following signature; expectancy is its mean."
      />

      <H2>Causality: act on bar i using data through i−1</H2>
      <P>
        The single rule that separates a real backtest from fiction: on bar <MathInline>{"i"}</MathInline>, a strategy may
        only use information that was actually knowable before bar <MathInline>{"i"}</MathInline> traded. The close of bar{" "}
        <MathInline>{"i"}</MathInline> is not known until bar <MathInline>{"i"}</MathInline> is over, so a rule that decides at the
        open of <MathInline>{"i"}</MathInline> must read indicators computed through <MathInline>{"i-1"}</MathInline>. Break
        this and the backtest quietly trades on the future — the most common way a &ldquo;profitable&rdquo; system turns
        out to be a mirage (see <A href="/tutorials/why-backtests-lie">why backtests lie</A>).
      </P>
      <P>
        edgekit enforces causality structurally. Indicators in <A href="/docs/api/indicators">edgekit.indicators</A> are
        deliberately <em>un-lagged</em> — index <MathInline>{"i"}</MathInline> holds the value computed through bar{" "}
        <MathInline>{"i"}</MathInline> inclusive — and it is your job to shift them by one bar with{" "}
        <Code>edgekit.core.lag</Code> before a rule acts on them. The engine then fills entries at the <em>open of the
        next bar</em>, gap-aware, so no trade is ever booked at a price the strategy could not have reached.
      </P>
      <P>
        <Strong>Scenario (the one-bar shift, concretely).</Strong> Suppose bar <MathInline>{"i"}</MathInline> is the 08:00
        UTC H4 candle on BTCUSDT and your rule is &ldquo;go long on a break of the prior 20-bar high.&rdquo; The naive
        code reads the Donchian upper channel at index <MathInline>{"i"}</MathInline> — but that value already folds in
        bar <MathInline>{"i"}</MathInline>&apos;s own high, which is not known until 12:00 when the candle closes. So the
        breakout is measured against a level that partly includes the very bar you are testing: guaranteed look-ahead. The
        lag fixes it — <Code>up_prev = lag(up, 1)</Code> means index <MathInline>{"i"}</MathInline> now holds the channel
        <em> through 04:00</em> (bar <MathInline>{"i-1"}</MathInline>), which is exactly what a trader staring at the chart
        at the 08:00 open could actually see. Same rule, honest data.
      </P>
      <Callout kind="warn" title="Lag inside prepare, never inside entry/exit">
        Because <Code>entry</Code> and <Code>exit</Code> run <em>on</em> bar <Code>i</Code>, every indicator array they read
        must already have been lagged when you built it. If you hand the entry rule an un-lagged ATR or channel, bar{" "}
        <Code>i</Code> reads its own completed value and you have look-ahead. Do the shifting once, in <Code>prepare</Code>.
      </Callout>

      <H2>The edgekit Strategy interface</H2>
      <P>
        A research strategy is a small class with a name and three methods — the runtime-checkable{" "}
        <Code>Strategy</Code> protocol that <A href="/docs/api/engine">edgekit.engine</A> consumes. Most strategies
        subclass <Code>BaseStrategy</Code>, which supplies the one-line <Code>.backtest</Code> wiring so you only implement
        the decisions:
      </P>
      <CodeBlock code={`prepare(self, bars) -> dict                        # precompute causal (lagged) indicator arrays — the P dict
entry(self, bars, P, i) -> EntryIntent | None      # entry decision on a FLAT bar i
exit(self, bars, P, pos, i) -> float | None        # exit price while IN a position on bar i`} />
      <Ul>
        <Li>
          <Code>prepare</Code> runs once at the start of a backtest. It computes every indicator the rules need and{" "}
          <Strong>lags them</Strong>, returning them in a plain dict conventionally called <Code>P</Code>.
        </Li>
        <Li>
          <Code>entry</Code> is called on each bar while flat. Return an <Code>EntryIntent</Code> to commit, or{" "}
          <Code>None</Code> to stand aside.
        </Li>
        <Li>
          <Code>exit</Code> is called on each bar while in a position <Code>pos</Code>. Return an exit price to close, or{" "}
          <Code>None</Code> to hold (the engine still enforces the stop).
        </Li>
      </Ul>

      <H3>EntryIntent — the entry as data</H3>
      <P>
        The entry rule does not place an order directly; it returns an <Code>EntryIntent</Code> describing the trade, and
        the engine handles the (pessimistic, gap-aware) fill. Three fields:
      </P>
      <CodeBlock code={`EntryIntent(direction: int, level: float, stop_dist: float)`} />
      <Table
        head={["Field", "Meaning"]}
        rows={[
          [<Code key="a">direction</Code>, "+1 for long, −1 for short."],
          [<Code key="b">level</Code>, "The trigger price — where you intend to enter (e.g. the breakout level)."],
          [<Code key="c">stop_dist</Code>, "Stop distance in price units. This IS the R denominator — the risk unit."],
        ]}
      />
      <P>
        Note what is <em>not</em> here: no share count, no dollar amount. The research engine works entirely in R, so the
        entry only declares direction, where, and how far to the stop. Turning R into dollars is a separate, later
        decision handled by <A href="/docs/api/sizing">edgekit.sizing</A>.
      </P>

      <H3>A minimal BaseStrategy skeleton</H3>
      <P>
        Here is the whole pattern in one illustrative class — a plain channel breakout, shown for its structure, not as an
        edge to trade. Watch where the lag lives (in <Code>prepare</Code>) and how the entry expresses risk through{" "}
        <Code>stop_dist</Code>:
      </P>
      <CodeBlock
        filename="skeleton.py"
        code={`import edgekit as ek
from edgekit.strategy import BaseStrategy
from edgekit.engine import EntryIntent
from edgekit.core import lag

class ChannelBreakout(BaseStrategy):
    name = "channel_breakout"          # carried onto every trade's 'tag'

    def __init__(self, chan_n=20, atr_n=20, stop_mult=2.0):
        self.chan_n, self.atr_n, self.stop_mult = chan_n, atr_n, stop_mult

    def prepare(self, bars):
        up, lo = ek.indicators.donchian(bars.high, bars.low, self.chan_n)
        atr = ek.indicators.atr(bars.high, bars.low, bars.close, self.atr_n)
        # Lag EVERYTHING a rule will read on bar i — this is the causality contract.
        return {"up": lag(up, 1), "lo": lag(lo, 1), "atr": lag(atr, 1)}

    def entry(self, bars, P, i):
        level, atr = P["up"][i], P["atr"][i]
        if atr > 0 and bars.close.iloc[i] > level:      # break of the prior channel high
            return EntryIntent(direction=1, level=level, stop_dist=self.stop_mult * atr)
        return None                                     # otherwise stay flat

    def exit(self, bars, P, pos, i):
        # Illustrative trailing exit: leave when price closes back under the lower channel.
        if bars.close.iloc[i] < P["lo"][i]:
            return bars.close.iloc[i]
        return None                                     # else the engine's stop protects us

trades = ChannelBreakout().backtest(bars, warmup=210, bars_per_day=6)
print(trades["r"].sum(), len(trades))    # total net R, trade count`}
      />
      <P>
        <Code>.backtest</Code> runs the class through the bar loop and returns the canonical trade frame — one row per
        closed trade, net R in the <Code>r</Code> column, exit date in <Code>date</Code>, plus <Code>dir</Code>,{" "}
        <Code>bars_held</Code>, <Code>entry</Code>, <Code>exit</Code>, <Code>stop_dist</Code>, and{" "}
        <Code>exit_reason</Code>. That frame is the raw material for every metric and every validation test that follows.
      </P>
      <Callout kind="note" title="One position at a time">
        The research engine (<Code>run_bar_loop</Code>) holds a single position at a time: <Code>entry</Code> is polled
        only while flat, <Code>exit</Code> only while in a trade. This keeps R-accounting unambiguous. Portfolio-level
        concurrency — several strategies or instruments at once — is assembled afterwards from separate R-streams in{" "}
        <A href="/tutorials/portfolio-construction">portfolio construction</A>.
      </Callout>

      <H2>Where the pieces go from here</H2>
      <P>
        The rest of Part III walks the four decisions one at a time. The next chapter builds the raw material for the{" "}
        <em>signal</em> — the indicator families and the lag discipline that keeps them honest. Then comes a taxonomy of
        the strategy archetypes those signals feed, a full worked build, the mechanics of entries and exits, and finally
        the math of sizing.
      </P>
      <P>
        Next: <A href="/tutorials/indicators-and-features">Indicators &amp; features</A> — the vocabulary of signals,
        and the one lag rule that keeps them causal.
      </P>
    </>
  );
}
