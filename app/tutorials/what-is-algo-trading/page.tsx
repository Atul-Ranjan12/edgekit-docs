import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";
import { MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "What is algorithmic trading?" };

export default function Page() {
  return (
    <>
      <H1>What is algorithmic trading?</H1>
      <Lead>
        Algorithmic trading is deciding what to buy or sell with a rule instead of a hunch — a rule precise enough that
        a computer can execute it and, more importantly, that you can <em>test</em> against history before risking a
        cent. This chapter sets the philosophy the rest of the course runs on. There is almost no math here; there is
        one hard idea, and it is a warning.
      </Lead>

      <H2>Systematic vs discretionary</H2>
      <P>
        A <Strong>discretionary</Strong> trader looks at a chart, reads the news, feels the tape, and decides. A{" "}
        <Strong>systematic</Strong> trader writes down — in advance, unambiguously — exactly what conditions trigger a
        trade, how big it is, and when it closes. The systematic trader then does what the rules say, every time,
        whether or not it feels right in the moment.
      </P>
      <P>
        The distinction is not &ldquo;computer vs human&rdquo;; it is &ldquo;specified in advance vs decided in the
        moment.&rdquo; You could run a systematic strategy with pen and paper. The reason we reach for code is that a
        rule written as code can be replayed against a decade of past data in seconds — and that replay is the only
        honest way to find out whether the rule was ever worth following.
      </P>
      <Callout kind="tip" title="Scenario: two traders, one chart">
        It is 09:30 in New York and US100 (the Nasdaq-100 CFD) has just gapped up and broken above yesterday&rsquo;s
        high. <Strong>Dev, the discretionary trader,</Strong> feels the momentum, buys 3 contracts, and plans to
        &ldquo;see how it goes.&rdquo; Ask him afterwards why 3 and not 1, or where he&rsquo;d have sold, and the honest
        answer is: it depended. <Strong>Sam, the systematic trader,</Strong> is running a rule she wrote last month:{" "}
        <em>if price breaks the first 30-minute high, buy, put the stop at the 30-minute low, target twice that
        distance, and risk exactly 0.5% of the account.</em> Sam&rsquo;s trade is boring and identical to the last forty
        she took. That sameness is the point — it is the only version of the two that she can replay across ten years of
        opens and get a straight answer to &ldquo;does this actually make money?&rdquo; Dev&rsquo;s cannot be tested,
        because there was never a rule, only a Tuesday.
      </Callout>
      <Table
        head={["", "Discretionary", "Systematic"]}
        rows={[
          ["Decision", "Judged per situation", "Fixed rule, decided in advance"],
          ["Testable?", "No — can't replay a gut feel", "Yes — replay the rule on history"],
          ["Consistency", "Varies with mood, fatigue, fear", "Identical every time"],
          ["Scales to N markets?", "Not really", "Trivially — run the same code"],
          ["Failure mode", "Undiagnosable", "Measurable, attributable"],
        ]}
      />
      <Callout kind="note" title="This course is entirely systematic">
        Not because discretion can&apos;t work — skilled discretionary traders exist — but because only a systematic
        rule can be put through the statistical wringer that separates a real edge from a lucky streak. Everything in
        edgekit assumes a rule you can run twice and get the same answer.
      </Callout>

      <H2>The loop: edge, rules, test, deploy</H2>
      <P>
        All systematic trading is one loop, repeated forever. You form a hypothesis about a repeatable inefficiency (an{" "}
        <Strong>edge</Strong>), you encode it as unambiguous <Strong>rules</Strong>, you <Strong>test</Strong> whether
        the rules would have made money net of costs and — crucially — whether that result is more than luck, and only
        then do you <Strong>deploy</Strong> a small amount of capital and watch. What you learn feeds the next
        hypothesis.
      </P>
      <Ul>
        <Li>
          <Strong>Edge</Strong> — a reason prices should behave a certain way more often than chance: a behavioural
          bias, a structural flow, a slow diffusion of information. Without a <em>why</em>, a backtest is just a
          pattern you found by looking.
        </Li>
        <Li>
          <Strong>Rules</Strong> — the edge made mechanical: entry condition, exit condition, stop, and size. No free
          parameters left to &ldquo;interpret&rdquo; live.
        </Li>
        <Li>
          <Strong>Test</Strong> — replay on out-of-sample history, price in realistic costs, and run the statistical
          checks that ask &ldquo;could a coin-flip strategy have looked this good?&rdquo;
        </Li>
        <Li>
          <Strong>Deploy</Strong> — size it so a bad run can&apos;t ruin you, ship it small, and reconcile live results
          against the backtest&apos;s expectation.
        </Li>
      </Ul>
      <P>
        Most beginners spend their time on <em>edge</em> and <em>rules</em> and almost none on <em>test</em>. This
        course inverts that. The hard, valuable skill is testing — because the market will happily hand you a hundred
        rules that fit the past and lose in the future.
      </P>

      <H2>Why rules beat gut</H2>
      <H3>Consistency</H3>
      <P>
        A rule does the same thing on Monday and on the Monday after a three-loss week. A human does not. Most trading
        edges are thin — a small positive <MathInline>{"E[R] = p\\,W - (1-p)\\,L"}</MathInline> per trade that only
        compounds if you take <em>every</em> qualifying trade. Skip the scary ones (which are often the good ones) and
        you are no longer trading the strategy you tested; you are trading a subset selected by fear, whose expectancy
        is unknown.
      </P>
      <H3>Testability</H3>
      <P>
        You cannot backtest a feeling. You can backtest a rule. A written rule turns &ldquo;I think this works&rdquo;
        into a number you can attack: expectancy, drawdown, and a p-value on whether the result survives a
        null hypothesis. If a claim can&apos;t be falsified on history, it can&apos;t be trusted with money.
      </P>
      <H3>No emotion</H3>
      <P>
        Fear and greed are systematically wrong at exactly the worst moments — cutting winners early, holding losers,
        sizing up after a hot streak. A rule has no amygdala. It sizes the trade after five losses exactly as it sizes
        it after five wins, which is the only way the arithmetic of the edge is allowed to play out.
      </P>

      <H2>The research pipeline</H2>
      <P>
        edgekit is organised as a pipeline, and so is this course. Each stage is a module you&apos;ll meet in depth;
        here is the whole arc in one breath so the pieces have somewhere to hang.
      </P>
      <Table
        head={["Stage", "Question it answers", "edgekit module"]}
        rows={[
          ["Load", "What is the data, really?", <Code key="d">ek.data</Code>],
          ["Backtest", "Would the rule have made money?", <Code key="s">ek.strategy</Code>],
          ["Measure", "How good, and how painful?", <Code key="m">ek.metrics</Code>],
          ["Prove", "Is it more than luck?", <Code key="v">ek.validation</Code>],
          ["Size", "How much can I risk without ruin?", <Code key="z">ek.sizing</Code>],
          ["Ship", "Will it survive a prop-firm / live account?", <Code key="c">ek.challenge</Code>],
        ]}
      />
      <P>
        The order is not negotiable. You <em>load</em> before you trust the data (
        <A href="/docs/api/data">ek.data</A> even ships an <Code>integrity_report</Code> so you look before you leap).
        You <em>backtest</em> a rule expressed as a <Code>BaseStrategy</Code> subclass. You <em>measure</em> with
        <Code>trade_stats</Code>. You <em>prove</em> the result is not luck with a permutation test and walk-forward
        analysis — the stage that kills most ideas. Only survivors get <em>sized</em> and <em>shipped</em>.
      </P>
      <CodeBlock
        filename="pipeline.py"
        code={`import edgekit as ek

bars   = ek.data.load_bars("BTCUSDT_5m.csv")        # 1. load
h4     = ek.data.resample_ohlcv(bars, "H4")         # ... to a swing timeframe
trades = ek.strategy.SmaCross().backtest(h4)        # 2. backtest a rule (illustrative)
stats  = ek.metrics.trade_stats(trades.r, dates=trades.date)   # 3. measure
print(stats["ev_r"], stats["pf"])                   # expectancy per trade (R), profit factor
# 4. prove (ek.validation) -> 5. size (ek.sizing) -> 6. ship (ek.challenge)`}
      />
      <Callout kind="note" title="SmaCross is a teaching prop">
        The moving-average crossover above is a generic, untuned template that exists to exercise the engine — not an
        edge. Expect the later stages to treat it skeptically once costs are priced in. Throughout this course, when we
        need a strategy to demonstrate mechanics, we reach for <Code>SmaCross</Code> or <Code>ORB</Code> precisely
        because they are honest, unglamorous examples.
      </Callout>

      <H2>What a &ldquo;strategy&rdquo; is</H2>
      <P>
        Concretely, a strategy is four decisions, and nothing more: <Strong>when to enter</Strong>,{" "}
        <Strong>when to exit</Strong>, <Strong>where the stop sits</Strong> (which defines your unit of risk), and{" "}
        <Strong>how big the position is</Strong>. In edgekit a strategy subclasses <Code>BaseStrategy</Code> and
        implements three methods — <Code>prepare</Code> (precompute causal indicator arrays), <Code>entry</Code>, and{" "}
        <Code>exit</Code> — and inherits a one-line <Code>.backtest()</Code> that runs the bar loop and returns trades
        priced in <Strong>R-multiples</Strong> (profit or loss measured in units of the risk you put on).
      </P>
      <CodeBlock
        code={`class MyIdea(ek.strategy.BaseStrategy):
    name = "my_idea"
    def prepare(self, bars): ...      # causal features (bar i sees only <= i-1)
    def entry(self, bars, P, i): ...  # return an EntryIntent, or None to stay flat
    def exit(self, bars, P, pos, i): ...  # return an exit price, or None to hold`}
      />
      <P>
        Measuring outcomes in R rather than dollars is what lets you compare a crypto trade to an index trade and reason
        about sizing separately from signal. A strategy that is right about direction but reckless about R is still a
        losing strategy — which is why the exit and the stop are as much a part of the &ldquo;idea&rdquo; as the entry.
      </P>
      <Callout kind="tip" title="Scenario: the four decisions, made concrete">
        Sam&rsquo;s US100 trade above is nothing more than those four decisions with numbers filled in. On this
        particular open the first 30-minute range ran from 20,010 down to 19,970 — a 40-point range.{" "}
        <Strong>Enter:</Strong> price tags 20,010, she buys. <Strong>Stop:</Strong> the 30-minute low, 19,970 — so her
        risk per contract is 40 points, and that 40 points <em>is</em> her <MathInline>{"1R"}</MathInline>.{" "}
        <Strong>Exit:</Strong> a target 2R away at 20,090, or the stop, whichever comes first. <Strong>Size:</Strong> on
        a $100k account risking 0.5% she is willing to lose $500; at (say) $1 per point per contract that 40-point stop
        costs $40 per contract, so she buys <MathInline>{"500 / 40 \\approx 12"}</MathInline> contracts. If the target
        hits she makes <MathInline>{"+2R = +\\$1{,}000"}</MathInline>; if the stop hits she loses{" "}
        <MathInline>{"-1R = -\\$500"}</MathInline>. Every trade she takes is one of these two shapes — that is what makes
        the strategy a countable, testable object rather than a story.
      </Callout>

      <H2>The prime directive: assume every edge is fake</H2>
      <P>
        Here is the one belief this entire series is built on: <Strong>most apparent edges are noise.</Strong> Search
        enough rules over enough history and some will look spectacular purely by chance. A backtest&apos;s job is not
        to confirm your idea — it is to <em>try to kill it</em>. You are the defence attorney and the prosecutor, and
        the prosecutor has to be ruthless, because the market will not be kind to a rule you talked yourself into.
      </P>
      <ChartFigure
        name="tut/overfitting_curve"
        alt="In-sample performance rising while out-of-sample performance falls as complexity increases"
        caption="The trap: as you add parameters, in-sample results improve while true out-of-sample edge collapses. A great backtest is the default, not the exception."
      />
      <P>
        This is why the testing half of the course dwarfs the building half. The permutation test asks: if I shuffle
        the data to destroy any real signal, how often does a strategy this good appear anyway? Walk-forward asks: does
        the edge survive on data the rule was never fitted to? A held-out slice, read exactly once, gives you a single
        honest out-of-sample number. Skip these and you are not doing research — you are collecting flattering
        coincidences.
      </P>
      <Callout kind="danger" title="The default answer is no">
        Start every investigation assuming the edge is fake and make the data prove otherwise. The strategies that
        survive that hostility are rare, thin, and worth real money. The ones that don&apos;t survive it were going to
        cost you money live — you just found out for free.
      </Callout>

      <P>
        Next: with the philosophy set, we get concrete about what we&apos;re actually trading — the instruments, the
        anatomy of a price bar, and the costs that quietly eat returns — in{" "}
        <A href="/tutorials/markets-and-data">Markets, instruments &amp; data</A>.
      </P>
    </>
  );
}
