import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Capstone: end-to-end research" };

export default function Page() {
  return (
    <>
      <H1>Capstone: end-to-end research</H1>
      <Lead>
        Every chapter in this series exists to serve one workflow: take an idea, make it concrete, and try as hard as
        you can to disprove it before a single dollar is at risk. Here we run that workflow start to finish on one
        strategy — the bare opening-range breakout — from hypothesis, through the backtest, through the full gauntlet,
        to a verdict. The verdict, as it should be most of the time, is <Strong>reject</Strong>. Learning to reach that
        conclusion cleanly and without regret is the entire point.
      </Lead>

      <Callout kind="note" title="Why walk a losing strategy end to end?">
        Because the process is the product. A tutorial that ended in a winner would teach you to trust backtests; this
        one teaches you to break them. The ORB is famous, intuitive, and <em>looks</em> tradeable — the perfect
        specimen to watch the gauntlet reject. If your own research ends in rejection nine times out of ten, the
        machine is working.
      </Callout>

      <P>
        Picture the real starting point. You saw the opening-range breakout in a forum thread with a gorgeous equity
        screenshot, and something in you <em>wants</em> it to be true. That wanting is the adversary, and everything
        below exists to overrule it. We meet the ORB exactly as you would on a Monday morning — an intuitive idea and a
        hunch — and then spend the chapter trying to kill it, because the only edge you can trust is one that refused to
        die. Watch each step as a fresh attempt on its life, and watch the verdict arrive not from opinion but from a
        number the strategy cannot argue with.
      </P>

      <H2>Step 1 — The idea and the hypothesis</H2>
      <P>
        <Strong>The idea.</Strong> Markets that break out of their opening range tend to keep going — the first 30
        minutes of a session set a reference, and a decisive break of that range is a commitment of order flow that
        continues into the session. So: buy a break of the range high, sell a break of the low, stop at the opposite
        edge, target 2R, flatten at the close. One trade per day.
      </P>
      <P>
        <Strong>The hypothesis, stated as something falsifiable.</Strong> The breakout&apos;s entry timing captures a
        real, persistent tendency that pays more than it costs to trade. In expectancy terms we need{" "}
        <MathInline>{"E[R] = p\\,W - (1-p)\\,L > 0"}</MathInline> <em>after</em> costs, and we need it to be
        distinguishable from what random data would produce. Both halves have to hold. A prior that is merely
        plausible is not an edge; the job now is to attack it.
      </P>

      <H2>Step 2 — Load the data</H2>
      <P>
        Real Nasdaq (US100) M1 bars, restricted to the regular cash session so the &quot;opening range&quot; means what
        we think it means. <A href="/docs/api/data">ek.data</A> loads and masks the session in two lines.
      </P>
      <CodeBlock
        filename="capstone.py"
        code={`import edgekit as ek

bars = ek.data.load_bars("US100_M1.csv")
rth  = bars[ek.data.rth_mask(bars.index, start="09:30", end="16:00", tz="America/New_York")]
print(f"{len(bars):,} bars loaded | {len(rth):,} in the regular session")`}
      />

      <H2>Step 3 — Build the strategy</H2>
      <P>
        The <A href="/docs/api/strategy">ORB</A> class is the naive, unfiltered version — no meta-label, no regime
        gate — which is exactly what you want to stress-test first. The stop sits at the opposite edge of the opening
        range, so the range width <em>is</em> 1R.
      </P>
      <CodeBlock
        filename="capstone.py"
        code={`orb = ek.strategy.ORB(or_bars=30, target_r=2.0)   # 30-min opening range, 2R target`}
      />

      <H2>Step 4 — Backtest and read the metrics</H2>
      <P>
        Run the R-multiple bar loop and summarise with <A href="/docs/api/metrics">ek.trade_stats</A>. Pass a small
        intraday <Code>warmup</Code> and <Code>bars_per_day=390</Code> (a 6.5-hour session in minutes).
      </P>
      <CodeBlock
        filename="capstone.py"
        code={`trades = orb.backtest(rth, warmup=5, bars_per_day=390)
stats  = ek.trade_stats(trades.r, dates=trades.date)
print(f"{stats['n']} trades | win {stats['win_rate']:.0%} | "
      f"PF {stats['pf']:.2f} | EV {stats['ev_r']:+.3f}R")
# -> 2666 trades | win 39% | PF 0.71 | EV -0.214R`}
      />
      <P>
        The very first honest number is already damning: <MathInline>{"\\text{PF} = 0.71"}</MathInline> is below one,
        so the strategy loses money net of cost, and expectancy is <MathInline>{"-0.214\\,R"}</MathInline> per trade.
        With 2,666 trades this is well-powered — not a small-sample fluke. Look at the equity curve and the drawdown
        together and there is nothing to defend: it grinds down.
      </P>
      <ChartFigure name="equity_with_drawdown" alt="ORB cumulative equity and drawdown" caption="Net-of-cost cumulative R with drawdown. A well-powered downhill grind — the hypothesis is already in trouble." />
      <Callout kind="tip" title="A negative headline can stop you here — but finish the diagnosis">
        You could reject on the backtest alone. We still run the gauntlet, because the interesting lesson is why a
        strategy with genuinely non-random entry timing is nonetheless untradeable — and only the gauntlet tells the
        two apart.
      </Callout>

      <H2>Step 5 — Run the gauntlet</H2>
      <P>
        The steps run in order, cheapest-decisive first, and you <Strong>stop believing at the first failure</Strong>.
        See <A href="/tutorials/the-gauntlet">the gauntlet chapter</A> for the full nine-step battery; here are the
        four that decide this case.
      </P>

      <H3>Permutation test — is the timing real?</H3>
      <P>
        Destroy the market&apos;s serial structure while keeping its return distribution exactly, re-run the strategy
        on each synthetic series, and ask how often random data matches or beats the real total R. The p-value is
      </P>
      <Math>{"p = \\frac{1 + \\#\\{s^*_i \\ge s\\}}{N + 1}"}</Math>
      <CodeBlock
        filename="capstone.py"
        code={`import pandas as pd
o, h, l, c = (rth[x].to_numpy(float) for x in ("open", "high", "low", "close"))
idx = rth.index

def null_stat(rng):
    po, ph, pl, pc = ek.validation.permute_ohlc(o, h, l, c, rng)
    sh = pd.DataFrame({"open": po, "high": ph, "low": pl, "close": pc}, index=idx)
    t = orb.backtest(sh, warmup=5, bars_per_day=390)
    return float(t.r.sum()) if len(t) else 0.0

p = ek.validation.mcpt(float(trades.r.sum()), null_stat, n=200)
print(f"permutation p = {p:.3f}")`}
      />
      <P>
        Here is the subtle, honest result that makes the ORB such a good teaching case: the permutation p is{" "}
        <em>low</em>. On permuted bars the first-touch breakout whipsaws and loses <em>even more</em>, so the real
        strategy&apos;s (still negative) total R sits in the better tail of the null. The entry timing is genuinely
        non-random. But the permutation test only asks &quot;is the timing structure real?&quot; — it does not ask
        &quot;does this beat the spread?&quot;. Beating a coin flip is not an edge.
      </P>
      <ChartFigure name="permutation_hist" alt="Null distribution of total R under permuted bars, with the real result marked" caption="The real total R sits in the favourable tail of the null — timing is non-random — yet it is still negative. Real structure, no tradeable edge." />

      <H3>Cost stress ×1/2/3 — the decisive gate here</H3>
      <P>
        A real edge degrades <em>gracefully</em> as costs rise; a fake one collapses. Re-run at each multiplier.
      </P>
      <CodeBlock
        filename="capstone.py"
        code={`for m in (1.0, 2.0, 3.0):
    t = orb.backtest(rth, cost=ek.CostModel().scaled(m), warmup=5, bars_per_day=390)
    s = ek.trade_stats(t.r)
    print(f"  {m:.0f}x -> PF {s['pf']:.2f}  EV {s['ev_r']:+.3f}R")
# 1x -> PF 0.71  EV -0.214R
# 2x -> PF 0.45  EV -0.500R
# 3x -> PF 0.29  EV -0.786R`}
      />
      <P>
        The profit factor never clears 1 — not even at nominal cost — and falls off a cliff as cost escalates. This is
        the gate the ORB dies at: the faint real tendency the permutation test detected is more than eaten by the
        transaction cost. The strategy fails the survivor rule (PF &gt; 1 at 2× and 3×) at every level.
      </P>
      <ChartFigure name="cost_sensitivity" alt="ORB profit factor collapsing as trading cost is escalated" caption="PF 0.71 / 0.45 / 0.29 at 1x / 2x / 3x cost. Below one everywhere, degrading fast — the definition of cost-killed." />

      <H3>Walk-forward — does it hold across regimes?</H3>
      <P>
        A strategy that dies at the cost gate does not <em>earn</em> a walk-forward — but for completeness, the honest
        sequential-block test asks whether the (net) edge is positive in each consecutive period. A negative-expectancy
        strategy is unsurprisingly negative in most blocks.
      </P>
      <CodeBlock
        filename="capstone.py"
        code={`daily = ek.viz.trades_to_daily(trades)                 # net R per calendar day
wf = ek.validation.walk_forward(daily, k=6, refit=False)
print(wf["n_positive"], "of", wf["k"], "blocks positive")`}
      />

      <H3>Is it just beta?</H3>
      <P>
        The last false-positive to rule out: is any apparent return really just leveraged exposure to the underlying?
        Regress the strategy&apos;s daily returns on buy-and-hold — <Code>beta</Code> is the exposure slope,{" "}
        <Code>alpha</Code> the annualised residual.
      </P>
      <CodeBlock
        filename="capstone.py"
        code={`bh = rth["close"].resample("1D").last().pct_change().dropna()
out = ek.validation.is_it_beta(daily, bh.reindex(daily.index).fillna(0.0), periods_per_year=252)
print(f"beta {out['beta']:+.2f}  alpha {out['alpha']:+.2%}/yr")
# a negative-expectancy intraday breakout produces no positive alpha to bank`}
      />

      <H2>The verdict — REJECT</H2>
      <P>
        Assemble the evidence and the conclusion is unambiguous.
      </P>
      <Table
        head={["Gauntlet step", "Result", "Reading"]}
        rows={[
          ["Backtest", "2,666 trades, PF 0.71, EV -0.214R", "net-negative, well-powered"],
          ["Permutation (step 3)", <span key="p">low p — timing beats random-entry shuffles</span>, "structure is real..."],
          ["Cost stress (step 6)", <span key="c">PF <Code>0.71 / 0.45 / 0.29</Code> at 1x/2x/3x</span>, "...but below 1 at every cost — KILLED here"],
          ["Walk-forward / beta", "negative across blocks, no bankable alpha", "nothing to rescue"],
          ["Verdict", <Strong key="v">REJECT — never sized, never shipped</Strong>, "the correct, expected outcome"],
        ]}
      />
      <P>
        The ORB clears the first bar (its timing is not pure noise) and fails the second (it does not beat the spread).
        That distinction — real structure vs. a tradeable edge — is the whole reason the gauntlet exists. We reject the
        hypothesis, log it, and move on. No sizing, no challenge simulation, no deployment: a negative edge cannot be
        rescued by dressing it in position-sizing or a portfolio.
      </P>
      <Callout kind="danger" title="Killing a strategy is a success of the process">
        The failure mode is not rejecting a losing strategy — it is <em>shipping</em> one because you fell in love with
        the idea. Reaching &quot;reject&quot; cleanly, on evidence, with no capital lost, is the process doing exactly
        its job. Celebrate the kill.
      </Callout>

      <H2>If it had survived — sizing and the challenge</H2>
      <P>
        The ORB stops at step 6, so what follows is <em>counterfactual</em>: this is what you would do next only for a
        strategy whose net edge cleared cost stress, walk-forward, and is-it-beta. Never run these steps on a rejected
        strategy — a positive-looking sized projection on a negative edge is a lie with a chart.
      </P>
      <H3>Size to a drawdown budget</H3>
      <P>
        Size against a block-bootstrapped worst case, not the lucky historical drawdown, then let{" "}
        <A href="/docs/api/sizing">size_to_dd</A> convert the R-stream into dollars per day under a hard DD budget and
        a worst-day cap.
      </P>
      <CodeBlock
        filename="if_survived.py"
        code={`import edgekit as ek

daily_r = ek.viz.trades_to_daily(trades)                       # a SURVIVOR's daily R
dd = ek.validation.dd95(daily_r, block=5, horizon=252, n=15000)
sized = ek.sizing.size_to_dd(daily_r, dd_budget=0.095, account=100_000, daily_cap=0.045)
print("$/R", round(sized["dollar_per_r"], 2), "| binding:", sized["binding"])`}
      />
      <H3>Simulate the prop-firm challenge</H3>
      <P>
        A prop evaluation is a <em>path</em> problem, so the only honest answer is Monte-Carlo over resampled paths.
        Feed the <em>sized</em> dollar stream to <A href="/docs/api/challenge">challenge.simulate</A>.
      </P>
      <CodeBlock
        filename="if_survived.py"
        code={`from edgekit import challenge

rate = challenge.simulate(sized["sized"], challenge.FTMO_1STEP, n=12000)
print(f"pass rate = {rate:.1%}")     # only meaningful for a strategy with a real edge`}
      />
      <P>
        And the forward fan — the same block bootstrap that set <Code>dd95</Code> — shows the whole cone of outcomes,
        so the median (not the backtest ceiling) becomes the planning line. Then, and only then, apply the honest
        haircut from the previous chapter:
      </P>
      <Math>{"R_{\\text{honest}} = R_{\\text{backtest}} \\cdot 0.85 \\cdot 0.75"}</Math>
      <ChartFigure name="mc_fan" alt="Forward Monte-Carlo fan of a sized survivor strategy" caption="Counterfactual: the forward fan you would build for a survivor. The lower bands, not the median, set the risk budget." />

      <H2>Ship or kill</H2>
      <P>
        The decision is binary and it was made on evidence, not hope:
      </P>
      <Ul>
        <Li><Strong>Ship</Strong> only a strategy that survived the whole gauntlet, sized against a bootstrapped worst case, projected with the haircut, paper-reconciled, and monitored with a pre-committed retirement rule (see <A href="/tutorials/backtest-to-live">From backtest to live</A>).</Li>
        <Li><Strong>Kill</Strong> everything else — which, honestly, is most candidates. The bare ORB is killed at the cost gate. That is not a disappointing result; it is the library doing its actual job.</Li>
      </Ul>
      <Callout kind="note" title="The one belief the whole series rests on">
        Most apparent edges are noise. The skill that compounds is not finding strategies — it is testing them hard
        enough that the fakes fall out. A researcher who kills nine ideas to keep one has beaten the researcher who
        ships all ten.
      </Callout>

      <H2>Where to go next</H2>
      <P>
        You have now seen the full arc — idea, data, strategy, backtest, gauntlet, verdict, and the counterfactual
        sizing/challenge path a survivor would take. To go deeper:
      </P>
      <Ul>
        <Li><A href="/docs/api">API reference</A> — every module and function: <A href="/docs/api/data">data</A>, <A href="/docs/api/strategy">strategy</A>, <A href="/docs/api/metrics">metrics</A>, <A href="/docs/api/validation">validation</A>, <A href="/docs/api/sizing">sizing</A>, <A href="/docs/api/challenge">challenge</A>, <A href="/docs/api/ml">ml</A>.</Li>
        <Li><A href="/docs/concepts/gauntlet">The validation gauntlet</A> — the nine steps in full, plus the overfit battery (PBO, deflated Sharpe).</Li>
        <Li><A href="/docs/examples/orb-gauntlet">The ORB gauntlet example</A> — this same rejection as a runnable, annotated script.</Li>
        <Li><A href="/docs/guides/proving-an-edge">Proving an edge</A> — the same tools framed as a how-to for your own candidates.</Li>
      </Ul>
      <P>
        That is the series. Go build something — then try your hardest to prove it does not work.
      </P>
    </>
  );
}
