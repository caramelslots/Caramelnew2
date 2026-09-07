import { createAsset } from 'pixi-svelte';

import img from './spin_button.webp';
import rawAtlas from './spin_button.atlas?raw';
import spine from './spin_button.json';

export default createAsset({ img, rawAtlas, spine });
