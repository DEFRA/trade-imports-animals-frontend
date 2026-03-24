import { vi } from 'vitest'

const DEFAULT_SESSION_COOKIE_PASSWORD =
  'this-must-be-at-least-32-characters-long'

export async function mockAuthConfig(importOriginal) {
  const sessionCookiePassword = DEFAULT_SESSION_COOKIE_PASSWORD

  const mod = await importOriginal()
  const originalGet = mod.config.get.bind(mod.config)

  vi.spyOn(mod.config, 'get').mockImplementation((key) => {
    if (key === 'session') {
      const session = originalGet('session') ?? {}
      return {
        ...session,
        cookie: {
          ...(session.cookie ?? {}),
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
