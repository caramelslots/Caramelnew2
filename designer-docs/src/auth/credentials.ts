/**
 * Учётные данные — только PBKDF2-хеши (plaintext не хранится в репозитории).
 * Итерации: 120_000 · SHA-256 · 32 байта.
 */

export const AUTH_SALT = 'designer-docs-v1-caramel'

/** PBKDF2(login, salt:user) */
export const AUTH_USER_HASH_HEX =
  'a18e8269b77e3fbca569ae038fa40b9bb1dd314c0f38f8051e11858e2c690c3e'

/** PBKDF2(password, salt) */
export const AUTH_PASSWORD_HASH_HEX =
  '490f9d2aaaa338c9bfbd198d4ffc135efe78f563d3e173d8cb281c291ebd5305'

export const AUTH_PBKDF2_ITERATIONS = 120_000

export const AUTH_SESSION_KEY = 'designer-docs-auth-until'

/** Сессия после успешного входа (мс unix). */
export const AUTH_SESSION_TTL_MS = 12 * 60 * 60 * 1000
