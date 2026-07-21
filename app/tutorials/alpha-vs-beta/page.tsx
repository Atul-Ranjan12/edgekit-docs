import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Code } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";

export const metadata: Metadata = { title: "Alpha vs beta" };

export default function Page() {
  return (
    <>
      <H1>Alpha vs beta</H1>
      <Lead>
        The most common false positive in this whole discipline is a strategy that is really just the market wearing a
        costume. Making money in a bull run is not skill if you give it all back in the bear — that is leverage, not
        alpha. This chapter separates the two with a regression, shows why &quot;regime modelling&quot; is so often
        beta in disguise, and closes with the honest haircut you apply before trusting any forward number.
      </Lead>

      <P>
        The plain question is embarrassingly simple: <em>if I had just bought and held, would I have done about as
        well?</em> If yes, whatever cleverness sits on top is decoration — you were paid for taking market risk, which
        anyone can do with a single click and no strategy at all. Beta is that borrowed return; alpha is the part left
        over that the market cannot explain. A regression separates them in one line, and the rest of this chapter is
        about why the separation matters more than any headline CAGR.
      </P>

      <H2>The decomposition</H2>
      <P>
        Regress the strategy&apos;s returns on a benchmark&apos;s returns (buy-and-hold of the same instrument, say).
        The single-factor market model splits every period&apos;s return into three parts:
      </P>
      <Math>{"r_{s,t} = \\alpha + \\beta\\, r_{m,t} + \\varepsilon_t"}</Math>
      <Ul>
        <Li><Strong><MathInline>{"\\beta r_{m,t}"}</MathInline></Strong> — the part explained by riding the market. <MathInline>{"\\beta"}</MathInline> is your effective exposure: <MathInline>{"\\beta = 1"}</MathInline> is fully long the benchmark, <MathInline>{"\\beta = 2"}</MathInline> is 2× leveraged, <MathInline>{"\\beta = 0"}</MathInline> is market-neutral.</Li>
        <Li><Strong><MathInline>{"\\alpha"}</MathInline></Strong> — the intercept: return <em>not</em> explained by the benchmark. This is the skill component, the thing you actually want.</Li>
        <Li><Strong><MathInline>{"\\varepsilon_t"}</MathInline></Strong> — idiosyncratic noise, mean zero by construction.</Li>
      </Ul>
      <P>
        The slope and intercept are the ordinary-least-squares estimates:
      </P>
      <Math>{"\\hat{\\beta} = \\frac{\\operatorname{Cov}(r_s, r_m)}{\\operatorname{Var}(r_m)}, \\qquad \\hat{\\alpha} = \\bar{r}_s - \\hat{\\beta}\\,\\bar{r}_m"}</Math>
      <P>
        You want <MathInline>{"\\beta"}</MathInline> near zero and <MathInline>{"\\alpha"}</MathInline> positive: return
        that does not depend on the market going up. A high beta with near-zero alpha is the giveaway — you have
        leverage, not skill.
      </P>

      <H2>is_it_beta</H2>
      <P>
        <A href="/docs/api/validation">is_it_beta</A> runs exactly this regression and returns the two numbers that
        matter — the slope and the annualised intercept residual.
      </P>
      <CodeBlock
        filename="is_it_beta.py"
        code={`import edgekit as ek

out = ek.validation.is_it_beta(strat_daily_ret, buy_and_hold_daily_ret, periods_per_year=365)
print(out["beta"], out["alpha"])
# high beta + ~0 alpha  -> leveraged market exposure, not an edge
# ~0 beta  + positive alpha -> return independent of the market (what you want)`}
      />
      <Callout kind="tip" title="Scenario — two BTC strategies, same +40% year, opposite verdicts">
        Both strategies returned +40% in a year BTCUSDT itself rose 45%. Strategy A is a long-biased trend follower:
        regress it on buy-and-hold and you get <Code>beta = 0.92</Code>, <Code>alpha ≈ +1%/yr</Code>. Almost the entire
        40% is <MathInline>{"0.92 \\times 45\\% \\approx 41\\%"}</MathInline> of borrowed market return — it is
        buy-and-hold with extra steps and worse fees, and it will hand the gains back in the next bear it has not seen.
        Strategy B is a market-neutral pairs trade: <Code>beta = 0.05</Code>, <Code>alpha ≈ +38%/yr</Code>. Its return
        barely moves with BTC, so the 40% is skill the market cannot explain. Same headline number, but you would size
        B as a real edge and treat A as leverage. The regression is what tells them apart — the CAGR never could.
      </Callout>
      <Callout kind="warn" title="A trend follower is the classic trap">
        A long-biased trend follower tested through a bull market shows a beautiful curve and a beta close to 1. It is
        not forecasting anything — it is long the market with extra steps, and it will surrender the gains in the next
        bear it has not yet seen. The regression makes that exposure impossible to hide.
      </Callout>

      <H2>Regime modelling is often just beta</H2>
      <P>
        A tempting story: &quot;my regime overlay turns the strategy <em>on</em> in good markets and <em>off</em> in
        bad ones.&quot; If that overlay is really just detecting when the market is rising and going long, it has not
        added alpha — it has added <em>timing beta</em>. The equity curve improves, but only because you increased
        market exposure during the periods the market went up, which you can only know with hindsight in a backtest.
      </P>
      <P>
        Two tests catch this. First, <Code>is_it_beta</Code>: a genuine regime edge keeps beta low even as it improves
        returns; a beta overlay just raises the slope. Second — and this is the harder gate — the{" "}
        <A href="/tutorials/monte-carlo">permutation test</A>. Drift-beta <em>survives</em> a reshuffle, because
        shuffling the bar order preserves the return marginal the long bias feeds on; genuine serial-correlation
        structure does <em>not</em>. If your &quot;regime alpha&quot; keeps its p-value after permutation, it is
        structural; if it evaporates, it was riding drift.
      </P>
      <Callout kind="note" title="The permutation test is the beta detector too">
        This is why the gauntlet leans on permutation so heavily. It is not only an overfitting test — it is the
        cleanest separation of alpha from beta, because it destroys exactly the drift that beta rides while leaving
        exploitable structure intact.
      </Callout>

      <H2>The honest forward haircut</H2>
      <P>
        Even after a strategy survives the whole gauntlet with real alpha, the backtest number is a{" "}
        <em>ceiling</em>, not an expectation. The drawdown-matched size reproduces the <em>historical</em> worst case
        exactly, and history was one lucky draw. edgekit never hides the two haircuts you apply before believing a
        forward number:
      </P>
      <Ul>
        <Li>
          <Strong>Edge decay ≈ ×0.85</Strong> — if the edge is permutation-validated (worse if it is not). The future
          regime is assumed <em>less</em> favourable than the past; edges erode as they are discovered and crowded.
        </Li>
        <Li>
          <Strong>Size-down ≈ ×0.75</Strong> — because live drawdowns run deeper than the single lucky historical one.
          Size against the block-bootstrap <A href="/docs/api/validation">dd95</A> (a bad-but-not-tail drawdown), not
          the realised max.
        </Li>
      </Ul>
      <Math>{"\\text{honest forward} \\approx \\text{backtest} \\times 0.85 \\times 0.75 \\approx 0.64 \\times \\text{backtest}"}</Math>
      <CodeBlock
        filename="forward.py"
        code={`import edgekit as ek

# size against a realistic worst case, not the one lucky historical drawdown
dd    = ek.validation.dd95(daily_r, block=5, horizon=252, n=15000)      # 95th-pct max DD
sized = ek.sizing.size_to_dd(daily_r, dd_budget=0.095, account=100_000, daily_cap=0.045)

honest = backtest_annual * 0.85 * 0.75      # edge-decay x size-down -> plan around THIS`}
      />
      <Callout kind="tip" title="State the haircut, always">
        Never present a backtest headline without its haircut. The number that survives edge-decay and size-down is the
        one you can plan capital and psychology around; the raw backtest is the number that gets people blown up.
      </Callout>

      <H2>Where this leads</H2>
      <P>
        Separating alpha from beta is the last conceptual gate in the testing part of the course. The natural next
        question is how to <em>generate</em> the alternative worlds these tests rely on from first principles — the
        stochastic processes behind the bootstrap and the permutation. That is where Part V begins.
      </P>

      <P>
        <Strong>Next:</Strong>{" "}
        <A href="/tutorials/simulating-markets">Simulating markets</A> — geometric Brownian motion, fat tails, and
        regime-switching, and how simulated markets let you stress a strategy against worlds that never happened.
      </P>
    </>
  );
}
