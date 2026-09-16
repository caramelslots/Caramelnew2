"""Cat Mafia executables — lines eval lives in game_override for feature hooks."""

from game_calculations import GameCalculations


class GameExecutables(GameCalculations):
    """Base executable layer; Cat Mafia overrides evaluate_lines_board in GameStateOverride."""

    pass
