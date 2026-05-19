#!/usr/bin/env python3
"""
Convert designer markdown docs (SYMBOLS_PAYTABLE.md, etc.) to standalone HTML.

Usage:
  python3 md_to_html.py
  python3 md_to_html.py SYMBOLS_PAYTABLE.md
  python3 md_to_html.py SYMBOLS_PAYTABLE.md -o SYMBOLS_PAYTABLE.html
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path

INLINE_RE = re.compile(
    r"(\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))"
)


def inline_markup(text: str) -> str:
    result: list[str] = []
    pos = 0
    for match in INLINE_RE.finditer(text):
        if match.start() > pos:
            result.append(html.escape(text[pos : match.start()]))
        if match.group(2) is not None:
            result.append(f"<strong>{html.escape(match.group(2))}</strong>")
        elif match.group(3) is not None:
            result.append(f"<code>{html.escape(match.group(3))}</code>")
        else:
            label = html.escape(match.group(4))
            href = html.escape(match.group(5), quote=True)
            result.append(f'<a href="{href}">{label}</a>')
        pos = match.end()
    if pos < len(text):
        result.append(html.escape(text[pos:]))
    return "".join(result) if result else html.escape(text)


def is_table_row(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith("|") and stripped.endswith("|")


def is_separator_row(line: str) -> bool:
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    return bool(cells) and all(re.fullmatch(r":?-{3,}:?", c or "-") for c in cells)


def parse_table_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def render_table(rows: list[list[str]], header: bool) -> str:
    parts = ['<table class="md-table">']
    if header and rows:
        parts.append("<thead><tr>")
        for cell in rows[0]:
            parts.append(f"<th>{inline_markup(cell)}</th>")
        parts.append("</tr></thead>")
        body_rows = rows[1:]
    else:
        body_rows = rows
    parts.append("<tbody>")
    for row in body_rows:
        parts.append("<tr>")
        for cell in row:
            parts.append(f"<td>{inline_markup(cell)}</td>")
        parts.append("</tr>")
    parts.append("</tbody></table>")
    return "".join(parts)


def markdown_to_html(markdown: str) -> str:
    lines = markdown.splitlines()
    body: list[str] = []
    i = 0

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if stripped == "---":
            body.append("<hr>")
            i += 1
            continue

        if stripped.startswith("#"):
            level = len(stripped) - len(stripped.lstrip("#"))
            level = min(max(level, 1), 6)
            title = stripped[level:].strip()
            body.append(f"<h{level}>{inline_markup(title)}</h{level}>")
            i += 1
            continue

        if is_table_row(line):
            table_lines: list[str] = []
            while i < len(lines) and is_table_row(lines[i]):
                table_lines.append(lines[i])
                i += 1
            if len(table_lines) >= 2 and is_separator_row(table_lines[1]):
                rows = [parse_table_row(table_lines[0])]
                rows.extend(parse_table_row(row) for row in table_lines[2:])
                body.append(render_table(rows, header=True))
            else:
                rows = [parse_table_row(row) for row in table_lines]
                body.append(render_table(rows, header=False))
            continue

        if re.match(r"^[-*]\s+", stripped):
            items: list[str] = []
            while i < len(lines):
                item_line = lines[i].strip()
                if not re.match(r"^[-*]\s+", item_line):
                    break
                item_text = re.sub(r"^[-*]\s+", "", item_line, count=1)
                items.append(f"<li>{inline_markup(item_text)}</li>")
                i += 1
            body.append("<ul>" + "".join(items) + "</ul>")
            continue

        paragraph: list[str] = [line]
        i += 1
        while i < len(lines):
            next_line = lines[i]
            next_stripped = next_line.strip()
            if (
                not next_stripped
                or next_stripped == "---"
                or next_stripped.startswith("#")
                or is_table_row(next_line)
                or re.match(r"^[-*]\s+", next_stripped)
            ):
                break
            paragraph.append(next_line)
            i += 1
        body.append(f"<p>{inline_markup(' '.join(s.strip() for s in paragraph))}</p>")

    return "\n".join(body)


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <style>
    :root {{
      color-scheme: light dark;
      --bg: #f6f4ef;
      --card: #ffffff;
      --text: #1f1a14;
      --muted: #5c5348;
      --border: #d9d0c3;
      --accent: #8b5a2b;
      --code-bg: #efe8dc;
    }}
    @media (prefers-color-scheme: dark) {{
      :root {{
        --bg: #14110f;
        --card: #1f1a17;
        --text: #f2ebe1;
        --muted: #b9aea0;
        --border: #3a322b;
        --accent: #d4a574;
        --code-bg: #2a231d;
      }}
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      padding: 2rem 1rem 3rem;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      line-height: 1.55;
      color: var(--text);
      background: var(--bg);
    }}
    main {{
      max-width: 960px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem 2.25rem;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.06);
    }}
    h1, h2 {{
      line-height: 1.2;
      margin: 0 0 1rem;
    }}
    h2 {{
      margin-top: 2rem;
      padding-top: 0.25rem;
      border-top: 1px solid var(--border);
      color: var(--accent);
    }}
    p {{ margin: 0 0 1rem; }}
    hr {{
      border: 0;
      border-top: 1px solid var(--border);
      margin: 1.5rem 0;
    }}
    ul {{
      margin: 0 0 1rem;
      padding-left: 1.35rem;
    }}
    li {{ margin: 0.35rem 0; }}
    code {{
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.92em;
      background: var(--code-bg);
      padding: 0.1em 0.35em;
      border-radius: 4px;
    }}
    a {{ color: var(--accent); }}
    table.md-table {{
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 1.25rem;
      font-size: 0.95rem;
    }}
    table.md-table th,
    table.md-table td {{
      border: 1px solid var(--border);
      padding: 0.55rem 0.65rem;
      vertical-align: top;
      text-align: left;
    }}
    table.md-table th {{
      background: var(--code-bg);
      font-weight: 600;
    }}
    table.md-table tbody tr:nth-child(even) {{
      background: color-mix(in srgb, var(--code-bg) 35%, transparent);
    }}
    footer {{
      margin-top: 2rem;
      font-size: 0.85rem;
      color: var(--muted);
    }}
  </style>
</head>
<body>
  <main>
{body}
    <footer>Сгенерировано из <code>{source}</code></footer>
  </main>
</body>
</html>
"""


def extract_title(markdown: str, fallback: str) -> str:
    for line in markdown.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    return fallback


def convert_file(input_path: Path, output_path: Path) -> None:
    markdown = input_path.read_text(encoding="utf-8")
    title = extract_title(markdown, input_path.stem)
    body = markdown_to_html(markdown)
    indented_body = "\n".join(f"    {line}" if line else "" for line in body.splitlines())
    html_doc = HTML_TEMPLATE.format(
        title=html.escape(title),
        body=indented_body,
        source=html.escape(input_path.name),
    )
    output_path.write_text(html_doc, encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    script_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Convert markdown designer docs to HTML.")
    parser.add_argument(
        "input",
        nargs="?",
        default=script_dir / "SYMBOLS_PAYTABLE.md",
        type=Path,
        help="Input .md file (default: SYMBOLS_PAYTABLE.md in this folder)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Output .html file (default: same name as input, .html extension)",
    )
    args = parser.parse_args(argv)

    input_path: Path = args.input.resolve()
    if not input_path.is_file():
        print(f"error: file not found: {input_path}", file=sys.stderr)
        return 1

    output_path = (
        args.output.resolve()
        if args.output
        else input_path.with_suffix(".html")
    )

    convert_file(input_path, output_path)
    print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
