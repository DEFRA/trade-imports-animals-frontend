import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const originalStubMode = process.env.STUB_MODE

const restoreStubMode = () => {
  if (originalStubMode === undefined) {
    delete process.env.STUB_MODE
  } else {
    process.env.STUB_MODE = originalStubMode
  }
}

describe('#config', () => {
  describe('stubMode', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    afterEach(() => {
      restoreStubMode()
    })

    test('reads STUB_MODE=true as true', async () => {
      process.env.STUB_MODE = 'true'

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('stubMode')).toBe(true)
    })

    test('defaults to false when STUB_MODE is unset', async () => {
      delete process.env.STUB_MODE

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('stubMode')).toBe(false)
    })

    test("rejects a STUB_MODE value that is not 'true' or 'false'", async () => {
      process.env.STUB_MODE = 'flase'

      await expect(import('./config.js')).rejects.toThrow(
        "must be 'true' or 'false'"
      )
    })
  })

  describe('env-backed booleans', () => {
    const STRICT_BOOLEAN_ENV_VARS = [
      'LOG_ENABLED',
      'ENABLE_SECURE_CONTEXT',
      'SESSION_COOKIE_SECURE',
      'DEFRA_ID_SIGN_OUT_HOSTNAME_REWRITE_ENABLED',
      'DEFRA_ID_REFRESH_TOKENS',
      'STUB_MODE',
      'AUTH_ENABLED',
      'USE_SINGLE_INSTANCE_CACHE',
      'REDIS_TLS',
      'NUNJUCKS_WATCH',
      'NUNJUCKS_NO_CACHE'
    ]

    beforeEach(() => {
      vi.resetModules()
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    test.each(STRICT_BOOLEAN_ENV_VARS)(
      "refuses %s when it is not 'true' or 'false'",
      async (envVar) => {
        vi.stubEnv(envVar, 'flase')

        await expect(import('./config.js')).rejects.toThrow(
          "must be 'true' or 'false'"
        )
      }
    )

    test('reads AUTH_ENABLED=false as false', async () => {
      vi.stubEnv('AUTH_ENABLED', 'false')

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('auth.enabled')).toBe(false)
    })
  })
})
