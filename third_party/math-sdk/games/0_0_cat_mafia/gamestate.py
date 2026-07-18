"""Cat Mafia game-state — base + free-spin loops."""

from game_override import GameStateOverride


class GameState(GameStateOverride):
    """Cat Mafia lines slot, 5×4, ~20 paylines."""

    def run_spin(self, sim, simulation_seed=None):
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

    def run_freespin(self):
        self.reset_fs_spin()
        self.drum_count = 0
        self.fs_extra_phase = False
        self.fs_main_total = int(self.tot_fs)
        self._pending_sw_expands = []
        self._pending_sw_product = 1

        while self.fs < self.tot_fs and not self.wincap_triggered:
            self.update_freespin()
            self.draw_board()

            if self.is_super_bonus():
                self.apply_super_sw_pre_expand()

            self.evaluate_lines_board()
            self.resolve_fs_spin_features()
            self.win_manager.update_gametype_wins(self.gametype)

            # After last main FS — auto shoot (may award extra FS).
            if self.fs == self.fs_main_total and not self.fs_extra_phase:
                self.run_target_shoot_round()

        # Ensure shoot ran even if wincap cut the loop short during main FS.
        if not self.fs_extra_phase and self.fs_main_total > 0:
            self.run_target_shoot_round()

        self.end_freespin()
