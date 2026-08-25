import { Container, Graphics, Sprite, Texture } from 'pixi.js'
import type { BoardDimensions } from '../reel/constants'
import type { ResolvedStageUrls } from './stagePack'
import type { StageLayoutKind } from './deviceFit'
import {
  DESK_PARCHMENT,
  backgroundCoverScale,
  deskSizeForBoard,
  layoutStageContent,
} from './layout'

export type StageLayers = {
  background: Sprite
  contentRoot: Container
  deskBase: Sprite
  deskContour: Sprite
  playfield: Container
  layout: () => void
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
): Promise<StageLayers> {
  const [bgTex, deskBaseTex, deskContourTex] = await Promise.all([
    textureFromUrl(urls.background),
    textureFromUrl(urls.deskBase),
    textureFromUrl(urls.deskContour),
  ])

  const background = new Sprite(bgTex)
  background.anchor.set(0.5)

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

    const bgScale = backgroundCoverScale(screen, {
      width: bgTex.width,
      height: bgTex.height,
    })
    background.scale.set(bgScale)
    background.x = screen.width / 2
    background.y = screen.height / 2

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
    background,
    contentRoot,
    deskBase,
    deskContour,
    playfield,
    layout,
  }
}
