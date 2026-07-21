import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "Prop-firm sizing" };

export default function PropFirmPage() {
  return (
    <>
      <H1>Sizing for a prop-firm challenge</H1>
      <Lead>
        A validated edge is priced in R. A prop-firm challenge is priced in dollars, with a daily-loss limit and a
        max-drawdown limit that both hard-fail you. This guide bridges the two: build a daily-R stream, size it to
        a dual-constraint drawdown budget, then Monte-Carlo the actual challenge to a pass rate — and applies the
        honest forward haircut before you believe any of it.
      </Lead>

      <H2>Step 1 — from trades to a daily-R stream</H2>
      <P>
        Sizing operates on a <Strong>daily-R series</Strong>: one row per calendar day, holding that day&apos;s
        summed trade R, indexed by date. Days with no trades contribute 0.
      </P>
      <CodeBlock
        filename="size.py"
        code={`import edgekit as ek

# 'trades' is the canonical trade frame from a strategy that PASSED the gauntlet.
# Sizing is the step you only reach once the edge is real - never size an unproven one.
trades = strat.backtest(bars)
stats  = ek.trade_stats(trades.r.to_numpy(), dates=trades.date)

daily_r = trades.set_index("date").r.groupby(lambda t: t.normalize()).sum()
print(daily_r.describe())`}
      />

      <H2>Step 2 — size to a drawdown budget</H2>
      <P>
        <A href="/docs/api/sizing">sizing.size_to_dd</A> finds the single dollars-per-R scalar that makes the
        strategy&apos;s worst historical drawdown equal a fraction of the account — the drawdown budget. A 10%
        prop limit is usually sized to <Code>0.095</Code> to leave a buffer. When a{" "}
        <Code>daily_cap</Code> is also given (e.g. <Code>0.045</Code> under a 5% daily limit), it is a{" "}
        <Strong>dual-constraint</Strong> problem — the tighter of the two constraints binds and wins.
      </P>
      <CodeBlock
        code={`sz = ek.sizing.size_to_dd(daily_r, dd_budget=0.095, account=100_000, daily_cap=0.045)
print(f"\${sz['dollar_per_r']:,.0f}/R  binds on {sz['binding']}  max_dd_r={sz['max_dd_r']:.1f}")
# illustrative: $940/R  binds on max-dd  max_dd_r=9.9

daily_pnl = sz["sized"]           # the dollar P&L series, one value per day
ann_pct = daily_r.sum() * sz["dollar_per_r"] / stats["years"] / 100_000
print(f"{ann_pct:+.1%}/yr (backtest ceiling)")   # the sized ceiling, before the haircut`}
      />
      <P>The returned dict:</P>
      <Table
        head={["Key", "Meaning"]}
        rows={[
          [<Code key="s">sized</Code>, "the dollar P&L series after applying the scalar"],
          [<Code key="d">dollar_per_r</Code>, "dollars risked per 1R — the sizing decision"],
          [<Code key="b">binding</Code>, <span key="bs"><Code>&quot;max-dd&quot;</Code> or <Code>&quot;daily&quot;</Code> — which limit set the size</span>],
          [<Code key="m">max_dd_r</Code>, "the historical max drawdown in R the sizing was matched to"],
        ]}
      />
      <P>
        Here <Code>binding = &quot;max-dd&quot;</Code>: the 10% overall drawdown is the tighter constraint, so the
        daily cap has slack. If <Code>binding</Code> came back <Code>&quot;daily&quot;</Code>, the strategy has a
        lumpy worst-day and you are being throttled by the daily limit — a sign to smooth the P&L (fewer,
        smaller-risk trades) before you can use your full drawdown budget.
      </P>
      <Callout kind="tip" title="Size against the honest drawdown">
        The realised historical max drawdown is one lucky sample. For a conservative size, compute{" "}
        <Code>ek.validation.dd95(daily_r)</Code> — the 95th-percentile drawdown from a block-bootstrap — and size
        against that instead of the single path history happened to take.
      </Callout>

      <H2>Step 3 — simulate the actual challenge</H2>
      <P>
        A prop challenge is a <em>path</em> problem, not an average-return problem: you pass only if no path
        breaches the daily or max-loss limit before hitting the profit target. The only honest answer is
        Monte-Carlo over resampled paths. <A href="/docs/api/challenge">challenge.simulate</A> block-bootstraps
        the sized daily-P&L stream through a rules object and returns the fraction of paths that clear every
        phase.
      </P>
      <P>edgekit ships three real presets, all $100k accounts:</P>
      <Table
        head={["Preset", "phase_targets", "daily_loss", "max_loss", "min_days"]}
        rows={[
          [<Code key="a">FTMO_1STEP</Code>, "[10_000]", "5_000", "10_000", "4"],
          [<Code key="b">CFT_2PHASE</Code>, "[8_000, 5_000]", "5_000", "10_000", "4"],
          [<Code key="c">BRIGHTFUNDED</Code>, "[8_000, 5_000]", "5_000", "10_000", "3"],
        ]}
      />
      <CodeBlock
        code={`from edgekit import challenge

rate = challenge.simulate(daily_pnl, challenge.FTMO_1STEP)
print(f"FTMO 1-step pass rate: {rate:.0%}")

# distribution of how long a pass takes, over the paths that pass
d = challenge.days_to_pass(daily_pnl, challenge.BRIGHTFUNDED)
print(f"pass {d['pass_rate']:.0%}  median {d['median']:.0f} days  "
      f"p25 {d['p25']:.0f}  p75 {d['p75']:.0f}")`}
      />
      <P>
        <Code>simulate</Code> returns a single pass-rate float; <Code>days_to_pass</Code> returns{" "}
        <Code>median, p25, p75, mean, pass_rate, n_pass</Code>. Both take <Code>daily_pnl_dollars</Code> — P&L{" "}
        <em>after</em> sizing, in dollars — because the breach limits are absolute dollars. The block bootstrap
        (default <Code>block=5</Code>) keeps losing streaks intact; i.i.d. resampling would understate the risk of
        a bad run tripping the daily limit.
      </P>
      <Callout kind="note" title="Build a custom rules object">
        Any evaluation fits the same dataclass:{" "}
        <Code>challenge.ChallengeRules(account=50_000, phase_targets=[4_000], daily_loss=2_500, max_loss=5_000, min_days=5)</Code>.
        Presets are just pre-filled instances.
      </Callout>

      <H2>Sizing overlays — governing the equity path</H2>
      <P>
        <Code>size_to_dd</Code> sets a constant dollars-per-R. On top of that, the <A href="/docs/api/sizing">sizing</A>{" "}
        module has path-dependent governors that press or cut risk as the equity curve moves. They take a return /
        P&L series and return a scaled one:
      </P>
      <Table
        head={["Overlay", "What it does", "Use when"]}
        rows={[
          [<Code key="rp">risk_parity(M)</Code>, "inverse-vol weights across a book of R-streams", "combining multiple strategies"],
          [<Code key="vt">vol_target(port, cap=1.5)</Code>, "scale toward constant volatility, leverage-capped", "smoothing a single lumpy book"],
          [<Code key="c">cppi(pnl, account, mstop)</Code>, "risk in proportion to the cushion above a trailing floor", "aggressive challenge push with a hard floor"],
          [<Code key="dt">dd_throttle(ret, thresh=0.04)</Code>, "halve risk while more than 4% below peak", "surviving drawdowns during an evaluation"],
        ]}
      />
      <CodeBlock
        code={`# example: throttle risk 50% whenever the curve is >4% below its high-water mark
returns = daily_pnl / 100_000
throttled = ek.sizing.dd_throttle(returns, thresh=0.04, factor=0.5)

# or a CPPI cushion for an aggressive challenge run with a 10% floor
cppi_pnl = ek.sizing.cppi(daily_pnl, account=100_000, mstop=0.10, slope=2.0, cap=1.5)
rate = challenge.simulate(cppi_pnl, challenge.CFT_2PHASE)`}
      />

      <Callout kind="warn" title="The forward haircut is not optional">
        A drawdown-matched backtest is a <Strong>ceiling</Strong>, not an expectation. The number you plan around
        is roughly <Code>0.85 ×</Code> the sized backtest return: forward slippage, regime drift, and the simple
        fact that you optimised <em>toward</em> this history all eat into it. edgekit&apos;s reports carry this
        haircut explicitly — never quote the ceiling as if it were the plan.
      </Callout>

      <H2>Next</H2>
      <Ul>
        <Li><A href="/docs/api/sizing">API · sizing</A> — size_to_dd, vol_target, cppi, dd_throttle, risk_parity, hrp.</Li>
        <Li><A href="/docs/api/challenge">API · challenge</A> — presets, simulate, days_to_pass, ChallengeRules.</Li>
        <Li><A href="/docs/guides/reports">Reports &amp; charts</A> — render the Challenge / Live / Realistic trio.</Li>
        <Li><A href="/docs/guides/proving-an-edge">Proving an edge</A> — do this first; never size an unproven edge.</Li>
      </Ul>
    </>
  );
}
