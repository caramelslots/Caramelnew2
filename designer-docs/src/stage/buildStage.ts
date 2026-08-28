import { Container, Rectangle, Sprite, Texture } from 'pixi.js'
import { type BoardDimensions } from '../reel/constants'
import {
  layoutBackgroundSpine,
  layoutBackgroundSprite,
  loadBackgroundSpine,
  type LoadedBackgroundSpine,
} from './backgroundSpine'
import {
  createBoardFeatherMaskTexture,
  destroyBoardFeatherMaskTexture,
} from './boardFeatherMask'
import { CAT_MAFIA_BOARD_ATLAS } from './catMafiaAssets'
import type { StageLayoutKind } from './deviceFit'
import { PLAYFIELD_NUDGE_Y, layoutStageContent } from './layout'
import type { ResolvedStageUrls, StageBackgroundSpinePack } from './stagePack'

export type StageLayers = {
  /** Static still and/or Spine street — canvas-space cover. */
  backgroundRoot: Container
  /** MainContainer equivalent (design-space letterbox). */
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

/**
 * When desk URL is cat_mafia board.webp, crop the Spine `board` atlas region
 * (2050×1993 = BOARD_DESK_CONTENT) so object-fit:fill into the parchment slot
 * matches the game.
 */
function deskTextureFromPage(page: Texture, url: string): Texture {
  if (!url.includes('/spines/board/board.webp')) return page
  const { board } = CAT_MAFIA_BOARD_ATLAS
  const frame = new Rectangle(board.x, board.y, board.width, board.height)
  return new Texture({ source: page.source, frame })
}

export type CreateStageLayersOptions = {
  /** Docs preview — keep static still under Spine until animation is visible. */
  keepStillWithSpine?: boolean
}

export async function createStageLayers(
  board: BoardDimensions,
  getScreen: () => { width: number; height: number },
  getLayoutKind: () => StageLayoutKind,
  urls: ResolvedStageUrls,
  backgroundSpine?: StageBackgroundSpinePack | null,
  options?: CreateStageLayersOptions,
): Promise<StageLayers> {
  const [bgTex, deskBasePage, deskContourPage] = await Promise.all([
    textureFromUrl(urls.background),
    textureFromUrl(urls.deskBase),
    textureFromUrl(urls.deskContour),
  ])

  const deskBaseTex = deskTextureFromPage(deskBasePage, urls.deskBase)
  const deskContourTex = deskTextureFromPage(deskContourPage, urls.deskContour)
  const useBoardAtlasCrop = urls.deskBase.includes('/spines/board/board.webp')

  const backgroundRoot = new Container()

  const still = new Sprite(bgTex)
  still.anchor.set(0.5)
  backgroundRoot.addChild(still)

  let loadedSpine: LoadedBackgroundSpine | null = null
  if (backgroundSpine) {
    loadedSpine = await loadBackgroundSpine(backgroundSpine)
    if (!options?.keepStillWithSpine) {
      still.visible = false
    }
    backgroundRoot.addChild(loadedSpine.spine)
  }

  /**
   * Hierarchy mirrors cat_mafia:
   *   mainRoot (canvas center, mainLayout.scale, pivot = design center)
   *     boardRoot (design-space boardLayout.x/y + board.scale)
   *       localRoot (−pivot → board top-left)
   *         desk at slot center
   *         playfield at (0,0) with feather mask
   */
  const contentRoot = new Container()
  const boardRoot = new Container()
  const localRoot = new Container()

  const deskBase = new Sprite(deskBaseTex)
  deskBase.anchor.set(0.5)

  const deskContour = new Sprite(deskContourTex)
  deskContour.anchor.set(0.5)
  // Contour only when designer uploads a separate overlay; atlas crop is full desk.
  deskContour.visible = !useBoardAtlasCrop && urls.deskContour !== urls.deskBase

  const playfield = new Container()
  const maskSprite = new Sprite(Texture.WHITE)
  playfield.mask = maskSprite
  playfield.addChild(maskSprite)

  let maskTexture: Texture = Texture.WHITE

  localRoot.addChild(deskBase)
  localRoot.addChild(playfield)
  localRoot.addChild(deskContour)
  boardRoot.addChild(localRoot)
  contentRoot.addChild(boardRoot)

  const layout = () => {
    const screen = getScreen()
    if (screen.width <= 0 || screen.height <= 0) return
    const kind = getLayoutKind()

    if (loadedSpine) {
      layoutBackgroundSpine(loadedSpine.spine, screen)
    }
    layoutBackgroundSprite(still, screen, {
      width: bgTex.width,
      height: bgTex.height,
    })

    const placed = layoutStageContent(screen, board, kind)

    // MainContainer: design box centered on canvas.
    contentRoot.position.set(placed.main.x, placed.main.y)
    contentRoot.pivot.set(placed.main.width / 2, placed.main.height / 2)
    contentRoot.scale.set(placed.main.scale)

    // BoardContainer: center + scale in design space.
    boardRoot.position.set(placed.board.x, placed.board.y)
    boardRoot.scale.set(placed.board.scale)
    localRoot.position.set(-placed.board.pivot.x, -placed.board.pivot.y)

    // Desk slot — object-fit: fill into parchment box (BoardFrame.svelte).
    deskBase.width = placed.deskSlot.width
    deskBase.height = placed.deskSlot.height
    deskBase.position.set(placed.deskSlotCenter.x, placed.deskSlotCenter.y)
    deskContour.width = placed.deskSlot.width
    deskContour.height = placed.deskSlot.height
    deskContour.position.set(placed.deskSlotCenter.x, placed.deskSlotCenter.y)

    // Clip strictly to the playfield hole so spin strips never bleed past the desk.
    const maskWidth = placed.board.width
    const maskHeight = placed.board.height
    const nextMask = createBoardFeatherMaskTexture({
      width: maskWidth,
      height: maskHeight,
      topOverflow: 0,
      bottomOverflow: 0,
      gridHeight: placed.board.height,
      feather: 1,
      bottomFeather: 0,
    })
    const prev = maskTexture
    maskTexture = nextMask
    maskSprite.texture = nextMask
    maskSprite.x = 0
    maskSprite.y = 0
    maskSprite.width = maskWidth
    maskSprite.height = maskHeight
    if (prev !== nextMask) destroyBoardFeatherMaskTexture(prev)

    playfield.position.set(0, PLAYFIELD_NUDGE_Y)
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
      destroyBoardFeatherMaskTexture(maskTexture)
      maskTexture = Texture.WHITE
    },
  }
}
