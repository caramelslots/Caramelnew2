/**
 * autoplay.ts — диапазон раундов Wok Fury для autoplay.
 *
 * Слайдер позволяет выбрать любое целое от MIN до MAX (10–100).
 * Метки 10/25/50/75/100 на bg_auto — только визуальный ориентир.
 */
import {
	stateUi,
	stateBet,
	stateBetDerived,
	stateModal,
	AUTO_SPINS_LOSS_LIMIT_MULTIPLIER_MAP,
	AUTO_SPINS_SINGLE_WIN_LIMIT_MULTIPLIER_MAP,
} from 'state-shared';

import { canAffordSpin } from './buyBonusBalance';

export const CASH_STACKS_MIN_ROUNDS = 10;
export const CASH_STACKS_MAX_ROUNDS = 100;

/** Дефолт по дизайну Wok Fury (предвыбран при первом открытии модалки). */
export const CASH_STACKS_DEFAULT_ROUND = 50;

/** Метки на фоне bg_auto.png — не ограничивают выбор. */
export const CASH_STACKS_ROUND_LABELS = [10, 25, 50, 75, 100] as const;

export const clampRounds = (value: number): number =>
	Math.min(CASH_STACKS_MAX_ROUNDS, Math.max(CASH_STACKS_MIN_ROUNDS, Math.round(value)));

/**
 * Безопасно конвертирует значение из state.autoSpinsText в счётчик авто-вращений.
 * Принимает любое целое в диапазоне 10–100; иначе — fallback на дефолт.
 */
export const getRoundsCounter = (text: string): number => {
	const parsed = Number.parseInt(text, 10);
	if (!Number.isFinite(parsed)) return CASH_STACKS_DEFAULT_ROUND;
	return clampRounds(parsed);
};

export const roundsToProgress = (rounds: number): number => {
	const span = CASH_STACKS_MAX_ROUNDS - CASH_STACKS_MIN_ROUNDS;
	if (span <= 0) return 0;
	return (clampRounds(rounds) - CASH_STACKS_MIN_ROUNDS) / span;
};

export const progressToRounds = (progress: number): number =>
	clampRounds(
		CASH_STACKS_MIN_ROUNDS +
			Math.max(0, Math.min(1, progress)) * (CASH_STACKS_MAX_ROUNDS - CASH_STACKS_MIN_ROUNDS),
	);

type AutoplayBroadcastEvent = { type: 'soundPressGeneral' } | { type: 'autoBet' };

/** Запускает автоигру с текущими параметрами из stateUi/stateBet. */
export const launchCashStacksAutoplay = (
	broadcast: (event: AutoplayBroadcastEvent) => void,
): boolean => {
	if (!canAffordSpin()) return false;
	stateBet.autoSpinsCounter = getRoundsCounter(stateUi.autoSpinsText);
	stateBet.autoSpinsLossLimitAmount =
		stateBet.betAmount * AUTO_SPINS_LOSS_LIMIT_MULTIPLIER_MAP[stateUi.autoSpinsLossLimitText];
	stateBet.autoSpinsSingleWinLimitAmount =
		stateBet.betAmount *
		AUTO_SPINS_SINGLE_WIN_LIMIT_MULTIPLIER_MAP[stateUi.autoSpinsSingleWinLimitText];
	if (stateBetDerived.activeBetMode().type === 'buy') stateBet.activeBetModeKey = 'BASE';
	broadcast({ type: 'soundPressGeneral' });
	broadcast({ type: 'autoBet' });
	stateModal.modal = null;
	return true;
};
