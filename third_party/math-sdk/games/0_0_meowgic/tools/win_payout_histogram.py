"""Win-size histogram for Meowgic (base / boost / buy normal / buy super).

Reads weighted LUTs and buckets payouts into ~N bands. Writes a Markdown
report with tables: %% of all spins, %% of wins, %% of RTP per band.

Payouts are bet-multiples (LUT cents / 100). "1 cent" = 0.01× bet.

Usage:
  cd third_party/math-sdk/games/0_0_meowgic
  export PYTHONPATH=../..:.
  $PY tools/win_payout_histogram.py
  $PY tools/win_payout_histogram.py --n-bands 20
  $PY tools/win_payout_histogram.py --md-out library/win_payout_histogram.md
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LUT_DIR = ROOT / "library" / "publish_files"
DEFAULT_MD_OUT = ROOT / "library" / "win_payout_histogram.md"

# No duel — only the four modes the player asked for.
MODES = ("base", "bonus_boost", "bonus_normal", "bonus_super")
MODE_COST = {
    "base": 1.0,
    "bonus_boost": 2.0,
    "bonus_normal": 100.0,
    "bonus_super": 200.0,
}

# Hand-tuned edges in bet-multiples (×). Dense at the low end
# (0.1× = "10 cents" if bet=$1), coarser toward max.
PRESET_EDGES_BASE = [
    0.0,
    0.1,
    0.2,
    0.3,
    0.5,
    0.75,
    1.0,
    1.5,
    2.0,
    3.0,
    5.0,
    7.5,
    10.0,
    15.0,
    25.0,
    40.0,
    60.0,
    100.0,
    150.0,
    250.0,
    500.0,
    1000.0,
    2500.0,
    1e18,
]
PRESET_EDGES_BUY = [
    0.0,
    0.1,
    1.0,
    5.0,
    10.0,
    20.0,
    40.0,
    60.0,
    80.0,
    100.0,
    150.0,
    200.0,
    300.0,
    500.0,
    750.0,
    1000.0,
    1500.0,
    2500.0,
    5000.0,
    10000.0,
    25000.0,
    1e18,
]


def _load_lut(path: Path) -> list[tuple[int, float]]:
    """Return list of (weight, payout_x) where payout_x is bet multiples."""
    rows: list[tuple[int, float]] = []
    with path.open(encoding="utf-8") as f:
        for line in csv.reader(f):
            if not line:
                continue
            w = int(float(line[1]))
            pay = float(line[2]) / 100.0
            rows.append((w, pay))
    return rows


def _fmt_x(x: float) -> str:
    if x <= 0:
        return "0"
    if x >= 1000:
        if abs(x - round(x)) < 1e-9:
            return f"{int(round(x))}"
        return f"{x:.0f}"
    if x >= 10:
        return f"{x:.0f}" if abs(x - round(x)) < 1e-9 else f"{x:.1f}"
    if abs(x - round(x)) < 1e-9:
        return f"{int(round(x))}"
    if abs(x * 10 - round(x * 10)) < 1e-9:
        return f"{x:.1f}"
    return f"{x:.2f}"


def _band_label(lo: float, hi: float, is_last: bool) -> str:
    if lo <= 0 and hi <= 0:
        return "0 lose"
    if lo <= 0:
        # First positive band starts after 0.
        lo = 0.0
    if is_last or hi >= 1e17:
        return f"{_fmt_x(lo)}+ max"
    return f"{_fmt_x(lo)}–{_fmt_x(hi)}"


def _cents_label(lo: float, hi: float, is_last: bool) -> str:
    """Same band, labeled in LUT cents (1 cent = 0.01×)."""
    if lo <= 0 and (hi <= 0 or hi < 1e-12):
        return "0¢"
    lo_c = 0 if lo <= 0 else int(round(lo * 100))
    if is_last or hi >= 1e17:
        return f"{lo_c}¢+"
    hi_c = int(round(hi * 100))
    return f"{lo_c}–{hi_c}¢"


def _log_edges(x_min: float, x_max: float, n_bands: int) -> list[float]:
    """n_bands positive intervals between x_min and x_max (log-spaced) + 0."""
    x_min = max(x_min, 1e-4)
    x_max = max(x_max, x_min * 1.01)
    # n_bands edges for positive wins → n_bands intervals need n_bands+1 points
    pts = [0.0]
    log_lo, log_hi = math.log10(x_min), math.log10(x_max)
    for i in range(n_bands + 1):
        pts.append(10 ** (log_lo + (log_hi - log_lo) * i / n_bands))
    # Cap last edge as infinity sentinel for open max bin
    pts[-1] = 1e18
    # Deduplicate near-equal edges
    clean = [pts[0]]
    for p in pts[1:]:
        if p > clean[-1] * 1.0001 + 1e-12:
            clean.append(p)
    return clean


def _preset_edges(mode: str) -> list[float]:
    if mode in ("bonus_normal", "bonus_super"):
        return list(PRESET_EDGES_BUY)
    return list(PRESET_EDGES_BASE)


def _band_index(x: float, edges: list[float]) -> int:
    """edges[0]=0 (lose). Positive wins go to bands 1..n-1: [edges[i], edges[i+1])."""
    if x <= 0:
        return 0
    # Tiny wins below first positive edge fold into band 1.
    for i in range(1, len(edges) - 1):
        if x < edges[i + 1]:
            return i
    return len(edges) - 2


def analyze(
    rows: list[tuple[int, float]],
    edges: list[float],
    cost: float,
) -> dict:
    tw = sum(w for w, _ in rows) or 1.0
    win_w = sum(w for w, x in rows if x > 0) or 1.0
    lose_w = sum(w for w, x in rows if x <= 0)
    ev = sum(w * x for w, x in rows) / tw
    rtp = ev / cost if cost else 0.0

    n = len(edges) - 1
    weight = [0.0] * n
    rtp_mass = [0.0] * n  # sum(w*x) per band
    for w, x in rows:
        i = _band_index(x, edges)
        weight[i] += w
        rtp_mass[i] += w * x

    bands = []
    for i in range(n):
        lo, hi = edges[i], edges[i + 1]
        is_last = i == n - 1
        ww = weight[i]
        # Label positive bands with their lower edge (edges[i]), not 0.
        label_lo = lo if i > 0 else 0.0
        bands.append(
            {
                "label": _band_label(label_lo, hi, is_last) if i > 0 else "0 lose",
                "cents": _cents_label(label_lo, hi, is_last) if i > 0 else "0¢",
                "lo": lo,
                "hi": hi if hi < 1e17 else None,
                "pct_all": 100.0 * ww / tw,
                "pct_wins": None if i == 0 else 100.0 * ww / win_w,
                "pct_rtp": (100.0 * rtp_mass[i] / (ev * tw)) if ev > 0 else 0.0,
                "weight": ww,
            }
        )

    wins = [x for _, x in rows if x > 0]
    return {
        "n_rows": len(rows),
        "cost": cost,
        "p_lose": lose_w / tw,
        "p_win": win_w / tw,
        "e_all": ev,
        "rtp": rtp,
        "min_win": min(wins) if wins else 0.0,
        "max_win": max(wins) if wins else 0.0,
        "bands": bands,
    }


def _md_table(headers: list[str], rows: list[list[str]]) -> str:
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    for r in rows:
        lines.append("| " + " | ".join(r) + " |")
    return "\n".join(lines)


def _pct(v: float | None, digits: int = 3) -> str:
    if v is None:
        return "—"
    return f"{v:.{digits}f}%"


def _render_markdown(
    reports: dict[str, dict],
    *,
    lut_dir: Path,
    n_bands: int,
) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    band_note = (
        f"log-spaced `{n_bands}` positive bins"
        if n_bands > 0
        else "hand-tuned preset (~20–22 bins; denser at low end)"
    )
    lines: list[str] = [
        "# Meowgic — win payout histogram",
        "",
        f"Generated: **{now}**  ",
        f"Source LUT dir: `{lut_dir}`  ",
        f"Bands: {band_note}  ",
        "",
        "Payouts are bet-multiples (×). **1¢** = `0.01×` bet (LUT units).  ",
        "Modes: `base`, `bonus_boost`, `bonus_normal`, `bonus_super` (no duel).",
        "",
        "## Summary",
        "",
    ]

    summary_rows = []
    for mode, rep in reports.items():
        summary_rows.append(
            [
                f"`{mode}`",
                f"{rep['cost']:g}×",
                _pct(100 * rep["p_lose"], 2),
                _pct(100 * rep["p_win"], 2),
                f"{rep['e_all']:.3f}×",
                _pct(100 * rep["rtp"], 2),
                f"{_fmt_x(rep['min_win'])}–{_fmt_x(rep['max_win'])}×",
            ]
        )
    lines.append(
        _md_table(
            ["Mode", "Cost", "P(lose)", "P(win)", "E[pay]", "RTP", "Win range"],
            summary_rows,
        )
    )
    lines += [
        "",
        "### Columns",
        "",
        "- **% all** — share of all weighted spins (incl. loses)",
        "- **% wins** — share among winning outcomes only (`payout > 0`)",
        "- **% RTP** — share of total expected payout carried by this band",
        "",
    ]

    for mode, rep in reports.items():
        lines += [
            f"## `{mode}` (cost {rep['cost']:g}×)",
            "",
            f"- P(lose) = **{_pct(100 * rep['p_lose'], 2)}** · "
            f"P(win) = **{_pct(100 * rep['p_win'], 2)}**",
            f"- E[pay] = **{rep['e_all']:.3f}×** · "
            f"RTP = **{_pct(100 * rep['rtp'], 2)}**",
            f"- Win range = **{_fmt_x(rep['min_win'])}–{_fmt_x(rep['max_win'])}×** · "
            f"LUT rows = {rep['n_rows']:,}",
            "",
        ]
        band_rows = []
        for b in rep["bands"]:
            band_rows.append(
                [
                    b["label"],
                    b["cents"],
                    _pct(b["pct_all"]),
                    _pct(b["pct_wins"]),
                    _pct(b["pct_rtp"]),
                ]
            )
        lines.append(
            _md_table(
                ["Band (×)", "Cents", "% all", "% wins", "% RTP"],
                band_rows,
            )
        )
        lines.append("")

    lines.append(
        "---\n\n"
        "Regenerate:\n\n"
        "```bash\n"
        "cd third_party/math-sdk/games/0_0_meowgic\n"
        "export PYTHONPATH=../..:.\n"
        "$PY tools/win_payout_histogram.py\n"
        "```\n"
    )
    return "\n".join(lines)


def _resolve_lut(lut_dir: Path, mode: str) -> Path | None:
    for name in (f"lookUpTable_{mode}_0.csv", f"lookUpTable_{mode}.csv"):
        p = lut_dir / name
        if p.exists():
            return p
    return None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--mode", choices=[*MODES, "all"], default="all")
    ap.add_argument("--lut-dir", type=Path, default=DEFAULT_LUT_DIR)
    ap.add_argument(
        "--n-bands",
        type=int,
        default=0,
        help="If >0, use log-spaced bands (this many positive win bins). "
        "0 = hand-tuned preset (~20–22 bands).",
    )
    ap.add_argument(
        "--md-out",
        type=Path,
        default=DEFAULT_MD_OUT,
        help=f"Markdown report path (default: {DEFAULT_MD_OUT})",
    )
    ap.add_argument(
        "--no-md",
        action="store_true",
        help="Skip writing the Markdown report.",
    )
    ap.add_argument("--json-out", type=Path, default=None)
    ap.add_argument(
        "--print",
        dest="do_print",
        action="store_true",
        help="Also dump tables to stdout (Markdown is the default deliverable).",
    )
    args = ap.parse_args()

    modes = MODES if args.mode == "all" else (args.mode,)
    all_reports: dict = {}

    for mode in modes:
        lut = _resolve_lut(args.lut_dir, mode)
        if lut is None:
            print(f"MISSING lookUpTable_{mode}_0.csv in {args.lut_dir}")
            continue
        rows = _load_lut(lut)
        if args.n_bands and args.n_bands > 0:
            wins = [x for _, x in rows if x > 0]
            if not wins:
                print(f"{mode}: no wins")
                continue
            edges = _log_edges(min(wins), max(wins), args.n_bands)
        else:
            edges = _preset_edges(mode)
        report = analyze(rows, edges, MODE_COST[mode])
        all_reports[mode] = report

    if not all_reports:
        raise SystemExit("No modes analyzed.")

    if not args.no_md:
        md = _render_markdown(
            all_reports,
            lut_dir=args.lut_dir,
            n_bands=args.n_bands,
        )
        args.md_out.parent.mkdir(parents=True, exist_ok=True)
        args.md_out.write_text(md, encoding="utf-8")
        print(f"Wrote {args.md_out}")

    if args.do_print:
        print()
        print(
            _render_markdown(
                all_reports,
                lut_dir=args.lut_dir,
                n_bands=args.n_bands,
            )
        )

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(all_reports, indent=2), encoding="utf-8")
        print(f"Wrote {args.json_out}")


if __name__ == "__main__":
    main()
