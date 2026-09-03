"""Cat Mafia state overrides — paw / SW / XOR / target pick / bullets / shoot."""

import random

from game_executables import GameExecutables
from src.calculations.statistics import get_random_outcome
from src.calculations.lines import Lines
from src.events.events import reveal_event, fs_trigger_event
from game_cluster import generate_cluster_board_names
from game_visual_enrich import enrich_board_non_winning, enrich_padding_symbols
from game_events import (
    paw_coin_resolve_event,
    super_wild_expand_event,
    free_spin_target_pick_event,
    bullet_collect_event,
    target_shoot_round_event,
    duel_start_event,
    duel_spin_event,
    duel_spin_win_event,
    duel_bank_update_event,
    duel_end_event,
    duel_purchase_celebrate_event,
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
    keep_one_sw_per_reel,
    cap_lying_sw_on_board,
    pick_sticky_sw_column,
    product_of_mults,
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
        # FS sticky Super Wild columns: reel -> multiplier (capped).
        self.sticky_sw: dict[int, int] = {}
        self.max_sticky_sw = int(getattr(self.config, "max_sticky_sw", 2))
        self.duel_dog_total = 0.0
        self.duel_cat_total = 0.0
        self.duel_winner = None
        self.duel_payout = 0.0
        self.duel_player_side = None
        self.duel_player_won = False
        # Per-side sticky SW during a duel session (reel -> mult).
        self.duel_sticky_sw: dict[str, dict[int, int]] = {"cat": {}, "dog": {}}
        self._duel_active_side: str | None = None
        # Lying SW real mults (cloaked to 1 on board until curtain / expand).
        self._lying_sw_mult_by_pos: dict[tuple[int, int], int] = {}

    DUEL_MODE_NAMES = frozenset({"bonus_duel", "bonus_duel_cat", "bonus_duel_dog"})

    def is_duel_betmode(self) -> bool:
        name = self.get_current_betmode().get_name()
        return name in self.DUEL_MODE_NAMES

    def resolve_duel_player_side(self) -> str:
        """Which side the player is playing as for this book (from bet mode)."""
        name = self.get_current_betmode().get_name()
        if name == "bonus_duel_dog":
            return "dog"
        # bonus_duel_cat, legacy bonus_duel → cat
        return "cat"

    def _fence_win_cap(self) -> float:
        """Stop/clamp at distribution win_criteria when force_wincap (soft ×2500 vs hard ×25000)."""
        try:
            dist = self.get_current_betmode_distributions()
            wc = dist.get_win_criteria() if dist is not None else None
            cond = self.get_current_distribution_conditions() or {}
        except Exception:  # noqa: BLE001
            return float(self.config.wincap)
        if cond.get("force_wincap") and wc is not None and float(wc) > 0:
            return float(wc)
        return float(self.config.wincap)

    def evaluate_wincap(self) -> bool:
        """Trigger wincap at the active fence cap (soft or hard), not only mode max."""
        from src.events.event_constants import EventConstants

        cap = self._fence_win_cap()
        if self.win_manager.running_bet_win >= cap and not self.wincap_triggered:
            self.wincap_triggered = True
            self.book.add_event(
                {
                    "index": len(self.book.events),
                    "type": EventConstants.WINCAP.value,
                    "amount": int(round(cap * 100, 0)),
                }
            )
            return True
        return False

    def update_final_win(self) -> None:
        """Clamp payout to active fence cap so win_criteria (2500 / 25000) can match exactly."""
        cap = self._fence_win_cap()
        # Duel LUT payouts must be multiples of 10 (0.1× bet); keep that quantization.
        quant = 1 if self.is_duel_betmode() else 2
        final = round(min(self.win_manager.running_bet_win, cap), quant)
        basewin = round(min(self.win_manager.basegame_wins, cap), quant)
        freewin = round(min(self.win_manager.freegame_wins, cap), quant)

        self.final_win = final
        self.book.payout_multiplier = self.final_win
        self.book.basegame_wins = basewin
        self.book.freegame_wins = freewin

        assert min(
            round(self.win_manager.basegame_wins + self.win_manager.freegame_wins, quant),
            cap,
        ) == round(
            min(self.win_manager.running_bet_win, cap), quant
        ), "Base + Free game payout mismatch!"
        assert min(
            round(self.book.basegame_wins + self.book.freegame_wins, quant),
            cap,
        ) == min(
            round(self.book.payout_multiplier, quant), round(cap, quant)
        ), "Base + Free game payout mismatch!"

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
        # Paid curtain mults: ×2–×8 plus ultra-rare ×25/×50/×75 — never emit ×1.
        symbol.assign_attribute({"multiplier": max(2, int(multiplier_value))})

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
            # Feature fences: required event must fire (not lost to XOR).
            if self.criteria in {"paw", "sw_expand"}:
                types = {e.get("type") for e in self.book.events if isinstance(e, dict)}
                need = "pawCoinResolve" if self.criteria == "paw" else "superWildExpand"
                if need not in types:
                    self.repeat = True
                    return
            # Duel outcome fences — duel_win/lose refer to the *player's* side.
            if self.criteria == "duel_win" and not getattr(self, "duel_player_won", False):
                self.repeat = True
                return
            if self.criteria == "duel_lose" and getattr(self, "duel_player_won", False):
                self.repeat = True
                return
            if self.is_duel_betmode():
                if getattr(self, "duel_cat_total", None) == getattr(self, "duel_dog_total", None):
                    self.repeat = True

    def draw_board(self, emit_event: bool = True, trigger_symbol: str = "scatter") -> None:
        conditions = self.get_current_distribution_conditions()
        if conditions.get("cluster_board") or self.criteria == "0_cluster":
            if self.draw_cluster_board(emit_event=emit_event):
                return

        super().draw_board(emit_event=False, trigger_symbol=trigger_symbol)
        self.enforce_bonus_symbol_rules()
        self.enforce_feature_symbol_rules()
        self.enforce_duel_symbol_rules()
        self.apply_fs_sw_board_rules()
        self.force_paw_on_board()
        self.enforce_single_sw_base()
        self.enrich_visual_non_winning_symbols()
        # Lying SW is a plain wild until the curtain — strip ×N from the board
        # (and reveal payload) so Lines / client cannot apply symbol mult early.
        self._capture_and_cloak_lying_sw_mults()
        if emit_event:
            reveal_event(self)

    def _capture_and_cloak_lying_sw_mults(self) -> None:
        """Save real lying-SW mults, then force multiplier=1 on those cells.

        Sticky / already-open columns keep their ×N. Expand restores mult from
        `_lying_sw_mult_by_pos` (or hit payload patched via `_patch_sw_hit_mults`).
        """
        self._lying_sw_mult_by_pos = {}
        sticky_reels = set(self.sticky_sw.keys())
        for h in find_super_wilds(self.board):
            reel, row = int(h["reel"]), int(h["row"])
            if reel in sticky_reels:
                continue
            mult = max(1, int(h.get("mult") or 1))
            self._lying_sw_mult_by_pos[(reel, row)] = mult
            self.board[reel][row].assign_attribute({"multiplier": 1})
        if not getattr(self.config, "include_padding", False):
            return
        for attr in ("top_symbols", "bottom_symbols"):
            pad = getattr(self, attr, None)
            if not pad:
                continue
            for reel, cell in enumerate(pad):
                if getattr(cell, "name", None) != "SW":
                    continue
                if reel in sticky_reels:
                    continue
                cell.assign_attribute({"multiplier": 1})

    def _patch_sw_hit_mults(self, hits: list[dict]) -> list[dict]:
        """Restore cloaked lying-SW multipliers onto expand hit payloads."""
        for h in hits:
            key = (int(h["reel"]), int(h["row"]))
            if key in self._lying_sw_mult_by_pos:
                h["mult"] = max(2, int(self._lying_sw_mult_by_pos[key]))
            else:
                # Board cell may still hold sticky mult; prefer hit then cell.
                h["mult"] = max(2, int(h.get("mult") or 2))
        return hits

    def enforce_duel_symbol_rules(self) -> None:
        """Duel: never land scatter B, duel-bonus BD, paw coins, or bullets."""
        conditions = self.get_current_distribution_conditions() or {}
        if not conditions.get("duel_mode") and not self.is_duel_betmode():
            return
        forbidden = {"B", "BD", "BT", "PB", "PS", "PG"}
        self._replace_symbol_name(forbidden, "L2")
        # Strip padding too.
        if not getattr(self.config, "include_padding", False):
            return
        for attr in ("top_symbols", "bottom_symbols"):
            pad = getattr(self, attr, None)
            if not pad:
                continue
            for reel, cell in enumerate(pad):
                if getattr(cell, "name", None) in forbidden:
                    pad[reel] = self.create_symbol("L2")

    def emit_duel_purchase_reveal(self) -> None:
        """Buy-duel only: dead basegame board with exactly 3× BD, then celebrate.

        BD is registered in math (`special_symbols.duel_bonus`) but never appears
        on reelstrips or padding — so it cannot flash as a fake scroll symbol.
        """
        fillers = ["L1", "L2", "L3", "L4", "H1", "H2", "H3", "H4"]

        # Dead visible board: alternate H/L by reel so no 3-oak L→R on paylines.
        visible: list[list[str]] = []
        for reel in range(self.config.num_reels):
            pool = ["L1", "L2", "L3", "L4"] if reel % 2 == 0 else ["H1", "H2", "H3", "H4"]
            visible.append([pool[(row + reel) % 4] for row in range(self.config.num_rows[reel])])

        bonus_reels = list(range(self.config.num_reels))
        random.shuffle(bonus_reels)
        bonus_reels = sorted(bonus_reels[:3])
        positions: list[dict] = []
        for reel in bonus_reels:
            row = random.randrange(self.config.num_rows[reel])
            visible[reel][row] = "BD"
            positions.append({"reel": int(reel), "row": int(row)})

        self.gametype = self.config.basegame_type
        self.board = [[self.create_symbol(name) for name in col] for col in visible]
        self.top_symbols = [
            self.create_symbol(random.choice(fillers)) for _ in range(self.config.num_reels)
        ]
        self.bottom_symbols = [
            self.create_symbol(random.choice(fillers)) for _ in range(self.config.num_reels)
        ]
        self.reel_positions = [10, 20, 5, 15, 8]
        self.anticipation = [0] * self.config.num_reels
        reveal_event(self)
        duel_purchase_celebrate_event(self, positions)

    def duel_visible_board(self) -> list:
        """5×4 board payload for duelSpin (no padding rows)."""
        from src.events.events import json_ready_sym

        special_attributes = list(self.config.special_symbols.keys())
        board_client = []
        for reel, _ in enumerate(self.board):
            board_client.append([])
            for row in range(len(self.board[reel])):
                board_client[reel].append(
                    json_ready_sym(self.board[reel][row], special_attributes)
                )
        return board_client

    def run_duel_side_spin(self, side: str, spin_index: int) -> float:
        """One cat/dog spin under FS-style sticky SW rules (no bullets).

        Side banks accumulate wins; player wallet is only settled on duelEnd.
        """
        self.win_manager.reset_spin_win()
        running_before = float(self.win_manager.running_bet_win)

        self._duel_active_side = side
        self.sticky_sw = self.duel_sticky_sw.setdefault(side, {})
        self._pending_sw_expands = []
        self._pending_sw_product = 1

        try:
            self.draw_board(emit_event=False)

            saved = self._neutralize_board_sw_mults()
            try:
                self.win_data = Lines.get_lines(
                    self.board,
                    self.config,
                    global_multiplier=self.global_multiplier,
                )
                self.win_manager.update_spinwin(float(self.win_data.get("totalWin") or 0))
            finally:
                self._restore_board_sw_mults(saved)

            # Normal/Duel: strip lying SW that did not hit a win line before book board.
            self._strip_non_qualifying_lying_sw()

            pre_expand_board = self.duel_visible_board()
            phase1_wins = list(self.win_data.get("wins") or [])
            phase1_total = float(self.win_data.get("totalWin") or 0)

            # Peek SW path before emitting book events (resolve emits superWildExpand).
            sw_mode = self._peek_duel_sw_mode()
            if sw_mode == "new_sw":
                duel_spin_event(
                    self,
                    side,
                    spin_index,
                    pre_expand_board,
                    spin_win=0,
                    phase1_wins=phase1_wins if phase1_total > 0 else None,
                    phase1_total_win=phase1_total if phase1_total > 0 else None,
                    sw_two_beat=True,
                )
                self._resolve_duel_sw_features(
                    side,
                    phase1_wins=phase1_wins,
                    phase1_total=phase1_total,
                )
            else:
                self._resolve_duel_sw_features(side)

            spin_win = round(float(self.win_manager.spin_win), 2)
            wins_payload = list(self.win_data.get("wins") or []) if spin_win > 0 else []
            total_win = float(self.win_data.get("totalWin") or spin_win) if spin_win > 0 else 0.0

            if sw_mode == "new_sw":
                if wins_payload and total_win > 0:
                    duel_spin_win_event(
                        self,
                        side,
                        spin_index,
                        spin_win,
                        wins=wins_payload,
                        total_win=total_win,
                    )
                elif spin_win > phase1_total + 1e-9:
                    duel_spin_win_event(
                        self,
                        side,
                        spin_index,
                        spin_win,
                    )
            else:
                duel_spin_event(
                    self,
                    side,
                    spin_index,
                    self.duel_visible_board(),
                    spin_win,
                    wins=wins_payload if wins_payload else None,
                    total_win=total_win if spin_win > 0 else None,
                )

            self.duel_sticky_sw[side] = dict(self.sticky_sw)
        finally:
            self._duel_active_side = None

        self.win_manager.running_bet_win = running_before
        self.win_manager.spin_win = 0.0
        return spin_win

    def settle_duel_payout(self, dog_total: float, cat_total: float) -> tuple[str, float]:
        """Apply payout vs playerSide; set win_manager to player-facing amount.

        board winner = higher bank. Player wins only if board winner == playerSide
        → payout = dog+cat; else 0.

        RGS LUT payouts are multiplier×100 and must be multiples of 10, so all
        settled bet-multipliers are quantized to 0.1 (not 0.01).
        """
        def q(value: float) -> float:
            return round(float(value), 1)

        dog_total = q(dog_total)
        cat_total = q(cat_total)
        player_side = self.resolve_duel_player_side()
        self.duel_player_side = player_side

        conditions = self.get_current_distribution_conditions() or {}
        dist = self.get_current_betmode_distributions()
        win_criteria = dist.get_win_criteria() if dist is not None else None

        # Soft/hard jackpot fence: force a *player* win at the exact criteria amount.
        if conditions.get("force_wincap") and win_criteria is not None and float(win_criteria) > 0:
            target = q(win_criteria)
            if player_side == "cat":
                if cat_total <= dog_total:
                    cat_total = q(dog_total + max(1.0, target * 0.01))
            else:
                if dog_total <= cat_total:
                    dog_total = q(cat_total + max(1.0, target * 0.01))
            total = q(dog_total + cat_total)
            if total > 0:
                scale = target / total
                dog_total = q(dog_total * scale)
                cat_total = q(target - dog_total)
            else:
                dog_total = 0.0
                cat_total = target
                if player_side == "dog":
                    dog_total = target
                    cat_total = 0.0
            winner = player_side
            payout = target
            player_won = True
        else:
            if cat_total == dog_total:
                # Tie impossible — nudge by one RGS payout step (0.1×).
                cat_total = q(cat_total + 0.1)

            if cat_total > dog_total:
                winner = "cat"
            else:
                winner = "dog"

            player_won = winner == player_side
            payout = q(dog_total + cat_total) if player_won else 0.0

            cap = self._fence_win_cap()
            payout = q(min(payout, cap))

        self.duel_dog_total = dog_total
        self.duel_cat_total = cat_total
        self.duel_winner = winner
        self.duel_payout = payout
        self.duel_player_won = player_won

        self.win_manager.running_bet_win = payout
        self.win_manager.basegame_wins = payout
        self.win_manager.freegame_wins = 0.0
        self.win_manager.spin_win = payout
        return winner, payout

    def _replace_symbol_name(self, from_names: set[str], to_name: str) -> None:
        for reel, col in enumerate(self.board):
            for row, cell in enumerate(col):
                if getattr(cell, "name", None) in from_names:
                    self.board[reel][row] = self.create_symbol(to_name)

    def force_paw_on_board(self) -> None:
        """Plant one paw coin (PB/PS/PG) when criteria/conditions request force_paw.

        Rows stay natural — coin multipliers depend on the symbols underneath,
        so the old forced all-low row is gone. RTP re-tunes via optimization.
        """
        if self.gametype != self.config.basegame_type:
            return
        conditions = self.get_current_distribution_conditions()
        if not (conditions.get("force_paw") or self.criteria == "paw"):
            return

        # Keep XOR clean for this fence — no competing SW expand.
        self._replace_symbol_name({"SW"}, "L2")

        row = random.randrange(self.config.num_rows[0])
        paw_reel = random.randrange(self.config.num_reels)
        tier_weights = self.config.paw_tier_weights
        paw_name = random.choices(
            list(tier_weights.keys()), weights=list(tier_weights.values()), k=1
        )[0]
        self.board[paw_reel][row] = self.create_symbol(paw_name)
        self.get_special_symbols_on_board()

    def enforce_single_sw_base(self) -> None:
        """Base/boost: at most one SW per spin, and no SW peeking from padding.

        SW now lands naturally from BR0 strips (the force_sw_expand fence is
        gone). Curtain logic is unchanged: resolve_base_spin_features still
        requires the SW to sit on a winning payline. Runs only for the
        basegame gametype — FS rules (sticky columns) are untouched.
        """
        if self.gametype != self.config.basegame_type:
            return

        hits = find_super_wilds(self.board)
        if len(hits) > 1:
            keep = random.choice(hits)
            for h in hits:
                if h is not keep:
                    self.board[h["reel"]][h["row"]] = self.create_symbol("L2")

        if getattr(self.config, "include_padding", False):
            for attr in ("top_symbols", "bottom_symbols"):
                pad = getattr(self, attr, None)
                if not pad:
                    continue
                for reel in range(len(pad)):
                    if getattr(pad[reel], "name", None) == "SW":
                        pad[reel] = self.create_symbol("L2")

        if hits:
            self.get_special_symbols_on_board()

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
            pool = ["L1", "L2", "L3", "L4", "H4", "H3", "H2", "H1"]
            self.top_symbols = [
                self.create_symbol(random.choice(pool)) for _ in range(self.config.num_reels)
            ]
            self.bottom_symbols = [
                self.create_symbol(random.choice(pool)) for _ in range(self.config.num_reels)
            ]
            # Re-apply sticky SW onto padding after regenerating it.
            self.apply_fs_sw_board_rules()
        self.enrich_visual_non_winning_symbols()
        if emit_event:
            reveal_event(self)
        return True

    def enrich_visual_non_winning_symbols(self) -> None:
        """Raise high-symbol density in non-paying noise only (RTP/lines untouched)."""
        def raw_create(name: str):
            # Avoid SW mult rolls during safety clones (must not advance game RNG).
            return self.symbol_storage.create_symbol(name)

        enrich_board_non_winning(
            self.board,
            self.config,
            self.create_symbol,
            create_symbol_raw=raw_create,
            global_multiplier=getattr(self, "global_multiplier", 1) or 1,
        )
        if getattr(self.config, "include_padding", False):
            sticky = set(getattr(self, "sticky_sw", {}) or {})
            enrich_padding_symbols(
                getattr(self, "top_symbols", None),
                getattr(self, "bottom_symbols", None),
                self.create_symbol,
                sticky_sw_reels=sticky,
            )

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
        """Base: no BT. Main FS: no paw coins (PB/PS/PG→BT). Extra FS / full drum: no BT / paws.

        Also strips padding top/bottom — reveal_event includes them in the board.
        """
        drum_full = self.drum_count >= self.config.drum_max
        if self.gametype == self.config.basegame_type:
            repl = {"BT": "L2"}
        elif self.fs_extra_phase or drum_full:
            # Extra FS after shoot, or main FS once the drum is full: no bullets.
            repl = {"BT": "L2", "PB": "L2", "PS": "L2", "PG": "L2"}
        else:
            # Main FS: convert leftover paw coins → BT; keep BT from FR strips.
            repl = {"PB": "BT", "PS": "BT", "PG": "BT"}

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

    def _neutralize_board_sw_mults(self) -> list[tuple]:
        """Temporarily set SW multipliers to 1 for line eval.

        Spin productMult is applied once afterwards — otherwise symbol mults
        in Lines + product double-count (and explode with sticky columns).
        """
        saved = []
        for reel, col in enumerate(self.board):
            for row, cell in enumerate(col):
                if getattr(cell, "name", None) != "SW":
                    continue
                try:
                    prev = int(cell.get_attribute("multiplier") or 1)
                except Exception:
                    prev = 1
                saved.append((reel, row, prev))
                cell.assign_attribute({"multiplier": 1})
        return saved

    def _restore_board_sw_mults(self, saved: list[tuple]) -> None:
        for reel, row, mult in saved:
            self.board[reel][row].assign_attribute({"multiplier": int(mult)})

    def evaluate_lines_board(self, emit: bool = True):
        """Lines eval with SW as wild only; SW product applied later in feature resolve.

        emit=False: compute win_data / spin_win only (Normal FS strips non-winning SW
        before reveal, then emit_line_wins_after_reveal()).
        """
        saved = self._neutralize_board_sw_mults()
        try:
            self.win_data = Lines.get_lines(
                self.board,
                self.config,
                global_multiplier=self.global_multiplier,
            )
            Lines.record_lines_wins(self)
            self.win_manager.update_spinwin(self.win_data["totalWin"])
            if emit:
                Lines.emit_linewin_events(self)
        finally:
            self._restore_board_sw_mults(saved)

    def emit_line_wins_after_reveal(self) -> None:
        """Emit phase-1 winInfo/setWin after reveal (Normal FS book order)."""
        Lines.emit_linewin_events(self)

    def resolve_base_spin_features(self) -> None:
        """After line eval: XOR paw OR superWildExpand."""
        paws = find_paws(self.board)
        sw_hits = self._patch_sw_hit_mults(find_super_wilds(self.board))
        sw_in_win = bool(sw_positions_in_wins(sw_hits, self.win_data))
        want_paw = bool(paws)
        want_sw = bool(sw_hits) and sw_in_win
        want_paw, want_sw = resolve_xor(want_paw, want_sw)

        if want_sw:
            self._apply_super_wild_expand(sw_hits, re_eval=True)
        elif want_paw:
            self._apply_paw_resolve()

    def _sw_sticky_requires_winning_line(self) -> bool:
        """Normal FS + Duel: sticky opens only when SW sat on a winning payline. Super: no gate."""
        if self.is_super_bonus():
            return False
        if self.is_duel_betmode() or self._duel_active_side:
            return True
        return self.gametype == self.config.freegame_type

    def _sw_sticky_room(self) -> int:
        """How many more sticky SW columns may open this session."""
        return max(0, self.max_sticky_sw - len(self.sticky_sw))

    def _sw_new_per_spin_cap(self) -> int:
        """Max new lying SW cells allowed on this spin (1 when session room > 0)."""
        return min(1, self._sw_sticky_room())

    def _collect_new_lying_sw_hits(self) -> list[dict]:
        """Lying SW on non-sticky reels — at most one new cell per spin (drops extras → L2)."""
        sticky_reels = set(self.sticky_sw.keys())
        room = self._sw_new_per_spin_cap()
        new_by_reel: dict[int, dict] = {}
        for h in find_super_wilds(self.board):
            if h["reel"] in sticky_reels:
                continue
            new_by_reel.setdefault(int(h["reel"]), h)
        new_hits = self._patch_sw_hit_mults(list(new_by_reel.values()))
        if room <= 0:
            for h in new_hits:
                self.board[h["reel"]][h["row"]] = self.create_symbol("L2")
            return []
        if len(new_hits) > room:
            random.shuffle(new_hits)
            drop = new_hits[room:]
            new_hits = new_hits[:room]
            for h in drop:
                self.board[h["reel"]][h["row"]] = self.create_symbol("L2")
        return new_hits

    def _peek_new_lying_sw_hits(self) -> list[dict]:
        """Non-mutating cap preview for duel two-beat routing (board unchanged)."""
        sticky_reels = set(self.sticky_sw.keys())
        room = self._sw_new_per_spin_cap()
        new_by_reel: dict[int, dict] = {}
        for h in find_super_wilds(self.board):
            if int(h["reel"]) in sticky_reels:
                continue
            new_by_reel.setdefault(int(h["reel"]), h)
        new_hits = self._patch_sw_hit_mults(list(new_by_reel.values()))
        if room <= 0:
            return []
        if len(new_hits) > room:
            new_hits = new_hits[:room]
        return new_hits

    def _apply_sw_sticky_line_gate(self, new_hits: list[dict], *, strip: bool) -> list[dict]:
        """Keep only SW cells that participated in a winning line (Normal / Duel)."""
        if not self._sw_sticky_requires_winning_line() or not new_hits:
            return new_hits
        winning = sw_positions_in_wins(new_hits, self.win_data)
        qualified = [h for h in new_hits if (int(h["reel"]), int(h["row"])) in winning]
        if strip:
            stripped = False
            for h in new_hits:
                if (int(h["reel"]), int(h["row"])) not in winning:
                    self.board[h["reel"]][h["row"]] = self.create_symbol("L2")
                    stripped = True
            if stripped:
                self._sync_sw_padding()
                self.get_special_symbols_on_board()
        return qualified

    def _strip_non_qualifying_lying_sw(self) -> None:
        """After line eval: remove non-sticky SW that did not play in a win (Normal / Duel)."""
        if not self._sw_sticky_requires_winning_line():
            return
        sticky_reels = set(self.sticky_sw.keys())
        hits = [h for h in find_super_wilds(self.board) if int(h["reel"]) not in sticky_reels]
        self._apply_sw_sticky_line_gate(hits, strip=True)

    def init_fs_sticky_sw(self) -> None:
        """Start of FS: Super starts with one sticky open column; Normal starts empty.

        Both modes may accumulate more sticky SW columns during the bonus.
        """
        self.sticky_sw = {}
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
        self.sticky_sw[int(reel)] = int(mult)

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

    def _sync_sw_padding(self) -> None:
        """Sticky reels: SW padding. Other reels: strip padding SW (no ghost lands)."""
        if not getattr(self.config, "include_padding", False):
            return
        for reel in range(self.config.num_reels):
            if reel in self.sticky_sw:
                self._set_padding_symbol(reel, "SW", self.sticky_sw[reel])
                continue
            for attr in ("top_symbols", "bottom_symbols"):
                pad = getattr(self, attr, None)
                if not pad or reel >= len(pad):
                    continue
                if getattr(pad[reel], "name", None) == "SW":
                    pad[reel] = self.create_symbol("L2")

    def _sticky_expands_payload(self) -> list[dict]:
        expands = []
        for reel, mult in sorted(self.sticky_sw.items()):
            n_rows = int(self.config.num_rows[reel])
            expands.append(
                {
                    "reel": int(reel),
                    "row": int(random.randrange(max(1, n_rows))),
                    "mult": int(mult),
                }
            )
        return expands

    def apply_fs_sw_board_rules(self) -> None:
        """After draw: stamp sticky SW columns; allow extra lying SW on other reels."""
        conditions = self.get_current_distribution_conditions() or {}
        is_fs = self.gametype == self.config.freegame_type
        is_duel = bool(conditions.get("duel_mode")) or self.is_duel_betmode()
        if not is_fs and not is_duel:
            return

        for reel, mult in self.sticky_sw.items():
            stamp_expanded_sw_column(
                self.board,
                self.create_symbol,
                int(reel),
                int(mult),
                row=0,
            )

        sticky_reels = set(self.sticky_sw.keys())
        if self._sw_sticky_room() <= 0:
            # Session cap: no new lying SW on board or padding (sticky columns only).
            for h in find_super_wilds(self.board):
                if h["reel"] not in sticky_reels:
                    self.board[h["reel"]][h["row"]] = self.create_symbol("L2")
        else:
            # At most one lying SW per non-sticky reel, and one new SW total per spin.
            keep_one_sw_per_reel(
                self.board,
                self.create_symbol,
                skip_reels=sticky_reels,
            )
            cap_lying_sw_on_board(
                self.board,
                self.create_symbol,
                skip_reels=sticky_reels,
                max_count=1,
            )
        self._sync_sw_padding()

        if self.sticky_sw:
            expands = self._sticky_expands_payload()
            self._pending_sw_expands = expands
            self._pending_sw_product = product_of_mults(self.sticky_sw.values())
        else:
            self._pending_sw_expands = []
            self._pending_sw_product = 1
        self.get_special_symbols_on_board()

    def resolve_fs_spin_features(self) -> None:
        """FS: multi sticky SW; bullets on main FS only.

        Super: SW expands whenever present (no payline gate).
        Normal: sticky only when SW participated in a winning line (base gate + sticky).
        """
        new_hits = self._collect_new_lying_sw_hits()
        if self._sw_sticky_requires_winning_line():
            new_hits = self._apply_sw_sticky_line_gate(new_hits, strip=False)

        if new_hits:
            # New lying SW (Normal/Super): same two-beat as base —
            # phase-1 lines → curtain → phase-2 full re-eval (same lines may replay + new).
            phase1_wins = list(self.win_data.get("wins") or [])
            phase1_total = float(self.win_data.get("totalWin") or 0)
            expands_new, _ = expand_sw_columns(self.board, self.create_symbol, new_hits)
            for e in expands_new:
                self.sticky_sw[int(e["reel"])] = int(e["mult"])
            self._sync_sw_padding()
            product = product_of_mults(self.sticky_sw.values())
            super_wild_expand_event(self, self._sticky_expands_payload(), product)
            self._emit_sw_reeval_wins(product, phase1_wins, phase1_total)
            self._pending_sw_expands = []
            self._pending_sw_product = 1
        elif self.sticky_sw:
            self._apply_super_product_after_preexpand()

        if not self.fs_extra_phase:
            bullets, new_drum = collect_bullets(
                self.board, self.drum_count, self.config.drum_max
            )
            if bullets:
                self.drum_count = new_drum
                bullet_collect_event(self, bullets, self.drum_count)

    def _peek_duel_sw_mode(self) -> str:
        """Predict duel SW feature mode without mutating board (for book event order)."""
        new_hits = self._peek_new_lying_sw_hits()
        new_hits = self._apply_sw_sticky_line_gate(new_hits, strip=False)
        if new_hits:
            return "new_sw"
        if self.sticky_sw:
            return "sticky_product"
        return "none"

    def _resolve_duel_sw_features(
        self,
        side: str,
        phase1_wins: list | None = None,
        phase1_total: float | None = None,
    ) -> str:
        """Duel: sticky SW with Normal-style payline gate (per side). Super untouched."""
        new_hits = self._collect_new_lying_sw_hits()
        new_hits = self._apply_sw_sticky_line_gate(new_hits, strip=False)

        if new_hits:
            expands_new, _ = expand_sw_columns(self.board, self.create_symbol, new_hits)
            for e in expands_new:
                self.sticky_sw[int(e["reel"])] = int(e["mult"])
            self._sync_sw_padding()
            product = product_of_mults(self.sticky_sw.values())
            super_wild_expand_event(
                self,
                self._sticky_expands_payload(),
                product,
                duel_side=side,
            )
            self._emit_duel_sw_reeval_wins(
                product,
                phase1_wins=phase1_wins,
                phase1_total=phase1_total,
            )
            self._pending_sw_expands = []
            self._pending_sw_product = 1
            return "new_sw"

        if self.sticky_sw:
            self._apply_duel_super_product_after_preexpand(side)
            return "sticky_product"

        return "none"

    def _apply_duel_super_product_after_preexpand(self, side: str) -> None:
        """Sticky already open: apply product once — no expand event, no second line pass."""
        _ = side  # duel books carry side on spin events, not on product scaling
        product = int(getattr(self, "_pending_sw_product", 1) or 1)
        if not self.sticky_sw:
            self._pending_sw_expands = []
            self._pending_sw_product = 1
            return
        if product <= 1:
            self._pending_sw_expands = []
            self._pending_sw_product = 1
            return
        if self.win_manager.spin_win > 0:
            scaled = round(self.win_manager.spin_win * product, 2)
            self.win_manager.set_spin_win(scaled)
            ratio = scaled / float(self.win_data.get("totalWin") or scaled) if scaled > 0 else 1
            self.win_data["totalWin"] = scaled
            for win in self.win_data.get("wins") or []:
                win["win"] = round(float(win.get("win") or 0) * ratio, 2)
        self._pending_sw_expands = []
        self._pending_sw_product = 1

    def _apply_super_product_after_preexpand(self) -> None:
        """Sticky already open: apply product to spin win once — no second winInfo / expand."""
        product = int(getattr(self, "_pending_sw_product", 1) or 1)
        if not self.sticky_sw:
            self._pending_sw_expands = []
            self._pending_sw_product = 1
            return
        if product <= 1:
            self._pending_sw_expands = []
            self._pending_sw_product = 1
            return
        if self.win_manager.spin_win > 0:
            from src.events.events import set_win_event, set_total_event

            scaled = round(self.win_manager.spin_win * product, 2)
            ratio = scaled / float(self.win_data.get("totalWin") or scaled) if scaled > 0 else 1
            self.win_manager.set_spin_win(scaled)
            self.win_data["totalWin"] = scaled
            for win in self.win_data.get("wins") or []:
                win["win"] = round(float(win.get("win") or 0) * ratio, 2)
            set_win_event(self)
            set_total_event(self)
        self._pending_sw_expands = []
        self._pending_sw_product = 1

    def _emit_sw_reeval_wins(
        self,
        product: int,
        phase1_wins: list | None = None,
        phase1_total: float | None = None,
    ) -> None:
        """Re-eval after SW expand; emit full winInfo (same lines may replay + new).

        Final spin_win = full post-expand total × sticky product (once).
        phase1_* kept for call-site compatibility / future UX; not used to filter lines.
        """
        from src.events.events import set_total_event

        _ = phase1_wins, phase1_total

        saved = self._neutralize_board_sw_mults()
        try:
            self.win_data = Lines.get_lines(
                self.board,
                self.config,
                global_multiplier=self.global_multiplier,
            )
        finally:
            self._restore_board_sw_mults(saved)

        raw_total = float(self.win_data.get("totalWin") or 0)
        prod = max(1, int(product))
        new_total = round(raw_total * prod, 2)
        if prod > 1 and raw_total > 0:
            self.win_data["totalWin"] = new_total
            for win in self.win_data.get("wins") or []:
                win["win"] = round(float(win.get("win") or 0) * prod, 2)

        self.win_manager.set_spin_win(new_total)
        if new_total > 0:
            Lines.record_lines_wins(self)
            Lines.emit_linewin_events(self)
        else:
            set_total_event(self)

    def _emit_duel_sw_reeval_wins(
        self,
        product: int,
        phase1_wins: list | None = None,
        phase1_total: float | None = None,
    ) -> None:
        """Re-eval after SW expand for duel — full line set (same lines may replay + new)."""
        _ = phase1_wins, phase1_total

        saved = self._neutralize_board_sw_mults()
        try:
            self.win_data = Lines.get_lines(
                self.board,
                self.config,
                global_multiplier=self.global_multiplier,
            )
        finally:
            self._restore_board_sw_mults(saved)

        raw_total = float(self.win_data.get("totalWin") or 0)
        prod = max(1, int(product))
        new_total = round(raw_total * prod, 2)
        if prod > 1 and raw_total > 0:
            self.win_data["totalWin"] = new_total
            for win in self.win_data.get("wins") or []:
                win["win"] = round(float(win.get("win") or 0) * prod, 2)

        self.win_manager.set_spin_win(new_total)
        if new_total <= 0:
            self.win_data = {"totalWin": 0.0, "wins": []}

    def _apply_super_wild_expand(self, sw_hits, re_eval: bool = True) -> None:
        expands, product = expand_sw_columns(self.board, self.create_symbol, sw_hits)
        self._last_sw_expands = expands
        if not expands:
            return
        phase1_wins = list(self.win_data.get("wins") or [])
        phase1_total = float(self.win_data.get("totalWin") or 0)
        # Curtain before post-expand winInfo so basegame can show two beats:
        # lying-SW lines → expand → re-eval lines (× product).
        super_wild_expand_event(self, expands, product)
        if re_eval:
            self._emit_sw_reeval_wins(product, phase1_wins, phase1_total)

    def _apply_paw_resolve(self) -> None:
        paws, rows, total = build_paw_resolve(self.board, bet=1.0)
        if not paws:
            return
        paw_coin_resolve_event(self, paws, rows, total)
        if total > 0:
            from src.events.event_constants import EventConstants
            from src.events.events import set_total_event

            self.win_manager.update_spinwin(total)
            # Second celebration beat: paw coin total only (lines already had setWin).
            if not self.wincap_triggered:
                self.book.add_event(
                    {
                        "index": len(self.book.events),
                        "type": EventConstants.SET_WIN.value,
                        "amount": int(
                            min(
                                round(total * 100, 0),
                                self.config.wincap * 100,
                            )
                        ),
                        "winLevel": self.config.get_win_level(total),
                    }
                )
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
