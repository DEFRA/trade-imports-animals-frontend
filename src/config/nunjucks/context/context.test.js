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
          getAssetPath: expect.any(Function),
          serviceName: 'Animals',
          serviceUrl: '/',
          authEnabled: true,
          staleActionRejected: false,
          activeNavigationItem: 'dashboard',
          userSession: { isAuthenticated: false }
        })
      })

      test('Should mark no navigation item outside the dashboard section', async () => {
        const result = await contextImport.context({ path: '/auth/sign-out' })

        expect(result.activeNavigationItem).toBeNull()
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
          getAssetPath: expect.any(Function),
          serviceName: 'Animals',
          serviceUrl: '/',
          authEnabled: true,
          staleActionRejected: false,
          activeNavigationItem: 'dashboard',
          userSession: { isAuthenticated: false }
        })
      })
    })
  })
})

describe('#activeNavigationItem', () => {
  let activeNavigationItem

  beforeAll(async () => {
    ;({ activeNavigationItem } = await import('./context.js'))
  })

  test('Should mark the dashboard on the notifications list', () => {
    expect(activeNavigationItem('/')).toBe('dashboard')
  })

  test('Should keep the dashboard marked inside a notification', () => {
    expect(activeNavigationItem('/notifications/abc-123/origin')).toBe(
      'dashboard'
    )
  })

  test('Should mark nothing on a page outside the navigation', () => {
    expect(activeNavigationItem('/auth/sign-out')).toBeNull()
  })

  test('Should mark nothing on a path that merely starts with the section name', () => {
    expect(activeNavigationItem('/notificationsomething')).toBeNull()
  })

  test('Should mark nothing when there is no path', () => {
    expect(activeNavigationItem(undefined)).toBeNull()
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
