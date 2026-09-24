"""Generate TARGET vs NOW markdown for duel SMOOTH · VH + Intrigue.

Reads LUT weights + books from --lut-dir (default: library/publish_files)
and writes a report like the canvas tables.

Usage:
  cd third_party/math-sdk/games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  $PY tools/report_duel_targets_md.py
  $PY tools/report_duel_targets_md.py --lut-dir library/publish_files \\
      --out docs/duel_targets_now.md
  $PY tools/report_duel_targets_md.py --lut-dir library/publish_files_backup_pre_resample
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from match_duel_competition import (
    BANK_TARGETS,
    COST,
    LEAD_THEN_LOSE_OF_LOSES,
    SHARE_TARGET,
    _load_lut,
    _load_meta,
    _report,
    _rtp,
)
from match_duel_win_body import _band_for, _mult

ROOT = Path(__file__).resolve().parents[1]
SMOOTH_PATH = Path(__file__).resolve().parent / "duel_smooth_vh_targets.json"
MODES = ("bonus_duel_cat", "bonus_duel_dog")


def _smooth_targets() -> dict:
    return json.loads(SMOOTH_PATH.read_text(encoding="utf-8"))


def _smooth_now(rows: list[list], bands: list[dict]) -> list[tuple[str, float, float]]:
    ww = sum(w for _, w, p in rows if p > 0) or 1.0
    out: list[tuple[str, float, float]] = []
    for b in bands:
        lo, hi = float(b["lo"]), float(b["hi"])
        m = 0.0
        for _, w, pay in rows:
            if pay <= 0 or w <= 0:
                continue
            x = _mult(pay)
            if hi >= 25000:
                ok = x >= lo
            else:
                ok = lo <= x < hi
            if ok:
                m += w
        out.append((b["label"], 100.0 * float(b["share"]), 100.0 * m / ww))
    return out


def _flag(delta_pp: float, soft: float = 2.0, hard: float = 5.0) -> str:
    ad = abs(delta_pp)
    if ad <= soft:
        return "ok"
    if ad <= hard:
        return "~"
    return "bad"


def _md_table(headers: list[str], rows: list[list[str]]) -> str:
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    for r in rows:
        lines.append("| " + " | ".join(r) + " |")
    return "\n".join(lines)


def build_report(lut_dir: Path) -> str:
    smooth = _smooth_targets()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines: list[str] = [
        "# Duel TARGET vs NOW — SMOOTH · VH + Intrigue",
        "",
        f"- **LUT dir:** `{lut_dir}`",
        f"- **Generated:** {now}",
        f"- **Cost:** {COST:g} (buy duel)",
        "",
    ]

    summary_rows: list[list[str]] = []
    mode_blocks: list[str] = []

    for mode in MODES:
        lut_path = lut_dir / f"lookUpTable_{mode}_0.csv"
        if not lut_path.exists():
            mode_blocks.append(f"## {mode}\n\n_missing LUT_\n")
            continue
        rows = _load_lut(lut_path)
        meta = _load_meta(lut_dir, mode)
        rep = _report(rows, meta, mode)
        rtp = _rtp(rows)
        tw = sum(w for _, w, _ in rows) or 1
        ww = sum(w for _, w, p in rows if p > 0)
        p_win = ww / tw
        mean_win = (
            sum(w * p for _, w, p in rows if p > 0) / ww / 100.0 if ww else 0.0
        )
        tgt = smooth[mode]
        e_win_t = float(tgt.get("e_win") or 0)
        p_win_t = float(tgt.get("p_win") or 0)
        rtp_t = (p_win_t * e_win_t / COST) if e_win_t else 0.9601

        summary_rows.append(
            [
                mode.replace("bonus_duel_", ""),
                f"{rtp_t:.4f}",
                f"{rtp:.4f}",
                f"{100 * p_win_t:.1f}%",
                f"{100 * p_win:.1f}%",
                f"{e_win_t:.0f}×",
                f"{mean_win:.1f}×",
            ]
        )

        bands = _smooth_now(rows, tgt["bands"])
        smooth_rows = [
            [
                lab,
                f"{t:.1f}%",
                f"{n:.1f}%",
                f"{n - t:+.1f}pp",
                _flag(n - t),
            ]
            for lab, t, n in bands
        ]

        bt = BANK_TARGETS[mode]
        win_t_p, win_t_o = bt["win"]
        lose_t_p, lose_t_o = bt["lose"]
        win_n_p, win_n_o = rep["win_banks"]
        lose_n_p, lose_n_o = rep["lose_banks"]

        intrigue_rows = [
            [
                "wins",
                "Close",
                f"{100 * SHARE_TARGET['CLOSE']:.0f}%",
                f"{rep['win_bands_pct']['CLOSE']:.1f}%",
            ],
            [
                "wins",
                "Medium",
                f"{100 * SHARE_TARGET['MEDIUM']:.0f}%",
                f"{rep['win_bands_pct']['MEDIUM']:.1f}%",
            ],
            [
                "wins",
                "Blowout",
                f"{100 * SHARE_TARGET['BLOWOUT']:.0f}%",
                f"{rep['win_bands_pct']['BLOWOUT']:.1f}%",
            ],
            [
                "loses",
                "Close",
                f"{100 * SHARE_TARGET['CLOSE']:.0f}%",
                f"{rep['lose_bands_pct']['CLOSE']:.1f}%",
            ],
            [
                "loses",
                "Medium",
                f"{100 * SHARE_TARGET['MEDIUM']:.0f}%",
                f"{rep['lose_bands_pct']['MEDIUM']:.1f}%",
            ],
            [
                "loses",
                "Blowout",
                f"{100 * SHARE_TARGET['BLOWOUT']:.0f}%",
                f"{rep['lose_bands_pct']['BLOWOUT']:.1f}%",
            ],
        ]

        bank_rows = [
            [
                "wins",
                f"{win_t_p:.0f}×",
                f"{win_n_p:.1f}×",
                f"{win_t_o:.0f}×",
                f"{win_n_o:.1f}×",
            ],
            [
                "loses",
                f"{lose_t_p:.0f}×",
                f"{lose_n_p:.1f}×",
                f"{lose_t_o:.0f}×",
                f"{lose_n_o:.1f}×",
            ],
        ]

        mode_blocks.append(
            "\n".join(
                [
                    f"## {mode}",
                    "",
                    f"- RTP: **{rtp:.4f}** (target ~{rtp_t:.4f})",
                    f"- P(win): **{100 * p_win:.2f}%** (target {100 * p_win_t:.1f}%)",
                    f"- E[pay|win]: **{mean_win:.1f}×** (target {e_win_t:.0f}×)",
                    f"- lead_then_lose of loses: **{rep['lead_then_lose_of_loses_pct']:.1f}%** "
                    f"(target {100 * LEAD_THEN_LOSE_OF_LOSES:.0f}%)",
                    "",
                    "### SMOOTH · VH (among wins)",
                    "",
                    _md_table(
                        ["Band", "TARGET", "NOW", "Δ", ""],
                        smooth_rows,
                    ),
                    "",
                    "### Intrigue — Close / Medium / Blowout",
                    "",
                    _md_table(
                        ["Among", "Band", "TARGET", "NOW"],
                        intrigue_rows,
                    ),
                    "",
                    "### Banks (player | opp) — soft",
                    "",
                    _md_table(
                        ["Among", "Player T", "Player NOW", "Opp T", "Opp NOW"],
                        bank_rows,
                    ),
                    "",
                ]
            )
        )

    lines.append("## Summary")
    lines.append("")
    lines.append(
        _md_table(
            [
                "Mode",
                "RTP T",
                "RTP NOW",
                "P(win) T",
                "P(win) NOW",
                "E[win] T",
                "E[win] NOW",
            ],
            summary_rows,
        )
    )
    lines.append("")
    lines.extend(mode_blocks)
    lines.append("---")
    lines.append("")
    lines.append(
        "_Targets: `tools/duel_smooth_vh_targets.json` + "
        "`tools/duel_competition_targets.json`._"
    )
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--lut-dir",
        type=Path,
        default=ROOT / "library" / "publish_files",
    )
    ap.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Output .md path (default: library/duel_targets_report.md)",
    )
    args = ap.parse_args()
    out = args.out or (ROOT / "library" / "duel_targets_report.md")
    print(f"loading from {args.lut_dir} ...", flush=True)
    text = build_report(args.lut_dir)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(f"wrote {out}", flush=True)


if __name__ == "__main__":
    main()
