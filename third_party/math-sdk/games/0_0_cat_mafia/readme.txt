Cat Mafia — math-sdk game (0_0_cat_mafia)
==========================================

Board: 5×4, 20 paylines
Modes: base (1×), bonus_boost (2×), bonus_normal (100× buy), bonus_super (200× buy)

Features
--------
- Paw (P): base only — converts row to coins (Low×1 / High×2 / W|B×3 / P=0)
- Super Wild (SW): ×2/×4/×6/×8 column expand; XOR with Paw
- FS target pick: 6 targets → 8/10/12 FS (predetermined)
- Bullets (BT): main FS only → drum max 6 → targetShootRound → optional +FS
- Normal FS: SW always expands; Super FS: SW pre-expanded on land

Quick start
-----------
  cd third_party/math-sdk/games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  export PATH="$HOME/.cargo/bin:$PATH"
  PY=/tmp/csmath_venv/bin/python

  # smoke
  $PY smoke_test.py

  # storybook fixtures → web-sdk apps/cat_mafia
  $PY run_storybook.py && $PY sync_to_web_sdk.py

  # larger sim (dev): edit run.py num_sim_args then
  $PY run.py

See repo MATH_COMMANDS.md (adapt paths from 0_0_daloniil_test → 0_0_cat_mafia).
