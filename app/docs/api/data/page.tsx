import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.data" };

export default function DataPage() {
  return (
    <>
      <H1>edgekit.data</H1>
      <Lead>
        The data / preprocessing plumbing that feeds the causal engine: load bars, resample to swing timeframes, mark
        DST-correct sessions, split chronologically, fetch from Binance, and cache. It never looks at strategy signals —
        only at the raw bar frame.
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> The loader (<Code>load_bars</Code>) and resampler
        (<Code>resample_ohlcv</Code>) get raw ticks into the causal OHLC shape. A session toolkit
        (<Code>to_tz</Code>, <Code>to_ny</Code>, <Code>minute_of_day</Code>, <Code>rth_mask</Code>) marks
        regular-trading-hours bars the DST-correct way. <Code>integrity_report</Code> tells you what the data actually is
        before you trust it; <Code>stitch</Code> joins epochs; <Code>chronological_split</Code> (returning a{" "}
        <Code>Split</Code> namedtuple) seals a holdout. <Code>fetch_binance_klines</Code> pulls crypto history over
        stdlib HTTP, and <Code>hashed_parquet_cache</Code> memoizes expensive builds. Two rules are enforced throughout:{" "}
        <Strong>holdout is sealed</Strong> (read once, at the very end) and <Strong>sessions are DST-correct</Strong>{" "}
        (anchored via <Code>zoneinfo</Code>, never a fixed UTC hour).
      </P>

      <Callout kind="note" title="Dependencies">
        Core paths need only numpy + pandas. Parquet I/O (<Code>load_bars</Code> on a <Code>.parquet</Code> path,{" "}
        <Code>hashed_parquet_cache</Code>) needs the optional <Code>pyarrow</Code> extra — a missing install raises a
        pointed <Code>ImportError</Code> telling you to <Code>pip install pyarrow</Code>, not an opaque one.
      </Callout>

      <H2>Loading &amp; resampling</H2>

      <H3>load_bars</H3>
      <P>
        Load bars from a HistoryExporter CSV (<Code>time_utc,open,high,low,close,tick_volume</Code>) or a processed{" "}
        <Code>.parquet</Code> split. It validates the schema, sorts the index, and drops duplicate timestamps (keep
        first) so the frame is monotone and unique — the invariant every indicator and the engine assume.
      </P>
      <CodeBlock code={`load_bars(path: str | Path) -> pd.DataFrame`} />
      <Ul>
        <Li><Code>path</Code> — a <Code>.csv</Code> (HistoryExporter format) or <Code>.parquet</Code> path.</Li>
      </Ul>
      <P>
        <Strong>Returns:</Strong> an OHLCV <Code>DataFrame</Code> indexed by <Code>time_utc</Code> with columns{" "}
        <Code>open, high, low, close, tick_volume</Code>. Raises <Code>ValueError</Code> on missing columns and a helpful{" "}
        <Code>ImportError</Code> if a parquet path is read without <Code>pyarrow</Code>.
      </P>
      <CodeBlock
        filename="load.py"
        code={`from edgekit import data
bars = data.load_bars("BTCUSDT_5m.csv")
bars.head()      # DatetimeIndex(time_utc) -> open/high/low/close/tick_volume`}
      />

      <H3>resample_ohlcv</H3>
      <P>
        Downsample OHLCV bars to a coarser <Code>rule</Code> — either a <Code>TIMEFRAME_RULES</Code> key like{" "}
        <Code>&quot;H4&quot;</Code> or a raw pandas offset alias like <Code>&quot;4h&quot;</Code>. The aggregation is the
        only correct one: first open, max high, min low, last close, summed volume. Empty daily/weekly weekend buckets
        are dropped (positive-volume requirement).
      </P>
      <CodeBlock code={`resample_ohlcv(df, rule: str, label: str = "left", closed: str = "left") -> pd.DataFrame`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">df</Code>, "pd.DataFrame", "—", "A finer OHLCV bar frame."],
          [<Code key="b">rule</Code>, "str", "—", "A TIMEFRAME_RULES key (\"M15\",\"H4\",\"D1\",\"W1\"…) or a raw pandas offset alias."],
          [<Code key="c">label</Code>, "str", '"left"', "Which edge stamps the bucket; \"left\" = the OPEN timestamp."],
          [<Code key="d">closed</Code>, "str", '"left"', "Which edge is inclusive; \"left\" includes the left edge."],
        ]}
      />
      <P><Strong>Returns:</Strong> the resampled OHLCV <Code>DataFrame</Code>.</P>
      <CodeBlock
        code={`h4 = data.resample_ohlcv(bars, "H4")   # first open, max high, min low, last close, summed vol`}
      />
      <Callout kind="warn" title="Why label='left' / closed='left' is the causal default">
        Stamping each bar with the timestamp of its <em>open</em> and including the left edge means a strategy acting at
        a bar&apos;s timestamp only sees bars that have already <em>closed</em>. Flip to right-labelling and a bar carries
        the timestamp of a candle that hasn&apos;t finished forming — silent look-ahead. Keep the defaults unless you
        know exactly why you are changing them.
      </Callout>

      <H2>Sessions (DST-correct)</H2>

      <H3>to_tz, to_ny</H3>
      <P>
        Convert a bar index to timezone <Code>tz</Code> (<Code>to_ny</Code> is the America/New_York shortcut). tz-naive
        input is assumed UTC (the OHLC contract) and localized before conversion — the DST-correct way to reason about
        session boundaries.
      </P>
      <CodeBlock code={`to_tz(index, tz: str) -> pd.DatetimeIndex
to_ny(index) -> pd.DatetimeIndex`} />
      <Ul>
        <Li><Code>index</Code> — a bar index (tz-naive UTC or already tz-aware).</Li>
        <Li><Code>tz</Code> — an IANA timezone name, e.g. <Code>&quot;America/New_York&quot;</Code>, <Code>&quot;Europe/London&quot;</Code>.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> a tz-aware <Code>pd.DatetimeIndex</Code> in the target zone.</P>
      <CodeBlock code={`ny = data.to_ny(bars.index)          # US cash-session clock
lon = data.to_tz(bars.index, "Europe/London")`} />

      <H3>minute_of_day</H3>
      <P>
        Minutes since local midnight (<Code>hour*60 + minute</Code>) in timezone <Code>tz</Code> — the primitive behind
        every session mask. DST-correct because it reads the wall clock in <Code>tz</Code>, not a fixed UTC offset.
      </P>
      <CodeBlock code={`minute_of_day(index, tz: str = "America/New_York") -> np.ndarray`} />
      <Ul>
        <Li><Code>index</Code> — a bar index.</Li>
        <Li><Code>tz</Code> — the timezone to read the wall clock in (default America/New_York).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> an integer <Code>np.ndarray</Code> of minutes-since-local-midnight (0–1439).</P>

      <H3>rth_mask</H3>
      <P>
        Boolean mask selecting regular-trading-hours bars (default US cash 09:30–16:00 NY). Left-inclusive,
        right-exclusive (<Code>{"start <= t < end"}</Code>), so the 16:00 close bar is excluded. Overnight windows
        (<Code>{"start > end"}</Code>, e.g. a Sydney session) are handled by OR-ing the wrap-around past midnight.
      </P>
      <CodeBlock code={`rth_mask(index, start: str = "09:30", end: str = "16:00",
         tz: str = "America/New_York") -> np.ndarray`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">index</Code>, "DatetimeIndex", "—", "The bar index to mask."],
          [<Code key="b">start</Code>, "str", '"09:30"', 'Session open as "HH:MM" local wall clock.'],
          [<Code key="c">end</Code>, "str", '"16:00"', "Session close (exclusive)."],
          [<Code key="d">tz</Code>, "str", '"America/New_York"', "Timezone the start/end are expressed in."],
        ]}
      />
      <P><Strong>Returns:</Strong> a boolean <Code>np.ndarray</Code> aligned to <Code>index</Code>.</P>
      <CodeBlock code={`mask = data.rth_mask(bars.index)       # 09:30 NY in, 16:00 NY out
session = bars[mask]                    # regular-trading-hours bars only`} />

      <H2>Inspection &amp; assembly</H2>

      <H3>integrity_report</H3>
      <P>
        Describe what the data actually <em>is</em> before you trust it: span, gaps, and suspect bars. A gap is a step
        larger than one bar interval; Friday→Sunday/Monday weekend gaps (normal for FX) are counted separately from
        intraweek gaps (which indicate missing data).
      </P>
      <CodeBlock code={`integrity_report(df: pd.DataFrame, bar_minutes: int) -> dict`} />
      <Ul>
        <Li><Code>df</Code> — the bar frame to inspect.</Li>
        <Li><Code>bar_minutes</Code> — the nominal bar interval in minutes (5 for M5, 240 for H4), used to size the gap threshold.</Li>
      </Ul>
      <P>
        <Strong>Returns</Strong> a dict with keys: <Code>bars</Code>, <Code>start</Code>, <Code>end</Code>,{" "}
        <Code>bar_minutes</Code>, <Code>span_days</Code>, <Code>zero_range_bars</Code>, <Code>weekend_gaps</Code>,{" "}
        <Code>intraweek_gaps</Code>, <Code>intraweek_gap_bars_missing</Code>, <Code>largest_intraweek_gaps</Code>{" "}
        (a list of <Code>{"{at, gap}"}</Code>), <Code>median_range_pips</Code>,{" "}
        <Code>spike_bars_range_gt_20x_median</Code>, and <Code>bad_ohlc_bars</Code>.
      </P>
      <CodeBlock code={`rep = data.integrity_report(bars, bar_minutes=5)
print(rep["intraweek_gaps"], rep["weekend_gaps"], rep["bad_ohlc_bars"])`} />

      <H3>stitch</H3>
      <P>
        Concatenate bar frames from multiple epochs (e.g. two export dumps) into one series, deduplicating overlapping
        timestamps (keep first) and sorting. Returns an empty frame if all inputs are empty or <Code>None</Code>.
      </P>
      <CodeBlock code={`stitch(frames: list[pd.DataFrame]) -> pd.DataFrame`} />
      <Ul>
        <Li><Code>frames</Code> — a list of bar frames to combine (empties / <Code>None</Code> are skipped).</Li>
      </Ul>
      <P><Strong>Returns:</Strong> one sorted, deduplicated <Code>DataFrame</Code>.</P>
      <Callout kind="warn" title="A stitch does not fill gaps">
        A real time gap between epochs <em>survives</em> the stitch — the frame is continuous in index only, not in
        clock time. Do not run one continuous backtest across a stitched seam or the engine will treat the jump as a
        single (enormous) bar-to-bar move.
      </Callout>

      <H3>Split &amp; chronological_split</H3>
      <P>
        Split a frame into train / validation / holdout by <em>row-count fractions</em>. Splitting by position (not by
        shuffling) preserves the arrow of time, so a validation bar never precedes a training bar. The result is a{" "}
        <Code>Split</Code> namedtuple.
      </P>
      <CodeBlock code={`class Split(NamedTuple):
    train: pd.DataFrame
    val: pd.DataFrame
    holdout: pd.DataFrame

chronological_split(df, train: float = 0.6, val: float = 0.2) -> Split`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">df</Code>, "pd.DataFrame", "—", "The frame to split chronologically."],
          [<Code key="b">train</Code>, "float", "0.6", "Fraction of rows in the training slice."],
          [<Code key="c">val</Code>, "float", "0.2", "Fraction in validation; holdout is the remaining 1 − train − val."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a <Code>Split(train, val, holdout)</Code> namedtuple of contiguous, non-overlapping
        slices.
      </P>
      <CodeBlock code={`sp = data.chronological_split(bars, train=0.6, val=0.2)
model.fit(sp.train)          # tune on sp.val; NEVER touch sp.holdout until the very end`} />
      <Callout kind="danger" title="Holdout is sealed">
        <Code>sp.holdout</Code> is the last slice — the set you read <em>once</em>, at the very end, to get one honest
        out-of-sample number. Tuning any parameter against it silently launders the holdout into training data and the
        &ldquo;out-of-sample&rdquo; result becomes a lie. This rule cost the research project real money; edgekit names
        the slice <Code>holdout</Code> to make breaking it feel wrong.
      </Callout>

      <H2>Fetching data (open sources)</H2>
      <P>
        Four keyless fetchers pull OHLC history over stdlib HTTP — Binance and Coinbase (crypto), Stooq (equities,
        indices, FX, commodities EOD), and Yahoo (best-effort everything) — plus a <Code>fetch</Code> dispatcher that
        routes to any of them by name. Every one returns the <em>same</em> contract: a frame indexed by{" "}
        <Code>time_utc</Code> (tz-naive UTC) with float <Code>open, high, low, close, volume</Code>, sorted and
        de-duplicated. Parsing is factored into pure private helpers (<Code>_parse_stooq_csv</Code>,{" "}
        <Code>_parse_coinbase_rows</Code>, <Code>_parse_yahoo_json</Code>, <Code>_parse_binance_rows</Code>) so the wire
        formats are unit-tested offline; a shared <Code>_http_get</Code> (SSL-unverified context + retry/backoff) is the
        only thing that touches the network.
      </P>
      <Callout kind="note" title="No API key, ever">
        All four sources are public, read-only endpoints reached with stdlib <Code>urllib</Code> only — no{" "}
        <Code>requests</Code>, no key, no account. Yahoo is <Strong>best-effort</Strong>: the chart endpoint is
        undocumented and can be rate-limited or blocked outright (HTTP 401/429), and its intraday history is range-capped.
        Prefer Stooq for reliable EOD equity/index/FX data.
      </Callout>

      <H3>fetch</H3>
      <P>
        One entry point over all sources. Routes to the right fetcher by <Code>source</Code> (one of{" "}
        <Code>SOURCES</Code>), maps the common <Code>interval</Code> to each source&apos;s native form where sensible
        (e.g. <Code>&quot;1d&quot;</Code> → Stooq <Code>&quot;d&quot;</Code> / Coinbase <Code>86400</Code> seconds), and
        — if <Code>out</Code> is given — also writes a <Code>time_utc,open,high,low,close,volume</Code> CSV.
      </P>
      <CodeBlock code={`fetch(source: str, symbol: str, interval: str = "1d",
      start=None, end=None, out: str | Path | None = None) -> pd.DataFrame`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">source</Code>, "str", "—", 'One of "binance", "coinbase", "stooq", "yahoo".'],
          [<Code key="b">symbol</Code>, "str", "—", "The source-native symbol (see each fetcher below)."],
          [<Code key="c">interval</Code>, "str", '"1d"', 'Common interval ("1d","1w","1mo","1h","5m"…); mapped per source.'],
          [<Code key="d">start</Code>, "datetime | str | int | None", "None", "Lower time bound (source-dependent handling)."],
          [<Code key="e">end</Code>, "datetime | str | int | None", "None", "Upper time bound; defaults to now where supported."],
          [<Code key="f">out</Code>, "str | Path | None", "None", "If given, also writes an OHLCV CSV to this path."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a frame indexed by <Code>time_utc</Code> with{" "}
        <Code>open, high, low, close, volume</Code> (all float). Raises <Code>ValueError</Code> for an unknown{" "}
        <Code>source</Code>.
      </P>
      <CodeBlock
        filename="fetch.py"
        code={`from edgekit import data
spy = data.fetch("stooq", "spy.us", "1d", start="2015-01-01")   # keyless EOD equities
btc = data.fetch("coinbase", "BTC-USD", "1d", start="2020-01-01")
eth = data.fetch("binance", "ETHUSDT", "4h", start="2021-01-01", out="ETHUSDT_4h.csv")
qqq = data.fetch("yahoo", "QQQ", "1d")                          # best-effort`}
      />

      <H3>fetch_binance_klines</H3>
      <P>
        Download klines from the Binance public REST API straight into the loader format. It paginates forward from{" "}
        <Code>start</Code> in 1000-bar pages, retrying on transient errors, until it reaches roughly now; dedups by open
        time and sorts. Stdlib <Code>urllib</Code> only — no <Code>requests</Code>, no API key. This one keeps the
        HistoryExporter column name <Code>tick_volume</Code> (holding the Binance base-asset volume) so its CSV round-trips
        through <Code>load_bars</Code>.
      </P>
      <CodeBlock code={`fetch_binance_klines(symbol: str, interval: str, start,
                     out: str | Path | None = None) -> pd.DataFrame`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">symbol</Code>, "str", "—", 'Binance pair, e.g. "BTCUSDT".'],
          [<Code key="b">interval</Code>, "str", "—", "Kline interval — one of 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w."],
          [<Code key="c">start</Code>, "datetime | str | int", "—", "Start point: a datetime, a parseable string, or UTC epoch-ms."],
          [<Code key="d">out</Code>, "str | Path | None", "None", "If given, also writes a HistoryExporter-style CSV to this path."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a frame indexed by <Code>time_utc</Code> with{" "}
        <Code>open, high, low, close, tick_volume</Code>. Raises <Code>ValueError</Code> on an unsupported{" "}
        <Code>interval</Code>.
      </P>
      <CodeBlock code={`btc = data.fetch_binance_klines("BTCUSDT", "5m", "2018-01-01", out="BTCUSDT_5m.csv")
h4 = data.resample_ohlcv(btc, "H4")     # ready for a swing strategy`} />

      <H3>fetch_stooq</H3>
      <P>
        Fetch daily/weekly/monthly OHLC history from Stooq&apos;s keyless CSV endpoint — the most reliable open source
        for equity, index, FX, and commodity end-of-day data.
      </P>
      <CodeBlock code={`fetch_stooq(symbol: str, interval: str = "d", start=None, end=None) -> pd.DataFrame`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">symbol</Code>, "str", "—", 'Stooq symbol (see conventions below).'],
          [<Code key="b">interval</Code>, "str", '"d"', 'Bar size: "d" daily, "w" weekly, "m" monthly.'],
          [<Code key="c">start</Code>, "date | str | None", "None", "Lower bound; sent as d1=YYYYMMDD."],
          [<Code key="d">end</Code>, "date | str | None", "None", "Upper bound; sent as d2=YYYYMMDD."],
        ]}
      />
      <P>
        <Strong>Symbol conventions.</Strong> US equities/ETFs are suffixed <Code>.us</Code> (<Code>&quot;aapl.us&quot;</Code>,{" "}
        <Code>&quot;spy.us&quot;</Code>); indices are <Code>^</Code>-prefixed (<Code>&quot;^spx&quot;</Code>,{" "}
        <Code>&quot;^ndq&quot;</Code>, <Code>&quot;^dji&quot;</Code>); FX pairs are concatenated codes
        (<Code>&quot;eurusd&quot;</Code>, <Code>&quot;gbpusd&quot;</Code>); commodities like <Code>&quot;xauusd&quot;</Code>.
        A symbol with no volume column (FX) comes back with <Code>volume</Code> = 0.
      </P>
      <CodeBlock code={`spx = data.fetch_stooq("^spx", "d", start="2010-01-01")
eur = data.fetch_stooq("eurusd", "d")   # FX: volume column is 0`} />

      <H3>fetch_coinbase</H3>
      <P>
        Fetch candles from the Coinbase Exchange public API. <Code>granularity</Code> is in <em>seconds</em> (Coinbase
        supports 60 / 300 / 900 / 3600 / 21600 / 86400). The endpoint caps each request at ~300 candles, so when{" "}
        <Code>start</Code> is given this paginates forward in 300-candle windows to <Code>end</Code> (default now) and
        stitches; with no <Code>start</Code> it returns the single most-recent page.
      </P>
      <CodeBlock code={`fetch_coinbase(product: str = "BTC-USD", granularity: int = 86400,
               start=None, end=None) -> pd.DataFrame`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">product</Code>, "str", '"BTC-USD"', 'Coinbase product id, e.g. "BTC-USD", "ETH-USD".'],
          [<Code key="b">granularity</Code>, "int", "86400", "Candle size in SECONDS (60/300/900/3600/21600/86400)."],
          [<Code key="c">start</Code>, "date | str | None", "None", "Lower bound; enables pagination when set."],
          [<Code key="d">end</Code>, "date | str | None", "None", "Upper bound; defaults to now."],
        ]}
      />
      <Callout kind="note" title="Coinbase row order is not OHLC">
        A Coinbase candle row is <Code>[time, low, high, open, close, volume]</Code> — low/high before open/close.{" "}
        <Code>_parse_coinbase_rows</Code> remaps it to the contract for you; the note matters only if you call the API
        directly.
      </Callout>
      <CodeBlock code={`btc = data.fetch_coinbase("BTC-USD", 86400, start="2020-01-01")   # daily
h1  = data.fetch_coinbase("ETH-USD", 3600, start="2024-01-01")   # hourly`} />

      <H3>fetch_yahoo</H3>
      <P>
        Fetch OHLC history from Yahoo Finance&apos;s chart JSON endpoint. Reads <Code>result.timestamp</Code> and{" "}
        <Code>result.indicators.quote[0]</Code>; candles Yahoo pads with nulls (holidays/half-days) are dropped.{" "}
        <Strong>Best-effort only</Strong> — undocumented, can be rate-limited or blocked; prefer Stooq for EOD.
      </P>
      <CodeBlock code={`fetch_yahoo(symbol: str, interval: str = "1d", start=None, end=None) -> pd.DataFrame`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">symbol</Code>, "str", "—", 'Yahoo ticker: "AAPL", "SPY", "^GSPC", "EURUSD=X", "BTC-USD".'],
          [<Code key="b">interval</Code>, "str", '"1d"', 'Yahoo interval: "1d","1wk","1mo","1h","5m"…'],
          [<Code key="c">start</Code>, "datetime | str | int | None", "None", "period1 (epoch-sec); default full history."],
          [<Code key="d">end</Code>, "datetime | str | int | None", "None", "period2 (epoch-sec); default now."],
        ]}
      />
      <CodeBlock code={`spy = data.fetch_yahoo("SPY", "1d", start="2015-01-01")   # best-effort; may 401`} />

      <H3>hashed_parquet_cache</H3>
      <P>
        Memoize an expensive DataFrame build to a content-keyed parquet file. The filename is a hash of{" "}
        <Code>key_parts</Code> (any JSON-able values — file stamps, config dicts, param tuples); if it already exists it
        is read, otherwise <Code>builder()</Code> runs and its result is written. Change any key part and you get a fresh
        build — no stale-cache bug from mutating inputs under a fixed name.
      </P>
      <CodeBlock code={`hashed_parquet_cache(key_parts, builder: Callable[[], pd.DataFrame],
                     cache_dir: str | Path) -> pd.DataFrame`} />
      <Table
        head={["Param", "Type", "Meaning"]}
        rows={[
          [<Code key="a">key_parts</Code>, "JSON-able", "Anything that identifies this build; hashed into the filename."],
          [<Code key="b">builder</Code>, "Callable[[], DataFrame]", "Zero-arg builder run only on a cache miss."],
          [<Code key="c">cache_dir</Code>, "str | Path", "Directory the parquet cache lives in (created if absent)."],
        ]}
      />
      <P><Strong>Returns:</Strong> the built (or cached) <Code>DataFrame</Code>. Needs <Code>pyarrow</Code>.</P>
      <CodeBlock code={`df = data.hashed_parquet_cache(
    ["BTCUSDT", 5, {"tf": "H4"}],
    lambda: data.resample_ohlcv(data.load_bars("BTCUSDT_5m.csv"), "H4"),
    "cache/",
)`} />

      <H2>Module constants</H2>
      <Ul>
        <Li><Code>REQUIRED_COLUMNS = [&quot;open&quot;,&quot;high&quot;,&quot;low&quot;,&quot;close&quot;,&quot;tick_volume&quot;]</Code> — the loader schema.</Li>
        <Li><Code>OHLCV_AGG</Code> — the resample aggregation <Code>{"{open:first, high:max, low:min, close:last, tick_volume:sum}"}</Code>.</Li>
        <Li><Code>TIMEFRAME_RULES</Code> — <Code>{'{"M15":"15min","M30":"30min","H1":"1h","H4":"4h","D1":"1D","W1":"W-FRI"}'}</Code> (weekly anchored on Friday).</Li>
      </Ul>

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/core">edgekit.core</A> — the OHLC contract these frames must satisfy.</Li>
        <Li><A href="/docs/api/strategy">edgekit.strategy</A> — consumes the resampled swing-timeframe bars.</Li>
        <Li><A href="/docs/api/validation">edgekit.validation</A> — where the sealed holdout is finally read.</Li>
      </Ul>
    </>
  );
}
