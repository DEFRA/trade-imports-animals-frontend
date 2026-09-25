import { vi } from 'vitest'

import { SET_BASE, SET_ID } from '../../../server/app/sets/live-animals/set.js'

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

// `vi.resetModules()` gives a freshly imported `shared/set-context.js` an empty
// mount registry, so the global setup's registration does not carry over. It
// matters only where `context.js` is imported AFTER a reset — the '#context
// cache' beforeAll, the '#activeNavigationItem' beforeAll and the auth.enabled
// test, each of which calls this for itself. A remount before a module
// instance nothing under test consults changes nothing.
const remountLiveAnimals = async () => {
  const { registerSetMount } =
    await import('../../../server/app/shared/set-context.js')
  registerSetMount(SET_ID, SET_BASE)
}

describe('context and cache', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset()
    mockLoggerError.mockReset()
    vi.resetModules()
  })

  describe('#context', () => {
    const mockRequest = { path: SET_BASE }

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
          getAssetPath: expect.any(Function),
          serviceName: 'Animals',
          serviceUrl: '/',
          homeUrl: SET_BASE,
          authEnabled: true,
          staleActionRejected: false,
          activeNavigationItem: 'dashboard',
          addressBookUrl: 'http://localhost:3002/address-book',
          userSession: { isAuthenticated: false }
        })
      })

      test('Should mark no navigation item outside the dashboard section', async () => {
        const result = await contextImport.context({ path: '/auth/sign-out' })

        expect(result.activeNavigationItem).toBeNull()
      })

      test('Should send the home link to the root from outside every set', async () => {
        const result = await contextImport.context({ path: '/auth/sign-out' })

        expect(result.homeUrl).toBe('/')
      })

      test('Should describe the signed-in user from their session', async () => {
        const cacheGet = vi
          .fn()
          .mockResolvedValue({ email: 'trader@example.com' })
        const result = await contextImport.context({
          path: SET_BASE,
          auth: {
            isAuthenticated: true,
            credentials: { sessionId: 'session-1' }
          },
          server: { app: { cache: { get: cacheGet } } }
        })

        expect(cacheGet).toHaveBeenCalledWith('session-1')
        expect(result.userSession).toEqual({
          isAuthenticated: true,
          displayName: 'trader@example.com',
          email: 'trader@example.com'
        })
      })

      test('Should not look up a session for a sign-in callback that has no session id yet', async () => {
        const cacheGet = vi.fn()
        const result = await contextImport.context({
          path: '/auth/sign-in-oidc',
          auth: {
            isAuthenticated: true,
            credentials: { profile: { sessionId: 'session-1' } }
          },
          server: { app: { cache: { get: cacheGet } } }
        })

        expect(cacheGet).not.toHaveBeenCalled()
        expect(result.userSession).toEqual({ isAuthenticated: false })
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
    const mockRequest = { path: SET_BASE }
    let contextResult

    describe('Webpack manifest file cache', () => {
      let contextImport

      beforeAll(async () => {
        // Imported after the describes above have reset the module graph, so
        // this instance of set-context.js starts with an empty registry.
        await remountLiveAnimals()
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
          getAssetPath: expect.any(Function),
          serviceName: 'Animals',
          serviceUrl: '/',
          homeUrl: SET_BASE,
          authEnabled: true,
          staleActionRejected: false,
          activeNavigationItem: 'dashboard',
          addressBookUrl: 'http://localhost:3002/address-book',
          userSession: { isAuthenticated: false }
        })
      })
    })
  })
})

const OTHER_SET_ID = 'high-risk-plants'
const OTHER_SET_BASE = `/${OTHER_SET_ID}`

describe('#activeNavigationItem', () => {
  let activeNavigationItem
  let setContext

  beforeAll(async () => {
    // The describes above reset the module graph, so the mount has to be put
    // back before `context.js` resolves a set-aware path.
    await remountLiveAnimals()
    setContext = await import('../../../server/app/shared/set-context.js')
    // A second mount, so the other set's base below is a set that is really
    // mounted rather than a string nothing has registered — and so live-animals
    // has to be entered explicitly rather than found by the sole-set fallback.
    setContext.registerSetMount(OTHER_SET_ID, OTHER_SET_BASE)
    ;({ activeNavigationItem } = await import('./context.js'))
  })

  const inLiveAnimals = (requestPath) =>
    setContext.withSetContext(SET_ID, () => activeNavigationItem(requestPath))

  test('Should mark the dashboard on the notifications list', () => {
    expect(inLiveAnimals(SET_BASE)).toBe('dashboard')
  })

  test('Should keep the dashboard marked inside a notification', () => {
    expect(inLiveAnimals(`${SET_BASE}/notifications/abc-123/origin`)).toBe(
      'dashboard'
    )
  })

  test('Should mark nothing on a page outside the navigation', () => {
    expect(inLiveAnimals('/auth/sign-out')).toBeNull()
  })

  test('Should mark nothing on a path that merely starts with the section name', () => {
    expect(inLiveAnimals(`${SET_BASE}/notificationsomething`)).toBeNull()
  })

  test('Should mark nothing on another set’s dashboard', () => {
    expect(inLiveAnimals(OTHER_SET_BASE)).toBeNull()
  })

  test('Should mark nothing when there is no path', () => {
    expect(inLiveAnimals(undefined)).toBeNull()
  })

  test('Should mark nothing on a server-wide page, outside every set', () => {
    // Two sets are mounted, so the sole-set fallback cannot stand in. Without
    // the `hasSetContext` guard this throws for want of a set.
    expect(activeNavigationItem('/auth/sign-out')).toBeNull()
  })
})

describe('When auth.enabled is set to false', () => {
  beforeEach(async () => {
    vi.resetModules()
    await remountLiveAnimals()
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
    const mockRequest = { path: SET_BASE }
    const contextResult = await contextImport.context(mockRequest)
    expect(contextResult.authEnabled).toBe(false)
    expect(contextResult.userSession).toEqual({ isAuthenticated: false })
  })
})

describe('When the configured INS base URL has a trailing slash', () => {
  beforeEach(() => {
    vi.resetModules()
    mockReadFileSync.mockReset()
    mockLoggerError.mockReset()
  })
  test('Should strip a trailing slash from the configured INS base URL', async () => {
    vi.doMock('../../config.js', async (importOriginal) => {
      const mod = await importOriginal()
      const originalGet = mod.config.get.bind(mod.config)
      vi.spyOn(mod.config, 'get').mockImplementation((key) => {
        if (key === 'tradeImportsInsFrontend.baseUrl') return 'http://ins.test/'
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
    expect(contextResult.addressBookUrl).toBe('http://ins.test/address-book')
  })
})
