<!--
	Cabinet + stands/discs ABOVE the slot spine, BELOW the mascot (Pixi z 6).
	Hard clip keeps the plate inside the gold frame. HTML seats are hit-only.
	Seat count follows targetPickSeatMode (6 entry / 9 Stage E).
-->
<script lang="ts">
	import { BaseSprite, Container, Graphics } from 'pixi-svelte';
	import * as PIXI from 'pixi.js';

	import { stateGame } from '../game/stateGame.svelte';
	import {
		TARGET_BOARD_CONTENT,
		TARGET_BOARD_NATIVE,
		TARGET_BOARD_SLOTS,
		TARGET_BOARD_SPRITES,
		TARGET_PICK_DISC_LIFT_FRAC,
		TARGET_PICK_HOLDER_ASPECT,
		TARGET_PICK_HOLDER_TOP_FRAC,
		TARGET_PICK_HOLDER_WIDTH_FRAC,
		TARGET_PICK_SEAT_WIDTH_FRAC,
		TARGET_SHOOT_CONTENT,
		TARGET_SHOOT_NATIVE,
		TARGET_SHOOT_SEAT_WIDTH_FRAC,
		TARGET_SHOOT_SLOTS,
		targetBoardSlotPoint,
		targetPickInnerClip,
	} from '../game/targetBoardAssets';
	import BoardContainer from './BoardContainer.svelte';

	const open = $derived(stateGame.targetPickOpen);
	const clip = targetPickInnerClip();
	const nine = $derived(stateGame.targetPickSeatMode === 'nine');
	const slots = $derived(nine ? TARGET_SHOOT_SLOTS : TARGET_BOARD_SLOTS);
	const seatWidthFrac = $derived(nine ? TARGET_SHOOT_SEAT_WIDTH_FRAC : TARGET_PICK_SEAT_WIDTH_FRAC);
	const boardContent = $derived(nine ? TARGET_SHOOT_CONTENT : TARGET_BOARD_CONTENT);
	const boardNative = $derived(nine ? TARGET_SHOOT_NATIVE : TARGET_BOARD_NATIVE);
	const boardBgUrl = $derived(
		nine ? TARGET_BOARD_SPRITES.background9 : TARGET_BOARD_SPRITES.background,
	);

	let wood = $state<PIXI.Texture>(PIXI.Texture.EMPTY);
	let holder = $state<PIXI.Texture>(PIXI.Texture.EMPTY);
	let front = $state<PIXI.Texture>(PIXI.Texture.EMPTY);

	const offsetY = $derived(clip.y + (stateGame.targetPickSlide - 1) * clip.height);
	const ready = $derived(
		wood !== PIXI.Texture.EMPTY &&
			holder !== PIXI.Texture.EMPTY &&
			front !== PIXI.Texture.EMPTY,
	);

	const seats = $derived.by(() => {
		const size = clip.width * seatWidthFrac;
		const holderW = size * TARGET_PICK_HOLDER_WIDTH_FRAC;
		const holderH = holderW * TARGET_PICK_HOLDER_ASPECT;
		const content = boardContent;
		return slots.map((slot, i) => {
			const p = targetBoardSlotPoint(
				slot,
				{ x: clip.x, y: 0, width: clip.width, height: clip.height },
				content,
			);
			const flipped = stateGame.targetPickFlipped[i] === true;
			const spinning =
				stateGame.targetPickSpineSeat === i ||
				stateGame.targetPickSpinningSeats.includes(i) ||
				stateGame.targetShotFlips.some((f) => f.seatIndex === i);
			return {
				holderX: p.x - holderW / 2,
				holderY: p.y - size / 2 + size * TARGET_PICK_HOLDER_TOP_FRAC - holderH / 2,
				holderW,
				holderH,
				discX: p.x - size / 2,
				discY: p.y - size / 2 - size * TARGET_PICK_DISC_LIFT_FRAC,
				size,
				// Hide idle front while this seat flips or already shows the back face —
				// otherwise the Pixi disc sits under the flip / HTML back (double target).
				showDisc: !flipped && !spinning,
			};
		});
	});

	const drawInnerMask = $derived((g: PIXI.Graphics) => {
		g.clear();
		g.rect(clip.x, clip.y, clip.width, clip.height);
		g.fill(0xffffff);
	});

	const loadTex = (url: string) =>
		PIXI.Assets.load(url).then((loaded) =>
			loaded instanceof PIXI.Texture ? loaded : PIXI.Texture.from(loaded),
		);

	$effect(() => {
		if (!open) return;
		const bgUrl = boardBgUrl;
		const native = boardNative;
		const content = boardContent;
		let cancelled = false;
		wood = PIXI.Texture.EMPTY;
		void Promise.all([
			loadTex(bgUrl),
			loadTex(TARGET_BOARD_SPRITES.holder),
			loadTex(TARGET_BOARD_SPRITES.front),
		]).then(([bg, h, f]) => {
			if (cancelled) return;
			const frame = new PIXI.Rectangle(
				Math.round(content.left * native.width),
				Math.round(content.top * native.height),
				Math.round(content.width * native.width),
				Math.round(content.height * native.height),
			);
			wood = new PIXI.Texture({ source: bg.source, frame });
			holder = h;
			front = f;
		});
		return () => {
			cancelled = true;
		};
	});
</script>

{#if open && ready}
	<BoardContainer>
		<Container>
			<Graphics isMask draw={drawInnerMask} />
			<Container y={offsetY}>
				<BaseSprite texture={wood} x={clip.x} y={0} width={clip.width} height={clip.height} />
				{#each seats as seat, i (i)}
					<BaseSprite
						texture={holder}
						x={seat.holderX}
						y={seat.holderY}
						width={seat.holderW}
						height={seat.holderH}
					/>
					{#if seat.showDisc}
						<BaseSprite
							texture={front}
							x={seat.discX}
							y={seat.discY}
							width={seat.size}
							height={seat.size}
						/>
					{/if}
				{/each}
			</Container>
		</Container>
	</BoardContainer>
{/if}
