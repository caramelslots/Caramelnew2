"""Cat Mafia game-state — base + free-spin + Duel loops."""

from src.events.events import reveal_event

from game_override import GameStateOverride
from game_events import duel_start_event, duel_bank_update_event, duel_end_event
from src.events.events import set_total_event


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

    def run_duel(self, sim, simulation_seed=None):
        """Buy Duel session: 10 pairs of (cat, dog) base-rule spins → compare banks."""
        self.reset_seed(sim)
        self.repeat = True
        total_spins = 10
        player_side = self.resolve_duel_player_side()

        while self.repeat:
            self.reset_book()
            self.duel_dog_total = 0.0
            self.duel_cat_total = 0.0
            self.duel_winner = None
            self.duel_payout = 0.0
            self.duel_player_side = player_side
            self.duel_player_won = False
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

            dog_total = 0.0
            cat_total = 0.0

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

                    # Soft/hard fence: stop once combined banks already exceed cap on a
                    # winning path (player's side ahead). Losing path payout stays 0.
                    projected = round(dog_total + cat_total, 2)
                    player_ahead = (
                        cat_total > dog_total
                        if player_side == "cat"
                        else dog_total > cat_total
                    )
                    if projected >= self._fence_win_cap() and player_ahead:
                        self.wincap_triggered = True
                        break

            winner, payout = self.settle_duel_payout(dog_total, cat_total)
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
                winner=winner,
                payout=payout,
                win_level=win_level,
                player_side=self.duel_player_side,
                player_won=self.duel_player_won,
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
                # Super: unchanged book order (reveal → lines → expand).
                self.draw_board()
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
