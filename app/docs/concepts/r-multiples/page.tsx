import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table, Code } from "@/components/prose";

export const metadata: Metadata = { title: "R-multiples" };

export default function RMultiplesPage() {
  return (
    <>
      <H1>R-multiples</H1>
      <Lead>
        edgekit prices every trade in <Strong>R</Strong> — profit measured in units of the risk it put up.
        A strategy never knows how many dollars it is trading; dollars are applied once, at the very end, from a
        single sizing scalar. This one convention is what makes strategies comparable and sizing honest.
      </Lead>

      <P>
        R is the trade&apos;s profit or loss divided by the distance to its initial stop. If you enter at 100 with a
        stop at 96, your risk unit is 4 price-points. Exit at 108 and you made <Code>+2R</Code>; get stopped at 96 and
        you lost <Code>-1R</Code>. The dollar value of one R is a decision you make later and separately — the
        strategy is indifferent to it.
      </P>

      <Callout kind="note" title="The prime unit">
        The R-multiple is the currency of the whole library. Strategies emit trades priced in R; metrics, validation,
        and the permutation test all operate on R-streams. Dollars enter only in <A href="/docs/api/sizing">sizing</A>,
        from one scalar — never baked into the strategy.
      </Callout>

      <H2>Why R, and why sizing is a separate layer</H2>
      <P>
        Baking dollars (or a fixed lot size, or a fixed percent-of-equity) into a backtest quietly couples two things
        that must stay separate: the <em>edge</em> (does this pattern make money per unit of risk?) and the{" "}
        <em>bet size</em> (how much do I risk given my drawdown budget?). Keeping the strategy in R means:
      </P>
      <Ul>
        <Li><Strong>Strategies are comparable.</Strong> A +0.4R/trade system on one instrument and a +0.15R/trade system on another live on the same axis, regardless of price level, volatility, or account size.</Li>
        <Li><Strong>Sizing is honest.</Strong> You size the R-stream to a real drawdown budget <em>once</em> (see <A href="/docs/api/sizing">size_to_dd</A>), instead of discovering after the fact that the backtest secretly assumed 3× leverage.</Li>
        <Li><Strong>Costs are in the same unit as P&amp;L.</Strong> Spread and swap are charged in R too (below), so a trade&apos;s net R already reflects what it actually costs to hold.</Li>
      </Ul>

      <H2>How a Trade&apos;s r is computed</H2>
      <P>
        The engine (<A href="/docs/api/engine">run_bar_loop</A>) fills an entry, tracks the stop distance as the R
        denominator, and on exit computes gross R, subtracts cost in R, and stores the net figure on the{" "}
        <A href="/docs/api/core">Trade</A> dataclass. The core of the loop is exactly:
      </P>
      <CodeBlock
        filename="engine.py (excerpt)"
        code={`# on exit at bar i, with position pos = {"d": dir, "e": entry, "rpx": stop_dist, "ei": entry_i}
days  = (i - pos["ei"]) / bars_per_day
gross = pos["d"] * (ex - pos["e"]) / pos["rpx"]     # signed P&L in stop-distance units = R
r     = gross - cost.r_cost(pos["e"], pos["rpx"], days)   # net of cost, still in R`}
      />
      <P>
        <Code>gross</Code> is the directional price move (<Code>exit − entry</Code>, signed by direction) divided by{" "}
        <Code>stop_dist</Code> — the same denominator the stop is set from, so a full adverse move to the stop is
        exactly <Code>-1R</Code> by construction. <Code>cost.r_cost(...)</Code> converts the round-trip spread and
        per-day swap into R using that identical denominator:
      </P>
      <CodeBlock
        filename="costs.py (excerpt)"
        code={`# CostModel.r_cost — dollar cost divided by the risk unit gives cost in R
def r_cost(self, entry_price, risk_per_unit, days):
    if risk_per_unit <= 0:
        return 0.0
    return (self.spread_rt * entry_price
            + self.swap_day * entry_price * days) / risk_per_unit`}
      />
      <P>
        Because both the gross P&amp;L and the cost are divided by <Code>risk_per_unit</Code> (the stop distance), the
        stored <Code>r</Code> is a pure, dollar-free number. The default <A href="/docs/api/costs">CostModel</A> uses
        the library&apos;s default convention: <Code>spread_rt=0.0012</Code> (12 bps round trip) and{" "}
        <Code>swap_day=0.0002</Code> per day held.
      </P>

      <H3>A worked example</H3>
      <CodeBlock
        filename="r_example.py"
        code={`import edgekit as ek

entry     = 100.0
stop_dist = 4.0          # e.g. 2 * ATR — the R denominator
exit_px   = 108.0
direction = 1            # long

gross_r = direction * (exit_px - entry) / stop_dist       # (108-100)/4 = +2.0 R

cost = ek.costs.CostModel()                                # 12 bps spread, 2 bps/day swap
c_r  = cost.r_cost(entry_price=entry, risk_per_unit=stop_dist, days=3)
# (0.0012*100 + 0.0002*100*3) / 4 = (0.12 + 0.06)/4 = 0.045 R

net_r = gross_r - c_r                                       # +2.0 - 0.045 = +1.955 R
print(round(net_r, 3))    # 1.955`}
      />
      <P>
        A clean +2R idea nets +1.955R after three days of holding cost. Note what did <em>not</em> appear anywhere:
        an account size, a lot size, or a dollar figure. That trade is +1.955R whether you eventually risk $50 or
        $5,000 per R.
      </P>

      <H2>From R to dollars and percent</H2>
      <P>
        The one place dollars enter is sizing. A stream of daily-summed R is handed to{" "}
        <A href="/docs/api/metrics">dd_matched_size</A> (or its wrapper{" "}
        <A href="/docs/api/sizing">size_to_dd</A>), which solves for the single <Code>dollar_per_r</Code> scalar that
        makes the strategy&apos;s <em>historical</em> max drawdown equal to your drawdown budget:
      </P>
      <CodeBlock
        filename="size.py"
        code={`import edgekit as ek

# trades.r is the per-trade net-R series from the engine; collapse to daily R
daily_r = trades.set_index("date")["r"].groupby(lambda t: t.normalize()).sum()

sized = ek.sizing.size_to_dd(
    daily_r,
    dd_budget = 0.095,       # let the worst historical drawdown be 9.5% of the account
    account   = 100_000,
    daily_cap = 0.045,       # ...but never risk more than a 4.5% worst-day either
)

print(sized["dollar_per_r"])   # dollars to risk per 1R
print(sized["binding"])        # "max-dd" or "daily" — which constraint set the size
print(sized["sized"])          # the daily P&L series in dollars`}
      />
      <P>
        The math is deliberately simple and lives in exactly one place. <Code>dd_matched_size</Code> takes the
        realised max drawdown of the cumulative-R curve and scales so that{" "}
        <Code>dd_budget × account / max_dd_r</Code> dollars are risked per R. When a <Code>daily_cap</Code> is given,
        the tighter of the two constraints (worst-day vs. max-drawdown) wins, and the returned <Code>binding</Code>{" "}
        tells you which one bound. To read the result as a percent, divide the sized dollar P&amp;L by the account.
      </P>

      <Table
        head={["Quantity", "R-space", "Converted"]}
        rows={[
          ["One trade", <Code key="a">r = +1.955</Code>, <span key="b">× <Code>dollar_per_r</Code> → dollars</span>],
          ["Annual return", <Code key="c">ann_r</Code>, <span key="d">R/yr × <Code>dollar_per_r</Code> ÷ account → %/yr</span>],
          ["Max drawdown", <Code key="e">max_dd_r</Code>, <span key="f">= <Code>dd_budget × account</Code> by construction</span>],
        ]}
      />

      <Callout kind="warn" title="The size is a ceiling, not a promise">
        <Code>dd_matched_size</Code> fits the size to the <em>single realised</em> historical drawdown — the luckiest
        possible number. A live drawdown almost always runs deeper. Prefer sizing against the block-bootstrap{" "}
        <A href="/docs/api/validation">dd95</A> (a bad-but-not-tail drawdown), and apply the honest forward haircut
        from the <A href="/docs/concepts/gauntlet">gauntlet</A> before you trust the dollar figure.
      </Callout>

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/core">edgekit.core</A> — the <Code>Trade</Code>/<Code>Signal</Code> dataclasses and the R contract.</Li>
        <Li><A href="/docs/api/metrics">edgekit.metrics</A> — <Code>trade_stats</Code> and <Code>dd_matched_size</Code> operate directly on R-streams.</Li>
        <Li><A href="/docs/api/sizing">edgekit.sizing</A> — the only layer that turns R into dollars.</Li>
        <Li><A href="/docs/concepts/gauntlet">The validation gauntlet</A> — how you decide the R-stream is real before you size it.</Li>
      </Ul>
    </>
  );
}
