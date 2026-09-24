import { createAsset } from 'pixi-svelte';

import img from './money.webp';
import rawAtlas from './money.atlas?raw';
import spine from './money.json';

export default createAsset({ img, rawAtlas, spine });
