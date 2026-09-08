import { stateModal, stateUi } from 'state-shared';

/** Settings panel or any modal overlay — Space must not spin / space-hold. */
export const isAnyMenuOpen = () => stateUi.menuOpen || stateModal.modal != null;

/** Buy-bonus menu, confirm, duel pick, and duel-pick confirm (same modal name). */
export const isBuyBonusFlowOpen = () => {
	const name = stateModal.modal?.name;
	return name === 'buyBonus' || name === 'buyBonusConfirm' || name === 'buyDuelPick';
};
