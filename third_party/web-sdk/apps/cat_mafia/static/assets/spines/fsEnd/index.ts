import { createAsset } from 'pixi-svelte';

import img from './skeleton.webp';
import rawAtlas from './fs_popup.atlas?raw';
import fsPopup from './fs_popup.json';

export default createAsset({ img, rawAtlas, spine: fsPopup });
