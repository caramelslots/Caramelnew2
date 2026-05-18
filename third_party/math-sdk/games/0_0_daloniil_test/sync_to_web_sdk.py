"""Sync published Cash Stacks books → web-sdk storybook .ts modules.

Reads:
  library/books/books_<mode>.json     (output of run_storybook.py)

Writes to apps/daloniil_test/src/stories/data/:
  base_books.ts                         (from books_base.json)
  bonus_books.ts                        (from books_bonus_normal.json — для совместимости со stories)
  books_bonus_boost.ts                  (новый)
  books_special_spins.ts                (новый)
  books_bonus_super.ts                  (новый)

Каждый файл — `export default <array>;`, поэтому web-sdk не требует
`resolveJsonModule: true` в tsconfig.

Запуск (из games/0_0_daloniil_test):
  python3 sync_to_web_sdk.py
"""

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
BOOKS_DIR = os.path.join(HERE, "library", "books")

# Относительный путь от games/0_0_daloniil_test до web-sdk apps/daloniil_test
WEB_DATA_DIR = os.path.abspath(
    os.path.join(HERE, "..", "..", "..", "web-sdk", "apps", "daloniil_test",
                 "src", "stories", "data")
)

# (json filename, ts filename, comment)
MAPPINGS = [
    ("books_base.json",          "base_books.ts",           "MODE_BASE base game books"),
    ("books_bonus_normal.json",  "bonus_books.ts",          "MODE_BONUS_NORMAL freegame books (buy)"),
    ("books_bonus_boost.json",   "books_bonus_boost.ts",    "MODE_BONUS_BOOST basegame books (2x bet)"),
    ("books_special_spins.json", "books_special_spins.ts",  "MODE_SPECIAL_SPINS forced-FS books (30x bet)"),
    ("books_bonus_super.json",   "books_bonus_super.ts",    "MODE_BONUS_SUPER freegame books (×4 mystery start)"),
]

HEADER_TEMPLATE = """\
// AUTO-GENERATED — do not edit by hand.
// Source: third_party/math-sdk/games/0_0_daloniil_test/library/books/{src}
// Regenerate via:
//   cd third_party/math-sdk/games/0_0_daloniil_test
//   python3 run_storybook.py && python3 sync_to_web_sdk.py
// {comment}
// Count: {count} books

"""


def main() -> None:
    if not os.path.isdir(WEB_DATA_DIR):
        raise SystemExit(f"Web-sdk data dir not found: {WEB_DATA_DIR}")

    for src_name, dst_name, comment in MAPPINGS:
        src_path = os.path.join(BOOKS_DIR, src_name)
        if not os.path.exists(src_path):
            print(f"  SKIP {src_name} (not found — run run_storybook.py first)")
            continue

        with open(src_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        header = HEADER_TEMPLATE.format(src=src_name, comment=comment, count=len(data))
        body = "export default " + json.dumps(data, separators=(", ", ": ")) + ";\n"

        dst_path = os.path.join(WEB_DATA_DIR, dst_name)
        with open(dst_path, "w", encoding="utf-8") as f:
            f.write(header + body)
        size_kb = os.path.getsize(dst_path) / 1024
        print(f"  OK   {dst_name:<28s} <- {src_name:<28s} ({len(data)} books, {size_kb:.1f} KB)")

    print("\nDone. Restart `pnpm storybook` to pick up new books.")


if __name__ == "__main__":
    main()
