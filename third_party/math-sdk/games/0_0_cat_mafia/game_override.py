"""Cat Mafia state overrides — paw / SW / XOR / target pick / bullets / shoot."""

import random

from game_executables import GameExecutables
from src.calculations.statistics import get_random_outcome
from src.calculations.lines import Lines
from src.events.events import reveal_event, fs_trigger_event
from game_cluster import generate_cluster_board_names
from game_events import (
    paw_coin_resolve_event,
    super_wild_expand_event,
    free_spin_target_pick_event,
    bullet_collect_event,
    target_shoot_round_event,
)
from game_features import (
    find_paws,
    find_super_wilds,
    sw_positions_in_wins,
    resolve_xor,
    build_paw_resolve,
    expand_sw_columns,
    pick_fs_targets,
    collect_bullets,
    run_target_shoot,
    stamp_expanded_sw_column,
    strip_all_sw,
    keep_single_sw,
    pick_sticky_sw_column,
)


class GameStateOverride(GameExecutables):

    def reset_book(self):
        super().reset_book()
        self.fs_trigger_bonus_count = 0
        self.fs_profile: str | None = None  # bonus_normal | bonus_super
        self.drum_count = 0
        self.fs_main_total = 0
        self.fs_extra_phase = False
        self.chosen_fs = 0
        self.target_pick = None
        # FS sticky Super Wild (one column for the whole bonus).
        self.sticky_sw_reel: int | None = None
        self.sticky_sw_mult: int | None = None
        self.sticky_sw_opened: bool = False

    def assign_special_sym_function(self):
        self.special_symbol_functions = {
            "SW": [self.assign_sw_mult_property],
        }

    def assign_sw_mult_property(self, symbol) -> None:
        weights = self.config.sw_mult_weights
        # Prefer distribution mult_values when in FS if present.
        conditions = self.get_current_distribution_conditions()
        mult_map = conditions.get("mult_values", {}).get(self.gametype)
        if mult_map:
            weights = mult_map
        multiplier_value = get_random_outcome(weights)
        symbol.assign_attribute({"multiplier": int(multiplier_value)})

    def check_repeat(self):
        super().check_repeat()
        if self.repeat is False:
            win_criteria = self.get_current_betmode_distributions().get_win_criteria()
            if win_criteria is not None and self.final_win != win_criteria:
                self.repeat = True
                return
            if win_criteria is None and self.final_win == 0:
                self.repeat = True
                return

    def draw_board(self, emit_event: bool = True, trigger_symbol: str = "scatter") -> None:
        conditions = self.get_current_distribution_conditions()
        if conditions.get("cluster_board") or self.criteria == "0_cluster":
            if self.draw_cluster_board(emit_event=emit_event):
                return

        super().draw_board(emit_event=False, trigger_symbol=trigger_symbol)
        self.enforce_bonus_symbol_rules()
        self.enforce_feature_symbol_rules()
        self.apply_fs_sw_board_rules()
        if emit_event:
            reveal_event(self)

    def draw_cluster_board(self, emit_event: bool = True) -> bool:
        betmode = self.get_current_betmode().get_name()
        weights = self.config.get_cluster_symbol_weights(self.gametype, betmode)
        board_names = generate_cluster_board_names(
            self.config,
            weights,
            self.create_symbol,
            global_multiplier=self.global_multiplier,
            max_scatters=2,
        )
        if board_names is None:
            return False

        board = []
        for reel in range(self.config.num_reels):
            col = []
            for row in range(self.config.num_rows[reel]):
                col.append(self.create_symbol(board_names[reel][row]))
            board.append(col)
        self.board = board
        self.get_special_symbols_on_board()
        self.enforce_bonus_symbol_rules()
        self.enforce_feature_symbol_rules()
        self.apply_fs_sw_board_rules()
        self.anticipation = [0] * self.config.num_reels
        self.reel_positions = [0] * self.config.num_reels
        self.padding_position = [0] * self.config.num_reels
        self.reelstrip_id = "CLUSTER"
        if self.config.include_padding:
            pool = ["L1", "L2", "L3", "L4", "H4", "H3"]
            self.top_symbols = [
                self.create_symbol(random.choice(pool)) for _ in range(self.config.num_reels)
            ]
            self.bottom_symbols = [
                self.create_symbol(random.choice(pool)) for _ in range(self.config.num_reels)
            ]
            # Re-apply sticky SW onto padding after regenerating it.
            self.apply_fs_sw_board_rules()
        if emit_event:
            reveal_event(self)
        return True

    def enforce_bonus_symbol_rules(self) -> None:
        """Base: max 1 scatter (B) per reel in viewport (board + padding). FS: no B."""
        if self.gametype == self.config.freegame_type:
            for reel, col in enumerate(self.board):
                for row, cell in enumerate(col):
                    if cell.name == "B":
                        self.board[reel][row] = self.create_symbol("L1")
            if getattr(self.config, "include_padding", False):
                for attr in ("top_symbols", "bottom_symbols"):
                    pad = getattr(self, attr, None)
                    if not pad:
                        continue
                    for reel, sym in enumerate(pad):
                        if getattr(sym, "name", None) == "B":
                            pad[reel] = self.create_symbol("L1")
            self.get_special_symbols_on_board()
            return

        max_b = getattr(self.config, "max_bonus_on_board", 5)
        kept = 0
        for reel, col in enumerate(self.board):
            # Prefer a visible-board B; drop extras on this reel.
            b_rows = [row for row, cell in enumerate(col) if cell.name == "B"]
            keep_row = None
            if b_rows and kept < max_b:
                keep_row = b_rows[0]
                kept += 1
            for row in b_rows:
                if row != keep_row:
                    self.board[reel][row] = self.create_symbol("L1")

            # Padding must not add a second scatter on the same column.
            if getattr(self.config, "include_padding", False):
                for attr in ("top_symbols", "bottom_symbols"):
                    pad = getattr(self, attr, None)
                    if not pad or reel >= len(pad):
                        continue
                    if getattr(pad[reel], "name", None) != "B":
                        continue
                    if keep_row is not None or kept >= max_b:
                        pad[reel] = self.create_symbol("L1")
                    else:
                        # Only padding had B — keep top if both, else the one present.
                        keep_row = -1  # mark reel as using padding B
                        kept += 1
                # If both top and bottom are still B (no board B), keep only top.
                top = getattr(self, "top_symbols", None)
                bot = getattr(self, "bottom_symbols", None)
                if (
                    keep_row == -1
                    and top
                    and bot
                    and reel < len(top)
                    and reel < len(bot)
                    and getattr(top[reel], "name", None) == "B"
                    and getattr(bot[reel], "name", None) == "B"
                ):
                    bot[reel] = self.create_symbol("L1")

        self.get_special_symbols_on_board()

    def _strip_symbol_name(self, cell, replacements: dict[str, str]):
        """Replace cell in-place if its name is in replacements."""
        repl = replacements.get(cell.name)
        return self.create_symbol(repl) if repl else cell

    def enforce_feature_symbol_rules(self) -> None:
        """Base: no BT. Main FS: no P (P→BT). Extra FS after shoot: no BT / no P.

        Also strips padding top/bottom — reveal_event includes them in the board.
        """
        if self.gametype == self.config.basegame_type:
            repl = {"BT": "L2"}
        elif self.fs_extra_phase:
            # Extra FS after shoot: no bullets anywhere (visible + padding).
            repl = {"BT": "L2", "P": "L2"}
        else:
            # Main FS: convert leftover P → BT; keep BT from FR strips.
            repl = {"P": "BT"}

        for reel, col in enumerate(self.board):
            for row, cell in enumerate(col):
                new_cell = self._strip_symbol_name(cell, repl)
                if new_cell is not cell:
                    self.board[reel][row] = new_cell

        if getattr(self.config, "include_padding", False):
            if getattr(self, "top_symbols", None):
                self.top_symbols = [
                    self._strip_symbol_name(sym, repl) for sym in self.top_symbols
                ]
            if getattr(self, "bottom_symbols", None):
                self.bottom_symbols = [
                    self._strip_symbol_name(sym, repl) for sym in self.bottom_symbols
                ]

        self.get_special_symbols_on_board()

    def is_super_bonus(self) -> bool:
        if self.fs_profile == "bonus_super":
            return True
        conditions = self.get_current_distribution_conditions()
        return bool(conditions.get("super_bonus"))

    def apply_fs_profile_from_trigger(self) -> None:
        """3× B → normal, 4+ B → super; buy modes override."""
        betmode = self.get_current_betmode().get_name()
        count = self.count_special_symbols("scatter")
        self.fs_trigger_bonus_count = count
        if betmode == "bonus_super" or self.get_current_distribution_conditions().get("super_bonus"):
            self.fs_profile = "bonus_super"
        elif betmode == "bonus_normal":
            self.fs_profile = "bonus_normal"
        else:
            self.fs_profile = "bonus_super" if count >= 4 else "bonus_normal"

    def emit_free_spin_target_pick(self) -> None:
        targets, chosen_index, awarded = pick_fs_targets(self.config)
        self.target_pick = {
            "targets": targets,
            "chosenIndex": chosen_index,
            "awardedFs": awarded,
        }
        self.chosen_fs = awarded
        free_spin_target_pick_event(self, targets, chosen_index, awarded)

    def update_freespin_amount(self, scatter_key: str = "scatter") -> None:
        """FS count from target pick (not scatter table)."""
        if self.chosen_fs <= 0:
            # Fallback if pick somehow skipped
            self.chosen_fs = 10
        self.tot_fs = int(self.chosen_fs)
        self.fs_main_total = int(self.chosen_fs)
        if self.gametype == self.config.basegame_type:
            basegame_trigger, freegame_trigger = True, False
        else:
            basegame_trigger, freegame_trigger = False, True
        fs_trigger_event(self, basegame_trigger=basegame_trigger, freegame_trigger=freegame_trigger)

    # ---- Base / FS feature resolve ----

    def evaluate_lines_board(self):
        """Standard lines eval + emit."""
        self.win_data = Lines.get_lines(
            self.board,
            self.config,
            global_multiplier=self.global_multiplier,
        )
        Lines.record_lines_wins(self)
        self.win_manager.update_spinwin(self.win_data["totalWin"])
        Lines.emit_linewin_events(self)

    def resolve_base_spin_features(self) -> None:
        """After line eval: XOR paw OR superWildExpand."""
        paws = find_paws(self.board)
        sw_hits = find_super_wilds(self.board)
        sw_in_win = bool(sw_positions_in_wins(sw_hits, self.win_data))
        want_paw = bool(paws)
        want_sw = bool(sw_hits) and sw_in_win
        want_paw, want_sw = resolve_xor(want_paw, want_sw)

        if want_sw:
            self._apply_super_wild_expand(sw_hits, re_eval=True)
        elif want_paw:
            self._apply_paw_resolve()

    def init_fs_sticky_sw(self) -> None:
        """Start of FS: Super picks sticky open column; Normal waits for first land."""
        self.sticky_sw_reel = None
        self.sticky_sw_mult = None
        self.sticky_sw_opened = False
        self._pending_sw_expands = []
        self._pending_sw_product = 1
        if not self.is_super_bonus():
            return
        weights = self.config.sw_mult_weights
        try:
            conditions = self.get_current_distribution_conditions()
            mult_map = conditions.get("mult_values", {}).get(self.gametype)
            if mult_map:
                weights = mult_map
        except Exception:
            pass
        reel, mult = pick_sticky_sw_column(self.config.num_reels, weights)
        self.sticky_sw_reel = reel
        self.sticky_sw_mult = mult
        self.sticky_sw_opened = True

    def _set_padding_symbol(self, reel: int, name: str, mult: int | None = None) -> None:
        """Write top/bottom padding cell for one reel (reveal includes padding)."""
        if not getattr(self.config, "include_padding", False):
            return
        for attr in ("top_symbols", "bottom_symbols"):
            pad = getattr(self, attr, None)
            if not pad or reel >= len(pad):
                continue
            pad[reel] = self.create_symbol(name)
            if name == "SW" and mult is not None:
                pad[reel].assign_attribute({"multiplier": int(mult)})

    def _strip_padding_sw(self, keep_reel: int | None = None, mult: int | None = None) -> None:
        """Remove SW from padding; optionally keep sticky reel as expanded SW."""
        if not getattr(self.config, "include_padding", False):
            return
        for reel in range(self.config.num_reels):
            if keep_reel is not None and reel == keep_reel:
                self._set_padding_symbol(reel, "SW", mult if mult is not None else 2)
                continue
            for attr in ("top_symbols", "bottom_symbols"):
                pad = getattr(self, attr, None)
                if not pad or reel >= len(pad):
                    continue
                if getattr(pad[reel], "name", None) == "SW":
                    pad[reel] = self.create_symbol("L2")

    def apply_fs_sw_board_rules(self) -> None:
        """After draw: max 1 SW; Super/sticky-open stamp expanded column before reveal."""
        if self.gametype != self.config.freegame_type:
            return

        if self.sticky_sw_opened and self.sticky_sw_reel is not None:
            strip_all_sw(self.board, self.create_symbol)
            n_rows = int(self.config.num_rows[self.sticky_sw_reel])
            expand = stamp_expanded_sw_column(
                self.board,
                self.create_symbol,
                self.sticky_sw_reel,
                int(self.sticky_sw_mult or 2),
                row=int(random.randrange(max(1, n_rows))),
            )
            # Sticky column only — strip ghost SW from other reels' padding.
            self._strip_padding_sw(
                keep_reel=self.sticky_sw_reel,
                mult=int(self.sticky_sw_mult or 2),
            )
            self._pending_sw_expands = [expand]
            self._pending_sw_product = int(expand["mult"])
            self.get_special_symbols_on_board()
            return

        # Normal before first open: one lying SW on the board, never in padding.
        keep_single_sw(self.board, self.create_symbol)
        self._strip_padding_sw(keep_reel=None)
        self.get_special_symbols_on_board()

    def resolve_fs_spin_features(self) -> None:
        """FS: sticky SW rules; bullets on main FS only.

        Bonus-only: SW expands whenever it is on the board — no payline
        membership check (that gate applies only in base via resolve_base_spin_features).
        """
        if self.sticky_sw_opened and self.sticky_sw_reel is not None:
            # Column already expanded before eval (Super always / Normal after first open).
            self._apply_super_product_after_preexpand()
        else:
            # Normal: first land — SW lies, then opens and becomes sticky (always).
            sw_hits = keep_single_sw(self.board, self.create_symbol)
            if sw_hits:
                self._apply_super_wild_expand(sw_hits, re_eval=True)
                expands = getattr(self, "_last_sw_expands", None) or []
                if expands:
                    self.sticky_sw_reel = int(expands[0]["reel"])
                    self.sticky_sw_mult = int(expands[0]["mult"])
                    self.sticky_sw_opened = True
                    # Lock sticky padding immediately so no ghost SW remain.
                    self._strip_padding_sw(
                        keep_reel=self.sticky_sw_reel,
                        mult=self.sticky_sw_mult,
                    )

        if not self.fs_extra_phase:
            bullets, new_drum = collect_bullets(
                self.board, self.drum_count, self.config.drum_max
            )
            if bullets:
                self.drum_count = new_drum
                bullet_collect_event(self, bullets, self.drum_count)

    def _apply_super_product_after_preexpand(self) -> None:
        expands = getattr(self, "_pending_sw_expands", []) or []
        product = int(getattr(self, "_pending_sw_product", 1) or 1)
        if not expands and self.sticky_sw_reel is not None:
            # Random origin row so expand payload is not stuck on row 0 / bottom.
            n_rows = int(self.config.num_rows[self.sticky_sw_reel])
            expands = [
                {
                    "reel": int(self.sticky_sw_reel),
                    "row": int(random.randrange(max(1, n_rows))),
                    "mult": int(self.sticky_sw_mult or 2),
                }
            ]
            product = int(self.sticky_sw_mult or 2)
        if not expands:
            return
        if product > 1 and self.win_manager.spin_win > 0:
            from src.events.events import set_win_event, set_total_event

            self.win_manager.set_spin_win(round(self.win_manager.spin_win * product, 2))
            set_win_event(self)
            set_total_event(self)
        super_wild_expand_event(self, expands, product)
        self._pending_sw_expands = []
        self._pending_sw_product = 1

    def _apply_super_wild_expand(self, sw_hits, re_eval: bool = True) -> None:
        expands, product = expand_sw_columns(self.board, self.create_symbol, sw_hits)
        self._last_sw_expands = expands
        if not expands:
            return
        if re_eval:
            from src.events.events import set_win_event, set_total_event

            self.win_data = Lines.get_lines(
                self.board,
                self.config,
                global_multiplier=self.global_multiplier,
            )
            new_total = round(float(self.win_data["totalWin"]) * product, 2)
            self.win_manager.set_spin_win(new_total)
            if new_total > 0:
                Lines.record_lines_wins(self)
                set_win_event(self)
            set_total_event(self)

        super_wild_expand_event(self, expands, product)

    def _apply_paw_resolve(self) -> None:
        paws, rows, total = build_paw_resolve(self.board, bet=1.0)
        if not paws:
            return
        paw_coin_resolve_event(self, paws, rows, total)
        if total > 0:
            from src.events.events import set_total_event

            self.win_manager.update_spinwin(total)
            set_total_event(self)

    def run_target_shoot_round(self) -> None:
        if self.fs_extra_phase:
            return
        if self.drum_count <= 0:
            # No bullets — still mark extra phase so we never shoot twice.
            self.fs_extra_phase = True
            return
        shots, extra = run_target_shoot(
            self.drum_count,
            self.config.shoot_reward_weights,
            target_count=9,
        )
        target_shoot_round_event(self, shots, extra)
        self.drum_count = 0
        self.fs_extra_phase = True
        if extra > 0:
            self.tot_fs += int(extra)
