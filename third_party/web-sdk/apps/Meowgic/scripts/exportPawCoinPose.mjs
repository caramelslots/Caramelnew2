/** Export gold paw-coin mesh pose from coins spine (board rest = main_coin_slow @ 0). */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
	AtlasAttachmentLoader,
	SkeletonJson,
	TextureAtlas,
	Skeleton,
	AnimationState,
	AnimationStateData,
	Skin,
	Physics,
	MeshAttachment,
} from '@esotericsoftware/spine-pixi-v8';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(__dirname, '..');
const COINS = join(APP_ROOT, 'static/assets/spines/symbols/coins');
const OUT = join(APP_ROOT, 'scripts/.paw-coin-pose.json');

const SKIP_SLOTS = new Set([
	'halo_gold',
	'glow_gold',
	'booster_glow_gold',
	'glow',
	'flash',
]);

const atlasText = readFileSync(join(COINS, 'coins.atlas'), 'utf8');
const atlas = new TextureAtlas(atlasText, (_path, cb) => cb({ width: 2048, height: 1024 }));

const skeletonData = new SkeletonJson(new AtlasAttachmentLoader(atlas)).readSkeletonData(
	JSON.parse(readFileSync(join(COINS, 'coins.json'), 'utf8')),
);

const skeleton = new Skeleton(skeletonData);

const base = skeletonData.findSkin('coin_gold');
const board = new Skin('coin_gold_board');
board.addSkin(base);
const textSlot = skeletonData.findSlot('x3_gold');
const pawSlot = skeletonData.findSlot('paw_gold');
board.setAttachment(textSlot.index, 'x3_gold', board.getAttachment(pawSlot.index, 'paw_gold'));
skeleton.setSkin(board);
skeleton.setSlotsToSetupPose();

const stateData = new AnimationStateData(skeletonData);
const state = new AnimationState(stateData);
const entry = state.setAnimation(0, 'main_coin_slow', false);
entry.trackTime = 0;
state.apply(skeleton);
skeleton.updateWorldTransform(Physics.none);

const bounds = skeleton.getBoundsRect();
const layers = [];

for (const slot of skeleton.drawOrder) {
	const name = slot.data.name;
	if (SKIP_SLOTS.has(name)) continue;
	const attachment = slot.getAttachment();
	if (!(attachment instanceof MeshAttachment)) continue;

	const worldLength = attachment.worldVerticesLength;
	const vertices = new Float32Array(worldLength);
	attachment.computeWorldVertices(slot, 0, worldLength, vertices, 0, 2);

	const region = attachment.region;
	if (!region) continue;

	const sk = skeleton.color;
	const sc = slot.color;
	const ac = attachment.color;
	layers.push({
		slot: name,
		vertices: Array.from(vertices),
		uvs: Array.from(attachment.uvs),
		triangles: Array.from(attachment.triangles),
		color: [
			sk.r * sc.r * ac.r,
			sk.g * sc.g * ac.g,
			sk.b * sc.b * ac.b,
			sk.a * sc.a * ac.a,
		],
		region: {
			x: region.x,
			y: region.y,
			width: region.width,
			height: region.height,
			originalWidth: region.originalWidth,
			originalHeight: region.originalHeight,
			offsetX: region.offsetX,
			offsetY: region.offsetY,
			degrees: region.degrees,
		},
	});
}

writeFileSync(
	OUT,
	JSON.stringify(
		{
			atlasPage: 'coins.webp',
			atlasSize: [2048, 1024],
			animation: 'main_coin_slow',
			trackTime: 0,
			bounds,
			layers,
		},
		null,
		2,
	),
);

console.log(`exported ${layers.length} layers → ${OUT}`);
