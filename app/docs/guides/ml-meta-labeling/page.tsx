import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout } from "@/components/prose";

export const metadata: Metadata = { title: "ML meta-labeling" };

export default function MLMetaLabelingPage() {
  return (
    <>
      <H1>ML meta-labeling &amp; cloud export</H1>
      <Lead>
        Meta-labeling does not predict the market. It predicts <em>your own signal</em>: a rule-based primary
        strategy proposes every trade, and an ML filter learns which of those trades to actually take. Get the
        leakage controls right and it lifts expectancy; get them wrong and you ship a fantasy. This guide walks
        the full Lopez de Prado stack in edgekit — triple-barrier labels, purged walk-forward, a gradient-boosted
        filter, and a cloud-safe export a cTrader cBot runs with no scikit-learn.
      </Lead>

      <Callout kind="warn" title="ML needs the [ml] extra">
        <Code>import edgekit.ml</Code> itself needs only numpy + pandas, but the functions that <em>fit</em> models
        lazy-import their backend. Install what you use: <Code>pip install edgekit[ml]</Code> (scikit-learn +
        xgboost + lightgbm). A missing backend raises an actionable <Code>ImportError</Code> at{" "}
        <Code>make_model</Code> time, not at import.
      </Callout>

      <H2>The pattern</H2>
      <Ul>
        <Li><Strong>Primary signal</Strong> — a rule (e.g. the ORB breakout) proposes candidate trades.</Li>
        <Li><Strong>Labels</Strong> — each candidate is labelled win/lose by a triple barrier that mirrors the engine&apos;s fills.</Li>
        <Li><Strong>Filter</Strong> — a classifier learns <Code>P(win)</Code> from causal features; you take a trade only when <Code>P ≥ threshold</Code>.</Li>
        <Li><Strong>Validation</Strong> — purged, embargoed walk-forward so no label&apos;s outcome leaks into its own training set.</Li>
        <Li><Strong>Export</Strong> — freeze the model to a tree blob a cBot evaluates in pure C# / Python, matching sklearn within 1e-6.</Li>
      </Ul>

      <H2>Step 1 — features</H2>
      <P>
        <A href="/docs/api/ml">ml.build_features</A> builds causal feature families aligned to the bars — every
        feature at bar <Code>i</Code> uses only bars <Code>≤ i</Code>. The higher-timeframe (<Code>mtf</Code>)
        family is shifted one completed bar so it never peeks.
      </P>
      <CodeBlock
        filename="meta_label.py"
        code={`import edgekit as ek
from edgekit.ml import build_features

bars = ek.data.resample_ohlcv(ek.data.load_bars("US100_M1.csv"), "4h")
X = build_features(bars, families=["price", "atr", "trend", "macd", "structure"])
# families default to all of price/atr/trend/macd/structure/volume/time/mtf/reversal/extra
# ('volume' is skipped automatically unless a tick_volume column is present)`}
      />

      <H2>Step 2 — triple-barrier labels + uniqueness weights</H2>
      <P>
        <A href="/docs/api/ml">triple_barrier</A> labels each candidate bar in both directions. Its semantics
        mirror the backtest engine exactly, so labels and backtest agree: entry at the next bar&apos;s open,{" "}
        <Code>TP = entry + dir·rr·stop</Code>, <Code>SL = entry − dir·stop</Code>, a bar touching both counts as
        SL (pessimistic), and a vertical barrier at <Code>horizon_bars</Code>. <Code>y=1</Code> iff TP is hit
        first.
      </P>
      <CodeBlock
        code={`from edgekit.ml import triple_barrier, uniqueness_weights, LabelConfig

# candidate bars: where your PRIMARY rule would fire. Here, a simple 20-bar high breakout.
import numpy as np
from edgekit import indicators as ind
from edgekit.core import lag
up, _ = ind.donchian(bars.high.to_numpy(), bars.low.to_numpy(), 20)
cand_mask = bars.high.to_numpy() >= lag(up, 1)

cfg = LabelConfig(rr=2.0, stop_atr_mult=1.0, atr_period=14, horizon_bars=48)
labels = triple_barrier(bars, cand_mask, cfg, cost=0.0)
# columns: entry_index, entry_time, exit_index, exit_time, dir, y, r, net, stop, outcome, weight
print(labels["y"].mean(), "base win rate over", len(labels), "candidates")`}
      />
      <P>
        Overlapping labels share future bars, so a naive fit over-counts redundant samples.{" "}
        <A href="/docs/api/ml">uniqueness_weights</A> gives each label its average-uniqueness weight (mean of
        1/concurrency over its lifespan) — pass it as <Code>sample_weight</Code> when you fit.
      </P>
      <CodeBlock
        code={`w = uniqueness_weights(labels["entry_index"].to_numpy(),
                       labels["exit_index"].to_numpy(), n_bars=len(bars))`}
      />

      <H2>Step 3 — purged walk-forward (the leakage firewall)</H2>
      <P>
        This is the step that separates real meta-labeling from leakage theatre. A label&apos;s outcome is only
        known <em>after</em> its horizon plays out. If a training window contains a label whose future overlaps
        the test window, the model has seen the answer. Two mechanisms prevent it:
      </P>
      <Ul>
        <Li><Strong>Purge</Strong> — drop any training label whose <Code>exit_time</Code> runs past the train-window boundary into the test period.</Li>
        <Li><Strong>Embargo</Strong> — additionally gap a buffer between train and test (≥ the label horizon) so nothing straddles the seam.</Li>
      </Ul>
      <P>
        <A href="/docs/api/ml">walk_forward_windows</A> yields those windows as <Code>.iloc</Code> positions; use
        it as the out-of-sample backtest, training on the rolling past and testing on the next block.
      </P>
      <CodeBlock
        code={`from edgekit.ml import walk_forward_windows, WalkForwardConfig, make_model
from edgekit.ml import best_threshold, ev_at

wf = WalkForwardConfig(train_days=180, test_hours=24 * 30, embargo_hours=48)  # embargo >= horizon
Xf = X.reindex(bars.index)          # feature row per candidate entry
oos_r = []

for win in walk_forward_windows(labels, wf):
    tr, te = labels.iloc[win["train_pos"]], labels.iloc[win["test_pos"]]
    Xtr = Xf.iloc[tr["entry_index"].to_numpy()]
    Xte = Xf.iloc[te["entry_index"].to_numpy()]

    m = make_model("hgb", params={"max_iter": 40, "max_depth": 3})
    m.fit(Xtr, tr["y"].to_numpy())
    thr, _ = best_threshold(m.predict_proba(Xtr), tr["r"].to_numpy(), min_trades=10)  # tune on TRAIN
    mean_r, n = ev_at(m.predict_proba(Xte), te["r"].to_numpy(), thr)                  # score on TEST
    oos_r.append((n, mean_r))`}
      />
      <Callout kind="note" title="Never tune the threshold on the test block">
        <A href="/docs/api/ml">best_threshold</A> picks the P-cutoff that maximises in-R expectancy — but only
        ever on the train/validation split. Reading it off the test block is the classic subtle leak. For
        hyperparameter selection <em>inside</em> a training window, <A href="/docs/api/ml">PurgedKFold</A> gives K
        contiguous-in-time folds with the same purge + embargo discipline.
      </Callout>

      <H2>Step 4 — the frozen meta-label</H2>
      <P>
        Once validated, fit a final model and wrap it in a <A href="/docs/api/ml">MetaLabeler</A>. It takes a
        trade only when <Code>P(win) ≥ threshold</Code> (default <Code>0.55</Code>). Built from a fitted
        estimator it exports the trees immediately and carries <em>no</em> sklearn dependency thereafter.
      </P>
      <CodeBlock
        code={`from edgekit.ml import MetaLabeler

m = make_model("hgb", params={"max_iter": 40, "max_depth": 3})
m.fit(Xf.iloc[labels["entry_index"].to_numpy()], labels["y"].to_numpy(), sample_weight=w)

meta = MetaLabeler(clf=m.estimator, threshold=0.55, feature_names=list(X.columns))
take = meta.take(X_live)          # boolean take/skip per candidate — no sklearn needed
proba = meta.proba(X_live)        # the P(win) scores`}
      />

      <H2>Step 5 — cloud-safe export for a cBot</H2>
      <P>
        A cTrader cloud cBot cannot import scikit-learn. edgekit serialises a fitted
        HistGradientBoosting model to a plain tree-array blob and generates pure-Python or pure-C# inference from
        it. The reference forward pass matches sklearn&apos;s <Code>predict_proba</Code> to within{" "}
        <Code>1e-6</Code> — the round-trip guarantee.
      </P>
      <CodeBlock
        code={`from edgekit.ml import export_trees, tree_predict_proba, emit_csharp, emit_python

blob = export_trees(m.estimator)                       # "<baseline>#<tree>|<tree>..."
# verify the round-trip before you trust the export
import numpy as np
assert abs(tree_predict_proba(blob, Xf.to_numpy()) - m.predict_proba(Xf)).max() < 1e-6

cs = emit_csharp({"orb_meta": blob}, feature_names=list(X.columns))   # drop into a cAlgo cBot
py = emit_python({"orb_meta": blob}, feature_names=list(X.columns))   # or a pure-Python runtime`}
      />
      <P>
        <Code>emit_csharp</Code> generates a self-contained static class (<Code>Predict(name, x)</Code>,{" "}
        <Code>Threshold</Code>) embedding the blob and a pure-C# tree walk; <Code>emit_python</Code> generates the
        equivalent numpy-free Python module (<Code>predict(name, x)</Code> / <Code>take(name, x)</Code>). No model
        files, no runtime dependency — the whole classifier is a string in your source.
      </P>

      <H2>Step 6 — the leakage null test</H2>
      <P>
        Before you believe any lift, prove the pipeline learns <em>nothing</em> from shuffled labels.{" "}
        <A href="/docs/api/ml">shuffle_label_gate</A> permutes the labels, refits, and confirms out-of-sample AUC
        collapses to ~0.5. If a model scores high on scrambled labels, there is a leak in the features or the
        split — fix it before reading any real result.
      </P>
      <CodeBlock
        code={`from edgekit.ml import shuffle_label_gate

gate = shuffle_label_gate(lambda: make_model("hgb", params={"max_iter": 40}),
                          Xf.iloc[labels["entry_index"].to_numpy()].to_numpy(),
                          labels["y"].to_numpy(), r=labels["r"].to_numpy(), n=10)
print(f"shuffled-label AUC {gate['mean_auc']:.3f}  (want ~0.50)  mean_ev {gate['mean_ev']:+.3f}R")`}
      />
      <Callout kind="danger" title="A high shuffled-label score means a leak, not an edge">
        Meta-labeling is where look-ahead bias hides best — future-peeking features, unpurged folds, thresholds
        tuned on test. If <Code>shuffle_label_gate</Code> returns an AUC meaningfully above 0.5, your model is
        reading information it will not have live. Every real result must sit on top of a passing shuffle gate.
      </Callout>

      <H2>Next</H2>
      <Ul>
        <Li><A href="/docs/api/ml">API · ml</A> — config, labeling, splits, features, models, metrics, export.</Li>
        <Li><A href="/docs/concepts/causality">Causality</A> — why purge + embargo exist.</Li>
        <Li><A href="/docs/api/strategy">API · strategy</A> — the ORB, the canonical meta-labeling primary signal.</Li>
        <Li><A href="/docs/guides/proving-an-edge">Proving an edge</A> — the gauntlet the meta-labelled strategy still has to pass.</Li>
      </Ul>
    </>
  );
}
