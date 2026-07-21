import { DOCS_NAV, TUTORIAL_NAV } from "./nav";

export type SearchDoc = {
  title: string;
  href: string;
  section: string;
  keywords: string;
  description: string;
};

// Per-route keywords + one-line description so the palette matches real terms
// (e.g. "permutation", "atr", "risk parity") — not just page titles. Keyed by href;
// any nav item without an entry still appears with title + section only.
const META: Record<string, { keywords: string; description: string }> = {
  "/docs": {
    keywords: "introduction overview prime directive prove edge fake alpha beta look-ahead overfitting",
    description: "What edgekit is and the prime directive: assume every edge is fake until proven.",
  },
  "/docs/installation": {
    keywords: "install pip editable extras io viz ml dev pyarrow matplotlib scikit-learn xgboost lightgbm python version lazy dependencies",
    description: "Install with the extras you need; core stays numpy + pandas.",
  },
  "/docs/quickstart": {
    keywords: "quickstart first result backtest permutation size report ten minutes example",
    description: "A causally-validated backtest, permutation p-value and all, in ten minutes.",
  },
  "/docs/pipeline": {
    keywords: "pipeline load backtest prove size ship stages order mental model",
    description: "The five stages — load, backtest, prove, size, ship — and why order matters.",
  },
  "/docs/concepts/r-multiples": {
    keywords: "r-multiple risk reward units stop distance dollars sizing scalar expectancy",
    description: "Why edgekit prices everything in R and applies dollars once, later.",
  },
  "/docs/concepts/causality": {
    keywords: "causality look-ahead bias lag shift future leak gap-aware fills property test warmup",
    description: "No look-ahead: indicators are unlagged, you lag explicitly, and CI proves it.",
  },
  "/docs/concepts/ohlc": {
    keywords: "ohlc bars contract datetimeindex utc resample timeframe sessions rth integrity split as_ohlc",
    description: "The bar-frame contract: loading, resampling, sessions, and integrity checks.",
  },
  "/docs/concepts/gauntlet": {
    keywords: "validation gauntlet permutation mcpt walk-forward regime cost stress is-it-beta parameter robustness pbo deflated sharpe overfit p-value",
    description: "The nine-step gauntlet that decides whether an edge is real.",
  },
  "/docs/guides/first-backtest": {
    keywords: "first backtest trade frame trade_stats gap-aware fills cost run_bar_loop columns",
    description: "Load, backtest, and read the trade frame and its statistics.",
  },
  "/docs/guides/proving-an-edge": {
    keywords: "prove edge permutation null_stat mcpt cost stress is-it-beta walk-forward param sweep pbo deflated sharpe",
    description: "Put a strategy through the full gauntlet in practice.",
  },
  "/docs/guides/prop-firm": {
    keywords: "prop firm challenge sizing size_to_dd drawdown budget daily cap ftmo cryptofundtrader brightfunded pass rate days to pass haircut",
    description: "From an R-stream to dollars sized to a prop-firm drawdown budget.",
  },
  "/docs/guides/custom-strategy": {
    keywords: "custom strategy basestrategy prepare entry exit entryintent backtest subclass indicators lag",
    description: "Subclass BaseStrategy: prepare, entry, exit — then backtest it.",
  },
  "/docs/guides/ml-meta-labeling": {
    keywords: "machine learning meta-labeling triple-barrier features purged walk-forward embargo make_model metalabeler export trees cloud cbot leakage",
    description: "Meta-label a signal, validate without leakage, export cloud-safe trees.",
  },
  "/docs/guides/reports": {
    keywords: "reports charts viz report tear sheet equity drawdown monthly heatmap monte carlo themes html base64",
    description: "Build charts and self-contained HTML reports from a backtest.",
  },
  "/docs/api": {
    keywords: "api reference modules import edgekit overview lazy dependencies",
    description: "Every public function, module by module.",
  },
  "/docs/api/core": {
    keywords: "core ohlc as_ohlc lag signal trade trades_to_frame bootstrap_rng r-multiple types",
    description: "R-multiple + OHLC contract, lag(), Signal/Trade, RNG.",
  },
  "/docs/api/data": {
    keywords: "data load_bars resample_ohlcv rth_mask to_ny integrity_report stitch chronological_split fetch_binance hashed_parquet_cache timeframe",
    description: "Load, fetch, resample, sessions, integrity, cache, splits.",
  },
  "/docs/api/indicators": {
    keywords: "indicators atr adx donchian hawkes rsi zscore ema sma true_range rolling_beta residualize half_life cross_sectional_rank causal",
    description: "Vectorised, causal indicators — atr, adx, donchian, hawkes, rsi, hedge.",
  },
  "/docs/api/engine": {
    keywords: "engine run_bar_loop strategy protocol entryintent fill_entry fill_stop run_backtest engineconfig backtestresult gap-aware pessimistic",
    description: "The R-multiple backtest loop, Strategy interface, and prop-firm engine.",
  },
  "/docs/api/costs": {
    keywords: "costs costmodel pipcostmodel cost_stress spread swap slippage commission r_cost scaled",
    description: "Transaction-cost models (fraction & pips) and the cost-stress harness.",
  },
  "/docs/api/metrics": {
    keywords: "metrics trade_stats equity_stats sharpe sortino profit_factor max_drawdown mar cagr dd_matched_size expectancy win rate",
    description: "Trade & equity statistics — PF, MAR, Sharpe/Sortino, drawdown, sizing.",
  },
  "/docs/api/sizing": {
    keywords: "sizing risk_parity hrp vol_target cppi dd_throttle size_to_dd inverse-vol hierarchical drawdown budget",
    description: "Position sizing: risk-parity, HRP, vol-target, CPPI, DD-throttle.",
  },
  "/docs/api/validation": {
    keywords: "validation permute_ohlc permute_returns mcpt pbo_cscv deflated_sharpe walk_forward oos_split is_it_beta param_sweep regime block_bootstrap_mc dd95 permutation p-value gauntlet",
    description: "The gauntlet — permutation, PBO, deflated Sharpe, walk-forward, beta.",
  },
  "/docs/api/strategy": {
    keywords: "strategy basestrategy orb opening range breakout keltner rsi2 mean reversion statarb pairs hawkes backtest",
    description: "The Strategy base class and the built-in strategy zoo.",
  },
  "/docs/api/portfolio": {
    keywords: "portfolio combine allocation_sweep correlation books risk-parity weights oos",
    description: "Combine strategy books, sweep allocations, correlation.",
  },
  "/docs/api/challenge": {
    keywords: "challenge challengerules simulate days_to_pass ftmo cryptofundtrader brightfunded pass rate prop firm phase targets",
    description: "Prop-firm evaluation simulator — pass-rate and days-to-pass.",
  },
  "/docs/api/viz": {
    keywords: "viz charts matplotlib themes equity drawdown monthly heatmap mc_fan r_histogram corr_heatmap candles tear sheet rolling seasonality qq",
    description: "Chart vocabulary — equity, drawdown, heatmaps, Monte-Carlo fan, tear sheet.",
  },
  "/docs/api/report": {
    keywords: "report html self-contained kpi cards tables chart caveat tear_sheet three_report_suite base64 themes",
    description: "Self-contained HTML report builder and the tear sheet.",
  },
  "/docs/api/ml": {
    keywords: "ml machine learning build_features triple_barrier uniqueness_weights walk_forward_windows purgedkfold make_model metalabeler export_trees emit_python emit_csharp shuffle_label_gate",
    description: "Features, triple-barrier labels, purged walk-forward, tree export.",
  },
  "/docs/examples/orb-gauntlet": {
    keywords: "example orb opening range breakout gauntlet walkthrough demonstration net-negative costs rejected",
    description: "A full walkthrough — watch the gauntlet reject an opening-range breakout.",
  },
  "/docs/gallery": {
    keywords: "chart gallery visualization charts monte carlo fan equity drawdown heatmap examples rendered pretty images",
    description: "Every viz chart rendered in both themes, with the code that produced it.",
  },
  "/docs/roadmap": {
    keywords: "roadmap future improvements planned ideas performance breadth live deployment rigor developer experience",
    description: "Where edgekit is headed — proposed improvements, grouped by theme.",
  },
  "/docs/api/timeseries": {
    keywords: "time series analysis autocorrelation acf pacf stationarity variance ratio hurst adf volatility clustering feature engineering make_features returns ewma",
    description: "Time-series analysis + feature engineering — ACF/PACF, variance-ratio, Hurst, features.",
  },
  "/tutorials": {
    keywords: "tutorial course learn algorithmic trading from scratch math probability backtesting monte carlo strategies",
    description: "A complete algorithmic-trading course — foundations to capstone.",
  },
  "/tutorials/time-series-analysis": {
    keywords: "time series analysis ohlc stationarity autocorrelation acf pacf variance ratio hurst random walk mean reversion volatility clustering seasonality differencing",
    description: "Stationarity, autocorrelation, persistence, and volatility clustering in price series.",
  },
  "/tutorials/feature-engineering": {
    keywords: "feature engineering features returns momentum volatility rsi atr calendar lags normalization leakage look-ahead selection",
    description: "Turning OHLC bars into causal features for rules and models.",
  },
  "/tutorials/monte-carlo": {
    keywords: "monte carlo bootstrap permutation test mcpt confidence cone risk of ruin path simulation null distribution",
    description: "Bootstrap, the permutation test, path simulation, and risk of ruin.",
  },
  "/tutorials/the-math-of-edge": {
    keywords: "expectancy r-multiple win rate kelly criterion risk of ruin law of large numbers payoff ratio",
    description: "Expectancy, Kelly, and the math of a real edge.",
  },
};

export const SEARCH_INDEX: SearchDoc[] = [...DOCS_NAV, ...TUTORIAL_NAV].flatMap((section) =>
  section.items.map((item) => ({
    title: item.title,
    href: item.href,
    section: section.title,
    keywords: META[item.href]?.keywords ?? "",
    description: META[item.href]?.description ?? "",
  })),
);

export function searchDocs(query: string, limit = 12): SearchDoc[] {
  const q = query.trim().toLowerCase();
  if (!q) return SEARCH_INDEX.slice(0, 8);
  const terms = q.split(/\s+/);
  const scored = SEARCH_INDEX.map((doc) => {
    const hay = `${doc.title} ${doc.section} ${doc.keywords} ${doc.description}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (!hay.includes(t)) return { doc, score: -1 };
      if (doc.title.toLowerCase().includes(t)) score += 10;
      if (doc.keywords.toLowerCase().includes(t)) score += 4;
      if (doc.section.toLowerCase().includes(t)) score += 2;
      score += 1;
    }
    return { doc, score };
  });
  return scored
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.doc);
}
