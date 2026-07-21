import type { Metadata } from "next";
import { CodeBlock, Code } from "@/components/CodeBlock";
import { H1, H2, H3, P, Lead, Ul, Li, A, Strong, Callout } from "@/components/prose";
import { ChartFigure } from "@/components/ChartFigure";

export const metadata: Metadata = { title: "edgekit.viz" };

export default function VizPage() {
  return (
    <>
      <H1>edgekit.viz</H1>
      <Lead>
        The chart vocabulary for backtest results: matplotlib on the Agg backend, base64-inlined so a chart embeds in a
        report with zero external requests. Charts consume the canonical trade frame (<Code>date</Code> +{" "}
        <Code>r</Code> + <Code>dir</Code>); the daily/monthly series are derived by <Code>trades_to_daily</Code> /{" "}
        <Code>trades_to_monthly</Code>.
      </Lead>

      <P>
        Every chart below is previewed inline. For the full set in one place, see <A href="/docs/gallery">the chart gallery</A>.
      </P>

      <P>
        <Strong>What&apos;s inside.</Strong> Series helpers (<Code>trades_to_daily</Code>, <Code>trades_to_monthly</Code>),
        a PNG encoder (<Code>fig_to_base64</Code>), the <Code>THEMES</Code> palette, axes-level plotters that draw onto a
        supplied <Code>ax</Code> (<Code>equity_curve</Code>, <Code>drawdown</Code>, <Code>monthly_bars</Code>,{" "}
        <Code>yearly_bars</Code>, <Code>r_histogram</Code>, <Code>draw_candles</Code>, <Code>trade_overlay</Code>), and
        figure-level builders that return a <Code>Figure</Code> (<Code>monthly_heatmap</Code>, <Code>mc_fan</Code>,{" "}
        <Code>corr_heatmap</Code>).
      </P>

      <Callout kind="warn" title="matplotlib is a lazy [viz] extra">
        matplotlib is an optional dependency, imported <em>inside</em> the functions (via <Code>viz._plt()</Code>). A
        missing install raises an <Code>ImportError</Code> with a clear pointer to <Code>pip install edgekit[viz]</Code>{" "}
        — so <Code>import edgekit</Code> stays lean. Install the extra before calling any chart.
      </Callout>

      <H2>Themes</H2>
      <P>
        <Code>THEMES</Code> is a dict with two palettes: <Code>&quot;dark&quot;</Code> (GitHub-dark, <Code>#0d1117</Code>{" "}
        background) and <Code>&quot;light&quot;</Code> (blue-accent print). Each has keys{" "}
        <Code>bg, text, card, border, heading, muted, green, red, blue, gold</Code>. <Code>theme(name=&quot;dark&quot;)</Code>{" "}
        looks one up.
      </P>
      <CodeBlock code={`from edgekit import viz
th = viz.theme("dark")        # -> {"bg": "#0d1117", "green": "#3fb950", ...}
th = viz.THEMES["light"]`} />

      <H2>Series helpers</H2>

      <H3>trades_to_daily</H3>
      <P>Trade frame (<Code>date</Code> + <Code>r</Code>) → net R per calendar day on a gap-filled calendar (0 on untraded days). If <Code>account</Code> is given it is treated as dollars-per-R and the series is scaled to dollars.</P>
      <CodeBlock code={`trades_to_daily(trades: pd.DataFrame, account: float | None = None) -> pd.Series`} />
      <Ul>
        <Li><Code>trades</Code> — canonical trade frame with <Code>date</Code> + <Code>r</Code>.</Li>
        <Li><Code>account</Code> — dollars-per-R scalar; if given, the series is in dollars.</Li>
      </Ul>

      <H3>trades_to_monthly</H3>
      <P>Trade frame → month-end (<Code>&quot;ME&quot;</Code>) summed series (R, or dollars if <Code>account</Code> given).</P>
      <CodeBlock code={`trades_to_monthly(trades: pd.DataFrame, account: float | None = None) -> pd.Series`} />
      <CodeBlock code={`daily = viz.trades_to_daily(trades)                 # net R per calendar day
monthly = viz.trades_to_monthly(trades, account=500.0)   # dollars per month`} />

      <H2>Encoding</H2>

      <H3>fig_to_base64</H3>
      <P>Render a figure to a base64 PNG string and close it — the primitive every inlined chart uses.</P>
      <CodeBlock code={`fig_to_base64(fig, dpi: int = 95) -> str`} />
      <CodeBlock code={`b64 = viz.fig_to_base64(fig)               # a base64 PNG; embed as data:image/png;base64,{b64}`} />

      <H3>save_png</H3>
      <P>Write a figure to disk (tight bbox, theme facecolor kept) and close it — the on-disk twin of <Code>fig_to_base64</Code> for when a report wants a real PNG rather than an inline data-URI. Returns the <Code>pathlib.Path</Code>.</P>
      <CodeBlock code={`save_png(fig, path, dpi: int = 115)`} />
      <Ul>
        <Li><Code>fig</Code> — the matplotlib figure to write (it is closed after saving).</Li>
        <Li><Code>path</Code> — destination path (str or <Code>Path</Code>); returned as a <Code>Path</Code>.</Li>
        <Li><Code>dpi</Code> — render resolution (default <Code>115</Code>, higher than the inline <Code>95</Code>).</Li>
      </Ul>
      <CodeBlock code={`p = viz.save_png(viz.equity_with_drawdown(daily.cumsum()), "equity.png")   # -> Path("equity.png")`} />

      <H2>Axes-level charts</H2>
      <P>Each plots onto a supplied <Code>ax</Code> and returns it — compose several into one figure.</P>
      <CodeBlock code={`equity_curve(ax, eq, label: str | None = None, color: str | None = None)
drawdown(ax, eq, cap: float | None = None, color: str | None = None)   # underwater; cap draws the hard-limit line
monthly_bars(ax, monthly, green=None, red=None)
yearly_bars(ax, yearly, color=None)
r_histogram(ax, r, color=None)
draw_candles(ax, seg: pd.DataFrame, up=None, down=None)                # OHLC candles: wicks + bodies
trade_overlay(ax, trades: pd.DataFrame)                                # up-triangle long / down-triangle short, coloured by R`} />
      <Ul>
        <Li><Code>equity_curve</Code> — line plot of a cumulative equity series.</Li>
        <Li><Code>drawdown</Code> — the underwater curve; <Code>cap</Code> draws the hard drawdown-limit line.</Li>
        <Li><Code>monthly_bars</Code> / <Code>yearly_bars</Code> — green/red bars of a monthly/yearly return series.</Li>
        <Li><Code>r_histogram</Code> — histogram of per-trade R with the mean marked.</Li>
        <Li><Code>draw_candles</Code> — OHLC candles (wicks + bodies) from an OHLC segment.</Li>
        <Li><Code>trade_overlay</Code> — entry markers coloured by R, drawn over a candle chart.</Li>
      </Ul>
      <CodeBlock
        filename="axes_charts.py"
        code={`plt = viz._plt()
daily = viz.trades_to_daily(trades)
monthly = viz.trades_to_monthly(trades)

fig, axes = plt.subplots(2, 3, figsize=(14, 7))
viz.equity_curve(axes[0, 0], daily.cumsum(), label="equity")
viz.drawdown(axes[0, 1], daily.cumsum(), cap=0.10)     # 10% hard-limit line
viz.monthly_bars(axes[0, 2], monthly)
viz.yearly_bars(axes[1, 0], daily.groupby(daily.index.year).sum())
viz.r_histogram(axes[1, 1], trades["r"])
viz.draw_candles(axes[1, 2], bars.iloc[-40:])
viz.trade_overlay(axes[1, 2], trades.tail(10))`}
      />
      <ChartFigure name="equity_curve" alt="equity_curve chart" />
      <ChartFigure name="drawdown" alt="drawdown chart" />
      <ChartFigure name="monthly_bars" alt="monthly_bars chart" />
      <ChartFigure name="yearly_bars" alt="yearly_bars chart" />
      <ChartFigure name="r_histogram" alt="r_histogram chart" />

      <H2>Analysis charts (axes-level)</H2>
      <P>
        The diagnostic layer — each draws onto a supplied <Code>ax</Code> and returns it, so they compose into a grid
        just like the primitives above. They answer the questions the gauntlet asks: is the edge stable, fat-tailed,
        concentrated in one bucket, or cost-fragile?
      </P>

      <H3>rolling_metrics</H3>
      <P>Rolling Sharpe / profit-factor / win-rate over a daily-R series — is the edge durable or fading? A flat-ish line is a durable edge; a curve that decays to zero after the design window is the classic overfit signature.</P>
      <CodeBlock code={`rolling_metrics(ax, daily_r, window: int = 63, metric: str = "sharpe")`} />
      <Ul>
        <Li><Code>daily_r</Code> — a daily-R series (e.g. from <Code>trades_to_daily</Code>).</Li>
        <Li><Code>window</Code> — rolling window in trading days (default <Code>63</Code> ≈ one quarter).</Li>
        <Li><Code>metric</Code> — <Code>&quot;sharpe&quot;</Code> (annualised, 252d), <Code>&quot;pf&quot;</Code> (gross win / gross loss, capped at 10, with a PF=1 line) or <Code>&quot;win&quot;</Code> (fraction of positive days, with a 0.5 line). Anything else raises <Code>ValueError</Code>.</Li>
      </Ul>
      <ChartFigure name="rolling_metrics" alt="rolling_metrics chart" />

      <H3>return_distribution</H3>
      <P>Histogram of per-trade R with a fitted-normal overlay plus 5% VaR / CVaR lines; skew and excess-kurtosis go in the title. The normal overlay makes the fat left tail obvious — a symmetric normal badly understates the tails of a trend edge.</P>
      <CodeBlock code={`return_distribution(ax, r, theme: str = "dark")`} />
      <Ul>
        <Li><Code>r</Code> — per-trade R-multiples (non-finite values are dropped).</Li>
        <Li><Code>theme</Code> — palette name for the fit / VaR colours (<Code>&quot;dark&quot;</Code> or <Code>&quot;light&quot;</Code>).</Li>
      </Ul>
      <ChartFigure name="return_distribution" alt="return_distribution chart" />

      <H3>trade_scatter</H3>
      <P>Per-trade R (y) vs holding period in bars (x), green wins / red losses. Reveals whether the edge lives in quick scalps or long holds, and whether losers cluster at a horizon. Uses <Code>r</Code> and <Code>bars_held</Code> (falls back to trade sequence if <Code>bars_held</Code> is absent).</P>
      <CodeBlock code={`trade_scatter(ax, trades: pd.DataFrame)`} />
      <ChartFigure name="trade_scatter" alt="trade_scatter chart" />

      <H3>contribution_bars</H3>
      <P>Total R grouped by a column, horizontal bars coloured green/red by sign — which sleeve / instrument / setup actually paid? A book leaning on one bucket is less robust than one whose P&amp;L is spread. Falls back to a single <Code>all</Code> bucket if the column is missing.</P>
      <CodeBlock code={`contribution_bars(ax, trades: pd.DataFrame, by: str = "tag")`} />
      <Ul>
        <Li><Code>by</Code> — the grouping column (default <Code>&quot;tag&quot;</Code>).</Li>
      </Ul>
      <ChartFigure name="contribution_bars" alt="contribution_bars chart" />

      <H3>seasonality</H3>
      <P>Mean R by calendar month (<Code>by=&quot;month&quot;</Code>) or weekday (<Code>by=&quot;dow&quot;</Code>), green/red. A crude look for calendar effects — read sparse cells as colour, not signal.</P>
      <CodeBlock code={`seasonality(ax, trades: pd.DataFrame, by: str = "month")`} />
      <Ul>
        <Li><Code>by</Code> — <Code>&quot;month&quot;</Code> (Jan–Dec) or <Code>&quot;dow&quot;</Code> (Mon–Sun).</Li>
      </Ul>
      <ChartFigure name="seasonality" alt="seasonality chart" />

      <H3>qq_plot</H3>
      <P>Sample quantiles vs standard-normal quantiles with a mean/std reference line. Points bowing below the line on the left = a fatter-than-normal loss tail. Uses the stdlib normal inverse-CDF (no scipy).</P>
      <CodeBlock code={`qq_plot(ax, r)`} />
      <ChartFigure name="qq_plot" alt="qq_plot chart" />

      <H3>cost_sensitivity</H3>
      <P>Profit factor (left axis) and EV-R (right axis) vs cost multiplier — the cost-stress picture, with the PF=1 breakeven line. A real edge degrades gracefully and holds PF&gt;1 at 2–3x; a fake one collapses.</P>
      <CodeBlock code={`cost_sensitivity(ax, stress: dict)`} />
      <Ul>
        <Li><Code>stress</Code> — exactly what <Code>edgekit.costs.cost_stress</Code> returns fed <Code>trade_stats</Code>: <Code>{"{mult: {\"pf\": .., \"ev_r\": ..}}"}</Code>.</Li>
      </Ul>
      <ChartFigure name="cost_sensitivity" alt="cost_sensitivity chart" />

      <H3>regime_bars</H3>
      <P>Bar a chosen metric per year, green/red — is the edge spread across regimes? One-good-year edges are fragile.</P>
      <CodeBlock code={`regime_bars(ax, regime_df, metric: str = "ev_r")`} />
      <Ul>
        <Li><Code>regime_df</Code> — what <Code>edgekit.validation.regime_by_year</Code> returns (index=year, columns <Code>n/ev/win/pf/total_r</Code>).</Li>
        <Li><Code>metric</Code> — a column name or an <Code>_r</Code> alias (<Code>&quot;ev_r&quot;</Code>→<Code>ev</Code>, <Code>&quot;total_r&quot;</Code>→<Code>total_r</Code>); falls back to the first column.</Li>
      </Ul>
      <ChartFigure name="regime_bars" alt="regime_bars chart" />

      <CodeBlock
        filename="analysis_charts.py"
        code={`plt = viz._plt()
daily = viz.trades_to_daily(trades)

fig, axes = plt.subplots(2, 3, figsize=(15, 8))
viz.rolling_metrics(axes[0, 0], daily, window=63, metric="sharpe")
viz.return_distribution(axes[0, 1], trades["r"], theme="dark")
viz.qq_plot(axes[0, 2], trades["r"])
viz.trade_scatter(axes[1, 0], trades)          # needs a bars_held column
viz.contribution_bars(axes[1, 1], trades, by="tag")
viz.seasonality(axes[1, 2], trades, by="month")

# cost-stress + per-year regime, from the validation layer
stress = ek.costs.cost_stress(trades["r"].to_numpy(), mults=(1, 2, 3))
fig2, (a, b) = plt.subplots(1, 2, figsize=(12, 4))
viz.cost_sensitivity(a, stress)
viz.regime_bars(b, ek.validation.regime_by_year(trades), metric="ev_r")`}
      />

      <H2>Figure-level charts</H2>
      <P>Each returns a matplotlib <Code>Figure</Code> ready for <Code>fig_to_base64</Code> or a report&apos;s <Code>.chart()</Code>.</P>
      <CodeBlock code={`monthly_heatmap(monthly_returns, theme: str = "dark", title: str = "Monthly return")
mc_fan(paths, actual=None, theme: str = "dark", title: str = "Monte-Carlo fan")
corr_heatmap(corr, theme: str = "dark", title: str = "Correlation")`} />
      <Ul>
        <Li><Code>monthly_heatmap</Code> — year × month RdYlGn heatmap (accepts a Series indexed by month).</Li>
        <Li><Code>mc_fan</Code> — percentile fan (5/25/50/75/95 bands + median) of an <Code>(n_sims, horizon)</Code> paths array; overlays a 1-D <Code>actual</Code> path if given.</Li>
        <Li><Code>corr_heatmap</Code> — correlation-matrix heatmap from a square DataFrame.</Li>
      </Ul>
      <CodeBlock
        filename="figure_charts.py"
        code={`fig = viz.monthly_heatmap(viz.trades_to_monthly(trades), theme="dark")

# forward Monte-Carlo fan from block_bootstrap paths
import numpy as np
paths = np.cumsum(np.random.default_rng(1).standard_normal((2000, 252)), axis=1)
fig = viz.mc_fan(paths, actual=paths[0], title="Forward equity — 1y")

corr = portfolio.correlation({"trend": r_trend, "breakout": r_breakout})
fig = viz.corr_heatmap(corr)`}
      />
      <ChartFigure name="monthly_heatmap" alt="monthly_heatmap chart" />
      <ChartFigure name="mc_fan" alt="mc_fan chart" />
      <ChartFigure name="mc_dashboard" alt="Monte-Carlo fan with terminal distribution" caption="With terminal_hist=True: the fan plus a marginal distribution of terminal outcomes." />
      <ChartFigure name="corr_heatmap" alt="corr_heatmap chart" />

      <H2>Tear-sheet panels (figure-level)</H2>
      <P>
        The larger composed figures a full report leans on. Each returns a themed <Code>Figure</Code> ready for{" "}
        <Code>fig_to_base64</Code>, <Code>save_png</Code>, or a report&apos;s <Code>.chart()</Code>.
      </P>

      <H3>equity_with_drawdown</H3>
      <P>Two stacked shared-x panels: equity curve on top, underwater drawdown below — the single most-read backtest picture, so the pain reads at the same x as the gains.</P>
      <CodeBlock code={`equity_with_drawdown(eq, theme: str = "dark", title: str = "Equity")`} />
      <Ul>
        <Li><Code>eq</Code> — a cumulative level series (cumsum R, or dollars).</Li>
        <Li><Code>theme</Code> / <Code>title</Code> — palette name and the top-panel title.</Li>
      </Ul>
      <ChartFigure name="equity_with_drawdown" alt="equity_with_drawdown chart" />

      <H3>allocation_area</H3>
      <P>Stacked area of a weights DataFrame (rows=time, cols=assets) over time — how the book&apos;s capital shifts across sleeves through the sample. Columns stack in frame order and the legend names the assets.</P>
      <CodeBlock code={`allocation_area(weights, theme: str = "dark", title: str = "Allocation")`} />
      <ChartFigure name="allocation_area" alt="allocation_area chart" />

      <H3>rolling_correlation</H3>
      <P>Rolling correlation of two daily-R series — a diversification check. Two books that look uncorrelated on average can lock together in a crisis. Aligns on the shared index before rolling; the zero line is drawn and the y-axis clamped to [-1, 1].</P>
      <CodeBlock code={`rolling_correlation(book_a, book_b, window: int = 63, theme: str = "dark")`} />
      <Ul>
        <Li><Code>book_a</Code> / <Code>book_b</Code> — two daily-R series.</Li>
        <Li><Code>window</Code> — rolling window in days (default <Code>63</Code>).</Li>
      </Ul>
      <ChartFigure name="rolling_correlation" alt="rolling_correlation chart" />

      <H3>mc_terminal_hist</H3>
      <P>Histogram of Monte-Carlo terminal outcomes with 5th / median / 95th lines. Plan around the 5th, not the median.</P>
      <CodeBlock code={`mc_terminal_hist(paths_or_terminal, theme: str = "dark", title: str = "Terminal P&L")`} />
      <Ul>
        <Li><Code>paths_or_terminal</Code> — an <Code>(n_sims, horizon)</Code> paths array (terminals = last column) OR a 1-D array of terminal values.</Li>
      </Ul>
      <ChartFigure name="mc_terminal_hist" alt="mc_terminal_hist chart" />

      <H3>permutation_hist</H3>
      <P>Null-distribution histogram with the real stat drawn as a line plus the p-value in the title — the Masters permutation picture, <Code>p = (#{"{null >= real}"} + 1) / (N + 1)</Code>. A real stat deep in the right tail (p&lt;0.01) is unlikely to be luck; one inside the null cloud is noise.</P>
      <CodeBlock code={`permutation_hist(null_stats, real_stat, theme: str = "dark", title: str = "Permutation null")`} />
      <Ul>
        <Li><Code>null_stats</Code> — the array of statistics from the permuted (label-shuffled) runs.</Li>
        <Li><Code>real_stat</Code> — the observed statistic on the true labels.</Li>
      </Ul>
      <ChartFigure name="permutation_hist" alt="permutation_hist chart" />

      <CodeBlock
        filename="tearsheet_panels.py"
        code={`daily = viz.trades_to_daily(trades)

fig1 = viz.equity_with_drawdown(daily.cumsum(), theme="dark", title="Cumulative R")

# diversification: this book vs another daily-R series
fig2 = viz.rolling_correlation(daily, other_daily, window=63)

# visualise the gauntlet
mc = ek.validation.block_bootstrap_mc(daily.to_numpy(), horizon=252, n=5000)
fig3 = viz.mc_terminal_hist(mc["terminal"], title="1-yr terminal R")

perm = ek.validation.mcpt(trades["r"].to_numpy(), n=1000)
fig4 = viz.permutation_hist(perm["null"], perm["stat"], title="Permutation null (EV-R)")

# capital mix over time
fig5 = viz.allocation_area(weights_df)`}
      />

      <H2>See also</H2>
      <Ul>
        <Li><A href="/docs/api/report">edgekit.report</A> — embed these figures in a self-contained HTML page.</Li>
        <Li><A href="/docs/api/validation">edgekit.validation</A> — <Code>block_bootstrap_mc</Code> produces the paths <Code>mc_fan</Code> plots.</Li>
        <Li><A href="/docs/api/portfolio">edgekit.portfolio</A> — <Code>correlation</Code> feeds <Code>corr_heatmap</Code>.</Li>
      </Ul>
    </>
  );
}
