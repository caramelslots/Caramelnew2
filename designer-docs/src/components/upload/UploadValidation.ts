import { STATIC_SPRITE_SPEC } from '../../catalog/symbolSpecs'
import type { StaticSpriteInfo } from '../../library/types'

const TEXTURE_EXT = /\.(webp|png|jpe?g)$/i
const SKELETON_EXT = /\.json$/i
const ATLAS_EXT = /\.atlas$/i
const STATIC_NAME_HINT = /(^|[/_-])(static|reel)([._-]|$)/i

export type UploadPick = {
  skeleton: File | null
  atlas: File | null
  texture: File | null
  /** Separate reel static sprite (not the Spine atlas page). */
  staticSprite: File | null
}

export type ValidatedUpload = {
  label: string
  skeletonUrl: string
  atlasUrl: string
  textureUrl: string
  textureFileName: string
  atlasTextureName: string
  staticSprite: StaticSpriteInfo | null
  revoke: () => void
}

type FileSystemEntryLike = {
  isFile: boolean
  isDirectory: boolean
  name: string
  file?: (success: (file: File) => void, error?: (err: DOMException) => void) => void
  createReader?: () => DirReader
}

type DirReader = {
  readEntries: (
    success: (entries: FileSystemEntryLike[]) => void,
    error?: (err: DOMException) => void,
  ) => void
}

function atlasPageName(atlasText: string): string | null {
  const first = atlasText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.includes(':'))
  return first ?? null
}

function baseName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] ?? path
}

function fileKey(file: File): string {
  const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath
  return relative && relative.length > 0 ? relative : file.name
}

function parentDir(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  return idx >= 0 ? normalized.slice(0, idx) : ''
}

function extFormat(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? 'unknown'
}

export function validateUploadFiles(files: UploadPick): string | null {
  if (!files.skeleton) return 'Нужен skeleton (.json).'
  if (!files.atlas) return 'Нужен atlas (.atlas).'
  if (!files.texture) return 'Нужна текстура Spine-атласа (.webp / .png).'

  if (!SKELETON_EXT.test(files.skeleton.name)) return 'Skeleton должен быть .json.'
  if (!ATLAS_EXT.test(files.atlas.name)) return 'Atlas должен быть .atlas.'
  if (!TEXTURE_EXT.test(files.texture.name)) {
    return 'Текстура атласа: .webp, .png или .jpg.'
  }
  if (files.staticSprite && !TEXTURE_EXT.test(files.staticSprite.name)) {
    return 'Static-спрайт: .webp, .png или .jpg.'
  }
  return null
}

async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

export async function buildStaticSpriteInfo(file: File): Promise<StaticSpriteInfo> {
  const size = await readImageSize(file)
  const url = URL.createObjectURL(file)
  return {
    url,
    fileName: file.name,
    width: size.width,
    height: size.height,
    format: extFormat(file.name),
    approxBytes: file.size,
  }
}

/**
 * Pick skeleton / atlas / textures from a flat file list for one symbol folder.
 */
export function resolveUploadPickFromFiles(files: File[]): { pick: UploadPick } | { error: string } {
  if (files.length === 0) {
    return { error: 'Папка или файлы пустые.' }
  }

  const skeletons = files.filter((file) => SKELETON_EXT.test(file.name))
  const atlases = files.filter((file) => ATLAS_EXT.test(file.name))
  const textures = files.filter((file) => TEXTURE_EXT.test(file.name))

  const missing: string[] = []
  if (skeletons.length === 0) missing.push('.json skeleton')
  if (atlases.length === 0) missing.push('.atlas')
  if (textures.length === 0) missing.push('texture (.webp / .png)')

  if (missing.length > 0) {
    const names = files
      .slice(0, 12)
      .map((file) => baseName(fileKey(file)))
      .join(', ')
    const more = files.length > 12 ? ` (+${files.length - 12} more)` : ''
    return {
      error: `Не хватает: ${missing.join(', ')}. Найдено: ${names || 'ничего'}${more}.`,
    }
  }

  if (skeletons.length > 1) {
    return {
      error: `В одной папке символа ${skeletons.length} .json — оставьте один skeleton.`,
    }
  }
  if (atlases.length > 1) {
    return {
      error: `В одной папке символа ${atlases.length} .atlas — оставьте один atlas.`,
    }
  }

  return {
    pick: {
      skeleton: skeletons[0]!,
      atlas: atlases[0]!,
      texture: textures[0] ?? null,
      staticSprite: null,
    },
  }
}

export async function matchTextureToAtlas(
  atlas: File,
  textures: File[],
): Promise<File | null> {
  if (textures.length === 0) return null
  if (textures.length === 1) return textures[0]!

  const atlasText = await atlas.text()
  const pageName = atlasPageName(atlasText)?.toLowerCase()
  if (!pageName) return textures[0]!

  const matched = textures.find((file) => file.name.toLowerCase() === pageName)
  return matched ?? textures[0]!
}

function pickStaticSprite(
  textures: File[],
  atlasTexture: File | null,
  skeletonLabel: string,
): File | null {
  const atlasName = atlasTexture?.name.toLowerCase() ?? null
  const others = textures.filter((file) => file.name.toLowerCase() !== atlasName)

  const byHint = others.find((file) => STATIC_NAME_HINT.test(file.name))
  if (byHint) return byHint

  const byLabel = others.find(
    (file) => file.name.replace(/\.[^.]+$/, '').toLowerCase() === skeletonLabel.toLowerCase(),
  )
  if (byLabel) return byLabel

  // Prefer square-ish small webp among leftovers — caller still validates size.
  const webps = others.filter((file) => /\.webp$/i.test(file.name))
  if (webps.length === 1) return webps[0]!
  if (others.length === 1) return others[0]!
  return null
}

export async function buildValidatedUpload(files: UploadPick): Promise<ValidatedUpload> {
  const error = validateUploadFiles(files)
  if (error || !files.skeleton || !files.atlas || !files.texture) {
    throw new Error(error ?? 'Неполный upload')
  }

  const atlasText = await files.atlas.text()
  const atlasTextureName = atlasPageName(atlasText)
  if (!atlasTextureName) {
    throw new Error('Не удалось прочитать имя страницы текстуры из .atlas.')
  }

  const skeletonUrl = URL.createObjectURL(files.skeleton)
  const atlasUrl = URL.createObjectURL(new Blob([atlasText], { type: 'text/plain' }))
  const textureUrl = URL.createObjectURL(files.texture)

  let staticSprite: StaticSpriteInfo | null = null
  if (files.staticSprite) {
    staticSprite = await buildStaticSpriteInfo(files.staticSprite)
  }

  const label = files.skeleton.name.replace(/\.json$/i, '')
  const urls = [skeletonUrl, atlasUrl, textureUrl]
  if (staticSprite) urls.push(staticSprite.url)

  return {
    label,
    skeletonUrl,
    atlasUrl,
    textureUrl,
    textureFileName: files.texture.name,
    atlasTextureName,
    staticSprite,
    revoke: () => {
      for (const url of urls) URL.revokeObjectURL(url)
    },
  }
}

export async function buildValidatedUploadFromFiles(
  files: File[],
): Promise<ValidatedUpload> {
  const resolved = resolveUploadPickFromFiles(files)
  if ('error' in resolved) {
    throw new Error(resolved.error)
  }

  const textures = files.filter((file) => TEXTURE_EXT.test(file.name))
  const texture = await matchTextureToAtlas(resolved.pick.atlas!, textures)
  const label = resolved.pick.skeleton!.name.replace(/\.json$/i, '')
  const staticSprite = pickStaticSprite(textures, texture, label)

  const pick: UploadPick = {
    skeleton: resolved.pick.skeleton,
    atlas: resolved.pick.atlas,
    texture,
    staticSprite,
  }

  const validationError = validateUploadFiles(pick)
  if (validationError) throw new Error(validationError)

  return buildValidatedUpload(pick)
}

/**
 * Split a multi-folder drop into per-symbol file groups (by parent dir of each .json).
 */
export function groupFilesBySkeletonFolders(files: File[]): File[][] {
  const skeletons = files.filter((file) => SKELETON_EXT.test(file.name))
  if (skeletons.length <= 1) {
    return files.length > 0 ? [files] : []
  }

  const groups = new Map<string, File[]>()
  for (const skeleton of skeletons) {
    const dir = parentDir(fileKey(skeleton))
    groups.set(dir, [])
  }

  for (const file of files) {
    const key = fileKey(file)
    const dir = parentDir(key)
    // Assign file to the longest matching skeleton directory prefix.
    let best: string | null = null
    for (const groupDir of groups.keys()) {
      if (dir === groupDir || dir.startsWith(groupDir + '/') || groupDir === '') {
        if (best === null || groupDir.length > best.length) best = groupDir
      }
    }
    if (best !== null) {
      groups.get(best)!.push(file)
    }
  }

  // Also attach top-level statics that share the skeleton base name.
  for (const [dir, group] of groups) {
    const skel = group.find((file) => SKELETON_EXT.test(file.name))
    if (!skel) continue
    const label = skel.name.replace(/\.json$/i, '').toLowerCase()
    for (const file of files) {
      if (group.includes(file)) continue
      const name = baseName(fileKey(file)).toLowerCase()
      if (
        TEXTURE_EXT.test(name) &&
        (name.startsWith(label + '.') || STATIC_NAME_HINT.test(name))
      ) {
        group.push(file)
      }
    }
    void dir
  }

  return [...groups.values()].filter((group) => group.some((f) => SKELETON_EXT.test(f.name)))
}

export async function buildValidatedUploadsFromFiles(
  files: File[],
): Promise<{ uploads: ValidatedUpload[]; errors: string[] }> {
  const groups = groupFilesBySkeletonFolders(files)
  const uploads: ValidatedUpload[] = []
  const errors: string[] = []

  for (const group of groups) {
    try {
      uploads.push(await buildValidatedUploadFromFiles(group))
    } catch (err) {
      const label =
        group.find((file) => SKELETON_EXT.test(file.name))?.name.replace(/\.json$/i, '') ??
        'symbol'
      errors.push(
        `${label}: ${err instanceof Error ? err.message : 'Upload failed'}`,
      )
    }
  }

  if (uploads.length === 0 && errors.length === 0) {
    errors.push('Не найдено ни одного символа (.json + .atlas + текстура).')
  }

  return { uploads, errors }
}

function readAllDirectoryEntries(reader: DirReader): Promise<FileSystemEntryLike[]> {
  return new Promise((resolve, reject) => {
    const entries: FileSystemEntryLike[] = []
    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(entries)
            return
          }
          entries.push(...batch)
          readBatch()
        },
        reject,
      )
    }
    readBatch()
  })
}

async function entryToFiles(entry: FileSystemEntryLike): Promise<File[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      entry.file?.(resolve, reject)
    })
    return [file]
  }

  if (entry.isDirectory && entry.createReader) {
    const children = await readAllDirectoryEntries(entry.createReader())
    const nested = await Promise.all(children.map((child) => entryToFiles(child)))
    return nested.flat()
  }

  return []
}

export async function collectFilesFromDataTransfer(
  dataTransfer: DataTransfer,
): Promise<File[]> {
  const items = [...dataTransfer.items]
  if (items.length > 0 && typeof items[0]?.webkitGetAsEntry === 'function') {
    const entries = items
      .map((item) => item.webkitGetAsEntry?.() as FileSystemEntryLike | null)
      .filter((entry): entry is FileSystemEntryLike => Boolean(entry))

    if (entries.length > 0) {
      const groups = await Promise.all(entries.map((entry) => entryToFiles(entry)))
      return groups.flat()
    }
  }

  return [...dataTransfer.files]
}

export function staticSpecHint(info: StaticSpriteInfo | null): string | null {
  if (!info) return 'Добавьте static WebP отдельно от текстуры атласа.'
  if (info.format !== STATIC_SPRITE_SPEC.format) {
    return `Сейчас ${info.format.toUpperCase()} — лучше ${STATIC_SPRITE_SPEC.format.toUpperCase()}.`
  }
  if (
    info.width !== STATIC_SPRITE_SPEC.width ||
    info.height !== STATIC_SPRITE_SPEC.height
  ) {
    return `Сейчас ${info.width}×${info.height} — идеал ${STATIC_SPRITE_SPEC.width}×${STATIC_SPRITE_SPEC.height}.`
  }
  return null
}
