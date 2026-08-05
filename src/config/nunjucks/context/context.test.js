import { vi } from 'vitest'

const mockReadFileSync = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('node:fs', async () => {
  const nodeFs = await import('node:fs')

  return {
    ...nodeFs,
    readFileSync: () => mockReadFileSync()
  }
})
vi.mock('../../../server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: (...args) => mockLoggerError(...args) })
}))

describe('context and cache', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset()
    mockLoggerError.mockReset()
    vi.resetModules()
  })

  describe('#context', () => {
    const mockRequest = { path: '/' }

    describe('When webpack manifest file read succeeds', () => {
      let contextImport
      let contextResult

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(async () => {
        // Return JSON string
        mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

        contextResult = await contextImport.context(mockRequest)
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual({
          assetPath: '/public/assets',
          breadcrumbs: [],
          getAssetPath: expect.any(Function),
          serviceName: 'Animals',
          serviceUrl: '/',
          authEnabled: true,
          userSession: { isAuthenticated: false }
        })
      })

      describe('With valid asset path', () => {
        test('Should provide expected asset path', () => {
          expect(contextResult.getAssetPath('application.js')).toBe(
            '/public/javascripts/application.js'
          )
        })
      })

      describe('With invalid asset path', () => {
        test('Should provide expected asset', () => {
          expect(contextResult.getAssetPath('an-image.png')).toBe(
            '/public/an-image.png'
          )
        })
      })
    })

    describe('When webpack manifest file read fails', () => {
      let contextImport

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(() => {
        mockReadFileSync.mockReturnValue(new Error('File not found'))

        return contextImport.context(mockRequest)
      })

      test('Should log that the Webpack Manifest file is not available', () => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Webpack assets-manifest.json not found'
        )
      })
    })
  })

  describe('#context cache', () => {
    const mockRequest = { path: '/' }
    let contextResult

    describe('Webpack manifest file cache', () => {
      let contextImport

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(async () => {
        // Return JSON string
        mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

        contextResult = await contextImport.context(mockRequest)
      })

      test('Should read file', () => {
        expect(mockReadFileSync).toHaveBeenCalled()
      })

      test('Should use cache', () => {
        expect(mockReadFileSync).not.toHaveBeenCalled()
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual({
          assetPath: '/public/assets',
          breadcrumbs: [],
          getAssetPath: expect.any(Function),
          serviceName: 'Animals',
          serviceUrl: '/',
          authEnabled: true,
          userSession: { isAuthenticated: false }
        })
      })
    })
  })
})

describe('#context session lookup', () => {
  // Mirrors @hapi/catbox client.js:105-111 — a non-string key is rejected, it does
  // not quietly miss. Without this the assertions below would pass either way.
  const cacheRejectingInvalidKeys = (entries) => ({
    get: async (key) => {
      if (typeof key !== 'string') {
        throw new Error('Invalid key')
      }
      return entries[key] ?? null
    }
  })

  const requestWithCredentials = (credentials, entries = {}) => ({
    path: '/',
    auth: { isAuthenticated: true, credentials },
    server: { app: { cache: cacheRejectingInvalidKeys(entries) } }
  })

  beforeEach(() => {
    vi.resetModules()
    mockReadFileSync.mockReset()
    mockReadFileSync.mockReturnValue('{}')
    mockLoggerError.mockReset()
  })

  test('reads the session id from Bell credentials, where it sits under profile', async () => {
    const { context } = await import('./context.js')

    const result = await context(
      requestWithCredentials(
        { profile: { sessionId: 'S' }, token: 't' },
        { S: { displayName: 'A B', email: 'a@b' } }
      )
    )

    expect(result.userSession).toEqual({
      isAuthenticated: true,
      displayName: 'A B',
      email: 'a@b'
    })
  })

  test('still reads the session id from session credentials, where it sits at the top level', async () => {
    const { context } = await import('./context.js')

    const result = await context(
      requestWithCredentials(
        { sessionId: 'S', email: 'a@b' },
        { S: { displayName: 'A B', email: 'a@b' } }
      )
    )

    expect(result.userSession).toEqual({
      isAuthenticated: true,
      displayName: 'A B',
      email: 'a@b'
    })
  })

  test('renders as signed out when an authenticated request carries no session id', async () => {
    const { context } = await import('./context.js')

    const result = await context(requestWithCredentials({ profile: {} }))

    expect(result.userSession).toEqual({ isAuthenticated: false })
  })
})

describe('When auth.enabled is set to false', () => {
  beforeEach(() => {
    vi.resetModules()
    mockReadFileSync.mockReset()
    mockLoggerError.mockReset()
  })
  test('returns authEnabled=false in context', async () => {
    vi.doMock('../../config.js', async (importOriginal) => {
      const mod = await importOriginal()
      const originalGet = mod.config.get.bind(mod.config)
      vi.spyOn(mod.config, 'get').mockImplementation((key) => {
        if (key === 'auth.enabled') return false
        return originalGet(key)
      })
      return mod
    })
    const contextImport = await import('./context.js')
    mockReadFileSync.mockReturnValue(`{
      "application.js": "javascripts/application.js",
      "stylesheets/application.scss": "stylesheets/application.css"
    }`)
    const mockRequest = { path: '/' }
    const contextResult = await contextImport.context(mockRequest)
    expect(contextResult.authEnabled).toBe(false)
    expect(contextResult.userSession).toEqual({ isAuthenticated: false })
  })
})
