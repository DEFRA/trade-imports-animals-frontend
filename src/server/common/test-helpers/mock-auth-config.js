import { vi } from 'vitest'

const SESSION_COOKIE_MIN_LENGTH = 32
const SESSION_COOKIE_TEST_VALUE = 'x'.repeat(SESSION_COOKIE_MIN_LENGTH)

export async function mockAuthConfig(importOriginal) {
  const sessionCookiePassword = SESSION_COOKIE_TEST_VALUE

  const mod = await importOriginal()
  const originalGet = mod.config.get.bind(mod.config)

  vi.spyOn(mod.config, 'get').mockImplementation((key) => {
    if (key === 'session') {
      const session = originalGet('session') ?? {}
      return {
        ...session,
        cookie: {
          ...session.cookie,
          password: sessionCookiePassword
        }
      }
    }

    if (key === 'session.cookie.password') {
      return sessionCookiePassword
    }

    return originalGet(key)
  })

  return mod
}
