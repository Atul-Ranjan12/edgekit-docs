import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Code } from "@/components/prose";

export const metadata: Metadata = { title: "Causality" };

export default function CausalityPage() {
  return (
    <>
      <H1>Causality</H1>
      <Lead>
        A backtest is only as trustworthy as its arrow of time. If a strategy acts on information a bar has not
        finished revealing, the number it prints is fiction. edgekit treats no-look-ahead not as a coding convention
        to remember, but as a <Strong>tested property</Strong> the CI enforces on every indicator.
      </Lead>

      <Callout kind="danger" title="The +34% mirage">
        This library exists partly because of one scar. A research script reported a <Strong>+34% improvement</Strong>{" "}
        from an &quot;H+M&quot; filter. It was ~90% look-ahead: the strategy read the same day&apos;s daily bar — a bar
        that had <em>not yet closed</em> at the moment it claimed to act — so it was effectively trading on the future.
        Re-run causally, the edge evaporated. Every design decision below is a reaction to that.
      </Callout>

      <H2>What look-ahead bias is</H2>
      <P>
        Look-ahead bias is a strategy &quot;adapted to a filtration it should not see&quot;: the decision at bar{" "}
        <Code>i</Code> uses data that would not have been available until bar <Code>i</Code> closed (or later). The
        classic forms:
      </P>
      <Ul>
        <Li><Strong>Acting on the current bar&apos;s close.</Strong> Computing a signal from <Code>close[i]</Code> and then &quot;entering at <Code>close[i]</Code>&quot; — but you only know the close once the bar is over, i.e. at the open of <Code>i+1</Code>.</Li>
        <Li><Strong>Reading a not-yet-closed higher timeframe bar.</Strong> The +34% mirage: an intraday strategy consulting today&apos;s daily bar, whose high/low/close are still forming.</Li>
        <Li><Strong>Un-lagged indicators.</Strong> A rolling max/mean/z-score at index <Code>i</Code> includes bar <Code>i</Code> itself; acting on it at <Code>i</Code> peeks.</Li>
        <Li><Strong>Optimistic fills.</Strong> Assuming you got filled at a level the market gapped straight through.</Li>
      </Ul>

      <H2>edgekit&apos;s rule: indicators are unlagged; the caller lags</H2>
      <P>
        Every indicator in <A href="/docs/api/indicators">edgekit.indicators</A> returns values aligned so that index
        position <Code>i</Code> is the indicator computed <em>through</em> bar <Code>i</Code>, inclusive — and it is
        deliberately <Strong>not</Strong> lagged. The lag is the caller&apos;s explicit, visible responsibility, done
        with the single most important primitive in the library:
      </P>
      <CodeBlock
        filename="core.py (excerpt)"
        code={`def lag(x, k: int = 1):
    """Causal shift: a value known only after bar close is pushed forward k bars.
    Every indicator MUST be lagged before a strategy may act on it, or the
    backtest reads the future. Leading positions become NaN."""
    s = pd.Series(np.asarray(x, dtype=float))
    return s.shift(k).to_numpy() if not isinstance(x, pd.Series) else x.shift(k)`}
      />
      <P>
        Why keep the lag at the call site instead of baking it into each indicator? Because it makes the causality
        decision <em>visible and testable</em>. When you read a strategy and see <Code>ek.lag(upper, 1)</Code>, you
        can see exactly what information the entry is allowed to use. A lag hidden inside <Code>donchian()</Code> would
        be invisible, un-auditable, and — as the repo learned the hard way — occasionally forgotten.
      </P>
      <Callout kind="note" title="The contract, stated once">
        Acting on bar <Code>i</Code> may only use data through bar <Code>i-1</Code>. Indicators come back through{" "}
        <Code>i</Code>; you <Code>lag(x, 1)</Code> them so the value the strategy reads at <Code>i</Code> is the one
        that was fully known at the close of <Code>i-1</Code>.
      </Callout>

      <H2>The causal pattern in practice</H2>
      <P>
        A Donchian breakout is the canonical example. The channel is computed unlagged, then lagged one bar before the
        entry condition looks at it, and the fill happens gap-aware at the next bar&apos;s open:
      </P>
      <CodeBlock
        filename="causal_donchian.py"
        code={`import edgekit as ek

def prepare(bars):
    upper, lower = ek.indicators.donchian(bars.high, bars.low, n=20)
    return {
        # lag by 1: the channel a decision at bar i may see is the one known at i-1
        "upper": ek.lag(upper, 1),
        "lower": ek.lag(lower, 1),
        "atr":   ek.lag(ek.indicators.atr(bars.high, bars.low, bars.close, 20), 1),
    }

def entry(bars, P, i):
    # act at bar i using ONLY lagged (through i-1) information
    prev_close = bars["close"].iloc[i - 1]
    if prev_close > P["upper"][i]:                 # yesterday broke the prior 20-bar high
        return ek.engine.EntryIntent(direction=1, level=P["upper"][i],
                                     stop_dist=2 * P["atr"][i])
    return None`}
      />
      <P>
        Notice there is no reference to <Code>bars.close.iloc[i]</Code> in the decision — that close has not happened
        yet at the moment the strategy fires. The engine then fills the intent on the next executable price.
      </P>

      <H3>Gap-aware fills</H3>
      <P>
        Causality is not only about indicators; it is about assuming a realistic fill. If a long&apos;s breakout level
        is 100 but the market gaps open to 103, you did not get filled at 100 — you got the open. edgekit&apos;s engine
        and its two fill helpers encode this pessimism:
      </P>
      <CodeBlock
        filename="engine.py (excerpt)"
        code={`def fill_entry(level, open_price, direction):
    """Gap-aware entry: a long gapping up fills at the open, not the stale level."""
    return max(level, open_price) if direction > 0 else min(level, open_price)

def fill_stop(stop, open_price, direction):
    """Pessimistic stop: a gap-through the stop fills at the worse of stop/open."""
    return min(stop, open_price) if direction > 0 else max(stop, open_price)`}
      />
      <P>
        Inside <A href="/docs/api/engine">run_bar_loop</A> the entry fill is{" "}
        <Code>max(intent.level, open[i])</Code> for longs and <Code>min(...)</Code> for shorts — you always get the
        worse of your intended level and reality. In the prop-firm bracket engine, a bar that touches both stop and
        target in the same candle is booked as the <em>stop</em> (pessimistic tie-break). Optimism about fills is just
        a slower form of look-ahead, and it is refused everywhere.
      </P>

      <H2>The causality property test — the load-bearing guarantee</H2>
      <P>
        Rules are easy to write and easy to forget. So edgekit does not rely on the rule being followed — it{" "}
        <em>proves</em> it, mechanically, in CI. The property test perturbs a <Strong>future</Strong> bar and asserts
        the <Strong>past</Strong> does not move. If any indicator leaked future information, the value at some earlier
        index would change when the last bar is corrupted, and the test fails:
      </P>
      <CodeBlock
        filename="tests/test_foundation.py (the load-bearing test)"
        code={`@pytest.mark.parametrize("fn", [
    lambda b: ind.atr(b.high, b.low, b.close, 20),
    lambda b: ind.adx(b.high, b.low, b.close, 14),
    lambda b: ind.rsi(b.close, 14),
    lambda b: ind.sma(b.close, 50),
    lambda b: ind.donchian(b.high, b.low, 20)[0],
    lambda b: ind.hawkes_vol_expansion(b.high, b.low, b.close).astype(float),
])
def test_indicator_is_causal(fn):
    """An indicator at bar i must not change when a FUTURE bar is perturbed."""
    b = _bars()
    full = np.asarray(fn(b), float)
    b2 = b.copy()
    b2.iloc[-1, :] = b2.iloc[-1, :] * 1.5     # perturb ONLY the final bar
    perturbed = np.asarray(fn(b2), float)
    a, c = full[:-1], perturbed[:-1]          # everything before the last bar...
    mask = np.isfinite(a) & np.isfinite(c)
    assert np.allclose(a[mask], c[mask]), "indicator leaked future information"`}
      />
      <P>
        This is the correctness test the whole edifice rests on. An indicator that used any information from bar{" "}
        <Code>i</Code> to compute its value at an earlier bar <Code>j &lt; i</Code> would fail it. Because it runs over
        the full indicator battery on every commit, a refactor that quietly introduces a centered window, a forward
        fill, or a stray un-lagged reference cannot merge. Note the test intentionally corrupts <em>only the last
        bar</em> and checks all prior positions — the sharpest possible probe for a leak.
      </P>

      <Callout kind="warn" title="The classic mistakes, avoided by construction">
        <Ul>
          <Li>Signalling on <Code>close[i]</Code> and filling at <Code>close[i]</Code> — you don&apos;t know the close until <Code>i+1</Code>&apos;s open. Fill on the next open instead.</Li>
          <Li>Consulting a higher-timeframe bar that has not closed. Resample with the causal <Code>label=&quot;left&quot;/closed=&quot;left&quot;</Code> convention (see <A href="/docs/concepts/ohlc">the OHLC contract</A>) so a bar&apos;s timestamp only exposes closed bars.</Li>
          <Li>Forgetting to <Code>lag()</Code> an indicator. The engine acts on what you give it — an un-lagged array <em>is</em> look-ahead.</Li>
          <Li>Filling at a level the market gapped through. Use <Code>fill_entry</Code>/<Code>fill_stop</Code>, or the engine that already applies them.</Li>
        </Ul>
      </Callout>

      <H2>Why this is step one of the gauntlet</H2>
      <P>
        The <A href="/docs/concepts/gauntlet">validation gauntlet</A> opens with the causality audit for a reason:
        every downstream test — permutation, walk-forward, cost stress — is measuring a number, and if that number was
        produced by reading the future, everything after it is measuring a ghost. Causality is enforced first, by
        construction and by property test, so the rest of the gauntlet is asking &quot;is this real?&quot; of a number
        that at least belongs to a real, tradeable timeline.
      </P>

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/indicators">edgekit.indicators</A> — every indicator returns unlagged; you lag at the call site.</Li>
        <Li><A href="/docs/api/engine">edgekit.engine</A> — gap-aware fills, pessimistic stops, the no-look-ahead loop.</Li>
        <Li><A href="/docs/concepts/ohlc">The OHLC contract</A> — the causal resample convention (<Code>closed=&quot;left&quot;</Code>).</Li>
        <Li><A href="/docs/concepts/gauntlet">The validation gauntlet</A> — where the causal number gets stress-tested.</Li>
      </Ul>
    </>
  );
}
