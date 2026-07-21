import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table, Code } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Prop-firm and capital" };

export default function Page() {
  return (
    <>
      <H1>Prop-firm and capital</H1>
      <Lead>
        A prop-firm evaluation is not an average-return problem — it is a <em>path</em> problem. You do not need to be
        profitable on average; you need to hit a profit target without ever breaching a drawdown limit along the way. A
        strategy with a real edge can still fail most challenges if it is sized too aggressively, because a single bad
        stretch trips a hard limit before the edge has time to compound. This chapter is the math of surviving that path:
        sizing to a drawdown budget, and Monte-Carlo pass rates over resampled histories.
      </Lead>

      <P>
        Strip away the jargon and a funded-account evaluation is a board game with one brutal rule: reach the finish
        square before you ever land on a trap square. The finish is a profit target; the traps are a daily-loss line and
        a total-loss line. It does not matter that your dice are loaded in your favour on average — one unlucky run of
        rolls onto a trap ends the game, and the average never gets to play out. So the real question is never &ldquo;is
        my strategy profitable?&rdquo; It is &ldquo;sized <em>this</em> way, how often does a real run of my P&amp;L
        reach the target before it hits a trap?&rdquo; That is a path question, and the only honest way to answer a path
        question is to simulate the paths.
      </P>

      <H2>What a prop-firm evaluation demands</H2>
      <P>
        Funded-account programs let you trade the firm&apos;s capital after you pass an evaluation. Every evaluation is a
        set of hard constraints, all in account dollars:
      </P>
      <Ul>
        <Li><Strong>Profit target</Strong> — reach <MathInline>{"+X"}</MathInline> dollars (possibly across multiple phases) to pass.</Li>
        <Li><Strong>Max loss</Strong> — total equity may never fall <MathInline>{"Y"}</MathInline> dollars below the starting balance. Breach it and the account is gone.</Li>
        <Li><Strong>Daily loss</Strong> — you may never lose more than <MathInline>{"Z"}</MathInline> dollars in a single day.</Li>
        <Li><Strong>Minimum days</Strong> — a floor on active trading days before a phase can be marked passed, so you can&apos;t pass on one lucky trade.</Li>
      </Ul>
      <P>
        <Code>ek.challenge.ChallengeRules</Code> encodes exactly these, and edgekit ships three presets that mirror the
        published rules of real firms:
      </P>
      <CodeBlock code={`ChallengeRules(account, phase_targets: list[float], daily_loss,
               max_loss, min_days=4)`} />
      <Table
        head={["Preset", "phase_targets", "daily_loss", "max_loss", "min_days"]}
        rows={[
          [<Code key="a">FTMO_1STEP</Code>, "[10_000]", "5_000", "10_000", "4"],
          [<Code key="b">CFT_2PHASE</Code>, "[8_000, 5_000]", "5_000", "10_000", "4"],
          [<Code key="c">BRIGHTFUNDED</Code>, "[8_000, 5_000]", "5_000", "10_000", "3"],
        ]}
      />
      <P>All three are $100k accounts. A two-element <Code>phase_targets</Code> means a two-phase evaluation — you must clear each phase in turn.</P>

      <H2>Sizing to a drawdown budget</H2>
      <P>
        Sizing is the single lever that decides whether an edge survives the path. Bet too little and you never reach the
        target inside the day limit; bet too much and a routine drawdown trips the max-loss rule. The disciplined approach
        is to size so that the strategy&apos;s <em>historical</em> worst drawdown exactly fills a chosen budget, then trade
        that size. <Code>ek.sizing.size_to_dd</Code> does this: it turns a daily-R stream into a dollar-per-R scalar such
        that the sized curve&apos;s max drawdown equals the budget.
      </P>
      <Math>{"\\text{dollar\\_per\\_R} = \\frac{\\text{dd\\_budget}\\times \\text{account}}{\\text{max drawdown (in R)}}"}</Math>
      <CodeBlock
        filename="size_to_dd.py"
        code={`from edgekit import sizing

res = sizing.size_to_dd(daily_r, dd_budget=0.08, account=100_000, daily_cap=0.045)
sized = res["sized"]          # dollar P&L per day; historical max DD == 8% of account
res["dollar_per_r"]           # the applied scalar
res["binding"]                # "max-dd" or "daily" -- which limit set the size`}
      />
      <Callout kind="warn" title="The sized curve is a historical ceiling, not a forecast">
        <Code>size_to_dd</Code> reproduces the <em>observed</em> worst drawdown exactly — but live drawdown almost always
        runs deeper than the single lucky history. Size against a budget <em>tighter</em> than the firm&apos;s limit (an
        8% internal budget under a 10% hard limit), leaving headroom for the drawdown you haven&apos;t seen yet. Better
        still, size against a bootstrapped worst-case drawdown, which is what the Monte-Carlo below effectively measures.
      </Callout>

      <H2>Monte-Carlo pass rate</H2>
      <P>
        Because passing is a path problem, the only honest estimate of your odds is Monte-Carlo over many resampled
        histories. <Code>ek.challenge.simulate</Code> block-bootstraps the sized daily-P&amp;L stream into thousands of
        alternate paths and returns the fraction that clear every phase without breaching a limit. It uses a{" "}
        <em>block</em> bootstrap, not i.i.d. resampling, so losing streaks stay intact — a strategy&apos;s clustered losses
        are precisely what trip a daily limit, and shuffling them away would flatter the pass rate.
      </P>
      <CodeBlock code={`simulate(daily_pnl_dollars, rules, n=12000, rng=None,
         block=5, phase_days=400) -> float`} />
      <CodeBlock
        filename="pass_rate.py"
        code={`import numpy as np
from edgekit import challenge, sizing

sized = sizing.size_to_dd(daily_r, dd_budget=0.08, account=100_000)["sized"]

rng = np.random.default_rng(0)
rate = challenge.simulate(sized, challenge.FTMO_1STEP, n=12000, rng=rng)
print(f"pass rate = {rate:.1%}")`}
      />
      <Callout kind="warn" title="Feed it the SIZED dollar stream, not raw R">
        Both challenge functions expect dollars-per-day <em>after</em> sizing, because the breach limits are absolute
        dollars. Pass a raw R-stream and the daily-loss and max-loss checks become meaningless. Always{" "}
        <Code>size_to_dd</Code> first, then <Code>simulate</Code>.
      </Callout>
      <Callout kind="tip" title="Scenario: sizing a BrightFunded $100k challenge">
        You have a validated daily-R book and you want the BrightFunded two-phase evaluation.{" "}
        <Code>BRIGHTFUNDED</Code> is a $100k account with phase targets{" "}
        <MathInline>{"[\\$8{,}000,\\ \\$5{,}000]"}</MathInline>, a $5,000 daily-loss line, a $10,000 max-loss line, and a
        3-day minimum. First you size. The book&apos;s historical worst drawdown is <MathInline>{"18R"}</MathInline>;
        against an 8% internal budget (deliberately under the 10% hard limit) <Code>size_to_dd</Code> solves{" "}
        <MathInline>{"\\text{\\$/R} = (0.08\\times 100{,}000)/18 \\approx \\$444"}</MathInline> and reports{" "}
        <Code>binding = &quot;max-dd&quot;</Code> — the drawdown budget, not the daily cap, set your size. Then you
        simulate: block-bootstrap that sized dollar stream 12,000 times through both phases. Say it returns a pass rate
        of <MathInline>{"68\\%"}</MathInline> with a median 41 trading days to clear both phases. Now you can decide with
        numbers rather than nerve: roughly two-in-three odds, about six weeks of capital tied up. Halve the size and the
        pass rate might edge toward 74%, but the clock stretches past the phase-day budget — the exact trade-off the next
        section makes explicit.
      </Callout>
      <ChartFigure
        name="mc_fan"
        alt="A fan of bootstrapped equity paths against the profit-target and max-loss lines"
        caption="Bootstrapped equity paths through an evaluation. A path passes if it touches the target line before the max-loss line; the pass rate is the share that do."
      />

      <H3>How long a pass takes</H3>
      <P>
        Pass rate alone hides a cost: a program that passes 80% of the time but takes six months of trading may not be
        worth the capital tie-up. <Code>ek.challenge.days_to_pass</Code> returns the distribution of days-to-pass over the
        paths that succeed.
      </P>
      <CodeBlock
        filename="days_to_pass.py"
        code={`d = challenge.days_to_pass(sized, challenge.CFT_2PHASE)
print(d["median"], d["p25"], d["p75"], d["pass_rate"])   # typical + spread of days, and the rate`}
      />

      <H2>The aggression / survival trade-off</H2>
      <P>
        Sizing up shortens the median days-to-pass — you reach the target faster — but it also fattens the left tail of
        the equity distribution, so more paths breach a limit first. There is an interior optimum: past a point, extra
        size <em>lowers</em> the pass rate. Sweep the drawdown budget and watch the pass rate rise, peak, and fall.
      </P>
      <CodeBlock
        filename="aggression_sweep.py"
        code={`for dd in (0.04, 0.06, 0.08, 0.10):
    sized = sizing.size_to_dd(daily_r, dd_budget=dd, account=100_000)["sized"]
    rate = challenge.simulate(sized, challenge.FTMO_1STEP, n=12000,
                              rng=np.random.default_rng(0))
    print(f"dd_budget={dd:.0%}  pass rate={rate:.1%}")`}
      />
      <P>
        <Strong>At the desk.</Strong> The sweep prints something like <Code>4% → 52%</Code>, <Code>6% → 64%</Code>,{" "}
        <Code>8% → 68%</Code>, <Code>10% → 61%</Code>. Read the shape, not the rows: the pass rate climbs as you dare
        more size, peaks near the 8% budget, then <em>falls</em> at 10% — even though 10% is the firm&apos;s own hard
        limit. Sizing to the very edge of the rule is worse than sizing just inside it, because the extra size fattens
        the left tail faster than it speeds you to the target: you trip the daily line on a bad cluster before the edge
        gets to compound. The survival-optimal budget sits comfortably below the limit, which is the whole
        counter-intuitive point of funded-account sizing.
      </P>
      <P>
        This is the same idea as risk of ruin from{" "}
        <A href="/tutorials/position-sizing">position sizing</A>: beyond the growth-optimal fraction, each extra unit
        of size raises the probability of hitting an absorbing barrier faster than it raises expected profit. In a prop
        evaluation the max-loss rule <em>is</em> the absorbing barrier, and it is much closer than a blown account —
        which is why funded-account sizing is almost always well below what a pure-growth calculation would suggest.
      </P>
      <ChartFigure
        name="tut/risk_of_ruin"
        alt="Risk-of-ruin curve rising sharply as the risk fraction per trade increases"
        caption="Probability of hitting the barrier as a function of size. The prop-firm max-loss limit sits far to the left of a blown account, so the survival-optimal size is conservative."
      />
      <Callout kind="tip" title="Optimise the joint objective, not the pass rate alone">
        The size worth trading maximises pass rate <em>and</em> keeps median days-to-pass tolerable — read both from the
        sweep. And remember the whole exercise assumes the edge is real: Monte-Carlo over a lucky backtest just launders
        an over-fit result into a confident-looking pass rate. Validate the strategy through{" "}
        <A href="/tutorials/the-gauntlet">the gauntlet</A> first, then size and simulate.
      </Callout>

      <P>
        <Strong>Next:</Strong> you have an edge, a book, a size, and a pass rate — now close the loop from research to a
        live account in <A href="/tutorials/backtest-to-live">Backtest to live</A>.
      </P>
    </>
  );
}
