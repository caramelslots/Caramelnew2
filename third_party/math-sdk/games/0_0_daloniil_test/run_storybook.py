"""Storybook-oriented dev sim run для Cash Stacks.

Генерирует МАЛЕНЬКИЙ pool published books (uncompressed .json)
для использования как фикстуры в apps/daloniil_test/src/stories/data/.

Параметры подобраны так, чтобы:
  - быстро запускалось (одиночный thread, ~30-100 sims per mode)
  - каждый mode дал представительный набор book outcomes для storybook

NB: Это НЕ production-sim. Для прода используйте `run.py` с большими
числами и `compression=True`.

ВАЖНО про consistency с RGS publish (DEMO_ISSUES.md / BUG-001):
  `create_books()` всегда перезаписывает `library/publish_files/
  lookUpTable_<mode>_0.csv` свежим LUT'ом из текущего sim-merge
  (см. write_data.py:250-256, fix для Stake RGS publish).
  Если run_storybook запускается ПОСЛЕ run.py (M5/M6/Mn), без защиты
  это сломает publish-consistency: books_*.jsonl.zst (1e5 sim) останутся
  старыми, а LUT_*_0.csv станет от storybook (~30-100 sim) → Stake CLI:
  "lookup table CSV payouts do not match payoutMultiplier value in event
  file".

  Поэтому здесь делаем snapshot publish_files до create_books и
  восстанавливаем после. Storybook получает свои фикстуры
  (library/books/*.json), а publish_files остаётся каким был.
"""

import os
import shutil

from gamestate import GameState
from game_config import GameConfig
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs


HERE = os.path.dirname(os.path.abspath(__file__))
PUBLISH_DIR = os.path.join(HERE, "library", "publish_files")


def _snapshot_publish_files() -> dict[str, bytes]:
    """Прочитать содержимое publish_files в память для восстановления."""
    snapshot: dict[str, bytes] = {}
    if not os.path.isdir(PUBLISH_DIR):
        return snapshot
    for name in os.listdir(PUBLISH_DIR):
        path = os.path.join(PUBLISH_DIR, name)
        if os.path.isfile(path):
            with open(path, "rb") as f:
                snapshot[name] = f.read()
    return snapshot


def _restore_publish_files(snapshot: dict[str, bytes]) -> None:
    """Откатить publish_files к снапшоту, удаляя файлы которых не было."""
    if not snapshot:
        print("  (publish_files snapshot был пуст, пропускаем restore)")
        return
    os.makedirs(PUBLISH_DIR, exist_ok=True)
    current = set(os.listdir(PUBLISH_DIR))
    expected = set(snapshot.keys())
    for new_file in current - expected:
        path = os.path.join(PUBLISH_DIR, new_file)
        if os.path.isfile(path):
            os.remove(path)
    for name, data in snapshot.items():
        path = os.path.join(PUBLISH_DIR, name)
        with open(path, "wb") as f:
            f.write(data)
    print(f"  publish_files восстановлен ({len(snapshot)} файлов).")


if __name__ == "__main__":

    num_threads = 1
    batching_size = 100
    compression = False
    profiling = False

    num_sim_args = {
        "base": 100,
        "bonus_boost": 60,
        "special_spins": 30,
        "bonus_normal": 30,
        "bonus_super": 30,
    }

    config = GameConfig()
    gamestate = GameState(config)

    print(f"Snapshotting {PUBLISH_DIR} перед run_storybook...")
    publish_snapshot = _snapshot_publish_files()
    print(f"  {len(publish_snapshot)} файлов сохранено в памяти.")

    try:
        create_books(
            gamestate,
            config,
            num_sim_args,
            batching_size,
            num_threads,
            compression,
            profiling,
        )
        generate_configs(gamestate)
    finally:
        print("\nВосстанавливаем publish_files (для RGS publish consistency)...")
        _restore_publish_files(publish_snapshot)

    print("\nDone. Published .json books для storybook:")
    print(f"  {gamestate.output_files.book_path}")
    print(f"\npublish_files (для RGS) — НЕ тронут, по-прежнему от run.py.")
