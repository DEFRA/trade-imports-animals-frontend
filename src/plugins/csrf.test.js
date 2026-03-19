import { describe, expect, test, vi } from 'vitest'

const configGetMock = vi.hoisted(() => vi.fn())

vi.mock('../config/config.js', () => ({
  config: {
    get: configGetMock
  }
}))

describe('csrf plugin', () => {
  test('sets cookie options correctly', async () => {
    vi.resetModules()

    configGetMock.mockImplementation((key) => {
      if (key === 'csrf.cookie.secure') return true
      if (key === 'csrf.enabled') return true
      return undefined
    })

    const { csrf } = await import('./csrf.js')

    expect(csrf).toBeDefined()
    expect(csrf.plugin).toBeDefined()
    expect(csrf.options.cookieOptions).toEqual({
      isSecure: true,
      isHttpOnly: true,
      isSameSite: 'Strict'
    })
  })

  test('skip returns true when CSRF is disabled', async () => {
    vi.resetModules()

    configGetMock.mockImplementation((key) => {
      if (key === 'csrf.cookie.secure') return false
      if (key === 'csrf.enabled') return false
      return undefined
    })

    const { csrf } = await import('./csrf.js')

    expect(csrf.options.skip({ path: '/origin' })).toBe(true)
    expect(csrf.options.skip({ path: '/anything' })).toBe(true)
  })

  test('skip returns true for whitelisted paths when CSRF is enabled', async () => {
    vi.resetModules()

    configGetMock.mockImplementation((key) => {
      if (key === 'csrf.cookie.secure') return false
      if (key === 'csrf.enabled') return true
      return undefined
    })

    const { csrf } = await import('./csrf.js')

    expect(csrf.options.skip({ path: '/health' })).toBe(true)
    expect(csrf.options.skip({ path: '/assets/some-file.js' })).toBe(true)
    expect(csrf.options.skip({ path: '/public/index.html' })).toBe(true)
  })

  test('skip returns false for non-whitelisted paths when CSRF is enabled', async () => {
    vi.resetModules()

    configGetMock.mockImplementation((key) => {
      if (key === 'csrf.cookie.secure') return false
      if (key === 'csrf.enabled') return true
      return undefined
    })

    const { csrf } = await import('./csrf.js')

    expect(csrf.options.skip({ path: '/origin' })).toBe(false)
    expect(csrf.options.skip({ path: '/about' })).toBe(false)
  })
})
