import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Code } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Machine learning in trading" };

export default function Page() {
  return (
    <>
      <H1>Machine learning in trading</H1>
      <Lead>
        Most attempts to point machine learning at markets fail the same way: they try to predict the next price,
        discover the signal is buried under noise, and overfit their way to a beautiful backtest that dies live. There is
        a narrower, more honest use — <Strong>meta-labeling</Strong>: keep a hand-built rule as the primary signal, and
        train a model only to decide whether to <em>take or skip</em> each of that rule&apos;s trades. This chapter is the
        Lopez de Prado stack as implemented in <Code>edgekit.ml</Code>.
      </Lead>

      <Callout kind="note" title="ML needs the [ml] extra">
        <Code>import edgekit.ml</Code> itself needs only numpy + pandas, but fitting a model requires a backend:{" "}
        <Code>pip install &quot;edgekit[ml]&quot;</Code> pulls in scikit-learn (for <Code>make_model(&quot;rf&quot;)</Code> /{" "}
        <Code>make_model(&quot;hgb&quot;)</Code>); xgboost and lightgbm are separate installs. The backends are lazy-imported,
        so you only pay for what you fit.
      </Callout>

      <P>
        Forget models for a moment. You already run a breakout rule, and some of its trades are plainly worse than
        others — the ones that fire into a dead, rangebound afternoon, or a minute before the close. If you had a doorman
        standing at the entrance who quietly turned away the trades that <em>smell</em> like the past losers and let
        through the ones that look like the past winners, your average trade would improve without touching the rule at
        all. That doorman is meta-labeling. The rule still decides <em>which way</em> to bet and <em>when</em>; the model
        only decides <em>whether this particular firing is worth taking</em>. A filter on a real rule, never a price
        oracle — that framing is the one place ML has a defensible job in trading.
      </P>

      <H2>Where ML actually helps</H2>
      <P>
        The distinction that makes ML work in trading is <em>primary signal</em> versus <em>secondary filter</em>.
      </P>
      <Ul>
        <Li>
          <Strong>Predicting direction from features</Strong> — asking a model &ldquo;will price go up?&rdquo; This is a
          near-zero-signal, high-noise regression that overfits almost by construction. Avoid it.
        </Li>
        <Li>
          <Strong>Meta-labeling an existing rule</Strong> — let a proven entry rule (say the illustrative <Code>ORB</Code>{" "}
          breakout) generate candidate trades, then train a classifier on &ldquo;given this rule fired, did the trade
          win?&rdquo; The model never picks the direction; it only sizes conviction up or down. The label is grounded in a
          real, tradeable event, so the problem is well-posed.
        </Li>
      </Ul>
      <P>
        Meta-labeling improves <em>precision</em> at the cost of some recall: you skip the rule&apos;s worst-looking trades
        and keep its best, which raises expectancy and trims drawdown even when the base rule&apos;s raw edge is thin.
      </P>

      <H2>Features: build_features</H2>
      <P>
        Features are the model&apos;s view of the bar at decision time. The one rule that cannot be broken is
        <em> causality</em>: every feature at bar <MathInline>{"i"}</MathInline> must use only bars{" "}
        <MathInline>{"\\le i"}</MathInline>. <Code>ek.ml.build_features</Code> builds causal feature families for you,
        aligned to the bar frame, with the higher-timeframe context shifted one completed bar so it never peeks.
      </P>
      <CodeBlock code={`build_features(df, families=None, mtf_rule="1h") -> pd.DataFrame
# FAMILIES = ["price","atr","trend","macd","structure","volume","time","mtf","reversal","extra"]`} />
      <CodeBlock
        filename="features.py"
        code={`from edgekit.ml import build_features
X = build_features(bars, families=["price", "atr", "trend", "macd", "structure"])`}
      />

      <H2>Triple-barrier labeling</H2>
      <P>
        A meta-label needs a definition of &ldquo;did this trade win?&rdquo; The triple-barrier method answers it the way
        a real trade resolves — by whichever of three barriers price touches first from the entry:
      </P>
      <Ul>
        <Li><Strong>Upper barrier</Strong> — the take-profit, at <MathInline>{"TP = \\text{entry} + \\text{dir}\\cdot rr\\cdot \\text{stop}"}</MathInline>. Touch it first ⇒ label <MathInline>{"y = 1"}</MathInline> (win).</Li>
        <Li><Strong>Lower barrier</Strong> — the stop-loss, at <MathInline>{"SL = \\text{entry} - \\text{dir}\\cdot \\text{stop}"}</MathInline>. Touch it first ⇒ <MathInline>{"y = 0"}</MathInline> (loss).</Li>
        <Li><Strong>Vertical barrier</Strong> — a time limit of <MathInline>{"h"}</MathInline> bars. If neither price barrier is hit by then, the trade is closed at expiry and labelled by its sign.</Li>
      </Ul>
      <P>In prose, the label geometry looks like this:</P>
      <CodeBlock code={`price
  ^
  |·········································  TP  (upper)  -> y = 1
  |        ______
  |   ____/      \\___              entry ---------------------
  |  /                \\____
  |·······················\\················  SL  (lower)  -> y = 0
  +----------------------------------------> time
  entry                          horizon_bars  (vertical)`} />
      <P>
        The stop distance is set from volatility — <MathInline>{"\\text{stop} = \\text{stop\\_atr\\_mult}\\times \\text{ATR}"}</MathInline> —
        so the barriers adapt to the regime instead of using a fixed number of points. <Code>ek.ml.triple_barrier</Code>{" "}
        mirrors the backtest engine&apos;s fills (entry at the next bar&apos;s open, a bar touching both barriers counts as
        the stop — pessimistic), so labels and backtest agree.
      </P>
      <CodeBlock
        filename="labeling.py"
        code={`import numpy as np
from edgekit.ml import triple_barrier, LabelConfig

cand_mask = np.zeros(len(bars), dtype=bool)
cand_mask[::5] = True                      # candidate bars (e.g. where the primary rule fires)
cfg = LabelConfig(rr=2.0, stop_atr_mult=1.0, atr_period=14, horizon_bars=48)
labels = triple_barrier(bars, cand_mask, cfg, cost=0.0)
labels[["dir", "y", "r", "outcome"]].head()   # y in {0,1}; r = net R-multiple`}
      />
      <Callout kind="tip" title="Scenario: labeling one ORB trade on US100">
        The opening-range breakout fires long on US100 at 09:47; the fill is the next bar&apos;s open,{" "}
        <MathInline>{"18{,}250"}</MathInline>. The 14-bar ATR is 12 points, and you set <Code>stop_atr_mult=1.0</Code>,{" "}
        <Code>rr=2.0</Code>, <Code>horizon_bars=48</Code>. That fixes three lines: a stop at{" "}
        <MathInline>{"18{,}250 - 1.0\\times 12 = 18{,}238"}</MathInline>, a take-profit at{" "}
        <MathInline>{"18{,}250 + 2.0\\times 12 = 18{,}274"}</MathInline>, and a 48-bar clock. Now walk the tape forward.
        Price grinds to 18,266, stalls, dips to 18,244 (stop intact), then pushes through 18,274 on bar 31 — the{" "}
        <em>upper</em> barrier is touched first, so this candidate gets label <MathInline>{"y = 1"}</MathInline> and{" "}
        <MathInline>{"r = +2R"}</MathInline> minus cost. Had the 18,238 stop gone first,{" "}
        <MathInline>{"y = 0"}</MathInline>; had neither line been touched by bar 48, the trade is closed at that bar and
        labelled by its sign. <Code>triple_barrier</Code> does exactly this walk for every candidate bar — and if one
        bar&apos;s range straddles both lines at once, it pessimistically calls it the stop, so the label never flatters
        what the backtest engine would actually fill.
      </Callout>

      <H2>Meta-labeling: the primary signal plus a take/skip model</H2>
      <P>
        The full loop: the primary rule proposes trades, the triple barrier labels them, features describe each, a
        classifier learns <MathInline>{"P(\\text{win})"}</MathInline>, and you trade only the ones above a threshold. The
        convention that pays its way is a cut-off of <MathInline>{"P \\ge 0.55"}</MathInline> — a small bar above a coin
        flip is enough to prune the worst trades. <Code>ek.ml.MetaLabeler</Code> freezes a fitted model into a take/skip
        gate:
      </P>
      <CodeBlock code={`MetaLabeler(blob=None, clf=None, threshold=0.55, feature_names=None)
.proba(X) -> np.ndarray      # P(win) per candidate
.take(X)  -> np.ndarray      # boolean take/skip at the threshold`} />
      <CodeBlock
        filename="meta_label.py"
        code={`from edgekit.ml import make_model, MetaLabeler

X = build_features(bars).loc[labels["entry_index"]]     # features at each candidate's entry
y = labels["y"].to_numpy()

m = make_model("hgb")                                    # HistGradientBoosting (needs sklearn)
m.fit(X, y)                                              # meta-label: did the rule's trade win?

meta = MetaLabeler(clf=m.estimator, threshold=0.55)
take = meta.take(X_live)                                 # take only high-conviction candidates`}
      />
      <P>
        The expectancy math is the same as everywhere else: you are trying to lift <MathInline>{"E[R] = p\\,W - (1-p)\\,L"}</MathInline>{" "}
        by raising <MathInline>{"p"}</MathInline> on the trades you keep. If the filtered trades don&apos;t beat the
        unfiltered ones on out-of-sample expectancy, the model added nothing.
      </P>
      <Callout kind="tip" title="Scenario: two candidates, one taken">
        Two ORB signals fire the same morning, and the fitted model scores each from its features at entry. The first
        breaks out on thin volume an hour before the close and scores <MathInline>{"P(\\text{win}) = 0.48"}</MathInline>;
        the second breaks out of a tight early-session range on rising volume and scores{" "}
        <MathInline>{"P(\\text{win}) = 0.63"}</MathInline>. At the <MathInline>{"P \\ge 0.55"}</MathInline> gate the
        doorman waves the first away and lets the second through. Over a full test block this pruning keeps the
        higher-<MathInline>{"p"}</MathInline> half of the rule&apos;s trades, so the kept subset shows a higher win rate
        and a shallower drawdown than the rule ran unfiltered — the precision-for-recall trade in a single decision. The
        honest caveat lives in the same arithmetic: if the base rule&apos;s expectancy is <em>negative</em> net of cost
        (as the bare ORB&apos;s is), skipping its worst trades can shrink the loss but need not push it across zero.
        Meta-labeling sharpens a real edge; it cannot manufacture one.
      </Callout>

      <H2>Leakage and purged, embargoed walk-forward</H2>
      <P>
        This is where ML trading lives or dies. Because triple-barrier labels resolve <em>in the future</em> (a trade
        opened today closes in <MathInline>{"h"}</MathInline> bars), an ordinary train/test split leaks: a training label
        whose outcome resolves inside the test window has seen the test period. The fix is two-fold — <em>purge</em>{" "}
        training labels that overlap the test span, and add an <em>embargo</em> gap after it.
      </P>
      <Math>{"\\text{embargo} \\ge \\text{label horizon} \\quad\\Longrightarrow\\quad \\text{no train outcome resolves inside the test block}"}</Math>
      <ChartFigure
        name="tut/walk_forward_split"
        alt="A rolling walk-forward split with a purge-and-embargo gap between each train and test block"
        caption="Purged, embargoed walk-forward: the gap between train and test must be at least the label horizon, or the label's own future leaks across the seam."
      />
      <P>
        <Code>ek.ml.walk_forward_windows</Code> generates the rolling out-of-sample blocks with the purge and embargo
        built in; <Code>ek.ml.PurgedKFold</Code> does the same for hyperparameter selection <em>inside</em> a training
        window.
      </P>
      <Callout kind="tip" title="Scenario: the label that leaks 48 bars">
        Your triple barrier uses <Code>horizon_bars=48</Code> on M5 US100 — four trading hours. You split train/test at
        Friday&apos;s close. A candidate that fired at 15:40 Friday does not <em>resolve</em> until Monday, deep inside
        the test block — yet its features were computed Friday, so a naive split trains on a label whose outcome lives in
        the test period. The model has, in effect, read Monday&apos;s answer sheet. Purging drops that Friday candidate
        from training; a six-hour embargo (comfortably <MathInline>{"\\ge"}</MathInline> the four-hour horizon) also
        drops the first few Monday candidates whose windows still overlap the seam. Skip this and your OOS AUC will look
        wonderful for a reason that has nothing to do with an edge — which is exactly what the label-shuffle test below
        is built to catch.
      </Callout>
      <CodeBlock
        filename="walk_forward.py"
        code={`from edgekit.ml import walk_forward_windows, WalkForwardConfig

wf = WalkForwardConfig(train_days=7, test_hours=8, embargo_hours=6)   # embargo >= horizon
for w in walk_forward_windows(labels, wf):
    tr, te = labels.iloc[w["train_pos"]], labels.iloc[w["test_pos"]]
    m = make_model("hgb").fit(X.iloc[w["train_pos"]], tr["y"])
    proba = m.predict_proba(X.iloc[w["test_pos"]])       # honest OOS predictions
    # tune the take/skip threshold on an inner split of tr — never on te`}
      />
      <Callout kind="warn" title="Tune the threshold on validation only">
        Choosing the <MathInline>{"P \\ge 0.55"}</MathInline> cut-off (or any hyperparameter) on the same block you report
        results on is a leak. Use <Code>ek.ml.best_threshold</Code> on an inner validation split of the training window,
        then apply the frozen threshold on the test block unchanged.
      </Callout>

      <H2>The label-shuffle null test</H2>
      <P>
        The single most useful sanity check for a meta-label: permute the labels, refit, and confirm the out-of-sample
        AUC collapses to ~0.5. If a model trained on <em>shuffled</em> labels still scores well, it is reading the future
        through a leak in your pipeline — the features or the split, not the market. Real signal dies under the shuffle;
        leakage survives it.
      </P>
      <CodeBlock code={`shuffle_label_gate(make_model_fn, X, y, r=None, n=10, test_frac=0.3, seed=0) -> dict
# returns {mean_auc, aucs, mean_ev} -- mean_auc should sit at ~0.5`} />
      <CodeBlock
        filename="shuffle_gate.py"
        code={`from edgekit.ml import shuffle_label_gate, make_model
res = shuffle_label_gate(lambda: make_model("hgb"), X, y, n=10)
assert 0.45 < res["mean_auc"] < 0.55, "AUC on shuffled labels != 0.5 -> leakage in the pipeline"`}
      />

      <H2>Overfitting: the amplified risk</H2>
      <P>
        A hand-built rule has a handful of parameters; a gradient-boosted model has thousands of effective degrees of
        freedom. That flexibility is exactly what lets it memorise noise. Every overfitting lesson from{" "}
        <A href="/tutorials/overfitting-detection">overfitting detection</A> applies here with the dial turned up:
        the more the model can fit, the more the in-sample score overstates the truth, and the wider the gap to
        out-of-sample.
      </P>
      <ChartFigure
        name="tut/overfitting_curve"
        alt="Training score rising while validation score peaks and then falls as model complexity grows"
        caption="The classic gap: as capacity grows, training score keeps climbing while true out-of-sample performance turns over. ML widens this gap faster than any rule."
      />
      <Callout kind="warn" title="ML does not lower the bar — it raises it">
        Machine learning does not relax the validation gauntlet; it demands a stricter one. Report out-of-sample
        expectancy from purged walk-forward, pass the label-shuffle null, keep a sealed holdout you touch once, and prefer
        the simplest model that survives. A meta-label that only looks good in-sample is worth strictly less than the
        plain rule it sits on.
      </Callout>

      <H2>Cloud-safe tree export</H2>
      <P>
        A trained model is useless if you can&apos;t run it where the strategy lives. <Code>ek.ml.export_trees</Code>{" "}
        serialises a fitted <Code>HistGradientBoostingClassifier</Code> to a plain string blob, and the pure-Python /
        pure-C# inference generated from it needs <em>no</em> scikit-learn at runtime — it drops into a cTrader cBot. The
        round-trip is guaranteed to float tolerance:
      </P>
      <Math>{"\\left| \\text{tree\\_predict\\_proba}(\\text{blob}, X) - \\text{clf.predict\\_proba}(X)[:,1] \\right| < 10^{-6}"}</Math>
      <CodeBlock
        filename="export.py"
        code={`import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from edgekit.ml import export_trees, tree_predict_proba, emit_csharp

clf = HistGradientBoostingClassifier(max_depth=3, max_iter=40).fit(X, y)
blob = export_trees(clf)

# the guarantee: pure-python inference matches sklearn to 1e-6
assert np.abs(tree_predict_proba(blob, X) - clf.predict_proba(X)[:, 1]).max() < 1e-6

cs = emit_csharp({"orb": blob}, feature_names=feat_names)   # -> C# for a cTrader cBot`}
      />

      <P>
        <Strong>Next:</Strong> one validated edge is rarely the end — <A href="/tutorials/portfolio-construction">Portfolio
        construction</A> covers combining low-correlation books so the whole is steadier than any part.
      </P>
    </>
  );
}
