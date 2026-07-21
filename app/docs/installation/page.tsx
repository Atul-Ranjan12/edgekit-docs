import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Table, Code } from "@/components/prose";

export const metadata: Metadata = { title: "Installation" };

export default function InstallationPage() {
  return (
    <>
      <H1>Installation</H1>
      <Lead>
        edgekit is a source install: a small numpy + pandas core that always imports, plus opt-in extras
        for the heavy dependencies. Install the lean core in seconds, or pull everything with{" "}
        <Code>{`"[all]"`}</Code>.
      </Lead>

      <P>
        edgekit is not on PyPI yet. You install it editable (<Code>-e</Code>) from a local checkout at{" "}
        <Code>~/Documents/edgekit</Code>, so edits to the source are picked up without a reinstall. It
        requires <Strong>Python 3.10 or newer</Strong>.
      </P>

      <H2>Editable install</H2>
      <P>
        From the repository root, pick the extras you need. The <Code>-e</Code> flag makes it an editable
        (development) install; the bracketed name after the dot selects{" "}
        <A href="#extras">optional-dependency groups</A>.
      </P>

      <CodeBlock
        lang="bash"
        code={`cd ~/Documents/edgekit

pip install -e ".[all]"      # everything: io + viz + ml + dev
pip install -e .             # lean core only: numpy + pandas`}
      />

      <P>
        The lean install is enough to load bars, run a causal backtest, compute trade stats, and run the
        permutation test — the whole prove-or-kill loop lives in the numpy + pandas core. You only need
        extras for parquet I/O, charts/HTML reports, or the ML layer.
      </P>

      <CodeBlock
        lang="bash"
        code={`pip install -e ".[viz]"          # + matplotlib (charts + HTML reports)
pip install -e ".[ml]"           # + scikit-learn / xgboost / lightgbm
pip install -e ".[io]"           # + pyarrow (parquet caches + splits)
pip install -e ".[viz,ml]"       # combine groups with a comma`}
      />

      <H2 id="extras">The extras</H2>
      <P>
        Each extra is a group in <Code>pyproject.toml</Code>. <Code>[all]</Code> is simply the union of
        the four. Install only what a given piece of work touches — a research script that never draws a
        chart does not need matplotlib.
      </P>

      <Table
        head={["Extra", "Pulls in", "Unlocks"]}
        rows={[
          [
            <Code key="io">[io]</Code>,
            "pyarrow ≥ 12",
            <>Parquet: <Code key="lb">data.load_bars</Code> on <Code key="pq">.parquet</Code> splits and <Code key="hc">data.hashed_parquet_cache</Code>.</>,
          ],
          [
            <Code key="viz">[viz]</Code>,
            "matplotlib ≥ 3.7",
            <>The <Code key="v">viz</Code> charts (equity, drawdown, monthly heatmap, MC fan) and every <Code key="r">report</Code> HTML page.</>,
          ],
          [
            <Code key="ml">[ml]</Code>,
            "scikit-learn ≥ 1.3, xgboost ≥ 2.0, lightgbm ≥ 4.0",
            <>The <Code key="m">ml</Code> layer: triple-barrier labels, purged walk-forward, models, meta-labeling, cloud-safe tree export.</>,
          ],
          [
            <Code key="dev">[dev]</Code>,
            "pytest ≥ 7.4, pytest-cov ≥ 4.1, ruff ≥ 0.4",
            "The test suite and linter — for working on edgekit itself.",
          ],
          [
            <Code key="all">[all]</Code>,
            "all four groups above",
            "Everything. The one to install if you are unsure.",
          ],
        ]}
      />

      <Callout kind="note" title="Heavy deps load lazily">
        <Code>import edgekit</Code> only ever needs numpy + pandas — it never imports matplotlib,
        scikit-learn, xgboost or pyarrow at import time. Those are imported <em>inside</em> the functions
        that use them, so a missing extra surfaces as a clear error (<Code>pip install
        edgekit[viz]</Code>) only when you call the code that needs it — not when you <Code>import</Code>{" "}
        the package. You can do the entire load → backtest → prove loop on the lean core.
      </Callout>

      <H2>Verify the install</H2>
      <P>
        Confirm the package imports and reports its version. This works on the lean core with no extras:
      </P>

      <CodeBlock
        lang="bash"
        code={`python -c "import edgekit as ek; print(ek.__version__)"
# 0.1.0`}
      />

      <P>
        If you installed <Code>[dev]</Code> (or <Code>[all]</Code>), run the suite from the repo root. All
        99 tests should pass — the load-bearing ones are the causality property tests (perturb a future
        bar, assert the past doesn&apos;t move), the statistical-validity checks (a no-edge strategy must not
        score significant), and the tree-export round-trip (cloud-safe inference matches scikit-learn to 1e-6).
      </P>

      <CodeBlock
        lang="bash"
        code={`pytest            # 99 passed`}
      />

      <Callout kind="tip" title="Use it from another project">
        A separate project can install edgekit the same way, from its own checkout:{" "}
        <Code>pip install -e ../edgekit</Code>. New research is written against edgekit; the R-multiple is
        the shared currency and causality is a tested property on both sides.
      </Callout>

      <H2>Next</H2>
      <Ul>
        <Li><A href="/docs/quickstart">Quickstart</A> — your first validated backtest, step by step.</Li>
        <Li><A href="/docs/pipeline">The pipeline</A> — load → backtest → prove → size → ship, stage by stage.</Li>
        <Li><A href="/docs/concepts/gauntlet">The validation gauntlet</A> — why a good backtest is where skepticism starts.</Li>
        <Li><A href="/docs/api">API reference</A> — every public function, module by module.</Li>
      </Ul>
    </>
  );
}
