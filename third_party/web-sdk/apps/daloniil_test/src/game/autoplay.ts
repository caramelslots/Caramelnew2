/**
 * autoplay.ts — единая таблица доступных значений Cash Stacks для autoplay.
 *
 * SDK-шный AUTO_SPINS_TEXT_OPTION_MAP содержит фиксированный набор
 * (10/25/50/75/100/250/500/1000/∞), а нам нужны кастомные значения с шагом
 * 10/20/30/40/50/70/100/500/1000 без бесконечности. Чтобы оба места
 * (FeaturesAutoSpinOverlay для слайдера и CashStacksStartAutoplayButton
 * для запуска по клику на Spin) использовали один и тот же источник правды,
 * экспортируем их отсюда.
 */
export const CASH_STACKS_ROUND_OPTIONS = [
	'10',
	'20',
	'30',
	'40',
	'50',
	'70',
	'100',
	'500',
	'1000',
] as const;

export type CashStacksRoundOption = (typeof CASH_STACKS_ROUND_OPTIONS)[number];

export const CASH_STACKS_ROUND_VALUE_MAP: Record<CashStacksRoundOption, number> = {
	'10': 10,
	'20': 20,
	'30': 30,
	'40': 40,
	'50': 50,
	'70': 70,
	'100': 100,
	'500': 500,
	'1000': 1000,
};

/** Дефолт по дизайну Cash Stacks (предвыбран при первом открытии модалки). */
export const CASH_STACKS_DEFAULT_ROUND: CashStacksRoundOption = '50';

/**
 * Безопасно конвертирует значение из state.autoSpinsText (которое могло
 * остаться от SDK-defaults '10' или быть кастомным) в счётчик авто-вращений.
 * Если значение вне нашего списка — fallback на дефолт.
 */
export const getRoundsCounter = (text: string): number =>
	CASH_STACKS_ROUND_VALUE_MAP[text as CashStacksRoundOption] ??
	CASH_STACKS_ROUND_VALUE_MAP[CASH_STACKS_DEFAULT_ROUND];
