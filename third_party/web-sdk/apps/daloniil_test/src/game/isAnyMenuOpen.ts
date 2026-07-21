import { stateModal, stateUi } from 'state-shared';

/** Settings panel or any modal overlay — Space must not spin / space-hold. */
export const isAnyMenuOpen = () => stateUi.menuOpen || stateModal.modal != null;
