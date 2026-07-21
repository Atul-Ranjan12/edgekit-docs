import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table, Code } from "@/components/prose";

export const metadata: Metadata = { title: "The OHLC contract" };

export default function OhlcPage() {
  return (
    <>
      <H1>The OHLC contract</H1>
      <Lead>
        Every module in edgekit agrees on one bar-frame shape. Fix that shape once — a UTC{" "}
        <Code>DatetimeIndex</Code>, float OHLC columns, monotone and de-duplicated — and every indicator, engine, and
        validator downstream can assume it without re-checking. This page is that contract and the data plumbing that
        enforces it.
      </Lead>

      <H2>The shape</H2>
      <P>A bar frame that edgekit will accept is:</P>
      <Ul>
        <Li>A <Code>pandas.DataFrame</Code> indexed by a <Code>DatetimeIndex</Code>.</Li>
        <Li>Timestamps that are <Strong>UTC and tz-naive by convention</Strong> — the frame carries no tzinfo, but every timestamp <em>means</em> UTC (matching the HistoryExporter CSVs the project uses).</Li>
        <Li>Float columns <Code>open</Code>, <Code>high</Code>, <Code>low</Code>, <Code>close</Code>; <Code>volume</Code> (or <Code>tick_volume</Code> from the loaders) optional.</Li>
        <Li>Sorted ascending in time with no duplicate timestamps.</Li>
      </Ul>
      <P>
        The single gate that normalises anything into this shape is{" "}
        <A href="/docs/api/core">as_ohlc</A>. It validates the required columns, checks the index type, sorts, and drops
        duplicate timestamps — but deliberately does <em>not</em> resample or fill, because inventing bars is the
        caller&apos;s decision, not a silent side effect:
      </P>
      <CodeBlock
        filename="core.py (excerpt)"
        code={`OHLC = ("open", "high", "low", "close")

def as_ohlc(df):
    """Validate and normalise a bar frame to the OHLC contract.
    Sorts the index, drops duplicate timestamps (keep first), checks columns.
    Does not resample or fill — that is the caller's decision."""
    missing = [c for c in OHLC if c not in df.columns]
    if missing:
        raise ValueError(f"bars missing required columns {missing}; have {list(df.columns)}")
    if not isinstance(df.index, pd.DatetimeIndex):
        raise TypeError(f"bars must have a DatetimeIndex, got {type(df.index).__name__}")
    out = df.sort_index()
    out = out[~out.index.duplicated(keep="first")]
    return out`}
      />
      <P>
        Both backtest engines call <Code>as_ohlc</Code> on entry, so the monotone-and-unique invariant every indicator
        assumes is guaranteed at the boundary, not hoped for.
      </P>

      <H2>Loading bars</H2>
      <P>
        <A href="/docs/api/data">load_bars</A> reads a HistoryExporter CSV
        (<Code>time_utc,open,high,low,close,tick_volume</Code>) or a processed parquet split. Its schema is stricter
        than the core contract — it requires <Code>tick_volume</Code>, because the source loaders and the downstream
        integrity/profile code consume it:
      </P>
      <CodeBlock
        filename="data.py (excerpt)"
        code={`REQUIRED_COLUMNS = ["open", "high", "low", "close", "tick_volume"]

def load_bars(path):
    if str(path).endswith(".parquet"):
        df = _read_parquet(path)                 # needs the optional pyarrow extra
    else:
        df = pd.read_csv(path, parse_dates=["time_utc"], index_col="time_utc")
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"{path}: missing columns {missing}")
    df = df.sort_index()
    df = df[~df.index.duplicated(keep="first")]
    return df`}
      />
      <CodeBlock
        filename="load.py"
        code={`import edgekit as ek

bars = ek.data.load_bars("BTCUSDT_5m.csv")   # tz-naive UTC index, float OHLC + tick_volume
bars = ek.as_ohlc(bars)                       # belt-and-braces: sorted, unique, validated`}
      />

      <H2>Resampling</H2>
      <P>
        Downsampling to a swing timeframe has exactly one correct aggregation: <Strong>first</Strong> open,{" "}
        <Strong>max</Strong> high, <Strong>min</Strong> low, <Strong>last</Strong> close, <Strong>sum</Strong> volume.
        Anything else — a mean close, say — fabricates prices that never traded. edgekit encodes this as{" "}
        <Code>OHLCV_AGG</Code> and exposes named timeframes through <Code>TIMEFRAME_RULES</Code>:
      </P>
      <CodeBlock
        filename="data.py (excerpt)"
        code={`OHLCV_AGG = {"open": "first", "high": "max", "low": "min", "close": "last",
             "tick_volume": "sum"}

TIMEFRAME_RULES = {"M15": "15min", "M30": "30min", "H1": "1h", "H4": "4h",
                   "D1": "1D", "W1": "W-FRI"}`}
      />
      <P>
        Two conventions in that table are load-bearing. The weekly bar is anchored on Friday (<Code>W-FRI</Code>) so a
        &quot;week&quot; closes at the Friday session end and keeps the weekend gap out of the bar body. And{" "}
        <A href="/docs/api/data">resample_ohlcv</A> defaults to <Code>label=&quot;left&quot;</Code> /{" "}
        <Code>closed=&quot;left&quot;</Code> — each bar is stamped with the timestamp of its <em>open</em> and includes
        the left edge. That is the <A href="/docs/concepts/causality">causal</A> convention: a strategy acting at a
        bar&apos;s timestamp only ever sees bars that have already closed.
      </P>
      <CodeBlock
        filename="resample.py"
        code={`import edgekit as ek

m5 = ek.data.load_bars("BTCUSDT_5m.csv")
h4 = ek.data.resample_ohlcv(m5, "H4")          # named rule -> "4h", causal left-labelled

# empty weekend buckets are dropped by requiring positive volume on D1/W1
weekly = ek.data.resample_ohlcv(m5, "W1")      # Friday-anchored weekly bars`}
      />
      <Callout kind="warn" title="Why left-closed matters">
        With <Code>closed=&quot;right&quot;</Code>/<Code>label=&quot;right&quot;</Code>, a bar timestamped 12:00 would
        <em>include</em> the 12:00 print — information from the future relative to a decision made &quot;at 12:00.&quot;
        The left convention makes the resampled frame safe to feed straight into a causal loop.
      </Callout>

      <H2>Sessions</H2>
      <P>
        Intraday work needs session masks, and the one rule that cost the research project real money is:{" "}
        <Strong>never anchor a session on a fixed UTC hour.</Strong> The US cash open drifts an hour twice a year with
        daylight saving. edgekit converts through <Code>zoneinfo</Code> so 09:30 is always 09:30 in New York:
      </P>
      <CodeBlock
        filename="sessions.py"
        code={`import edgekit as ek

bars = ek.data.load_bars("US100_M1.csv")

ny = ek.data.to_ny(bars.index)                       # DST-correct America/New_York clock
mask = ek.data.rth_mask(bars.index,                  # regular trading hours 09:30–16:00 NY
                        start="09:30", end="16:00")
rth = bars[mask]                                     # cash-session bars only`}
      />
      <P>
        <A href="/docs/api/data">rth_mask</A> is left-inclusive / right-exclusive (<Code>start ≤ t &lt; end</Code>), so
        the 16:00 close bar is excluded — matching the ORB and volume-profile session idiom — and it handles
        overnight windows (e.g. a Sydney session where <Code>start &gt; end</Code>) by OR-ing the wrap-around. All of
        it is built on <Code>minute_of_day</Code>, which reads the wall clock in the target timezone rather than a
        fixed offset.
      </P>

      <H2>Integrity</H2>
      <P>
        Before trusting a file, ask what it actually is. <A href="/docs/api/data">integrity_report</A> describes the
        span, classifies gaps, and flags suspect bars — crucially separating <em>weekend</em> gaps (normal for FX:
        Friday → Sunday/Monday) from <em>intraweek</em> gaps, which mean missing data:
      </P>
      <CodeBlock
        filename="integrity.py"
        code={`import edgekit as ek

rep = ek.data.integrity_report(bars, bar_minutes=5)
print(rep["bars"], rep["span_days"])
print(rep["weekend_gaps"], rep["intraweek_gaps"])          # normal vs. suspicious
print(rep["intraweek_gap_bars_missing"])                    # how many bars are actually absent
print(rep["bad_ohlc_bars"])                                 # high<low, high<open, etc.
print(rep["spike_bars_range_gt_20x_median"])                # candidate bad ticks`}
      />
      <Table
        head={["Report key", "Meaning"]}
        rows={[
          [<Code key="a">weekend_gaps</Code>, "Friday→Sunday/Monday steps — normal for FX, counted separately"],
          [<Code key="b">intraweek_gaps</Code>, "Gaps inside the trading week — missing data, investigate"],
          [<Code key="c">bad_ohlc_bars</Code>, "Bars violating high≥open,close,low (impossible candles)"],
          [<Code key="d">zero_range_bars</Code>, "Bars with high == low (often illiquid or stale)"],
          [<Code key="e">spike_bars_range_gt_20x_median</Code>, "Range > 20× median — candidate bad ticks"],
        ]}
      />

      <H3>Sealing the holdout</H3>
      <P>
        The data layer also owns the discipline that keeps validation honest.{" "}
        <A href="/docs/api/data">chronological_split</A> carves the frame into train / validation / holdout by{" "}
        <em>position</em> (never by shuffling), so the arrow of time is preserved and the holdout is a contiguous
        final slice you read exactly once, at the very end:
      </P>
      <CodeBlock
        filename="split.py"
        code={`import edgekit as ek

sp = ek.data.chronological_split(bars, train=0.6, val=0.2)
# sp.train, sp.val, sp.holdout — the last 20% is sealed; tuning on it is forbidden`}
      />

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/data">edgekit.data</A> — <Code>load_bars</Code>, <Code>resample_ohlcv</Code>, sessions, integrity, splits, fetch, cache.</Li>
        <Li><A href="/docs/api/core">edgekit.core</A> — <Code>as_ohlc</Code> and the contract every module agrees on.</Li>
        <Li><A href="/docs/concepts/causality">Causality</A> — why the resample defaults are left-closed.</Li>
      </Ul>
    </>
  );
}
