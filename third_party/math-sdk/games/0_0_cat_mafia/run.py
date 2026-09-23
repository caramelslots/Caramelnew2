"""Deprecated entry point — use run_m5.py or run_m6.py instead."""

import sys

if __name__ == "__main__":
    print(
        "run.py is deprecated. Use an explicit pipeline entry point:\n"
        "  M5 (100k/mode):  $PY run_m5.py\n"
        "  M6 (1M/mode):    $PY run_m6.py\n"
        "See MATH_COMMANDS.md §1 / §2.",
        file=sys.stderr,
    )
    sys.exit(1)
