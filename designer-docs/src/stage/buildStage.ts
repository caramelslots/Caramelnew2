import { Container, Graphics, Sprite, Texture } from 'pixi.js'
import type { BoardDimensions } from '../reel/constants'
import {
  layoutBackgroundSpine,
  layoutBackgroundSprite,
  loadBackgroundSpine,
  type LoadedBackgroundSpine,
} from './backgroundSpine'
import type { StageLayoutKind } from './deviceFit'
import {
  DESK_PARCHMENT,
  deskSizeForBoard,
  layoutStageContent,
} from './layout'
import type { ResolvedStageUrls, StageBackgroundSpinePack } from './stagePack'

export type StageLayers = {
  /** Static still and/or Spine street — always a Container under the desk. */
  backgroundRoot: Container
  contentRoot: Container
  deskBase: Sprite
  deskContour: Sprite
  playfield: Container
  layout: () => void
  dispose: () => void
}

async function textureFromUrl(url: string): Promise<Texture> {
  const img = new Image()
  img.decoding = 'async'
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`Stage asset missing: ${url.slice(0, 48)}`))
    img.src = url
  })
  const texture = Texture.from(img)
  if (!texture.width || !texture.height) {
    throw new Error('Stage texture has no dimensions')
  }
  return texture
}

export async function createStageLayers(
  board: BoardDimensions,
  getScreen: () => { width: number; height: number },
  getLayoutKind: () => StageLayoutKind,
  urls: ResolvedStageUrls,
  backgroundSpine?: StageBackgroundSpinePack | null,
): Promise<StageLayers> {
  const [bgTex, deskBaseTex, deskContourTex] = await Promise.all([
    textureFromUrl(urls.background),
    textureFromUrl(urls.deskBase),
    textureFromUrl(urls.deskContour),
  ])

  const backgroundRoot = new Container()

  const still = new Sprite(bgTex)
  still.anchor.set(0.5)
  backgroundRoot.addChild(still)

  let loadedSpine: LoadedBackgroundSpine | null = null
  if (backgroundSpine) {
    loadedSpine = await loadBackgroundSpine(backgroundSpine)
    // Hide still while Spine plays (still remains as fallback if spine fails mid-session).
    still.visible = false
    backgroundRoot.addChild(loadedSpine.spine)
  }

  const contentRoot = new Container()

  const deskBase = new Sprite(deskBaseTex)
  deskBase.anchor.set(0.5)

  const deskContour = new Sprite(deskContourTex)
  deskContour.anchor.set(0.5)

  const playfield = new Container()
  const mask = new Graphics()
  playfield.mask = mask
  playfield.addChild(mask)

  contentRoot.addChild(deskBase)
  contentRoot.addChild(playfield)
  contentRoot.addChild(deskContour)

  const layout = () => {
    const screen = getScreen()
    if (screen.width <= 0 || screen.height <= 0) return
    const kind = getLayoutKind()

    if (loadedSpine) {
      layoutBackgroundSpine(loadedSpine.spine, screen)
    } else {
      layoutBackgroundSprite(still, screen, {
        width: bgTex.width,
        height: bgTex.height,
      })
    }

    const placed = layoutStageContent(screen, board, kind)
    const desk = deskSizeForBoard(board)

    deskBase.width = desk.width
    deskBase.height = desk.height
    deskContour.width = desk.width
    deskContour.height = desk.height
    deskBase.x = -DESK_PARCHMENT.offsetXFrac * desk.width
    deskBase.y = -DESK_PARCHMENT.offsetYFrac * desk.height
    deskContour.x = deskBase.x
    deskContour.y = deskBase.y

    playfield.x = -placed.board.width / 2
    playfield.y = -placed.board.height / 2
    mask.clear()
    mask.rect(0, 0, placed.board.width, placed.board.height)
    mask.fill(0xffffff)

    contentRoot.scale.set(placed.scale)
    contentRoot.x = placed.centerX
    contentRoot.y = placed.centerY
  }

  layout()

  return {
    backgroundRoot,
    contentRoot,
    deskBase,
    deskContour,
    playfield,
    layout,
    dispose: () => {
      loadedSpine?.dispose()
      loadedSpine = null
    },
  }
}
