export type NavLink = { title: string; href: string; badge?: string };
export type NavSection = { title: string; items: NavLink[]; collapsible?: boolean };

export const MODULES: { slug: string; title: string; blurb: string }[] = [
  { slug: "core", title: "core", blurb: "R-multiple + OHLC contract, lag(), Signal/Trade, RNG" },
  { slug: "data", title: "data", blurb: "load, fetch, resample, RTH sessions, integrity, cache, splits" },
  { slug: "indicators", title: "indicators", blurb: "atr, adx, donchian, hawkes, rsi, hedge, half-life" },
  { slug: "timeseries", title: "timeseries", blurb: "returns, vol, ACF/PACF, variance-ratio, Hurst, features" },
  { slug: "engine", title: "engine", blurb: "run_bar_loop + Strategy protocol, run_backtest" },
  { slug: "costs", title: "costs", blurb: "CostModel (fraction & pips), cost_stress" },
  { slug: "metrics", title: "metrics", blurb: "trade_stats, equity_stats, sharpe/sortino/pf/mar" },
  { slug: "risk", title: "risk", blurb: "VaR, CVaR, Cornish-Fisher, drawdown, tail ratio" },
  { slug: "sizing", title: "sizing", blurb: "risk_parity, hrp, vol_target, cppi, dd_throttle" },
  { slug: "optimize", title: "optimize", blurb: "mean-variance, efficient frontier, ERC, Ledoit-Wolf" },
  { slug: "factors", title: "factors", blurb: "OLS (t-stats, R²), CAPM alpha/beta, factor exposures" },
  { slug: "validation", title: "validation", blurb: "the gauntlet — permutation, PBO, DSR, walk-forward" },
  { slug: "strategy", title: "strategy", blurb: "BaseStrategy + templates: ORB, SmaCross" },
  { slug: "portfolio", title: "portfolio", blurb: "book combination, allocation sweep, correlation" },
  { slug: "challenge", title: "challenge", blurb: "prop-firm simulator, pass-rate, days-to-pass" },
  { slug: "options", title: "options", blurb: "Black-Scholes price + Greeks, implied vol" },
  { slug: "viz", title: "viz", blurb: "matplotlib charts + themes" },
  { slug: "report", title: "report", blurb: "self-contained HTML reports" },
  { slug: "ml", title: "ml", blurb: "features, triple-barrier, purged WF, tree export" },
];

// The tutorial curriculum — 6 parts, ordered. Routes are /tutorials/<slug>.
export const TUTORIAL_PARTS: { part: string; title: string; chapters: { slug: string; title: string }[] }[] = [
  {
    part: "I", title: "Foundations",
    chapters: [
      { slug: "what-is-algo-trading", title: "What is algorithmic trading?" },
      { slug: "markets-and-data", title: "Markets, instruments & data" },
      { slug: "your-toolkit", title: "Your toolkit" },
    ],
  },
  {
    part: "II", title: "The math",
    chapters: [
      { slug: "returns-and-compounding", title: "Returns & compounding" },
      { slug: "probability-and-distributions", title: "Probability & distributions" },
      { slug: "statistics-for-traders", title: "Statistics for traders" },
      { slug: "the-math-of-edge", title: "The math of edge" },
      { slug: "why-backtests-lie", title: "Why most backtests lie" },
    ],
  },
  {
    part: "III", title: "Building strategies",
    chapters: [
      { slug: "anatomy-of-a-strategy", title: "Anatomy of a strategy" },
      { slug: "indicators-and-features", title: "Indicators & features" },
      { slug: "time-series-analysis", title: "Time-series analysis for OHLC" },
      { slug: "feature-engineering", title: "Feature engineering" },
      { slug: "taxonomy-of-strategies", title: "A taxonomy of strategies" },
      { slug: "first-strategy", title: "Build your first strategy" },
      { slug: "entries-exits-stops", title: "Entries, exits & stops" },
      { slug: "position-sizing", title: "Position sizing & risk" },
    ],
  },
  {
    part: "IV", title: "Testing strategies",
    chapters: [
      { slug: "backtesting-fundamentals", title: "Backtesting fundamentals" },
      { slug: "backtesting-pitfalls", title: "The backtesting pitfalls" },
      { slug: "performance-metrics", title: "Performance metrics" },
      { slug: "the-gauntlet", title: "The validation gauntlet" },
      { slug: "monte-carlo", title: "Monte Carlo methods" },
      { slug: "walk-forward", title: "Walk-forward & out-of-sample" },
      { slug: "overfitting-detection", title: "Overfitting detection" },
      { slug: "alpha-vs-beta", title: "Is it alpha or beta?" },
    ],
  },
  {
    part: "V", title: "Simulation & advanced",
    chapters: [
      { slug: "simulating-markets", title: "Simulating markets" },
      { slug: "machine-learning", title: "Machine learning in trading" },
      { slug: "portfolio-construction", title: "Portfolio construction" },
      { slug: "prop-firm-capital", title: "Prop-firm & capital" },
    ],
  },
  {
    part: "VI", title: "Mathematical toolkit",
    chapters: [
      { slug: "linear-algebra-for-quants", title: "Linear algebra for quants" },
      { slug: "regression-and-factor-models", title: "Regression & factor models" },
      { slug: "optimization-and-portfolios", title: "Optimization & portfolios" },
      { slug: "stochastic-processes", title: "Stochastic processes" },
      { slug: "bayesian-methods", title: "Bayesian methods" },
    ],
  },
  {
    part: "VII", title: "Derivatives & microstructure",
    chapters: [
      { slug: "options-and-greeks", title: "Options & the Greeks" },
      { slug: "volatility-trading", title: "Volatility trading" },
      { slug: "market-microstructure", title: "Market microstructure" },
      { slug: "execution-and-tca", title: "Execution & transaction costs" },
    ],
  },
  {
    part: "VIII", title: "Advanced modeling & risk",
    chapters: [
      { slug: "arima-and-garch", title: "ARIMA & GARCH" },
      { slug: "cointegration-and-pairs", title: "Cointegration & pairs" },
      { slug: "regime-detection", title: "Regime detection" },
      { slug: "risk-management", title: "Risk management" },
    ],
  },
  {
    part: "IX", title: "Capstone",
    chapters: [
      { slug: "backtest-to-live", title: "From backtest to live" },
      { slug: "capstone", title: "Capstone: end-to-end research" },
    ],
  },
];

// ---- docs sidebar (no tutorials) --------------------------------------------
export const DOCS_NAV: NavSection[] = [
  {
    title: "Getting started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
      { title: "Quickstart", href: "/docs/quickstart" },
      { title: "The pipeline", href: "/docs/pipeline" },
    ],
  },
  {
    title: "Concepts",
    items: [
      { title: "R-multiples", href: "/docs/concepts/r-multiples" },
      { title: "Causality", href: "/docs/concepts/causality" },
      { title: "The OHLC contract", href: "/docs/concepts/ohlc" },
      { title: "The validation gauntlet", href: "/docs/concepts/gauntlet", badge: "core" },
    ],
  },
  {
    title: "Guides",
    items: [
      { title: "Your first backtest", href: "/docs/guides/first-backtest" },
      { title: "Proving an edge", href: "/docs/guides/proving-an-edge" },
      { title: "Prop-firm sizing", href: "/docs/guides/prop-firm" },
      { title: "A custom strategy", href: "/docs/guides/custom-strategy" },
      { title: "ML meta-labeling", href: "/docs/guides/ml-meta-labeling" },
      { title: "Reports & charts", href: "/docs/guides/reports" },
    ],
  },
  {
    title: "API reference",
    items: [
      { title: "Overview", href: "/docs/api" },
      ...MODULES.map((m) => ({ title: m.title, href: `/docs/api/${m.slug}` })),
    ],
  },
  {
    title: "Examples",
    items: [
      { title: "The ORB gauntlet", href: "/docs/examples/orb-gauntlet" },
      { title: "Chart gallery", href: "/docs/gallery" },
    ],
  },
  {
    title: "Project",
    items: [{ title: "Roadmap", href: "/docs/roadmap" }],
  },
];

// ---- tutorials sidebar (its own top-level section) --------------------------
export const TUTORIAL_NAV: NavSection[] = [
  { title: "Tutorials", items: [{ title: "Overview", href: "/tutorials" }] },
  ...TUTORIAL_PARTS.map((p) => ({
    title: `${p.part} · ${p.title}`,
    collapsible: true,
    items: p.chapters.map((c) => ({ title: c.title, href: `/tutorials/${c.slug}` })),
  })),
];

// back-compat alias (docs pages import NAV)
export const NAV = DOCS_NAV;

function flat(sections: NavSection[]): NavLink[] {
  return sections.flatMap((s) => s.items);
}

// prev/next within the current area (tutorials vs docs), by href prefix
export function neighbors(href: string): { prev?: NavLink; next?: NavLink } {
  const sections = href.startsWith("/tutorials") ? TUTORIAL_NAV : DOCS_NAV;
  const list = flat(sections);
  const i = list.findIndex((p) => p.href === href);
  if (i === -1) return {};
  return { prev: list[i - 1], next: list[i + 1] };
}
