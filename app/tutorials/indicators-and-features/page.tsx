import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, A, Strong, Callout } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Indicators & features" };

export default function Page() {
  return (
    <>
      <H1>Indicators &amp; features</H1>
      <Lead>
        Indicators are how a strategy compresses a stream of prices into a handful of numbers a rule can act on. There
        are only a few underlying ideas — level, direction, speed, spread, and dispersion — and almost every named
        indicator is one of them in disguise. This chapter walks the families, gives the one-line formula and the exact
        edgekit call for each, and nails down the causality rule that decides whether any of it means anything.
      </Lead>

      <Callout kind="note" title="An indicator is a feature, not a signal">
        On its own an indicator is just a transformed price series — a <em>feature</em>. It becomes a signal only when a
        rule reads it (&ldquo;go long when the fast MA crosses the slow&rdquo;). The same features also feed the machine-learning
        layer in <A href="/tutorials/machine-learning">Part V</A>, where a model — not a hand-written threshold —
        decides what they mean.
      </Callout>

      <H2>The families</H2>

      <H3>Trend — where is the level, and which way is it drifting?</H3>
      <P>
        Moving averages smooth price into a slow level so you can read direction. The simple moving average is the mean of
        the last <MathInline>{"n"}</MathInline> closes; the exponential moving average weights recent bars more heavily and
        reacts faster:
      </P>
      <Math>{"\\text{SMA}_n = \\frac{1}{n}\\sum_{k=0}^{n-1} P_{t-k}, \\qquad \\text{EMA}_t = \\alpha P_t + (1-\\alpha)\\,\\text{EMA}_{t-1}, \\;\\; \\alpha = \\frac{2}{n+1}"}</Math>
      <P>
        A rising average means the market is trending up on that horizon; the gap or crossover between a fast and a slow
        average is the classic trend signal. Longer <MathInline>{"n"}</MathInline> = smoother but laggier.
      </P>
      <CodeBlock code={`ma_fast = ek.indicators.ema(bars.close, 20)
ma_slow = ek.indicators.sma(bars.close, 100)
ma200   = ek.indicators.sma(bars.close, 200)     # a common macro-trend gate: longs only above it`} />
      <P>
        <Strong>Scenario (a cross fires).</Strong> On <Strong>BTCUSDT H4</Strong>, the fast EMA(20) has been sitting under
        the slow SMA(100) all through a two-week grind — no long allowed. On the 16:00 bar the EMA(20) prints 64,900 and
        the SMA(100) prints 64,700: the fast line has crossed <em>above</em> the slow one. At the desk that is the trend
        flag turning on. If price is also above the SMA(200) macro gate (say 61,000), a trend-follower now has permission
        to look for a long; if the fast line were still below the slow, the same bar would be ignored entirely.
      </P>

      <H3>Momentum — how fast, and is it overextended?</H3>
      <P>
        Momentum oscillators measure the speed and one-sidedness of recent moves. The Relative Strength Index maps the
        ratio of average up-moves to average down-moves onto a bounded 0–100 scale:
      </P>
      <Math>{"\\text{RSI} = 100 - \\frac{100}{1 + RS}, \\qquad RS = \\frac{\\text{avg gain}_n}{\\text{avg loss}_n}"}</Math>
      <P>
        High RSI flags an overbought push, low RSI an oversold washout. A trend-follower reads a high RSI as strength; a
        mean-reverter reads the same value as a fade candidate — the indicator is neutral, the interpretation is the
        strategy. The fast <MathInline>{"n=2"}</MathInline> variant is the short-horizon exhaustion flag; longer{" "}
        <MathInline>{"n=14"}</MathInline> is the smoother momentum read.
      </P>
      <CodeBlock code={`rsi_fast = ek.indicators.rsi(bars.close, 2)      # short-term exhaustion
rsi      = ek.indicators.rsi(bars.close, 14)     # smoother momentum`} />
      <P>
        <Strong>Scenario (same number, two strategies).</Strong> ETHUSDT has run hard and the RSI(14) reads 78. A
        trend-follower sees 78 and thinks &ldquo;strength — the move has thrust, stay long.&rdquo; A mean-reverter sees
        the identical 78 and thinks &ldquo;overbought — fade it back toward the mean.&rdquo; The oscillator has not taken a
        side; the strategy has. That is why the RSI belongs to the <em>feature</em> layer, not the signal — the same
        column feeds opposite trades depending on which archetype reads it.
      </P>

      <H3>Volatility — how big is a normal move right now?</H3>
      <P>
        Volatility indicators size the market&apos;s current wiggle so risk can be set relative to it. Average True Range
        is the mean of the true range — the largest of today&apos;s high−low and the gaps to the prior close:
      </P>
      <Math>{"TR_t = \\max\\big(H_t - L_t,\\; |H_t - C_{t-1}|,\\; |L_t - C_{t-1}|\\big), \\qquad \\text{ATR}_n = \\text{mean}_n(TR)"}</Math>
      <P>
        ATR is the workhorse behind the R-multiple: a stop set at <MathInline>{"k \\times \\text{ATR}"}</MathInline> keeps
        the risk-per-trade constant in <em>volatility units</em> across calm and wild regimes, which is what makes R
        comparable through time. The log-space variant normalises range so it is comparable across price levels, and the
        Average Directional Index turns range into a trend-strength score (low ADX = chop, a natural gate to sit out).
      </P>
      <CodeBlock code={`atr    = ek.indicators.atr(bars.high, bars.low, bars.close, 20)     # stop distance / R unit
atr_lg = ek.indicators.atr_log(bars.high, bars.low, bars.close, 84) # regime-comparable vol
adx    = ek.indicators.adx(bars.high, bars.low, bars.close, 14)     # trend strength (gate chop)`} />
      <P>
        <Strong>Scenario (ATR sets the risk, not the price).</Strong> In a calm July stretch BTCUSDT&apos;s H4 ATR(20) is
        700 points; after a macro shock it jumps to 2,100. A fixed 1,000-point stop would be three noise-bars wide in calm
        and get tapped on the first wiggle in stress. A <MathInline>{"2\\times\\text{ATR}"}</MathInline> stop instead sits
        1,400 points away in calm and 4,200 in stress — so &ldquo;one R&rdquo; always means the same amount of{" "}
        <em>normal</em> movement. That is the whole trick behind volatility-normalised risk: the dollar stop moves so the
        R stays constant.
      </P>

      <H3>Channels — has price left its recent envelope?</H3>
      <P>
        A channel wraps price in a band; a break of the band is the event. The Donchian channel is the simplest — the
        highest high and lowest low of the last <MathInline>{"n"}</MathInline> bars — and is the engine behind breakout
        systems. Keltner-style envelopes instead centre on a moving average and widen by a multiple of ATR:
      </P>
      <Math>{"\\text{upper}_n = \\max_{k<n} H_{t-k}, \\quad \\text{lower}_n = \\min_{k<n} L_{t-k}; \\qquad \\text{EMA}_n \\pm m\\cdot\\text{ATR}_n"}</Math>
      <P>
        A close above the upper band is a &ldquo;price is escaping its range&rdquo; signal; the opposite band or the
        centre line is a natural exit. edgekit ships the Donchian primitive; the ATR-envelope you build from{" "}
        <Code>ema</Code> + <Code>atr</Code>.
      </P>
      <CodeBlock code={`up, lo = ek.indicators.donchian(bars.high, bars.low, 20)   # breakout channel
mid    = ek.indicators.ema(bars.close, 20)
band   = mid + 2.0 * ek.indicators.atr(bars.high, bars.low, bars.close, 20)`} />
      <P>
        <Strong>Scenario (the band is the event).</Strong> The 20-bar Donchian upper on BTCUSDT H4 has been flat at
        66,900 for days while price coils beneath it. The 20:00 bar closes at 67,300 — price has escaped the top of its
        three-day envelope. That single event is the breakout signal; the lower band at 63,100 is the natural
        opposite-edge stop, so the channel hands you both the trigger and the risk in one primitive.
      </P>

      <H3>Mean-reversion — how far from fair is price?</H3>
      <P>
        Mean-reversion features measure <em>distance from a reference</em> in standard-deviation units, so &ldquo;far&rdquo;
        is defined statistically rather than by eyeballing. The rolling z-score is the canonical one:
      </P>
      <Math>{"z_t = \\frac{x_t - \\mu_{n}(x)}{\\sigma_{n}(x)}"}</Math>
      <P>
        where <MathInline>{"\\mu_n"}</MathInline> and <MathInline>{"\\sigma_n"}</MathInline> are the trailing mean and
        standard deviation over <MathInline>{"n"}</MathInline> bars. A large positive <MathInline>{"z"}</MathInline> says
        price is stretched high relative to its recent range — a fade candidate <em>if</em> the series actually reverts.
        The same z-score is the core of a stat-arb spread signal, applied to the residual of one asset regressed on
        another rather than to raw price.
      </P>
      <CodeBlock code={`z = ek.indicators.zscore(bars.close, 60)   # standardised distance from the trailing mean`} />
      <P>
        <Strong>Scenario (how far is &ldquo;far&rdquo;?).</Strong> A stock&apos;s 60-bar mean is $148 with a standard
        deviation of $2. Today it prints $153 — a big-looking $5 pop, but that is <MathInline>{"z=+2.5"}</MathInline>,
        genuinely stretched. Now a different, jumpier name has a 60-bar mean of $148 and a standard deviation of $6; the
        same $153 print is only <MathInline>{"z=+0.8"}</MathInline> — barely a ripple. The z-score converts &ldquo;how
        many dollars&rdquo; into &ldquo;how many typical bars,&rdquo; which is the only version of &ldquo;far&rdquo; a
        fade should act on — and only <em>if</em> the series actually reverts, which the next chapter tests.
      </P>

      <H2>The causality rule: lag every feature</H2>
      <P>
        Here is the rule that everything hinges on, and the one most retail backtests get wrong.{" "}
        <Strong>Every indicator in edgekit is returned un-lagged.</Strong> Index position <MathInline>{"i"}</MathInline>{" "}
        holds the value computed <em>through</em> bar <MathInline>{"i"}</MathInline> inclusive — a number you only truly
        know once bar <MathInline>{"i"}</MathInline> has closed. A rule that reads it while deciding what to do <em>on</em>{" "}
        bar <MathInline>{"i"}</MathInline> is peeking at the current, completed bar. The fix is a one-bar shift with{" "}
        <Code>edgekit.core.lag</Code>:
      </P>
      <CodeBlock
        filename="causality.py"
        code={`import edgekit as ek
from edgekit.core import lag

# WRONG — reads bar i's own completed ATR while acting on bar i (look-ahead)
N_bad = ek.indicators.atr(bars.high, bars.low, bars.close, 20)

# RIGHT — lag by one bar so N[i] reflects only what was known at the close of i-1
N     = lag(ek.indicators.atr(bars.high, bars.low, bars.close, 20), 1)
up, _ = ek.indicators.donchian(bars.high, bars.low, 20)
up_prev = lag(up, 1)          # a breakout on bar i is measured against the PRIOR channel`}
      />
      <P>
        edgekit keeps the lag at the call site on purpose. Baking a shift into each indicator would hide the single most
        consequential modelling decision you make; leaving it explicit means every strategy&apos;s{" "}
        <Code>prepare</Code> method visibly declares which bar of information it acts on. The habit costs one function
        call and buys you a backtest that is not lying to you.
      </P>
      <P>
        <Strong>Scenario (a one-line leak worth 20% a year).</Strong> A researcher backtests &ldquo;buy when the RSI(2)
        crosses up through 10&rdquo; on ETHUSDT and gets a dazzling curve. The bug: the un-lagged RSI at bar{" "}
        <MathInline>{"i"}</MathInline> is computed <em>through</em> bar <MathInline>{"i"}</MathInline>&apos;s close, so the
        rule is really buying bars that <em>already</em> closed with a low RSI — it is peeking at the close it claims to
        act before. Add <Code>lag(..., 1)</Code> and the entry now keys off the RSI known at the prior close; the curve
        loses most of its gain. Nothing about the idea changed — only whether the backtest was allowed to see the future.
      </P>
      <Callout kind="danger" title="Look-ahead is the number-one way backtests inflate">
        Reading an un-lagged indicator, resampling with right-labelled bars, or computing a rolling stat over the full
        sample all leak the future into the past. The result is a gorgeous equity curve that evaporates live. Part IV&apos;s
        <A href="/tutorials/why-backtests-lie"> why backtests lie</A> catalogues the whole family; the lag is your
        first line of defence against it.
      </Callout>

      <H2>Features track regimes — which is the point and the trap</H2>
      <P>
        A good feature is informative precisely because it moves as the market&apos;s regime moves: ATR expands in stress,
        ADX rises in trends, z-scores blow out in dislocations. That responsiveness is what a rule exploits — and also why
        a single fixed threshold rarely holds across regimes. Volatility-normalised features (anything divided by ATR)
        travel across regimes better than raw-price ones, which is why R-multiples and ATR stops recur everywhere in
        edgekit.
      </P>
      <ChartFigure
        name="rolling_metrics"
        alt="Rolling indicator statistics over time"
        caption="Features are not static: a rolling statistic drifts with the regime. Normalising by volatility is what keeps a threshold meaningful across calm and stressed periods."
      />

      <H2>From feature to strategy</H2>
      <P>
        Everything here plugs into the <Code>prepare</Code> method from the previous chapter: compute the features you
        need, lag them, stash them in the <Code>P</Code> dict, and let <Code>entry</Code>/<Code>exit</Code> read them by
        index. What differs between a trend-follower, a breakout, and a mean-reverter is not the indicator library — it is
        which features they read and which direction they trade the reading. That is the map the next chapter draws.
      </P>
      <P>
        Next: <A href="/tutorials/taxonomy-of-strategies">A taxonomy of strategies</A> — the archetypes these
        features feed, what each one exploits, and when it fails.
      </P>
    </>
  );
}
