import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.indicators" };

export default function IndicatorsPage() {
  return (
    <>
      <H1>edgekit.indicators</H1>
      <Lead>
        Vectorised technical indicators — the single home for logic that was copy-pasted across ~90 research scripts
        (the Hawkes filter alone appeared 52 times). Every function returns a numpy array aligned to the input bars.
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> Volatility (<Code>true_range</Code>, <Code>atr</Code>,{" "}
        <Code>atr_log</Code>), trend strength (<Code>adx</Code>), moving averages (<Code>sma</Code>, <Code>ema</Code>),
        the Donchian channel (<Code>donchian</Code>) used by breakout systems, oscillators (<Code>rsi</Code>,{" "}
        <Code>zscore</Code>), the Hawkes volatility-clustering pair (<Code>hawkes</Code>,{" "}
        <Code>hawkes_vol_expansion</Code>), and the cross-sectional / stat-arb primitives
        (<Code>rolling_beta</Code>, <Code>residualize</Code>, <Code>rolling_ols_hedge</Code>, <Code>half_life</Code>,{" "}
        <Code>cross_sectional_rank</Code>).
      </P>

      <Callout kind="danger" title="The causality contract — read this first">
        <P>
          <Strong>Every function here returns values that are NOT lagged.</Strong> Index position <Code>i</Code> holds
          the indicator computed <em>through</em> bar <Code>i</Code>, inclusive — a value you only actually know at that
          bar&apos;s close. A trading rule that reads it on bar <Code>i</Code> is peeking at the current, completed bar:
          look-ahead bias.
        </P>
        <P>
          The caller <Strong>must</Strong> lag every indicator with <Code>edgekit.core.lag</Code> (or a{" "}
          <Code>.shift(1)</Code>) before a strategy acts on it. Keeping the lag at the call site rather than baking it
          into each indicator is deliberate: it makes the causality decision visible and testable. This one habit is the
          difference between a real backtest and fiction.
        </P>
      </Callout>

      <CodeBlock
        filename="causality.py"
        code={`from edgekit import indicators as ind
from edgekit.core import lag

# WRONG — reads the current bar's completed ATR (look-ahead)
N_bad = ind.atr(bars.high, bars.low, bars.close, 20)

# RIGHT — lag by one bar; N[i] reflects info known at the close of bar i-1
N = lag(ind.atr(bars.high, bars.low, bars.close, 20), 1)`}
      />

      <H2>Volatility</H2>

      <H3>true_range</H3>
      <P>Wilder true range — the greater of high−low, |high−prior close|, |low−prior close|. The first bar falls back to high−low (no prior close). Always ≥ 0.</P>
      <CodeBlock code={`true_range(h, l, c) -> np.ndarray`} />
      <Ul>
        <Li><Code>h, l, c</Code> — high / low / close arrays (or Series).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of per-bar true range, aligned to the inputs.</P>

      <H3>atr</H3>
      <P>Average true range — the R-denominator building block. <Code>wilder=False</Code> is a simple rolling mean (the default); <Code>wilder=True</Code> uses Wilder smoothing (<Code>ewm(alpha=1/n)</Code>).</P>
      <CodeBlock code={`atr(h, l, c, n: int = 20, wilder: bool = False) -> np.ndarray`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">h, l, c</Code>, "array", "—", "High / low / close."],
          [<Code key="b">n</Code>, "int", "20", "Lookback window."],
          [<Code key="c">wilder</Code>, "bool", "False", "False = simple rolling mean; True = Wilder ewm smoothing."],
        ]}
      />
      <P><Strong>Returns:</Strong> a numpy array of ATR (leading <Code>n−1</Code> positions are NaN for the rolling-mean form).</P>
      <CodeBlock code={`N = lag(ind.atr(bars.high, bars.low, bars.close, 20), 1)   # risk unit (stop distance)`} />

      <H3>atr_log</H3>
      <P>Log-space ATR (Wilder ewm on log true range) — the volatility normaliser used by the Hawkes volatility filter, so range is comparable across price regimes.</P>
      <CodeBlock code={`atr_log(h, l, c, n: int = 84) -> np.ndarray`} />
      <Ul>
        <Li><Code>h, l, c</Code> — high / low / close.</Li>
        <Li><Code>n</Code> — Wilder ewm lookback (default 84).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of log-space ATR.</P>

      <H2>Trend &amp; averages</H2>

      <H3>adx</H3>
      <P>Wilder ADX (trend-strength), ported verbatim from the repo&apos;s <Code>wadx</Code>/<Code>adxf</Code>. A low ADX marks chop; a trend filter typically gates entries on <Code>{"ADX >= adx_min"}</Code> to skip it.</P>
      <CodeBlock code={`adx(h, l, c, n: int = 14) -> np.ndarray`} />
      <Ul>
        <Li><Code>h, l, c</Code> — high / low / close.</Li>
        <Li><Code>n</Code> — Wilder smoothing length (default 14).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of ADX values (roughly 0–100).</P>

      <H3>sma, ema</H3>
      <P>Rolling simple mean; exponential mean (<Code>ewm(span=n, adjust=False)</Code>). A common <Code>macro_ma</Code> macro-trend filter is an <Code>sma</Code> of close.</P>
      <CodeBlock code={`sma(x, n: int) -> np.ndarray
ema(x, n: int) -> np.ndarray`} />
      <Ul>
        <Li><Code>x</Code> — the series to smooth (e.g. close).</Li>
        <Li><Code>n</Code> — window / span.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of the smoothed series.</P>
      <CodeBlock code={`ma200 = lag(ind.sma(bars.close, 200), 1)   # macro filter: longs only above it`} />

      <H3>donchian</H3>
      <P>
        The rolling channel behind breakout systems: <Code>upper</Code> = highest high over <Code>n</Code> bars,{" "}
        <Code>lower</Code> = lowest low over <Code>n</Code> bars. Not lagged — a breakout rule uses{" "}
        <Code>lag(upper, 1)</Code> so the breakout is measured against the channel <em>as of the prior bar</em>.
      </P>
      <CodeBlock code={`donchian(h, l, n: int = 20) -> tuple[np.ndarray, np.ndarray]`} />
      <Ul>
        <Li><Code>h, l</Code> — high / low arrays.</Li>
        <Li><Code>n</Code> — channel lookback (default 20, the classic breakout entry length).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a tuple <Code>(upper, lower)</Code> of numpy arrays.</P>
      <CodeBlock code={`up, lo = ind.donchian(bars.high, bars.low, 20)
up_prev = lag(up, 1)                    # breakout when high clears up_prev`} />

      <H2>Oscillators</H2>

      <H3>rsi</H3>
      <P>Wilder RSI, bounded [0,100]. <Code>n=2</Code> is the mean-reversion (RSI2) variant used on indices — a fast oscillator that flags short-term exhaustion.</P>
      <CodeBlock code={`rsi(c, n: int = 14) -> np.ndarray`} />
      <Ul>
        <Li><Code>c</Code> — close array.</Li>
        <Li><Code>n</Code> — Wilder length (default 14; use 2 for the RSI2 mean-reversion setup).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of RSI values in [0,100].</P>

      <H3>zscore</H3>
      <P>Rolling z-score of a series over <Code>win</Code> bars — how many standard deviations the current value sits from its trailing mean. The workhorse of the stat-arb spread signal.</P>
      <CodeBlock code={`zscore(x, win: int) -> np.ndarray`} />
      <Ul>
        <Li><Code>x</Code> — the series (e.g. a hedge-ratio spread).</Li>
        <Li><Code>win</Code> — rolling window.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of rolling z-scores.</P>

      <H2>Hawkes volatility clustering</H2>

      <H3>hawkes</H3>
      <P>
        Hawkes self-exciting intensity: <Code>o[i] = o[i-1]*exp(-kappa) + x[i]</Code>, scaled by <Code>kappa</Code>. A
        decaying-memory accumulator — a spike in <Code>x</Code> excites the intensity, which then decays geometrically.
        Used as a volatility-clustering filter (NeuroTrader).
      </P>
      <CodeBlock code={`hawkes(x, kappa: float) -> np.ndarray`} />
      <Ul>
        <Li><Code>x</Code> — the excitation series (e.g. normalised bar range).</Li>
        <Li><Code>kappa</Code> — decay rate; larger <Code>kappa</Code> = faster forgetting (default used elsewhere is 0.1).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of Hawkes intensity (leading value is NaN until seeded).</P>

      <H3>hawkes_vol_expansion</H3>
      <P>
        Boolean expansion filter: <Code>True</Code> when the Hawkes intensity of normalised range sits above its rolling
        median — i.e. volatility is expanding. A typical <Code>HK</Code> gate: only take a breakout while
        vol is opening up. Not lagged.
      </P>
      <CodeBlock code={`hawkes_vol_expansion(h, l, c, atr_lb: int = 84, kappa: float = 0.1,
                     median_win: int = 42) -> np.ndarray`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">h, l, c</Code>, "array", "—", "High / low / close."],
          [<Code key="b">atr_lb</Code>, "int", "84", "Log-ATR lookback used to normalise range."],
          [<Code key="c">kappa</Code>, "float", "0.1", "Hawkes decay rate."],
          [<Code key="d">median_win</Code>, "int", "42", "Rolling window for the expansion threshold (median)."],
        ]}
      />
      <P><Strong>Returns:</Strong> a boolean numpy array — <Code>True</Code> where volatility is expanding.</P>
      <Callout kind="warn" title="A strategy may inline a subtly different version">
        A <A href="/docs/api/strategy">strategy</A> can inline its own vol-expansion computation (e.g. to match a
        specific seeding); <Code>hawkes_vol_expansion</Code> here is the standalone, general-purpose form. They are
        close but not necessarily bit-identical — use this one for research, and expect a strategy to reproduce its
        own inlined gate.
      </Callout>

      <H2>Cross-sectional &amp; stat-arb</H2>

      <H3>rolling_beta</H3>
      <P>Causal rolling beta of <Code>y</Code> on <Code>mkt</Code> — cov/var over the trailing window. The market-exposure estimate behind the residual-momentum construction.</P>
      <CodeBlock code={`rolling_beta(y, mkt, win: int) -> np.ndarray`} />
      <Ul>
        <Li><Code>y</Code> — the asset return series.</Li>
        <Li><Code>mkt</Code> — the market/factor return series.</Li>
        <Li><Code>win</Code> — trailing window.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of rolling beta.</P>

      <H3>residualize</H3>
      <P>Strip the market factor: <Code>ret - beta*mkt</Code> using a causal rolling beta — the residual-momentum (market-neutral) construction. What is left is the idiosyncratic return the strategy actually trades.</P>
      <CodeBlock code={`residualize(ret, mkt, win: int) -> np.ndarray`} />
      <Ul>
        <Li><Code>ret</Code> — the asset return series.</Li>
        <Li><Code>mkt</Code> — the market return series to neutralise against.</Li>
        <Li><Code>win</Code> — the rolling-beta window.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a numpy array of market-neutral residual returns.</P>

      <H3>rolling_ols_hedge</H3>
      <P>Causal rolling OLS of <Code>y</Code> on <Code>x</Code> — the pairs / stat-arb hedge ratio (a lightweight Kalman substitute). Returns the intercept, slope, and the residual spread you actually trade.</P>
      <CodeBlock code={`rolling_ols_hedge(y, x, win: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]`} />
      <Ul>
        <Li><Code>y, x</Code> — the two legs of the pair.</Li>
        <Li><Code>win</Code> — the trailing OLS window.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a tuple <Code>(alpha, beta, residual_spread)</Code> of numpy arrays — feed the spread to <Code>zscore</Code> / <Code>half_life</Code>.</P>
      <CodeBlock code={`alpha, beta, spread = ind.rolling_ols_hedge(gold, silver, win=90)
z = lag(ind.zscore(spread, 60), 1)      # trade the spread's z-score`} />

      <H3>half_life</H3>
      <P>Ornstein-Uhlenbeck half-life of mean reversion via an AR(1) fit on the spread. A small half-life means fast reversion (a tradeable pair); it returns <Code>inf</Code> when the spread is non-reverting.</P>
      <CodeBlock code={`half_life(spread) -> float`} />
      <Ul>
        <Li><Code>spread</Code> — the residual spread series (e.g. from <Code>rolling_ols_hedge</Code>).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a <Code>float</Code> half-life in bars (<Code>inf</Code> if non-reverting).</P>
      <CodeBlock code={`hl = ind.half_life(spread)              # < ~60 bars = a live pair`} />

      <H3>cross_sectional_rank</H3>
      <P>Row-wise rank in [0,1] across assets (columns) — the cross-sectional momentum / reversal signal. Each row is one date, each column one instrument; the output ranks every asset against its peers on that date.</P>
      <CodeBlock code={`cross_sectional_rank(matrix: pd.DataFrame) -> pd.DataFrame`} />
      <Ul>
        <Li><Code>matrix</Code> — a <Code>DataFrame</Code> of a per-asset signal (rows = dates, columns = instruments).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a <Code>DataFrame</Code> of the same shape with values in [0,1] (percentile rank across columns per row).</P>
      <CodeBlock code={`ranks = ind.cross_sectional_rank(momentum_12m)   # 1.0 = strongest, 0.0 = weakest that date`} />

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/core">edgekit.core</A> — the <Code>lag</Code> primitive you must apply to every output here.</Li>
        <Li><A href="/docs/api/strategy">edgekit.strategy</A> — how a strategy wires these into <Code>prepare</Code>.</Li>
        <Li><A href="/docs/api/engine">edgekit.engine</A> — consumes the lagged indicator arrays bar by bar.</Li>
      </Ul>
    </>
  );
}
