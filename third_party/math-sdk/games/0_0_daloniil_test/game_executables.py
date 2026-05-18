"""Cash Stacks game-specific executables.

Inherits all standard SDK helpers; overrides the lines-evaluation hook so
optional Cash Stacks adjustments (e.g. ignoring `B`/`M` for line wins) can be
plugged in later. For Этап 2 mock — same behaviour as 0_0_lines:
`Lines.get_lines` ignores symbols that have no paytable entry, so `B` and `M`
безопасно проигнорируются.
"""

from game_calculations import GameCalculations
from src.calculations.lines import Lines


class GameExecutables(GameCalculations):

    def evaluate_lines_board(self):
        """Populate win-data, record wins, transmit events."""
        self.win_data = Lines.get_lines(
            self.board,
            self.config,
            global_multiplier=self.global_multiplier,
        )
        Lines.record_lines_wins(self)
        self.win_manager.update_spinwin(self.win_data["totalWin"])
        Lines.emit_linewin_events(self)
