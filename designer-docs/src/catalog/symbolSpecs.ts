/** Shared handoff defaults for designer docs (future projects). */

/** On-reel display size — static is always scaled to this square. */
export const SYMBOL_TEXTURE_NATIVE_PX = 196

/** Accepted static source sizes (designer export). */
export const SYMBOL_TEXTURE_SOURCE_PX = [196, 392] as const

export function isAcceptedStaticSpriteSize(width: number, height: number): boolean {
  return width === height && (SYMBOL_TEXTURE_SOURCE_PX as readonly number[]).includes(width)
}

export const STATIC_SPRITE_SPEC = {
  format: 'webp' as const,
  width: SYMBOL_TEXTURE_NATIVE_PX,
  height: SYMBOL_TEXTURE_NATIVE_PX,
} as const
