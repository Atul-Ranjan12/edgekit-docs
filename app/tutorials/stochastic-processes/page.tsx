import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Stochastic processes" };

export default function Page() {
  return (
    <>
      <H1>Stochastic processes</H1>
      <Lead>
        A price path is a single draw from a random process. To reason about it — to simulate it, to price risk against
        it, to know what &ldquo;no edge&rdquo; looks like — you need the mathematics of random motion: random walks,
        martingales, Brownian motion, and the geometric Brownian motion that underlies almost every model of asset
        prices. This chapter builds them in order, states Itô&rsquo;s lemma, and uses it to re-derive the volatility
        drag you first met in Part II — this time from the calculus of randomness.
      </Lead>

      <Callout kind="tip" title="Intuition — why a trader learns this at all">
        <P>
          You only ever see <em>one</em> price path — the one that happened. But to judge a strategy you need to ask what
          <em> could</em> have happened: was that <MathInline>{"+30\\%"}</MathInline> year skill, or one lucky draw from a
          process that just as easily hands you <MathInline>{"-20\\%"}</MathInline>? To answer that you need a model of
          the coin the market is flipping. This chapter builds that model in three steps — a fair coin-flip walk (the
          &ldquo;no edge&rdquo; null), its smooth continuous-time limit (Brownian motion), and the version that keeps
          prices positive and compounding (geometric Brownian motion). The payoff is concrete: it tells you what random
          looks like (so you can spot when your backtest isn&rsquo;t), and it explains — from calculus, not hand-waving —
          why a volatile asset compounds slower than its average return suggests.
        </P>
      </Callout>

      <H2>Random walks and martingales</H2>
      <P>
        Start discrete. A <Strong>random walk</Strong> is a running sum of independent shocks{" "}
        <MathInline>{"\\xi_t"}</MathInline>:
      </P>
      <Math>{"P_t = P_{t-1} + \\xi_t, \\qquad \\mathbb{E}[\\xi_t] = 0, \\quad \\text{the } \\xi_t \\text{ independent}."}</Math>
      <P>
        Its defining property is that the best forecast of tomorrow, given <em>everything</em> you know today (the
        information set <MathInline>{"\\mathcal{F}_t"}</MathInline>), is simply today&rsquo;s value. A process with that
        property is a <Strong>martingale</Strong>:
      </P>
      <Math>{"\\mathbb{E}[\\,P_{t+1} \\mid \\mathcal{F}_t\\,] = P_t \\quad\\Longleftrightarrow\\quad \\mathbb{E}[\\,\\text{next return} \\mid \\text{past}\\,] = 0."}</Math>
      <P>
        The martingale is the mathematical statement of <em>no edge</em>. If prices are a martingale, no rule built from
        past information can produce positive expected return — a theorem (the optional-stopping theorem) that no stop,
        target, or entry timing can beat. This is why the martingale is the null hypothesis the whole{" "}
        <A href="/tutorials/why-backtests-lie">gauntlet</A> tests against: an edge is precisely a <em>departure</em>{" "}
        from the martingale property, a conditional expectation that drifts up rather than staying flat.
      </P>
      <Callout kind="note" title="Efficient markets, restated">
        The weak-form efficient-market hypothesis is just the claim that prices are (close to) a martingale with respect
        to past prices. Every technical strategy is, mathematically, a bet that this claim is false for some
        conditioning information. Most of the time, on most instruments, it is very nearly true — which is why edges are
        small, rare, and quick to decay.
      </Callout>

      <H2>Brownian motion</H2>
      <P>
        Take the random walk to a continuous-time limit — shrink the step size and let steps arrive infinitely often —
        and it converges (by the central limit theorem) to <Strong>Brownian motion</Strong>{" "}
        <MathInline>{"W_t"}</MathInline>, also called the Wiener process. It is defined by four properties:
      </P>
      <Ul>
        <Li>
          <Strong>Starts at zero:</Strong> <MathInline>{"W_0 = 0"}</MathInline>.
        </Li>
        <Li>
          <Strong>Independent increments:</Strong> non-overlapping changes are independent — the future is
          uncorrelated with the past given the present (the continuous-time martingale property).
        </Li>
        <Li>
          <Strong>Gaussian increments:</Strong> over an interval of length <MathInline>{"t"}</MathInline>, the change is
          normal with variance equal to the elapsed time,{" "}
          <MathInline>{"W_{s+t} - W_s \\sim \\mathcal{N}(0, t)"}</MathInline>.
        </Li>
        <Li>
          <Strong>Continuous paths</Strong> (but nowhere differentiable — the path is infinitely jagged).
        </Li>
      </Ul>
      <P>
        The variance-proportional-to-time property is the one to hold onto:{" "}
        <MathInline>{"\\operatorname{Var}(W_t) = t"}</MathInline>, so the standard deviation grows like{" "}
        <MathInline>{"\\sqrt{t}"}</MathInline>. This is the famous <Strong>square-root-of-time</Strong> scaling: risk
        over a horizon grows with its square root, not linearly. It is the same <MathInline>{"\\sqrt{n}"}</MathInline>{" "}
        that governs the standard error of a measured edge — dispersion accumulates like the root of the number of
        independent increments.
      </P>
      <ChartFigure
        name="tut/brownian_motion"
        alt="Several sample paths of Brownian motion diverging from zero, with a shaded band widening like the square root of time"
        caption="Sample paths of Brownian motion. Each jagged line is one realisation; they fan out from the origin, and the spread grows like sqrt(t) (the shaded band). No path is differentiable — the increments are pure independent Gaussian noise, the continuous limit of a fair coin-flip walk."
      />
      <Callout kind="tip" title="The key scaling rule for increments">
        Over a small time step <MathInline>{"dt"}</MathInline>, the Brownian increment{" "}
        <MathInline>{"dW"}</MathInline> has mean zero and variance <MathInline>{"dt"}</MathInline> — so informally{" "}
        <MathInline>{"dW \\sim \\sqrt{dt}\\,\\mathcal{N}(0,1)"}</MathInline> and, crucially,{" "}
        <MathInline>{"(dW)^2 \\to dt"}</MathInline>. That last identity looks strange but is the engine of Itô&rsquo;s
        lemma below: the <em>square</em> of a random increment is not negligible next to <MathInline>{"dt"}</MathInline> —
        it <em>is</em> <MathInline>{"dt"}</MathInline>.
      </Callout>

      <H2>Geometric Brownian motion</H2>
      <P>
        Prices cannot be modelled as plain Brownian motion — that would let them go negative, and a $10 move should mean
        something different for a $20 stock than a $2000 one. The fix is to make the <em>proportional</em> change follow
        Brownian motion. That is <Strong>geometric Brownian motion</Strong> (GBM), written as a stochastic differential
        equation:
      </P>
      <Math>{"dS = \\mu\\,S\\,dt + \\sigma\\,S\\,dW."}</Math>
      <P>
        The first term is a deterministic <em>drift</em> at rate <MathInline>{"\\mu"}</MathInline>; the second is random
        <em> diffusion</em> with volatility <MathInline>{"\\sigma"}</MathInline>. Both scale with{" "}
        <MathInline>{"S"}</MathInline>, so returns — not dollar moves — are what is stationary. This is the model behind
        Black-Scholes and behind the Monte-Carlo engine in <A href="/tutorials/simulating-markets">Simulating markets</A>.
      </P>

      <H2>Itô&rsquo;s lemma and the solution</H2>
      <P>
        To solve the SDE we need the chain rule for stochastic processes, which is <em>not</em> the ordinary one.{" "}
        <Strong>Itô&rsquo;s lemma</Strong> says: for a smooth function{" "}
        <MathInline>{"f(S)"}</MathInline> of a process driven by{" "}
        <MathInline>{"dS = a\\,dt + b\\,dW"}</MathInline>,
      </P>
      <Math>{"df = \\Big(\\frac{\\partial f}{\\partial t} + a\\,\\frac{\\partial f}{\\partial S} + \\tfrac{1}{2}\\,b^2\\,\\frac{\\partial^2 f}{\\partial S^2}\\Big)dt + b\\,\\frac{\\partial f}{\\partial S}\\,dW."}</Math>
      <P>
        The extra term — the second-derivative piece — is what distinguishes Itô calculus from ordinary calculus. It
        appears because <MathInline>{"(dW)^2 = dt"}</MathInline> is first-order, not second-order, so a Taylor expansion
        must keep the quadratic term. Apply it to <MathInline>{"f = \\ln S"}</MathInline> to solve GBM.
      </P>
      <Callout kind="tip" title="Derivation — apply Itô to ln S, get the −σ²/2 drift">
        <P>
          For GBM, <MathInline>{"a = \\mu S"}</MathInline> and <MathInline>{"b = \\sigma S"}</MathInline>. With{" "}
          <MathInline>{"f(S) = \\ln S"}</MathInline> the derivatives are{" "}
          <MathInline>{"\\partial f/\\partial S = 1/S"}</MathInline> and{" "}
          <MathInline>{"\\partial^2 f/\\partial S^2 = -1/S^2"}</MathInline> (no explicit time dependence). Substitute:
        </P>
        <Math>{"d(\\ln S) = \\Big(\\mu S \\cdot \\tfrac{1}{S} + \\tfrac{1}{2}\\,\\sigma^2 S^2 \\cdot \\big(-\\tfrac{1}{S^2}\\big)\\Big)dt + \\sigma S \\cdot \\tfrac{1}{S}\\,dW."}</Math>
        <Math>{"d(\\ln S) = \\Big(\\mu - \\tfrac{1}{2}\\sigma^2\\Big)dt + \\sigma\\,dW."}</Math>
        <P>
          Now <MathInline>{"\\ln S"}</MathInline> follows a plain Brownian motion <em>with constant drift</em>, so it
          integrates trivially: <MathInline>{"\\ln S_t - \\ln S_0 = (\\mu - \\tfrac12\\sigma^2)t + \\sigma W_t"}</MathInline>.
          Exponentiate to get the closed-form solution of GBM:
        </P>
        <Math>{"S_t = S_0\\,\\exp\\!\\Big[\\big(\\mu - \\tfrac{1}{2}\\sigma^2\\big)t + \\sigma W_t\\Big]."}</Math>
        <P>
          <Strong>Why it matters:</Strong> the growth rate of the <em>logarithm</em> — the compound rate you actually
          earn — is <MathInline>{"\\mu - \\tfrac12\\sigma^2"}</MathInline>, not <MathInline>{"\\mu"}</MathInline>. The
          <MathInline>{"-\\tfrac12\\sigma^2"}</MathInline> is <A href="/tutorials/returns-and-compounding">volatility
          drag</A>, and here it drops out of Itô&rsquo;s lemma automatically: the concavity of{" "}
          <MathInline>{"\\ln"}</MathInline> (its negative second derivative) turns variance into a systematic penalty on
          compound growth. Two assets with the same arithmetic drift <MathInline>{"\\mu"}</MathInline> but different
          volatility compound at different rates — the more volatile one lags by exactly half its variance.
        </P>
      </Callout>
      <P>
        Because <MathInline>{"\\ln S_t"}</MathInline> is normal, <MathInline>{"S_t"}</MathInline> is{" "}
        <Strong>log-normal</Strong> — positive, right-skewed, and with a median (<MathInline>{"S_0 e^{(\\mu - \\sigma^2/2)t}"}</MathInline>)
        that sits <em>below</em> its mean (<MathInline>{"S_0 e^{\\mu t}"}</MathInline>). The typical path underperforms
        the average path; a few big winners drag the mean above the median. That gap is the drag, made visual.
      </P>
      <ChartFigure
        name="tut/lognormal_terminal"
        alt="A right-skewed histogram of the terminal price of a geometric Brownian motion, with the median marked to the left of the higher mean"
        caption="The terminal price of a GBM is log-normal — the distribution of where the paths end up. It is right-skewed: most outcomes bunch below, a thin tail of big winners pulls the mean to the right of the median. That mean-above-median gap is exactly the volatility drag the −sigma^2/2 term encodes."
      />
      <Callout kind="tip" title="Scenario — the drag on a calm index vs a wild altcoin, over one year">
        <P>
          Two instruments, one year (<MathInline>{"t = 1"}</MathInline>). A broad equity index with arithmetic drift{" "}
          <MathInline>{"\\mu = 10\\%"}</MathInline> and volatility <MathInline>{"\\sigma = 20\\%"}</MathInline>; and an
          altcoin with a fat <MathInline>{"\\mu = 30\\%"}</MathInline> drift but{" "}
          <MathInline>{"\\sigma = 80\\%"}</MathInline> volatility. Itô says the <em>compound</em> growth rate is{" "}
          <MathInline>{"\\mu - \\tfrac12\\sigma^2"}</MathInline>, so plug in the numbers:
        </P>
        <Math>{"\\text{index: } 0.10 - \\tfrac12(0.20)^2 = 0.08, \\qquad \\text{altcoin: } 0.30 - \\tfrac12(0.80)^2 = -0.02."}</Math>
        <P>
          The index compounds at <MathInline>{"8\\%"}</MathInline> — the <MathInline>{"2\\%"}</MathInline> drag is a mild
          tax. The altcoin is the shock: despite a <MathInline>{"+30\\%"}</MathInline> average return, its{" "}
          <MathInline>{"32\\%"}</MathInline> drag makes the median holder <em>lose</em> money — the typical one-year path
          ends at <MathInline>{"S_0 e^{-0.02} = 0.98\\,S_0"}</MathInline>, down <MathInline>{"2\\%"}</MathInline>, while the
          <em> mean</em> ends at <MathInline>{"S_0 e^{0.30} = 1.35\\,S_0"}</MathInline>, up{" "}
          <MathInline>{"35\\%"}</MathInline>. The gap between them is not a paradox: a handful of moon-shot paths haul the
          average up while most paths quietly bleed. At the desk this is why you size on{" "}
          <em>log</em> growth, not headline drift, and why leverage on a high-vol asset can have a negative expected
          compound rate even when each bet has positive expected return — the same volatility drag you met in{" "}
          <A href="/tutorials/returns-and-compounding">returns and compounding</A>, now falling straight out of the
          second-derivative term in Itô&rsquo;s lemma.
        </P>
      </Callout>
      <ChartFigure
        name="tut/gbm_paths"
        alt="Many simulated geometric Brownian motion price paths starting from one point, fanning out into a right-skewed log-normal cloud, with the mean path above the median path"
        caption="Simulated GBM price paths. They start at one price and fan into a right-skewed cloud: most paths cluster low while a few run away high, so the mean path (upper line) sits above the median path (lower line). The wedge between them is volatility drag — the reason median wealth grows at mu − sigma^2/2, not mu."
      />
      <CodeBlock
        filename="gbm_sim.py"
        code={`import numpy as np

# One GBM path via the exact log-solution (no discretisation error):
#   S_t = S_0 * exp((mu - sigma^2/2) t + sigma W_t)
S0, mu, sigma, T, steps = 100.0, 0.08, 0.20, 1.0, 252
dt = T / steps
dW = np.random.normal(0.0, np.sqrt(dt), steps)      # increments ~ N(0, dt)
logS = np.log(S0) + np.cumsum((mu - 0.5*sigma**2)*dt + sigma*dW)
path = np.exp(logS)                                  # a single log-normal price path`}
      />

      <H2>Why model prices this way — and where it breaks</H2>
      <P>
        GBM earns its place because it captures the three things that matter most cheaply: prices stay positive, returns
        compound multiplicatively, and volatility scales with the square root of time. It gives closed-form option
        prices and trivially fast simulation. But it is a <em>model</em>, and its assumptions are exactly where real
        markets bite back:
      </P>
      <Table
        head={["GBM assumes", "Reality", "Consequence"]}
        rows={[
          ["Gaussian log-returns", "Fat tails — extreme moves far more likely", "Underestimates crash / gap risk"],
          ["Constant volatility σ", "Volatility clusters and spikes (GARCH-like)", "Mis-prices risk in regime shifts"],
          ["Continuous paths", "Prices jump (gaps, halts, news)", "Stops slip; no continuous hedging"],
          ["Independent increments", "Short-horizon autocorrelation, trends", "The very thing edges exploit"],
        ]}
      />
      <Callout kind="warn" title="The thin tails are the dangerous lie">
        The single most consequential flaw is the Gaussian assumption. Real return distributions are{" "}
        <em>leptokurtic</em> — the tails are far heavier than the normal, so &ldquo;20-sigma&rdquo; days that a Gaussian
        says happen once in the age of the universe actually happen every few years. A risk model built on pure GBM will
        systematically under-reserve for the moves that blow up accounts. This is why edgekit&rsquo;s risk tools report
        empirical <A href="/tutorials/monte-carlo">tail statistics</A> (VaR/CVaR from resampled real returns) rather
        than trusting a fitted normal, and why the last independent-increment row is, ironically, the one an edge is a
        bet against.
      </Callout>
      <P>
        The right stance is instrumental: GBM is the frictionless baseline you reason <em>from</em>, the &ldquo;no
        edge, no fat tails&rdquo; null. Simulation lets you keep its convenience while swapping in fatter tails and
        clustered volatility to stress-test what the closed form hides.
      </P>

      <P>
        <Strong>Next:</Strong> these processes are exactly what a Monte-Carlo engine draws from — and how you generate
        thousands of plausible futures to stress a strategy. <A href="/tutorials/simulating-markets">Simulating
        markets</A>.
      </P>
    </>
  );
}
