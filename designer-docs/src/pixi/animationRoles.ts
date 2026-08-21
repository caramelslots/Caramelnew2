import type { AnimationRole, AnimationRoleMap } from '../types'

const ROLE_CANDIDATES: Record<AnimationRole, string[]> = {
  idle: ['idle'],
  bounce: ['bounce', 'stop'],
  win: ['win', 'activation'],
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

export function resolveAnimationRoles(animationNames: string[]): AnimationRoleMap {
  return {
    idle: ROLE_CANDIDATES.idle.map((c) => matchCandidate(animationNames, c)).find(Boolean) ?? null,
    bounce:
      ROLE_CANDIDATES.bounce.map((c) => matchCandidate(animationNames, c)).find(Boolean) ?? null,
    win: ROLE_CANDIDATES.win.map((c) => matchCandidate(animationNames, c)).find(Boolean) ?? null,
  }
}

export function defaultAnimationName(
  roles: AnimationRoleMap,
  animationNames: string[],
): string | null {
  return roles.idle ?? roles.bounce ?? roles.win ?? animationNames[0] ?? null
}

export const ROLE_LABELS: Record<AnimationRole, string> = {
  idle: 'Idle',
  bounce: 'Bounce',
  win: 'Win',
}
