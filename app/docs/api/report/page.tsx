import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout, Table } from "@/components/prose";

export const metadata: Metadata = { title: "edgekit.report" };

export default function ReportPage() {
  return (
    <>
      <H1>edgekit.report</H1>
      <Lead>
        Self-contained HTML reports. Everything is inlined — the CSS in a <Code>&lt;style&gt;</Code> block, every chart a{" "}
        <Code>data:image/png;base64,</Code> URI — so the file opens anywhere with no network. Pure-Python f-strings;
        matplotlib is only ever reached through <A href="/docs/api/viz">edgekit.viz</A>.
      </Lead>

      <P>
        <Strong>What&apos;s inside.</Strong> The chainable <Code>Report</Code> builder (every method returns{" "}
        <Code>self</Code>), the <Code>three_report_suite</Code> convenience that emits a linked Challenge / Live /
        Realistic trio, and three module-level HTML helpers (<Code>build_css</Code>, <Code>card_html</Code>,{" "}
        <Code>month_table_html</Code>) for when you want fragments rather than a whole page.
      </P>

      <H2>Module helpers</H2>
      <CodeBlock code={`build_css(theme: str = "dark") -> str                    # inline stylesheet for a theme
card_html(label, val, sub: str = "") -> str              # one KPI card (HTML-escaped)
month_table_html(monthly, theme: str = "dark") -> str    # year x month grid table with row totals`} />
      <Ul>
        <Li><Code>build_css</Code> — the inline stylesheet string for a theme (<Code>&quot;dark&quot;</Code> or <Code>&quot;light&quot;</Code>).</Li>
        <Li><Code>card_html</Code> — one KPI card as an HTML fragment (label, value, optional sub-line; all HTML-escaped).</Li>
        <Li><Code>month_table_html</Code> — a year × month grid table (with row totals) from a monthly series.</Li>
      </Ul>

      <H2>Report (chainable builder)</H2>
      <P>Assembles one self-contained HTML page. Every method returns <Code>self</Code> for chaining.</P>
      <CodeBlock code={`Report(title: str, meta: str = "", theme: str = "dark")   # theme in {"dark","light"} or ValueError`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">title</Code>, "str", "—", "Page title (the top headline)."],
          [<Code key="b">meta</Code>, "str", '""', "Sub-line under the title (e.g. instruments · account size)."],
          [<Code key="c">theme</Code>, "str", '"dark"', 'Palette: "dark" or "light" (else ValueError).'],
        ]}
      />
      <Table
        head={["Method", "Purpose"]}
        rows={[
          [<Code key="a">header(title, meta="")</Code>, "Reset the page title / meta."],
          [<Code key="b">nav(links)</Code>, "Row of (label, href) cross-links."],
          [<Code key="c">section(title)</Code>, "An <h2> heading."],
          [<Code key="d">hero(label, value, sub="")</Code>, "The big highlighted headline number."],
          [<Code key="e">kpi_row(cards)</Code>, "Flex row of KPI cards; each card is (label, val[, sub]) or a dict."],
          [<Code key="f">card(label, val, sub="")</Code>, "A single KPI card."],
          [<Code key="g">table(headers, rows)</Code>, "A plain table (headers list, rows list of cell-lists)."],
          [<Code key="h">month_table(monthly)</Code>, "Year x month grid with totals."],
          [<Code key="i">chart(fig, dpi=95)</Code>, "Embed a matplotlib figure as an inline base64 PNG (closes it)."],
          [<Code key="j">caveat(text)</Code>, "A muted caveat box."],
          [<Code key="k">html_text(raw)</Code>, "Append a raw HTML fragment verbatim."],
          [<Code key="gr">grid(figs, cols=2, dpi=95)</Code>, "Several figures in a responsive CSS grid (each inlined)."],
          [<Code key="mt">metrics_table(stats, title=None)</Code>, "A metrics dict rendered as a key/value table."],
          [<Code key="im">image(src)</Code>, "Embed an EXTERNAL PNG (path or bytes) as an inline data-URI."],
          [<Code key="gp">gauntlet_panel(...)</Code>, "A standardized Validation section (perm_p / stress / beta / dsr / pbo)."],
          [<Code key="l">{"render() -> str"}</Code>, "Assemble the full <!doctype html> string."],
          [<Code key="m">{"write(path) -> Path"}</Code>, "Render and write to path (returns the Path)."],
        ]}
      />
      <CodeBlock
        filename="report.py"
        code={`from edgekit.report import Report
from edgekit import viz

monthly = viz.trades_to_monthly(trades)
fig = viz.monthly_heatmap(monthly)

path = (Report("ORB — US100 M1", meta="Nasdaq intraday · $100k", theme="dark")
        .hero("Expectancy", "−0.214R", "net of costs")
        .kpi_row([("PF", "0.71"), ("Win", "39%"), {"label": "Trades", "val": "2,666"}])
        .section("Equity")
        .chart(fig)
        .month_table(monthly)
        .table(["Year", "Total R"], [[2023, -12.4], [2024, -9.1]])
        .caveat("Net-negative after costs; the gauntlet rejects it.")
        .write("orb_report.html"))
print(path)   # -> orb_report.html (self-contained, opens offline)`}
      />
      <Callout kind="tip" title="Fully offline by construction">
        The render asserts nothing external: CSS is inlined, charts are base64 data URIs. A finished report contains no{" "}
        <Code>http://</Code> or <Code>https://</Code> — you can email it, drop it on a share, or open it on a plane and it
        renders identically.
      </Callout>

      <H2>Composite blocks</H2>
      <P>Four higher-level blocks build on the primitives above. Each still returns <Code>self</Code>.</P>

      <H3>grid</H3>
      <P>Embed several matplotlib figures in a responsive CSS grid, each inlined as its own base64 PNG. Handy for a panel of diagnostics under one heading.</P>
      <CodeBlock code={`grid(figs, cols: int = 2, dpi: int = 95) -> Report`} />
      <Ul>
        <Li><Code>figs</Code> — an iterable of matplotlib figures (each is closed after encoding).</Li>
        <Li><Code>cols</Code> — grid columns (default <Code>2</Code>).</Li>
        <Li><Code>dpi</Code> — render resolution per figure (default <Code>95</Code>).</Li>
      </Ul>

      <H3>metrics_table</H3>
      <P>Render a metrics dict (e.g. <Code>trade_stats</Code> / <Code>equity_stats</Code>) as a key/value table, with sensible int/float/bool/str formatting. An optional <Code>title</Code> emits an <Code>&lt;h3&gt;</Code> above it.</P>
      <CodeBlock code={`metrics_table(stats: dict, title: str | None = None) -> Report`} />

      <H3>image</H3>
      <P>Embed an <em>external</em> PNG — a filesystem path or raw bytes — as an inline data-URI. Use this for a chart produced outside <Code>viz</Code> (e.g. one saved earlier with <Code>viz.save_png</Code>). Contrast with <Code>chart(fig)</Code>, which takes a live matplotlib figure.</P>
      <CodeBlock code={`image(src) -> Report`} />
      <Ul>
        <Li><Code>src</Code> — a path (<Code>str</Code> / <Code>Path</Code>) read from disk, or raw <Code>bytes</Code>.</Li>
      </Ul>

      <H3>gauntlet_panel</H3>
      <P>A standardized <Strong>Validation</Strong> section that renders whichever results you pass. KPI cards for the scalar checks and a cost-stress table for <Code>stress</Code>, plus the survivor rule (PF &gt; 1 at 2x and 3x cost).</P>
      <CodeBlock code={`gauntlet_panel(perm_p=None, stress=None, beta=None, dsr=None, pbo=None) -> Report`} />
      <Table
        head={["Param", "Renders", "Verdict rule"]}
        rows={[
          [<Code key="a">perm_p</Code>, "Permutation p card", "PASS if < 0.01"],
          [<Code key="b">stress</Code>, "Cost-stress PF / EV-R table", "PF > 1 at 2x and 3x"],
          [<Code key="c">beta</Code>, "Is-it-beta (β) card", "alpha if |β| < 0.2"],
          [<Code key="d">dsr</Code>, "Deflated Sharpe card", "PASS if > 0.95"],
          [<Code key="e">pbo</Code>, "PBO card", "PASS if < 0.5"],
        ]}
      />
      <CodeBlock
        code={`(Report("ORB — validation", theme="dark")
    .gauntlet_panel(perm_p=0.040,
                    stress={1: {"pf": 0.71, "ev_r": -0.214},
                            2: {"pf": 0.52, "ev_r": -0.402},
                            3: {"pf": 0.38, "ev_r": -0.560}},
                    beta=0.05, pbo=0.71)
    .write("orb_validation.html"))
# perm_p 0.040 -> FAIL vs 0.01; PF < 1 at every cost multiple.`}
      />

      <H2>tear_sheet</H2>
      <P>
        The one-call full report. Assembles a complete standard tear sheet from a trade frame: a hero + KPI row from{" "}
        <A href="/docs/api/metrics">trade_stats</A>, an equity+drawdown panel, a monthly-return heatmap, a return
        distribution and R histogram (in a two-up grid), and a metrics table. If <Code>account</Code>{" "}
        (dollars-per-R) is given it adds a dollar monthly heatmap too.
      </P>
      <CodeBlock code={`tear_sheet(trades: pd.DataFrame, account: float | None = None,
           title: str = "Strategy tear sheet", theme: str = "dark", out=None)`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">trades</Code>, "pd.DataFrame", "—", "Canonical trade frame (date + r)."],
          [<Code key="b">account</Code>, "float | None", "None", "Dollars-per-R; if given, adds a dollar monthly heatmap."],
          [<Code key="c">title</Code>, "str", '"Strategy tear sheet"', "Page title."],
          [<Code key="d">theme</Code>, "str", '"dark"', 'Palette: "dark" or "light".'],
          [<Code key="e">out</Code>, "str | Path | None", "None", "If given, writes there and returns the Path; else returns the HTML string."],
        ]}
      />
      <CodeBlock
        filename="tear_sheet.py"
        code={`from edgekit.report import tear_sheet

# one call: trade frame in, self-contained HTML out
path = tear_sheet(trades, account=500.0,
                  title="ORB — US100 M1", theme="dark", out="orb_tearsheet.html")
print(path)   # -> orb_tearsheet.html

# omit out= to get the HTML string back instead of writing
html = tear_sheet(trades)`}
      />
      <Callout kind="tip" title="Reach for tear_sheet first">
        For the standard picture, <Code>tear_sheet</Code> is the fast path — one call covers equity, drawdown,
        distribution and the metrics table. Drop down to the <Code>Report</Code> builder when you need a custom
        layout, cross-linked pages, or a <Code>gauntlet_panel</Code>.
      </Callout>

      <H2>three_report_suite</H2>
      <P>Emit the linked Challenge / Live / Realistic trio in one call. Sizes the trade R-stream to <Code>dd_budget</Code> of <Code>account</Code>, then renders three cross-linked self-contained pages: an aggressive challenge view, a live-ceiling view, and a <Code>haircut</Code>-adjusted realistic view.</P>
      <CodeBlock code={`three_report_suite(trades: pd.DataFrame, account: float, out_dir,
                   title_prefix: str = "Strategy", theme: str = "dark",
                   dd_budget: float = 0.095, haircut: float = 0.85, split: float = 0.90) -> list[Path]`} />
      <Table
        head={["Param", "Type", "Default", "Meaning"]}
        rows={[
          [<Code key="a">trades</Code>, "pd.DataFrame", "—", "Canonical trade frame (date + r)."],
          [<Code key="b">account</Code>, "float", "—", "Account size in dollars."],
          [<Code key="c">out_dir</Code>, "str | Path", "—", "Directory the three HTML files are written into."],
          [<Code key="d">title_prefix</Code>, "str", '"Strategy"', "Prefix for the three page titles."],
          [<Code key="e">theme</Code>, "str", '"dark"', "Palette for all three pages."],
          [<Code key="f">dd_budget</Code>, "float", "0.095", "Drawdown budget the R-stream is sized to."],
          [<Code key="g">haircut</Code>, "float", "0.85", "Multiplier applied for the realistic page (the honest haircut)."],
          [<Code key="h">split</Code>, "float", "0.90", "IS/OOS split fraction used inside the suite."],
        ]}
      />
      <P>Returns a <Code>list[Path]</Code> — the three written file paths.</P>
      <CodeBlock code={`from edgekit.report import three_report_suite
paths = three_report_suite(trades, account=100_000, out_dir="reports/", title_prefix="ORB")
# -> [reports/orb_challenge.html, reports/orb_live.html, reports/orb_realistic.html]`} />
      <Callout kind="warn" title="The realistic page is the one to plan around">
        A drawdown-matched backtest is a <em>ceiling</em>, not an expectation. The suite always emits the{" "}
        <Code>haircut</Code>-adjusted realistic page precisely so the number you plan around is the one you can actually
        trade — not the aggressive challenge headline.
      </Callout>

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/viz">edgekit.viz</A> — the figures <Code>.chart()</Code> embeds.</Li>
        <Li><A href="/docs/api/challenge">edgekit.challenge</A> — the pass-rate numbers that headline the challenge page.</Li>
        <Li><A href="/docs/api/sizing">edgekit.sizing</A> — the sizing the suite applies before rendering.</Li>
      </Ul>
    </>
  );
}
