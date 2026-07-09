"""Pretty-print statistics_summary.json — measured HRs and RTPs per mode/criteria.

Usage:
    cd third_party/math-sdk/games/0_0_daloniil_test
    python3 tools/show_stats.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATS = ROOT / "library" / "statistics_summary.json"


# Targets from M4_REELSTRIP_TUNING.md
TARGETS_BASE = {
    "{'kind': '5', 'symbol': 'W'}": ("5×W", 10000),
    "{'kind': '5', 'symbol': 'H1'}": ("5×H1", 1000),
    "{'kind': '5', 'symbol': 'H2'}": ("5×H2", 1500),
    "{'kind': '5', 'symbol': 'H3'}": ("5×H3", 2000),
    "{'kind': '5', 'symbol': 'H4'}": ("5×H4", 2500),
    "{'kind': '5', 'symbol': 'L1'}": ("5×L1", 80),
    "{'kind': '5', 'symbol': 'L2'}": ("5×L2", 80),
    "{'kind': '5', 'symbol': 'L3'}": ("5×L3", 80),
    "{'kind': '5', 'symbol': 'L4'}": ("5×L4", 80),
}


def main():
    data = json.loads(STATS.read_text())

    print("=" * 90)
    print("MODE-LEVEL RTP & SIM SUMMARY (from sim batches — pre-optimizer)")
    print("=" * 90)
    sim_count = data.get("sim_count_summary", {})
    mode_fence = data.get("mode_fence_info", {})
    for mode in ["base", "bonus_boost", "special_spins", "bonus_normal", "bonus_super"]:
        crit_rtps = mode_fence.get(mode, {})
        total_rtp = sum(c.get("rtp", 0) for c in crit_rtps.values())
        print(f"\n  [{mode}] sim_count = {sim_count.get(mode, '?')}, total_RTP = {total_rtp:.4f}")
        for crit, info in crit_rtps.items():
            rtp = info.get("rtp", 0)
            hr = info.get("hr", "?")
            av = info.get("av_win", 0)
            print(f"     {crit:<15} | rtp = {rtp:8.4f} | hr = {hr:>8} | av_win = {av:8.3f}")

    print()
    print("=" * 90)
    print("BASE MODE: 5-of-a-kind HRs vs targets")
    print("=" * 90)
    hr = data.get("hr_summary", {}).get("base", {})
    for key, (label, target) in TARGETS_BASE.items():
        measured = hr.get(key, None)
        if measured is None:
            print(f"  {label:<6}: not in stats")
            continue
        ratio = measured / target if target else 0
        status = ""
        if ratio > 3:
            status = "TOO RARE"
        elif ratio < 0.33:
            status = "TOO COMMON"
        elif 0.5 <= ratio <= 2:
            status = "GOOD"
        else:
            status = "OK (close)"
        print(f"  {label:<6}: measured 1 in {int(measured):>10,} | target 1 in {target:>6,} | ratio {ratio:.2f} | {status}")

    print()
    print("=" * 90)
    print("CUSTOM HRs (scatter B = FS trigger)")
    print("=" * 90)
    custom = data.get("custom_hr_summary", {})
    for mode in ["base", "bonus_boost", "special_spins"]:
        m = custom.get(mode, {})
        scatter_hr = m.get("{'symbol': 'scatter'}", "?")
        print(f"  [{mode}] scatter HR = 1 in {scatter_hr}")
        # 5xW custom
        w_hr = m.get("{'kind': 5, 'symbol': 'W'}", "?")
        print(f"  [{mode}] 5×W custom HR = 1 in {w_hr}")

    print()
    print("=" * 90)
    print("ALL HRs for BASE mode (top 30)")
    print("=" * 90)
    base = data.get("hr_summary", {}).get("base", {})
    sorted_b = sorted(base.items(), key=lambda x: (-x[1] if isinstance(x[1], (int, float)) else 0))
    for k, v in sorted_b[:30]:
        print(f"  {k:<50} {v}")


if __name__ == "__main__":
    main()
