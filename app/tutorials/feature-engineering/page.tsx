import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Feature engineering" };

export default function Page() {
  return (
    <>
      <H1>Feature engineering</H1>
      <Lead>
        A model or a rule never sees a price chart — it sees a table of numbers. Feature engineering is the craft of
        building that table: turning raw OHLC into columns that summarise the market&apos;s state at each bar, using
        only information that was actually available at the time. Get the transforms right and a simple model can find
        an edge; get the timing wrong — leak one bar of the future — and you get a beautiful backtest that is pure
        fiction. This chapter covers both.
      </Lead>

      <H2>What a feature is</H2>
      <P>
        A <Strong>feature</Strong> is a single derived number attached to a bar that describes something about the
        market&apos;s state at that moment: how fast it&apos;s moving, how volatile it is, how far it has stretched from
        its average, what day of the week it is. One feature is a column; the full set is a matrix with one row per bar
        and one column per feature — the raw material every rule and every model consumes.
      </P>
      <P>
        The raw OHLC bar is a poor feature on its own. &ldquo;Close = 41,382&rdquo; means nothing without context —
        it&apos;s a level, and levels are non-stationary (the lesson of the{" "}
        <A href="/tutorials/time-series-analysis">previous chapter</A>). Good features are almost always{" "}
        <em>transforms</em> that strip the level out and expose the state: a return, a ratio, a z-score, a count. edgekit
        packages the common ones into a single call, <Code>make_features</Code>, which turns an OHLC frame into a ready
        feature matrix:
      </P>
      <CodeBlock code={`import edgekit as ek

X = ek.timeseries.make_features(bars, windows=(5, 20, 60), lags=(1, 2, 3, 5), calendar=True)
X = X.dropna()   # trim the warm-up rows where the longest window hasn't filled`} />
      <P>The columns it builds fall into a handful of families — the same families from the indicators chapter, now as model inputs:</P>
      <Ul>
        <Li><Strong>Returns</Strong> — the stationary base transform; the raw change the model actually predicts against.</Li>
        <Li><Strong>Rolling volatility</Strong> — how big a normal move is right now, over each of the <Code>windows</Code>.</Li>
        <Li><Strong>Momentum</Strong> — trailing return over each window; speed and direction of the recent drift.</Li>
        <Li><Strong>RSI</Strong> — bounded momentum/exhaustion oscillator (reuses <Code>indicators.rsi</Code>).</Li>
        <Li><Strong>ATR%</Strong> — average true range as a fraction of price, so volatility is comparable across price levels (reuses <Code>indicators.atr</Code>).</Li>
        <Li><Strong>Distance-from-MA z-score</Strong> — how many standard deviations price sits from its moving average (reuses <Code>indicators.zscore</Code>).</Li>
        <Li><Strong>Range%</Strong> — the bar&apos;s high-low range relative to price; an intrabar volatility read.</Li>
        <Li><Strong>Calendar</Strong> — day-of-week / month dummies, when <Code>calendar=True</Code>.</Li>
        <Li><Strong>Lagged returns</Strong> — returns at each lag in <Code>lags</Code>, giving the model short-horizon memory.</Li>
      </Ul>
      <P>
        Because it reuses the indicator primitives, a feature named for an indicator means exactly what that indicator
        means — there is no second, subtly-different implementation to reconcile.
      </P>
      <Callout kind="tip" title="Scenario: one bar as the model sees it">
        <P>
          A model never sees &ldquo;BTCUSDT ripped on Tuesday.&rdquo; It sees one row of numbers. Take the H4 bar that
          closed 2024-03-05 12:00 UTC at 66,800 after a strong push. After <Code>make_features</Code> (and after the
          built-in one-bar shift), the row handed to the model for the <em>next</em> bar looks roughly like:
        </P>
        <CodeBlock code={`ret        0.011     # last completed bar was +1.1%
vol_20     0.018     # 20-bar return stdev ~1.8%
mom_20     0.064     # trailing 20-bar momentum +6.4% (uptrend)
rsi_14     71.2      # momentum hot, near overbought
atr_pct    0.021     # ATR is 2.1% of price
z_ma_60    2.30      # price sits 2.3 sigma above its 60-bar mean (stretched)
range_pct  0.015     # this bar's high-low span was 1.5% of price
dow_1      1         # calendar dummy: it's a Tuesday`} />
        <P>
          That is the whole market state compressed to eight numbers, every one stationary and every one knowable at the
          prior close. A rule reads two or three of them (&ldquo;<Code>mom_20 &gt; 0</Code> and <Code>rsi_14 &lt; 70</Code>&rdquo;);
          a model reads all of them at once. Note the tension already visible in this row: momentum is up (trend says buy)
          but <Code>z_ma_60</Code> is +2.3 (reversion says stretched) — the same row argues both ways, which is exactly
          the interaction a model is there to weigh.
        </P>
      </Callout>

      <H2>Causality &amp; leakage — the cardinal sin</H2>
      <P>
        This is the one that matters more than every clever transform combined. A feature must be computable from{" "}
        <em>past information only</em>. If any column at row <MathInline>{"t"}</MathInline> contains information that
        was not knowable until after bar <MathInline>{"t"}</MathInline> had closed, you have <Strong>look-ahead
        bias</Strong> — the model is trained to &ldquo;predict&rdquo; the future using the future, and the edge
        evaporates the instant you go live.
      </P>
      <P>
        The trap is subtle because most leakage is accidental. An indicator computed <em>through</em> the current bar,
        a rolling statistic fit over the whole sample, a label built from a forward return that quietly overlaps the
        features — each leaks the future into the past without any obvious error. The defence is a hard rule: every
        feature is lagged so that row <MathInline>{"t"}</MathInline> uses only data through bar{" "}
        <MathInline>{"t-1"}</MathInline>.
      </P>
      <Callout kind="danger" title="make_features shifts one bar for you — don't undo it">
        <P>
          <Strong><Code>make_features</Code> shifts every column by one bar before returning it.</Strong> Row{" "}
          <Code>t</Code> holds only information known at the close of bar <Code>t-1</Code>, so the matrix is safe to
          feed a rule or a model directly. This is the same causality contract the indicators carry, applied to the
          whole feature table at once.
        </P>
        <P>
          The corollary is on you: <Strong>do not bolt an un-lagged column onto the matrix</Strong>, and do not
          un-shift what you were given. The moment one same-bar feature sits beside the causal ones, leakage is back —
          and it will not show up as an error, only as an out-of-sample collapse. When in doubt, re-read{" "}
          <A href="/docs/concepts/causality">the causality contract</A>.
        </P>
      </Callout>
      <CodeBlock
        filename="leakage.py"
        code={`# WRONG — a same-bar column glued next to the causal matrix leaks bar t into row t
X = ek.timeseries.make_features(bars)
X["close_now"] = bars.close          # <-- not lagged: look-ahead

# RIGHT — keep everything on the causal matrix; add lagged versions only
X = ek.timeseries.make_features(bars)
X = ek.timeseries.add_lags(X, ["ret"], lags=(1, 2, 5))   # stays shifted / causal`}
      />
      <P>
        <Code>add_lags</Code> is the low-level primitive behind the <Code>lags</Code> argument — reach for it when you
        want lagged copies of a specific signal you built yourself, and trust that it keeps the shift.
      </P>
      <Callout kind="tip" title="Scenario: the accuracy that was too good">
        <P>
          A model on US100 M15 features reports 71% direction accuracy in-sample and a Sharpe that looks like a typo. The
          culprit is one line: after calling <Code>make_features</Code>, the researcher appended{" "}
          <Code>X[&quot;close_now&quot;] = bars.close</Code> &ldquo;just as a reference column.&rdquo; That column is the
          <em> current</em> bar&apos;s close — the very quantity the label is derived from — sitting un-shifted beside the
          causal features. The model learned to read the answer off the reference column. Drop it (or lag it) and accuracy
          collapses to a realistic 52%. The tell is always the same: a suspiciously good number, and a feature that turns
          out to know something it could not have known at decision time.
        </P>
      </Callout>

      <H2>Normalisation &amp; scaling</H2>
      <P>
        Even causal features vary wildly in scale: a return is <MathInline>{"\\sim 0.01"}</MathInline>, an RSI runs
        0–100, a volume can be in the millions. Many models — and any distance- or gradient-based method — behave badly
        when inputs live on wildly different scales, because the large-magnitude feature dominates purely by units. The
        standard fix is the z-score, which recentres and rescales each feature to comparable units:
      </P>
      <Math>{"z_t = \\frac{x_t - \\mu_t}{\\sigma_t}"}</Math>
      <P>
        The critical detail is that <MathInline>{"\\mu_t"}</MathInline> and <MathInline>{"\\sigma_t"}</MathInline> must
        be <em>trailing</em> (rolling) estimates, not full-sample constants — a full-sample mean uses future data to
        standardise the past, which is leakage wearing a statistician&apos;s coat. That is exactly why{" "}
        <Code>make_features</Code> builds its distance-from-MA feature as a <em>rolling</em> z-score.
      </P>
      <P>
        Prefer <Strong>stationary features over raw levels</Strong> for the same reason a return beats a price: a level
        the model learned to key off in-sample may sit in a completely different range out-of-sample, and the rule
        silently breaks. Ratios, returns, and z-scores travel across regimes; raw prices and raw volumes do not.
      </P>
      <ChartFigure
        name="rolling_metrics"
        alt="Rolling feature statistics drifting over time"
        caption="A rolling statistic drifts with the regime — which is what makes it informative and what makes fixed thresholds fragile. Standardising against a trailing window keeps a feature comparable across calm and stressed periods."
      />

      <H2>How many features? Fewer, with a reason</H2>
      <P>
        It is tempting to throw every window and every lag at the model and let it sort them out. Resist it. Each extra
        feature is another dimension in which the model can memorise noise, and the number of spurious patterns
        available to fit grows faster than the signal. This is the <A href="/tutorials/overfitting-detection">curse of
        dimensionality</A> in its practical form: more features, more ways to overfit, worse out-of-sample.
      </P>
      <P>The discipline that beats it is economic rationale, not statistical fishing:</P>
      <Ul>
        <Li><Strong>Prefer features with a reason to work.</Strong> A momentum feature earns its place because trend-persistence is a documented effect; a feature that merely correlated with returns in your sample has no such backing and usually won&apos;t survive.</Li>
        <Li><Strong>Drop redundant features.</Strong> Two features with a correlation near 1 add dimensions without adding information. Check a correlation matrix and keep one of each cluster.</Li>
        <Li><Strong>Distrust in-sample importance.</Strong> A model will happily rank a leaked or noise feature as &ldquo;important&rdquo;. Feature importance describes the fit you have, not the edge you&apos;ll keep — confirm it survives out-of-sample before you believe it.</Li>
      </Ul>
      <Callout kind="warn" title="A feature that helps in-sample and hurts out-of-sample was noise">
        The honest test of a feature is whether adding it improves <em>out-of-sample</em> performance in a{" "}
        <A href="/tutorials/walk-forward">walk-forward</A>. In-sample, almost any feature helps — that is the definition
        of overfitting. Add features one at a time, keep only those that pay off on unseen data, and prefer the smaller
        set when two perform equally.
      </Callout>

      <H2>From features to decisions</H2>
      <P>The feature matrix is the fork in the road. Two things can read it.</P>
      <H3>Features to rules</H3>
      <P>
        A hand-written strategy reads a few features and applies a threshold: go long when momentum is positive{" "}
        <em>and</em> the RSI isn&apos;t already overbought, size the stop off ATR%. The feature is the input; the
        threshold and direction are the strategy. This is the path of Part III — transparent, few-parameter, and easy
        to reason about when it breaks.
      </P>
      <H3>Features to machine learning</H3>
      <P>
        A model reads <em>all</em> the features and learns the mapping to a label itself, instead of you hand-picking
        thresholds. That is the ML layer: the ML module ships its own strategy-family feature builder,{" "}
        <Code>ek.ml.build_features</Code>, tuned for that pipeline, alongside triple-barrier labelling and purged
        walk-forward. The causality rule does not relax for models — if anything it bites harder, because a flexible
        model exploits leaked information more aggressively than a two-line rule ever could.
      </P>
      <CodeBlock code={`# rule path: read a couple of causal features, threshold them
X = ek.timeseries.make_features(bars)
go_long = (X["mom_20"] > 0) & (X["rsi_14"] < 70)

# ML path: hand the whole (causal) matrix to a model
from edgekit.ml import build_features
Xml = build_features(bars, families=["price", "trend", "macd", "structure"])`} />

      <H2>Where this leads</H2>
      <P>
        You can now build a causal feature matrix, keep it honest, scale it sensibly, and prune it to the few columns
        that have a reason to exist. What decides whether those features are read as a trend signal, a fade, a breakout,
        or a filter is the strategy archetype — and that is a map worth having before you write the first rule.
      </P>
      <P>
        Next: <A href="/tutorials/taxonomy-of-strategies">A taxonomy of strategies</A> — the archetypes these features
        feed, what each one exploits, and when it fails.
      </P>
    </>
  );
}
