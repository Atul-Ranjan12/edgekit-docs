"""Teaching figures for the tutorial series — light + dark, styled like the gallery.

Writes public/charts/tut/<name>.{light,dark}.png. Embedded in tutorial pages via
<ChartFigure name="tut/<name>" ... />. Run:
    ~/Documents/edgekit/.venv/bin/python scripts/gen_tutorial_figs.py
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from edgekit import viz

OUT = Path(__file__).resolve().parent.parent / "public" / "charts" / "tut"
DPI = 200
THEMES = ("light", "dark")


def _norm_pdf(x):
    return np.exp(-x ** 2 / 2) / math.sqrt(2 * math.pi)


def _t_pdf(x, df=3):
    c = math.gamma((df + 1) / 2) / (math.sqrt(df * math.pi) * math.gamma(df / 2))
    return c * (1 + x ** 2 / df) ** (-(df + 1) / 2)


def normal_vs_fat(ax, th):
    x = np.linspace(-5, 5, 500)
    ax.plot(x, _norm_pdf(x), color=th["blue"], lw=2, label="Normal")
    ax.plot(x, _t_pdf(x, 3), color=th["red"], lw=2, label="Fat-tailed (t, ν=3)")
    tail = x <= -2.5
    ax.fill_between(x[tail], _t_pdf(x[tail], 3), color=th["red"], alpha=.25)
    ax.fill_between(-x[tail], _t_pdf(-x[tail], 3), color=th["red"], alpha=.25)
    ax.set_title("Returns have fat tails — extremes are far more likely than Normal")
    ax.legend(fontsize=8)


def lln_convergence(ax, th):
    rng = np.random.default_rng(3)
    n = 2000
    for c in th["palette"][:4]:
        flips = rng.choice([1.0, -1.0], size=n, p=[0.52, 0.48])
        ax.plot(np.arange(1, n + 1), np.cumsum(flips) / np.arange(1, n + 1), color=c, lw=1, alpha=.8)
    ax.axhline(0.04, color=th["green"], ls="--", lw=1.5, label="true edge E[X]=0.04")
    ax.set_xscale("log")
    ax.set_title("Law of large numbers — sample mean → true edge, but slowly")
    ax.set_xlabel("trades (log)")
    ax.legend(fontsize=8)


def clt_sampling(ax, th):
    x = np.linspace(-3, 3, 400)
    for n, c in zip((1, 4, 30), th["palette"][:3]):
        sd = 1 / math.sqrt(n)
        ax.plot(x, _norm_pdf(x / sd) / sd, color=c, lw=2, label=f"n = {n}")
    ax.set_title("Central limit theorem — the mean's spread shrinks like 1/√n")
    ax.legend(fontsize=8)


def compounding_drag(ax, th):
    rng = np.random.default_rng(7)
    steps = 250
    r_smooth = np.full(steps, 0.004)
    r_vol = rng.normal(0.004, 0.05, steps)
    ax.plot(np.cumprod(1 + r_smooth), color=th["green"], lw=2, label="steady +0.4%/step")
    ax.plot(np.cumprod(1 + r_vol), color=th["red"], lw=1.8, label="same mean, high vol")
    ax.set_title("Volatility drag — same arithmetic mean, lower compound growth")
    ax.legend(fontsize=8)


def kelly_curve(ax, th):
    f = np.linspace(0, 1, 400)
    p, b = 0.55, 1.0  # win prob, payoff
    g = p * np.log1p(b * f) + (1 - p) * np.log1p(-f)
    g[np.isnan(g)] = -np.inf
    fstar = (p * (b + 1) - 1) / b
    ax.plot(f, g, color=th["blue"], lw=2)
    ax.axvline(fstar, color=th["green"], ls="--", lw=1.5, label=f"Kelly f* = {fstar:.2f}")
    ax.axhline(0, color=th["muted"], lw=.8)
    ax.set_ylim(-0.05, g[np.isfinite(g)].max() * 1.4)
    ax.set_title("Kelly criterion — growth rate peaks at f*, then goes negative")
    ax.set_xlabel("fraction of capital risked")
    ax.legend(fontsize=8)


def risk_of_ruin(ax, th):
    f = np.linspace(0.005, 0.15, 300)
    for p, c in zip((0.50, 0.55, 0.60), th["palette"][:3]):
        edge = 2 * p - 1
        ror = np.exp(-2 * edge / (f)) if edge > 0 else np.ones_like(f)
        ror = np.clip(ror, 0, 1) if edge > 0 else ror
        ax.plot(f * 100, ror, color=c, lw=2, label=f"win {p:.0%}")
    ax.set_title("Risk of ruin rises fast as you bet bigger")
    ax.set_xlabel("risk per trade (%)")
    ax.set_ylabel("P(ruin)")
    ax.legend(fontsize=8)


def permutation_illustration(ax, th):
    rng = np.random.default_rng(11)
    inc = rng.normal(0.03, 1, 300)
    ax.plot(np.cumsum(inc), color=th["green"], lw=2, label="real series (trend)")
    for c in th["palette"][:3]:
        ax.plot(np.cumsum(rng.permutation(inc)), color=c, lw=1, alpha=.7)
    ax.set_title("Permutation test — shuffle bar order to destroy the trend")
    ax.legend(fontsize=8)


def walk_forward_split(ax, th):
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5)
    for k in range(4):
        y = 4 - k
        ax.add_patch(_rect(k * 1.2, y, 4, 0.7, th["blue"], .7))       # train
        ax.add_patch(_rect(k * 1.2 + 4, y, 0.4, 0.7, th["gold"], .8))  # embargo
        ax.add_patch(_rect(k * 1.2 + 4.4, y, 1.4, 0.7, th["green"], .85))  # test
    ax.text(2, 4.9, "train", color=th["blue"], fontsize=9, ha="center")
    ax.text(6.4, 4.9, "test", color=th["green"], fontsize=9, ha="center")
    ax.set_title("Walk-forward — roll train→embargo→test windows through time")
    ax.set_yticks([])
    ax.set_xlabel("time →")


def overfitting_curve(ax, th):
    x = np.linspace(1, 10, 200)
    train = 1.6 * np.exp(-0.35 * x) + 0.05
    test = 0.9 * np.exp(-0.6 * x) + 0.02 * (x - 3) ** 2 + 0.1
    ax.plot(x, train, color=th["green"], lw=2, label="in-sample error")
    ax.plot(x, test, color=th["red"], lw=2, label="out-of-sample error")
    ax.axvline(x[np.argmin(test)], color=th["muted"], ls="--", lw=1.2, label="sweet spot")
    ax.set_title("Overfitting — in-sample keeps improving while OOS turns up")
    ax.set_xlabel("model complexity / parameters")
    ax.legend(fontsize=8)


def gbm_paths(ax, th):
    rng = np.random.default_rng(5)
    n, steps = 24, 252
    mu, sig = 0.0003, 0.012
    for i in range(n):
        r = rng.normal(mu, sig, steps)
        ax.plot(100 * np.exp(np.cumsum(r)), color=th["palette"][i % len(th["palette"])], lw=0.8, alpha=.7)
    ax.set_title("Simulating markets — geometric Brownian motion sample paths")
    ax.set_xlabel("days")


def regime_shift(ax, th):
    rng = np.random.default_rng(9)
    trend = np.cumsum(rng.normal(0.05, 1, 200))
    chop = trend[-1] + np.cumsum(rng.normal(0, 1, 200))
    y = np.concatenate([trend, chop])
    ax.plot(y, color=th["blue"], lw=1.6)
    ax.axvspan(0, 200, color=th["green"], alpha=.10)
    ax.axvspan(200, 400, color=th["red"], alpha=.10)
    ax.text(100, ax.get_ylim()[1], "trending", color=th["green"], fontsize=9, ha="center", va="top")
    ax.text(300, ax.get_ylim()[1], "choppy", color=th["red"], fontsize=9, ha="center", va="top")
    ax.set_title("Regimes — the same strategy behaves differently across them")


def multiple_testing(ax, th):
    rng = np.random.default_rng(1)
    trials = 4000
    single = rng.normal(0, 1, trials)
    best_of_100 = np.max(rng.normal(0, 1, (trials, 100)), axis=1)
    ax.hist(single, bins=60, color=th["blue"], alpha=.6, density=True, label="one strategy")
    ax.hist(best_of_100, bins=60, color=th["red"], alpha=.6, density=True, label="best of 100 (all noise)")
    ax.set_title("Multiple testing — pick the best of many and noise looks like skill")
    ax.set_xlabel("Sharpe (null)")
    ax.legend(fontsize=8)


def confidence_interval(ax, th):
    rng = np.random.default_rng(2)
    ns = np.array([10, 30, 100, 300, 1000])
    true = 0.05
    means = [rng.normal(true, 1 / math.sqrt(n)) for n in ns]
    err = [1.96 / math.sqrt(n) for n in ns]
    ax.errorbar(range(len(ns)), means, yerr=err, fmt="o", color=th["blue"],
                ecolor=th["muted"], capsize=5, lw=2)
    ax.axhline(true, color=th["green"], ls="--", lw=1.5, label="true mean")
    ax.set_xticks(range(len(ns)))
    ax.set_xticklabels(ns)
    ax.set_title("Confidence intervals shrink with sample size")
    ax.set_xlabel("sample size (trades)")
    ax.legend(fontsize=8)


def acf_plot(ax, th):
    rng = np.random.default_rng(4)
    n = 600
    x = np.zeros(n)
    for i in range(1, n):
        x[i] = 0.6 * x[i - 1] + rng.normal()
    nl = 20
    xm = x - x.mean()
    denom = (xm ** 2).sum()
    ac = [float((xm[k:] * xm[:n - k]).sum() / denom) for k in range(nl + 1)]
    lags = np.arange(nl + 1)
    ax.vlines(lags, 0, ac, color=th["blue"], lw=3)
    ax.plot(lags, ac, "o", color=th["blue"], ms=4)
    ci = 1.96 / np.sqrt(n)
    ax.axhline(ci, color=th["muted"], ls="--", lw=1)
    ax.axhline(-ci, color=th["muted"], ls="--", lw=1)
    ax.axhline(0, color=th["muted"], lw=.8)
    ax.set_title("Autocorrelation (ACF) — an AR(1) series decays geometrically")
    ax.set_xlabel("lag")


def stationary_vs_randomwalk(ax, th):
    rng = np.random.default_rng(6)
    n = 500
    rw = np.cumsum(rng.normal(0, 1, n))
    stat = np.zeros(n)
    for i in range(1, n):
        stat[i] = 0.3 * stat[i - 1] + rng.normal()
    ax.plot(rw, color=th["red"], lw=1.6, label="random walk (non-stationary)")
    ax.plot(stat, color=th["green"], lw=1.3, label="stationary (mean-reverting)")
    ax.axhline(0, color=th["muted"], lw=.8)
    ax.set_title("Stationary vs non-stationary — one wanders, one returns to its mean")
    ax.legend(fontsize=8)


def vol_clustering(ax, th):
    rng = np.random.default_rng(8)
    n = 700
    s2 = np.zeros(n)
    r = np.zeros(n)
    s2[0] = 1.0
    omega, alpha, beta = 0.05, 0.12, 0.86
    for i in range(1, n):
        s2[i] = omega + alpha * r[i - 1] ** 2 + beta * s2[i - 1]
        r[i] = np.sqrt(s2[i]) * rng.normal()
    ax.plot(np.abs(r), color=th["gold"], lw=0.8)
    ax.set_title("Volatility clustering — large moves cluster (GARCH |returns|)")
    ax.set_xlabel("time")


def _ncdf(x):
    from math import erf
    return np.array([0.5 * (1 + erf(v / 2 ** 0.5)) for v in np.atleast_1d(x)])


def efficient_frontier(ax, th):
    rng = np.random.default_rng(2)
    mu = np.array([0.08, 0.12, 0.15])
    sd = np.array([0.12, 0.18, 0.25])
    corr = np.array([[1, 0.2, 0.1], [0.2, 1, 0.3], [0.1, 0.3, 1]])
    cov = np.outer(sd, sd) * corr
    W = rng.dirichlet(np.ones(3), 4000)
    prt = W @ mu
    pv = np.sqrt(np.einsum("ij,jk,ik->i", W, cov, W))
    ax.scatter(pv, prt, s=4, c=(prt - pv), cmap="viridis", alpha=.5)
    ax.scatter(sd, mu, color=th["red"], s=60, marker="*", zorder=5, label="single assets")
    ax.set_title("The efficient frontier — random portfolios and their upper envelope")
    ax.set_xlabel("volatility")
    ax.set_ylabel("expected return")
    ax.legend(fontsize=8)


def capm_sml(ax, th):
    rng = np.random.default_rng(3)
    rf, mrp = 0.02, 0.06
    betas = np.array([0.3, 0.6, 0.9, 1.1, 1.4, 1.7])
    er = rf + betas * mrp + rng.normal(0, 0.008, len(betas))
    xs = np.linspace(0, 2, 50)
    ax.plot(xs, rf + xs * mrp, color=th["blue"], lw=2, label="security market line")
    ax.scatter(betas, er, color=th["green"], s=45, zorder=5)
    ax.axhline(rf, color=th["muted"], ls="--", lw=1, label="risk-free")
    ax.set_title("CAPM — expected return is linear in beta")
    ax.set_xlabel("beta")
    ax.set_ylabel("expected return")
    ax.legend(fontsize=8)


def pca_variance(ax, th):
    rng = np.random.default_rng(5)
    X = rng.normal(0, 1, (500, 8))
    X[:, 1] += 0.9 * X[:, 0]
    X[:, 2] += 0.7 * X[:, 0]
    ev = np.sort(np.linalg.eigvalsh(np.corrcoef(X.T)))[::-1]
    k = np.arange(1, len(ev) + 1)
    ax.bar(k, ev / ev.sum(), color=th["blue"], alpha=.8, label="variance explained")
    ax.plot(k, np.cumsum(ev) / ev.sum(), color=th["green"], marker="o", lw=2, label="cumulative")
    ax.set_title("PCA — a few components capture most of the covariance")
    ax.set_xlabel("principal component")
    ax.legend(fontsize=8)


def brownian_motion(ax, th):
    rng = np.random.default_rng(6)
    for c in th["palette"]:
        ax.plot(np.cumsum(rng.normal(0, 1, 300)), color=c, lw=0.9, alpha=.8)
    ax.axhline(0, color=th["muted"], lw=.8)
    ax.set_title("Brownian motion — the driftless random walk (E[W_t]=0, Var∝t)")
    ax.set_xlabel("time")


def option_payoff(ax, th):
    S = np.linspace(60, 140, 200)
    K, prem = 100, 6
    ax.plot(S, np.maximum(S - K, 0) - prem, color=th["green"], lw=2, label="long call")
    ax.plot(S, np.maximum(K - S, 0) - prem, color=th["red"], lw=2, label="long put")
    ax.axhline(0, color=th["muted"], lw=.8)
    ax.axvline(K, color=th["muted"], ls="--", lw=1)
    ax.set_title("Option payoffs at expiry — convex, capped downside")
    ax.set_xlabel("underlying price")
    ax.set_ylabel("P&L")
    ax.legend(fontsize=8)


def option_greeks(ax, th):
    S = np.linspace(60, 140, 200)
    K, t, r, sig = 100.0, 0.5, 0.0, 0.25
    d1 = (np.log(S / K) + (r + sig ** 2 / 2) * t) / (sig * np.sqrt(t))
    delta = _ncdf(d1)
    from math import erf  # noqa
    pdf = np.exp(-d1 ** 2 / 2) / np.sqrt(2 * np.pi)
    gamma = pdf / (S * sig * np.sqrt(t))
    ax.plot(S, delta, color=th["blue"], lw=2, label="delta (call)")
    ax2 = ax.twinx()
    ax2.plot(S, gamma, color=th["gold"], lw=2, label="gamma")
    ax2.tick_params(colors=th["muted"])
    ax.axvline(K, color=th["muted"], ls="--", lw=1)
    ax.set_title("The Greeks — delta (0→1) and gamma (peaks ATM)")
    ax.set_xlabel("underlying price")
    ax.legend(fontsize=8, loc="upper left")


def vol_smile(ax, th):
    m = np.linspace(-0.3, 0.3, 100)
    iv = 0.18 + 0.5 * m ** 2 - 0.15 * m
    ax.plot(m, iv, color=th["blue"], lw=2)
    ax.axvline(0, color=th["muted"], ls="--", lw=1)
    ax.set_title("The volatility smile/skew — implied vol varies by strike")
    ax.set_xlabel("log-moneyness  ln(K/S)")
    ax.set_ylabel("implied volatility")


def orderbook(ax, th):
    mid = 100.0
    bid_p = mid - np.arange(1, 9) * 0.1
    ask_p = mid + np.arange(1, 9) * 0.1
    rng = np.random.default_rng(7)
    bid_q = np.cumsum(rng.integers(50, 200, 8))
    ask_q = np.cumsum(rng.integers(50, 200, 8))
    ax.barh(bid_p, bid_q, height=0.08, color=th["green"], alpha=.8, label="bids")
    ax.barh(ask_p, -ask_q, height=0.08, color=th["red"], alpha=.8, label="asks")
    ax.axhline(mid, color=th["muted"], ls="--", lw=1, label="mid")
    ax.set_title("The limit order book — cumulative depth around the mid")
    ax.set_xlabel("← ask depth      bid depth →")
    ax.set_ylabel("price")
    ax.legend(fontsize=8)


def price_impact(ax, th):
    q = np.linspace(0, 1, 200)
    ax.plot(q, 0.4 * np.sqrt(q), color=th["red"], lw=2, label="√-impact")
    ax.plot(q, 0.4 * q, color=th["muted"], ls="--", lw=1.5, label="linear (naive)")
    ax.set_title("Price impact grows ~ √(order size) — big orders move the market")
    ax.set_xlabel("order size / ADV")
    ax.set_ylabel("cost (bps)")
    ax.legend(fontsize=8)


def garch_cond_vol(ax, th):
    rng = np.random.default_rng(8)
    n = 500
    s2 = np.zeros(n)
    r = np.zeros(n)
    s2[0] = 1.0
    om, al, be = 0.05, 0.12, 0.86
    for i in range(1, n):
        s2[i] = om + al * r[i - 1] ** 2 + be * s2[i - 1]
        r[i] = np.sqrt(s2[i]) * rng.normal()
    vol = np.sqrt(s2)
    ax.plot(r, color=th["muted"], lw=0.6, alpha=.7, label="returns")
    ax.plot(2 * vol, color=th["red"], lw=1.4, label="±2σ (GARCH)")
    ax.plot(-2 * vol, color=th["red"], lw=1.4)
    ax.set_title("GARCH conditional volatility — the band breathes with the market")
    ax.set_xlabel("time")
    ax.legend(fontsize=8)


def kalman_hedge(ax, th):
    rng = np.random.default_rng(9)
    n = 400
    beta = np.linspace(1.0, 2.0, n)
    est = beta + np.cumsum(rng.normal(0, 0.02, n)) * 0.3 + rng.normal(0, 0.05, n)
    ax.plot(beta, color=th["green"], lw=2, label="true hedge ratio")
    ax.plot(est, color=th["blue"], lw=1, alpha=.8, label="Kalman estimate")
    ax.set_title("Kalman filter — tracking a hedge ratio that drifts over time")
    ax.set_xlabel("time")
    ax.legend(fontsize=8)


def hmm_regimes(ax, th):
    rng = np.random.default_rng(10)
    calm = rng.normal(0, 0.4, 250)
    wild = rng.normal(0, 1.6, 200)
    y = np.concatenate([calm, wild, rng.normal(0, 0.4, 150)])
    ax.plot(np.cumsum(y), color=th["blue"], lw=1.4)
    ax.axvspan(250, 450, color=th["red"], alpha=.12)
    ax.set_title("Regime detection — an HMM flags the high-volatility state")
    ax.set_xlabel("time")


def var_cvar(ax, th):
    rng = np.random.default_rng(11)
    r = rng.standard_t(4, 6000) * 0.01
    var = np.percentile(r, 5)
    cvar = r[r <= var].mean()
    ax.hist(r, bins=80, color=th["blue"], alpha=.7)
    ax.axvline(var, color=th["gold"], lw=2, label=f"VaR(5%) = {-var:.1%}")
    ax.axvline(cvar, color=th["red"], lw=2, label=f"CVaR(5%) = {-cvar:.1%}")
    tail = np.linspace(r.min(), var, 50)
    ax.axvspan(r.min(), var, color=th["red"], alpha=.10)
    ax.set_title("VaR vs CVaR — the threshold loss vs the average of the tail")
    ax.set_xlabel("return")
    ax.legend(fontsize=8)


def bayes_updating(ax, th):
    x = np.linspace(-3, 3, 400)
    prior = _ncdf  # noqa
    def npdf(mu, sd):
        return np.exp(-((x - mu) / sd) ** 2 / 2) / (sd * np.sqrt(2 * np.pi))
    ax.plot(x, npdf(0, 1.0), color=th["muted"], lw=2, label="prior")
    ax.plot(x, npdf(1.0, 0.7), color=th["gold"], lw=2, ls="--", label="likelihood (data)")
    ax.plot(x, npdf(0.7, 0.55), color=th["green"], lw=2.4, label="posterior")
    ax.set_title("Bayesian updating — the posterior blends prior and data")
    ax.set_xlabel("parameter")
    ax.legend(fontsize=8)


def correlation_scatter(ax, th):
    rng = np.random.default_rng(21)
    x = rng.normal(0, 1, 400)
    y = 0.72 * x + rng.normal(0, 0.7, 400)
    rho = np.corrcoef(x, y)[0, 1]
    ax.scatter(x, y, s=10, color=th["blue"], alpha=.5)
    xs = np.linspace(x.min(), x.max(), 50)
    b = np.polyfit(x, y, 1)
    ax.plot(xs, b[0] * xs + b[1], color=th["red"], lw=2)
    ax.set_title(f"Correlation — two assets moving together (ρ ≈ {rho:.2f})")
    ax.set_xlabel("asset A return (z)")
    ax.set_ylabel("asset B return (z)")


def hypothesis_test(ax, th):
    x = np.linspace(-4, 7, 500)
    null = _norm_pdf(x)
    alt = _norm_pdf(x - 2.6)
    zc = 1.645
    ax.plot(x, null, color=th["blue"], lw=2, label="null (no edge)")
    ax.plot(x, alt, color=th["green"], lw=2, label="alternative (real edge)")
    ax.fill_between(x[x >= zc], null[x >= zc], color=th["red"], alpha=.35, label="α (false positive)")
    ax.fill_between(x[x < zc], alt[x < zc], color=th["gold"], alpha=.25, label="β (missed edge)")
    ax.axvline(zc, color=th["muted"], ls="--", lw=1.2)
    ax.set_title("Hypothesis testing — α (false positive) vs β (missed edge)")
    ax.legend(fontsize=7)


def _norm_pdf(x):
    return np.exp(-np.asarray(x, float) ** 2 / 2) / np.sqrt(2 * np.pi)


def ols_fit(ax, th):
    rng = np.random.default_rng(22)
    x = np.sort(rng.uniform(0, 10, 40))
    y = 2 + 1.5 * x + rng.normal(0, 2.5, 40)
    b = np.polyfit(x, y, 1)
    fit = b[0] * x + b[1]
    for xi, yi, fi in zip(x, y, fit):
        ax.plot([xi, xi], [yi, fi], color=th["muted"], lw=0.7, alpha=.7)
    ax.scatter(x, y, s=28, color=th["blue"], zorder=5)
    ax.plot(x, fit, color=th["red"], lw=2, label=f"ŷ = {b[1]:.1f} + {b[0]:.1f}x")
    ax.set_title("OLS — the line minimizing the squared residuals")
    ax.legend(fontsize=8)


def pca_axes(ax, th):
    rng = np.random.default_rng(23)
    base = rng.normal(0, 1, (500, 2))
    X = base @ np.array([[1.6, 0.0], [1.1, 0.6]])
    X = X - X.mean(0)
    ax.scatter(X[:, 0], X[:, 1], s=10, color=th["blue"], alpha=.45)
    cov = np.cov(X.T)
    vals, vecs = np.linalg.eigh(cov)
    order = np.argsort(vals)[::-1]
    for i, c in zip(order, (th["red"], th["green"])):
        v = vecs[:, i] * np.sqrt(vals[i]) * 2.2
        ax.annotate("", xy=v, xytext=(0, 0), arrowprops=dict(color=c, width=2.5, headwidth=10))
    ax.set_aspect("equal")
    ax.set_title("PCA — principal axes point along the directions of most variance")


def lognormal_terminal(ax, th):
    rng = np.random.default_rng(24)
    mu, sig, T = 0.06, 0.5, 1.0
    ST = 100 * np.exp((mu - sig ** 2 / 2) * T + sig * np.sqrt(T) * rng.normal(0, 1, 40000))
    ax.hist(ST, bins=120, color=th["blue"], alpha=.75)
    ax.axvline(np.median(ST), color=th["green"], lw=2, label=f"median {np.median(ST):.0f}")
    ax.axvline(ST.mean(), color=th["red"], lw=2, label=f"mean {ST.mean():.0f}")
    ax.set_xlim(0, 400)
    ax.set_title("GBM terminal price is lognormal — right-skewed (mean > median)")
    ax.set_xlabel("price at horizon")
    ax.legend(fontsize=8)


def beta_binomial(ax, th):
    from math import lgamma
    p = np.linspace(1e-4, 1 - 1e-4, 500)
    def beta_pdf(a, b):
        log_pdf = (a - 1) * np.log(p) + (b - 1) * np.log(1 - p) - (lgamma(a) + lgamma(b) - lgamma(a + b))
        return np.exp(log_pdf)
    stages = [(2, 2, "prior"), (2 + 6, 2 + 4, "after 10"), (2 + 28, 2 + 22, "after 50"), (2 + 116, 2 + 84, "after 200")]
    for (a, b, lab), c in zip(stages, [th["muted"], th["gold"], th["blue"], th["green"]]):
        ax.plot(p, beta_pdf(a, b), color=c, lw=2, label=lab)
    ax.axvline(0.58, color=th["red"], ls="--", lw=1.2, label="true win rate")
    ax.set_title("Bayesian updating — the win-rate posterior tightens with more trades")
    ax.set_xlabel("win probability")
    ax.legend(fontsize=7)


def _rect(x, y, w, h, color, alpha):
    import matplotlib.patches as mp
    return mp.Rectangle((x, y), w, h, color=color, alpha=alpha)


FIGS = {
    "normal_vs_fat": normal_vs_fat,
    "lln_convergence": lln_convergence,
    "clt_sampling": clt_sampling,
    "compounding_drag": compounding_drag,
    "kelly_curve": kelly_curve,
    "risk_of_ruin": risk_of_ruin,
    "permutation_illustration": permutation_illustration,
    "walk_forward_split": walk_forward_split,
    "overfitting_curve": overfitting_curve,
    "gbm_paths": gbm_paths,
    "regime_shift": regime_shift,
    "multiple_testing": multiple_testing,
    "confidence_interval": confidence_interval,
    "acf_plot": acf_plot,
    "stationary_vs_randomwalk": stationary_vs_randomwalk,
    "vol_clustering": vol_clustering,
    "efficient_frontier": efficient_frontier,
    "capm_sml": capm_sml,
    "pca_variance": pca_variance,
    "brownian_motion": brownian_motion,
    "option_payoff": option_payoff,
    "option_greeks": option_greeks,
    "vol_smile": vol_smile,
    "orderbook": orderbook,
    "price_impact": price_impact,
    "garch_cond_vol": garch_cond_vol,
    "kalman_hedge": kalman_hedge,
    "hmm_regimes": hmm_regimes,
    "var_cvar": var_cvar,
    "bayes_updating": bayes_updating,
    "correlation_scatter": correlation_scatter,
    "hypothesis_test": hypothesis_test,
    "ols_fit": ols_fit,
    "pca_axes": pca_axes,
    "lognormal_terminal": lognormal_terminal,
    "beta_binomial": beta_binomial,
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    plt = viz._plt()
    for name, draw in FIGS.items():
        for theme in THEMES:
            th = viz.THEMES[theme]
            fig, ax = plt.subplots(figsize=(7.2, 3.9))
            draw(ax, th)
            viz._style(fig, ax, th)
            viz.save_png(fig, OUT / f"{name}.{theme}.png", dpi=DPI)
        print(f"  {name}", flush=True)
    print(f"[tutorial figs] wrote {len(FIGS) * 2} PNGs to {OUT}")


if __name__ == "__main__":
    main()
