import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.ml" };

export default function MlPage() {
  return (
    <>
      <H1>edgekit.ml</H1>
      <Lead>
        The meta-labelling / ML framework — the Lopez de Prado stack. Label each candidate with a triple barrier, weight
        by uniqueness, validate with purged walk-forward (no leakage), fit a gradient-boosted meta-label, and freeze it to
        a cloud-safe tree blob a cTrader cBot can evaluate with no scikit-learn.
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> Config dataclasses (<Code>LabelConfig</Code>, <Code>WalkForwardConfig</Code>,{" "}
        <Code>SessionConfig</Code>, <Code>ModelConfig</Code>, <Code>ExperimentConfig</Code>); labelling
        (<Code>triple_barrier</Code>, <Code>uniqueness_weights</Code>); leakage-safe splits
        (<Code>walk_forward_windows</Code>, <Code>time_inner_split</Code>, <Code>PurgedKFold</Code>); features
        (<Code>build_features</Code>); models (<Code>make_model</Code>, <Code>ModelWrapper</Code>); metrics
        (<Code>ev_at</Code>, <Code>best_threshold</Code>, <Code>trade_metrics</Code>, <Code>confusion</Code>,{" "}
        <Code>safe_auc</Code>); and export (<Code>export_trees</Code>, <Code>emit_python</Code>, <Code>emit_csharp</Code>,{" "}
        <Code>MetaLabeler</Code>, <Code>shuffle_label_gate</Code>).
      </P>

      <Callout kind="warn" title="Lean import, lazy backends">
        <Code>import edgekit.ml</Code> needs only numpy + pandas. Heavy backends are lazy-imported inside the functions
        that fit models — you only pay when you actually fit:
        <Ul>
          <Li><Code>make_model(&quot;rf&quot;)</Code> and <Code>make_model(&quot;hgb&quot;)</Code> need <Strong>scikit-learn</Strong>.</Li>
          <Li><Code>make_model(&quot;xgb&quot;)</Code> needs <Strong>xgboost</Strong>.</Li>
          <Li><Code>make_model(&quot;lgbm&quot;)</Code> needs <Strong>lightgbm</Strong>.</Li>
          <Li><Code>safe_auc</Code> lazy-imports sklearn and returns <Code>NaN</Code> if it is absent.</Li>
          <Li><Code>ExperimentConfig.from_yaml</Code> lazy-imports <Code>yaml</Code>.</Li>
        </Ul>
        Each missing backend raises an actionable <Code>ImportError</Code> at <Code>make_model</Code> time (an unknown name raises <Code>ValueError</Code>).
      </Callout>

      <H2>Config dataclasses (ml.config)</H2>

      <H3>LabelConfig</H3>
      <P>Triple-barrier geometry in <em>price</em> units.</P>
      <CodeBlock code={`LabelConfig(rr: float = 2.0, stop_atr_mult: float = 1.0, atr_period: int = 14,
            min_stop: float | None = None, max_stop: float | None = None,
            horizon_bars: int = 48, eod_flatten: bool = False,
            eod_hour_utc: int = 21, cost_in_label: bool = False)`} />
      <Ul>
        <Li><Code>rr</Code> — sets the take-profit as a multiple of the stop distance.</Li>
        <Li><Code>stop_atr_mult</Code>, <Code>atr_period</Code> — stop = <Code>stop_atr_mult × ATR(atr_period)</Code>.</Li>
        <Li><Code>min_stop</Code> / <Code>max_stop</Code> — clamp the ATR stop.</Li>
        <Li><Code>horizon_bars</Code> — the vertical (time) barrier.</Li>
        <Li><Code>eod_flatten</Code> — add an intraday vertical barrier at <Code>eod_hour_utc</Code> (leave False for 24/7 assets).</Li>
        <Li><Code>cost_in_label</Code> — widen the TP by <Code>cost</Code> so a labelled win must clear costs.</Li>
      </Ul>

      <H3>WalkForwardConfig</H3>
      <P>Rolling out-of-sample walk geometry.</P>
      <CodeBlock code={`WalkForwardConfig(train_days: float = 7.0, test_hours: float = 4.0,
                  embargo_hours: float = 4.0, dev_lookback_days: float = 365,
                  inner_val_frac: float = 0.3)`} />
      <Callout kind="warn" title="The embargo is the firewall">
        <Code>embargo_hours</Code> must be ≥ the label horizon — it gaps train from test so no train label&apos;s outcome
        can resolve inside the test window (the whole point of purging). <Code>dev_lookback_days=0</Code> walks all data.
      </Callout>

      <H3>SessionConfig, ModelConfig, ExperimentConfig</H3>
      <CodeBlock code={`SessionConfig(london_start: int = 7, london_end: int = 16, overlap_start: int = 12,
              overlap_end: int = 16, mode: str = "london_and_overlap")

ModelConfig(name: str = "hgb", params: dict = {})   # name in "rf"|"xgb"|"lgbm"|"hgb"

ExperimentConfig(experiment_id="exp", data_path="", bar_minutes=5, holdout_frac=0.2,
                 feature_families=[...], label=LabelConfig(), session=SessionConfig(),
                 wf=WalkForwardConfig(), models=[ModelConfig("hgb")], seed=7,
                 shuffle_labels=False, out_root=".")`} />
      <P>
        <Code>ExperimentConfig</Code> is the single source of truth for a run. Methods: <Code>logs_dir() -&gt; Path</Code>,{" "}
        <Code>to_dict() -&gt; dict</Code>, and classmethods <Code>from_yaml(path)</Code> (lazy <Code>yaml</Code>) and{" "}
        <Code>from_dict(raw)</Code>.
      </P>

      <H2>Labelling (ml.labeling)</H2>

      <H3>triple_barrier</H3>
      <P>
        Cost-aware triple-barrier labelling whose fills mirror the engine, so labels and backtest agree: entry at the
        next bar&apos;s open; <Code>TP = entry + dir·rr·stop</Code>, <Code>SL = entry − dir·stop</Code>; a bar touching
        both barriers counts as SL (pessimistic); vertical barrier at <Code>horizon_bars</Code>; <Code>y=1</Code> iff TP
        hit first.
      </P>
      <CodeBlock code={`triple_barrier(df, cand_mask, cfg: LabelConfig, cost: float = 0.0,
               horizon_bars: int | None = None, both_directions: bool = True) -> pd.DataFrame`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">df</Code>, "pd.DataFrame", "—", "OHLC frame."],
          [<Code key="b">cand_mask</Code>, "bool array", "—", "Which bars are labelling candidates (over df rows)."],
          [<Code key="c">cfg</Code>, "LabelConfig", "—", "Barrier geometry."],
          [<Code key="d">cost</Code>, "float", "0.0", "Round-trip cost in price units, charged in each label's net R."],
          [<Code key="e">horizon_bars</Code>, "int | None", "None", "Override cfg's vertical barrier."],
          [<Code key="f">both_directions</Code>, "bool", "True", "Label both a long and a short per candidate."],
        ]}
      />
      <P>Returns a long DataFrame, one row per (candidate, direction), columns: <Code>entry_index, entry_time, exit_index, exit_time, dir, y, r, net, stop, outcome, weight</Code>.</P>
      <CodeBlock
        filename="labeling.py"
        code={`import numpy as np
from edgekit.ml import triple_barrier, LabelConfig

cand_mask = np.zeros(len(bars), dtype=bool)
cand_mask[::5] = True                              # every 5th bar is a candidate
cfg = LabelConfig(rr=2.0, stop_atr_mult=1.0, atr_period=14, horizon_bars=48)
labels = triple_barrier(bars, cand_mask, cfg, cost=0.0)
labels[["dir", "y", "r", "outcome"]].head()`}
      />

      <H3>uniqueness_weights</H3>
      <P>Average-uniqueness weight per label = mean over its lifespan of <Code>1/concurrency</Code> — down-weighting overlapping labels so the model does not over-count redundant samples.</P>
      <CodeBlock code={`uniqueness_weights(entry_index, exit_index, n_bars: int) -> np.ndarray

w = uniqueness_weights(labels["entry_index"], labels["exit_index"], len(bars))
model.fit(X, y, sample_weight=w)`} />

      <H2>Splits (ml.splits)</H2>

      <H3>walk_forward_windows</H3>
      <P>The out-of-sample backtest generator: train on the rolling past, test on the next block, with an embargo gap. Yields dicts of <Code>.iloc</Code> positions.</P>
      <CodeBlock code={`walk_forward_windows(labels: pd.DataFrame, wf: WalkForwardConfig)   # generator -> {t0, t1, train_pos, test_pos}`} />
      <P>
        <Code>labels</Code> must carry <Code>entry_time</Code> / <Code>exit_time</Code>. A train label is kept only if its{" "}
        <Code>exit_time</Code> ≤ the embargoed train-window end (the purge); windows need ≥ 40 train labels.
      </P>
      <CodeBlock
        code={`from edgekit.ml import walk_forward_windows, WalkForwardConfig
wf = WalkForwardConfig(train_days=7, test_hours=8, embargo_hours=6)
for w in walk_forward_windows(labels, wf):
    tr, te = labels.iloc[w["train_pos"]], labels.iloc[w["test_pos"]]
    # fit on tr, predict te — no train outcome resolves inside the embargo`}
      />

      <H3>time_inner_split</H3>
      <P>Chronological inner split for early-stop / threshold tuning: the earliest <Code>(1−val_frac)</Code> is train, the latest <Code>val_frac</Code> is val, purging train labels whose horizon runs into the val block.</P>
      <CodeBlock code={`time_inner_split(train_labels: pd.DataFrame, val_frac: float) -> (inner_tr, inner_val)   # position arrays`} />

      <H3>PurgedKFold</H3>
      <P>K contiguous-in-time folds with purge + embargo, for hyperparameter selection inside a training window.</P>
      <CodeBlock code={`PurgedKFold(n_splits: int = 4, embargo_frac: float = 0.02)
.split(labels)   # yields (train, val) index arrays`} />
      <P>Purges train labels whose horizon overlaps the val fold&apos;s time span, plus an embargo tail.</P>

      <H2>Features (ml.features)</H2>

      <H3>build_features</H3>
      <P>Build the selected causal feature families, aligned to <Code>df</Code> (inf → NaN). Every feature at bar <Code>i</Code> uses only bars <Code>{"<= i"}</Code>.</P>
      <CodeBlock code={`build_features(df, families: list[str] | None = None, mtf_rule: str = "1h") -> pd.DataFrame`} />
      <Ul>
        <Li><Code>families</Code> — defaults to all of <Code>FAMILIES = [&quot;price&quot;, &quot;atr&quot;, &quot;trend&quot;, &quot;macd&quot;, &quot;structure&quot;, &quot;volume&quot;, &quot;time&quot;, &quot;mtf&quot;, &quot;reversal&quot;, &quot;extra&quot;]</Code>.</Li>
        <Li><Code>mtf_rule</Code> — pandas offset for the higher-timeframe context (shifted one completed bar so it never peeks).</Li>
      </Ul>
      <P>The <Code>volume</Code> family is skipped unless a <Code>tick_volume</Code> column is present.</P>
      <CodeBlock code={`from edgekit.ml import build_features
X = build_features(bars, families=["price", "trend", "macd", "structure"])`} />

      <H2>Models (ml.models)</H2>

      <H3>make_model</H3>
      <P>Build a <Code>ModelWrapper</Code> for a backend — RF / XGBoost / LightGBM / HistGBM behind one fit/predict_proba API.</P>
      <CodeBlock code={`make_model(name: str, task: str = "classification", params: dict | None = None,
           seed: int = 7) -> ModelWrapper`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">name</Code>, "str", "—", '"rf" | "xgb" | "lgbm" | "hgb" (unknown → ValueError).'],
          [<Code key="b">task</Code>, "str", '"classification"', '"classification" or "regression".'],
          [<Code key="c">params</Code>, "dict | None", "None", "Overrides the tuned defaults."],
          [<Code key="d">seed</Code>, "int", "7", "Random seed."],
        ]}
      />

      <H3>ModelWrapper</H3>
      <CodeBlock code={`ModelWrapper(name: str, estimator, task: str = "classification")
.fit(X, y, sample_weight=None) -> self
.predict_proba(X) -> np.ndarray      # P(class 1); constant for a degenerate single-class window
.predict(X)`} />
      <CodeBlock code={`from edgekit.ml import make_model
m = make_model("hgb", params={"max_iter": 30})
m.fit(X, y)                        # needs scikit-learn (lazy import)
p = m.predict_proba(X)             # P(win) per row`} />

      <H2>Metrics (ml.metrics)</H2>
      <P>ML/trading metrics for meta-labelling — the objective is EV per trade in R, after costs.</P>
      <CodeBlock code={`threshold_grid() -> np.ndarray                          # candidate cut-offs 0.30..0.79 step 0.01
ev_at(proba, r, thr) -> (mean_R, count)                 # of the trades a cut-off would take
best_threshold(proba, r, min_trades: int = 10) -> (best_t, best_ev)   # tune on VAL only
trade_metrics(r_taken) -> dict                          # {n, ev_r, win_rate, pf, sharpe, total_r}
confusion(y_true, y_pred) -> dict                       # {tp, tn, fp, fn, precision, recall}
safe_auc(y_true, proba) -> float                        # ROC-AUC; NaN if sklearn missing / one class`} />
      <CodeBlock
        filename="thresholding.py"
        code={`from edgekit.ml import best_threshold, ev_at, trade_metrics
thr, ev = best_threshold(val_proba, val_r, min_trades=10)   # tune on VAL, never the test block
mean_r, n = ev_at(test_proba, test_r, thr)                  # apply on the held-out block
metrics = trade_metrics(test_r[test_proba >= thr])`}
      />
      <Callout kind="warn" title="Tune the threshold on validation only">
        <Code>best_threshold</Code> picks the EV-maximising cut-off — do that on the <em>validation</em> split, then apply
        it unchanged on the test block. Choosing the threshold on the same data you report EV on is a leak.{" "}
        <Code>safe_auc</Code> degrades to <Code>NaN</Code> if sklearn is absent or only one class is present.
      </Callout>

      <H2>Export (ml.export)</H2>
      <P>
        The cloud-safe round-trip: serialise a fitted HistGradientBoosting meta-label to a plain tree-array string, and
        generate pure-Python / pure-C# inference for a cBot. Blob format:{" "}
        <Code>&quot;&lt;baseline&gt;#&lt;tree&gt;|&lt;tree&gt;...&quot;</Code>, where{" "}
        <Code>tree = &quot;&lt;node&gt;;&lt;node&gt;...&quot;</Code> and{" "}
        <Code>node = &quot;feat,thr,left,right,isleaf,missleft,value&quot;</Code>;{" "}
        <Code>P(class 1) = sigmoid(baseline + sum of hit-leaf values)</Code>. Module constant <Code>THRESHOLD = 0.55</Code>.
      </P>
      <Ul>
        <Li><Code>export_trees(clf) -&gt; str</Code> — serialise a fitted <Code>HistGradientBoostingClassifier</Code> to the blob (reads sklearn&apos;s private node arrays). Raises <Code>TypeError</Code> if not a fitted HistGradientBoosting estimator.</Li>
        <Li><Code>parse_trees(blob) -&gt; (baseline, trees)</Code> — parse a blob into the baseline float and node-tuple lists.</Li>
        <Li><Code>tree_predict_proba(blob, X) -&gt; np.ndarray</Code> — the reference pure-python forward pass (no sklearn); must match sklearn to float tolerance.</Li>
        <Li><Code>shuffle_label_gate(make_model_fn, X, y, r=None, n=10, test_frac=0.3, seed=0) -&gt; dict</Code> — leakage null test: permute labels, refit, confirm OOS AUC ~ 0.5. Returns <Code>{"{mean_auc, aucs, mean_ev}"}</Code>.</Li>
      </Ul>

      <H3>MetaLabeler</H3>
      <P>A frozen meta-label — take a trade only when <Code>P(win) ≥ threshold</Code>. Built from a fitted estimator (<Code>clf=</Code>, exported immediately) or a raw <Code>blob=</Code>; needs either. Carries no sklearn dependency once constructed.</P>
      <CodeBlock code={`MetaLabeler(blob: str | None = None, clf=None, threshold: float = 0.55,
            feature_names: list[str] | None = None)
.proba(X) -> np.ndarray
.take(X) -> np.ndarray        # boolean take/skip at the threshold`} />

      <H3>emit_python, emit_csharp</H3>
      <CodeBlock code={`emit_python(models, feature_names=None, threshold=0.55) -> str
emit_csharp(models, feature_names=None, threshold=0.55,
            class_name="Models", namespace="cAlgo.Robots") -> str`} />
      <P>
        <Code>emit_python</Code> generates a self-contained pure-Python inference module (no numpy/sklearn) defining{" "}
        <Code>BLOBS, THRESHOLD, FEATURES</Code> and <Code>predict(name, x)</Code> / <Code>take(name, x)</Code>.{" "}
        <Code>emit_csharp</Code> generates a C# static class embedding the blob(s) plus pure-C# tree inference
        (<Code>Predict(name, x)</Code>, <Code>Threshold</Code>) for a cTrader cBot. In both, <Code>models</Code> is a blob
        string or a <Code>{"{name: blob}"}</Code> dict.
      </P>

      <Callout kind="tip" title="The cloud-safe guarantee">
        The whole point of the export is that a cBot with no scikit-learn agrees with your trained model. The round-trip
        is guaranteed to float tolerance: <Code>{"|tree_predict_proba(blob, X) − clf.predict_proba(X)[:,1]| < 1e-6"}</Code>.
      </Callout>

      <CodeBlock
        filename="export.py"
        code={`import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from edgekit.ml import export_trees, tree_predict_proba, MetaLabeler, emit_csharp

clf = HistGradientBoostingClassifier(max_depth=3, max_iter=40).fit(X, y)
blob = export_trees(clf)

# the round-trip: pure-python inference matches sklearn to 1e-6
assert np.abs(tree_predict_proba(blob, X) - clf.predict_proba(X)[:, 1]).max() < 1e-6

meta = MetaLabeler(clf=clf, threshold=0.55)
take = meta.take(X_live)                                   # boolean take/skip, no sklearn needed
cs_source = emit_csharp({"orb": blob}, feature_names=feat_names)   # drop into a cTrader cBot`}
      />

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/strategy">edgekit.strategy</A> — the <Code>ORB</Code> edge this meta-label sits on top of.</Li>
        <Li><A href="/docs/api/validation">edgekit.validation</A> — the same anti-leakage discipline, at the strategy level.</Li>
        <Li><A href="/docs/installation">Installation</A> — install the <Code>[ml]</Code> extra for the model backends.</Li>
      </Ul>
    </>
  );
}
