"""Cat Mafia game-state — base + free-spin + Duel loops."""

import random

from src.events.events import reveal_event

from game_override import GameStateOverride
from game_events import duel_start_event, duel_bank_update_event, duel_end_event
from src.events.events import set_total_event
from duel_intrigue import apply_duel_intrigue_to_book
from duel_competition import competition_accept, competition_enabled


class GameState(GameStateOverride):
    """Cat Mafia lines slot, 5×4, ~20 paylines."""

    def run_spin(self, sim, simulation_seed=None):
        if self.is_duel_betmode():
            self.run_duel(sim, simulation_seed)
            return

        self.reset_seed(sim)
        self.repeat = True
        while self.repeat:
            self.reset_book()
            self.draw_board()

            self.evaluate_lines_board()
            self.resolve_base_spin_features()

            self.win_manager.update_gametype_wins(self.gametype)
            if self.check_fs_condition() and not self.wincap_triggered:
                self.apply_fs_profile_from_trigger()
                self.emit_free_spin_target_pick()
                self.run_freespin_from_base()

            self.evaluate_finalwin()
            self.check_repeat()
        self.imprint_wins()

    def _run_duel_spin_loop(self, player_side: str, total_spins: int) -> tuple[float, float]:
        """Honest cat/dog spins; returns (dog_total, cat_total)."""
        dog_total = 0.0
        cat_total = 0.0
        self.wincap_triggered = False
        self.duel_sticky_sw = {"cat": {}, "dog": {}}

        for spin_index in range(1, total_spins + 1):
            if self.wincap_triggered:
                break
            for side in ("cat", "dog"):
                if self.wincap_triggered:
                    break
                spin_win = self.run_duel_side_spin(side, spin_index)
                if side == "cat":
                    cat_total = round(cat_total + spin_win, 2)
                    side_total = cat_total
                else:
                    dog_total = round(dog_total + spin_win, 2)
                    side_total = dog_total

                duel_bank_update_event(
                    self,
                    side=side,
                    spin_win=spin_win,
                    side_total=side_total,
                    dog_total=dog_total,
                    cat_total=cat_total,
                )

                projected = round(dog_total + cat_total, 2)
                player_ahead = (
                    cat_total > dog_total
                    if player_side == "cat"
                    else dog_total > cat_total
                )
                if projected >= self._fence_win_cap() and player_ahead:
                    self.wincap_triggered = True
                    break

        return dog_total, cat_total

    def _duel_force_skip_retry(self) -> bool:
        """force_wincap / broken conditions must not be rejection-resampled."""
        try:
            cond = self.get_current_distribution_conditions() or {}
        except Exception:  # noqa: BLE001
            return True
        if not isinstance(cond, dict):
            return True
        return bool(cond.get("force_wincap"))

    def run_duel(self, sim, simulation_seed=None):
        """Buy Duel session: 10 pairs of (cat, dog) base-rule spins → compare banks.

        Competition quotas do NOT nest retries here — empty/steamroll outcomes set
        duel_comp_ok=False and check_repeat re-rolls (same loop as win/lose fences).
        """
        self.reset_seed(sim)
        self.repeat = True
        total_spins = 10
        player_side = self.resolve_duel_player_side()
        mode = str(getattr(self, "betmode", "") or "")

        while self.repeat:
            self.reset_book()
            self.duel_dog_total = 0.0
            self.duel_cat_total = 0.0
            self.duel_winner = None
            self.duel_payout = 0.0
            self.duel_player_side = player_side
            self.duel_player_won = False
            self.duel_comp_ok = True
            self.wincap_triggered = False
            self.duel_sticky_sw = {"cat": {}, "dog": {}}

            # Purchase spin: exactly 3× BD (math symbol), never B / never on strips.
            self.emit_duel_purchase_reveal()
            set_total_event(self)

            duel_start_event(
                self,
                total_spins_per_side=total_spins,
                player_side=player_side,
            )

            dog_total, cat_total = self._run_duel_spin_loop(player_side, total_spins)
            winner, payout = self.settle_duel_payout(dog_total, cat_total)

            # Soft filter: reject empty loses / steamroll wins via outer check_repeat.
            if competition_enabled() and not self._duel_force_skip_retry():
                self.duel_comp_ok = competition_accept(
                    mode=mode,
                    player_won=bool(self.duel_player_won),
                    dog_total=self.duel_dog_total,
                    cat_total=self.duel_cat_total,
                    player_side=player_side,
                )
            else:
                self.duel_comp_ok = True

            # Classify honest path only — never reorder/scale/pad banks or wins.
            rng = random.Random((int(sim) * 1000003 + 17) & 0xFFFFFFFF)
            intrigue_shape = apply_duel_intrigue_to_book(
                self.book.events,
                dog_total=self.duel_dog_total,
                cat_total=self.duel_cat_total,
                winner=self.duel_winner or winner,
                rng=rng,
                player_side=self.duel_player_side,
                player_won=self.duel_player_won,
            )

            win_level = None
            if payout > 0:
                try:
                    win_level = int(self.config.get_win_level(payout))
                except Exception:  # noqa: BLE001
                    win_level = 1

            duel_end_event(
                self,
                dog_total=self.duel_dog_total,
                cat_total=self.duel_cat_total,
                winner=self.duel_winner or winner,
                payout=payout,
                win_level=win_level,
                player_side=self.duel_player_side,
                player_won=self.duel_player_won,
                intrigue_shape=intrigue_shape,
            )

            self.evaluate_finalwin()
            self.check_repeat()

        self.imprint_wins()

    def run_freespin(self):
        self.reset_fs_spin()
        self.drum_count = 0
        self.fs_extra_phase = False
        self.fs_main_total = int(self.tot_fs)
        self.init_fs_sticky_sw()

        while self.fs < self.tot_fs and not self.wincap_triggered:
            self.update_freespin()
            if self.is_super_bonus():
                # Super + new lying SW: same two-beat book order as Normal
                # (reveal → phase-1 winInfo → expand → phase-2), but never strip
                # non-winning SW — curtain always opens on a new hit.
                self.draw_board(emit_event=False)
                if self._peek_new_lying_sw_hits():
                    self.evaluate_lines_board(emit=False)
                    reveal_event(self)
                    self.emit_line_wins_after_reveal()
                    self.resolve_fs_spin_features()
                else:
                    # Sticky-only / no new SW: reveal then lines + product (no strip).
                    reveal_event(self)
                    self.evaluate_lines_board()
                    self.resolve_fs_spin_features()
            else:
                # Normal: eval + strip non-winning SW before reveal, then
                # reveal → phase-1 winInfo → expand (only if SW was in a line).
                # Never emit winInfo before reveal (that caused phantom lines).
                self.draw_board(emit_event=False)
                self.evaluate_lines_board(emit=False)
                self._strip_non_qualifying_lying_sw()
                reveal_event(self)
                self.emit_line_wins_after_reveal()
                self.resolve_fs_spin_features()
            self.win_manager.update_gametype_wins(self.gametype)

            # After last main FS — auto shoot (may award extra FS).
            if self.fs == self.fs_main_total and not self.fs_extra_phase:
                self.run_target_shoot_round()

        # Ensure shoot ran even if wincap cut the loop short during main FS.
        if not self.fs_extra_phase and self.fs_main_total > 0:
            self.run_target_shoot_round()

        self.end_freespin()
