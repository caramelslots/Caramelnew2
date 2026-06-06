"""Cash Stacks game-state — лoop для одного раунда."""

from game_override import GameStateOverride
from src.events.events import reveal_event


class GameState(GameStateOverride):
    """Cash Stacks lines-pay slot, 5×5, 20 paylines.

    Базовая игра — стандартный lines flow (как 0_0_lines).
    Free Spins расширены Progress Ladder / Sticky Mystery Reels / Super Bonus.
    """

    def run_spin(self, sim, simulation_seed=None):
        self.reset_seed(sim)
        self.repeat = True
        while self.repeat:
            self.reset_book()
            self.draw_board()
            # Cash Stacks spec: max 1 B per reel, max 4 B on board.
            self.enforce_bonus_symbol_rules()

            # Base game line evaluation.
            self.evaluate_lines_board()

            self.win_manager.update_gametype_wins(self.gametype)
            if self.check_fs_condition():
                # 3× B → Normal Bonus FS profile; 4× B → Super Bonus FS profile.
                self.apply_fs_profile_from_trigger()
                self.emit_fs_trigger_bonus_collect()
                self.run_freespin_from_base()

            self.evaluate_finalwin()
            self.check_repeat()
        self.imprint_wins()

    def run_freespin(self):
        self.reset_fs_spin()

        # Super Bonus (4+ B trigger or purchased bonus_super): 1 sticky
        # mystery reel at a random position. Normal Bonus (3 B): none at start.
        if self.is_super_bonus():
            self.init_super_bonus_mystery_reels()

        while self.fs < self.tot_fs:
            self.update_freespin()
            # draw_board сам эмитит reveal_event с reelstrip-доской. Если на этом
            # спине есть активные Mystery Reels — суппрессим первый reveal,
            # накрываем reels символом M и эмитим reveal с M-state, чтобы
            # клиент сразу увидел маскированную доску.
            if self.mystery_reels:
                self.draw_board(emit_event=False)
                # Mystery reels замаскируют целиком — но B вне mystery reels
                # всё ещё нужно дедупить (1 per reel spec).
                self.enforce_bonus_symbol_rules()
                self.apply_mystery_reels()
                reveal_event(self)
            else:
                self.draw_board()
                self.enforce_bonus_symbol_rules()

            # 1. Раскрытие Sticky Mystery Reels: M → revealed symbol (real substitution).
            #    Клиент анимирует reveal, math продолжает счёт по раскрытой доске.
            self.emit_mystery_reveal()

            # 2. Считаем Bonus, если есть — эмитим bonus_collect, апаем Progress Ladder.
            self.collect_bonus_symbols()
            self.check_ladder_tier_up()

            # 3. Стандартный line-pay evaluation (доска уже raised).
            self.evaluate_lines_board()

            # NB: В Cash Stacks retrigger FS-спинов идёт через Progress Ladder
            # (см. check_ladder_tier_up: +3 spins на каждый tier). Стандартный SDK
            # scatter-retrigger НЕ используется, чтобы не дублировать награды.

            self.win_manager.update_gametype_wins(self.gametype)

        self.end_freespin()
