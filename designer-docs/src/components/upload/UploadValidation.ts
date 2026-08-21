const TEXTURE_EXT = /\.(webp|png|jpe?g)$/i
const SKELETON_EXT = /\.json$/i
const ATLAS_EXT = /\.atlas$/i

export type UploadPick = {
  skeleton: File | null
  atlas: File | null
  texture: File | null
}

export type ValidatedUpload = {
  label: string
  skeletonUrl: string
  atlasUrl: string
  textureUrl: string
  textureFileName: string
  atlasTextureName: string
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

export function validateUploadFiles(files: UploadPick): string | null {
  if (!files.skeleton) return 'Skeleton JSON is required (.json).'
  if (!files.atlas) return 'Atlas file is required (.atlas).'
  if (!files.texture) return 'Texture is required (.webp / .png).'

  if (!SKELETON_EXT.test(files.skeleton.name)) {
    return 'Skeleton must be a .json file.'
  }
  if (!ATLAS_EXT.test(files.atlas.name)) {
    return 'Atlas must be a .atlas file.'
  }
  if (!TEXTURE_EXT.test(files.texture.name)) {
    return 'Texture must be .webp, .png, or .jpg.'
  }
  return null
}

/**
 * Pick skeleton / atlas / texture from a flat or nested file list (folder drop).
 */
export function resolveUploadPickFromFiles(files: File[]): { pick: UploadPick } | { error: string } {
  if (files.length === 0) {
    return { error: 'Folder or files are empty.' }
  }

  const skeletons = files.filter((file) => SKELETON_EXT.test(file.name))
  const atlases = files.filter((file) => ATLAS_EXT.test(file.name))
  const textures = files.filter((file) => TEXTURE_EXT.test(file.name))

  const missing: string[] = []
  if (skeletons.length === 0) missing.push('.json skeleton')
  if (atlases.length === 0) missing.push('.atlas')
  if (textures.length === 0) missing.push('texture (.webp / .png / .jpg)')

  if (missing.length > 0) {
    const names = files
      .slice(0, 12)
      .map((file) => baseName(fileKey(file)))
      .join(', ')
    const more = files.length > 12 ? ` (+${files.length - 12} more)` : ''
    return {
      error: `Folder is missing: ${missing.join(', ')}. Found: ${names || 'nothing'}${more}.`,
    }
  }

  if (skeletons.length > 1) {
    return {
      error: `Found ${skeletons.length} .json files — keep one skeleton in the folder.`,
    }
  }
  if (atlases.length > 1) {
    return {
      error: `Found ${atlases.length} .atlas files — keep one atlas in the folder.`,
    }
  }

  const atlas = atlases[0]!
  const skeleton = skeletons[0]!

  // Prefer texture whose name matches the atlas page line; else single texture; else first.
  return {
    pick: {
      skeleton,
      atlas,
      texture: textures[0] ?? null,
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

export async function buildValidatedUpload(files: UploadPick): Promise<ValidatedUpload> {
  const error = validateUploadFiles(files)
  if (error || !files.skeleton || !files.atlas || !files.texture) {
    throw new Error(error ?? 'Incomplete upload')
  }

  const atlasText = await files.atlas.text()
  const atlasTextureName = atlasPageName(atlasText)
  if (!atlasTextureName) {
    throw new Error('Could not read texture page name from the atlas file.')
  }

  const skeletonUrl = URL.createObjectURL(files.skeleton)
  const atlasUrl = URL.createObjectURL(new Blob([atlasText], { type: 'text/plain' }))
  const textureUrl = URL.createObjectURL(files.texture)

  const label = files.skeleton.name.replace(/\.json$/i, '')

  return {
    label,
    skeletonUrl,
    atlasUrl,
    textureUrl,
    textureFileName: files.texture.name,
    atlasTextureName,
    revoke: () => {
      URL.revokeObjectURL(skeletonUrl)
      URL.revokeObjectURL(atlasUrl)
      URL.revokeObjectURL(textureUrl)
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
  const pick: UploadPick = {
    skeleton: resolved.pick.skeleton,
    atlas: resolved.pick.atlas,
    texture,
  }

  const validationError = validateUploadFiles(pick)
  if (validationError) throw new Error(validationError)

  return buildValidatedUpload(pick)
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

/** Collect files from a drag-and-drop event (supports folders via webkit entries). */
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
