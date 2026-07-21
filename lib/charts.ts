// The chart gallery manifest. Each entry maps to two rendered PNGs at
// /public/charts/<id>.{light,dark}.png produced by edgekit/examples/gen_gallery.py
// (keep the ids in sync with that script).

export type ChartEntry = { id: string; title: string; blurb: string; code: string };
export type ChartGroup = { title: string; note?: string; charts: ChartEntry[] };

export const CHART_GROUPS: ChartGroup[] = [
  {
    title: "Monte-Carlo",
    note: "Bootstrapped forward paths — the honest picture of what a strategy's future could look like.",
    charts: [
      {
        id: "mc_fan",
        title: "Monte-Carlo fan",
        blurb: "The cone of uncertainty: 5/25/50/75/95 percentile bands with the terminal values annotated.",
        code: `# bootstrap a year of daily P&L into forward equity paths
paths = account + np.cumsum(rng.choice(daily_pnl, size=(5000, 252)), axis=1)
fig = ek.viz.mc_fan(paths, actual=equity, target=account)`,
      },
      {
        id: "mc_dashboard",
        title: "Fan + terminal distribution",
        blurb: "The same fan with a marginal histogram of terminal outcomes — the professional tear-sheet view.",
        code: `fig = ek.viz.mc_fan(paths, actual=equity, target=account, terminal_hist=True)`,
      },
      {
        id: "mc_terminal_hist",
        title: "Terminal P&L distribution",
        blurb: "Where a year of paths lands, with the 5th / median / 95th percentiles marked.",
        code: `fig = ek.viz.mc_terminal_hist(paths)`,
      },
    ],
  },
  {
    title: "Performance",
    charts: [
      {
        id: "equity_with_drawdown",
        title: "Equity + drawdown",
        blurb: "Equity on top, underwater drawdown below — the top panel of every tear sheet.",
        code: `fig = ek.viz.equity_with_drawdown(equity)`,
      },
      {
        id: "equity_curve",
        title: "Equity curve",
        blurb: "A single cumulative equity line.",
        code: `fig, ax = plt.subplots()
ek.viz.equity_curve(ax, equity, label="strategy")`,
      },
      {
        id: "drawdown",
        title: "Underwater drawdown",
        blurb: "Peak-to-trough drawdown shaded, with an optional cap line.",
        code: `ek.viz.drawdown(ax, equity, cap=0.10)`,
      },
      {
        id: "monthly_bars",
        title: "Monthly P&L",
        blurb: "Green/red bars per month with the share of green months in the title.",
        code: `ek.viz.monthly_bars(ax, monthly)`,
      },
      {
        id: "yearly_bars",
        title: "Yearly returns",
        blurb: "One bar per calendar year.",
        code: `ek.viz.yearly_bars(ax, yearly)`,
      },
      {
        id: "monthly_heatmap",
        title: "Monthly returns heatmap",
        blurb: "Year × month grid, diverging colour centered at zero.",
        code: `fig = ek.viz.monthly_heatmap(monthly)`,
      },
    ],
  },
  {
    title: "Distribution & trades",
    charts: [
      {
        id: "return_distribution",
        title: "Return distribution",
        blurb: "Per-trade R with a fitted normal overlay and VaR/CVaR lines; skew & kurtosis in the title.",
        code: `ek.viz.return_distribution(ax, trades.r)`,
      },
      {
        id: "r_histogram",
        title: "R-multiple histogram",
        blurb: "The raw distribution of per-trade R with the mean marked.",
        code: `ek.viz.r_histogram(ax, trades.r)`,
      },
      {
        id: "trade_scatter",
        title: "R vs holding time",
        blurb: "Each trade's R against how long it was held, coloured by sign.",
        code: `ek.viz.trade_scatter(ax, trades)`,
      },
      {
        id: "qq_plot",
        title: "Q–Q plot",
        blurb: "Sample quantiles vs the normal — fat tails show as departures from the line.",
        code: `ek.viz.qq_plot(ax, trades.r)`,
      },
      {
        id: "contribution_bars",
        title: "Contribution by tag",
        blurb: "Total R grouped by strategy/instrument tag.",
        code: `ek.viz.contribution_bars(ax, trades, by="tag")`,
      },
      {
        id: "seasonality",
        title: "Seasonality",
        blurb: "Mean R by calendar month (or weekday).",
        code: `ek.viz.seasonality(ax, trades, by="month")`,
      },
    ],
  },
  {
    title: "Portfolio & the gauntlet",
    charts: [
      {
        id: "allocation_area",
        title: "Allocation over time",
        blurb: "Stacked area of book weights as they drift.",
        code: `fig = ek.viz.allocation_area(weights)`,
      },
      {
        id: "corr_heatmap",
        title: "Correlation heatmap",
        blurb: "Pairwise correlation across books, diverging colour.",
        code: `fig = ek.viz.corr_heatmap(corr)`,
      },
      {
        id: "rolling_correlation",
        title: "Rolling correlation",
        blurb: "How two books' correlation moves through time.",
        code: `fig = ek.viz.rolling_correlation(book_a, book_b, window=63)`,
      },
      {
        id: "rolling_metrics",
        title: "Rolling metrics",
        blurb: "A rolling Sharpe (or PF / win-rate) to see when the edge worked.",
        code: `ek.viz.rolling_metrics(ax, daily_r, window=63, metric="sharpe")`,
      },
      {
        id: "permutation_hist",
        title: "Permutation null",
        blurb: "The null distribution with the real result marked — the picture behind the p-value.",
        code: `ek.viz.permutation_hist(null_stats, real_stat)`,
      },
      {
        id: "cost_sensitivity",
        title: "Cost sensitivity",
        blurb: "Profit factor and expectancy as costs scale 1× → 3×.",
        code: `ek.viz.cost_sensitivity(ax, stress)`,
      },
      {
        id: "regime_bars",
        title: "Per-year regime",
        blurb: "Expectancy (or PF) broken out by year — where it earned and where it didn't.",
        code: `ek.viz.regime_bars(ax, regime_df, metric="ev")`,
      },
    ],
  },
];

export const ALL_CHART_IDS = CHART_GROUPS.flatMap((g) => g.charts.map((c) => c.id));
