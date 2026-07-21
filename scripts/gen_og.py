"""Compose the LinkedIn/OpenGraph share card (1200x630) for the docs site.

Brand card: logo + wordmark, the "Prove the edge." headline, the pipeline line, and
two real charts (Monte-Carlo fan + monthly heatmap) on the right. Theme-aware.

Run (matplotlib comes from edgekit's venv):
    ~/Documents/edgekit/.venv/bin/python scripts/gen_og.py                       # dark -> app/opengraph-image.png
    ~/Documents/edgekit/.venv/bin/python scripts/gen_og.py light ~/Downloads/edgekit-og-light.png
"""
from __future__ import annotations

import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Ellipse, FancyBboxPatch, Rectangle  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CHARTS = ROOT / "public" / "charts"

THEME = sys.argv[1] if len(sys.argv) > 1 else "dark"
OUT = Path(sys.argv[2]).expanduser() if len(sys.argv) > 2 else ROOT / "app" / "opengraph-image.png"

PALETTES = {
    "dark": dict(BG="#0a0d12", FG="#e6edf3", SUB="#c2cdd8", MUT="#8b98a5",
                 GREEN="#2ec26a", BORDER="#222b35", CARD="#0d1117", GLOW=0.10),
    "light": dict(BG="#ffffff", FG="#0d1620", SUB="#33404d", MUT="#5c6874",
                  GREEN="#0a7c3e", BORDER="#d3d9e2", CARD="#ffffff", GLOW=0.07),
}
P = PALETTES[THEME]
BG, FG, SUB, MUT = P["BG"], P["FG"], P["SUB"], P["MUT"]
GREEN, BORDER, CARD = P["GREEN"], P["BORDER"], P["CARD"]

fig = plt.figure(figsize=(12, 6.3), dpi=100)
fig.patch.set_facecolor(BG)

# ---- background + soft green glow (top-right) ----
bg = fig.add_axes([0, 0, 1, 1])
bg.axis("off")
bg.set_xlim(0, 1)
bg.set_ylim(0, 1)
bg.add_patch(Rectangle((0, 0), 1, 1, color=BG, zorder=0))
bg.add_patch(Ellipse((0.98, 1.05), 0.75, 0.9, color=GREEN, alpha=P["GLOW"], lw=0, zorder=1))
bg.add_patch(Ellipse((0.62, 0.30), 0.5, 0.6, color=GREEN, alpha=P["GLOW"] * 0.5, lw=0, zorder=1))

# ---- logo mark (equal-aspect inset) ----
lax = fig.add_axes([0.05, 0.80, 0.065, 0.065 * (1200 / 630)])
lax.axis("off")
lax.set_aspect("equal")
lax.set_xlim(0, 32)
lax.set_ylim(0, 32)
lax.add_patch(FancyBboxPatch((2, 2), 28, 28, boxstyle="round,pad=0,rounding_size=7",
                             fc=CARD, ec=GREEN, lw=2.5))
lax.plot([6, 13, 18, 26], [10, 17, 14, 24], color=GREEN, lw=3.4,
         solid_capstyle="round", solid_joinstyle="round")
lax.plot(26, 24, marker="o", color=GREEN, ms=7)

# ---- text ----
fig.text(0.147, 0.852, "edgekit", color=FG, fontsize=31, fontweight="bold", va="center")
fig.text(0.325, 0.850, "v0.1.0", color=MUT, fontsize=15, va="center")
fig.text(0.05, 0.605, "Prove the edge.", color=FG, fontsize=54, fontweight="bold", va="center")
fig.text(0.052, 0.485, "A systematic-trading research toolkit.", color=SUB, fontsize=20, va="center")
bg.add_patch(Rectangle((0.052, 0.398), 0.024, 0.011, color=GREEN))
fig.text(0.085, 0.404, "load  ·  backtest  ·  prove  ·  size  ·  ship",
         color=GREEN, fontsize=15.5, fontweight="bold", va="center")
fig.text(0.05, 0.14, "assume every edge is fake until proven otherwise",
         color=MUT, fontsize=13.5, style="italic", va="center")

# ---- charts (right column), sized to each image's aspect so nothing distorts ----
def chart(name: str, rect):
    a = fig.add_axes(rect)
    a.imshow(plt.imread(str(CHARTS / name)), aspect="auto")
    a.set_xticks([])
    a.set_yticks([])
    for s in a.spines.values():
        s.set_color(BORDER)
        s.set_linewidth(1.2)

chart(f"mc_fan.{THEME}.png", [0.545, 0.505, 0.405, 0.405 / (2173 / 740) * (1200 / 630)])
chart(f"monthly_heatmap.{THEME}.png", [0.545, 0.20, 0.405, 0.405 / (2173 / 699) * (1200 / 630)])

fig.text(0.545, 0.115, "reports & Monte-Carlo, both themes", color=MUT, fontsize=12.5, va="center")

OUT.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(OUT, dpi=100, facecolor=BG)
print(f"wrote {OUT} ({THEME}, 1200x630)")
