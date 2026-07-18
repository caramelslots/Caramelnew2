<script lang="ts">
	/**
	 * Cat Mafia mascot — right of board (above bag target for paw coins).
	 */
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { BOARD_LAYOUT_OFFSETS } from '../game/constants';
	import { MASCOT_ASSETS } from '../game/uiHtmlAssetManifest';

	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const isDesktop = $derived(context.stateLayoutDerived.layoutType() === 'desktop');
	const pose = $derived(
		context.stateGame.bulletFly ? 'load' : context.stateGame.mascotPose || 'idle',
	);

	const style = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const layoutType = context.stateLayoutDerived.layoutType();
		const off = BOARD_LAYOUT_OFFSETS[layoutType] ?? { x: 0, y: 0 };
		const boardCenterX = ml.x + off.x * ml.scale;
		const boardCenterY = ml.y + off.y * ml.scale;
		const board = context.stateGameDerived.boardLayout();
		const halfW = (board.visualWidth / 2) * ml.scale;
		const halfH = (board.visualHeight / 2) * ml.scale;

		const w = 260;
		const h = 260;
		// Fully to the right of the board (no overlap with symbols).
		const left = boardCenterX + halfW + 16;
		const top = boardCenterY + halfH * 0.15 - h * 0.35;

		return `left:${left}px;top:${top}px;width:${w}px;height:${h}px;`;
	});
</script>

{#if show && isDesktop}
	<div class="mascot {pose}" style={style} aria-hidden="true">
		<img class="body" src={MASCOT_ASSETS.body} alt="" draggable="false" />
		{#if pose === 'shoot'}
			<span class="muzzle"></span>
		{/if}
	</div>
{/if}

<style lang="scss">
	.mascot {
		position: fixed;
		z-index: 42;
		pointer-events: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		transform-origin: 50% 90%;
	}

	.mascot.idle {
		animation: mascot-idle 2.4s ease-in-out infinite;
	}

	.mascot.load {
		animation: mascot-load 0.38s ease-out;
	}

	.mascot.aim {
		transform: rotate(-6deg) translateY(-4px);
	}

	.mascot.shoot {
		animation: mascot-shoot 0.28s ease-out;
	}

	.mascot.clap {
		animation: mascot-clap 0.55s ease-in-out infinite;
	}

	.mascot.react {
		animation: mascot-react 0.5s ease-out;
	}

	.mascot.wow {
		animation: mascot-wow 0.7s ease-in-out infinite;
	}

	.muzzle {
		position: absolute;
		top: 42%;
		left: 62%;
		width: 22px;
		height: 7px;
		border-radius: 3px;
		background: linear-gradient(90deg, #f0d78c, transparent);
		box-shadow: 0 0 12px rgba(240, 215, 140, 0.85);
		z-index: 3;
		animation: muzzle-flash 0.28s ease-out;
	}

	.body {
		width: 100%;
		height: 100%;
		object-fit: contain;
		object-position: center bottom;
		display: block;
		filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.55));
	}

	@keyframes mascot-idle {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}

	@keyframes mascot-load {
		0% {
			transform: scale(1) translateY(0);
		}
		40% {
			transform: scale(1.08) translateY(-8px);
		}
		100% {
			transform: scale(1) translateY(0);
		}
	}

	@keyframes mascot-shoot {
		0% {
			transform: rotate(-6deg) translate(0, -4px);
		}
		35% {
			transform: rotate(-10deg) translate(-6px, -2px);
		}
		100% {
			transform: rotate(-6deg) translate(0, -4px);
		}
	}

	@keyframes mascot-clap {
		0%,
		100% {
			transform: rotate(0deg) scale(1);
		}
		25% {
			transform: rotate(-8deg) scale(1.04);
		}
		75% {
			transform: rotate(8deg) scale(1.04);
		}
	}

	@keyframes mascot-react {
		0% {
			transform: scale(1) translateY(0);
		}
		30% {
			transform: scale(1.12) translateY(-10px);
		}
		100% {
			transform: scale(1) translateY(0);
		}
	}

	@keyframes mascot-wow {
		0%,
		100% {
			transform: scale(1) rotate(0deg);
		}
		25% {
			transform: scale(1.1) rotate(-4deg) translateY(-6px);
		}
		75% {
			transform: scale(1.1) rotate(4deg) translateY(-6px);
		}
	}

	@keyframes muzzle-flash {
		0% {
			opacity: 1;
			transform: scaleX(1);
		}
		100% {
			opacity: 0;
			transform: scaleX(1.6);
		}
	}
</style>
