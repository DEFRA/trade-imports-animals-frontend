import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { config } from './config.js'

const originalStubMode = process.env.STUB_MODE

const restoreStubMode = () => {
  if (originalStubMode === undefined) {
    delete process.env.STUB_MODE
  } else {
    process.env.STUB_MODE = originalStubMode
  }
}

describe('#config', () => {
  test('loads TRADE_IMPORTS_INS_FRONTEND_URL with the 3002 default', () => {
    expect(config.get('tradeImportsInsFrontend.baseUrl')).toBe(
      'http://localhost:3002'
    )
  })

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

  describe('auth.cookieName', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    test('defaults to a service-distinct name in development', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('auth.cookieName')).toBe('sid')
    })

    test('reads AUTH_SESSION_COOKIE_NAME as the cookie name', async () => {
      vi.stubEnv('AUTH_SESSION_COOKIE_NAME', 'custom-sid')

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('auth.cookieName')).toBe('custom-sid')
    })
  })
})

describe('config URL validation', () => {
  const originalAddressBookUrl = config.get(
    'tradeImportsAddressBookApi.baseUrl'
  )
  const originalInsFrontendUrl = config.get('tradeImportsInsFrontend.baseUrl')

  afterEach(() => {
    config.set('tradeImportsAddressBookApi.baseUrl', originalAddressBookUrl)
    config.set('tradeImportsInsFrontend.baseUrl', originalInsFrontendUrl)
  })

  test('rejects a malformed tradeImportsAddressBookApi.baseUrl', () => {
    config.set('tradeImportsAddressBookApi.baseUrl', 'not a valid url')

    expect(() => config.validate({ allowed: 'strict' })).toThrow()
  })

  test('rejects a malformed tradeImportsInsFrontend.baseUrl', () => {
    config.set('tradeImportsInsFrontend.baseUrl', 'not a valid url')

    expect(() => config.validate({ allowed: 'strict' })).toThrow()
  })
})
