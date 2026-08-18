import type { EmitterEventBoard } from '../components/Board.svelte';
import type { EmitterEventFreeSpinIntro } from '../components/FreeSpinIntro.svelte';
import type { EmitterEventFreeSpinCounter } from '../components/FreeSpinCounter.svelte';
import type { EmitterEventFreeSpinOutro } from '../components/FreeSpinOutro.svelte';
import type { EmitterEventWin } from '../components/Win.svelte';
import type { EmitterEventSound } from '../components/Sound.svelte';
import type { EmitterEventTransition } from '../components/Transition.svelte';
import type { EmitterEventPaylineOverlay } from '../components/PaylineOverlay.svelte';
import type { EmitterEventPaylineWinAmount } from '../components/PaylineWinAmounts.svelte';
import type { EmitterEventMysteryReelUnlockOverlay } from '../components/MysteryReelUnlockOverlay.svelte';
import type { EmitterEventFreeSpinTargetPick } from '../components/TargetPickOverlay.svelte';
import type { EmitterEventTargetShootRound } from '../components/TargetShootOverlay.svelte';

export type EmitterEventGame =
	| EmitterEventBoard
	| EmitterEventWin
	| EmitterEventFreeSpinIntro
	| EmitterEventFreeSpinCounter
	| EmitterEventFreeSpinOutro
	| EmitterEventSound
	| EmitterEventTransition
	| EmitterEventPaylineOverlay
	| EmitterEventPaylineWinAmount
	| EmitterEventMysteryReelUnlockOverlay
	| EmitterEventFreeSpinTargetPick
	| EmitterEventTargetShootRound;
