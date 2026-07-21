import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.options" };

export default function OptionsPage() {
  return (
    <>
      <H1>edgekit.options</H1>
      <Lead>
        Black-Scholes — European option pricing, the full first-order Greeks, and an implied-volatility
        solver, with a continuous dividend / carry yield <Code>q</Code> throughout. Enough to price,
        hedge, and back out vol without pulling in a derivatives library.
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> The two normal-distribution primitives (<Code>norm_cdf</Code>,{" "}
        <Code>norm_pdf</Code>) the formulas are built on, the price itself (<Code>bs_price</Code>), the
        Greek bundle (<Code>bs_greeks</Code>), and a Newton/bisection implied-vol root-finder
        (<Code>implied_vol</Code>). Calls and puts are selected with <Code>kind=&quot;call&quot;</Code> /{" "}
        <Code>&quot;put&quot;</Code>; the dividend yield <Code>q</Code> also serves as the foreign rate
        for FX or the convenience-adjusted carry for a future.
      </P>

      <Callout kind="warn" title="Know your Greek units before you size a hedge">
        <P>The Greeks are reported in raw Black-Scholes units, <em>not</em> the rescaled forms desks often quote:</P>
        <Ul>
          <Li><Strong>delta</Strong> — change in option value per <Code>$1</Code> move in spot.</Li>
          <Li><Strong>gamma</Strong> — change in delta per <Code>$1</Code> move in spot (i.e. per <Code>$1²</Code>).</Li>
          <Li><Strong>vega</Strong> — per <Code>1.00</Code> (100 vol-points) change in sigma; <Strong>divide by 100</Strong> for the per-1%-vol figure traders usually quote.</Li>
          <Li><Strong>theta</Strong> — per <em>year</em>; <Strong>divide by 365</Strong> for per-calendar-day decay.</Li>
          <Li><Strong>rho</Strong> — per <Code>1.00</Code> (100 bp × 100) change in the rate.</Li>
        </Ul>
      </Callout>

      <H2>Distribution primitives</H2>

      <H3>norm_cdf</H3>
      <P>Standard-normal cumulative distribution function — the <Code>N(·)</Code> in the Black-Scholes price. Vectorised over array input.</P>
      <CodeBlock code={`norm_cdf(x) -> float | np.ndarray`} />
      <Ul>
        <Li><Code>x</Code> — a scalar or array of standardised values.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> the cumulative probability <Code>P(Z ≤ x)</Code>, same shape as the input.</P>

      <H3>norm_pdf</H3>
      <P>Standard-normal probability density function — the <Code>n(·)</Code> that appears in gamma and vega.</P>
      <CodeBlock code={`norm_pdf(x) -> float | np.ndarray`} />
      <Ul>
        <Li><Code>x</Code> — a scalar or array of standardised values.</Li>
      </Ul>
      <P><Strong>Returns:</Strong> the density at <Code>x</Code>, same shape as the input.</P>

      <H2>Pricing</H2>

      <H3>bs_price</H3>
      <P>
        The Black-Scholes-Merton price of a European call or put with continuous yield <Code>q</Code>.
        The core valuation everything else in the module supports.
      </P>
      <CodeBlock code={`bs_price(S, K, t, r, sigma, kind="call", q=0.0) -> float`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">S</Code>, "float", "—", "Spot price of the underlying."],
          [<Code key="b">K</Code>, "float", "—", "Strike price."],
          [<Code key="c">t</Code>, "float", "—", "Time to expiry in years."],
          [<Code key="d">r</Code>, "float", "—", "Continuously-compounded risk-free rate."],
          [<Code key="e">sigma</Code>, "float", "—", "Volatility (annualised, e.g. 0.20 for 20%)."],
          [<Code key="f">kind</Code>, "str", '"call"', '"call" or "put".'],
          [<Code key="g">q</Code>, "float", "0.0", "Continuous dividend / carry yield."],
        ]}
      />
      <P><Strong>Returns:</Strong> a <Code>float</Code> option premium in the underlying&apos;s currency.</P>
      <CodeBlock code={`import edgekit as ek
ek.options.bs_price(S=100, K=105, t=0.5, r=0.03, sigma=0.20, kind="call")`} />

      <H2>Greeks &amp; implied vol</H2>

      <H3>bs_greeks</H3>
      <P>
        All five first-order Greeks in one call — delta, gamma, vega, theta, rho — for the same option
        as <Code>bs_price</Code>. Read the units callout above before you size a hedge off these.
      </P>
      <CodeBlock code={`bs_greeks(S, K, t, r, sigma, kind="call", q=0.0) -> dict`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">S</Code>, "float", "—", "Spot price."],
          [<Code key="b">K</Code>, "float", "—", "Strike."],
          [<Code key="c">t</Code>, "float", "—", "Time to expiry (years)."],
          [<Code key="d">r</Code>, "float", "—", "Risk-free rate."],
          [<Code key="e">sigma</Code>, "float", "—", "Volatility."],
          [<Code key="f">kind</Code>, "str", '"call"', '"call" or "put".'],
          [<Code key="g">q</Code>, "float", "0.0", "Dividend / carry yield."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a <Code>dict</Code> with keys <Code>&quot;delta&quot;</Code> (per $1
        spot), <Code>&quot;gamma&quot;</Code> (per $1² spot), <Code>&quot;vega&quot;</Code> (per 1.00
        vol — ÷100 for per-1%), <Code>&quot;theta&quot;</Code> (per year — ÷365 for per-day), and{" "}
        <Code>&quot;rho&quot;</Code> (per 1.00 rate).
      </P>
      <CodeBlock code={`g = ek.options.bs_greeks(S=100, K=100, t=0.25, r=0.03, sigma=0.20)
g["delta"]
g["vega"] / 100     # per 1% vol move
g["theta"] / 365    # per calendar day`} />

      <H3>implied_vol</H3>
      <P>
        Back out the volatility that reprices a European option to an observed <Code>price</Code> — a
        Newton root-find with a bisection fallback. The inverse of <Code>bs_price</Code>: feed it a
        market premium, get the market&apos;s vol view.
      </P>
      <CodeBlock code={`implied_vol(price, S, K, t, r, kind="call", q=0.0, tol=1e-6, max_iter=100) -> float`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">price</Code>, "float", "—", "Observed option premium to match."],
          [<Code key="b">S</Code>, "float", "—", "Spot price."],
          [<Code key="c">K</Code>, "float", "—", "Strike."],
          [<Code key="d">t</Code>, "float", "—", "Time to expiry (years)."],
          [<Code key="e">r</Code>, "float", "—", "Risk-free rate."],
          [<Code key="f">kind</Code>, "str", '"call"', '"call" or "put".'],
          [<Code key="g">q</Code>, "float", "0.0", "Dividend / carry yield."],
          [<Code key="h">tol</Code>, "float", "1e-6", "Price convergence tolerance."],
          [<Code key="i">max_iter</Code>, "int", "100", "Maximum solver iterations."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a <Code>float</Code> implied volatility.{" "}
        <Strong>Returns <Code>nan</Code> when <Code>price</Code> is below intrinsic value</Strong> (no
        real vol reproduces it).
      </P>
      <CodeBlock code={`iv = ek.options.implied_vol(price=6.20, S=100, K=100, t=0.25, r=0.03, kind="call")
# nan if price < max(S - K, 0) discounted (below intrinsic)`} />

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/timeseries">edgekit.timeseries</A> — realized / EWMA / GARCH vol to compare against implied.</Li>
        <Li><A href="/docs/api/risk">edgekit.risk</A> — tail-risk metrics for an options-overlaid book.</Li>
      </Ul>
    </>
  );
}
