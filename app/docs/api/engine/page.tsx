import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.engine" };

export default function EnginePage() {
  return (
    <>
      <H1>edgekit.engine</H1>
      <Lead>
        Two backtest engines, both obeying the no-look-ahead contract: a strategy sees bars up to and including the
        closed bar <Code>i</Code>, and fills happen at the OPEN of the next bar (or gap-aware at bar <Code>i</Code>). One
        engine is the research workhorse; the other is the fixed-RR prop-firm simulator.
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> The research path is <Code>run_bar_loop</Code>, driven by a{" "}
        <Code>Strategy</Code> (a runtime-checkable <Code>Protocol</Code>) that emits an <Code>EntryIntent</Code>; it
        prices trades in R and returns the canonical trade frame. The two fill helpers it uses —{" "}
        <Code>fill_entry</Code> and <Code>fill_stop</Code> — are exposed for reuse. The prop-firm path is{" "}
        <Code>run_backtest</Code>, configured by an <Code>EngineConfig</Code> and returning a <Code>BacktestResult</Code>:
        fixed reward:risk brackets, next-open fills, an EOD flatten, a daily-loss cap, and an overall equity-floor
        circuit breaker.
      </P>

      <Callout kind="note" title="Two engines, two jobs">
        <P>
          <Strong><Code>run_bar_loop</Code></Strong> — one position at a time, gap-aware fills, pessimistic stops,
          trailing-channel exits, cost charged in R. This is what the ORB / Keltner / breakout research uses and what the{" "}
          <A href="/docs/api/validation">gauntlet</A> consumes.
        </P>
        <P>
          <Strong><Code>run_backtest</Code></Strong> — fixed reward:risk brackets under FTMO / BrightFunded account rules
          (EOD flatten, daily-loss cap, overall circuit breaker). Priced in pips and dollars for a real account.
        </P>
      </Callout>

      <H2>The research engine</H2>

      <H3>EntryIntent</H3>
      <P>
        A strategy&apos;s entry decision on bar <Code>i</Code>. <Code>direction</Code> is +1 / −1; <Code>level</Code> is
        the trigger price; <Code>stop_dist</Code> is the stop distance in price units — the R denominator. The engine
        fills gap-aware at <Code>max(level, open)</Code> for longs, so a gap-through fills at the open, never the stale
        level.
      </P>
      <CodeBlock code={`EntryIntent(direction: int, level: float, stop_dist: float)`} />
      <Table
        head={["Field", "Type", "Meaning"]}
        rows={[
          [<Code key="a">direction</Code>, "int", "+1 long, −1 short."],
          [<Code key="b">level</Code>, "float", "The trigger price (e.g. the breakout level)."],
          [<Code key="c">stop_dist</Code>, "float", "Stop distance in price units — becomes the R denominator."],
        ]}
      />

      <H3>Strategy (Protocol)</H3>
      <P>
        The research-strategy interface consumed by <Code>run_bar_loop</Code> — a runtime-checkable{" "}
        <Code>Protocol</Code>. <Code>prepare</Code> precomputes indicator arrays once (the <Code>P</Code> dict);{" "}
        <Code>entry</Code> returns an <Code>EntryIntent</Code> or <Code>None</Code> when flat; <Code>exit</Code> returns
        an exit price or <Code>None</Code> while in a position. Concrete implementations live in{" "}
        <A href="/docs/api/strategy">edgekit.strategy</A>.
      </P>
      <CodeBlock code={`class Strategy(Protocol):
    name: str
    def prepare(self, bars) -> dict: ...
    def entry(self, bars, P: dict, i: int) -> EntryIntent | None: ...
    def exit(self, bars, P: dict, pos: dict, i: int) -> float | None: ...`} />
      <Ul>
        <Li><Code>name</Code> — a label carried onto every trade&apos;s <Code>tag</Code>.</Li>
        <Li><Code>prepare(bars)</Code> — precompute causal (lagged) indicator arrays once; return them as the <Code>P</Code> dict.</Li>
        <Li><Code>entry(bars, P, i)</Code> — called on a flat bar <Code>i</Code>; return an <Code>EntryIntent</Code> or <Code>None</Code>.</Li>
        <Li><Code>exit(bars, P, pos, i)</Code> — called while in position <Code>pos</Code>; return an exit price or <Code>None</Code>.</Li>
      </Ul>
      <Callout kind="warn" title="Lag inside prepare, not entry/exit">
        Because <Code>entry</Code>/<Code>exit</Code> run on bar <Code>i</Code>, any indicator they read must already have
        been lagged in <Code>prepare</Code> (via <A href="/docs/api/core">edgekit.core.lag</A>). If <Code>P</Code> holds
        unlagged arrays, bar <Code>i</Code> reads its own completed value and the backtest peeks at the future.
      </Callout>

      <H3>run_bar_loop</H3>
      <P>
        The research workhorse. Run a <Code>Strategy</Code> bar-by-bar, one position at a time, with gap-aware fills,
        pessimistic stops, and cost charged in R. <Code>bars_per_day</Code> converts hold-in-bars to days for the swap
        cost (H4 = 6/day).
      </P>
      <CodeBlock code={`run_bar_loop(bars, strategy: Strategy, cost: CostModel | None = None,
             warmup: int = 210, bars_per_day: float = 6.0) -> pd.DataFrame`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">bars</Code>, "pd.DataFrame", "—", "The OHLC frame (validated via as_ohlc internally)."],
          [<Code key="b">strategy</Code>, "Strategy", "—", "Anything satisfying the Strategy protocol."],
          [<Code key="c">cost</Code>, "CostModel | None", "None", "Fraction-of-price cost model; None → the default CostModel."],
          [<Code key="d">warmup</Code>, "int", "210", "Bars skipped before trading (indicator warmup)."],
          [<Code key="e">bars_per_day</Code>, "float", "6.0", "Bars per day, converting holds to days for swap cost (H4 = 6)."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> the canonical trade DataFrame (from <A href="/docs/api/core">trades_to_frame</A>) — one
        row per closed trade with net R in <Code>r</Code>, exit date in <Code>date</Code>, plus <Code>dir</Code> and{" "}
        <Code>bars_held</Code>.
      </P>
      <CodeBlock
        filename="run_bar_loop.py"
        code={`from edgekit.engine import run_bar_loop
from edgekit.strategy import ORB

trades = run_bar_loop(rth, ORB(or_bars=30, target_r=2.0), warmup=5, bars_per_day=390)
print(trades["r"].sum(), len(trades))   # total R (net-negative), trade count`}
      />

      <H3>fill_entry, fill_stop</H3>
      <P>
        The two fill helpers the loop uses internally, exposed for reuse. <Code>fill_entry</Code> is the gap-aware entry
        fill (a long gapping up fills at the open, not the stale level); <Code>fill_stop</Code> is the pessimistic stop
        fill (a gap-through fills at the worse of stop / open).
      </P>
      <CodeBlock code={`fill_entry(level: float, open_price: float, direction: int) -> float
fill_stop(stop: float, open_price: float, direction: int) -> float`} />
      <Ul>
        <Li><Code>level</Code> / <Code>stop</Code> — the intended entry trigger / stop price.</Li>
        <Li><Code>open_price</Code> — the actual bar open being filled against.</Li>
        <Li><Code>direction</Code> — +1 / −1.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> the actual (pessimistic, gap-aware) fill price as a <Code>float</Code>.</P>
      <Callout kind="warn" title="Pessimism is the point">
        These helpers always resolve ambiguity <em>against</em> you: a gap through a long entry fills at the higher open,
        a gap through a stop fills at the worse of stop/open. An optimistic fill is how a backtest quietly manufactures
        edge that evaporates live.
      </Callout>

      <H2>The prop-firm engine</H2>

      <H3>EngineConfig</H3>
      <P>
        Config for the fixed-RR prop-firm engine. <Code>rr</Code> sets <Code>TP distance = rr * stop distance</Code>;
        the loss caps and EOD hour encode the account rules. The property <Code>pip_usd</Code> equals{" "}
        <Code>cost.pip_value_per_lot * lots</Code>.
      </P>
      <CodeBlock code={`EngineConfig(cost: PipCostModel = PipCostModel(), lots: float = 1.0, rr: float = 3.0,
             min_stop_pips: float = 3.0, max_stop_pips: float = 40.0,
             account_size: float = 100_000.0, daily_loss_cap_pct: float = 4.0,
             overall_loss_cap_pct: float = 8.0, eod_hour_utc: int = 21,
             warmup_bars: int = 100, pip: float = 1e-4)`} />
      <Table
        head={["Field", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">cost</Code>, "PipCostModel", "PipCostModel()", "The pips-based cost model (spread/slippage/commission)."],
          [<Code key="b">lots</Code>, "float", "1.0", "Position size in lots."],
          [<Code key="c">rr</Code>, "float", "3.0", "Reward:risk — TP distance = rr × stop distance."],
          [<Code key="d">min_stop_pips</Code>, "float", "3.0", "Stop is clipped to at least this many pips."],
          [<Code key="e">max_stop_pips</Code>, "float", "40.0", "Stop is clipped to at most this many pips."],
          [<Code key="f">account_size</Code>, "float", "100_000.0", "Starting account in dollars."],
          [<Code key="g">daily_loss_cap_pct</Code>, "float", "4.0", "No new entries once the day is down this % of account."],
          [<Code key="h">overall_loss_cap_pct</Code>, "float", "8.0", "Equity-floor circuit breaker: halt below account × (1 − this%)."],
          [<Code key="i">eod_hour_utc</Code>, "int", "21", "UTC hour at which open positions are flattened (EOD)."],
          [<Code key="j">warmup_bars</Code>, "int", "100", "Bars skipped before the strategy is polled."],
          [<Code key="k">pip</Code>, "float", "1e-4", "Pip size in price units."],
        ]}
      />

      <H3>BacktestResult</H3>
      <P>
        The result bundle returned by <Code>run_backtest</Code>: the trades frame, the equity curve, the config used,
        and the safety-rail telemetry.
      </P>
      <CodeBlock code={`BacktestResult(trades: pd.DataFrame, equity: pd.Series, config: EngineConfig,
               ambiguous_bars: int, halted_days: list = [], overall_halt_at: str | None = None)`} />
      <Table
        head={["Field", "Type", "Meaning"]}
        rows={[
          [<Code key="a">trades</Code>, "pd.DataFrame", "One row per trade — see columns below."],
          [<Code key="b">equity</Code>, "pd.Series", "Account equity curve (account + realized + floating), NaNs dropped."],
          [<Code key="c">config</Code>, "EngineConfig", "The config the run used."],
          [<Code key="d">ambiguous_bars</Code>, "int", "Count of bars that touched both SL and TP (resolved as SL)."],
          [<Code key="e">halted_days</Code>, "list", "Dates on which the daily-loss cap blocked new entries."],
          [<Code key="f">overall_halt_at</Code>, "str | None", "Timestamp the equity-floor circuit breaker fired, or None."],
        ]}
      />
      <P>
        The <Code>trades</Code> frame columns are: <Code>entry_time</Code>, <Code>exit_time</Code>,{" "}
        <Code>direction</Code>, <Code>entry</Code>, <Code>exit</Code>, <Code>stop_pips</Code>, <Code>pips</Code>,{" "}
        <Code>usd</Code>, <Code>r</Code>, <Code>bars_held</Code>, <Code>tag</Code>, <Code>exit_reason</Code>.
      </P>

      <H3>run_backtest</H3>
      <P>
        The event-driven fixed-RR prop-firm engine with safety rails. It fills a signal at the next bar&apos;s open, sets{" "}
        <Code>TP = rr * stop</Code>, and if a bar touches both SL and TP it counts as SL (pessimistic). It enforces an
        EOD flatten, a per-day loss cap (no new entries once breached), and an overall equity-floor circuit breaker. The
        strategy here is a <Code>BracketStrategy</Code> — a <Code>Callable[[pd.DataFrame, int], Signal | None]</Code>{" "}
        polled on the closed bar <Code>i</Code> when flat.
      </P>
      <CodeBlock code={`run_backtest(df, strategy: BracketStrategy, cfg: EngineConfig | None = None) -> BacktestResult`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">df</Code>, "pd.DataFrame", "—", "The OHLC frame (validated via as_ohlc internally)."],
          [<Code key="b">strategy</Code>, "BracketStrategy", "—", "Callable(df, i) → Signal | None, polled on closed bar i when flat."],
          [<Code key="c">cfg</Code>, "EngineConfig | None", "None", "Engine config; None → a default EngineConfig()."],
        ]}
      />
      <P><Strong>Returns:</Strong> a <Code>BacktestResult</Code> (trades, equity, config, and safety-rail telemetry).</P>
      <CodeBlock
        filename="run_backtest.py"
        code={`from edgekit.engine import run_backtest, EngineConfig
from edgekit.core import Signal

def my_strat(df, i):
    if breakout(df, i):
        return Signal(direction=1, stop_dist=20.0, tag="brk")
    return None

res = run_backtest(df, my_strat, EngineConfig(rr=3.0, account_size=100_000))
print(res.equity.iloc[-1], res.overall_halt_at)
print(res.trades[["exit_reason", "r", "usd"]].tail())`}
      />
      <Callout kind="tip" title="Which engine to reach for">
        Use <Code>run_bar_loop</Code> for research and the validation gauntlet — it is priced in R and trailing-exit
        driven. Use <Code>run_backtest</Code> only when you need the fixed-RR bracket account simulation (EOD flatten +
        loss caps) that mirrors a prop-firm evaluation. The R-stream from either can be sized with{" "}
        <A href="/docs/api/sizing">edgekit.sizing</A>.
      </Callout>

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/core">edgekit.core</A> — <Code>Signal</Code>, <Code>Trade</Code>, and the R-multiple convention.</Li>
        <Li><A href="/docs/api/strategy">edgekit.strategy</A> — concrete <Code>Strategy</Code> implementations (ORB, Keltner…).</Li>
        <Li><A href="/docs/api/costs">edgekit.costs</A> — the <Code>CostModel</Code> / <Code>PipCostModel</Code> the engines charge in R.</Li>
        <Li><A href="/docs/api/validation">edgekit.validation</A> — the gauntlet that consumes the trade frame.</Li>
      </Ul>
    </>
  );
}
