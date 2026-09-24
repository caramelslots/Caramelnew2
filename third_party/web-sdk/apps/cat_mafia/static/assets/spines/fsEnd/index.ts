import { createAsset } from 'pixi-svelte';

import img from './total_win.webp';
import rawAtlas from './total_win.atlas?raw';
import totalWin from './total_win.json';

export default createAsset({ img, rawAtlas, spine: totalWin });
