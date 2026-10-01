import {
  BACKGROUND_STATIC_HEIGHT,
  BACKGROUND_STATIC_WIDTH,
  BACKGROUND_TEXTURE_FORMAT,
} from '../catalog/backgroundSpecs'
import { atlasPageNames } from './backgroundSpine'
import type { StageBackgroundSpinePack } from './stagePack'

const JSON_EXT = /\.json$/i
const ATLAS_EXT = /\.atlas$/i
const TEX_EXT = /\.(webp|png|jpe?g)$/i
const STATIC_NAME_HINT = /(^|[/_-])static([._-]|$)/i

export type BackgroundPackUpload = {
  spine: StageBackgroundSpinePack
  staticUrl: string | null
  staticFileName: string | null
  warnings: string[]
  revoke: () => void
}

async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

function extFormat(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? 'unknown'
}

function pickBackgroundStatic(
  files: File[],
  atlasPageNamesLower: Set<string>,
): File | null {
  const leftovers = files.filter(
    (file) => TEX_EXT.test(file.name) && !atlasPageNamesLower.has(file.name.toLowerCase()),
  )
  const byHint = leftovers.find((file) => STATIC_NAME_HINT.test(file.name))
  if (byHint) return byHint
  if (leftovers.length === 1) return leftovers[0]!
  return null
}

function collectDocWarnings(args: {
  staticFile: File | null
  staticWidth: number | null
  staticHeight: number | null
  staticFormat: string | null
  pageCount: number
}): string[] {
  const warnings: string[] = []
  if (!args.staticFile) {
    warnings.push('Нет background_static.webp — still-фон останется дефолтным.')
  } else {
    if (args.staticFormat !== BACKGROUND_TEXTURE_FORMAT) {
      warnings.push(
        `Static «${args.staticFile.name}» — ${args.staticFormat?.toUpperCase()}, нужен ${BACKGROUND_TEXTURE_FORMAT.toUpperCase()}.`,
      )
    }
    if (
      args.staticWidth !== BACKGROUND_STATIC_WIDTH ||
      args.staticHeight !== BACKGROUND_STATIC_HEIGHT
    ) {
      warnings.push(
        `Static ${args.staticWidth}×${args.staticHeight} — документация: ${BACKGROUND_STATIC_WIDTH}×${BACKGROUND_STATIC_HEIGHT}.`,
      )
    }
  }
  if (args.pageCount > 1) {
    warnings.push(`Multi-page atlas: ${args.pageCount} страниц текстур.`)
  }
  return warnings
}

/**
 * Build Spine + still background from a flat folder file list (e.g. designer_assets/background/).
 * Atlas pages are resolved by exact file names listed in .atlas (any count).
 */
export async function buildBackgroundPackFromFiles(
  files: File[],
): Promise<BackgroundPackUpload> {
  if (files.length === 0) {
    throw new Error('Папка background пустая.')
  }

  const skeletons = files.filter((file) => JSON_EXT.test(file.name))
  const atlases = files.filter((file) => ATLAS_EXT.test(file.name))

  if (skeletons.length === 0) throw new Error('Нужен background.json (Spine skeleton).')
  if (atlases.length === 0) throw new Error('Нужен background.atlas.')
  if (skeletons.length > 1) {
    throw new Error(`Найдено ${skeletons.length} .json — в папке должен быть один skeleton.`)
  }
  if (atlases.length > 1) {
    throw new Error(`Найдено ${atlases.length} .atlas — в папке должен быть один atlas.`)
  }

  const skeleton = skeletons[0]!
  const atlas = atlases[0]!
  const atlasText = await atlas.text()
  const pages = atlasPageNames(atlasText)

  if (pages.length === 0) {
    throw new Error('В .atlas нет страниц текстур (.webp / .png).')
  }

  const byName = new Map(files.map((file) => [file.name.toLowerCase(), file]))
  const pageUrls: Record<string, string> = {}
  const urlsToRevoke: string[] = []

  try {
    for (const page of pages) {
      const file = byName.get(page.toLowerCase())
      if (!file) {
        throw new Error(
          `Нет файла для страницы atlas «${page}». Положите его в папку background/.`,
        )
      }
      const url = URL.createObjectURL(file)
      urlsToRevoke.push(url)
      pageUrls[page] = url
    }

    const atlasPagesLower = new Set(pages.map((page) => page.toLowerCase()))
    const staticFile = pickBackgroundStatic(files, atlasPagesLower)

    let staticUrl: string | null = null
    let staticWidth: number | null = null
    let staticHeight: number | null = null
    let staticFormat: string | null = null

    if (staticFile) {
      const size = await readImageSize(staticFile)
      staticWidth = size.width
      staticHeight = size.height
      staticFormat = extFormat(staticFile.name)
      staticUrl = URL.createObjectURL(staticFile)
      urlsToRevoke.push(staticUrl)
    }

    const skeletonUrl = URL.createObjectURL(skeleton)
    const atlasUrl = URL.createObjectURL(new Blob([atlasText], { type: 'text/plain' }))
    urlsToRevoke.push(skeletonUrl, atlasUrl)

    const label = skeleton.name.replace(/\.json$/i, '')
    const spine: StageBackgroundSpinePack = {
      skeletonUrl,
      atlasUrl,
      pageUrls,
      label,
      animationName: null,
    }

    const warnings = collectDocWarnings({
      staticFile,
      staticWidth,
      staticHeight,
      staticFormat,
      pageCount: pages.length,
    })

    return {
      spine,
      staticUrl,
      staticFileName: staticFile?.name ?? null,
      warnings,
      revoke: () => {
        for (const url of urlsToRevoke) URL.revokeObjectURL(url)
      },
    }
  } catch (err) {
    for (const url of urlsToRevoke) URL.revokeObjectURL(url)
    throw err
  }
}
