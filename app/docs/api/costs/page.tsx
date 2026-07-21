import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table, Code } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.costs" };

export default function CostsPage() {
  return (
    <>
      <H1>edgekit.costs</H1>
      <Lead>
        Transaction-cost models and the cost-stress harness. The repo used two conventions — crypto
        expresses cost as a <em>fraction of price</em>, FX as <em>pips</em> — and both live here. The
        decisive test is always the same: re-run at 1x/2x/3x cost. A real edge degrades gracefully; a
        fake one collapses.
      </Lead>

      <P>
        <Strong>What&rsquo;s inside.</Strong> Two frozen dataclasses — <Code>CostModel</Code>{" "}
        (fraction-of-price, the crypto convention) and <Code>PipCostModel</Code> (pips, the
        FX/index convention used by the engine&rsquo;s <Code>EngineConfig</Code>) — plus one function,{" "}
        <Code>cost_stress</Code>, which is validation-gauntlet step 6. Both models carry a{" "}
        <Code>scaled(mult)</Code> method: that multiplier is the knob the stress harness turns.
      </P>

      <Callout kind="warn" title="Cost is charged in R, once">
        edgekit never bakes dollars into a strategy. A strategy is priced in R-multiples; cost is a
        haircut on that R (<Code>CostModel.r_cost</Code>) or on the pip P&amp;L (<Code>PipCostModel</Code>).
        Sizing to dollars happens later, from a single scalar. Keep it that way — a cost model that
        looks cheap on gross R can still kill an edge net of the spread you actually pay.
      </Callout>

      <H2>CostModel</H2>

      <H3>CostModel</H3>
      <P>
        The fraction-of-price cost model — the crypto convention, and the default cost used by
        every <Code>BaseStrategy.backtest</Code>. Cost is expressed as a fraction of the traded price:
        a round-trip spread plus a per-day financing/swap charge. Frozen (immutable) so a model can be
        shared safely and cheaply copied via <Code>scaled</Code>.
      </P>
      <CodeBlock
        code={`CostModel(spread_rt: float = 0.0012, swap_day: float = 0.0002)`}
      />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">spread_rt</Code>, "float", "0.0012", "Round-trip spread as a fraction of price (0.0012 = 12 bps)."],
          [<Code key="b">swap_day</Code>, "float", "0.0002", "Financing/swap charged per day held, as a fraction of price (2 bps/day)."],
        ]}
      />

      <P>
        <Strong>Methods.</Strong>
      </P>
      <Ul>
        <Li>
          <Code>r_cost(entry_price, risk_per_unit, days) -&gt; float</Code> — cost of one round trip
          expressed in R. Computes{" "}
          <Code>(spread_rt*price + swap_day*price*days) / risk_per_unit</Code>. <Code>risk_per_unit</Code>{" "}
          is the stop distance in price units (e.g. <Code>2 * ATR</Code>) — the same denominator that
          turns P&amp;L into R. Returns <Code>0.0</Code> if <Code>risk_per_unit &lt;= 0</Code>.
        </Li>
        <Li>
          <Code>scaled(mult) -&gt; CostModel</Code> — a copy with <em>both</em> components multiplied by{" "}
          <Code>mult</Code>. This is the cost-stress knob.
        </Li>
      </Ul>
      <CodeBlock
        filename="costmodel.py"
        code={`from edgekit.costs import CostModel

cost = CostModel()                    # 12 bps round-trip + 2 bps/day
r = cost.r_cost(entry_price=30_000.0, risk_per_unit=1_200.0, days=8)
# -> ((0.0012*30000) + (0.0002*30000*8)) / 1200  == 0.07 R haircut

double = cost.scaled(2.0)             # CostModel(spread_rt=0.0024, swap_day=0.0004)`}
      />

      <H3>PipCostModel</H3>
      <P>
        The pips-based cost model — the FX/index convention. This is the cost carried by the fixed-RR
        prop-firm engine (<Code>EngineConfig.cost</Code>). It rolls spread, per-side slippage and
        commission into a single round-trip <Code>cost_pips</Code>. Also frozen.
      </P>
      <CodeBlock
        code={`PipCostModel(spread_pips: float = 0.5, slippage_pips_per_side: float = 0.2,
             commission_per_lot_rt: float = 3.0, pip_value_per_lot: float = 10.0)`}
      />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">spread_pips</Code>, "float", "0.5", "Round-trip spread in pips."],
          [<Code key="b">slippage_pips_per_side</Code>, "float", "0.2", "Slippage per side, in pips (counted on both entry and exit)."],
          [<Code key="c">commission_per_lot_rt</Code>, "float", "3.0", "Round-trip commission per lot, in account currency."],
          [<Code key="d">pip_value_per_lot</Code>, "float", "10.0", "Value of one pip per lot — converts the commission into pips."],
        ]}
      />
      <P>
        <Strong>Property &amp; method.</Strong>
      </P>
      <Ul>
        <Li>
          <Code>cost_pips</Code> (property) — total round-trip cost in pips:{" "}
          <Code>spread_pips + 2*slippage_pips_per_side + commission_per_lot_rt/pip_value_per_lot</Code>.
        </Li>
        <Li>
          <Code>scaled(mult) -&gt; PipCostModel</Code> — copy with spread, slippage and commission
          scaled by <Code>mult</Code>; <Code>pip_value_per_lot</Code> is a market constant and is{" "}
          <em>not</em> scaled.
        </Li>
      </Ul>
      <CodeBlock
        filename="pipcostmodel.py"
        code={`from edgekit.costs import PipCostModel

pc = PipCostModel()          # 0.5 spread + 2*0.2 slip + 3.0/10.0 commission
pc.cost_pips                 # -> 0.5 + 0.4 + 0.3 == 1.2 pips round-trip
pc.scaled(3.0).cost_pips     # spread/slip/commission x3; pip value unchanged`}
      />

      <H2>cost_stress</H2>

      <H3>cost_stress</H3>
      <P>
        Gauntlet step 6. Re-run a strategy at escalating cost and return a{" "}
        <Code>{"{mult: metrics}"}</Code> map — the single most honest robustness check in the library.
        You supply <Code>run_fn</Code>, which takes a <Code>CostModel</Code> and returns a metrics dict
        (typically from <A href="/docs/api/metrics">trade_stats</A>); <Code>cost_stress</Code> calls it
        once per multiplier with <Code>base.scaled(mult)</Code>.
      </P>
      <CodeBlock
        code={`cost_stress(run_fn: Callable[[CostModel], dict], base: CostModel | None = None,
            mults=(1.0, 2.0, 3.0)) -> dict`}
      />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">run_fn</Code>, "Callable[[CostModel], dict]", "—", "Runs the strategy at a given cost, returns a metrics dict."],
          [<Code key="b">base</Code>, "CostModel | None", "None", "Base cost to scale (defaults to CostModel() when None)."],
          [<Code key="c">mults</Code>, "tuple", "(1.0, 2.0, 3.0)", "Multipliers applied to base; one metrics dict per multiplier."],
        ]}
      />
      <P>
        <Strong>Returns:</Strong> a dict keyed by each multiplier, whose values are whatever{" "}
        <Code>run_fn</Code> returns — e.g. <Code>{"{1.0: {...}, 2.0: {...}, 3.0: {...}}"}</Code>.
      </P>
      <Callout kind="warn" title="Survivor rule of thumb">
        PF must stay <Strong>&gt; 1 at 2x and 3x</Strong> cost. If profit factor drops below 1 the
        moment you double the spread, the &ldquo;edge&rdquo; was living inside the cost assumption, not
        the market. <Code>cost_stress</Code> is re-exported as <Code>edgekit.validation.cost_stress</Code>.
      </Callout>
      <CodeBlock
        filename="cost_stress.py"
        code={`from edgekit.costs import cost_stress
from edgekit import trade_stats
from edgekit.strategy import ORB

def run(cost):
    return trade_stats(ORB(or_bars=30, target_r=2.0)
                       .backtest(rth, cost=cost, warmup=5, bars_per_day=390).r)

grid = cost_stress(run)                 # {1.0: {...}, 2.0: {...}, 3.0: {...}}
print(grid[1.0]["pf"], grid[2.0]["pf"], grid[3.0]["pf"]) # 0.71 / 0.45 / 0.29 — below 1, rejected`}
      />

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/metrics">edgekit.metrics</A> — the metrics dicts <Code>run_fn</Code> returns.</Li>
        <Li><A href="/docs/api/sizing">edgekit.sizing</A> — turn net-of-cost R into dollar-risked equity.</Li>
        <Li><A href="/docs/concepts/gauntlet">The validation gauntlet</A> — where cost-stress is step 6.</Li>
      </Ul>
    </>
  );
}
