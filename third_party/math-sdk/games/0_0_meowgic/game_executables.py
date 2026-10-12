"""Meowgic executables — lines eval lives in game_override for feature hooks."""

from game_calculations import GameCalculations


class GameExecutables(GameCalculations):
    """Base executable layer; Meowgic overrides evaluate_lines_board in GameStateOverride."""

    pass
