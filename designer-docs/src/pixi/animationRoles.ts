import type { AnimationRole, AnimationRoleMap } from '../types'

export type SymbolAnimationRoleSpec = {
  role: AnimationRole
  /** Имя в документации. */
  docName: string
  purpose: string
  /** Допустимые имена клипа в skeleton (первое — предпочтительное). */
  candidates: readonly string[]
}

/** Требования к клипам символа — как в документации и cat_mafia. */
export const SYMBOL_ANIMATION_ROLE_SPECS: SymbolAnimationRoleSpec[] = [
  {
    role: 'idle',
    docName: 'idle',
    purpose: 'покой на барабане (loop)',
    candidates: ['idle'],
  },
  {
    role: 'bounce',
    docName: 'stop',
    purpose: 'посадка символа (one-shot)',
    candidates: ['stop', 'bounce'],
  },
  {
    role: 'win',
    docName: 'activation',
    purpose: 'выигрыш (loop или one-shot)',
    candidates: ['activation', 'win'],
  },
]

const ROLE_CANDIDATES: Record<AnimationRole, string[]> = {
  idle: [...SYMBOL_ANIMATION_ROLE_SPECS[0]!.candidates],
  bounce: [...SYMBOL_ANIMATION_ROLE_SPECS[1]!.candidates],
  win: [...SYMBOL_ANIMATION_ROLE_SPECS[2]!.candidates],
}

function formatCandidateList(candidates: readonly string[]): string {
  if (candidates.length === 1) return `«${candidates[0]}»`
  const primary = candidates[0]!
  const alts = candidates.slice(1).map((name) => `«${name}»`)
  return `«${primary}» (или ${alts.join(', ')})`
}

function matchCandidate(animations: string[], candidate: string): string | null {
  if (animations.includes(candidate)) return candidate

  const suffixSlash = `/${candidate}`
  const suffixUnderscore = `_${candidate}`
  const found = animations.find(
    (name) => name.endsWith(suffixSlash) || name.endsWith(suffixUnderscore),
  )
  return found ?? null
}

/** Имена клипов из Spine skeleton.json (без загрузки Pixi). */
export function listAnimationNamesFromSkeletonJson(json: unknown): string[] {
  if (!json || typeof json !== 'object') return []

  const animations = (json as { animations?: unknown }).animations
  if (Array.isArray(animations)) {
    return animations
      .map((entry) => {
        if (!entry || typeof entry !== 'object' || !('name' in entry)) return null
        const name = (entry as { name: unknown }).name
        return typeof name === 'string' && name.length > 0 ? name : null
      })
      .filter((name): name is string => Boolean(name))
  }

  if (animations && typeof animations === 'object') {
    return Object.keys(animations as Record<string, unknown>)
  }

  return []
}

export function resolveAnimationRoles(animationNames: string[]): AnimationRoleMap {
  return {
    idle: ROLE_CANDIDATES.idle.map((c) => matchCandidate(animationNames, c)).find(Boolean) ?? null,
    bounce:
      ROLE_CANDIDATES.bounce.map((c) => matchCandidate(animationNames, c)).find(Boolean) ?? null,
    win: ROLE_CANDIDATES.win.map((c) => matchCandidate(animationNames, c)).find(Boolean) ?? null,
  }
}

/** Warnings when required animation roles are missing — with expected clip names. */
export function animationRoleWarnings(roles: AnimationRoleMap): string[] {
  const warnings: string[] = []
  for (const spec of SYMBOL_ANIMATION_ROLE_SPECS) {
    if (roles[spec.role]) continue
    warnings.push(
      `Не найден «${spec.docName}» — назовите клип ${formatCandidateList(spec.candidates)} (${spec.purpose}).`,
    )
  }
  return warnings
}

export function defaultAnimationName(
  roles: AnimationRoleMap,
  animationNames: string[],
): string | null {
  return roles.idle ?? roles.bounce ?? roles.win ?? animationNames[0] ?? null
}

export const ROLE_LABELS: Record<AnimationRole, string> = {
  idle: 'Idle',
  bounce: 'Stop',
  win: 'Activation',
}
