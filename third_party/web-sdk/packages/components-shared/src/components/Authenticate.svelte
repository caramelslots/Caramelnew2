<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	import { requestAuthenticate, requestReplay } from 'rgs-requests';
	import {
		stateUrlDerived,
		stateBet,
		stateBetDerived,
		stateConfig,
		stateMeta,
		stateModal,
		stateUi,
	} from 'state-shared';
	import { API_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

	type Props = { children: Snippet };

	const props: Props = $props();

	let authenticated = $state(false);

	const fromApiAmount = (value: number | undefined | null) =>
		(value ?? 0) / API_AMOUNT_MULTIPLIER;

	type AuthModeConfig = {
		costMultiplier?: number;
		mode?: string;
		maxBet?: number;
	};

	/**
	 * Stake/RGS may send modes as `betModes` map or `gameModes` array.
	 * Normalize to a flat list of { mode, costMultiplier, ... }.
	 */
	const resolveAuthModeConfigs = (config: {
		betModes?: Record<string, AuthModeConfig>;
		gameModes?: AuthModeConfig[];
	}): AuthModeConfig[] => {
		if (Array.isArray(config.gameModes) && config.gameModes.length > 0) {
			return config.gameModes;
		}
		if (config.betModes && typeof config.betModes === 'object') {
			return Object.entries(config.betModes).map(([key, modeConfig]) => ({
				...modeConfig,
				mode: modeConfig?.mode ?? key,
			}));
		}
		return [];
	};

	/** Apply costMultiplier from authenticate mode list onto existing local mode meta. */
	const applyBetModeCostMultipliers = (modeConfigs: AuthModeConfig[]) => {
		for (const modeConfig of modeConfigs) {
			const costMultiplier = modeConfig?.costMultiplier;
			if (typeof costMultiplier !== 'number' || !(costMultiplier > 0)) continue;

			const rawMode = modeConfig.mode;
			if (!rawMode) continue;

			const keys = new Set([
				rawMode,
				rawMode.toUpperCase(),
				rawMode.toLowerCase(),
			]);

			for (const key of keys) {
				if (!key || !(key in stateMeta.betModeMeta)) continue;
				stateMeta.betModeMeta[key] = {
					...stateMeta.betModeMeta[key],
					costMultiplier,
				};
			}
		}
	};

	const authenticate = async () => {
		try {
			const authenticateData = await requestAuthenticate({
				rgsUrl: stateUrlDerived.rgsUrl(),
				sessionID: stateUrlDerived.sessionID(),
				language: stateUrlDerived.lang(),
			});

			// error
			if (authenticateData?.error) throw authenticateData;

			// balance
			if (authenticateData?.balance) {
				// Example of authenticateData.balance
				// {
				// 		"amount": 10000000000000000,
				// 		"currency": "USD"
				// },
				stateBet.currency = authenticateData.balance.currency;
				stateBet.balanceAmount = fromApiAmount(authenticateData.balance.amount);
			}

			// config
			if (authenticateData?.config) {
				// Example of authenticateData.config
				// {
				// 	"gameID": "37_test-lines",
				// 	"minBet": 100000,
				// 	"maxBet": 1000000000,
				// 	"stepBet": 10000,
				// 	"defaultBetLevel": 1000000,
				// 	"betLevels": [100000, 200000, ..., 1000000000],
				// 	"betModes": {},
				// 	"jurisdiction": { ... }
				// }
				const config = authenticateData.config;

				if (config.jurisdiction) {
					stateConfig.jurisdiction = config.jurisdiction;
				}

				stateConfig.minBet = fromApiAmount(config.minBet);
				stateConfig.maxBet = fromApiAmount(config.maxBet);
				stateConfig.stepBet = fromApiAmount(config.stepBet);
				stateConfig.defaultBetLevel = fromApiAmount(config.defaultBetLevel);

				const betLevels = (config.betLevels || []).map((level) => fromApiAmount(level));
				if (betLevels.length > 0) {
					// Keep ladder fully driven by authenticate (no MOST_USED subset).
					stateConfig.betAmountOptions = betLevels;
					stateConfig.betMenuOptions = [...betLevels];
				}

				applyBetModeCostMultipliers(
					resolveAuthModeConfigs(
						config as {
							betModes?: Record<string, AuthModeConfig>;
							gameModes?: AuthModeConfig[];
						},
					),
				);

				// Initial bet from defaultBetLevel when there is no active round amount below.
				const hasRoundAmount = Boolean(authenticateData.round?.amount);
				if (!hasRoundAmount) {
					const defaultBet =
						stateConfig.defaultBetLevel > 0
							? stateConfig.defaultBetLevel
							: (betLevels[0] ?? stateBet.betAmount);
					stateBetDerived.setBetAmount(defaultBet);
					stateBet.wageredBetAmount = stateBet.betAmount;
				}
			}

			// round
			if (authenticateData?.round) {
				// Example of authenticateData.round
				// {
				// 	"betID": 62277967,
				// 	"amount": 1000000,
				// 	"payout": 33400000,
				// 	"payoutMultiplier": 33.4,
				// 	"active": true,
				// 	"state": [...],
				// 	"mode": "BONUS",
				// 	"event": null
				// }

				if (authenticateData.round?.state) {
					// @ts-ignore
					stateBet.betToResume = authenticateData.round;
				}

				if (authenticateData.round?.amount) {
					const betAmountValue =
						authenticateData.round.amount > 0
							? fromApiAmount(authenticateData.round.amount)
							: 0;
					stateBetDerived.setBetAmount(betAmountValue);
					stateBet.wageredBetAmount = stateBet.betAmount;
				}

				if (authenticateData.round?.mode) {
					stateBet.activeBetModeKey = authenticateData.round.mode;
				}
			}
		} catch (error) {
			console.error(error);
			stateModal.modal = { name: 'error', error };
		}
	};

	const handleReplay = async () => {
		const modeKey = stateUrlDerived.mode();
		const baseBet = fromApiAmount(stateUrlDerived.amount()) || 0;
		// Replay has no wallet/balance — do NOT use setBetAmount (it snaps to
		// affordable ladder levels and collapses to min when balance is 0).
		stateBet.betAmount = baseBet;
		stateBet.wageredBetAmount = baseBet;
		if (modeKey) stateBet.activeBetModeKey = modeKey;

		const data = await requestReplay({
			rgsUrl: stateUrlDerived.rgsUrl(),
			game: stateUrlDerived.game(),
			mode: modeKey,
			version: stateUrlDerived.version(),
			event: stateUrlDerived.event(),
			language: stateUrlDerived.lang(),
		});

		if (!data || (data as { error?: unknown }).error) {
			stateModal.modal = { name: 'error', error: data ?? 'replay failed' };
			return;
		}

		const modeMeta =
			stateMeta.betModeMeta?.[modeKey] ??
			stateMeta.betModeMeta?.[modeKey.toUpperCase()] ??
			stateMeta.betModeMeta?.[modeKey.toLowerCase()];
		const costMultiplier =
			typeof modeMeta?.costMultiplier === 'number' && modeMeta.costMultiplier > 0
				? modeMeta.costMultiplier
				: 1;
		const payoutMultiplier =
			typeof (data as { payoutMultiplier?: number }).payoutMultiplier === 'number'
				? (data as { payoutMultiplier: number }).payoutMultiplier
				: 0;
		const payoutRaw = (data as { payout?: number }).payout;
		const totalWin =
			typeof payoutRaw === 'number'
				? fromApiAmount(payoutRaw)
				: baseBet * payoutMultiplier;

		// Do not auto-start — show Bet Replay summary first (checklist + screenshot UX).
		stateUi.replay = {
			payload: data,
			modeKey,
			baseBet,
			costMultiplier,
			totalBetCost: baseBet * costMultiplier,
			payoutMultiplier,
			totalWin,
		};
		stateModal.modal = { name: 'betReplay' };
	};

	onMount(async () => {
		if (stateUrlDerived.replay()) {
			stateUi.config.mode = 'replay';
			await handleReplay();
		} else {
			stateUi.config.mode = 'default';
			await authenticate();
		}

		authenticated = true;
	});
</script>

{#if authenticated}
	{@render props.children()}
{/if}
