import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "Reports & charts" };

export default function ReportsPage() {
  return (
    <>
      <H1>Reports &amp; charts</H1>
      <Lead>
        edgekit renders a validated backtest into a single self-contained HTML file — every chart base64-inlined,
        every style in one <Code>&lt;style&gt;</Code> block, zero external requests. This guide covers the chart
        vocabulary in <Code>viz</Code>, the chainable <Code>Report</Code> builder, and{" "}
        <Code>three_report_suite</Code>, which emits the linked Challenge / Live / Realistic trio in one call.
      </Lead>

      <P>
        Browse the whole chart vocabulary rendered out at <A href="/docs/gallery">the chart gallery</A>.
      </P>

      <Callout kind="warn" title="Charts need the [viz] extra">
        <Code>edgekit.viz</Code> imports matplotlib <em>inside</em> its functions, so <Code>import edgekit</Code>{" "}
        stays lean. Install it when you render: <Code>pip install edgekit[viz]</Code>. A missing install gives a
        clear pointer rather than a stack trace. <Code>edgekit.report</Code> reaches matplotlib only through{" "}
        <Code>viz</Code>.
      </Callout>

      <H2>From trades to plottable series</H2>
      <P>
        Charts consume the canonical trade frame (<Code>date</Code> + <Code>r</Code> + <Code>dir</Code>). Two
        helpers derive the series everything else plots:
      </P>
      <Table
        head={["Helper", "Returns"]}
        rows={[
          [<Code key="d">trades_to_daily(trades, account=None)</Code>, "net R per calendar day on a gap-filled calendar (0 on untraded days); dollars if account given"],
          [<Code key="m">trades_to_monthly(trades, account=None)</Code>, "month-end summed series (R, or dollars)"],
        ]}
      />
      <CodeBlock
        filename="report.py"
        code={`import edgekit as ek
from edgekit import viz

bars   = ek.data.load_bars("US100_M1.csv")
rth    = bars[ek.data.rth_mask(bars.index, start="09:30", end="16:00", tz="America/New_York")]
trades = ek.strategy.ORB(or_bars=30, target_r=2.0).backtest(rth, warmup=5, bars_per_day=390)

daily   = viz.trades_to_daily(trades)          # R per day
monthly = viz.trades_to_monthly(trades)        # R per month
equity  = daily.cumsum()                        # cumulative R curve`}
      />

      <H2>The fast path: tear_sheet</H2>
      <P>
        Before wiring charts by hand, reach for <A href="/docs/api/report">tear_sheet</A> — one call turns a trade
        frame into a complete self-contained page: a hero and KPI row from <Code>trade_stats</Code>, an
        equity+drawdown panel, a monthly-return heatmap, a return distribution and R histogram, and a metrics table.
        Pass <Code>account</Code> (dollars-per-R) to add a dollar heatmap; pass <Code>out</Code> to write to disk (it
        returns the <Code>Path</Code>), or omit it to get the HTML string back.
      </P>
      <CodeBlock
        code={`from edgekit.report import tear_sheet

path = tear_sheet(trades, account=500.0,
                  title="ORB — US100 M1", theme="dark", out="orb_tearsheet.html")
print(path)   # -> orb_tearsheet.html (self-contained; net-negative edge, shown for the mechanics)`}
      />

      <H2>The chart primitives</H2>
      <P>
        <A href="/docs/api/viz">viz</A> splits into axes-level charts (you pass a matplotlib <Code>ax</Code>, they
        draw onto it and return it) and figure-level charts (they return a whole <Code>Figure</Code>). Grab
        matplotlib through <Code>viz._plt()</Code> so you inherit the Agg backend.
      </P>
      <CodeBlock
        code={`plt = viz._plt()
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(9, 6))

viz.equity_curve(ax1, equity, label="ORB")        # cumulative curve
viz.drawdown(ax2, equity, cap=0.10)                # underwater plot; cap draws the hard limit line
b64 = viz.fig_to_base64(fig)                        # render to base64 PNG and close`}
      />
      <P>Axes-level charts: <Code>equity_curve</Code>, <Code>drawdown</Code>, <Code>monthly_bars</Code>,{" "}
        <Code>yearly_bars</Code>, <Code>r_histogram</Code>, <Code>draw_candles</Code>, <Code>trade_overlay</Code>{" "}
        (▲ long / ▼ short markers coloured by R). Figure-level charts return a ready-to-embed figure:
      </P>
      <Table
        head={["Figure chart", "What it shows"]}
        rows={[
          [<Code key="h">monthly_heatmap(monthly, theme)</Code>, "year × month RdYlGn grid of returns"],
          [<Code key="f">mc_fan(paths, actual=None, theme)</Code>, "5/25/50/75/95 percentile fan of Monte-Carlo paths, actual overlaid"],
          [<Code key="c">corr_heatmap(corr, theme)</Code>, "correlation-matrix heatmap from a square DataFrame"],
        ]}
      />
      <CodeBlock
        code={`heat = viz.monthly_heatmap(monthly, theme="dark", title="Monthly R")

# a Monte-Carlo fan from the block-bootstrap
mc = ek.validation.block_bootstrap_mc(daily.to_numpy(), horizon=252, n=5000)
fan = viz.mc_fan(mc["terminal"].reshape(-1, 1), theme="dark")`}
      />
      <ChartFigure name="mc_fan" alt="Monte-Carlo fan" />
      <Callout kind="tip" title="Themes">
        Every chart takes <Code>theme="dark"</Code> (GitHub-dark <Code>#0d1117</Code>) or <Code>"light"</Code>{" "}
        (blue-accent print). The <Code>THEMES</Code> dict and <Code>theme(name)</Code> lookup expose the
        palettes if you want to match your own styling.
      </Callout>

      <H2>Two charts you will reach for constantly</H2>
      <P>
        <A href="/docs/api/viz">equity_with_drawdown</A> is the single most-read backtest picture — a figure-level
        panel stacking the equity curve over its underwater drawdown, so the pain reads at the same x as the gains.{" "}
        <A href="/docs/api/viz">rolling_metrics</A> is the durability check: rolling Sharpe / PF / win-rate over the
        daily-R series. A flat-ish line is a durable edge; a curve that decays to zero after the design window is the
        classic overfit signature.
      </P>
      <CodeBlock
        code={`fig = viz.equity_with_drawdown(daily.cumsum(), theme="dark", title="Cumulative R")

# durability: rolling Sharpe over a 63-day (one quarter) window
plt = viz._plt()
f, ax = plt.subplots(figsize=(9, 3.2))
viz.rolling_metrics(ax, daily, window=63, metric="sharpe")   # or metric="pf" / "win"`}
      />
      <ChartFigure name="equity_with_drawdown" alt="Equity and drawdown" />

      <H2>Visualize the gauntlet</H2>
      <P>
        Two charts turn the validation numbers into pictures. <A href="/docs/api/viz">permutation_hist</A> draws the
        null distribution with the real statistic as a line and the p-value in the title —{" "}
        <Code>p = (#{"{null >= real}"} + 1) / (N + 1)</Code>. A real stat deep in the right tail (p&lt;0.01) is
        unlikely to be luck; one sitting inside the null cloud is noise. <A href="/docs/api/viz">cost_sensitivity</A>{" "}
        plots PF and EV-R against a rising cost multiplier straight from <Code>costs.cost_stress</Code>: a real edge
        holds PF&gt;1 at 2–3x, a fragile one collapses.
      </P>
      <CodeBlock
        code={`plt = viz._plt()
fig, (a, b) = plt.subplots(1, 2, figsize=(12, 4))

# permutation null vs the observed statistic
perm = ek.validation.mcpt(trades["r"].to_numpy(), n=1000)
viz.permutation_hist(perm["null"], perm["stat"], title="Permutation null (EV-R)")

# cost stress: does the edge survive 2x / 3x costs?
stress = ek.costs.cost_stress(trades["r"].to_numpy(), mults=(1, 2, 3))
viz.cost_sensitivity(b, stress)`}
      />
      <ChartFigure name="permutation_hist" alt="Permutation null" />
      <Callout kind="warn" title="A picture is not a pass">
        These charts summarize the gauntlet; they do not replace it. The ORB frame here is net-negative — a small
        permutation p or a pretty equity curve on an over-fit sample still fails cost-stress and walk-forward. Read
        the charts alongside the numbers, never instead of them.
      </Callout>

      <H2>The Report builder</H2>
      <P>
        <A href="/docs/api/report">Report</A> assembles one self-contained HTML page. Every method returns{" "}
        <Code>self</Code>, so you build a report as a single chained expression. <Code>chart(fig)</Code> embeds a
        matplotlib figure as an inline base64 PNG (and closes it); <Code>render()</Code> returns the full{" "}
        <Code>&lt;!doctype html&gt;</Code> string and <Code>write(path)</Code> saves it.
      </P>
      <CodeBlock
        code={`from edgekit.report import Report

stats = ek.trade_stats(trades.r.to_numpy(), dates=trades.date)
plt = viz._plt()
fig, ax = plt.subplots(figsize=(9, 3.5))
viz.equity_curve(ax, equity, label="ORB")

(Report("ORB — US100 M1", meta="30-min opening range · $100k", theme="dark")
    .hero("Profit factor", "0.71", "net-negative after costs — rejected")
    .kpi_row([("PF", f"{stats['pf']:.2f}", f"win {stats['win_rate']:.0%}"),
              ("EV", f"{stats['ev_r']:+.3f}R", f"{stats['n']} trades"),
              ("MAR", f"{stats['mar']:.2f}", ""),
              {"label": "Perm p", "val": "0.040"}])
    .section("Equity")
    .chart(fig)
    .section("Monthly")
    .month_table(monthly)
    .caveat("No edge: PF < 1, fails cost-stress at 1x. Shown to demonstrate the report builder.")
    .write("orb_report.html"))`}
      />
      <P>The builder methods:</P>
      <Table
        head={["Method", "Adds"]}
        rows={[
          [<Code key="h">header(title, meta)</Code>, "reset the page title / meta line"],
          [<Code key="n">nav(links)</Code>, "a row of (label, href) cross-links"],
          [<Code key="he">hero(label, value, sub)</Code>, "the big highlighted headline number"],
          [<Code key="k">kpi_row(cards)</Code>, "a flex row of KPI cards — each a (label, val[, sub]) tuple or a dict"],
          [<Code key="c">card(label, val, sub)</Code>, "a single KPI card"],
          [<Code key="s">section(title)</Code>, "an <h2> heading"],
          [<Code key="t">table(headers, rows)</Code>, "a plain table"],
          [<Code key="mt">month_table(monthly)</Code>, "year × month grid with row totals"],
          [<Code key="ch">chart(fig, dpi=95)</Code>, "an inline base64 PNG of a matplotlib figure"],
          [<Code key="cv">caveat(text)</Code>, "a muted caveat box"],
          [<Code key="ht">html_text(raw)</Code>, "a raw HTML fragment verbatim"],
          [<Code key="r">render() / write(path)</Code>, "the full HTML string / write it to disk"],
        ]}
      />

      <H2>The three-report suite</H2>
      <P>
        The honest way to present a strategy is not one number but three. <A href="/docs/api/report">three_report_suite</A>{" "}
        sizes the trade R-stream to <Code>dd_budget</Code> of the account and renders three cross-linked
        self-contained pages: the aggressive <Strong>Challenge</Strong> view, the <Strong>Live</Strong> ceiling,
        and the <Code>haircut</Code>-adjusted <Strong>Realistic</Strong> view (default <Code>0.85</Code>).
      </P>
      <CodeBlock
        code={`from edgekit.report import three_report_suite

paths = three_report_suite(trades, account=100_000, out_dir="reports/",
                           title_prefix="ORB", theme="dark",
                           dd_budget=0.095, haircut=0.85, split=0.90)
print(paths)   # [challenge.html, live.html, realistic.html] — cross-linked, each standalone`}
      />
      <Callout kind="note" title="Self-contained by construction">
        Every chart is a <Code>data:image/png;base64,</Code> URI and the CSS is inlined, so the output opens
        anywhere — email it, drop it on a share, open it offline. There are zero network requests, which is also
        why the file is trustworthy: nothing can change after you write it.
      </Callout>

      <H2>Next</H2>
      <Ul>
        <Li><A href="/docs/api/viz">API · viz</A> — every chart primitive and theme.</Li>
        <Li><A href="/docs/api/report">API · report</A> — the Report builder and three_report_suite.</Li>
        <Li><A href="/docs/guides/prop-firm">Prop-firm sizing</A> — the sizing that feeds the Challenge report.</Li>
        <Li><A href="/docs/examples/orb-gauntlet">Example: the ORB gauntlet</A> — the report at the end of the pipeline.</Li>
      </Ul>
    </>
  );
}
