import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.challenge" };

export default function ChallengePage() {
  return (
    <>
      <H1>edgekit.challenge</H1>
      <Lead>
        Prop-firm challenge simulation. A prop challenge is a <em>path</em> problem, not an average-return problem, so
        the only honest answer is Monte-Carlo over resampled paths. Both entry points take{" "}
        <Code>daily_pnl_dollars</Code> (P&amp;L <em>after</em> sizing, dollars per day) so the breach limits are absolute
        dollars.
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> The <Code>ChallengeRules</Code> dataclass and three presets
        (<Code>FTMO_1STEP</Code>, <Code>CFT_2PHASE</Code>, <Code>BRIGHTFUNDED</Code>), plus two Monte-Carlo entry points:{" "}
        <Code>simulate</Code> (the pass rate) and <Code>days_to_pass</Code> (the distribution of days to clear all
        phases). Both use a block-bootstrap (not i.i.d.) so losing streaks stay intact and the breach probability is honest.
      </P>

      <H2>ChallengeRules (frozen dataclass)</H2>
      <P>A prop-firm evaluation&apos;s hard constraints, all in account dollars.</P>
      <CodeBlock code={`ChallengeRules(account: float, phase_targets: list[float], daily_loss: float,
               max_loss: float, min_days: int = 4)`} />
      <Table
        head={["Field", "Type", "Meaning"]}
        rows={[
          [<Code key="a">account</Code>, "float", "Account size in dollars."],
          [<Code key="b">phase_targets</Code>, "list[float]", "Profit target per phase in dollars ([10_000] = single phase; [8_000, 5_000] = two phases)."],
          [<Code key="c">daily_loss</Code>, "float", "Positive daily-loss limit in dollars."],
          [<Code key="d">max_loss</Code>, "float", "Positive overall max-loss limit in dollars."],
          [<Code key="e">min_days</Code>, "int (default 4)", "Minimum active days before a phase may be marked passed."],
        ]}
      />

      <H3>Presets</H3>
      <P>All three are $100k accounts with dollar limits, encoding each firm&apos;s published rules.</P>
      <Table
        head={["Preset", "phase_targets", "daily_loss", "max_loss", "min_days"]}
        rows={[
          [<Code key="a">FTMO_1STEP</Code>, "[10_000]", "5_000", "10_000", "4"],
          [<Code key="b">CFT_2PHASE</Code>, "[8_000, 5_000]", "5_000", "10_000", "4"],
          [<Code key="c">BRIGHTFUNDED</Code>, "[8_000, 5_000]", "5_000", "10_000", "3"],
        ]}
      />
      <CodeBlock code={`from edgekit import challenge
challenge.FTMO_1STEP     # ChallengeRules(account=100_000, phase_targets=[10_000], daily_loss=5_000, max_loss=10_000, min_days=4)
challenge.CFT_2PHASE     # two phases: [8_000, 5_000]
challenge.BRIGHTFUNDED   # two phases, min_days=3

# a custom rule set
rules = challenge.ChallengeRules(account=50_000, phase_targets=[4_000], daily_loss=2_500, max_loss=5_000)`} />

      <H2>simulate</H2>
      <P>Block-bootstrap pass rate for a sized daily-P&amp;L stream through the rules — the fraction of <Code>n</Code> Monte-Carlo paths that clear every phase without breaching the daily-loss or max-loss limits.</P>
      <CodeBlock code={`simulate(daily_pnl_dollars, rules: ChallengeRules, n: int = 12000,
         rng=None, block: int = 5, phase_days: int = 400) -> float`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">daily_pnl_dollars</Code>, "pd.Series", "—", "Sized P&L per day, in dollars (breach limits are absolute)."],
          [<Code key="b">rules</Code>, "ChallengeRules", "—", "The evaluation's constraints (or a preset)."],
          [<Code key="c">n</Code>, "int", "12000", "Number of Monte-Carlo paths."],
          [<Code key="d">rng</Code>, "Generator | None", "None", "Seeded generator for reproducibility."],
          [<Code key="e">block</Code>, "int", "5", "Block length for the bootstrap (keeps losing streaks intact)."],
          [<Code key="f">phase_days</Code>, "int", "400", "Max days allowed per phase before the path is abandoned."],
        ]}
      />
      <P>Returns a <Code>float</Code> pass rate in <Code>[0, 1]</Code>.</P>
      <CodeBlock
        filename="simulate.py"
        code={`import numpy as np, pandas as pd
from edgekit import challenge

# sized daily P&L (dollars/day) — e.g. from sizing.size_to_dd(...)["sized"]
idx = pd.date_range("2020-01-01", periods=400, freq="D")
daily_pnl = pd.Series(np.random.default_rng(0).normal(700.0, 200.0, 400), index=idx)

rate = challenge.simulate(daily_pnl, challenge.FTMO_1STEP, n=12000)
print(f"pass rate = {rate:.1%}")`}
      />

      <H2>days_to_pass</H2>
      <P>Distribution of days-to-pass (all phases) over the paths that pass — how long a successful attempt typically takes.</P>
      <CodeBlock code={`days_to_pass(daily_pnl_dollars, rules: ChallengeRules, n: int = 12000,
             rng=None, block: int = 5, phase_days: int = 400) -> dict`} />
      <P>Returns a dict:</P>
      <Ul>
        <Li><Code>median</Code> — median days-to-pass (NaN if nothing passes).</Li>
        <Li><Code>p25</Code>, <Code>p75</Code> — 25th / 75th percentile days.</Li>
        <Li><Code>mean</Code> — mean days-to-pass.</Li>
        <Li><Code>pass_rate</Code> — fraction of paths that passed.</Li>
        <Li><Code>n_pass</Code> — count of passing paths.</Li>
      </Ul>
      <CodeBlock code={`d = challenge.days_to_pass(daily_pnl, challenge.CFT_2PHASE)
print(d["median"], d["p25"], d["p75"], d["pass_rate"])`} />
      <Callout kind="warn" title="Feed it the SIZED stream, not raw R">
        Both functions expect dollars-per-day <em>after</em> sizing, because the breach limits are absolute dollars.
        Passing a raw R-stream (or an unsized dollar stream) makes the daily-loss and max-loss checks meaningless. Size
        first with <A href="/docs/api/sizing">sizing.size_to_dd</A>, then simulate.
      </Callout>

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/sizing">edgekit.sizing</A> — produce the sized dollar stream these functions consume.</Li>
        <Li><A href="/docs/api/portfolio">edgekit.portfolio</A> — build the combined book you then size and simulate.</Li>
        <Li><A href="/docs/api/report">edgekit.report</A> — turn the pass rate into a Challenge / Live / Realistic report suite.</Li>
      </Ul>
    </>
  );
}
