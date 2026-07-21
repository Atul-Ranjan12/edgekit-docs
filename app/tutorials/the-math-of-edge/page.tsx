import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";
import { Math, MathInline } from "@/components/Math";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "The math of edge" };

export default function Page() {
  return (
    <>
      <H1>The math of edge</H1>
      <Lead>
        &ldquo;Edge&rdquo; is not a vibe — it is a number. It is the expected value of one trade, measured in units of
        risk. This chapter defines it precisely, shows why it is invisible until you have taken many trades, and then
        confronts the harder question the beginner never asks: given a real edge, how much should you bet? The answers
        are less aggressive than intuition suggests.
      </Lead>

      <H2>R-multiples — the unit of edge</H2>
      <P>
        Dollars are a bad unit for comparing trades, because a $500 win on a $5,000 risk is nothing like a $500 win on
        a $50 risk. The fix is the <Strong>R-multiple</Strong>: express every outcome as a multiple of the amount you
        risked on that trade (<MathInline>{"1R"}</MathInline> = your initial stop distance in dollars).
      </P>
      <Math>{"R = \\frac{\\text{profit or loss on the trade}}{\\text{dollars risked at entry}}"}</Math>
      <P>
        A trade stopped out for its full risk is <MathInline>{"-1R"}</MathInline>; one that makes three times its risk
        is <MathInline>{"+3R"}</MathInline>. R-multiples make trades of different sizes and different instruments
        directly comparable, and they are the native language of{" "}
        <A href="/docs/api/metrics">edgekit.metrics</A> — <Code>trade_stats</Code> takes an array of per-trade R and
        gives you everything else.
      </P>
      <Callout kind="note" title="Why the R-multiple is the right unit">
        Dividing by dollars-risked <em>normalises</em> every trade to the same scale, so the per-trade outcomes{" "}
        <MathInline>{"R_1, R_2, \\dots"}</MathInline> become draws from one common distribution rather than
        apples-and-oranges dollar figures. That single move is what makes the expectation{" "}
        <MathInline>{"E[R]"}</MathInline>, the variance, and every probability statement in this chapter well-defined:
        you cannot average a distribution that changes units every trade. R-multiples turn a messy trade log into a
        clean sample from a random variable.
      </Callout>

      <H2>Expectancy</H2>
      <P>
        Suppose a strategy wins with probability <MathInline>{"p"}</MathInline>, and on a win it makes{" "}
        <MathInline>{"W"}</MathInline> (in R) while on a loss it gives back <MathInline>{"L"}</MathInline> (in R,
        positive). Its <Strong>expectancy</Strong> is the expected R per trade:
      </P>
      <Math>{"E[R] = p\\,W - (1 - p)\\,L"}</Math>
      <Callout kind="tip" title="Derivation — expectancy is just E[·] of a two-outcome variable">
        <P>
          Model one trade as a random variable <MathInline>{"R"}</MathInline> that takes the value{" "}
          <MathInline>{"+W"}</MathInline> with probability <MathInline>{"p"}</MathInline> and{" "}
          <MathInline>{"-L"}</MathInline> with probability <MathInline>{"1-p"}</MathInline>. By the definition of
          expected value — the probability-weighted sum of the outcomes —
        </P>
        <Math>{"E[R] = \\sum_x x\\,P(R = x) = (+W)\\,p + (-L)\\,(1 - p) = p\\,W - (1-p)\\,L."}</Math>
        <P>
          <Strong>Short proof via linearity.</Strong> Write the outcome with two indicator variables,{" "}
          <MathInline>{"R = W\\,\\mathbb{1}_{\\text{win}} - L\\,\\mathbb{1}_{\\text{loss}}"}</MathInline>, where{" "}
          <MathInline>{"\\mathbb{1}_{\\text{win}} = 1"}</MathInline> on a win and <MathInline>{"0"}</MathInline>{" "}
          otherwise. The expectation of an indicator is just the probability of its event,{" "}
          <MathInline>{"E[\\mathbb{1}_{\\text{win}}] = P(\\text{win}) = p"}</MathInline>. Linearity of expectation —{" "}
          <MathInline>{"E[aX + bY] = a\\,E[X] + b\\,E[Y]"}</MathInline>, which holds with{" "}
          <em>no independence assumption</em> — then gives{" "}
          <MathInline>{"E[R] = W\\,E[\\mathbb{1}_{\\text{win}}] - L\\,E[\\mathbb{1}_{\\text{loss}}] = pW - (1-p)L"}</MathInline>.
        </P>
        <P>
          <Strong>Why it matters for trading.</Strong> The formula is exact for a <em>single</em> trade and assumes
          nothing about independence or identical distribution — those enter only when you average many trades (below).
          So expectancy is well-defined even for a strategy whose trades are correlated or whose payoff shape drifts;
          it is the one number that tells you whether the game is worth playing at all.
        </P>
      </Callout>
      <P>
        This is the single most important formula in trading. It is just the expected value from{" "}
        <A href="/tutorials/probability-and-distributions">Probability & distributions</A> applied to a trade. If{" "}
        <MathInline>{"E[R] > 0"}</MathInline> you have an edge; if <MathInline>{"E[R] \\le 0"}</MathInline> no amount
        of clever money management can save you. edgekit reports this as <Code>ev_r</Code>.
      </P>
      <Table
        head={["Win rate p", "Avg win W", "Avg loss L", "Expectancy E[R]", "Edge?"]}
        rows={[
          ["0.40", "2.0R", "1.0R", "+0.20R", "Yes — low win rate, big winners"],
          ["0.60", "1.0R", "1.0R", "+0.20R", "Yes — same edge, different shape"],
          ["0.70", "0.5R", "1.5R", "−0.10R", "No — high win rate, still loses"],
          ["0.50", "1.0R", "1.0R", "0.00R", "Coin flip — no edge"],
        ]}
      />
      <Callout kind="tip" title="Scenario: the first row, in dollars, over 100 trades">
        Take the top row — <MathInline>{"p = 0.40"}</MathInline>, <MathInline>{"W = 2R"}</MathInline>,{" "}
        <MathInline>{"L = 1R"}</MathInline>, so <MathInline>{"E[R] = +0.20R"}</MathInline>. Trade it on a $100,000 account
        risking <MathInline>{"R = \\$500"}</MathInline> per trade, so each trade is worth <MathInline>{"+\\$1{,}000"}</MathInline>{" "}
        on a win and <MathInline>{"-\\$500"}</MathInline> on a loss, and the average trade earns{" "}
        <MathInline>{"0.20 \\times \\$500 = \\$100"}</MathInline>. Over 100 trades your <em>expected</em> profit is{" "}
        <MathInline>{"\\$10{,}000"}</MathInline>. But you win only 40% of them, so you will string together losing runs
        — six losses in a row (<MathInline>{"-\\$3{,}000"}</MathInline>) is unremarkable for a 40%-win system. The
        edge is real and the drawdowns are real at the same time; the <MathInline>{"+\\$100"}</MathInline>/trade only
        shows up once the losers and the fat winners have both had their turn.
      </Callout>
      <Callout kind="note" title="Win rate alone tells you nothing">
        A 70%-win strategy can be a money-loser and a 40%-win strategy a winner. Only the <em>combination</em> of win
        rate and payoff — i.e. expectancy — decides. Beginners chase high win rates; the math cares about{" "}
        <MathInline>{"E[R]"}</MathInline>.
      </Callout>

      <H2>Payoff ratio</H2>
      <P>
        The <Strong>payoff ratio</Strong> <MathInline>{"b = W / L"}</MathInline> is the average win divided by the
        average loss. It lets you find the <em>breakeven</em> win rate for any payoff — the win rate at which{" "}
        <MathInline>{"E[R] = 0"}</MathInline>:
      </P>
      <Math>{"p_{\\text{breakeven}} = \\frac{1}{1 + b} = \\frac{L}{W + L}"}</Math>
      <Callout kind="tip" title="Derivation — set the expectancy to zero and solve">
        <P>
          Breakeven is the win rate at which the edge vanishes, so set{" "}
          <MathInline>{"E[R] = pW - (1-p)L = 0"}</MathInline> and solve for <MathInline>{"p"}</MathInline>:
        </P>
        <Math>{"pW = (1-p)L \\;\\Rightarrow\\; pW + pL = L \\;\\Rightarrow\\; p\\,(W + L) = L \\;\\Rightarrow\\; p = \\frac{L}{W+L} = \\frac{1}{1 + W/L} = \\frac{1}{1+b}."}</Math>
        <P>
          <Strong>Why it matters for trading.</Strong> This is the bar the <em>real</em> hit rate must clear{" "}
          <em>after</em> costs. Costs act by shrinking every <MathInline>{"W"}</MathInline> and enlarging every{" "}
          <MathInline>{"L"}</MathInline>, which lowers <MathInline>{"b"}</MathInline> and raises{" "}
          <MathInline>{"p_{\\text{breakeven}}"}</MathInline> — the reason a gross edge so often turns into a net loss.
          Choosing a target R is therefore not a preference; it is a commitment to beat a specific, computable win rate.
        </P>
      </Callout>
      <P>
        With a 2:1 payoff you only need to win a third of the time to break even; with a 1:2 payoff you need to win
        two-thirds. This is the trade-off every strategy design negotiates: wider targets buy you a lower required win
        rate but a lower hit rate to go with it. In edgekit, an <Code>ORB(or_bars=30, target_r=2.0)</Code> is picking a
        2R payoff and therefore a ~33% breakeven — everything hinges on whether the real hit rate clears it once costs
        are paid.
      </P>

      <H2>The law of large numbers</H2>
      <P>
        Expectancy is a statement about the <em>average</em> of many trades — and here is the catch that ruins
        undercapitalised traders: over a small number of trades, expectancy is invisible. The{" "}
        <Strong>law of large numbers</Strong> says the sample average converges to the true expectancy only as the
        number of trades grows:
      </P>
      <Math>{"\\bar{R}_n = \\frac{1}{n} \\sum_{i=1}^{n} R_i \\;\\xrightarrow{\\; n \\to \\infty \\;}\\; E[R]"}</Math>
      <Callout kind="note" title="Proof sketch — why it converges, and how slowly">
        <P>
          Assume the trades are independent with common mean <MathInline>{"E[R] = \\mu"}</MathInline> and variance{" "}
          <MathInline>{"\\sigma^2"}</MathInline>. Linearity gives <MathInline>{"E[\\bar{R}_n] = \\mu"}</MathInline>{" "}
          (the sample average is unbiased), and because variance of independent sums adds,
        </P>
        <Math>{"\\operatorname{Var}(\\bar{R}_n) = \\frac{1}{n^2}\\sum_{i=1}^{n}\\operatorname{Var}(R_i) = \\frac{\\sigma^2}{n} \\;\\xrightarrow{\\; n \\to \\infty \\;}\\; 0."}</Math>
        <P>
          A random variable with a fixed mean and a variance collapsing to zero concentrates on that mean
          (Chebyshev: <MathInline>{"P(|\\bar{R}_n - \\mu| \\ge \\varepsilon) \\le \\sigma^2 / (n\\varepsilon^2) \\to 0"}</MathInline>).
          That is the weak law. <Strong>Why it matters for trading:</Strong> the standard error of your measured edge
          shrinks only as <MathInline>{"\\sigma/\\sqrt{n}"}</MathInline> — the <em>square-root-of-n</em> law. Halving your
          uncertainty needs four times the trades; a <MathInline>{"+0.2R"}</MathInline> edge with per-trade noise{" "}
          <MathInline>{"\\sigma \\approx 1R"}</MathInline> needs on the order of a hundred trades before the signal
          clears the noise. This is precisely why a losing month tells you almost nothing.
        </P>
      </Callout>
      <P>
        The word <em>converges</em> hides a slow, noisy reality. A genuine <MathInline>{"+0.2R"}</MathInline> edge can
        sit underwater for dozens of trades in a row; a losing streak of 8–10 is routine even for a good system. Early
        on, luck dominates skill — the running average staggers around before it settles. This is the mathematical
        reason a losing month tells you almost nothing.
      </P>
      <ChartFigure
        name="tut/lln_convergence"
        alt="A running average of trade R-multiples slowly converging toward the true expectancy"
        caption="Law of large numbers: the running average edge (noisy line) only settles onto its true expectancy (dashed) after many trades. Early swings are pure sampling noise, not signal."
      />
      <Callout kind="warn" title="Edge and survival are different problems">
        A positive expectancy guarantees you win <em>eventually</em>. It says nothing about surviving the drawdowns
        along the way — and if a losing streak wipes you out first, the eventual edge never arrives. That is why edge
        (this section) and sizing (the next) are two separate questions, and both must be answered.
      </Callout>

      <H2>Random walks and the martingale baseline</H2>
      <P>
        What does <em>no edge</em> look like in the language of probability? It is a <Strong>martingale</Strong>: a
        process whose best forecast of its next value, given everything you know, is simply its current value.
      </P>
      <Math>{"E[\\,P_{t+1} \\mid P_t, P_{t-1}, \\dots\\,] = P_t \\quad\\Longleftrightarrow\\quad E[\\,\\text{next return} \\mid \\text{past}\\,] = 0."}</Math>
      <P>
        A price that is a pure random walk is a martingale, and it is a theorem (the optional-stopping theorem) that{" "}
        <em>no</em> trading rule — no stop, target, or clever entry timing — can manufacture positive expectancy from a
        martingale: every strategy inherits <MathInline>{"E[R] = 0"}</MathInline> before costs, and a loss after them.
        An <Strong>edge is precisely a departure from the martingale property</Strong>: <MathInline>{"E[R] > 0"}</MathInline>{" "}
        means the game, in your direction, is a <em>sub</em>martingale — the conditional expectation drifts up, not
        flat. Everything in this course is an attempt to establish, honestly, that a given series is not a martingale.
      </P>
      <Callout kind="note" title="Why it matters for trading">
        The martingale is the null hypothesis you are always testing against. The permutation test in{" "}
        <A href="/tutorials/why-backtests-lie">the next chapter</A> works by literally shuffling your data into a
        martingale and asking whether your edge could have come from that. If a strategy&rsquo;s returns are
        indistinguishable from a driftless random walk, its beautiful backtest is measuring luck, not signal.
      </Callout>

      <H2>The Kelly criterion</H2>
      <P>
        Given a real edge, how much of your capital should you risk per trade? Bet too little and you leave growth on
        the table; bet too much and volatility drag (from{" "}
        <A href="/tutorials/returns-and-compounding">Returns & compounding</A>) — or ruin — eats you alive. The{" "}
        <Strong>Kelly criterion</Strong> is the bet fraction that maximises the long-run geometric growth rate. For a
        payoff ratio <MathInline>{"b"}</MathInline> and win probability <MathInline>{"p"}</MathInline>:
      </P>
      <Math>{"f^{*} = \\frac{p(b + 1) - 1}{b}"}</Math>
      <Callout kind="tip" title="Derivation — maximise expected log-growth">
        <P>
          Why <em>log</em> growth? Because wealth <Strong>compounds multiplicatively</Strong>: after{" "}
          <MathInline>{"n"}</MathInline> bets your capital is a product of per-bet multipliers, and the log turns that
          product into a sum whose long-run average is governed by the law of large numbers. Maximising the expected
          log return per bet, <MathInline>{"G(f) = E[\\ln(1 + fX)]"}</MathInline>, therefore maximises the long-run
          <em>geometric</em> growth rate. Let the per-unit outcome be <MathInline>{"X = +b"}</MathInline> on a win
          (probability <MathInline>{"p"}</MathInline>) and <MathInline>{"X = -1"}</MathInline> on a loss (probability{" "}
          <MathInline>{"1-p"}</MathInline>), and stake fraction <MathInline>{"f"}</MathInline>:
        </P>
        <Math>{"G(f) = p\\,\\ln(1 + fb) + (1-p)\\,\\ln(1 - f)."}</Math>
        <P>Differentiate and set to zero (the game is concave in <MathInline>{"f"}</MathInline>, so this is the max):</P>
        <Math>{"G'(f) = \\frac{p\\,b}{1 + fb} - \\frac{1-p}{1 - f} = 0."}</Math>
        <Math>{"p\\,b\\,(1 - f) = (1-p)\\,(1 + fb) \\;\\Rightarrow\\; pb - pbf = (1-p) + (1-p)bf."}</Math>
        <P>Collect the <MathInline>{"f"}</MathInline> terms — the right-side <MathInline>{"bf"}</MathInline> factors combine:</P>
        <Math>{"pb - (1-p) = bf\\,[\\,p + (1-p)\\,] = bf \\;\\Rightarrow\\; f^{*} = \\frac{pb - (1-p)}{b} = \\frac{p(b+1) - 1}{b}."}</Math>
        <P>
          The second derivative <MathInline>{"G''(f) = -\\,\\dfrac{p b^2}{(1+fb)^2} - \\dfrac{1-p}{(1-f)^2} < 0"}</MathInline>{" "}
          everywhere, confirming <MathInline>{"f^{*}"}</MathInline> is a maximum, not a saddle. Notice the numerator{" "}
          <MathInline>{"pb - (1-p)"}</MathInline> is exactly the expectancy per unit staked: <em>no edge, no bet.</em>
        </P>
      </Callout>
      <Callout kind="warn" title="Why fractional Kelly — the variance of log-growth is huge">
        <P>
          Full Kelly maximises the <em>expected</em> log-growth, but it says nothing about its <em>variance</em>, which
          at <MathInline>{"f^{*}"}</MathInline> is punishingly large — full-Kelly equity swings routinely halve the
          account. Because <MathInline>{"G(f)"}</MathInline> is concave, a second-order expansion around the optimum,
        </P>
        <Math>{"G(f) \\approx G(f^{*}) - \\tfrac{1}{2}\\,|G''(f^{*})|\\,(f - f^{*})^{2},"}</Math>
        <P>
          shows growth falls off only <em>quadratically</em> as you back away from <MathInline>{"f^{*}"}</MathInline>{" "}
          while volatility falls <em>linearly</em>. That asymmetry is the whole case for <Strong>fractional Kelly</Strong>:
          betting <MathInline>{"\\tfrac{1}{2}f^{*}"}</MathInline> keeps roughly three-quarters of the growth for about
          half the volatility. Since <MathInline>{"p"}</MathInline> and <MathInline>{"b"}</MathInline> are themselves
          <em>estimated</em> with the sampling error above, betting a fraction also hedges the very real chance you have
          over-estimated your edge.
        </P>
      </Callout>
      <P>
        The numerator is just the expectancy per unit staked, so Kelly scales your bet with your edge and shrinks it
        with the payoff&rsquo;s riskiness. A strategy with <MathInline>{"p = 0.55"}</MathInline> and{" "}
        <MathInline>{"b = 1"}</MathInline> gives <MathInline>{"f^{*} = 0.10"}</MathInline> — risk 10% of capital per
        bet to grow fastest. The growth-rate curve peaks at <MathInline>{"f^{*}"}</MathInline> and falls off on both
        sides; push past it and growth actually turns <em>negative</em> despite the positive edge.
      </P>
      <ChartFigure
        name="tut/kelly_curve"
        alt="Long-run growth rate as a function of bet fraction, peaking at the Kelly fraction and going negative when over-betting"
        caption="Growth rate vs bet fraction. It peaks at f*, and crucially the curve is asymmetric — over-betting past ~2f* drives long-run growth below zero even though every individual bet has positive expectancy."
      />
      <Callout kind="tip" title="Scenario: a coin-flip edge, sized three ways">
        You have an even-money strategy (<MathInline>{"b = 1"}</MathInline>) that wins{" "}
        <MathInline>{"p = 0.55"}</MathInline> of the time. Full Kelly says{" "}
        <MathInline>{"f^{*} = \\frac{0.55(1+1) - 1}{1} = 0.10"}</MathInline> — risk 10% of the account per bet to grow
        fastest. On $100,000 that is a $10,000 stake per trade, and the theory promises the maximum long-run growth
        rate. It also promises equity swings that routinely halve the account, and if your true{" "}
        <MathInline>{"p"}</MathInline> is really 0.53 (you over-estimated), 10% is now <em>over</em>-betting the real
        edge. Half-Kelly — <MathInline>{"5\\%"}</MathInline>, a $5,000 stake — keeps roughly three-quarters of the growth
        for about half the volatility. That is the trade nearly every professional takes, and it is why edgekit sizes to
        a drawdown budget rather than betting a full, fragile point-estimate of <MathInline>{"f^{*}"}</MathInline>.
      </Callout>
      <H3>Why full-Kelly is too aggressive</H3>
      <P>Nobody serious bets full Kelly. Three reasons, all fatal in practice:</P>
      <Ul>
        <Li>
          <Strong>The curve is flat on top but a cliff on the right.</Strong> Half-Kelly captures about 75% of the
          growth for roughly half the volatility — a wonderful trade. Over-betting is punished far more harshly than
          under-betting.
        </Li>
        <Li>
          <Strong>Your edge is estimated, not known.</Strong> <MathInline>{"p"}</MathInline> and{" "}
          <MathInline>{"b"}</MathInline> come from a finite sample with the standard error of the last chapter. If you
          have over-estimated your edge, full-Kelly on the true (smaller) edge is already over-betting.
        </Li>
        <Li>
          <Strong>Full-Kelly drawdowns are brutal.</Strong> The expected worst drawdown at full Kelly routinely exceeds
          50% — deeper than almost any real account (or prop-firm rule) can tolerate.
        </Li>
      </Ul>
      <P>
        The standard practice is <Strong>fractional Kelly</Strong> — a quarter to a half of{" "}
        <MathInline>{"f^{*}"}</MathInline>. edgekit sidesteps the fragile point-estimate of Kelly entirely for
        deployment: rather than bet a fraction of a guessed edge, <A href="/docs/api/sizing">edgekit.sizing</A> sizes
        against a hard <em>drawdown budget</em>, which is the constraint that actually binds a real account.
      </P>
      <CodeBlock
        filename="edge_to_size.py"
        code={`from edgekit import trade_stats, sizing

# 1) measure the edge, in R
st = trade_stats(trades.r, dates=trades.date)
print(st["ev_r"], st["win_rate"], st["pf"])   # is E[R] > 0 with enough trades?

# 2) size to a drawdown budget rather than a full-Kelly guess
res = sizing.size_to_dd(daily_r, dd_budget=0.095, account=100_000)
res["dollar_per_r"]   # dollars to risk per 1R so historical max DD == 9.5%
res["binding"]        # which constraint set the size`}
      />

      <H2>Risk of ruin</H2>
      <P>
        The flip side of Kelly. <Strong>Risk of ruin</Strong> is the probability that a string of losses drags your
        account below a threshold you cannot come back from — before the edge has time to pay out. For a simplified
        even-money game with win probability <MathInline>{"p"}</MathInline> and{" "}
        <MathInline>{"N"}</MathInline> units of capital, the classic gambler&rsquo;s-ruin result is:
      </P>
      <Math>{"P_{\\text{ruin}} = \\left(\\frac{1 - p}{p}\\right)^{N}"}</Math>
      <Callout kind="tip" title="Derivation — first-step analysis of the gambler's ruin">
        <P>
          Track capital in whole units and let <MathInline>{"r_i"}</MathInline> be the probability of <em>eventual</em>{" "}
          ruin (hitting <MathInline>{"0"}</MathInline>) starting from <MathInline>{"i"}</MathInline> units, with win
          probability <MathInline>{"p"}</MathInline> and loss probability <MathInline>{"q = 1-p"}</MathInline> per bet.
          Condition on the first bet — this is <Strong>first-step analysis</Strong>, an application of the law of total
          probability:
        </P>
        <Math>{"r_i = p\\,r_{i+1} + q\\,r_{i-1}, \\qquad r_0 = 1."}</Math>
        <P>
          This linear recurrence has characteristic equation <MathInline>{"p\\,x^2 - x + q = 0"}</MathInline>, whose
          roots are <MathInline>{"x = 1"}</MathInline> and <MathInline>{"x = q/p"}</MathInline>. The general solution is
          therefore <MathInline>{"r_i = A + B\\,(q/p)^{i}"}</MathInline>. With a positive edge{" "}
          <MathInline>{"(p > q)"}</MathInline> the ruin probability must stay bounded and tend to{" "}
          <MathInline>{"0"}</MathInline> as capital grows, forcing <MathInline>{"A = 0"}</MathInline>; the boundary{" "}
          <MathInline>{"r_0 = 1"}</MathInline> forces <MathInline>{"B = 1"}</MathInline>. Hence{" "}
          <MathInline>{"r_i = (q/p)^{i}"}</MathInline>, and starting from <MathInline>{"N"}</MathInline> units,
        </P>
        <Math>{"P_{\\text{ruin}} = \\left(\\frac{q}{p}\\right)^{N} = \\left(\\frac{1-p}{p}\\right)^{N}."}</Math>
        <P>
          <Strong>Why it matters for trading.</Strong> A drawdown limit — a prop-firm rule, or the level below which you
          quit — is exactly a <em>lower absorbing barrier</em> on this walk. The exponent{" "}
          <MathInline>{"N"}</MathInline> is how many units of risk your capital represents, and <em>you</em> set it with
          bet size: risk 1% per trade and <MathInline>{"N = 100"}</MathInline>; risk 10% and{" "}
          <MathInline>{"N = 10"}</MathInline>. Because ruin decays <em>geometrically</em> in{" "}
          <MathInline>{"N"}</MathInline>, over-betting shrinks the exponent and drives{" "}
          <MathInline>{"(q/p)^{N} \\to 1"}</MathInline> — a positive edge with too large a bet is almost sure to be
          ruined before the law of large numbers can pay it out. Edge sets the base <MathInline>{"q/p < 1"}</MathInline>;
          sizing sets the exponent — and the exponent wins.
        </P>
      </Callout>
      <P>
        Two levers control it: the size of your edge (<MathInline>{"p"}</MathInline> above 0.5) and how many units of
        risk your capital represents (<MathInline>{"N"}</MathInline>, which you set by bet size). Even a solid edge
        combined with an over-sized bet gives a frightening probability of ruin — and once ruined, the positive
        expectancy is worthless because you are no longer in the game.
      </P>
      <Callout kind="tip" title="Scenario: same edge, bet size decides survival">
        Keep the winning edge <MathInline>{"p = 0.55"}</MathInline> (so <MathInline>{"q/p = 0.45/0.55 \\approx 0.818"}</MathInline>)
        and treat &ldquo;ruin&rdquo; as losing the whole account. If you risk <Strong>1%</Strong> per trade, your capital
        is <MathInline>{"N = 100"}</MathInline> units and the ruin probability is{" "}
        <MathInline>{"0.818^{100}"}</MathInline> — around <MathInline>{"10^{-9}"}</MathInline>, effectively zero. Crank
        the bet to <Strong>10%</Strong> per trade and now <MathInline>{"N = 10"}</MathInline>:{" "}
        <MathInline>{"0.818^{10} \\approx 0.13"}</MathInline> — a 13% chance of blowing up despite the identical,
        genuinely positive edge. Push to <Strong>20%</Strong> (<MathInline>{"N = 5"}</MathInline>) and it climbs to{" "}
        <MathInline>{"0.818^{5} \\approx 0.37"}</MathInline>. The signal never changed; the exponent did. Sizing, not
        edge, is what keeps you in the game long enough for the edge to pay.
      </Callout>
      <ChartFigure
        name="tut/risk_of_ruin"
        alt="Risk of ruin rising sharply as bet size per trade increases, for a fixed positive edge"
        caption="Risk of ruin against risk-per-trade for a fixed positive edge. Small bets keep ruin near zero; past a point the same edge is almost certain to blow up. Sizing, not signal, decides survival."
      />
      <Callout kind="tip" title="The whole message in one line">
        Edge decides whether you win in the long run; sizing decides whether you live long enough to see it. A positive
        expectancy and a bet size that keeps risk-of-ruin near zero are <em>both</em> required — neither substitutes
        for the other. This is the bridge into <A href="/tutorials/position-sizing">Position sizing</A>.
      </Callout>

      <P>
        <Strong>Next:</Strong> we have the math to define and size an edge — so why do so many backtests show edges
        that evaporate live? <A href="/tutorials/why-backtests-lie">Why most backtests lie</A>.
      </P>
    </>
  );
}
