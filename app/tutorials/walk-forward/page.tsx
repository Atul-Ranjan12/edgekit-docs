import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table, Code } from "@/components/prose";
import { Math } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Walk-forward analysis" };

export default function Page() {
  return (
    <>
      <H1>Walk-forward analysis</H1>
      <Lead>
        An edge that only exists on the data you fitted it to is not an edge — it is a memory. Walk-forward analysis is
        the discipline of always testing on data the strategy has never seen, in the order it actually arrived. This
        chapter covers in-sample vs out-of-sample, the danger of tuning on everything, rolling re-optimisation, and why
        purging and embargoing are non-negotiable when labels overlap.
      </Lead>

      <P>
        The intuition is the one every teacher knows: if you let students see the exam before it counts, everyone
        scores 100 and the grade means nothing. A strategy tuned on the same data you then report is a student who
        already saw the exam. Walk-forward is the discipline of keeping a sealed exam — data the strategy has never
        touched — and grading only on that, in the order time actually delivered it. The number that survives is the
        one you can expect to repeat live; the tuned-on-everything number is the leaked exam.
      </P>

      <H2>In-sample vs out-of-sample</H2>
      <P>
        Split your history at a date. Everything before is <Strong>in-sample</Strong> (IS) — the data you are allowed to
        look at, tune on, stare at. Everything after is <Strong>out-of-sample</Strong> (OOS) — data you touch exactly
        once, to measure. The moment you use the OOS block to make a decision, it becomes in-sample, and you have no
        clean test left.
      </P>
      <Math>{"\\underbrace{r_1, \\dots, r_k}_{\\text{in-sample (tune here)}} \\;\\Big|\\; \\underbrace{r_{k+1}, \\dots, r_T}_{\\text{out-of-sample (measure here, once)}}"}</Math>
      <P>
        edgekit gives you two cuts. <A href="/docs/api/validation">oos_split</A> makes a hard calendar cut into
        date-indexed IS/OOS slices; <A href="/docs/api/validation">is_oos_split</A> makes a positional chronological cut
        at a fraction — no shuffle, preserving time&apos;s arrow.
      </P>
      <CodeBlock
        filename="oos.py"
        code={`import edgekit as ek
import numpy as np

# calendar cut — measure IS -> OOS Sharpe degradation
in_sample, out_of_sample = ek.validation.oos_split(df, cut="2023-01-01")

# positional cut at a fraction (chronological, no shuffle)
a, b = ek.validation.is_oos_split(np.arange(100), frac=0.55)   # len 55 / 45`}
      />
      <Callout kind="tip" title="Scenario — the edge that halved out of sample">
        You tune a Donchian breakout on BTCUSDT over 2019–2022: you sweep the channel length, land on 55 bars, and it
        prints Sharpe 1.4 in that window. Feels like an edge. Now you run it — untouched — on the sealed 2023–2025
        block. Sharpe comes in at 0.7. Half the edge evaporated. That is not necessarily failure: some decay is
        expected (2019–2022 included the choice of &quot;55&quot;, so it was always flattered). The question is
        <em> how much</em> decayed. A drop from 1.4 to 0.7 is survivable edge-decay you can haircut for; a drop from
        1.4 to 0.1 is a leaked-exam collapse — you fitted 2019–2022&apos;s noise and there was never an edge to carry
        forward. Same test, and the size of the gap is the whole verdict.
      </Callout>
      <Callout kind="warn" title="Never shuffle a time series before splitting">
        Random train/test splits are correct for i.i.d. data and catastrophic for time series. Shuffling lets the model
        train on the future and test on the past — a leak that guarantees an OOS number you can never reproduce live.
        Splits must respect the arrow of time.
      </Callout>

      <H2>The danger of tuning on all the data</H2>
      <P>
        Suppose you sweep a parameter over the whole history and pick the value with the best Sharpe. That Sharpe is now
        an <em>in-sample</em> number for the entire dataset — you have no data left that the choice did not see. This is
        the most seductive form of overfitting because it does not feel like cheating: you ran one honest backtest per
        value. But the <em>selection</em> used all the data, so the winner is partly fitted to noise, and its forward
        performance will disappoint by the amount of that noise.
      </P>
      <P>
        The only cure is to make the selection itself out-of-sample: choose parameters on the past and measure on a
        future the choice could not have seen. That is walk-forward.
      </P>

      <H2>Walk-forward optimisation</H2>
      <P>
        Walk-forward slides a train/test window through time. On each fold, fit or select the configuration on the
        training window, then apply it — unchanged — to the immediately following test window. Concatenate the test
        blocks and you have a fully out-of-sample track record built the way you would actually have traded it: decide
        on the past, live with it on the future, roll forward.
      </P>
      <ChartFigure
        name="tut/walk_forward_split"
        alt="Rolling train and test windows advancing through time, each test block following its train block"
        caption="Walk-forward: each fold fits on its train window and is measured on the next, unseen block. The test blocks concatenate into an honest OOS record."
      />
      <P>
        edgekit&apos;s <A href="/docs/api/validation">walk_forward</A> has two modes, selected by <Code>refit</Code>:
      </P>
      <Ul>
        <Li>
          <Strong><Code>refit=False</Code></Strong> (the honest default) — split one strategy&apos;s returns into{" "}
          <Code>k</Code> consecutive blocks and check each is positive. An edge should be spread across time, not
          concentrated in one lucky block.
        </Li>
        <Li>
          <Strong><Code>refit=True</Code></Strong> — expanding-window re-optimisation across a config matrix: pick the
          in-sample-best config up to each fold, apply it to the next. If the picked config <em>drifts</em> fold to
          fold, that instability is an overfit smell.
        </Li>
      </Ul>
      <CodeBlock
        filename="walk_forward.py"
        code={`import edgekit as ek

# sequential blocks: is the edge positive in each period, not just overall?
out = ek.validation.walk_forward(daily_r, k=6, refit=False)
print(out["n_positive"], "of", out["k"], "blocks positive")
for b in out["blocks"]:
    print(b["sharpe"], b["total"], b["positive"])

# expanding re-optimisation: does the picked config stay stable OOS?
wf = ek.validation.walk_forward(M, cfgs=list("abcdefgh"), k=6, refit=True)
print(wf["oos_sharpe"], wf["picks"], wf["stable"])`}
      />
      <P>
        <Strong>Scenario.</Strong> You run <Code>refit=True</Code> across six folds on a US100 ORB, letting each fold
        pick the best opening-range length from <Code>{"{15, 30, 45, 60}"}</Code>. Case A: the picks come back{" "}
        <Code>[30, 30, 45, 30, 30, 45]</Code> — the system keeps choosing ~30–45 minutes, so &quot;a 30-minute range
        means something&quot; is a real statement and the concatenated OOS Sharpe is trustworthy. Case B: the picks are{" "}
        <Code>[15, 60, 30, 60, 15, 45]</Code> — every fold crowns a different winner because it is chasing whatever fit
        that window&apos;s noise. Case B can still show a decent average OOS number, but the drifting{" "}
        <Code>picks</Code> tell you there is no stable parameter underneath — you are watching an overfit happen in slow
        motion.
      </P>
      <Callout kind="tip" title="Config drift is a smell">
        In refit mode, watch <Code>picks</Code>. If every fold selects roughly the same configuration, the edge is
        stable and the parameter means something. If the choice jumps around, you are chasing noise — the walk-forward
        just made a slow-motion overfit visible.
      </Callout>

      <H2>Purged and embargoed cross-validation</H2>
      <P>
        A subtler leak appears when your labels <em>overlap in time</em> — which they always do in ML meta-labelling,
        where each trade&apos;s outcome resolves over a horizon of future bars. If a training label&apos;s outcome
        window overlaps the test window, information from the test period leaks backward into training. Standard k-fold
        cross-validation, which ignores time, leaks badly here.
      </P>
      <H3>Purging</H3>
      <P>
        <Strong>Purge</Strong> from the training set any label whose outcome window overlaps the test set&apos;s time
        span. A label opened just before the test block but resolving inside it knows the test period&apos;s outcome —
        drop it.
      </P>
      <H3>Embargo</H3>
      <P>
        Even after purging, serial correlation can leak across the train/test boundary. An <Strong>embargo</Strong> is
        a gap — at least as long as the label horizon — inserted after the training window so no train label&apos;s
        outcome can resolve inside the test window:
      </P>
      <Math>{"\\text{embargo} \\;\\ge\\; \\text{label horizon}"}</Math>
      <P>
        This is the firewall. edgekit&apos;s ML stack builds it in: <A href="/docs/api/ml">walk_forward_windows</A> keeps
        a train label only if its <Code>exit_time</Code> falls at or before the embargoed train-window end, and{" "}
        <A href="/docs/api/ml">PurgedKFold</A> purges train labels whose horizon overlaps the validation fold plus an
        embargo tail.
      </P>
      <CodeBlock
        filename="purged.py"
        code={`import edgekit as ek

# rolling OOS windows with purge + embargo (embargo_hours >= label horizon)
wf = ek.ml.WalkForwardConfig(train_days=7, test_hours=8, embargo_hours=6)
for w in ek.ml.walk_forward_windows(labels, wf):
    tr, te = labels.iloc[w["train_pos"]], labels.iloc[w["test_pos"]]
    # fit on tr, predict te — no train outcome resolves inside the embargo

# purged k-fold for hyperparameter selection inside a training window
for train, val in ek.ml.PurgedKFold(n_splits=4, embargo_frac=0.02).split(labels):
    ...`}
      />
      <Callout kind="warn" title="The embargo must cover the horizon">
        If the embargo is shorter than the label horizon, a training label&apos;s barrier can still resolve inside the
        test window — the leak the whole apparatus exists to prevent. Set <Code>embargo_hours</Code> ≥ your label
        horizon and never shorten it to &quot;get more training data&quot;.
      </Callout>

      <H2>What a passing walk-forward looks like</H2>
      <Table
        head={["Signal", "Healthy", "Overfit"]}
        rows={[
          ["OOS blocks positive", "most of k blocks positive", "one block carries everything"],
          ["IS -> OOS Sharpe", "modest degradation", "collapse (e.g. 1.5 -> 0.1)"],
          ["Refit config picks", "stable across folds", "jumps fold to fold"],
          ["Bad-regime block", "small profit or small loss", "large loss it never saw in-sample"],
        ]}
      />
      <P>
        Some IS→OOS degradation is normal and expected — that is the edge-decay the honest forward projection accounts
        for. A <em>collapse</em>, or an edge that lives in a single block, is the tell that you fitted noise.
      </P>

      <P>
        <Strong>Next:</Strong>{" "}
        <A href="/tutorials/overfitting-detection">Overfitting detection</A> — parameter plateaus, PBO via CSCV,
        and the deflated Sharpe that corrects for how many times you tried.
      </P>
    </>
  );
}
